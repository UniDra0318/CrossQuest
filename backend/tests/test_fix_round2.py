"""Tests for Round 2 fixes covering MFA, attendance, import batches, and CP-ABE encryption."""

import uuid
import io
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash, create_access_token, create_mfa_challenge_token
from app.models.entities import (
    User, ClientCompany, Trainee, TrainingSession, TrainingRecord,
    TrainerAssignment, ImportBatch, ImportStagingRow, Certificate, AnomalyAlert
)
from app.crypto.cpabe_engine import cpabe_engine, CHARM_AVAILABLE


def _create_test_user(db: Session, email_prefix: str, role: str, mfa_enabled: bool = False, mfa_secret: str = None) -> User:
    uid = uuid.uuid4().hex[:8]
    email = f"{email_prefix}_{uid}@test.ph"
    u = User(
        id=str(uuid.uuid4()),
        email=email,
        username=f"{email_prefix}_{uid}",
        full_name=f"{email_prefix.title()} {uid}",
        hashed_password=get_password_hash("ValidPass123!"),
        role=role,
        is_active=True,
        mfa_enabled=mfa_enabled,
        mfa_secret=mfa_secret,
        assigned_client_accounts=["CORP_R2"]
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_admin_and_finance_login_requires_mfa_enrollment(client: TestClient, db_session: Session, monkeypatch):
    """1. Admin/Finance without MFA must receive mfa_setup_required and setup_token."""
    monkeypatch.setattr(settings, "ENFORCE_PRIVILEGED_MFA", True)
    admin = _create_test_user(db_session, "admin_mfa", "admin", mfa_enabled=False)
    fin = _create_test_user(db_session, "fin_mfa", "finance", mfa_enabled=False)
    am = _create_test_user(db_session, "am_mfa", "account_manager", mfa_enabled=False)

    # Admin login
    res_admin = client.post("/api/v1/auth/login", data={"username": admin.email, "password": "ValidPass123!"})
    assert res_admin.status_code == 200
    data_admin = res_admin.json()
    assert data_admin.get("mfa_setup_required") is True
    assert "setup_token" in data_admin
    assert "access_token" not in data_admin

    # Finance login
    res_fin = client.post("/api/v1/auth/login", data={"username": fin.email, "password": "ValidPass123!"})
    assert res_fin.status_code == 200
    data_fin = res_fin.json()
    assert data_fin.get("mfa_setup_required") is True
    assert "setup_token" in data_fin
    assert "access_token" not in data_fin

    # Account Manager login (not privileged for MFA requirement)
    res_am = client.post("/api/v1/auth/login", data={"username": am.email, "password": "ValidPass123!"})
    assert res_am.status_code == 200
    data_am = res_am.json()
    assert "access_token" in data_am


def test_setup_token_is_single_purpose(client: TestClient, db_session: Session, monkeypatch):
    """2. Setup token is valid only for /auth/mfa/setup and /auth/mfa/enable."""
    monkeypatch.setattr(settings, "ENFORCE_PRIVILEGED_MFA", True)
    admin = _create_test_user(db_session, "admin_setup", "admin", mfa_enabled=False)
    login_res = client.post("/api/v1/auth/login", data={"username": admin.email, "password": "ValidPass123!"})
    setup_token = login_res.json()["setup_token"]

    # Allowed: POST /auth/mfa/setup
    res_setup = client.post("/api/v1/auth/mfa/setup", headers={"Authorization": f"Bearer {setup_token}"})
    assert res_setup.status_code == 200
    assert "secret" in res_setup.json()

    # Rejected: protected endpoint /api/v1/records/
    res_prot = client.get("/api/v1/records/", headers={"Authorization": f"Bearer {setup_token}"})
    assert res_prot.status_code == 401


def test_dev_mfa_bypass_rejected_by_default(client: TestClient, db_session: Session):
    """3. DEV_MFA_BYPASS is rejected by default."""
    admin = _create_test_user(db_session, "admin_bypass", "admin", mfa_enabled=True, mfa_secret="JBSWY3DPEHPK3PXP")
    challenge_token = create_mfa_challenge_token(admin.id)

    res = client.post("/api/v1/auth/mfa/verify", json={"challenge_token": challenge_token, "code": "DEV_MFA_BYPASS"})
    assert res.status_code == 401


def test_signoff_marks_non_present_as_not_completed(client: TestClient, db_session: Session):
    """4. Absent and Excused participants become 'Not completed' on Trainer sign-off."""
    trainer = _create_test_user(db_session, "trainer_so", "trainer")
    comp = db_session.query(ClientCompany).filter_by(code="CORP_R2").first()
    if not comp:
        comp = ClientCompany(name="Corp R2", code="CORP_R2")
        db_session.add(comp)
        db_session.commit()

    sess = TrainingSession(
        session_code=f"SESS-SO-{uuid.uuid4().hex[:6]}",
        course_name="Security Sign-Off Lab",
        start_date=datetime.now(timezone.utc).replace(tzinfo=None),
        end_date=(datetime.now(timezone.utc) + timedelta(days=1)).replace(tzinfo=None),
        venue="Crossworks Training Room",
        trainer_signed_off=False
    )
    db_session.add(sess)
    db_session.commit()

    db_session.add(TrainerAssignment(user_id=trainer.id, session_id=sess.id))
    db_session.commit()

    trainees = []
    records = []
    attendances = ["Present", "Absent", "Excused"]
    for i, att in enumerate(attendances):
        uid = uuid.uuid4().hex[:6]
        t = Trainee(
            trainee_code=f"TRN-SO-{uid}",
            first_name=f"Trainee{i}",
            last_name="Test",
            email=f"trn_{att.lower()}_{uid}@test.ph",
            current_company_id=comp.id
        )
        db_session.add(t)
        db_session.flush()
        trainees.append(t)

        r = TrainingRecord(
            trainee_id=t.id,
            session_id=sess.id,
            company_at_completion_id=comp.id,
            course_name="Security Sign-Off Lab",
            status="In progress",
            attendance_status=att,
            encryption_policy="ROLEADMIN or ROLEFINANCE",
            payload_ciphertext="ct"
        )
        db_session.add(r)
        db_session.flush()
        records.append(r)

    db_session.commit()

    trainer_token = create_access_token(trainer.id)
    payload = {
        "notes": "Signing off cohort with varied attendance.",
        "completions": [{"record_id": r.id, "status": "Completed"} for r in records]
    }

    res = client.post(
        f"/api/v1/records/sessions/{sess.id}/sign-off",
        json=payload,
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["certificates_issued"] == 1
    assert set(data["not_eligible_record_ids"]) == {records[1].id, records[2].id}

    db_session.refresh(records[0])
    db_session.refresh(records[1])
    db_session.refresh(records[2])
    assert records[0].status == "Completed"
    assert records[1].status == "Not completed"
    assert records[2].status == "Not completed"


def test_edit_completed_requires_present_attendance(client: TestClient, db_session: Session):
    """5. Editing status to Completed requires Present attendance."""
    admin = _create_test_user(db_session, "admin_edit", "admin")
    comp = db_session.query(ClientCompany).filter_by(code="CORP_R2").first()
    if not comp:
        comp = ClientCompany(name="Corp R2", code="CORP_R2")
        db_session.add(comp)
        db_session.commit()

    sess = TrainingSession(
        session_code=f"SESS-ED-{uuid.uuid4().hex[:6]}",
        course_name="Admin Edit Course",
        start_date=datetime.now(timezone.utc).replace(tzinfo=None),
        end_date=(datetime.now(timezone.utc) + timedelta(days=1)).replace(tzinfo=None),
        trainer_signed_off=True
    )
    db_session.add(sess)
    db_session.commit()

    uid = uuid.uuid4().hex[:6]
    t = Trainee(
        trainee_code=f"TRN-ED-{uid}",
        first_name="Excused",
        last_name="Trainee",
        email=f"excused_{uid}@test.ph",
        current_company_id=comp.id
    )
    db_session.add(t)
    db_session.flush()

    rec = TrainingRecord(
        trainee_id=t.id,
        session_id=sess.id,
        company_at_completion_id=comp.id,
        course_name=sess.course_name,
        status="In progress",
        attendance_status="Excused",
        encryption_policy="ROLEADMIN or ROLEFINANCE",
        payload_ciphertext="ct"
    )
    db_session.add(rec)
    db_session.commit()

    admin_token = create_access_token(admin.id)
    res = client.put(
        f"/api/v1/records/{rec.id}",
        json={"status": "Completed", "reason": "Attempting completion for excused attendee"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 400
    assert "attended" in res.json()["detail"].lower()


def test_admin_score_edit_preserves_other_encrypted_fields(client: TestClient, db_session: Session):
    """6. Admin editing score decrypts, updates score, and re-encrypts preserving other fields."""
    if not CHARM_AVAILABLE:
        pytest.skip("Native Charm library not available")

    admin = _create_test_user(db_session, "admin_score", "admin")
    comp = db_session.query(ClientCompany).filter_by(code="CORP_R2").first()
    if not comp:
        comp = ClientCompany(name="Corp R2", code="CORP_R2")
        db_session.add(comp)
        db_session.commit()

    uid = uuid.uuid4().hex[:6]
    t = Trainee(
        trainee_code=f"TRN-SC-{uid}",
        first_name="Score",
        last_name="Preserve",
        email=f"score_preserve_{uid}@test.ph",
        current_company_id=comp.id
    )
    db_session.add(t)
    db_session.flush()

    policy = cpabe_engine.build_record_policy(company_code=comp.code, trainee_code=t.trainee_code)
    initial_payload = {
        "score": 75.0,
        "practical_lab": "Lab Alpha 404",
        "certificate_reference": "CERT-ORIGINAL-99",
        "assessment_notes": "Initial notes."
    }
    enc = cpabe_engine.encrypt_record(
        plaintext_data=initial_payload,
        policy_str=policy,
        record_id=f"rec-{t.trainee_code}",
        version=1
    )

    rec = TrainingRecord(
        trainee_id=t.id,
        company_at_completion_id=comp.id,
        course_name="CP-ABE Data Preservation",
        status="In progress",
        score=75.0,
        attendance_status="Present",
        encryption_policy=policy,
        policy_version=1,
        abe_ciphertext=enc.get("abe_ciphertext"),
        payload_ciphertext=enc.get("payload_ciphertext"),
        nonce=enc.get("nonce"),
        is_encrypted=True
    )
    db_session.add(rec)
    db_session.commit()

    admin_token = create_access_token(admin.id)
    edit_res = client.put(
        f"/api/v1/records/{rec.id}",
        json={"score": 95.5, "reason": "Re-evaluation exam passed"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert edit_res.status_code == 200

    # Decrypt and verify preservation
    dec_res = client.post(f"/api/v1/records/{rec.id}/decrypt", headers={"Authorization": f"Bearer {admin_token}"})
    assert dec_res.status_code == 200
    dec_data = dec_res.json()["decrypted_content"]
    assert dec_data["score"] == 95.5
    assert dec_data["practical_lab"] == "Lab Alpha 404"
    assert dec_data["certificate_reference"] == "CERT-ORIGINAL-99"
    assert dec_data["assessment_notes"] == "Initial notes."


def test_r4_exemption_only_for_import_records(client: TestClient, db_session: Session):
    """7. Finance edits are exempt from R4 only when import_batch_id is present."""
    finance = _create_test_user(db_session, "fin_r4", "finance")
    comp = db_session.query(ClientCompany).filter_by(code="CORP_R2").first()
    if not comp:
        comp = ClientCompany(name="Corp R2", code="CORP_R2")
        db_session.add(comp)
        db_session.commit()

    batch = ImportBatch(
        source_file_name="test_pilot.xlsx",
        file_hash=uuid.uuid4().hex,
        storage_path="test_storage",
        loaded_by_user_id=finance.id
    )
    db_session.add(batch)
    db_session.commit()

    uid = uuid.uuid4().hex[:6]
    t = Trainee(
        trainee_code=f"TRN-R4-{uid}",
        first_name="R4",
        last_name="Test",
        email=f"r4_test_{uid}@test.ph",
        current_company_id=comp.id
    )
    db_session.add(t)
    db_session.flush()

    # Record A: imported record
    rec_import = TrainingRecord(
        trainee_id=t.id,
        company_at_completion_id=comp.id,
        course_name="R4 Import Test",
        status="In progress",
        attendance_status="Present",
        import_batch_id=batch.id,
        encryption_policy="ROLEADMIN or ROLEFINANCE",
        payload_ciphertext="ct"
    )
    # Record B: standard record
    rec_standard = TrainingRecord(
        trainee_id=t.id,
        company_at_completion_id=comp.id,
        course_name="R4 Standard Test",
        status="In progress",
        attendance_status="Present",
        import_batch_id=None,
        encryption_policy="ROLEADMIN or ROLEFINANCE",
        payload_ciphertext="ct"
    )
    db_session.add_all([rec_import, rec_standard])
    db_session.commit()

    finance_token = create_access_token(finance.id)

    # Edit (a): imported record -> no R4 alert
    initial_alerts = db_session.query(AnomalyAlert).filter(AnomalyAlert.rule_code == "R4_RECORD_EDIT").count()
    res_a = client.put(
        f"/api/v1/records/{rec_import.id}",
        json={"attendance_status": "Absent", "reason": "Standard correction"},
        headers={"Authorization": f"Bearer {finance_token}"}
    )
    assert res_a.status_code == 200
    alerts_after_a = db_session.query(AnomalyAlert).filter(AnomalyAlert.rule_code == "R4_RECORD_EDIT").count()
    assert alerts_after_a == initial_alerts

    # Edit (b): standard record using reason "import reconciliation" -> R4 alert IS raised
    res_b = client.put(
        f"/api/v1/records/{rec_standard.id}",
        json={"attendance_status": "Absent", "reason": "import reconciliation"},
        headers={"Authorization": f"Bearer {finance_token}"}
    )
    assert res_b.status_code == 200
    alerts_after_b = db_session.query(AnomalyAlert).filter(AnomalyAlert.rule_code == "R4_RECORD_EDIT").count()
    assert alerts_after_b > initial_alerts


def test_import_dedup_includes_training_date(client: TestClient, db_session: Session):
    """8. Same participant + program with different dates is not quarantined; same date is quarantined."""
    admin = _create_test_user(db_session, "admin_dedup", "admin")
    admin_token = create_access_token(admin.id)

    uid = uuid.uuid4().hex[:6]
    csv_data = (
        "Customer,Participant Name,Participant Email,Program Name,Training Date\n"
        f"CORP_{uid},Dedup Tester {uid},dedup_{uid}@test.ph,Zero Trust Security,2026-08-15\n"
        f"CORP_{uid},Dedup Tester {uid},dedup_{uid}@test.ph,Zero Trust Security,2026-08-20\n"
        f"CORP_{uid},Dedup Tester {uid},dedup_{uid}@test.ph,Zero Trust Security,2026-08-15\n"
    )
    fname = f"dedup_{uid}.csv"
    files = {"file": (fname, io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/v1/imports/upload-workbook",
        files=files,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["quarantined_rows"] == 1
    assert data["in_scope_rows"] == 3


def test_import_commit_sets_safe_defaults(client: TestClient, db_session: Session):
    """9. Imported committed records have safe defaults: attendance None, status Not completed, score None when absent."""
    admin = _create_test_user(db_session, "admin_commit", "admin")
    admin_token = create_access_token(admin.id)

    uid = uuid.uuid4().hex[:6]
    csv_data = (
        "Customer,Participant Name,Participant Email,Program Name,Training Date\n"
        f"CORP_{uid},Safe Defaults {uid},safe_{uid}@test.ph,Cloud Compliance,2026-09-01\n"
    )
    fname = f"safe_{uid}.csv"
    files = {"file": (fname, io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    up_res = client.post(
        "/api/v1/imports/upload-workbook",
        files=files,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert up_res.status_code == 200
    batch_id = up_res.json()["batch_id"]

    com_res = client.post(
        f"/api/v1/imports/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert com_res.status_code == 200

    rec = db_session.query(TrainingRecord).filter(TrainingRecord.import_batch_id == batch_id).first()
    assert rec is not None
    assert rec.attendance_status is None
    assert rec.status == "Not completed"
    assert rec.score is None
    assert rec.completion_date is None
    assert rec.import_batch_id == batch_id

    sess = db_session.query(TrainingSession).filter(TrainingSession.id == rec.session_id).first()
    assert sess is not None
    assert sess.trainer_signed_off is False
