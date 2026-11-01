import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    TrainingRecord, TrainingRecordVersion, Trainee, ClientCompany, User, AccessLog,
    AccountManagerAssignment, TrainerAssignment, TrainingSession, Certificate, GamificationProgress
)
from app.schemas.schemas import (
    TrainingRecordCreate, TrainingRecordUpdate, TrainingRecordResponse, DecryptedRecordResponse,
    TrainerSignOffRequest, TrainerSignOffResponse
)
from app.api.endpoints.certifications import generate_cert_serial
from app.api.deps import get_current_user
from app.crypto.cpabe_engine import cpabe_engine
from app.anomaly.detector import anomaly_detector

router = APIRouter()

def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


@router.post("/", response_model=TrainingRecordResponse)
def create_training_record(
    record_in: TrainingRecordCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new training record.
    
    Permissions (Table 17):
    - Admin: allowed.
    - Finance: allowed.
    - Account Manager: allowed only for assigned client companies.
    - Trainer & Trainee: not permitted (FR-06, FR-13).
    """
    if current_user.role not in ("admin", "finance", "account_manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create training records")

    company = db.query(ClientCompany).filter(ClientCompany.id == record_in.company_at_completion_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Client company not found")

    # Scope check for Account Manager
    if current_user.role == "account_manager":
        assigned = current_user.assigned_client_accounts or []
        if company.code not in assigned:
            # Out of scope attempt
            anomaly_detector.record_out_of_scope_attempt(current_user, "CREATE_RECORD", company.code, db)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create records for unassigned client companies")

    trainee = db.query(Trainee).filter(Trainee.id == record_in.trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    session = None
    if record_in.session_id:
        session = db.query(TrainingSession).filter(TrainingSession.id == record_in.session_id).first()

    # Construct CP-ABE Policy (DD-01, DD-04, DD-05, Section 3.6.4)
    # ROLEADMINV1 or ROLEFINANCEV1 or (ROLEACCTMGRV1 and CLIENT<comp>V1) or (ROLETRAINERV1 and TRAINING<sess>V1) or TRAINEE<trainee_code>V1
    policy_str = cpabe_engine.build_record_policy(
        company_code=company.code,
        session_code=session.session_code if session else None,
        trainee_code=trainee.trainee_code
    )

    sensitive_payload = {
        "score": record_in.score,
        "assessment_notes": record_in.assessment_notes or "Official Crossworks training assessment record.",
        "practical_lab": record_in.practical_lab,
        "certificate_reference": record_in.certificate_reference,
        "extension_fields": record_in.extension_fields or {}
    }

    encrypted_result = cpabe_engine.encrypt_record(
        plaintext_data=sensitive_payload,
        policy_str=policy_str,
        record_id=f"rec-{trainee.trainee_code}",
        version=1
    )

    record = TrainingRecord(
        trainee_id=record_in.trainee_id,
        session_id=record_in.session_id,
        company_at_completion_id=record_in.company_at_completion_id,
        course_name=record_in.course_name,
        status=record_in.status,
        score=record_in.score,
        encryption_policy=policy_str,
        policy_version=1,
        abe_ciphertext=encrypted_result.get("abe_ciphertext"),
        payload_ciphertext=encrypted_result.get("payload_ciphertext"),
        nonce=encrypted_result.get("nonce"),
        is_encrypted=True
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Log to append-only audit log
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="RECORD_CREATE",
        resource_type="RECORD",
        resource_id=record.id,
        company_id=company.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"course_name": record.course_name, "trainee_code": trainee.trainee_code}
    )
    db.add(log)
    db.commit()

    return record


@router.get("/", response_model=List[TrainingRecordResponse])
def list_training_records(
    trainee_id: Optional[str] = None,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists training records scoped by role (Table 17):
    - Admin & Finance: all records.
    - Account Manager: assigned clients only.
    - Trainer: assigned sessions only.
    - Trainee: own records only across all companies.
    """
    query = db.query(TrainingRecord)

    if not (include_deleted and current_user.role == "admin"):
        query = query.filter(TrainingRecord.deleted_at == None)

    if current_user.role in ("admin", "finance"):
        pass # All records
    elif current_user.role == "account_manager":
        assigned_codes = current_user.assigned_client_accounts or []
        assigned_companies = db.query(ClientCompany.id).filter(ClientCompany.code.in_(assigned_codes)).all()
        company_ids = [c[0] for c in assigned_companies]
        query = query.filter(TrainingRecord.company_at_completion_id.in_(company_ids))
    elif current_user.role == "trainer":
        assigned_sessions = db.query(TrainerAssignment.session_id).filter(TrainerAssignment.user_id == current_user.id).all()
        session_ids = [s[0] for s in assigned_sessions]
        query = query.filter(TrainingRecord.session_id.in_(session_ids))
    elif current_user.role == "trainee":
        trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
        if not trainee:
            return []
        query = query.filter(TrainingRecord.trainee_id == trainee.id)
    else:
        return []

    if trainee_id:
        query = query.filter(TrainingRecord.trainee_id == trainee_id)

    return query.all()


@router.post("/{record_id}/decrypt", response_model=DecryptedRecordResponse)
def decrypt_training_record(
    record_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Decrypts a training record using CP-ABE and evaluates R1, R3, and S1 anomaly rules."""
    record = db.query(TrainingRecord).filter(TrainingRecord.id == record_id).first()
    if not record or record.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Training record not found")

    client_ip = _get_client_ip(request)
    company = db.query(ClientCompany).filter(ClientCompany.id == record.company_at_completion_id).first()
    company_code = company.code if company else ""

    # 1. Scope check (Application-Level Authorization: SEC-02)
    is_in_scope = True
    if current_user.role in ("admin", "finance"):
        is_in_scope = True
    elif current_user.role == "account_manager":
        is_in_scope = company_code in (current_user.assigned_client_accounts or [])
    elif current_user.role == "trainer":
        is_assigned = (
            db.query(TrainerAssignment)
            .filter(
                TrainerAssignment.user_id == current_user.id,
                TrainerAssignment.session_id == record.session_id
            )
            .first()
        )
        is_in_scope = bool(is_assigned)
    elif current_user.role == "trainee":
        trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
        is_in_scope = (trainee and record.trainee_id == trainee.id)

    if not is_in_scope:
        # Log ACCESS_DENIED
        log = AccessLog(
            actor_user_id=current_user.id,
            actor_role=current_user.role,
            event_type="ACCESS_DENIED",
            resource_type="RECORD",
            resource_id=record.id,
            company_id=record.company_at_completion_id,
            outcome="DENIED",
            reason_code="OUT_OF_SCOPE",
            source_ip=client_ip,
            details={"requested_company": company_code}
        )
        db.add(log)
        db.commit()

        # Trigger Rule R1 (and S1 if after hours)
        anomaly_detector.record_out_of_scope_attempt(current_user, f"RECORD:{record_id}", company_code, db)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Record is outside your authorized organizational scope."
        )

    # 2. Check Rule R3-a: High record access
    anomaly_detector.check_high_record_access(current_user, db)

    # 3. Build User CP-ABE attributes based on current assignments
    trainee_obj = db.query(Trainee).filter(Trainee.id == record.trainee_id).first()
    trainee_code = trainee_obj.trainee_code if trainee_obj else ""

    user_trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
    my_trainee_code = user_trainee.trainee_code if user_trainee else None

    trainer_sessions = []
    if current_user.role == "trainer":
        assignments = db.query(TrainerAssignment).filter(TrainerAssignment.user_id == current_user.id).all()
        session_ids = [a.session_id for a in assignments]
        if session_ids:
            sessions = db.query(TrainingSession).filter(TrainingSession.id.in_(session_ids)).all()
            trainer_sessions = [s.session_code for s in sessions]

    user_attrs = cpabe_engine.build_user_attributes(
        role=current_user.role,
        assigned_companies=current_user.assigned_client_accounts,
        assigned_sessions=trainer_sessions,
        trainee_code=my_trainee_code
    )

    user_key_info = cpabe_engine.generate_user_private_key(user_attrs)

    cipher_package = {
        "policy": record.encryption_policy,
        "policy_version": record.policy_version,
        "abe_ciphertext": record.abe_ciphertext,
        "payload_ciphertext": record.payload_ciphertext,
        "nonce": record.nonce,
        "engine": "charm-bsw07" if cpabe_engine.charm_available else "simulation"
    }

    decrypted_content = cpabe_engine.decrypt_record(
        encrypted_record=cipher_package,
        user_key_info=user_key_info,
        record_id=f"rec-{trainee_code}",
        version=record.policy_version
    )

    if decrypted_content is None:
        log = AccessLog(
            actor_user_id=current_user.id,
            actor_role=current_user.role,
            event_type="ACCESS_DENIED",
            resource_type="RECORD",
            resource_id=record.id,
            company_id=record.company_at_completion_id,
            outcome="DENIED",
            reason_code="FAILED_POLICY",
            source_ip=client_ip,
            details={"policy": record.encryption_policy}
        )
        db.add(log)
        db.commit()
        anomaly_detector.record_out_of_scope_attempt(current_user, f"RECORD:{record_id}", company_code, db)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CP-ABE Decryption Failed: Your cryptographic attributes do not satisfy the record's access policy."
        )

    # Log successful access
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="ACCESS_ALLOWED",
        resource_type="RECORD",
        resource_id=record.id,
        company_id=record.company_at_completion_id,
        outcome="SUCCESS",
        source_ip=client_ip,
        details={"mode": "HYBRID_DECRYPT"}
    )
    db.add(log)
    db.commit()

    return {
        "record_id": record.id,
        "course_name": record.course_name,
        "status": record.status,
        "score": record.score,
        "completion_date": record.completion_date,
        "decrypted_content": decrypted_content,
        "decryption_status": "SUCCESS"
    }


@router.put("/{record_id}", response_model=TrainingRecordResponse)
def edit_training_record(
    record_id: str,
    update_in: TrainingRecordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Edits a training record with strict role boundaries (Phase 2, Section 3.5.3, Table 16/17):
    - Account Manager: records attendance and pre-completion statuses (Enrolled, In progress, Not completed) for assigned clients.
      Cannot mark as Completed without Trainer sign-off.
    - Admin & Finance: may edit records but MANDATES an explanation reason and generates a version history row.
    - Trainer & Trainee: DENIED.
    """
    if current_user.role not in ("admin", "finance", "account_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators, Finance, and assigned Account Managers may modify training records."
        )

    record = db.query(TrainingRecord).filter(TrainingRecord.id == record_id).first()
    if not record or record.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Training record not found")

    company = db.query(ClientCompany).filter(ClientCompany.id == record.company_at_completion_id).first()
    company_code = company.code if company else ""

    # Account Manager Scoping and Restrictions
    if current_user.role == "account_manager":
        assigned_codes = current_user.assigned_client_accounts or []
        if company_code not in assigned_codes:
            anomaly_detector.record_out_of_scope_attempt(current_user, f"EDIT_RECORD:{record_id}", company_code, db)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify training records for unassigned client companies."
            )
        
        # A record cannot become Completed without Trainer sign-off!
        if update_in.status == "Completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A training record cannot become Completed without official Trainer session sign-off."
            )

    # Admin & Finance Mandatory Reason Check
    if current_user.role in ("admin", "finance"):
        if not update_in.reason or not update_in.reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A mandatory explanation reason must be provided for Admin or Finance record modifications."
            )

    # Save previous version to version history before modifying (DD-06, Section 3.5.2, p. 33)
    version_count = db.query(func.count(TrainingRecordVersion.id)).filter(TrainingRecordVersion.record_id == record.id).scalar() or 0
    prev_version = TrainingRecordVersion(
        record_id=record.id,
        version_no=version_count + 1,
        abe_ciphertext=record.abe_ciphertext,
        payload_ciphertext=record.payload_ciphertext,
        policy_tokens=record.encryption_policy,
        edited_by_user_id=current_user.id,
        reason=update_in.reason.strip() if update_in.reason else None
    )
    db.add(prev_version)

    changed_fields = []
    if update_in.status is not None:
        # Validate status in the 4 allowed statuses
        if update_in.status not in ("Enrolled", "In progress", "Not completed", "Completed"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid completion status. Must be Enrolled, In progress, Not completed, or Completed."
            )
        if update_in.status == "Completed" and record.session_id:
            session = db.query(TrainingSession).filter(TrainingSession.id == record.session_id).first()
            if session and not session.trainer_signed_off and current_user.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Training record cannot be marked Completed because the training session has not been signed off by the Trainer."
                )
        record.status = update_in.status
        changed_fields.append("status")

    if update_in.attendance_status is not None:
        record.attendance_status = update_in.attendance_status
        changed_fields.append("attendance_status")

    if update_in.score is not None:
        record.score = update_in.score
        changed_fields.append("score")

    if update_in.completion_date is not None:
        record.completion_date = update_in.completion_date
        changed_fields.append("completion_date")

    db.commit()
    db.refresh(record)

    # Log to audit log
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="RECORD_EDIT",
        resource_type="RECORD",
        resource_id=record.id,
        company_id=record.company_at_completion_id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={
            "fields_changed": changed_fields,
            "reason": update_in.reason if update_in.reason else "Account Manager attendance / status update"
        }
    )
    db.add(log)
    db.commit()

    # Trigger Rule R4-b (or R4-c if bulk)
    anomaly_detector.record_edit_event(current_user, record.id, changed_fields, db)

    return record


@router.delete("/{record_id}")
def delete_training_record(
    record_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft deletion of a training record (DD-06, FR-08, Section 3.5.3).
    
    Permissions (Table 17):
    - Admin: ONLY.
    - All other roles: DENIED.
    Immediately triggers Rule R4-a High Alert!
    """
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Deletion of training records is strictly reserved for Administrators")

    record = db.query(TrainingRecord).filter(TrainingRecord.id == record_id).first()
    if not record or record.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Training record not found")

    company = db.query(ClientCompany).filter(ClientCompany.id == record.company_at_completion_id).first()
    company_code = company.code if company else ""

    record.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    record.deleted_by = current_user.id
    db.commit()

    # Log to audit log
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="RECORD_DELETE",
        resource_type="RECORD",
        resource_id=record.id,
        company_id=record.company_at_completion_id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"action": "SOFT_DELETE", "course_name": record.course_name}
    )
    db.add(log)
    db.commit()

    # Trigger Rule R4-a: HIGH severity alert immediately!
    anomaly_detector.record_deletion_event(current_user, record.id, company_code, db)

    return {"message": f"Record {record_id} successfully deleted (soft-delete).", "status": "DELETED"}



@router.post("/sessions/{session_id}/sign-off", response_model=TrainerSignOffResponse)
def sign_off_training_session(
    session_id: str,
    signoff_in: TrainerSignOffRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trainer signs off once per session and confirms each participant's completion (Phase 2, Section 3.5.3).
    
    Permissions:
    - Assigned Trainer for the session.
    - Administrator.
    - All other roles: DENIED.
    
    Upon sign-off:
    - Session is marked signed off.
    - Confirmed participants are marked 'Completed' and official Certificates are issued.
    - Non-passing participants are marked 'Not completed'.
    """
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")

    # Verify trainer assignment
    if current_user.role == "trainer":
        assignment = db.query(TrainerAssignment).filter(
            TrainerAssignment.session_id == session.id,
            TrainerAssignment.user_id == current_user.id
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the designated Trainer for this training session."
            )
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned Trainer or an Administrator can sign off a training session."
        )

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    session.trainer_signed_off = True
    session.trainer_sign_off_at = now_utc
    session.trainer_sign_off_user_id = current_user.id
    session.trainer_sign_off_notes = signoff_in.notes

    certs_issued = 0
    records_updated = 0

    for comp in signoff_in.completions:
        rec = db.query(TrainingRecord).filter(
            TrainingRecord.id == comp.record_id,
            TrainingRecord.session_id == session.id
        ).first()
        if not rec:
            continue

        if comp.status not in ("Completed", "Not completed"):
            continue

        rec.status = comp.status
        if comp.score is not None:
            rec.score = comp.score
        records_updated += 1

        if comp.status == "Completed":
            rec.completion_date = now_utc

            # Sync Gamification & streak on attendance/completion (Phase 6)
            if rec.trainee_id:
                t_obj = db.query(Trainee).filter(Trainee.id == rec.trainee_id).first()
                if t_obj:
                    g_obj = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == t_obj.id).first()
                    if not g_obj:
                        g_obj = GamificationProgress(trainee_id=t_obj.id, points=0, quizzes_completed=0, level=1, badges=[])
                        db.add(g_obj)
                    g_obj.points = (g_obj.points or 0) + 50
                    g_obj.level = max(1, 1 + (g_obj.points // 100))
                    today = now_utc.date()
                    if t_obj.last_activity_date:
                        delta = (today - t_obj.last_activity_date).days
                        if delta == 1:
                            t_obj.current_streak = (t_obj.current_streak or 0) + 1
                        elif delta > 1:
                            t_obj.current_streak = 1
                    else:
                        t_obj.current_streak = 1
                    t_obj.last_activity_date = today
                    g_obj.streak = t_obj.current_streak
                    g_obj.last_activity_date = today

            # Trigger Certificate Issuance for completed participant
            existing_cert = db.query(Certificate).filter(
                Certificate.record_id == rec.id
            ).first()
            if not existing_cert:
                company = db.query(ClientCompany).filter(ClientCompany.id == rec.company_at_completion_id).first()
                company_code = company.code if company else "CRO"
                serial = generate_cert_serial(db, company_code, now_utc)

                cert = Certificate(
                    record_id=rec.id,
                    trainee_id=rec.trainee_id,
                    title=f"Certificate of Completion - {session.course_name}",
                    serial_number=serial,
                    issue_date=now_utc,
                    expiry_date=now_utc + timedelta(days=36 * 30),
                    expiry_basis="Calculated: issue_date + 36 months validity",
                    status="Valid"
                )
                db.add(cert)
                certs_issued += 1

    db.commit()
    db.refresh(session)

    # Audit log
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="TRAINER_SIGN_OFF",
        resource_type="SESSION",
        resource_id=session.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={
            "session_code": session.session_code,
            "course_name": session.course_name,
            "participants_updated": records_updated,
            "certificates_issued": certs_issued,
            "notes": signoff_in.notes
        }
    )
    db.add(log)
    db.commit()

    return {
        "session_id": session.id,
        "session_code": session.session_code,
        "trainer_signed_off": session.trainer_signed_off,
        "trainer_sign_off_at": session.trainer_sign_off_at,
        "certificates_issued": certs_issued,
        "participants_updated": records_updated
    }
