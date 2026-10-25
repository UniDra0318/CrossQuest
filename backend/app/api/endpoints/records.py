import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    TrainingRecord, TrainingRecordVersion, Trainee, ClientCompany, User, AccessLog,
    AccountManagerAssignment, TrainerAssignment, TrainingSession
)
from app.schemas.schemas import (
    TrainingRecordCreate, TrainingRecordUpdate, TrainingRecordResponse, DecryptedRecordResponse
)
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
    """Edits a training record.
    
    Permissions (Table 17, FR-07):
    - Admin: allowed.
    - Finance: allowed.
    - Account Manager, Trainer, Trainee: DENIED.
    """
    if current_user.role not in ("admin", "finance"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Administrators and Finance personnel may edit training records")

    record = db.query(TrainingRecord).filter(TrainingRecord.id == record_id).first()
    if not record or record.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Training record not found")

    # Save previous version to version history before modifying (DD-06, Section 3.5.2, p. 33)
    version_count = db.query(func.count(TrainingRecordVersion.id)).filter(TrainingRecordVersion.record_id == record.id).scalar() or 0
    prev_version = TrainingRecordVersion(
        record_id=record.id,
        version_no=version_count + 1,
        abe_ciphertext=record.abe_ciphertext,
        payload_ciphertext=record.payload_ciphertext,
        policy_tokens=record.encryption_policy,
        edited_by_user_id=current_user.id
    )
    db.add(prev_version)

    changed_fields = []
    if update_in.status is not None:
        record.status = update_in.status
        changed_fields.append("status")
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
        details={"fields_changed": changed_fields}
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
