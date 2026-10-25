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

PHT = timezone(timedelta(hours=8))

def compute_dynamic_cert_status(expiry_date: datetime, current_time: Optional[datetime] = None) -> str:
    """Computes dynamic certificate status on read to prevent stale flags (Section 3.8.2, Figure 16).
    - Valid: > 90 days before expiry
    - Expiring soon: <= 90 days before expiry and >= 0 days remaining
    - Expired: day after expiry date (Asia/Manila / UTC+8)
    """
    now = current_time or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now_pht = now.astimezone(PHT).date()

    if expiry_date.tzinfo is None:
        exp_pht = expiry_date.replace(tzinfo=timezone.utc).astimezone(PHT).date()
    else:
        exp_pht = expiry_date.astimezone(PHT).date()

    days_left = (exp_pht - now_pht).days
    if days_left < 0:
        return "Expired"
    elif days_left <= 90:
        return "Expiring soon"
    return "Valid"


def run_certification_expiry_sweep(db: Session, current_time: Optional[datetime] = None) -> dict:
    """Executes the daily 06:00 PHT certification expiry sweep (TC-CRT-01..08, Section 3.8.2).
    
    1. Evaluates all certificates against 90d, 60d, 30d, and 0d expiry thresholds.
    2. Updates database status to 'Valid', 'Expiring soon', or 'Expired'.
    3. Idempotently dispatches in-app notifications to Trainees and assigned Account Managers.
    """
    now = current_time or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now_pht = now.astimezone(PHT).date()

    certificates = db.query(Certificate).all()
    valid_count = 0
    expiring_soon_count = 0
    expired_count = 0
    notifications_created = 0

    # Cache account managers by assigned company code
    account_managers = db.query(User).filter(User.role == "account_manager", User.is_active == True).all()

    for cert in certificates:
        if cert.expiry_date.tzinfo is None:
            exp_pht = cert.expiry_date.replace(tzinfo=timezone.utc).astimezone(PHT).date()
        else:
            exp_pht = cert.expiry_date.astimezone(PHT).date()

        days_left = (exp_pht - now_pht).days

        # Status update
        if days_left < 0:
            cert.status = "Expired"
            cert.is_nearing_renewal = False
            expired_count += 1
            applicable_offsets = [0]
        elif days_left <= 90:
            cert.status = "Expiring soon"
            cert.is_nearing_renewal = True
            expiring_soon_count += 1
            # Determine threshold tiers triggered
            applicable_offsets = []
            if days_left == 0:
                applicable_offsets.append(0)
            if days_left <= 30:
                applicable_offsets.append(30)
            if days_left <= 60:
                applicable_offsets.append(60)
            if days_left <= 90:
                applicable_offsets.append(90)
        else:
            cert.status = "Valid"
            cert.is_nearing_renewal = False
            valid_count += 1
            applicable_offsets = []

        if not applicable_offsets:
            continue

        # Find recipient user IDs
        recipient_ids = set()
        trainee = cert.trainee
        if trainee and trainee.user_id:
            recipient_ids.add(trainee.user_id)

        if trainee and trainee.current_company_id:
            comp = db.query(ClientCompany).filter_by(id=trainee.current_company_id).first()
            if comp:
                for am in account_managers:
                    if comp.code in (am.assigned_client_accounts or []):
                        recipient_ids.add(am.id)

        for offset in applicable_offsets:
            for recipient_id in recipient_ids:
                # Idempotency check: don't create duplicate notifications for same cert and offset
                existing = db.query(Notification).filter_by(
                    recipient_user_id=recipient_id,
                    certification_id=cert.id,
                    offset_days=offset
                ).first()

                if not existing:
                    if offset == 0:
                        title = f"Certification Expired: {cert.title}"
                        message = f"Your certificate '{cert.title}' has expired on {exp_pht}. Renewal is required."
                    else:
                        title = f"Renewal Notice ({offset}d): {cert.title}"
                        message = (
                            f"Certificate '{cert.title}' will expire in {days_left} days "
                            f"(on {exp_pht}). Please plan recertification."
                        )

                    notif = Notification(
                        recipient_user_id=recipient_id,
                        certification_id=cert.id,
                        offset_days=offset,
                        title=title,
                        message=message,
                        is_read=False,
                        created_at=datetime.now(timezone.utc).replace(tzinfo=None)
                    )
                    db.add(notif)
                    notifications_created += 1

    db.commit()
    return {
        "checked": len(certificates),
        "valid": valid_count,
        "expiring_soon": expiring_soon_count,
        "expired": expired_count,
        "notifications_generated": notifications_created
    }


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


@router.post("/run-expiry-check")
def trigger_expiry_sweep(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin-only manual trigger for the daily 06:00 PHT certification expiry sweep (TC-CRT-07)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to trigger certification expiry check."
        )
    return run_certification_expiry_sweep(db)

