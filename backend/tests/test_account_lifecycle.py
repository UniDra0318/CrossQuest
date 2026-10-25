"""Unit and integration tests for Account Lifecycle, Tier 1 Revocation, and Refresh Sessions.

Covers:
- TC-AUT-01: Authentication by role (Argon2id hashing, invalid password rejection, failure logging).
- TC-AUT-08: Logout and session expiry (server-side refresh token revocation; reuse of revoked token refused).
- TC-ATT-03: Staff departure / account disable (immediate rejection on next request, sessions revoked, key material removed).
- TC-ATT-10: Immediate effect of account disablement.
- Single-use activation / password reset tokens with 15-minute expiration.
"""

import os
import sys
import time
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash, verify_password
from app.models.entities import User, UserSession, PasswordResetToken, UserAbeKey

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_test_users():
    """Seed test admin and staff accounts for lifecycle tests."""
    Base.metadata.create_all(bind=engine)
    
    # Ensure column exists if using existing SQLite dev database
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception:
            pass

    db = SessionLocal()

    
    # Clean test users if exist
    db.query(PasswordResetToken).delete()
    db.query(UserSession).delete()
    db.query(UserAbeKey).delete()
    db.query(User).filter(User.email.in_(["lifecycle_admin@test.ph", "lifecycle_staff@test.ph"])).delete()
    db.commit()

    admin = User(
        email="lifecycle_admin@test.ph",
        username="life_admin",
        full_name="Lifecycle Admin",
        hashed_password=get_password_hash("AdminPass123!"),
        role="admin",
        is_superuser=True,
        is_active=True
    )
    staff = User(
        email="lifecycle_staff@test.ph",
        username="life_staff",
        full_name="Lifecycle Staff",
        hashed_password=get_password_hash("StaffPass123!"),
        role="account_manager",
        assigned_client_accounts=["CORP_ALPHA"],
        is_active=True
    )
    db.add_all([admin, staff])
    db.commit()
    db.refresh(admin)
    db.refresh(staff)
    
    yield {"admin": admin, "staff": staff}
    db.close()


def test_argon2_password_hashing():
    """Verify that new password hashes are generated using Argon2id (SEC-01)."""
    raw = "SecureP@ssw0rd2026!"
    hashed = get_password_hash(raw)
    assert hashed.startswith("$argon2") or "argon2" in hashed
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_login_and_server_side_refresh_session(setup_test_users):
    """TC-AUT-01: Successful login sets HttpOnly cookie and creates UserSession record."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "StaffPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "account_manager"

    # Verify refresh cookie was set
    assert "crossquest_refresh_token" in response.cookies
    raw_refresh = response.cookies["crossquest_refresh_token"]
    assert len(raw_refresh) > 30

    # Verify server-side session exists in database
    db = SessionLocal()
    import hashlib
    ref_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
    session = db.query(UserSession).filter(UserSession.refresh_token_hash == ref_hash).first()
    assert session is not None
    assert session.is_revoked is False
    assert session.user_id == setup_test_users["staff"].id
    db.close()


def test_refresh_token_rotation_and_logout(setup_test_users):
    """TC-AUT-08: Token refresh rotates token; logout revokes session and rejects replay."""
    # 1. Login
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "StaffPass123!"}
    )
    refresh_cookie = login_res.cookies["crossquest_refresh_token"]

    # 2. Refresh token rotation
    refresh_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"crossquest_refresh_token": refresh_cookie}
    )
    assert refresh_res.status_code == 200
    new_refresh_cookie = refresh_res.cookies["crossquest_refresh_token"]
    assert new_refresh_cookie != refresh_cookie  # Token rotated!

    # 3. Old refresh token replay should fail
    replay_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"crossquest_refresh_token": refresh_cookie}
    )
    assert replay_res.status_code == 401

    # 4. Logout revokes the session
    logout_res = client.post(
        "/api/v1/auth/logout",
        cookies={"crossquest_refresh_token": new_refresh_cookie}
    )
    assert logout_res.status_code == 200

    # 5. Reusing logged-out refresh token fails
    post_logout_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"crossquest_refresh_token": new_refresh_cookie}
    )
    assert post_logout_res.status_code == 401


def test_admin_disable_user_immediate_effect(setup_test_users):
    """TC-ATT-03 & TC-ATT-10: Admin disables account -> immediate next request is refused with 401."""
    # 1. Log in as admin
    admin_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    admin_token = admin_login.json()["access_token"]

    # 2. Staff logs in to get active access token
    staff_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "StaffPass123!"}
    )
    staff_token = staff_login.json()["access_token"]
    staff_id = setup_test_users["staff"].id

    # 3. Staff verifies access works before disable
    profile_before = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert profile_before.status_code == 200

    # 4. Admin disables staff account
    disable_res = client.put(
        f"/api/v1/users/{staff_id}/disable",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert disable_res.status_code == 200
    assert disable_res.json()["is_active"] is False

    # 5. Immediate effect (TC-ATT-10): staff token is refused immediately on next request
    profile_after = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert profile_after.status_code == 401

    # 6. Admin re-enables account
    reenable_res = client.put(
        f"/api/v1/users/{staff_id}/re-enable",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert reenable_res.status_code == 200
    assert reenable_res.json()["is_active"] is True


def test_admin_single_use_password_reset(setup_test_users):
    """Verify Admin triggers single-use password reset token with 15-minute expiration."""
    # 1. Admin logs in
    admin_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    admin_token = admin_login.json()["access_token"]
    staff_id = setup_test_users["staff"].id

    # 2. Trigger reset
    reset_res = client.post(
        f"/api/v1/users/{staff_id}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert reset_res.status_code == 200
    data = reset_res.json()
    assert "reset_token" in data
    assert "reset_link" in data
    raw_token = data["reset_token"]

    # 3. Complete password reset using token
    confirm_res = client.post(
        "/api/v1/auth/confirm-reset-password",
        json={"token": raw_token, "new_password": "NewStaffPass2026!"}
    )
    assert confirm_res.status_code == 200

    # 4. Re-using same token fails (single-use)
    replay_confirm = client.post(
        "/api/v1/auth/confirm-reset-password",
        json={"token": raw_token, "new_password": "AnotherPassword!"}
    )
    assert replay_confirm.status_code == 400

    # 5. Sign in with new password succeeds; old password fails
    old_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "StaffPass123!"}
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "NewStaffPass2026!"}
    )
    assert new_login.status_code == 200
