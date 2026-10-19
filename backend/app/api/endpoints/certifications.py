from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import (
    Certificate, CertificationType, Notification, Trainee, ClientCompany, User
)
from app.schemas.schemas import (
    CertificateResponse, CertificationTypeResponse, NotificationResponse
)
from app.api.deps import get_current_user

router = APIRouter()

def compute_dynamic_cert_status(expiry_date: datetime) -> str:
    """Computes dynamic certificate status on read to prevent stale flags (Section 3.8.2, Figure 16).
    - Valid: > 90 days before expiry
    - Expiring soon: <= 90 days before expiry and <= expiry date
    - Expired: day after expiry date (Asia/Manila / UTC+8)
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    days_left = (expiry_date - now).days
    if days_left < 0:
        return "Expired"
    elif days_left <= 90:
        return "Expiring soon"
    return "Valid"


@router.get("/types", response_model=List[CertificationTypeResponse])
def list_certification_types(db: Session = Depends(get_db)):
    """Returns reference data for the 5 client-stated certification types with 36 months validity (FR-18)."""
    return db.query(CertificationType).all()


@router.get("/", response_model=List[CertificateResponse])
def list_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists certificates with dynamic validity status calculation (FR-18, Section 3.8.2).
    
    Scoped by role:
    - Trainee: own certificates only.
    - Account Manager: certificates for trainees of assigned client companies.
    - Finance & Admin: all certificates.
    """
    query = db.query(Certificate, Trainee).join(Trainee, Certificate.trainee_id == Trainee.id)

    if current_user.role == "trainee":
        trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
        if not trainee:
            return []
        query = query.filter(Certificate.trainee_id == trainee.id)
    elif current_user.role == "account_manager":
        assigned_codes = current_user.assigned_client_accounts or []
        assigned_companies = db.query(ClientCompany.id).filter(ClientCompany.code.in_(assigned_codes)).all()
        company_ids = [c[0] for c in assigned_companies]
        query = query.filter(Trainee.current_company_id.in_(company_ids))
    elif current_user.role in ("admin", "finance"):
        pass # All
    else:
        return []

    results = query.order_by(Certificate.expiry_date.asc()).all()

    response = []
    for cert, trainee in results:
        dyn_status = compute_dynamic_cert_status(cert.expiry_date)
        response.append({
            "id": cert.id,
            "trainee_id": cert.trainee_id,
            "record_id": cert.record_id,
            "cert_type_code": cert.cert_type_code,
            "title": cert.title,
            "issue_date": cert.issue_date,
            "expiry_date": cert.expiry_date,
            "expiry_basis": cert.expiry_basis,
            "status": dyn_status,
            "is_nearing_renewal": (dyn_status == "Expiring soon")
        })
    return response


@router.get("/notifications", response_model=List[NotificationResponse])
def list_user_expiry_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches certification expiry notices addressed to the current Trainee or Account Manager (FR-19, DAT-07)."""
    return (
        db.query(Notification)
        .filter(Notification.recipient_user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .all()
    )
