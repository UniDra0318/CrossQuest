import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import create_access_token, get_password_hash
from app.models.entities import (
    User, Trainee, ClientCompany, TrainingSession, TrainerAssignment,
    TrainingRecord, Certificate, UserSession, PasswordResetToken,
    TraineeAffiliation, Quiz, QuizQuestion, QuizAnswerKey, Team, TeamMember
)
from app.services.email_service import email_service
from app.crypto.attribute_manager import attribute_manager
from app.core.database import verify_database_tls_enforced, engine


def _auth_headers(user: User, db: Session) -> dict:
    token = create_access_token(subject=user.id)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    sess = UserSession(
        user_id=user.id,
        refresh_token_hash=f"hash_{uuid.uuid4()}",
        expires_at=now_utc + timedelta(hours=8),
        idle_timeout_sec=3600,
        max_expires_at=now_utc + timedelta(hours=12),
        last_active_at=now_utc,
        is_revoked=False
    )
    db.add(sess)
    db.commit()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def feature_fixture(db_session: Session):
    db = db_session

    # Admin User
    admin = db.query(User).filter_by(email="admin_features@xworks.ph").first()
    if not admin:
        admin = User(
            email="admin_features@xworks.ph",
            username="admin_features",
            full_name="Admin Feature Tester",
            role="admin",
            hashed_password=get_password_hash("AdminPass123!"),
            is_active=True
        )
        db.add(admin)

    # Account Manager User
    am = db.query(User).filter_by(email="am_features@xworks.ph").first()
    if not am:
        am = User(
            email="am_features@xworks.ph",
            username="am_features",
            full_name="Account Manager Feature Tester",
            role="account_manager",
            assigned_client_accounts=["COMP_ALPHA", "INDIV_BETA"],
            hashed_password=get_password_hash("AmPass123!"),
            is_active=True
        )
        db.add(am)

    # Trainer User
    trainer = db.query(User).filter_by(email="trainer_features@xworks.ph").first()
    if not trainer:
        trainer = User(
            email="trainer_features@xworks.ph",
            username="trainer_features",
            full_name="Trainer Feature Tester",
            role="trainer",
            hashed_password=get_password_hash("TrainerPass123!"),
            is_active=True
        )
        db.add(trainer)

    # Trainee User
    trainee_user = db.query(User).filter_by(email="trainee_features@xworks.ph").first()
    if not trainee_user:
        trainee_user = User(
            email="trainee_features@xworks.ph",
            username="trainee_features",
            full_name="Juan Trainee",
            role="trainee",
            hashed_password=get_password_hash("TraineePass123!"),
            is_active=True
        )
        db.add(trainee_user)

    db.commit()

    # Client Company
    comp_a = db.query(ClientCompany).filter_by(code="COMP_ALPHA").first()
    if not comp_a:
        comp_a = ClientCompany(name="Alpha Holdings", code="COMP_ALPHA", client_type="COMPANY")
        db.add(comp_a)

    comp_b = db.query(ClientCompany).filter_by(code="COMP_OMEGA").first()
    if not comp_b:
        comp_b = ClientCompany(name="Omega Corp", code="COMP_OMEGA", client_type="COMPANY")
        db.add(comp_b)

    db.commit()

    # Trainee Profile
    trainee = db.query(Trainee).filter_by(email="trainee_features@xworks.ph").first()
    if not trainee:
        trainee = Trainee(
            trainee_code=f"TRN-{uuid.uuid4().hex[:6].upper()}",
            user_id=trainee_user.id,
            first_name="Juan",
            last_name="Trainee",
            email="trainee_features@xworks.ph",
            current_company_id=comp_a.id
        )
        db.add(trainee)
        db.commit()

    return {
        "admin": admin,
        "am": am,
        "trainer": trainer,
        "trainee_user": trainee_user,
        "trainee": trainee,
        "comp_a": comp_a,
        "comp_b": comp_b
    }


def test_fr26_request_password_reset_anti_enumeration(client: TestClient, feature_fixture, db_session: Session):
    """FR-26: Public self-service password reset with anti-enumeration response."""
    email_service.sent_emails.clear()

    # 1. Existing active user request
    resp_valid = client.post("/api/v1/auth/request-password-reset", json={"email": "trainee_features@xworks.ph"})
    assert resp_valid.status_code == 200
    data_valid = resp_valid.json()
    assert "password reset link has been dispatched" in data_valid["message"]

    # Verify reset token in DB with 15m expiration
    user = feature_fixture["trainee_user"]
    token_record = db_session.query(PasswordResetToken).filter_by(user_id=user.id, is_used=False).first()
    assert token_record is not None
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    assert token_record.expires_at > now_utc
    # Expiration is within 15 minutes
    assert (token_record.expires_at - now_utc).total_seconds() <= 15 * 60 + 5

    # Verify email was dispatched
    assert any(e["to"] == "trainee_features@xworks.ph" for e in email_service.sent_emails)

    # 2. Non-existent email request receives exact same response (Anti-enumeration)
    resp_invalid = client.post("/api/v1/auth/request-password-reset", json={"email": "nonexistent_target@xworks.ph"})
    assert resp_invalid.status_code == 200
    assert resp_invalid.json()["message"] == data_valid["message"]


def test_training_session_creation_with_venue(client: TestClient, feature_fixture, db_session: Session):
    """Feature 2: Create training sessions with venue (Admin & Account Manager)."""
    admin_hdr = _auth_headers(feature_fixture["admin"], db_session)
    am_hdr = _auth_headers(feature_fixture["am"], db_session)

    start_dt = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    end_dt = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # 1. Admin creates F2F session with physical venue
    code_f2f = f"SESS-F2F-{uuid.uuid4().hex[:6].upper()}"
    resp_f2f = client.post("/api/v1/records/sessions", headers=admin_hdr, json={
        "session_code": code_f2f,
        "course_name": "ISO 27001 Lead Auditor Bootcamp",
        "start_date": start_dt,
        "end_date": end_dt,
        "delivery_type": "Public",
        "delivery_mode": "F2F",
        "venue": "Makati Executive Training Center Room 402"
    })
    assert resp_f2f.status_code == 200
    assert resp_f2f.json()["venue"] == "Makati Executive Training Center Room 402"
    assert resp_f2f.json()["delivery_mode"] == "F2F"

    # 2. Account Manager creates Online session (venue auto-defaults to virtual)
    code_online = f"SESS-ONL-{uuid.uuid4().hex[:6].upper()}"
    resp_onl = client.post("/api/v1/records/sessions", headers=am_hdr, json={
        "session_code": code_online,
        "course_name": "Cyber Incident Response Workshop",
        "start_date": start_dt,
        "end_date": end_dt,
        "delivery_type": "Dedicated",
        "delivery_mode": "Online"
    })
    assert resp_onl.status_code == 200
    assert "Online" in resp_onl.json()["venue"]
    assert resp_onl.json()["delivery_mode"] == "Online"

    # 3. F2F session without venue is rejected with clear error
    resp_bad = client.post("/api/v1/records/sessions", headers=admin_hdr, json={
        "session_code": f"SESS-BAD-{uuid.uuid4().hex[:6].upper()}",
        "course_name": "Test Course",
        "start_date": start_dt,
        "end_date": end_dt,
        "delivery_type": "Public",
        "delivery_mode": "F2F",
        "venue": ""
    })
    assert resp_bad.status_code == 400
    assert "Physical venue is required" in resp_bad.json()["detail"]


def test_fr05_client_type_company_and_individual(client: TestClient, feature_fixture, db_session: Session):
    """FR-05: Client type support (COMPANY vs INDIVIDUAL)."""
    admin_hdr = _auth_headers(feature_fixture["admin"], db_session)

    # 1. Create COMPANY client
    code_corp = f"CORP_{uuid.uuid4().hex[:5].upper()}"
    resp_corp = client.post("/api/v1/trainees/companies", headers=admin_hdr, json={
        "code": code_corp,
        "name": "Acme Cyber Systems Inc.",
        "client_type": "COMPANY",
        "industry": "Cybersecurity"
    })
    assert resp_corp.status_code == 200
    assert resp_corp.json()["client_type"] == "COMPANY"

    # 2. Create INDIVIDUAL client
    code_ind = f"IND_{uuid.uuid4().hex[:5].upper()}"
    resp_ind = client.post("/api/v1/trainees/companies", headers=admin_hdr, json={
        "code": code_ind,
        "name": "Maria Santos (Independent Consultant)",
        "client_type": "INDIVIDUAL",
        "industry": "Consulting"
    })
    assert resp_ind.status_code == 200
    assert resp_ind.json()["client_type"] == "INDIVIDUAL"

    # 3. Verify in listing
    resp_list = client.get("/api/v1/trainees/companies", headers=admin_hdr)
    assert resp_list.status_code == 200
    companies = resp_list.json()
    assert any(c["code"] == code_corp and c["client_type"] == "COMPANY" for c in companies)
    assert any(c["code"] == code_ind and c["client_type"] == "INDIVIDUAL" for c in companies)


def test_fr15_record_trainee_company_change(client: TestClient, feature_fixture, db_session: Session):
    """FR-15: Record a Trainee's company change with historical affiliation preservation."""
    admin_hdr = _auth_headers(feature_fixture["admin"], db_session)
    trainee = feature_fixture["trainee"]
    comp_a = feature_fixture["comp_a"]
    comp_b = feature_fixture["comp_b"]

    # Initial affiliation
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    init_aff = TraineeAffiliation(
        trainee_id=trainee.id,
        company_id=comp_a.id,
        valid_from=now_utc - timedelta(days=90),
        valid_to=None
    )
    db_session.add(init_aff)
    trainee.current_company_id = comp_a.id
    db_session.commit()

    # Change employer to comp_b
    change_resp = client.post(
        f"/api/v1/trainees/{trainee.id}/change-company",
        headers=admin_hdr,
        json={
            "new_company_id": comp_b.id,
            "reason": "Promotion & employer transfer to Omega Corp"
        }
    )
    assert change_resp.status_code == 200
    assert change_resp.json()["current_company_id"] == comp_b.id

    # Retrieve affiliations history
    aff_resp = client.get(f"/api/v1/trainees/{trainee.id}/affiliations", headers=admin_hdr)
    assert aff_resp.status_code == 200
    affiliations = aff_resp.json()
    assert len(affiliations) >= 2

    # Verify the old affiliation is closed and new is current
    current_aff = next(a for a in affiliations if a["is_current"])
    assert current_aff["company_id"] == comp_b.id
    assert current_aff["valid_to"] is None

    closed_aff = next(a for a in affiliations if not a["is_current"] and a["company_id"] == comp_a.id)
    assert closed_aff["valid_to"] is not None


def test_fr04_assign_and_end_trainer_assignments(client: TestClient, feature_fixture, db_session: Session):
    """FR-04: Assign and end Trainer assignments."""
    admin_hdr = _auth_headers(feature_fixture["admin"], db_session)
    trainer = feature_fixture["trainer"]

    # Create session
    start_dt = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    end_dt = (datetime.now(timezone.utc) + timedelta(days=6)).isoformat()
    code = f"SESS-TRN-{uuid.uuid4().hex[:6].upper()}"
    sess_resp = client.post("/api/v1/records/sessions", headers=admin_hdr, json={
        "session_code": code,
        "course_name": "Advanced Threat Hunting",
        "start_date": start_dt,
        "end_date": end_dt,
        "delivery_type": "Public",
        "delivery_mode": "F2F",
        "venue": "BGC Main Hall A"
    })
    session_id = sess_resp.json()["id"]

    # 1. Assign trainer to session
    assign_resp = client.post(
        f"/api/v1/records/sessions/{session_id}/trainers",
        headers=admin_hdr,
        json={"user_id": trainer.id}
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["user_id"] == trainer.id
    assert assign_resp.json()["is_active"] is True

    # 2. List trainers for session
    list_resp = client.get(f"/api/v1/records/sessions/{session_id}/trainers", headers=admin_hdr)
    assert list_resp.status_code == 200
    trainers = list_resp.json()
    assert len(trainers) == 1
    assert trainers[0]["trainer_email"] == trainer.email
    assert trainers[0]["is_active"] is True

    # 3. End trainer assignment
    end_resp = client.delete(f"/api/v1/records/sessions/{session_id}/trainers/{trainer.id}", headers=admin_hdr)
    assert end_resp.status_code == 200
    assert "ended successfully" in end_resp.json()["message"]

    # 4. Verify assignment is now inactive
    list_after = client.get(f"/api/v1/records/sessions/{session_id}/trainers", headers=admin_hdr).json()
    assert list_after[0]["is_active"] is False


def test_gamification_quiz_approval_and_teams(client: TestClient, feature_fixture, db_session: Session):
    """GAM-01, GAM-03, SEC-26: Quiz approval and gamified session teams."""
    admin_hdr = _auth_headers(feature_fixture["admin"], db_session)
    trainer_hdr = _auth_headers(feature_fixture["trainer"], db_session)
    trainee = feature_fixture["trainee"]

    # 1. Create a quiz
    quiz_resp = client.post("/api/v1/gamification/quizzes", headers=admin_hdr, json={
        "title": "Cloud Security Architecture Assessment"
    })
    assert quiz_resp.status_code == 200
    quiz_id = quiz_resp.json()["id"]

    # Add question
    q_resp = client.post(f"/api/v1/gamification/quizzes/{quiz_id}/questions", headers=admin_hdr, json={
        "question_text": "Which AWS service manages KMS keys?",
        "options": ["AWS KMS", "AWS IAM", "AWS S3", "AWS EC2"],
        "correct_option": 0,
        "points": 20
    })
    assert q_resp.status_code == 200

    # 2. Approve the quiz (Admin or Trainer)
    appr_resp = client.post(f"/api/v1/gamification/quizzes/{quiz_id}/approve", headers=admin_hdr)
    assert appr_resp.status_code == 200
    assert appr_resp.json()["is_approved"] is True

    # 3. Create session for team testing
    start_dt = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    end_dt = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    code = f"SESS-TM-{uuid.uuid4().hex[:6].upper()}"
    sess = client.post("/api/v1/records/sessions", headers=admin_hdr, json={
        "session_code": code,
        "course_name": "Red Team Operations",
        "start_date": start_dt,
        "end_date": end_dt,
        "delivery_type": "Public",
        "delivery_mode": "Online"
    }).json()
    session_id = sess["id"]

    # 4. Create gamified Team in session (GAM-03)
    team_resp = client.post(
        f"/api/v1/gamification/sessions/{session_id}/teams",
        headers=admin_hdr,
        json={"team_name": "Cyber Phoenix"}
    )
    assert team_resp.status_code == 200
    team_id = team_resp.json()["id"]
    assert team_resp.json()["team_name"] == "Cyber Phoenix"

    # 5. Add trainee to team
    mem_resp = client.post(
        f"/api/v1/gamification/teams/{team_id}/members",
        headers=admin_hdr,
        json={"trainee_id": trainee.id}
    )
    assert mem_resp.status_code == 200
    assert mem_resp.json()["trainee_id"] == trainee.id

    # 6. List session teams
    list_teams = client.get(f"/api/v1/gamification/sessions/{session_id}/teams", headers=admin_hdr)
    assert list_teams.status_code == 200
    teams_data = list_teams.json()
    assert len(teams_data) >= 1
    target_team = next(t for t in teams_data if t["id"] == team_id)
    assert target_team["members_count"] == 1

    # 7. Remove member
    del_mem = client.delete(f"/api/v1/gamification/teams/{team_id}/members/{trainee.id}", headers=admin_hdr)
    assert del_mem.status_code == 200


def test_fr20_csv_and_excel_report_export(client: TestClient, feature_fixture, db_session: Session):
    """FR-20: Excel and CSV report export for client company."""
    am_hdr = _auth_headers(feature_fixture["am"], db_session)
    comp_code = feature_fixture["comp_a"].code

    # 1. Export as CSV
    resp_csv = client.get(f"/api/v1/reports/company/{comp_code}/export?format=csv", headers=am_hdr)
    assert resp_csv.status_code == 200
    assert "text/csv" in resp_csv.headers.get("content-type", "")
    assert f"Training_Report_{comp_code}.csv" in resp_csv.headers.get("content-disposition", "")
    assert "CrossQuest Enterprise Learning" in resp_csv.text

    # 2. Export as Excel
    resp_excel = client.get(f"/api/v1/reports/company/{comp_code}/export?format=excel", headers=am_hdr)
    assert resp_excel.status_code == 200
    assert "spreadsheetml" in resp_excel.headers.get("content-type", "")
    assert f"Training_Report_{comp_code}.xlsx" in resp_excel.headers.get("content-disposition", "")
    assert len(resp_excel.content) > 1000 # Valid non-empty workbook


def test_kms_envelope_encryption_with_fallback():
    """Feature 8: Real AWS KMS envelope encryption wrapper with graceful local fallback."""
    sample_key = "SAMPLE_CPABE_SECRET_KEY_PAYLOAD_STRING_ABC123"

    # Encrypt
    envelope = attribute_manager.envelope_encrypt_key(sample_key)
    assert "wrapped_dek" in envelope
    assert "nonce" in envelope
    assert "key_ciphertext" in envelope

    # Decrypt
    decrypted = attribute_manager.envelope_decrypt_key(
        wrapped_dek_b64=envelope["wrapped_dek"],
        nonce_b64=envelope["nonce"],
        key_ciphertext_b64=envelope["key_ciphertext"],
        kms_key_arn=envelope["kms_key_arn"]
    )
    assert decrypted == sample_key


def test_database_tls_enforced_check():
    """Feature 10: Database TLS verification helper function."""
    status = verify_database_tls_enforced(engine)
    assert "dialect" in status
    assert "tls_enforced" in status
    assert "status" in status
