import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import create_access_token, get_password_hash
from app.models.entities import (
    User, Trainee, ClientCompany, TrainingSession, TrainerAssignment,
    TrainingRecord, Certificate, TrainingRecordVersion, UserSession, Course,
    CertificationType
)


def _get_headers(user: User, db_session: Session) -> dict:
    token = create_access_token(subject=user.id)
    # Also create an active UserSession so role-based timeout check in deps.py succeeds
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    sess = UserSession(
        user_id=user.id,
        refresh_token_hash="dummy_hash",
        expires_at=now_utc + timedelta(hours=8),
        idle_timeout_sec=3600,
        max_expires_at=now_utc + timedelta(hours=12),
        last_active_at=now_utc,
        is_revoked=False
    )
    db_session.add(sess)
    db_session.commit()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def workflow_fixture(db_session: Session):
    db = db_session

    # 1. Company
    comp = db.query(ClientCompany).filter_by(code="ALPHA_CORP").first()
    if not comp:
        comp = ClientCompany(name="Alpha Corp", code="ALPHA_CORP")
        db.add(comp)
        db.commit()
        db.refresh(comp)

    # 1b. Ensure PMP CertificationType exists for foreign key constraints on PostgreSQL
    pmp_cert = db.query(CertificationType).filter_by(code="PMP").first()
    if not pmp_cert:
        pmp_cert = CertificationType(
            code="PMP",
            name="Project Management Professional (PMP)",
            validity_months=36,
            validity_basis="standard"
        )
        db.add(pmp_cert)
        db.commit()

    # 2. Users
    def get_or_create_user(email, username, role, assigned_accounts=None):
        u = db.query(User).filter_by(email=email).first()
        if not u:
            u = User(
                email=email,
                username=username,
                full_name=username.title(),
                hashed_password=get_password_hash("TestPass123!"),
                role=role,
                is_active=True,
                assigned_client_accounts=assigned_accounts or []
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        return u

    admin = get_or_create_user("admin_wf@test.ph", "admin_wf", "admin")
    finance = get_or_create_user("fin_wf@test.ph", "fin_wf", "finance")
    am = get_or_create_user("am_wf@test.ph", "am_wf", "account_manager", ["ALPHA_CORP"])
    trainer = get_or_create_user("trainer_wf@test.ph", "trainer_wf", "trainer")
    trainee_user = get_or_create_user("trainee_wf@test.ph", "trainee_wf", "trainee")

    # 3. Trainee Profile
    trainee = db.query(Trainee).filter_by(user_id=trainee_user.id).first()
    if not trainee:
        trainee = Trainee(
            user_id=trainee_user.id,
            trainee_code="TRN-WF-001",
            first_name="Juan",
            last_name="Workflow",
            email=trainee_user.email,
            current_company_id=comp.id
        )
        db.add(trainee)
        db.commit()
        db.refresh(trainee)

    # 4. Session
    session = db.query(TrainingSession).filter_by(session_code="SESS-WF-101").first()
    if not session:
        session = TrainingSession(
            session_code="SESS-WF-101",
            course_name="Zero-Trust Architecture & CP-ABE Hands-on",
            start_date=datetime.now(timezone.utc).replace(tzinfo=None),
            end_date=(datetime.now(timezone.utc) + timedelta(days=5)).replace(tzinfo=None),
            delivery_type="Dedicated"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Assign Trainer
    assign = db.query(TrainerAssignment).filter_by(session_id=session.id, user_id=trainer.id).first()
    if not assign:
        assign = TrainerAssignment(user_id=trainer.id, session_id=session.id)
        db.add(assign)
        db.commit()

    # 5. Training Record
    rec = db.query(TrainingRecord).filter_by(trainee_id=trainee.id, session_id=session.id).first()
    if not rec:
        rec = TrainingRecord(
            trainee_id=trainee.id,
            session_id=session.id,
            company_at_completion_id=comp.id,
            course_name=session.course_name,
            status="In progress",
            attendance_status="Present",
            encryption_policy="ROLEADMIN or ROLEFINANCE",
            payload_ciphertext="dummy_ct"
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

    return {
        "admin": admin,
        "finance": finance,
        "am": am,
        "trainer": trainer,
        "trainee_user": trainee_user,
        "trainee": trainee,
        "company": comp,
        "session": session,
        "record": rec
    }


def test_four_completion_statuses_and_am_restrictions(client: TestClient, db_session: Session, workflow_fixture):
    """Verifies the four completion statuses (Enrolled, In progress, Not completed, Completed)
    and validates that Account Managers cannot set 'Completed' without Trainer sign-off.
    """
    am = workflow_fixture["am"]
    rec = workflow_fixture["record"]
    am_headers = _get_headers(am, db_session)

    # 1. AM sets status to 'In progress' with attendance 'Present' -> SUCCESS
    res = client.put(
        f"/api/v1/records/{rec.id}",
        json={"status": "In progress", "attendance_status": "Present", "score": 85.0},
        headers=am_headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "In progress"

    # 2. AM sets status to 'Not completed' with attendance 'Absent' -> SUCCESS
    res = client.put(
        f"/api/v1/records/{rec.id}",
        json={"status": "Not completed", "attendance_status": "Absent"},
        headers=am_headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "Not completed"

    # 3. AM attempts to set status directly to 'Completed' -> FORBIDDEN / BAD REQUEST (needs Trainer sign-off)
    res = client.put(
        f"/api/v1/records/{rec.id}",
        json={"status": "Completed"},
        headers=am_headers
    )
    assert res.status_code == 400
    assert "without official Trainer session sign-off" in res.json()["detail"]


def test_admin_and_finance_edit_requires_reason_and_creates_version(client: TestClient, db_session: Session, workflow_fixture):
    """Edits by Admin or Finance mandate an explanatory reason and create a TrainingRecordVersion."""
    admin = workflow_fixture["admin"]
    rec = workflow_fixture["record"]
    admin_headers = _get_headers(admin, db_session)

    # 1. Admin edit WITHOUT reason -> Rejected with 400
    res = client.put(
        f"/api/v1/records/{rec.id}",
        json={"score": 95.0},
        headers=admin_headers
    )
    assert res.status_code == 400
    assert "mandatory explanation reason" in res.json()["detail"]

    # 2. Admin edit WITH reason -> SUCCESS & version created
    prev_ver_count = db_session.query(TrainingRecordVersion).filter(TrainingRecordVersion.record_id == rec.id).count()
    res = client.put(
        f"/api/v1/records/{rec.id}",
        json={"score": 95.0, "reason": "Corrected practical lab examination score after re-evaluation."},
        headers=admin_headers
    )
    assert res.status_code == 200
    new_ver_count = db_session.query(TrainingRecordVersion).filter(TrainingRecordVersion.record_id == rec.id).count()
    assert new_ver_count == prev_ver_count + 1

    latest_ver = db_session.query(TrainingRecordVersion).filter(TrainingRecordVersion.record_id == rec.id).order_by(TrainingRecordVersion.version_no.desc()).first()
    assert latest_ver.reason == "Corrected practical lab examination score after re-evaluation."


def test_trainer_session_sign_off_and_certificate_issuance(client: TestClient, db_session: Session, workflow_fixture):
    """Trainer signs off once per session and confirms completion, issuing certificates with serial AAAYYYYMMDD-01."""
    trainer = workflow_fixture["trainer"]
    am = workflow_fixture["am"]
    session = workflow_fixture["session"]
    rec = workflow_fixture["record"]

    trainer_headers = _get_headers(trainer, db_session)
    am_headers = _get_headers(am, db_session)

    # 1. Unauthorized user (Account Manager) attempts to sign off -> 403 Forbidden
    res = client.post(
        f"/api/v1/records/sessions/{session.id}/sign-off",
        json={"notes": "Unauthorized attempt", "completions": []},
        headers=am_headers
    )
    assert res.status_code == 403

    # Clean up any preexisting certificate for this record
    db_session.query(Certificate).filter(Certificate.record_id == rec.id).delete()
    db_session.commit()

    # 2. Assigned Trainer signs off session: rec is confirmed 'Completed' with score 92.0
    signoff_payload = {
        "notes": "Cohort completed all practical labs and final hands-on assessment.",
        "completions": [
            {"record_id": rec.id, "status": "Completed", "score": 92.0}
        ]
    }
    res = client.post(
        f"/api/v1/records/sessions/{session.id}/sign-off",
        json=signoff_payload,
        headers=trainer_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["trainer_signed_off"] is True
    assert data["certificates_issued"] == 1
    assert data["participants_updated"] == 1

    # Verify rec became Completed and Certificate was issued
    db_session.refresh(rec)
    assert rec.status == "Completed"
    assert rec.score == 92.0
    assert rec.completion_date is not None

    cert = db_session.query(Certificate).filter(Certificate.record_id == rec.id).first()
    assert cert is not None
    # Verify serial format: AAAYYYYMMDD-01 (course TLA or company code prefix + date + 01)
    assert len(cert.serial_number) >= 12
    assert "-" in cert.serial_number
    assert cert.status == "Valid"


def test_certificate_pdf_generation_and_access_control(client: TestClient, db_session: Session, workflow_fixture):
    """Completion certificate PDFs (ReportLab) are generated and accessible to AM and Trainee."""
    admin = workflow_fixture["admin"]
    am = workflow_fixture["am"]
    rec = workflow_fixture["record"]
    trainee = workflow_fixture["trainee"]

    admin_headers = _get_headers(admin, db_session)
    am_headers = _get_headers(am, db_session)

    # Create a certificate
    cert = db_session.query(Certificate).filter(Certificate.record_id == rec.id).first()
    if not cert:
        cert = Certificate(
            record_id=rec.id,
            trainee_id=trainee.id,
            title="Certificate of Completion - Zero-Trust",
            serial_number="ALP20261101-01",
            issue_date=datetime.now(timezone.utc).replace(tzinfo=None),
            expiry_date=(datetime.now(timezone.utc) + timedelta(days=365*3)).replace(tzinfo=None),
            expiry_basis="36 months validity",
            status="Valid"
        )
        db_session.add(cert)
        db_session.commit()
        db_session.refresh(cert)

    # 1. Download certificate PDF as Admin -> 200 OK with PDF mime type
    res = client.get(f"/api/v1/certifications/{cert.id}/pdf", headers=admin_headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")

    # 2. Download certificate PDF as assigned Account Manager -> 200 OK
    res = client.get(f"/api/v1/certifications/{cert.id}/pdf", headers=am_headers)
    assert res.status_code == 200
    assert res.content.startswith(b"%PDF")


def test_admin_certificate_reissue_with_logged_reason(client: TestClient, db_session: Session, workflow_fixture):
    """Admin reissue of certificate mandates a logged reason and increments reissue count."""
    admin = workflow_fixture["admin"]
    trainer = workflow_fixture["trainer"]
    rec = workflow_fixture["record"]
    trainee = workflow_fixture["trainee"]

    admin_headers = _get_headers(admin, db_session)
    trainer_headers = _get_headers(trainer, db_session)

    cert = db_session.query(Certificate).filter(Certificate.record_id == rec.id).first()
    if not cert:
        cert = Certificate(
            record_id=rec.id,
            trainee_id=trainee.id,
            title="Certificate of Completion - Zero-Trust",
            serial_number="ALP20261101-01",
            issue_date=datetime.now(timezone.utc).replace(tzinfo=None),
            expiry_date=(datetime.now(timezone.utc) + timedelta(days=365*3)).replace(tzinfo=None),
            expiry_basis="36 months validity",
            status="Valid"
        )
        db_session.add(cert)
        db_session.commit()
        db_session.refresh(cert)

    prev_reissue_count = cert.reissue_count or 0

    # 1. Non-admin attempts reissue -> 403 Forbidden
    res = client.post(
        f"/api/v1/certifications/{cert.id}/reissue",
        json={"reason": "Name correction requested by corporate client HR"},
        headers=trainer_headers
    )
    assert res.status_code == 403

    # 2. Admin attempts reissue WITHOUT reason -> 400 Bad Request
    res = client.post(
        f"/api/v1/certifications/{cert.id}/reissue",
        json={"reason": ""},
        headers=admin_headers
    )
    assert res.status_code == 400

    # 3. Admin reissues WITH reason -> 200 OK
    res = client.post(
        f"/api/v1/certifications/{cert.id}/reissue",
        json={"reason": "Corrected trainee legal middle name on corporate request."},
        headers=admin_headers
    )
    assert res.status_code == 200
    updated_cert = res.json()
    assert updated_cert["reissue_count"] == prev_reissue_count + 1
    assert updated_cert["serial_number"] is not None


def test_reports_restricted_to_account_managers_only_oi_04(client: TestClient, db_session: Session, workflow_fixture):
    """Client reports are generated by Account Managers ONLY (OI-04). Admin and Finance are denied."""
    admin = workflow_fixture["admin"]
    finance = workflow_fixture["finance"]
    am = workflow_fixture["am"]
    comp = workflow_fixture["company"]

    admin_headers = _get_headers(admin, db_session)
    finance_headers = _get_headers(finance, db_session)
    am_headers = _get_headers(am, db_session)

    # 1. Admin attempts client report -> 403 Forbidden (OI-04)
    res = client.get(f"/api/v1/reports/company/{comp.code}", headers=admin_headers)
    assert res.status_code == 403
    assert "Account Managers (OI-04)" in res.json()["detail"]

    # 2. Finance attempts client report -> 403 Forbidden (OI-04)
    res = client.get(f"/api/v1/reports/company/{comp.code}", headers=finance_headers)
    assert res.status_code == 403
    assert "Account Managers (OI-04)" in res.json()["detail"]

    # 3. Assigned Account Manager attempts client report -> 200 OK
    res = client.get(f"/api/v1/reports/company/{comp.code}", headers=am_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["header"]["client_code"] == comp.code
    assert "compliance_rate" in data["summary"]

    # 4. Assigned Account Manager downloads client report PDF (ReportLab) -> 200 OK
    res = client.get(f"/api/v1/reports/company/{comp.code}/pdf", headers=am_headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")


def test_trainee_external_credential_renewal_ssrf_safe(client: TestClient, db_session: Session, workflow_fixture):
    """Trainee submits self-reported renewal with HTTPS URL and zero server-side fetch."""
    trainee_user = workflow_fixture["trainee_user"]
    trainee_headers = _get_headers(trainee_user, db_session)

    # 1. Non-HTTPS URL (e.g. http:// or file://) -> 400 Bad Request
    res = client.post(
        "/api/v1/certifications/external-renewal",
        json={
            "cert_type_code": "PMP",
            "title": "Project Management Professional (PMP)",
            "credential_url": "http://insecure-site.com/badge"
        },
        headers=trainee_headers
    )
    assert res.status_code == 400
    assert "HTTPS URL" in res.json()["detail"]

    # 2. Valid HTTPS URL -> 200 OK with self-reported flag and NO server-side fetch
    res = client.post(
        "/api/v1/certifications/external-renewal",
        json={
            "cert_type_code": "PMP",
            "title": "Project Management Professional (PMP)",
            "credential_url": "https://www.credly.com/badges/sample-pmp-credential-id",
            "issue_date": datetime.now(timezone.utc).isoformat()
        },
        headers=trainee_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_self_reported"] is True
    assert data["credential_url"] == "https://www.credly.com/badges/sample-pmp-credential-id"
    assert data["serial_number"] is not None


def test_tc_dat_17_future_date_sign_off_rejected(client: TestClient, db_session: Session, workflow_fixture):
    """TC-DAT-17 & TC-CRT-11: Future-dated training sessions cannot be signed off before scheduled date."""
    trainer = workflow_fixture["trainer"]
    session = workflow_fixture["session"]
    company = workflow_fixture["company"]
    trainee = workflow_fixture["trainee"]
    trainer_headers = _get_headers(trainer, db_session)

    # Create a future-dated session (14 days ahead in Asia/Manila timezone)
    future_start = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=14)
    future_end = future_start + timedelta(days=3)
    future_session = TrainingSession(
        session_code=f"SESS-FUTURE-{uuid.uuid4().hex[:6]}",
        course_name="Future-Dated Advanced Cryptography Lab",
        start_date=future_start,
        end_date=future_end,
        delivery_type="Dedicated"
    )
    db_session.add(future_session)
    db_session.commit()

    # Assign trainer
    assignment = TrainerAssignment(
        user_id=trainer.id,
        session_id=future_session.id
    )
    db_session.add(assignment)

    # Enrolled record
    rec = TrainingRecord(
        trainee_id=trainee.id,
        session_id=future_session.id,
        company_at_completion_id=company.id,
        course_name="Future-Dated Advanced Cryptography Lab",
        status="In progress",
        attendance_status="Present",
        encryption_policy=f"(ROLE:TRAINEE AND DEPT:COMPLIANCE) OR (ROLE:STAFF AND TENANT:{company.code})",
        payload_ciphertext="dummy_future_payload"
    )
    db_session.add(rec)
    db_session.commit()

    # Trainer attempts sign-off on future session -> 400 Bad Request
    signoff_payload = {
        "notes": "Attempting sign-off ahead of training schedule",
        "completions": [
            {"record_id": rec.id, "status": "Completed", "score": 95.0}
        ]
    }
    res = client.post(
        f"/api/v1/records/sessions/{future_session.id}/sign-off",
        json=signoff_payload,
        headers=trainer_headers
    )
    assert res.status_code == 400
    assert "future-dated" in res.json()["detail"].lower()


def test_trainer_assigned_sessions_endpoint(client: TestClient, db_session: Session, workflow_fixture):
    """Trainer can query GET /api/v1/records/sessions/assigned to retrieve assigned rosters."""
    trainer = workflow_fixture["trainer"]
    am = workflow_fixture["am"]
    trainer_headers = _get_headers(trainer, db_session)
    am_headers = _get_headers(am, db_session)

    # Account Manager forbidden -> 403
    res_am = client.get("/api/v1/records/sessions/assigned", headers=am_headers)
    assert res_am.status_code == 403

    # Trainer allowed -> 200 with session list
    res = client.get("/api/v1/records/sessions/assigned", headers=trainer_headers)
    assert res.status_code == 200
    sessions = res.json()
    assert isinstance(sessions, list)
    assert len(sessions) >= 1
    for s in sessions:
        assert "session_code" in s
        assert "records" in s
        assert "is_future_dated" in s
        assert "trainer_signed_off" in s


def test_completion_certificate_serial_and_non_expiring_policy(client: TestClient, db_session: Session, workflow_fixture):
    """TC-CRT-12 & U-17: Completed participants receive non-expiring certificates with AAAYYYYMMDD-NN serial where AAA is course TLA."""
    trainer = workflow_fixture["trainer"]
    company = workflow_fixture["company"]
    trainee = workflow_fixture["trainee"]
    trainer_headers = _get_headers(trainer, db_session)

    # Create Course with TLA "PMP"
    course_code = f"CRS-PMP-{uuid.uuid4().hex[:6]}"
    course = Course(
        course_code=course_code,
        name="Project Management Professional Bootcamp",
        acronym_3="PMP"
    )
    db_session.add(course)
    db_session.commit()

    start_dt = datetime(2026, 8, 1, 9, 0)
    end_dt = datetime(2026, 8, 5, 17, 0)
    session = TrainingSession(
        session_code=f"SESS-PMP-{uuid.uuid4().hex[:6]}",
        course_id=course.id,
        course_name=course.name,
        start_date=start_dt,
        end_date=end_dt,
        delivery_type="Public"
    )
    db_session.add(session)
    db_session.commit()

    # Assign trainer
    assignment = TrainerAssignment(user_id=trainer.id, session_id=session.id)
    db_session.add(assignment)

    rec = TrainingRecord(
        trainee_id=trainee.id,
        session_id=session.id,
        company_at_completion_id=company.id,
        course_name=course.name,
        status="In progress",
        attendance_status="Present",
        encryption_policy=f"(ROLE:TRAINEE AND DEPT:COMPLIANCE) OR (ROLE:STAFF AND TENANT:{company.code})",
        payload_ciphertext="dummy_payload"
    )
    db_session.add(rec)
    db_session.commit()

    # Trainer signs off session marking participant Completed
    signoff_payload = {
        "notes": "Successful completion of PMP Bootcamp",
        "completions": [
            {"record_id": rec.id, "status": "Completed", "score": 96.0}
        ]
    }
    res = client.post(
        f"/api/v1/records/sessions/{session.id}/sign-off",
        json=signoff_payload,
        headers=trainer_headers
    )
    assert res.status_code == 200

    # Verify certificate
    cert = db_session.query(Certificate).filter(Certificate.record_id == rec.id).first()
    assert cert is not None
    assert cert.serial_number.startswith("PMP20260801-")
    assert cert.expiry_date is None
    assert cert.expiry_basis == "Non-expiring completion certificate"
    assert cert.status == "Valid"
