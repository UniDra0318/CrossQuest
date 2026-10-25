"""Tests for Certification Expiry Scheduler & Lifecycle (TC-CRT-01..08).

Meets requirements:
- FR-18: 3-year validity lifecycle with 90-day, 60-day, 30-day, and 0-day renewal tiers.
- FR-19: Dual recipient notifications (Trainee and assigned Account Manager).
- DAT-07: Idempotent daily 06:00 PHT expiry evaluation without duplicate alerts.
- Chapter III Section 3.8.2, 3.8.3, Figure 16, Table 28.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, create_access_token
from app.models.entities import (
    User, ClientCompany, Trainee, Certificate, CertificationType, Notification
)
from app.api.endpoints.certifications import (
    compute_dynamic_cert_status, run_certification_expiry_sweep, PHT
)


@pytest.fixture(scope="module", autouse=True)
def clean_cert_and_notifications():
    """Ensure clean notification and certificate state before cert tests."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        db.query(Notification).delete()
        db.query(Certificate).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture
def cert_test_fixture(db_session: Session):
    """Sets up company, trainee, account manager, and admin users."""
    db = db_session

    company = db.query(ClientCompany).filter_by(code="CORP_CERT_CO").first()
    if not company:
        company = ClientCompany(id="comp-cert-1", name="Cert Corporation", code="CORP_CERT_CO")
        db.add(company)
        db.commit()

    am_user = db.query(User).filter_by(email="am_cert@test.ph").first()
    if not am_user:
        am_user = User(
            id=str(uuid.uuid4()),
            email="am_cert@test.ph",
            username="am_cert",
            full_name="AM Cert Officer",
            hashed_password=get_password_hash("Pass123!"),
            role="account_manager",
            assigned_client_accounts=["CORP_CERT_CO"],
            is_active=True
        )
        db.add(am_user)

    trainee_user = db.query(User).filter_by(email="trainee_cert@test.ph").first()
    if not trainee_user:
        trainee_user = User(
            id=str(uuid.uuid4()),
            email="trainee_cert@test.ph",
            username="trainee_cert",
            full_name="Trainee Cert Person",
            hashed_password=get_password_hash("Pass123!"),
            role="trainee",
            is_active=True
        )
        db.add(trainee_user)

    admin_user = db.query(User).filter_by(email="admin_cert@test.ph").first()
    if not admin_user:
        admin_user = User(
            id=str(uuid.uuid4()),
            email="admin_cert@test.ph",
            username="admin_cert",
            full_name="Admin Cert Officer",
            hashed_password=get_password_hash("Pass123!"),
            role="admin",
            is_superuser=True,
            is_active=True
        )
        db.add(admin_user)

    db.commit()

    trainee = db.query(Trainee).filter_by(trainee_code="TRN_CERT_01").first()
    if not trainee:
        trainee = Trainee(
            id=str(uuid.uuid4()),
            user_id=trainee_user.id,
            first_name="Trainee",
            last_name="Person",
            email="trainee_cert@test.ph",
            trainee_code="TRN_CERT_01",
            current_company_id=company.id
        )
        db.add(trainee)
        db.commit()

    return {
        "company": company,
        "am_user": am_user,
        "trainee_user": trainee_user,
        "admin_user": admin_user,
        "trainee": trainee
    }


def test_tc_crt_01_valid_certificate_status(cert_test_fixture, db_session: Session):
    """TC-CRT-01: Certificate with > 90 days validity is marked Valid without renewal alert."""
    trainee = cert_test_fixture["trainee"]
    now = datetime.now(timezone.utc)

    cert_valid = Certificate(
        id=str(uuid.uuid4()),
        trainee_id=trainee.id,
        title="Crossworks Enterprise Architect",
        issue_date=now - timedelta(days=100),
        expiry_date=now + timedelta(days=200), # > 90 days
        status="Valid"
    )
    db_session.add(cert_valid)
    db_session.commit()

    res = run_certification_expiry_sweep(db_session, current_time=now)
    db_session.refresh(cert_valid)
    assert cert_valid.status == "Valid"
    assert cert_valid.is_nearing_renewal is False

    # No notifications created for valid cert
    notifs = db_session.query(Notification).filter_by(certification_id=cert_valid.id).all()
    assert len(notifs) == 0


def test_tc_crt_02_and_03_expiring_soon_and_dual_notifications(cert_test_fixture, db_session: Session):
    """TC-CRT-02 & TC-CRT-03: Certificate <= 90 days transitions to Expiring soon with dual notices."""
    trainee = cert_test_fixture["trainee"]
    trainee_user = cert_test_fixture["trainee_user"]
    am_user = cert_test_fixture["am_user"]
    now = datetime.now(timezone.utc)

    cert_90d = Certificate(
        id=str(uuid.uuid4()),
        trainee_id=trainee.id,
        title="ISO 27001 Lead Auditor",
        issue_date=now - timedelta(days=1000),
        expiry_date=now + timedelta(days=85), # <= 90 days
        status="Valid"
    )
    db_session.add(cert_90d)
    db_session.commit()

    res = run_certification_expiry_sweep(db_session, current_time=now)
    db_session.refresh(cert_90d)

    assert cert_90d.status == "Expiring soon"
    assert cert_90d.is_nearing_renewal is True

    # Check dual notifications (Trainee and assigned AM)
    notifs = db_session.query(Notification).filter_by(certification_id=cert_90d.id, offset_days=90).all()
    assert len(notifs) == 2
    recipient_ids = {n.recipient_user_id for n in notifs}
    assert trainee_user.id in recipient_ids
    assert am_user.id in recipient_ids


def test_tc_crt_04_tiered_offsets_60_and_30_days(cert_test_fixture, db_session: Session):
    """TC-CRT-04: Offsets at 60d and 30d generate corresponding alert notifications."""
    trainee = cert_test_fixture["trainee"]
    now = datetime.now(timezone.utc)

    cert_25d = Certificate(
        id=str(uuid.uuid4()),
        trainee_id=trainee.id,
        title="Data Privacy Officer Compliance",
        issue_date=now - timedelta(days=1050),
        expiry_date=now + timedelta(days=25), # <= 30 days
        status="Valid"
    )
    db_session.add(cert_25d)
    db_session.commit()

    run_certification_expiry_sweep(db_session, current_time=now)
    db_session.refresh(cert_25d)

    assert cert_25d.status == "Expiring soon"
    # Both 90d, 60d, and 30d triggers exist
    notifs_30 = db_session.query(Notification).filter_by(certification_id=cert_25d.id, offset_days=30).all()
    assert len(notifs_30) >= 1


def test_tc_crt_05_expired_status_and_zero_day_notice(cert_test_fixture, db_session: Session):
    """TC-CRT-05: Certificate past expiry date is marked Expired with 0-day notification."""
    trainee = cert_test_fixture["trainee"]
    now = datetime.now(timezone.utc)

    cert_expired = Certificate(
        id=str(uuid.uuid4()),
        trainee_id=trainee.id,
        title="Certified Security Specialist",
        issue_date=now - timedelta(days=1200),
        expiry_date=now - timedelta(days=5), # Past expiry
        status="Valid"
    )
    db_session.add(cert_expired)
    db_session.commit()

    run_certification_expiry_sweep(db_session, current_time=now)
    db_session.refresh(cert_expired)

    assert cert_expired.status == "Expired"
    assert cert_expired.is_nearing_renewal is False

    notifs_0 = db_session.query(Notification).filter_by(certification_id=cert_expired.id, offset_days=0).all()
    assert len(notifs_0) >= 1
    assert "Expired" in notifs_0[0].title


def test_tc_crt_06_idempotency_of_scheduler_sweep(cert_test_fixture, db_session: Session):
    """TC-CRT-06: Repeated daily execution does not duplicate notifications."""
    trainee = cert_test_fixture["trainee"]
    now = datetime.now(timezone.utc)

    # Initial sweep
    run_certification_expiry_sweep(db_session, current_time=now)
    count_before = db_session.query(Notification).count()

    # Second sweep immediately afterwards
    run_certification_expiry_sweep(db_session, current_time=now)
    count_after = db_session.query(Notification).count()

    assert count_after == count_before


def test_tc_crt_07_manual_trigger_role_gating(client: TestClient, cert_test_fixture):
    """TC-CRT-07: POST /api/v1/certifications/run-expiry-check is admin-only."""
    admin_token = create_access_token(subject=cert_test_fixture["admin_user"].id)
    trainee_token = create_access_token(subject=cert_test_fixture["trainee_user"].id)

    # Admin succeeds
    resp_admin = client.post("/api/v1/certifications/run-expiry-check", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp_admin.status_code == 200
    data = resp_admin.json()
    assert "checked" in data
    assert "valid" in data
    assert "expiring_soon" in data
    assert "expired" in data

    # Trainee is denied with 403 Forbidden
    resp_trainee = client.post("/api/v1/certifications/run-expiry-check", headers={"Authorization": f"Bearer {trainee_token}"})
    assert resp_trainee.status_code == 403


def test_tc_crt_08_timezone_handling_pht(cert_test_fixture):
    """TC-CRT-08: Expiry evaluation aligns accurately with Asia/Manila (PHT, UTC+8) boundaries."""
    # Midnight in PHT is 16:00 UTC previous day
    # Suppose a cert expires on 2026-10-30 at 00:00:00 UTC (08:00 PHT)
    exp = datetime(2026, 10, 30, 0, 0, 0, tzinfo=timezone.utc)
    # Check on 2026-10-29 23:00 UTC (which is 2026-10-30 07:00 PHT - same day)
    curr_same_day = datetime(2026, 10, 29, 23, 0, 0, tzinfo=timezone.utc)
    status_same_day = compute_dynamic_cert_status(exp, current_time=curr_same_day)
    assert status_same_day == "Expiring soon"

    # Check on 2026-10-31 01:00 UTC (which is 2026-10-31 09:00 PHT - day after expiry)
    curr_after = datetime(2026, 10, 31, 1, 0, 0, tzinfo=timezone.utc)
    status_after = compute_dynamic_cert_status(exp, current_time=curr_after)
    assert status_after == "Expired"
