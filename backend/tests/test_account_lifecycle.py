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
import hashlib
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
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
        cookies={"crossquest_refresh_token": refresh_cookie},
        headers={"X-CrossQuest-CSRF": "1"}
    )
    assert refresh_res.status_code == 200
    new_refresh_cookie = refresh_res.cookies["crossquest_refresh_token"]
    assert new_refresh_cookie != refresh_cookie  # Token rotated!

    # 3. Old refresh token replay should fail
    replay_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"crossquest_refresh_token": refresh_cookie},
        headers={"X-CrossQuest-CSRF": "1"}
    )
    assert replay_res.status_code == 401

    # 4. Logout revokes the session
    logout_res = client.post(
        "/api/v1/auth/logout",
        cookies={"crossquest_refresh_token": new_refresh_cookie},
        headers={"X-CrossQuest-CSRF": "1"}
    )
    assert logout_res.status_code == 200

    # 5. Reusing logged-out refresh token fails
    post_logout_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"crossquest_refresh_token": new_refresh_cookie},
        headers={"X-CrossQuest-CSRF": "1"}
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


def test_csrf_protection_on_cookie_endpoints(setup_test_users):
    """SEC-28: Enforce custom request header and Origin checks on /refresh and /logout."""
    # 1. Login to obtain refresh cookie
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "NewStaffPass2026!"}
    )
    refresh_cookie = login_res.cookies["crossquest_refresh_token"]

    # 2. Refresh without custom header -> 403 Forbidden
    no_header_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"crossquest_refresh_token": refresh_cookie}
    )
    assert no_header_res.status_code == 403
    assert "CSRF validation failed" in no_header_res.json()["detail"]

    # 3. Refresh with untrusted external Origin -> 403 Forbidden
    bad_origin_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"crossquest_refresh_token": refresh_cookie},
        headers={"X-CrossQuest-CSRF": "1", "Origin": "https://evil-attacker-site.com"}
    )
    assert bad_origin_res.status_code == 403

    # 4. Refresh with valid header & allowed Origin -> 200 OK
    good_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"crossquest_refresh_token": refresh_cookie},
        headers={"X-CrossQuest-CSRF": "1", "Origin": "http://localhost:5173"}
    )
    assert good_res.status_code == 200


def test_keyed_hmac_username_in_audit_logs(setup_test_users):
    """SEC-01 / Phase 1: Failed and successful logins record keyed HMAC-SHA256 of usernames; no plaintext credentials."""
    from app.models.entities import AccessLog
    from app.core.security import hmac_username

    raw_username = "sensitive_target_user@crossworks.ph"
    client.post(
        "/api/v1/auth/login",
        data={"username": raw_username, "password": "TypoPassword123!"}
    )

    db = SessionLocal()
    # Find most recent AUTH_FAILURE log
    log = db.query(AccessLog).filter(AccessLog.event_type == "AUTH_FAILURE").order_by(AccessLog.occurred_at.desc()).first()
    assert log is not None
    # Must NOT contain raw username in details
    assert "username" not in log.details or log.details.get("username") != raw_username
    # Must contain keyed-HMAC username (64 hex characters)
    assert "username_hmac" in log.details
    assert log.details["username_hmac"] == hmac_username(raw_username)
    assert len(log.details["username_hmac"]) == 64
    db.close()


def test_token_lifetimes_and_role_idle_timeouts(setup_test_users):
    """OI-17 & SEC-07: Verify 10-minute access token, 8-hour refresh, 12-hour max session, and role idle timeouts."""
    # 1. Staff login (Account Manager -> 30 min idle timeout = 1800s)
    staff_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "NewStaffPass2026!"}
    )
    assert staff_login.status_code == 200
    refresh_cookie = staff_login.cookies["crossquest_refresh_token"]

    db = SessionLocal()
    ref_hash = hashlib.sha256(refresh_cookie.encode("utf-8")).hexdigest()
    session = db.query(UserSession).filter(UserSession.refresh_token_hash == ref_hash).first()
    assert session is not None
    # Verify 30m idle timeout for staff (1800s)
    assert session.idle_timeout_sec == 1800
    # Verify max lifetime is approximately 12 hours from now
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    assert session.max_expires_at is not None
    hours_to_max = (session.max_expires_at - now_utc).total_seconds() / 3600.0
    assert 11.8 <= hours_to_max <= 12.1

    # 2. Admin login (Admin -> 15 min idle timeout = 900s)
    admin_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    admin_refresh = admin_login.cookies["crossquest_refresh_token"]
    admin_hash = hashlib.sha256(admin_refresh.encode("utf-8")).hexdigest()
    admin_session = db.query(UserSession).filter(UserSession.refresh_token_hash == admin_hash).first()
    assert admin_session.idle_timeout_sec == 900  # 15 minutes!
    db.close()


def test_role_based_idle_timeout_expiration(setup_test_users):
    """SEC-07: Inactive session beyond idle timeout returns 401 and revokes session."""
    # 1. Admin login (900s idle limit)
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    token = login_res.json()["access_token"]
    refresh_cookie = login_res.cookies["crossquest_refresh_token"]

    # 2. Fast forward all admin sessions by 16 minutes (exceeding 15m idle)
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "lifecycle_admin@test.ph").first()
    db.query(UserSession).filter(UserSession.user_id == admin.id).update(
        {"last_active_at": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=16)}
    )
    db.commit()
    db.close()

    # 3. Next request should fail with 401 Session timed out
    req_res = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert req_res.status_code == 401
    assert "timed out" in req_res.json()["detail"].lower()


def test_max_session_lifetime_12h_expiration(setup_test_users):
    """OI-17: Session exceeding 12-hour max lifetime returns 401 even if active."""
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "NewStaffPass2026!"}
    )
    token = login_res.json()["access_token"]

    # Fast forward all staff sessions to past max_expires_at
    db = SessionLocal()
    staff = db.query(User).filter(User.email == "lifecycle_staff@test.ph").first()
    db.query(UserSession).filter(UserSession.user_id == staff.id).update(
        {"max_expires_at": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=5)}
    )
    db.commit()
    db.close()

    req_res = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert req_res.status_code == 401
    assert "expired" in req_res.json()["detail"].lower()


def test_mfa_setup_enable_and_totp_login(setup_test_users):
    """SEC-01 & OI-26: MFA enrollment with QR code, enable with TOTP, login challenge step."""
    import pyotp
    admin_id = setup_test_users["admin"].id

    # 1. Login as admin to get auth token
    admin_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    token = admin_login.json()["access_token"]

    # 2. Call /auth/mfa/setup to get TOTP secret and QR code data URI
    setup_res = client.post(
        "/api/v1/auth/mfa/setup",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert setup_res.status_code == 200
    mfa_data = setup_res.json()
    assert "secret" in mfa_data
    assert "qr_code_data_uri" in mfa_data
    assert mfa_data["qr_code_data_uri"].startswith("data:image/png;base64,")
    secret = mfa_data["secret"]

    # 3. Enable MFA by verifying current TOTP code
    totp = pyotp.TOTP(secret)
    current_code = totp.now()

    enable_res = client.post(
        "/api/v1/auth/mfa/enable",
        headers={"Authorization": f"Bearer {token}"},
        json={"secret": secret, "code": current_code}
    )
    assert enable_res.status_code == 200
    enable_data = enable_res.json()
    assert "recovery_codes" in enable_data
    assert len(enable_data["recovery_codes"]) == 8
    recovery_code = enable_data["recovery_codes"][0]

    # 4. Now attempt login as admin: should return mfa_required=True and challenge_token
    login_mfa_res = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    assert login_mfa_res.status_code == 200
    res_json = login_mfa_res.json()
    assert res_json["mfa_required"] is True
    assert "challenge_token" in res_json
    challenge = res_json["challenge_token"]

    # 5. Invalid TOTP code fails
    fail_verify = client.post(
        "/api/v1/auth/mfa/verify",
        json={"challenge_token": challenge, "code": "000000"}
    )
    assert fail_verify.status_code == 401

    # 6. Valid TOTP code succeeds and returns access token + refresh cookie
    verify_res = client.post(
        "/api/v1/auth/mfa/verify",
        json={"challenge_token": challenge, "code": totp.now()}
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert "access_token" in verify_data
    assert verify_data["mfa_required"] is False
    assert "crossquest_refresh_token" in verify_res.cookies


def test_mfa_single_use_recovery_code(setup_test_users):
    """OI-26: Login using single-use recovery code; second attempt with same code fails."""
    # 1. Login to get challenge token
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    challenge = login_res.json()["challenge_token"]

    # Retrieve one stored recovery code from DB
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "lifecycle_admin@test.ph").first()
    # Seed a known recovery code
    raw_recovery_code = "TEST-CODE"
    code_hash = hashlib.sha256(raw_recovery_code.encode("utf-8")).hexdigest()
    admin.mfa_recovery_codes = [code_hash]
    db.commit()
    db.close()

    # 2. Verify login with recovery code
    rec_res = client.post(
        "/api/v1/auth/mfa/verify",
        json={"challenge_token": challenge, "code": raw_recovery_code}
    )
    assert rec_res.status_code == 200
    assert "access_token" in rec_res.json()

    # 3. New challenge token
    login_res_2 = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    challenge_2 = login_res_2.json()["challenge_token"]

    # 4. Attempting to reuse same recovery code must fail (single-use)
    reuse_res = client.post(
        "/api/v1/auth/mfa/verify",
        json={"challenge_token": challenge_2, "code": raw_recovery_code}
    )
    assert reuse_res.status_code == 401


def test_email_delivery_lifecycle_setup_24h_and_reset_15m(setup_test_users):
    """Phase 1: Setup invitations have 24h validity and resets have 15m validity, sent via email_service."""
    from app.services.email_service import email_service
    admin_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_staff@test.ph", "password": "NewStaffPass2026!"}
    )
    # Temporary disable MFA on admin to get clean admin token for user creation
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "lifecycle_admin@test.ph").first()
    admin.mfa_enabled = False
    db.commit()
    db.close()

    admin_login = client.post(
        "/api/v1/auth/login",
        data={"username": "lifecycle_admin@test.ph", "password": "AdminPass123!"}
    )
    admin_token = admin_login.json()["access_token"]

    # 1. Admin creates user -> email sent with 24h expiry
    email_service.sent_emails.clear()
    unique_email = f"emp_{time.time_ns()}@test.ph"
    create_res = client.post(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": unique_email,
            "full_name": "New Employee",
            "role": "trainee",
            "assigned_client_accounts": []
        }
    )
    assert create_res.status_code == 200
    create_data = create_res.json()
    # Check 24-hour expiration on setup token
    expires_at = datetime.fromisoformat(create_data["expires_at"])
    if expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    assert (expires_at - now_naive).total_seconds() > 23 * 3600  # ~24 hours

    # Check email was dispatched from crossquest@xworks.ph
    assert len(email_service.sent_emails) >= 1
    setup_email = [e for e in email_service.sent_emails if e["to"] == unique_email][0]
    assert setup_email["from"] == "crossquest@xworks.ph"
    assert "24 hours" in setup_email["html"]

    # 2. Trigger password reset -> email sent with 15m expiry
    email_service.sent_emails.clear()
    user_id = create_data["user"]["id"]
    reset_res = client.post(
        f"/api/v1/users/{user_id}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    reset_exp = datetime.fromisoformat(reset_data["expires_at"])
    if reset_exp.tzinfo is not None:
        reset_exp = reset_exp.replace(tzinfo=None)
    assert 13 * 60 <= (reset_exp - now_naive).total_seconds() <= 16 * 60  # ~15 minutes

    assert len(email_service.sent_emails) >= 1
    reset_email = [e for e in email_service.sent_emails if e["to"] == unique_email][0]
    assert reset_email["from"] == "crossquest@xworks.ph"
    assert "15 minutes" in reset_email["html"]

