import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.entities import User, Trainee, AccessLog, UserSession, PasswordResetToken, UserAbeKey
from app.schemas.schemas import (
    UserResponse, UserAttributeUpdate, UserCreateAdmin, UserActivationResponse, PasswordChangeRequest
)
from app.api.deps import get_current_user, get_current_admin_user
from app.crypto.cpabe_engine import cpabe_engine

router = APIRouter()

def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to list all system accounts (FR-01, FR-02)."""
    return db.query(User).all()


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

    # Generate initial password or use temporary
    raw_pwd = user_in.temporary_password or secrets.token_urlsafe(16)
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(raw_pwd),
        role=user_in.role.lower(),
        assigned_client_accounts=user_in.assigned_client_accounts or [],
        force_password_change=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate single-use activation token (15-minute expiry)
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

    # Log to audit log
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="USER_CREATED",
        resource_type="USER",
        resource_id=user.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"created_email": user.email, "role": user.role}
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
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot disable your own administrator account.")

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

    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="ACCOUNT_REENABLED",
        resource_type="USER",
        resource_id=user.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"email": user.email}
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
    Note: Clearance levels are omitted per SEC-11.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    old_accounts = list(user.assigned_client_accounts or [])

    if attrs.role is not None:
        valid_roles = ("admin", "account_manager", "finance", "trainer", "trainee")
        if attrs.role.lower() not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        user.role = attrs.role.lower()

    if attrs.assigned_client_accounts is not None:
        user.assigned_client_accounts = attrs.assigned_client_accounts

    db.commit()
    db.refresh(user)

    # Log attribute change to audit log (SEC-12, Table 19: ATTRIBUTE_CHANGE)
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
            "new_assigned_companies": user.assigned_client_accounts
        }
    )
    db.add(log)
    db.commit()

    return user


@router.get("/{user_id}/cpabe-key")
def get_user_cpabe_key(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches/generates the CP-ABE private key corresponding to user's active attributes (Section 3.6.4)."""
    if current_user.id != user_id and current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to access keys for this user")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    trainee_obj = db.query(Trainee).filter(Trainee.user_id == target_user.id).first()
    trainee_code = trainee_obj.trainee_code if trainee_obj else None

    # Build attribute set: alphanumeric tokens only, no clearance levels (DD-01, DD-04, SEC-11)
    attributes = cpabe_engine.build_user_attributes(
        role=target_user.role,
        assigned_companies=target_user.assigned_client_accounts,
        trainee_code=trainee_code
    )

    key_info = cpabe_engine.generate_user_private_key(attributes)
    return key_info
