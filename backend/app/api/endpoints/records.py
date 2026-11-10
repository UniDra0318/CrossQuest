import json
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    TrainingRecord, TrainingRecordVersion, Trainee, ClientCompany, User, AccessLog,
    AccountManagerAssignment, TrainerAssignment, TrainingSession, Certificate, GamificationProgress, Course
)
from app.schemas.schemas import (
    TrainingRecordCreate, TrainingRecordUpdate, TrainingRecordResponse, DecryptedRecordResponse,
    TrainerSignOffRequest, TrainerSignOffResponse, TrainingSessionCreate, TrainingSessionResponse,
    TrainerAssignmentCreate, TrainerAssignmentResponse
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


@router.get("/export/csv")
def export_training_records_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exports master training records vault into CSV for administrators and authorized managers (SEC-10, Table 17)."""
    if current_user.role not in ("admin", "finance", "account_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export master training records vault."
        )

    query = db.query(TrainingRecord).filter(TrainingRecord.deleted_at == None)
    if current_user.role == "account_manager":
        assigned_codes = current_user.assigned_client_accounts or []
        assigned_companies = db.query(ClientCompany.id).filter(ClientCompany.code.in_(assigned_codes)).all()
        company_ids = [c[0] for c in assigned_companies]
        shared_trainee_ids = [
            t[0] for t in db.query(TrainingRecord.trainee_id)
            .filter(
                TrainingRecord.company_at_completion_id.in_(company_ids),
                TrainingRecord.deleted_at == None
            ).distinct().all()
        ]
        if shared_trainee_ids:
            query = query.filter(
                or_(
                    TrainingRecord.company_at_completion_id.in_(company_ids),
                    TrainingRecord.trainee_id.in_(shared_trainee_ids)
                )
            )
        else:
            query = query.filter(TrainingRecord.company_at_completion_id.in_(company_ids))

    records = query.order_by(TrainingRecord.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID", "Trainee Name", "Trainee Email", "Client Organization",
        "Course Program", "Score", "Status", "Completion Date", "Policy"
    ])
    for r in records:
        trainee = db.query(Trainee).filter(Trainee.id == r.trainee_id).first()
        company = db.query(ClientCompany).filter(ClientCompany.id == r.company_at_completion_id).first()
        writer.writerow([
            r.id,
            f"{trainee.first_name} {trainee.last_name}" if trainee else "",
            trainee.email if trainee else "",
            company.name if company else "",
            r.course_name or "",
            r.score if r.score is not None else "",
            r.status or "",
            r.completion_date.isoformat() if r.completion_date else "",
            r.encryption_policy or ""
        ])
    output.seek(0)
    filename = f"CrossQuest_Training_Records_Vault_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


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
        # Option B (Chapter III Section 3.2.1, FR-09..12):
        # Account Managers view assigned clients plus full cross-company history of shared Trainees.
        shared_trainee_ids = [
            t[0] for t in db.query(TrainingRecord.trainee_id)
            .filter(
                TrainingRecord.company_at_completion_id.in_(company_ids),
                TrainingRecord.deleted_at == None
            ).distinct().all()
        ]
        if shared_trainee_ids:
            query = query.filter(
                or_(
                    TrainingRecord.company_at_completion_id.in_(company_ids),
                    TrainingRecord.trainee_id.in_(shared_trainee_ids)
                )
            )
        else:
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

    records = query.all()
    results = []
    for r in records:
        t_name = f"{r.trainee.first_name} {r.trainee.last_name}".strip() if r.trainee else "Unknown Trainee"
        t_email = r.trainee.email if r.trainee else ""
        t_code = r.trainee.trainee_code if r.trainee else ""
        c_name = r.company_at_completion.name if r.company_at_completion else "Unknown Organization"
        c_code = r.company_at_completion.code if r.company_at_completion else "CRO"

        item = TrainingRecordResponse(
            id=r.id,
            trainee_id=r.trainee_id,
            trainee_name=t_name,
            trainee_email=t_email,
            trainee_code=t_code,
            company_name=c_name,
            company_code=c_code,
            session_id=r.session_id,
            company_at_completion_id=r.company_at_completion_id,
            course_name=r.course_name,
            status=r.status,
            score=r.score,
            completion_date=r.completion_date,
            encryption_policy=r.encryption_policy,
            policy_version=r.policy_version or 1,
            is_encrypted=True if r.is_encrypted is None else bool(r.is_encrypted),
            deleted_at=r.deleted_at,
            deleted_by=r.deleted_by,
            created_at=r.created_at
        )
        results.append(item)
    return results


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
    is_shared_trainee_view = False
    if current_user.role in ("admin", "finance"):
        is_in_scope = True
    elif current_user.role == "account_manager":
        assigned_codes = current_user.assigned_client_accounts or []
        if company_code in assigned_codes:
            is_in_scope = True
        else:
            # Option B (Chapter III Section 3.2.1, FR-09..12):
            # Account Manager can view/decrypt records of a shared trainee who trained under an assigned company
            assigned_companies = db.query(ClientCompany.id).filter(ClientCompany.code.in_(assigned_codes)).all()
            company_ids = [c[0] for c in assigned_companies]
            has_shared_record = db.query(TrainingRecord.id).filter(
                TrainingRecord.trainee_id == record.trainee_id,
                TrainingRecord.company_at_completion_id.in_(company_ids),
                TrainingRecord.deleted_at == None
            ).first() is not None
            if has_shared_record:
                is_in_scope = True
                is_shared_trainee_view = True
            else:
                is_in_scope = False
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

    effective_assigned_companies = list(current_user.assigned_client_accounts or [])
    if is_shared_trainee_view and company_code and company_code not in effective_assigned_companies:
        effective_assigned_companies.append(company_code)

    user_attrs = cpabe_engine.build_user_attributes(
        role=current_user.role,
        assigned_companies=effective_assigned_companies,
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

    t_name = f"{record.trainee.first_name} {record.trainee.last_name}".strip() if record.trainee else "Unknown Trainee"
    t_email = record.trainee.email if record.trainee else ""
    c_name = company.name if company else "Unknown Organization"

    return {
        "record_id": record.id,
        "course_name": record.course_name,
        "status": record.status,
        "trainee_name": t_name,
        "trainee_email": t_email,
        "company_name": c_name,
        "company_code": company_code,
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

        # Prohibit Account Manager from entering or updating evaluation scores (Chapter III Table 9, Table 16)
        if update_in.score is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account Managers are not permitted to enter or modify practical evaluation scores. Score entry is reserved for Administrators."
            )

    # Mandatory Reason Check for Record Corrections (U-05, FR-08)
    if current_user.role in ("admin", "finance"):
        if not update_in.reason or not update_in.reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A mandatory explanation reason must be provided for record modifications (U-05)."
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


@router.post("/{record_id}/restore")
def restore_training_record(
    record_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restores a soft-deleted training record (U-07, DD-06).
    
    Permissions (Table 17):
    - Admin: ONLY.
    """
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Restoration of training records is strictly reserved for Administrators"
        )

    record = db.query(TrainingRecord).filter(TrainingRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Training record not found")
    if record.deleted_at is None:
        raise HTTPException(status_code=400, detail="Training record is not deleted")

    record.deleted_at = None
    record.deleted_by = None
    db.commit()
    db.refresh(record)

    # Log to audit log
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="RECORD_RESTORE",
        resource_type="RECORD",
        resource_id=record.id,
        company_id=record.company_at_completion_id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"action": "RESTORE", "course_name": record.course_name}
    )
    db.add(log)
    db.commit()

    return {"message": f"Record {record_id} successfully restored.", "status": "RESTORED"}



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

    # TC-DAT-17 & TC-CRT-11: Future-Date & Timezone Protection (Asia/Manila UTC+8)
    manila_tz = timezone(timedelta(hours=8))
    now_manila_naive = datetime.now(timezone.utc).astimezone(manila_tz).replace(tzinfo=None)
    if session.start_date and session.start_date > now_manila_naive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot sign off on a future-dated training session before its scheduled date."
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
                course = db.query(Course).filter(Course.id == session.course_id).first() if session.course_id else None
                course_tla = course.acronym_3 if course and course.acronym_3 else None
                if not course_tla and session.course_name:
                    course_tla = "".join([c for c in session.course_name.upper() if c.isalnum()])[:3]
                training_start = session.start_date or now_utc
                serial = generate_cert_serial(db, course_tla=course_tla, training_date=training_start, company_code=company_code)

                cert = Certificate(
                    record_id=rec.id,
                    trainee_id=rec.trainee_id,
                    title=f"Certificate of Completion - {session.course_name}",
                    serial_number=serial,
                    issue_date=now_utc,
                    expiry_date=None,  # Crossworks completion certificates do not expire (U-17, Section 3.8.2)
                    expiry_basis="Non-expiring completion certificate",
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


@router.get("/sessions/assigned")
def list_assigned_training_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve training sessions assigned to the current Trainer (or all sessions if Admin).
    Returns session metadata, roster attendees, completion status, and Manila future-date flag.
    """
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Trainers and Administrators can view session roster assignments."
        )

    manila_tz = timezone(timedelta(hours=8))
    now_manila_naive = datetime.now(timezone.utc).astimezone(manila_tz).replace(tzinfo=None)

    query = db.query(TrainingSession)
    if current_user.role == "trainer":
        query = query.join(TrainerAssignment, TrainerAssignment.session_id == TrainingSession.id)\
                     .filter(TrainerAssignment.user_id == current_user.id)

    sessions = query.order_by(TrainingSession.start_date.desc()).all()

    result = []
    for s in sessions:
        is_future = bool(s.start_date and s.start_date > now_manila_naive)

        records = db.query(TrainingRecord).filter(
            TrainingRecord.session_id == s.id,
            TrainingRecord.deleted_at == None
        ).all()

        roster_items = []
        for r in records:
            cert = db.query(Certificate).filter(Certificate.record_id == r.id).first()
            trainee_name = "Unknown Trainee"
            trainee_email = ""
            trainee_code = ""
            if r.trainee:
                trainee_name = f"{r.trainee.first_name} {r.trainee.last_name}".strip()
                trainee_email = r.trainee.email
                trainee_code = r.trainee.trainee_code

            company_name = r.company_at_completion.name if r.company_at_completion else "Unknown"
            company_code = r.company_at_completion.code if r.company_at_completion else "CRO"

            roster_items.append({
                "record_id": r.id,
                "trainee_id": r.trainee_id,
                "trainee_code": trainee_code,
                "trainee_name": trainee_name,
                "trainee_email": trainee_email,
                "company_name": company_name,
                "company_code": company_code,
                "status": r.status,
                "attendance_status": r.attendance_status,
                "score": r.score,
                "completion_date": r.completion_date.isoformat() if r.completion_date else None,
                "certificate_serial": cert.serial_number if cert else None
            })

        result.append({
            "id": s.id,
            "session_code": s.session_code,
            "course_id": s.course_id,
            "course_name": s.course_name,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "delivery_type": s.delivery_type,
            "trainer_signed_off": bool(s.trainer_signed_off),
            "trainer_sign_off_at": s.trainer_sign_off_at.isoformat() if s.trainer_sign_off_at else None,
            "trainer_sign_off_user_id": s.trainer_sign_off_user_id,
            "trainer_sign_off_notes": s.trainer_sign_off_notes,
            "venue": s.venue or ("Online (Virtual Meeting)" if s.delivery_mode == "Online" else "Crossworks Makati Learning Hub"),
            "delivery_mode": s.delivery_mode or "F2F",
            "is_future_dated": is_future,
            "attendees_count": len(roster_items),
            "completed_count": sum(1 for item in roster_items if item["status"] == "Completed"),
            "records": roster_items
        })

    return result


# -----------------------------------------------------------------------------
# Training Session Management & Venue Support (Administrator & Account Manager)
# -----------------------------------------------------------------------------
@router.post("/sessions", response_model=TrainingSessionResponse)
def create_training_session(
    session_in: TrainingSessionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new training session with venue and delivery mode.
    Permitted for Administrator and Account Manager roles.
    Enforces venue requirements for Online vs Face-to-Face delivery.
    """
    if current_user.role not in ("admin", "account_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and Account Managers can create training sessions."
        )

    # Check for duplicate session code
    existing = db.query(TrainingSession).filter(
        TrainingSession.session_code == session_in.session_code.strip()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Training session with this code already exists.")

    venue = (session_in.venue or "").strip()
    delivery_mode = (session_in.delivery_mode or "F2F").strip()

    if delivery_mode.lower() == "online":
        if not venue:
            venue = "Online (Virtual Meeting)"
    elif delivery_mode.lower() == "f2f":
        if not venue:
            raise HTTPException(
                status_code=400,
                detail="Physical venue is required for Face-to-Face (F2F) training sessions."
            )

    new_session = TrainingSession(
        session_code=session_in.session_code.strip(),
        course_id=session_in.course_id,
        course_name=session_in.course_name.strip(),
        start_date=session_in.start_date,
        end_date=session_in.end_date,
        delivery_type=session_in.delivery_type,
        delivery_mode=delivery_mode,
        venue=venue
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Audit log
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="SESSION_CREATED",
        resource_type="SESSION",
        resource_id=new_session.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={
            "session_code": new_session.session_code,
            "course_name": new_session.course_name,
            "venue": new_session.venue,
            "delivery_mode": new_session.delivery_mode
        }
    )
    db.add(log)
    db.commit()

    return new_session


@router.get("/sessions", response_model=List[TrainingSessionResponse])
def list_training_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all training sessions with venue, delivery mode, and assigned trainers."""
    sessions = db.query(TrainingSession).order_by(TrainingSession.start_date.desc()).all()
    result = []
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    for s in sessions:
        trainers_list = []
        for ta in s.trainer_assignments:
            is_active = (ta.valid_to is None or ta.valid_to > now_utc)
            trainers_list.append({
                "assignment_id": ta.id,
                "user_id": ta.user_id,
                "trainer_name": ta.user.full_name if ta.user else "Unknown Trainer",
                "trainer_email": ta.user.email if ta.user else "",
                "valid_from": ta.valid_from.isoformat() if ta.valid_from else None,
                "valid_to": ta.valid_to.isoformat() if ta.valid_to else None,
                "is_active": is_active
            })

        result.append(TrainingSessionResponse(
            id=s.id,
            session_code=s.session_code,
            course_id=s.course_id,
            course_name=s.course_name,
            start_date=s.start_date,
            end_date=s.end_date,
            delivery_type=s.delivery_type or "Public",
            delivery_mode=s.delivery_mode or "F2F",
            venue=s.venue if (s.venue and s.venue.strip()) else ("Online (Virtual Meeting)" if s.delivery_mode == "Online" else "Crossworks Makati Learning Hub"),
            trainer_signed_off=bool(s.trainer_signed_off),
            trainer_sign_off_at=s.trainer_sign_off_at,
            created_at=s.created_at,
            assigned_trainers=trainers_list
        ))

    return result


# -----------------------------------------------------------------------------
# Trainer Assignments Management (FR-04)
# -----------------------------------------------------------------------------
@router.post("/sessions/{session_id}/trainers", response_model=TrainerAssignmentResponse)
def assign_trainer_to_session(
    session_id: str,
    assignment_in: TrainerAssignmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assigns a Trainer to a training session (FR-04). Administrator only."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators can assign trainers to sessions (FR-04)."
        )

    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found.")

    trainer_user = db.query(User).filter(User.id == assignment_in.user_id).first()
    if not trainer_user:
        raise HTTPException(status_code=404, detail="Trainer user not found.")
    if trainer_user.role != "trainer":
        raise HTTPException(status_code=400, detail="Target user does not have the trainer role.")

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # Check for active existing assignment
    active_assignment = db.query(TrainerAssignment).filter(
        TrainerAssignment.session_id == session_id,
        TrainerAssignment.user_id == assignment_in.user_id,
        (TrainerAssignment.valid_to == None) | (TrainerAssignment.valid_to > now_utc)
    ).first()
    if active_assignment:
        raise HTTPException(status_code=400, detail="Trainer is already actively assigned to this session.")

    new_assignment = TrainerAssignment(
        session_id=session_id,
        user_id=assignment_in.user_id,
        valid_from=now_utc,
        valid_to=None
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)

    # Log TRAINER_ASSIGNED
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="TRAINER_ASSIGNED",
        resource_type="SESSION",
        resource_id=session_id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={
            "session_code": session.session_code,
            "trainer_user_id": trainer_user.id,
            "trainer_email": trainer_user.email
        }
    )
    db.add(log)
    db.commit()

    return TrainerAssignmentResponse(
        id=new_assignment.id,
        user_id=new_assignment.user_id,
        session_id=new_assignment.session_id,
        trainer_name=trainer_user.full_name,
        trainer_email=trainer_user.email,
        valid_from=new_assignment.valid_from,
        valid_to=new_assignment.valid_to,
        is_active=True
    )


@router.delete("/sessions/{session_id}/trainers/{user_id}")
@router.put("/sessions/{session_id}/trainers/{user_id}/end")
def end_trainer_assignment(
    session_id: str,
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ends an active Trainer assignment to a training session (FR-04). Administrator only."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators can end trainer assignments (FR-04)."
        )

    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found.")

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    assignment = db.query(TrainerAssignment).filter(
        TrainerAssignment.session_id == session_id,
        TrainerAssignment.user_id == user_id,
        (TrainerAssignment.valid_to == None) | (TrainerAssignment.valid_to > now_utc)
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Active trainer assignment not found for this session.")

    assignment.valid_to = now_utc
    db.commit()

    # Log TRAINER_ASSIGNMENT_ENDED
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="TRAINER_ASSIGNMENT_ENDED",
        resource_type="SESSION",
        resource_id=session_id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={
            "session_code": session.session_code,
            "trainer_user_id": user_id,
            "ended_at": now_utc.isoformat()
        }
    )
    db.add(log)
    db.commit()

    return {"message": "Trainer assignment ended successfully.", "ended_at": now_utc.isoformat()}


@router.get("/sessions/{session_id}/trainers", response_model=List[TrainerAssignmentResponse])
def list_session_trainers(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all trainers assigned to a training session (past and active)."""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found.")

    assignments = db.query(TrainerAssignment).filter(TrainerAssignment.session_id == session_id).all()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    result = []
    for ta in assignments:
        is_active = bool(ta.valid_to is None or ta.valid_to > now_utc)
        result.append(TrainerAssignmentResponse(
            id=ta.id,
            user_id=ta.user_id,
            session_id=ta.session_id,
            trainer_name=ta.user.full_name if ta.user else "Unknown Trainer",
            trainer_email=ta.user.email if ta.user else "",
            valid_from=ta.valid_from,
            valid_to=ta.valid_to,
            is_active=is_active
        ))

    return result
