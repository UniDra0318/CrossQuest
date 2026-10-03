import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import TrainingRecord, Trainee, ClientCompany, User, AccessLog
from app.schemas.schemas import (
    TrainingRecordCreate, TrainingRecordResponse, DecryptedRecordResponse
)
from app.api.deps import get_current_user
from app.crypto.cpabe_engine import cpabe_engine
from app.anomaly.detector import anomaly_detector

router = APIRouter()

@router.post("/", response_model=TrainingRecordResponse)
def create_encrypted_training_record(
    record_in: TrainingRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new training record, encrypted with CP-ABE under an attribute policy."""
    company = db.query(ClientCompany).filter(ClientCompany.id == record_in.company_at_completion_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    trainee = db.query(Trainee).filter(Trainee.id == record_in.trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    # Define CP-ABE Policy
    # Example: "(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:CORP_ALPHA)"
    policy_str = (
        f"(ROLE:ADMIN) OR (ROLE:{record_in.required_role.upper()} AND COMPANY:{company.code.upper()})"
    )

    sensitive_payload = {
        "course_name": record_in.course_name,
        "score": record_in.score,
        "trainee_name": f"{trainee.first_name} {trainee.last_name}",
        "trainee_email": trainee.email,
        "company_code": company.code,
        "assessment_details": {
            "attempts": 1,
            "passed": (record_in.score or 0) >= 75.0,
            "remarks": "Official CrossQuest Assessment Verified"
        }
    }

    encrypted_result = cpabe_engine.encrypt_record(sensitive_payload, policy_str)

    record = TrainingRecord(
        trainee_id=record_in.trainee_id,
        company_at_completion_id=record_in.company_at_completion_id,
        course_name=record_in.course_name,
        status=record_in.status,
        score=record_in.score,
        encryption_policy=policy_str,
        encrypted_payload=json.dumps(encrypted_result),
        is_encrypted=True
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/", response_model=List[TrainingRecordResponse])
def list_training_records(
    trainee_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TrainingRecord)
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
    """Decrypts a training record using CP-ABE and triggers active access anomaly monitoring."""
    record = db.query(TrainingRecord).filter(TrainingRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Training record not found")

    client_ip = request.client.host if request.client else "unknown"

    # 1. Anomaly Check: Out of scope access
    anomaly_detector.check_out_of_scope_access(current_user, record, db)

    # 2. Anomaly Check: Off-hours access
    anomaly_detector.check_unusual_access_time(current_user, db)

    # 3. Anomaly Check: Abnormal access volume
    anomaly_detector.check_abnormal_access_volume(current_user, db)

    # Fetch User CP-ABE Key Attributes
    user_attrs = [f"ROLE:{current_user.role.upper()}", f"CLEARANCE:{current_user.clearance_level}"]
    for comp in (current_user.assigned_client_accounts or []):
        user_attrs.append(f"COMPANY:{comp.upper()}")

    user_key_info = cpabe_engine.generate_user_private_key(user_attrs)

    try:
        cipher_envelope = json.loads(record.encrypted_payload)
    except Exception:
        cipher_envelope = {"policy": record.encryption_policy, "payload_envelope": record.encrypted_payload}

    decrypted_content = cpabe_engine.decrypt_record(cipher_envelope, user_key_info)

    if decrypted_content is None:
        # Access Denied / CP-ABE Policy Not Satisfied
        log = AccessLog(
            user_id=current_user.id,
            target_record_id=record.id,
            access_type="DECRYPT",
            status="FAILED_POLICY",
            ip_address=client_ip,
            requested_company_code=record.company_at_completion.code if record.company_at_completion else None
        )
        db.add(log)
        db.commit()

        # Check for repeated failed attempts
        anomaly_detector.check_repeated_failed_attempts(current_user, db)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Your staff attributes do not satisfy the CP-ABE policy for this record."
        )

    # Log Successful Decryption
    log = AccessLog(
        user_id=current_user.id,
        target_record_id=record.id,
        access_type="DECRYPT",
        status="SUCCESS",
        ip_address=client_ip,
        requested_company_code=record.company_at_completion.code if record.company_at_completion else None
    )
    db.add(log)
    db.commit()

    return {
        "record_id": record.id,
        "course_name": record.course_name,
        "status": record.status,
        "score": record.score,
        "decrypted_content": decrypted_content,
        "decryption_status": "SUCCESS"
    }
