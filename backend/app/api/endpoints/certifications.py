from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import (
    Certificate, CertificationType, Notification, Trainee, ClientCompany, User, AccessLog
)
from app.schemas.schemas import (
    CertificateResponse, CertificationTypeResponse, NotificationResponse,
    CertificateReissueRequest, ExternalRenewalRequest
)
from app.services.pdf_generator import pdf_generator
from app.api.deps import get_current_user

router = APIRouter()

PHT = timezone(timedelta(hours=8))


def generate_cert_serial(db: Session, company_code: Optional[str], issue_date: datetime) -> str:
    """Generates a standardized certificate serial in AAAYYYYMMDD-01 format (Phase 2, Section 3.8.2)."""
    prefix = ((company_code or "CRO").replace("-", "").strip()[:3]).upper().ljust(3, "X")
    date_str = issue_date.strftime("%Y%m%d")
    base_pattern = f"{prefix}{date_str}-"
    
    existing = db.query(Certificate.serial_number).filter(
        Certificate.serial_number.like(f"{base_pattern}%")
    ).all()
    
    indices = []
    for (s,) in existing:
        if s and "-" in s:
            try:
                indices.append(int(s.split("-")[-1]))
            except ValueError:
                pass
    next_idx = max(indices, default=0) + 1
    return f"{base_pattern}{next_idx:02d}"

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
            "serial_number": cert.serial_number,
            "issue_date": cert.issue_date,
            "expiry_date": cert.expiry_date,
            "expiry_basis": cert.expiry_basis,
            "status": dyn_status,
            "is_nearing_renewal": (dyn_status == "Expiring soon"),
            "reissue_count": cert.reissue_count or 0,
            "is_self_reported": bool(cert.is_self_reported),
            "credential_url": cert.credential_url
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
@router.post("/trigger-sweep")
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



@router.get("/{certificate_id}/pdf")
def download_certificate_pdf(
    certificate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates and downloads the official Certificate of Completion PDF (ReportLab, AAAYYYYMMDD-01).
    
    Permissions (Phase 2):
    - Trainee: own certificate only.
    - Account Manager: certificates for trainees of assigned client companies.
    - Finance & Admin: all certificates.
    """
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    trainee = db.query(Trainee).filter(Trainee.id == cert.trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee record not found")

    company = db.query(ClientCompany).filter(ClientCompany.id == trainee.current_company_id).first()
    company_name = company.name if company else "Crossworks Partner Organization"
    company_code = company.code if company else "CRO"

    # Authorization Check
    if current_user.role == "trainee":
        if trainee.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainees may only download their own certificates.")
    elif current_user.role == "account_manager":
        assigned_codes = current_user.assigned_client_accounts or []
        if company_code not in assigned_codes:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access certificates for unassigned client companies.")
    elif current_user.role not in ("admin", "finance"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access certificate PDF.")

    # Ensure serial exists
    if not cert.serial_number:
        cert.serial_number = generate_cert_serial(db, company_code, cert.issue_date)
        db.commit()

    trainee_full_name = f"{trainee.first_name} {trainee.last_name}".strip()
    pdf_bytes = pdf_generator.generate_certificate_pdf(
        trainee_name=trainee_full_name,
        course_title=cert.title,
        serial_number=cert.serial_number,
        issue_date=cert.issue_date,
        expiry_date=cert.expiry_date,
        company_name=company_name,
        reissue_count=cert.reissue_count or 0
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Certificate-{cert.serial_number}.pdf"'
        }
    )


@router.post("/{certificate_id}/reissue", response_model=CertificateResponse)
def reissue_certificate(
    certificate_id: str,
    req: CertificateReissueRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reissues an existing certificate with a mandatory logged reason (Phase 2, Admin-only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Administrators may reissue certificates.")

    if not req.reason or not req.reason.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid, non-empty reason is mandatory for certificate reissue.")

    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    trainee = db.query(Trainee).filter(Trainee.id == cert.trainee_id).first()
    company = db.query(ClientCompany).filter(ClientCompany.id == trainee.current_company_id).first() if trainee else None
    company_code = company.code if company else "CRO"

    old_serial = cert.serial_number or "N/A"
    cert.reissue_count = (cert.reissue_count or 0) + 1
    cert.reissue_reason = req.reason.strip()
    cert.reissued_by_user_id = current_user.id
    
    # Generate new serial for the reissue
    cert.serial_number = generate_cert_serial(db, company_code, datetime.now(timezone.utc))
    db.commit()
    db.refresh(cert)

    # Immutable audit logging
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="CERTIFICATE_REISSUED",
        resource_type="CERTIFICATE",
        resource_id=cert.id,
        company_id=company.id if company else None,
        outcome="SUCCESS",
        source_ip=request.client.host if request.client else "127.0.0.1",
        details={
            "old_serial": old_serial,
            "new_serial": cert.serial_number,
            "reissue_count": cert.reissue_count,
            "reason": req.reason.strip()
        }
    )
    db.add(log)
    db.commit()

    dyn_status = compute_dynamic_cert_status(cert.expiry_date)
    return {
        "id": cert.id,
        "trainee_id": cert.trainee_id,
        "record_id": cert.record_id,
        "cert_type_code": cert.cert_type_code,
        "title": cert.title,
        "serial_number": cert.serial_number,
        "issue_date": cert.issue_date,
        "expiry_date": cert.expiry_date,
        "expiry_basis": cert.expiry_basis,
        "status": dyn_status,
        "is_nearing_renewal": (dyn_status == "Expiring soon"),
        "reissue_count": cert.reissue_count,
        "is_self_reported": bool(cert.is_self_reported),
        "credential_url": cert.credential_url
    }


@router.post("/external-renewal", response_model=CertificateResponse)
def submit_external_credential_renewal(
    req: ExternalRenewalRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Self-reported external credential renewal with HTTPS URL validation and NO server-side fetch (SSRF-safe)."""
    if current_user.role not in ("trainee", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="External credential renewals can be submitted by Trainees or Administrators."
        )

    # 1. SSRF-safe URL validation: strictly require https:// and reject dangerous schemas
    url = req.credential_url.strip()
    if not url.startswith("https://") or len(url) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="External credential URL must be a valid HTTPS URL (e.g. https://www.credly.com/badges/...)."
        )
    # Critical: DO NOT fetch or ping the URL server-side (SSRF protection per Chapter III specification)

    if current_user.role == "trainee":
        trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
        if not trainee:
            raise HTTPException(status_code=404, detail="Trainee profile not found.")
    else:
        # Admin can provide for testing/initial import; fallback to first trainee
        trainee = db.query(Trainee).first()
        if not trainee:
            raise HTTPException(status_code=404, detail="No trainee available.")

    company = db.query(ClientCompany).filter(ClientCompany.id == trainee.current_company_id).first()
    company_code = company.code if company else "CRO"

    issue_dt = req.issue_date or datetime.now(timezone.utc)
    # Default 36 months validity
    expiry_dt = req.expiry_date or (issue_dt + timedelta(days=36 * 30))
    serial = generate_cert_serial(db, company_code, issue_dt)

    cert = Certificate(
        trainee_id=trainee.id,
        cert_type_code=req.cert_type_code,
        title=req.title,
        serial_number=serial,
        issue_date=issue_dt,
        expiry_date=expiry_dt,
        expiry_basis="Self-reported external credential URL (36 months validity)",
        is_self_reported=True,
        credential_url=url,
        status="Valid"
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)

    # Audit log
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="EXTERNAL_CREDENTIAL_SUBMITTED",
        resource_type="CERTIFICATE",
        resource_id=cert.id,
        company_id=company.id if company else None,
        outcome="SUCCESS",
        source_ip=request.client.host if request.client else "127.0.0.1",
        details={
            "credential_url": url,
            "serial_number": serial,
            "cert_type_code": req.cert_type_code
        }
    )
    db.add(log)
    db.commit()

    dyn_status = compute_dynamic_cert_status(cert.expiry_date)
    return {
        "id": cert.id,
        "trainee_id": cert.trainee_id,
        "record_id": cert.record_id,
        "cert_type_code": cert.cert_type_code,
        "title": cert.title,
        "serial_number": cert.serial_number,
        "issue_date": cert.issue_date,
        "expiry_date": cert.expiry_date,
        "expiry_basis": cert.expiry_basis,
        "status": dyn_status,
        "is_nearing_renewal": (dyn_status == "Expiring soon"),
        "reissue_count": 0,
        "is_self_reported": True,
        "credential_url": cert.credential_url
    }
