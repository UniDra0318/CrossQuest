"""Integration tests for Authentication (TC-AUT-01..07) and Cross-Client Boundaries (TC-XCL-01..08).

Meets requirements:
- SEC-01: Password authentication with Argon2id.
- SEC-02: Role-based and client-scoped access control.
- SEC-03: Centralized single-authority multi-tenant architecture with 5 internal roles.
- DD-01: Trainee self-history portability (TRAINEE<id> clause).
- DD-03: No client company user logins.
- Chapter III Table 16, Table 17, and Table 28.
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, create_access_token
from app.models.entities import (
    User, ClientCompany, Trainee, TrainingSession, TrainingRecord,
    AccountManagerAssignment, TrainerAssignment
)
from app.crypto.cpabe_engine import cpabe_engine


@pytest.fixture
def seed_test_data(db_session: Session):
    """Seeds test companies, trainees, sessions, users, and training records."""
    db = db_session

    # 1. Companies
    comp_alpha = db.query(ClientCompany).filter_by(code="CORP_ALPHA").first()
    if not comp_alpha:
        comp_alpha = ClientCompany(name="Alpha Corp", code="CORP_ALPHA")
        db.add(comp_alpha)

    comp_beta = db.query(ClientCompany).filter_by(code="CORP_BETA").first()
    if not comp_beta:
        comp_beta = ClientCompany(name="Beta Industries", code="CORP_BETA")
        db.add(comp_beta)
    db.commit()

    # 2. Users (5 roles)
    def get_or_create_user(email, username, role, assigned_accounts=None):
        u = db.query(User).filter_by(email=email).first()
        if not u:
            u = User(
                email=email,
                username=username,
                full_name=username.title(),
                hashed_password=get_password_hash("TestPass123!"),
                role=role,
                assigned_client_accounts=assigned_accounts or [],
                is_active=True,
                is_superuser=(role == "admin")
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        return u

    admin = get_or_create_user("bound_admin@test.ph", "bound_admin", "admin")
    finance = get_or_create_user("bound_finance@test.ph", "bound_finance", "finance")
    am_alpha = get_or_create_user("bound_am_alpha@test.ph", "bound_am_alpha", "account_manager", ["CORP_ALPHA"])
    am_beta = get_or_create_user("bound_am_beta@test.ph", "bound_am_beta", "account_manager", ["CORP_BETA"])
    trainer_1 = get_or_create_user("bound_trainer1@test.ph", "bound_trainer1", "trainer")
    trainee_user_1 = get_or_create_user("bound_trainee1@test.ph", "bound_trainee1", "trainee")
    trainee_user_2 = get_or_create_user("bound_trainee2@test.ph", "bound_trainee2", "trainee")

    # 3. Trainees
    t1 = db.query(Trainee).filter_by(trainee_code="TRN_BND_001").first()
    if not t1:
        t1 = Trainee(
            user_id=trainee_user_1.id,
            current_company_id=comp_alpha.id,
            first_name="Alice",
            last_name="Alpha",
            email=trainee_user_1.email,
            trainee_code="TRN_BND_001"
        )
        db.add(t1)

    t2 = db.query(Trainee).filter_by(trainee_code="TRN_BND_002").first()
    if not t2:
        t2 = Trainee(
            user_id=trainee_user_2.id,
            current_company_id=comp_beta.id,
            first_name="Bob",
            last_name="Beta",
            email=trainee_user_2.email,
            trainee_code="TRN_BND_002"
        )
        db.add(t2)
    db.commit()
    db.refresh(t1)
    db.refresh(t2)

    # 4. Training Sessions
    from datetime import datetime
    sess1 = db.query(TrainingSession).filter_by(session_code="SESS_BND_01").first()
    if not sess1:
        sess1 = TrainingSession(
            session_code="SESS_BND_01",
            course_name="Cybersecurity 101",
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow(),
            delivery_type="Dedicated"
        )
        db.add(sess1)
        db.commit()
        db.refresh(sess1)

    # Assign trainer_1 to sess1
    assign = db.query(TrainerAssignment).filter_by(user_id=trainer_1.id, session_id=sess1.id).first()
    if not assign:
        db.add(TrainerAssignment(user_id=trainer_1.id, session_id=sess1.id))
        db.commit()

    # 5. Training Records
    # Record A: for Trainee 1 under Company Alpha
    rec_a = db.query(TrainingRecord).filter_by(trainee_id=t1.id, course_name="Cybersecurity 101").first()
    if not rec_a:
        policy_a = cpabe_engine.build_record_policy(
            company_code="CORP_ALPHA",
            session_code="SESS_BND_01",
            trainee_code=t1.trainee_code
        )
        enc_a = cpabe_engine.encrypt_record(
            {"score": 92.0, "remarks": "Excellent on Alpha tests"},
            policy_a,
            record_id=f"rec-{t1.trainee_code}"
        )
        rec_a = TrainingRecord(
            trainee_id=t1.id,
            session_id=sess1.id,
            company_at_completion_id=comp_alpha.id,
            course_name="Cybersecurity 101",
            status="Completed",
            score=92.0,
            encryption_policy=policy_a,
            policy_version=1,
            abe_ciphertext=enc_a.get("abe_ciphertext"),
            payload_ciphertext=enc_a.get("payload_ciphertext"),
            nonce=enc_a.get("nonce"),
            is_encrypted=True
        )
        db.add(rec_a)

    # Record B: for Trainee 2 under Company Beta (no session)
    rec_b = db.query(TrainingRecord).filter_by(trainee_id=t2.id, course_name="Risk Management").first()
    if not rec_b:
        policy_b = cpabe_engine.build_record_policy(
            company_code="CORP_BETA",
            session_code=None,
            trainee_code=t2.trainee_code
        )
        enc_b = cpabe_engine.encrypt_record(
            {"score": 85.0, "remarks": "Passed Beta compliance"},
            policy_b,
            record_id=f"rec-{t2.trainee_code}"
        )
        rec_b = TrainingRecord(
            trainee_id=t2.id,
            session_id=None,
            company_at_completion_id=comp_beta.id,
            course_name="Risk Management",
            status="Completed",
            score=85.0,
            encryption_policy=policy_b,
            policy_version=1,
            abe_ciphertext=enc_b.get("abe_ciphertext"),
            payload_ciphertext=enc_b.get("payload_ciphertext"),
            nonce=enc_b.get("nonce"),
            is_encrypted=True
        )
        db.add(rec_b)

    db.commit()
    db.refresh(rec_a)
    db.refresh(rec_b)

    return {
        "admin": admin,
        "finance": finance,
        "am_alpha": am_alpha,
        "am_beta": am_beta,
        "trainer_1": trainer_1,
        "trainee_user_1": trainee_user_1,
        "trainee_user_2": trainee_user_2,
        "t1": t1,
        "t2": t2,
        "comp_alpha": comp_alpha,
        "comp_beta": comp_beta,
        "rec_a": rec_a,
        "rec_b": rec_b,
    }


# =========================================================================
# TC-AUT-01..07: Authentication & Session Tests
# =========================================================================

def test_tc_aut_01_valid_login(client: TestClient, seed_test_data):
    """TC-AUT-01: Valid credentials issue access token and refresh token cookie."""
    resp = client.post("/api/v1/auth/login", data={
        "username": "bound_admin@test.ph",
        "password": "TestPass123!"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "crossquest_refresh_token" in resp.cookies


def test_tc_aut_02_invalid_password(client: TestClient, seed_test_data):
    """TC-AUT-02: Invalid password returns HTTP 401 Unauthorized."""
    resp = client.post("/api/v1/auth/login", data={
        "username": "bound_admin@test.ph",
        "password": "WrongPassword999!"
    })
    assert resp.status_code == 401
    assert "Incorrect" in resp.json()["detail"]


def test_tc_aut_03_missing_auth_header(client: TestClient):
    """TC-AUT-03: Protected endpoints reject requests missing Authorization header."""
    resp = client.get("/api/v1/records/")
    assert resp.status_code == 401


def test_tc_aut_04_malformed_or_expired_jwt(client: TestClient):
    """TC-AUT-04: Malformed or expired JWT returns HTTP 401."""
    resp = client.get("/api/v1/records/", headers={"Authorization": "Bearer malformed.jwt.token"})
    assert resp.status_code == 401


def test_tc_aut_05_refresh_token_rotation(client: TestClient, seed_test_data):
    """TC-AUT-05: Server-side refresh token rotation issues new access token."""
    login_resp = client.post("/api/v1/auth/login", data={
        "username": "bound_admin@test.ph",
        "password": "TestPass123!"
    })
    assert login_resp.status_code == 200
    refresh_cookie = login_resp.cookies.get("crossquest_refresh_token")

    refresh_resp = client.post("/api/v1/auth/refresh", cookies={"crossquest_refresh_token": refresh_cookie})
    assert refresh_resp.status_code == 200
    assert "access_token" in refresh_resp.json()


def test_tc_aut_06_inactive_user_cannot_login(client: TestClient, db_session: Session, seed_test_data):
    """TC-AUT-06: Inactive user accounts cannot log in."""
    user = seed_test_data["am_beta"]
    user.is_active = False
    db_session.commit()

    resp = client.post("/api/v1/auth/login", data={
        "username": user.email,
        "password": "TestPass123!"
    })
    assert resp.status_code == 401

    # Restore
    user.is_active = True
    db_session.commit()


def test_tc_aut_07_immediate_session_revocation_on_disable(client: TestClient, db_session: Session, seed_test_data):
    """TC-AUT-07: Disabling a user immediately revokes active sessions (Tier 1 Revocation)."""
    target = seed_test_data["trainer_1"]
    token = create_access_token(subject=target.id)

    # 1. Active request succeeds
    r1 = client.get("/api/v1/records/", headers={"Authorization": f"Bearer {token}"})
    assert r1.status_code == 200

    # 2. Disable user via admin endpoint
    admin = seed_test_data["admin"]
    admin_token = create_access_token(subject=admin.id)
    disable_resp = client.put(f"/api/v1/users/{target.id}/disable", headers={"Authorization": f"Bearer {admin_token}"})
    assert disable_resp.status_code == 200

    # 3. Next request with the previous token is immediately rejected with 401
    r2 = client.get("/api/v1/records/", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 401

    # Re-enable
    client.put(f"/api/v1/users/{target.id}/re-enable", headers={"Authorization": f"Bearer {admin_token}"})


# =========================================================================
# TC-XCL-01..08: Cross-Client Separation & Role Boundaries
# =========================================================================

def test_tc_xcl_01_account_manager_company_filtering(client: TestClient, seed_test_data):
    """TC-XCL-01: Account Manager for Alpha cannot view Company Beta records."""
    am_alpha = seed_test_data["am_alpha"]
    token = create_access_token(subject=am_alpha.id)

    resp = client.get("/api/v1/records/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    records = resp.json()

    # All returned records must belong to CORP_ALPHA
    for r in records:
        assert r["company_at_completion_id"] == seed_test_data["comp_alpha"].id
        assert r["company_at_completion_id"] != seed_test_data["comp_beta"].id


def test_tc_xcl_02_account_manager_decrypt_out_of_scope_denied(client: TestClient, seed_test_data):
    """TC-XCL-02: Account Manager attempting to decrypt Company Beta's record gets HTTP 403."""
    am_alpha = seed_test_data["am_alpha"]
    rec_b = seed_test_data["rec_b"]
    token = create_access_token(subject=am_alpha.id)

    resp = client.post(f"/api/v1/records/{rec_b.id}/decrypt", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert "outside your authorized organizational scope" in resp.json()["detail"]


def test_tc_xcl_03_account_manager_decrypt_in_scope_success(client: TestClient, seed_test_data):
    """TC-XCL-03: Account Manager for Alpha can access and decrypt Company Alpha records."""
    am_alpha = seed_test_data["am_alpha"]
    rec_a = seed_test_data["rec_a"]
    token = create_access_token(subject=am_alpha.id)

    resp = client.post(f"/api/v1/records/{rec_a.id}/decrypt", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["decrypted_content"]["score"] == 92.0


def test_tc_xcl_04_trainer_scope_isolation(client: TestClient, seed_test_data):
    """TC-XCL-04: Trainer can only view and decrypt records for assigned sessions."""
    trainer = seed_test_data["trainer_1"]
    rec_a = seed_test_data["rec_a"] # assigned session
    rec_b = seed_test_data["rec_b"] # unassigned session
    token = create_access_token(subject=trainer.id)

    # In-scope decrypt succeeds
    resp_a = client.post(f"/api/v1/records/{rec_a.id}/decrypt", headers={"Authorization": f"Bearer {token}"})
    assert resp_a.status_code == 200

    # Out-of-scope decrypt rejected
    resp_b = client.post(f"/api/v1/records/{rec_b.id}/decrypt", headers={"Authorization": f"Bearer {token}"})
    assert resp_b.status_code == 403


def test_tc_xcl_05_trainee_scope_isolation(client: TestClient, seed_test_data):
    """TC-XCL-05: Trainee can only view and decrypt their own records."""
    t1_user = seed_test_data["trainee_user_1"]
    rec_a = seed_test_data["rec_a"] # t1's record
    rec_b = seed_test_data["rec_b"] # t2's record
    token = create_access_token(subject=t1_user.id)

    # Can decrypt own record
    resp_a = client.post(f"/api/v1/records/{rec_a.id}/decrypt", headers={"Authorization": f"Bearer {token}"})
    assert resp_a.status_code == 200
    assert resp_a.json()["decrypted_content"]["score"] == 92.0

    # Cannot decrypt another trainee's record
    resp_b = client.post(f"/api/v1/records/{rec_b.id}/decrypt", headers={"Authorization": f"Bearer {token}"})
    assert resp_b.status_code == 403


def test_tc_xcl_06_trainee_cross_company_credential_mobility(db_session: Session, seed_test_data):
    """TC-XCL-06: Trainee retains decryption access when switching companies (DD-01: TRAINEE<id> clause)."""
    t1 = seed_test_data["t1"]
    rec_a = seed_test_data["rec_a"]
    comp_beta = seed_test_data["comp_beta"]

    # Simulate Trainee 1 moving from Company Alpha to Company Beta
    t1.current_company_id = comp_beta.id
    db_session.commit()

    # Build Trainee attribute key under new company
    trainee_attrs = cpabe_engine.build_user_attributes(role="trainee", trainee_code=t1.trainee_code)
    trainee_key = cpabe_engine.generate_user_private_key(trainee_attrs)

    # Reconstruct encrypted record dict
    enc_pkg = {
        "policy": rec_a.encryption_policy,
        "policy_version": rec_a.policy_version,
        "abe_ciphertext": rec_a.abe_ciphertext,
        "payload_ciphertext": rec_a.payload_ciphertext,
        "nonce": rec_a.nonce,
        "engine": "simulation"
    }

    # Trainee can still decrypt the historical record completed at Company Alpha!
    decrypted = cpabe_engine.decrypt_record(enc_pkg, trainee_key, record_id=f"rec-{t1.trainee_code}")
    assert decrypted is not None
    assert decrypted["score"] == 92.0


def test_tc_xcl_07_no_client_company_user_logins(client: TestClient, seed_test_data):
    """TC-XCL-07: Client companies have no system user accounts (DD-03)."""
    # Attempting to log in as a client company name or client code
    resp = client.post("/api/v1/auth/login", data={
        "username": "corp_alpha@clientcompany.ph",
        "password": "Password123!"
    })
    assert resp.status_code == 401


def test_tc_xcl_08_admin_and_finance_cross_client_authority(client: TestClient, seed_test_data):
    """TC-XCL-08: Admin and Finance have cross-client viewing and decryption authority."""
    admin = seed_test_data["admin"]
    finance = seed_test_data["finance"]
    rec_a = seed_test_data["rec_a"]
    rec_b = seed_test_data["rec_b"]

    admin_token = create_access_token(subject=admin.id)
    fin_token = create_access_token(subject=finance.id)

    # Admin decrypts both records
    assert client.post(f"/api/v1/records/{rec_a.id}/decrypt", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200
    assert client.post(f"/api/v1/records/{rec_b.id}/decrypt", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200

    # Finance decrypts both records
    assert client.post(f"/api/v1/records/{rec_a.id}/decrypt", headers={"Authorization": f"Bearer {fin_token}"}).status_code == 200
    assert client.post(f"/api/v1/records/{rec_b.id}/decrypt", headers={"Authorization": f"Bearer {fin_token}"}).status_code == 200
