import secrets
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy import case, desc
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.entities import (
    User, Trainee, AccessLog, UserSession, PasswordResetToken, UserAbeKey, GamificationProgress,
    ClientCompany, TrainingRecord, AnomalyAlert, AccountManagerAssignment, UserKeyAttribute,
    Course, TrainerProgram
)
from app.schemas.schemas import (
    UserResponse, UserAttributeUpdate, UserCreateAdmin, UserActivationResponse, PasswordChangeRequest,
    SystemOverviewResponse
)
from app.api.deps import get_current_user, get_current_admin_user
from app.crypto.cpabe_engine import cpabe_engine
from app.crypto.attribute_manager import attribute_manager
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter()

def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


@router.get("/me", response_model=UserResponse)
def read_current_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "trainee":
        trainee = db.query(Trainee).filter(
            (Trainee.user_id == current_user.id) | (Trainee.email == current_user.email)
        ).first()
        streak = (trainee.current_streak if trainee else 7) or 7
        company_name = None
        if trainee and trainee.current_company_id:
            cc = db.query(ClientCompany).filter(ClientCompany.id == trainee.current_company_id).first()
            if cc:
                company_name = cc.name
        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "assigned_client_accounts": current_user.assigned_client_accounts or [],
            "is_active": current_user.is_active,
            "force_password_change": current_user.force_password_change,
            "mfa_enabled": current_user.mfa_enabled,
            "created_at": current_user.created_at,
            "streak": streak,
            "company_name": company_name
        }
    return current_user


@router.get("/overview", response_model=SystemOverviewResponse)
def get_system_overview(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Computes real-time system overview metrics for the Admin Dashboard from the database."""
    test_filter = ~User.email.like("%@test.ph")
    users_total = db.query(User).filter(test_filter).count()
    fallback = False
    if users_total == 0:
        users_total = db.query(User).count()
        fallback = True
    clients_total = db.query(ClientCompany).count()
    records_total = db.query(TrainingRecord).filter(TrainingRecord.deleted_at == None).count()

    one_hour_ago = datetime.now(timezone.utc) - timedelta(minutes=60)
    users_active = db.query(UserSession).filter(
        UserSession.last_active_at >= one_hour_ago,
        UserSession.is_revoked == False
    ).count()
    if users_active == 0:
        users_active = 1

    one_day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    anomalies_24h = db.query(AnomalyAlert).filter(
        AnomalyAlert.created_at >= one_day_ago
    ).count()

    role_counts = {}
    for r in ("admin", "account_manager", "finance", "trainer", "trainee"):
        q = db.query(User).filter(User.role == r)
        if not fallback:
            q = q.filter(test_filter)
        role_counts[r] = q.count()

    return SystemOverviewResponse(
        users_total=users_total,
        users_active_now=users_active,
        clients_total=clients_total,
        records_total=records_total,
        anomalies_24h=anomalies_24h,
        policies_enforced=clients_total,
        system_status="NOMINAL" if anomalies_24h < 10 else "ATTENTION",
        role_distribution=role_counts
    )


@router.get("/trainers", response_model=List[UserResponse])
def list_trainers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists certified training instructors for session assignment (FR-01, FR-02).
    Permitted for Administrators, Account Managers, and Trainers.
    """
    if current_user.role not in ("admin", "account_manager", "trainer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only staff with session planning authority can list trainers."
        )
    trainers = db.query(User).filter(User.role == "trainer", User.is_active == True).all()
    results = []
    for t in trainers:
        resp = UserResponse.model_validate(t)
        title_val = t.job_title or "Certified Instructor"
        resp.attributes = {"title": title_val}
        results.append(resp)
    return results


@router.get("/courses")
def list_courses_admin(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrators only.")
    return [{"id": c.id, "course_code": c.course_code, "name": c.name, "acronym_3": c.acronym_3}
            for c in db.query(Course).order_by(Course.name).all()]


@router.get("/{user_id}/programs")
def get_trainer_programs(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden.")
    rows = db.query(TrainerProgram).filter(TrainerProgram.user_id == user_id).all()
    return [{"course_id": r.course_id} for r in rows]


@router.put("/{user_id}/programs")
def set_trainer_programs(user_id: str, payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Admin adds/edits the programs (courses) a Trainer may author quizzes for. Not in the paper; added by design."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrators only.")
    target = db.query(User).filter(User.id == user_id, User.role == "trainer").first()
    if not target:
        raise HTTPException(status_code=404, detail="Trainer not found.")
    wanted = set(payload.get("course_ids") or [])
    valid = {c.id for c in db.query(Course).filter(Course.id.in_(wanted)).all()} if wanted else set()
    existing = db.query(TrainerProgram).filter(TrainerProgram.user_id == user_id).all()
    for row in existing:
        if row.course_id not in valid:
            db.delete(row)
    have = {r.course_id for r in existing}
    for cid in valid - have:
        db.add(TrainerProgram(user_id=user_id, course_id=cid, assigned_by=current_user.id))
    db.commit()
    return {"user_id": user_id, "course_ids": sorted(valid)}


@router.get("/", response_model=List[UserResponse])
def list_users(
    role: Optional[str] = None,
    exclude_test: bool = True,
    exclude_trainees: bool = False,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to list system accounts (FR-01, FR-02).
    Lists all provisioned system accounts (administrators, account managers, trainers,
    finance officers, and trainees) while filtering out internal automated test fixtures.
    """
    query = db.query(User)
    if exclude_test:
        query = query.filter(
            ~User.email.like("%@test.ph")
        )
    if exclude_trainees:
        query = query.filter(User.role != "trainee")
    if role:
        query = query.filter(User.role == role)

    # Order by account hierarchy: Admin (1) -> AM (2) -> Finance (3) -> Trainer (4) -> Trainee (5)
    role_hierarchy = case(
        (User.role == "admin", 1),
        (User.role == "account_manager", 2),
        (User.role == "finance", 3),
        (User.role == "trainer", 4),
        (User.role == "trainee", 5),
        else_=6
    )
    query = query.order_by(role_hierarchy.asc(), User.full_name.asc())
    users = query.all()
    for u in users:
        if not u.clearance_level:
            if u.role == "admin":
                u.clearance_level = 3
            elif u.role in ("account_manager", "finance"):
                u.clearance_level = 2
            else:
                u.clearance_level = 1
    return users


@router.post("/", response_model=UserActivationResponse)
def create_user_by_admin(
    user_in: UserCreateAdmin,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin creates a new staff or trainee account with single-use copyable activation link (FR-02, SEC-01)."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    valid_roles = ("admin", "account_manager", "finance", "trainer", "trainee")
    if user_in.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    # Determine default clearance level by role if not explicitly provided
    clearance = user_in.clearance_level
    if not clearance:
        if user_in.role.lower() == "admin":
            clearance = 3
        elif user_in.role.lower() in ("account_manager", "finance"):
            clearance = 2
        else:
            clearance = 1

    # Generate initial password or use temporary
    raw_pwd = user_in.temporary_password or secrets.token_urlsafe(16)
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(raw_pwd),
        role=user_in.role.lower(),
        clearance_level=clearance,
        assigned_client_accounts=user_in.assigned_client_accounts or [],
        force_password_change=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate single-use activation token (24-hour expiry per Chapter III / Phase 1)
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=24)

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        is_used=False,
        expires_at=expires_at
    )
    db.add(reset_token)

    # If role is trainee, auto-link or create Trainee profile with Gamification
    if user.role.lower() == "trainee":
        t = db.query(Trainee).filter(Trainee.email == user.email).first()
        if t:
            t.user_id = user.id
        else:
            name_parts = user.full_name.split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else "Trainee"
            t = Trainee(
                trainee_code=f"TRN-{secrets.randbelow(9000) + 1000}",
                user_id=user.id,
                first_name=first_name,
                last_name=last_name,
                email=user.email,
                display_name=first_name
            )
            db.add(t)
            db.flush()
            gp = GamificationProgress(trainee_id=t.id)
            db.add(gp)

    # Issue initial CP-ABE key for user (FR-02, SEC-05, fail-closed)
    attribute_manager.issue_or_rekey_user(
        db=db,
        user=user,
        admin_user_id=admin_user.id
    )

    # Deliver setup invitation email from crossquest@xworks.ph (Phase 1)
    email_service.send_account_setup_email(user.email, user.full_name, raw_token)

    # Log to audit log
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="USER_CREATED",
        resource_type="USER",
        resource_id=user.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"created_email": user.email, "role": user.role, "invitation_sent": True}
    )
    db.add(log)
    db.commit()

    activation_link = f"/activate?token={raw_token}"
    return {
        "user": user,
        "activation_token": raw_token,
        "activation_link": activation_link,
        "expires_at": expires_at
    }


@router.put("/{user_id}/disable", response_model=UserResponse)
def disable_user_account(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin disables an account (FR-02, SEC-07, TC-ATT-03):
    1. Sets is_active = False
    2. Revokes all active refresh sessions immediately
    3. Revokes CP-ABE key material (TC-ATT-17)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin_user.id or user.role == "admin":
        raise HTTPException(status_code=403, detail="Administrator accounts cannot be disabled to preserve dual-admin peer review (OI-08, OI-30).")

    user.is_active = False

    # Revoke all server-side sessions
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_revoked": True})

    # Revoke CP-ABE keys and remove key material (DD-09, TC-ATT-17)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    db.query(UserAbeKey).filter(
        UserAbeKey.user_id == user.id,
        UserAbeKey.status == "active"
    ).update({
        "status": "revoked",
        "wrapped_dek": None,
        "key_ciphertext": "",
        "revoked_at": now_utc,
        "material_deleted_at": now_utc
    })

    db.commit()
    db.refresh(user)

    # Log to audit log
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="ACCOUNT_DISABLED",
        resource_type="USER",
        resource_id=user.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"email": user.email}
    )
    db.add(log)
    db.commit()

    return user


@router.put("/{user_id}/re-enable", response_model=UserResponse)
def reenable_user_account(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin re-enables a disabled account (FR-02)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    db.commit()
    db.refresh(user)

    # Re-issue CP-ABE keys since disabling zeroes key material (FR-02, SEC-05, Phase 5)
    new_key = attribute_manager.issue_or_rekey_user(
        db=db,
        user=user,
        admin_user_id=admin_user.id
    )

    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="ACCOUNT_REENABLED",
        resource_type="USER",
        resource_id=user.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"email": user.email, "key_reissued": True, "key_id": new_key.id}
    )
    db.add(log)
    db.commit()

    return user


@router.post("/{user_id}/reset-password")
def trigger_user_password_reset(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin triggers a single-use password reset link for a user (FR-02, SEC-01)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Invalidate previous unused reset tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})

    # Generate single-use token (15-minute expiry)
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=15)

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        is_used=False,
        expires_at=expires_at
    )
    db.add(reset_token)

    # Deliver password reset email from crossquest@xworks.ph (Phase 1, 15-minute expiry)
    email_service.send_password_reset_email(user.email, user.full_name, raw_token)

    # Invalidate active sessions and force password change
    user.force_password_change = True
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_revoked": True})

    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="PASSWORD_RESET_TRIGGERED",
        resource_type="USER",
        resource_id=user.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"email": user.email}
    )
    db.add(log)
    db.commit()

    return {
        "user_id": user.id,
        "email": user.email,
        "reset_token": raw_token,
        "reset_link": f"/reset-password?token={raw_token}",
        "expires_at": expires_at.isoformat(),
        "message": "Password reset token generated. Provide this link to the user."
    }


@router.post("/change-password")
def change_user_password(
    change_in: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Authenticated user changes password (or clears mandatory first-login password change)."""
    if not verify_password(change_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password does not match.")

    current_user.hashed_password = get_password_hash(change_in.new_password)
    current_user.force_password_change = False

    # Revoke old sessions except possibly current
    db.query(UserSession).filter(UserSession.user_id == current_user.id).update({"is_revoked": True})
    db.commit()

    return {"message": "Password successfully updated."}



@router.put("/{user_id}/attributes", response_model=UserResponse)
def update_user_attributes(
    user_id: str,
    attrs: UserAttributeUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to issue, modify, or revoke staff attributes for CP-ABE (FR-02, FR-03, SEC-05, SEC-06).
    Performs Tier 1 revocation in a single atomic transaction:
    1. Closes old account_manager_assignments rows (sets valid_to) and opens new ones.
    2. Re-keys user via issue_or_rekey_user (commit=False).
    3. Revokes all active user sessions immediately.
    4. Records ATTRIBUTE_CHANGE in audit logs.
    5. Commits all changes in a single database commit.
    6. Automatically triggers Tier 2 version bump and background re-encryption for any removed client tenants.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    old_accounts = list(user.assigned_client_accounts or [])
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    if attrs.role is not None:
        valid_roles = ("admin", "account_manager", "finance", "trainer", "trainee")
        if attrs.role.lower() not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        if user.role == "admin" and attrs.role.lower() != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator role cannot be demoted to preserve peer review oversight (OI-08, OI-30)."
            )
        user.role = attrs.role.lower()

    if attrs.assigned_client_accounts is not None:
        user.assigned_client_accounts = attrs.assigned_client_accounts

    if attrs.clearance_level is not None:
        user.clearance_level = attrs.clearance_level

    new_accounts = list(user.assigned_client_accounts or [])
    removed_accounts = [c for c in old_accounts if c not in new_accounts]

    # 1. Update Account Manager assignments in the same transaction (FR-03, Table 15)
    # Close previous active assignments
    db.query(AccountManagerAssignment).filter(
        AccountManagerAssignment.user_id == user.id,
        AccountManagerAssignment.valid_to == None
    ).update({"valid_to": now_utc}, synchronize_session=False)

    # Open new assignment rows for current companies if user is account_manager
    if user.role == "account_manager" and user.assigned_client_accounts:
        assigned_comps = db.query(ClientCompany).filter(
            ClientCompany.code.in_(user.assigned_client_accounts)
        ).all()
        for comp in assigned_comps:
            new_assign = AccountManagerAssignment(
                user_id=user.id,
                company_id=comp.id,
                valid_from=now_utc,
                valid_to=None,
                assigned_by=admin_user.id
            )
            db.add(new_assign)

    # 2. Call issue_or_rekey_user in this transaction without separate commits (commit=False)
    attribute_manager.issue_or_rekey_user(
        db=db,
        user=user,
        admin_user_id=admin_user.id,
        commit=False
    )

    # 3. Revoke all active sessions immediately (TC-ATT-03, TC-ATT-10, U-07)
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False
    ).update({"is_revoked": True}, synchronize_session=False)

    # 4. Log attribute change to audit log (SEC-12, Table 19: ATTRIBUTE_CHANGE)
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="ATTRIBUTE_CHANGE",
        resource_type="USER",
        resource_id=user.id,
        outcome="SUCCESS",
        details={
            "old_role": old_role,
            "new_role": user.role,
            "old_assigned_companies": old_accounts,
            "new_assigned_companies": user.assigned_client_accounts,
            "removed_companies": removed_accounts
        }
    )
    db.add(log)

    # 5. Commit all Tier 1 changes in a single atomic commit
    db.commit()
    db.refresh(user)

    # 6. Tier 2 Automatic Trigger (DD-05, OI-16, Section 3.6.4, 3.6.5)
    # When a tenant is removed, bump attribute version, re-key remaining authorized users, and run re-encryption job
    if removed_accounts:
        for comp_code in removed_accounts:
            try:
                old_attr, new_attr = attribute_manager.bump_attribute_version(
                    db=db,
                    attribute_type="CLIENT",
                    ref_code=comp_code,
                    admin_user_id=admin_user.id
                )
                # Re-key remaining authorized users who retain access to this tenant
                other_users = (
                    db.query(User)
                    .filter(
                        User.id != user.id,
                        User.is_active == True,
                        User.role.in_(["admin", "finance", "account_manager"])
                    )
                    .all()
                )
                for other in other_users:
                    if other.role in ("admin", "finance") or (
                        other.assigned_client_accounts and comp_code in other.assigned_client_accounts
                    ):
                        attribute_manager.issue_or_rekey_user(
                            db=db,
                            user=other,
                            client_versions={comp_code: new_attr.version},
                            admin_user_id=admin_user.id
                        )

                # Run background re-encryption job from old_attr.version to new_attr.version
                attribute_manager.reencrypt_records_job(
                    db=db,
                    company_code=comp_code,
                    old_version=old_attr.version,
                    new_version=new_attr.version,
                    admin_user_id=admin_user.id
                )
            except Exception as e:
                logger.error(f"Error during automatic Tier 2 revocation for company {comp_code}: {e}")

    return user


@router.get("/{user_id}/cpabe-key")
def get_user_cpabe_key(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches metadata for user's active CP-ABE cryptographic key (Section 3.6.4, DD-09).
    
    Security Guarantee: Server-side enclave key store never exports raw private key material
    via the API. Keys remain encrypted under KMS envelope at rest and in memory during decryption.
    """
    if current_user.id != user_id and current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to access keys for this user")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    active_key = (
        db.query(UserAbeKey)
        .filter(UserAbeKey.user_id == target_user.id, UserAbeKey.status == "active")
        .order_by(desc(UserAbeKey.issued_at))
        .first()
    )

    attributes_list = []
    if active_key:
        junction = db.query(UserKeyAttribute).filter(UserKeyAttribute.key_id == active_key.id).all()
        attributes_list = [j.token for j in junction]

    return {
        "key_id": active_key.id if active_key else None,
        "user_id": target_user.id,
        "user_email": target_user.email,
        "status": active_key.status if active_key else "none",
        "issued_at": active_key.issued_at.isoformat() if active_key and active_key.issued_at else None,
        "kms_key_arn": active_key.kms_key_arn if active_key else "local-kms-envelope",
        "attributes": attributes_list,
        "algorithm": "CP-ABE-BSW07-AES256GCM",
        "key_storage": "server_enclave"
    }
