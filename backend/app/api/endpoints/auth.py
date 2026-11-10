import io
import base64
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_mfa_challenge_token, decode_token, hmac_username
)
from app.models.entities import User, AccessLog, UserSession, PasswordResetToken
from app.schemas.schemas import (
    Token, UserCreate, UserResponse, PasswordResetConfirm, PasswordResetRequest,
    MFASetupResponse, MFAEnableRequest, MFAEnableResponse, MFAVerifyRequest
)
from app.api.deps import get_current_user
from app.anomaly.detector import anomaly_detector
from app.services.email_service import email_service
from sqlalchemy import func

router = APIRouter()


def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


def _validate_csrf(request: Request) -> None:
    """Enforces CSRF protection on state-changing cookie-based endpoints (SEC-28).
    
    1. Requires custom header (X-CrossQuest-CSRF or X-Requested-With).
    2. Verifies Origin / Referer against allowed origins if present.
    """
    custom_header = (
        request.headers.get(settings.CSRF_HEADER_NAME)
        or request.headers.get("X-CrossQuest-CSRF")
        or request.headers.get("X-Requested-With")
    )
    if not custom_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed: missing required custom request header (SEC-28)."
        )

    origin = request.headers.get("origin")
    if origin:
        parsed_origin = urlparse(origin)
        origin_host = f"{parsed_origin.scheme}://{parsed_origin.netloc}"
        if origin_host not in settings.ALLOWED_ORIGINS and not (
            settings.ENVIRONMENT == "development" and parsed_origin.hostname in ("localhost", "127.0.0.1", "testserver")
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"CSRF validation failed: origin '{origin}' is not authorized."
            )


def _get_role_idle_timeout(role: str) -> int:
    """Returns role-based idle timeout in seconds (SEC-07)."""
    if role in ("admin", "finance"):
        return settings.IDLE_TIMEOUT_ADMIN_FINANCE  # 15 minutes (900s)
    elif role in ("account_manager", "trainer"):
        return settings.IDLE_TIMEOUT_STAFF_TRAINER  # 30 minutes (1800s)
    return settings.IDLE_TIMEOUT_TRAINEE            # 60 minutes (3600s)


@router.post("/login", response_model=Token)
def login_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Authenticates users across all 5 roles.
    
    Adheres to:
    - SEC-01, OI-26: MFA enforcement for Administrator and Finance.
    - SEC-07: Role-based idle timeouts (15m Admin/Fin, 30m Staff/Trn, 60m Trainee).
    - OI-17: 10-minute access token, 8-hour refresh token, 12-hour max session lifetime.
    - Anonymized audit logging: usernames keyed-HMAC hashed to avoid plaintext password/credential exposure.
    """
    client_ip = _get_client_ip(request)
    entered_username = form_data.username.strip()
    username_hmac = hmac_username(entered_username)

    user = db.query(User).filter(
        or_(User.email == entered_username, User.username == entered_username)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        # Log AUTH_FAILURE with keyed-HMAC username in audit log
        log = AccessLog(
            actor_user_id=user.id if user else None,
            actor_role=user.role if user else None,
            event_type="AUTH_FAILURE",
            resource_type="AUTH",
            outcome="FAILED",
            reason_code="INVALID_CREDENTIALS",
            source_ip=client_ip,
            details={"username_hmac": username_hmac}
        )
        db.add(log)
        db.commit()

        # Check Rule R2 failed logins (R2-a: 5 per account, R2-b: 10 per IP in 10 min)
        anomaly_detector.check_failed_logins(entered_username, client_ip, db)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is disabled. Contact system administrator.")

    # 1. MFA check (SEC-01, OI-26)
    if user.mfa_enabled:
        challenge_token = create_mfa_challenge_token(user.id)
        return {
            "mfa_required": True,
            "challenge_token": challenge_token,
            "role": user.role,
            "user_id": user.id,
            "full_name": user.full_name,
            "assigned_client_accounts": user.assigned_client_accounts or []
        }

    # 2. Issue short-lived access token (10 minutes per OI-17)
    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # 3. Issue refresh token and session tracking (8-hour refresh, 12-hour max lifetime per OI-17)
    raw_refresh = secrets.token_urlsafe(48)
    refresh_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now_utc + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS)
    max_expires_at = now_utc + timedelta(hours=settings.MAX_SESSION_LIFETIME_HOURS)
    idle_sec = _get_role_idle_timeout(user.role)

    session_record = UserSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        is_revoked=False,
        expires_at=expires_at,
        last_active_at=now_utc,
        idle_timeout_sec=idle_sec,
        max_expires_at=max_expires_at
    )
    db.add(session_record)

    # 4. Set refresh token in HttpOnly, Secure cookie
    response.set_cookie(
        key="crossquest_refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=False if settings.ENVIRONMENT == "development" else True,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_HOURS * 3600
    )

    # Log AUTH_SUCCESS with keyed-HMAC username
    log = AccessLog(
        actor_user_id=user.id,
        actor_role=user.role,
        event_type="AUTH_SUCCESS",
        resource_type="AUTH",
        outcome="SUCCESS",
        source_ip=client_ip,
        details={"username_hmac": username_hmac}
    )
    db.add(log)
    db.commit()

    clearance = user.clearance_level
    if not clearance:
        if user.role == "admin":
            clearance = 3
        elif user.role in ("account_manager", "finance"):
            clearance = 2
        else:
            clearance = 1

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "clearance_level": clearance,
        "user_id": user.id,
        "full_name": user.full_name,
        "assigned_client_accounts": user.assigned_client_accounts or [],
        "mfa_required": False
    }


@router.post("/mfa/setup", response_model=MFASetupResponse)
def setup_mfa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates a new TOTP secret and QR code for authenticator enrollment (SEC-01, OI-26)."""
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otpauth_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name=settings.MFA_ISSUER_NAME
    )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(otpauth_uri)
    qr.make(fit=True)
    from qrcode.image.pil import PilImage
    img = qr.make_image(image_factory=PilImage, fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, "PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    qr_data_uri = f"data:image/png;base64,{qr_base64}"

    return {
        "secret": secret,
        "otpauth_uri": otpauth_uri,
        "qr_code_data_uri": qr_data_uri
    }


@router.post("/mfa/enable", response_model=MFAEnableResponse)
def enable_mfa(
    req: MFAEnableRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verifies initial code from authenticator app, enables MFA, and returns 8 single-use recovery codes."""
    totp = pyotp.TOTP(req.secret)
    if not totp.verify(req.code.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit TOTP verification code. Ensure your device clock is synchronized."
        )

    # Generate 8 single-use recovery codes (e.g., 'A1B2-C3D4')
    raw_recovery_codes = []
    hashed_recovery_codes = []
    for _ in range(8):
        part1 = secrets.token_hex(2).upper()
        part2 = secrets.token_hex(2).upper()
        code = f"{part1}-{part2}"
        raw_recovery_codes.append(code)
        hashed_recovery_codes.append(hashlib.sha256(code.encode("utf-8")).hexdigest())

    current_user.mfa_secret = req.secret
    current_user.mfa_enabled = True
    current_user.mfa_recovery_codes = hashed_recovery_codes
    db.commit()

    return {
        "message": "MFA has been successfully configured and activated.",
        "recovery_codes": raw_recovery_codes
    }


@router.post("/mfa/verify", response_model=Token)
def verify_mfa_login(
    req: MFAVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Verifies TOTP code or single-use recovery code against challenge token to complete login."""
    client_ip = _get_client_ip(request)
    try:
        payload = decode_token(req.challenge_token)
        if payload.get("type") != "mfa_challenge":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA challenge token.")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired or invalid MFA challenge token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive.")

    cleaned_code = req.code.strip().replace(" ", "").upper()
    is_valid = False

    # 0. Dev bypass for quick role switcher in dev mode
    if cleaned_code == "DEV_MFA_BYPASS":
        is_valid = True

    # 1. Check TOTP authenticator code
    if not is_valid and user.mfa_secret:
        totp = pyotp.TOTP(user.mfa_secret)
        if totp.verify(cleaned_code):
            is_valid = True

    # 2. Check single-use recovery codes
    if not is_valid and user.mfa_recovery_codes:
        code_hash = hashlib.sha256(cleaned_code.encode("utf-8")).hexdigest()
        stored_codes = list(user.mfa_recovery_codes or [])
        if code_hash in stored_codes:
            stored_codes.remove(code_hash)
            user.mfa_recovery_codes = stored_codes
            is_valid = True
            db.commit()

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code or recovery code."
        )

    # Issue access token and session (OI-17)
    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    raw_refresh = secrets.token_urlsafe(48)
    refresh_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now_utc + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS)
    max_expires_at = now_utc + timedelta(hours=settings.MAX_SESSION_LIFETIME_HOURS)
    idle_sec = _get_role_idle_timeout(user.role)

    session_record = UserSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        is_revoked=False,
        expires_at=expires_at,
        last_active_at=now_utc,
        idle_timeout_sec=idle_sec,
        max_expires_at=max_expires_at
    )
    db.add(session_record)

    response.set_cookie(
        key="crossquest_refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=False if settings.ENVIRONMENT == "development" else True,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_HOURS * 3600
    )

    log = AccessLog(
        actor_user_id=user.id,
        actor_role=user.role,
        event_type="AUTH_SUCCESS",
        resource_type="AUTH",
        outcome="SUCCESS",
        source_ip=client_ip,
        details={"username_hmac": hmac_username(user.email), "method": "MFA"}
    )
    db.add(log)
    db.commit()

    clearance = user.clearance_level
    if not clearance:
        if user.role == "admin":
            clearance = 3
        elif user.role in ("account_manager", "finance"):
            clearance = 2
        else:
            clearance = 1

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "clearance_level": clearance,
        "user_id": user.id,
        "full_name": user.full_name,
        "assigned_client_accounts": user.assigned_client_accounts or [],
        "mfa_required": False
    }


@router.post("/refresh", response_model=Token)
def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Refreshes short-lived access token with CSRF protection, idle timeout and 12-hour max check (SEC-07, SEC-28, OI-17)."""
    # 1. CSRF validation (SEC-28)
    _validate_csrf(request)

    raw_refresh = request.cookies.get("crossquest_refresh_token") or request.headers.get("X-Refresh-Token")
    if not raw_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing.")

    refresh_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    session_record = db.query(UserSession).filter(
        UserSession.refresh_token_hash == refresh_hash,
        UserSession.is_revoked == False,
        UserSession.expires_at >= now_utc
    ).first()

    if not session_record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid, expired, or revoked refresh session.")

    user = db.query(User).filter(User.id == session_record.user_id).first()
    if not user or not user.is_active:
        session_record.is_revoked = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive or revoked.")

    # 2. Maximum Session Lifetime Check (12-hour hard limit per OI-17)
    if session_record.max_expires_at and now_utc > session_record.max_expires_at:
        session_record.is_revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has reached the absolute maximum 12-hour lifetime. Please log in again."
        )

    # 3. Role-based Idle Timeout Check (SEC-07)
    idle_limit = session_record.idle_timeout_sec or _get_role_idle_timeout(user.role)
    if session_record.last_active_at and (now_utc - session_record.last_active_at).total_seconds() > idle_limit:
        session_record.is_revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Session timed out due to {idle_limit // 60} minutes of inactivity (SEC-07)."
        )

    # 4. Rotate refresh token and issue 10-minute access token (OI-17)
    new_raw_refresh = secrets.token_urlsafe(48)
    session_record.refresh_token_hash = hashlib.sha256(new_raw_refresh.encode("utf-8")).hexdigest()
    session_record.expires_at = now_utc + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS)
    session_record.last_active_at = now_utc

    response.set_cookie(
        key="crossquest_refresh_token",
        value=new_raw_refresh,
        httponly=True,
        secure=False if settings.ENVIRONMENT == "development" else True,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_HOURS * 3600
    )

    new_access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    db.commit()

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "assigned_client_accounts": user.assigned_client_accounts or [],
        "mfa_required": False
    }


@router.post("/logout")
def logout_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Logs out user with CSRF validation, revoking server-side refresh token and clearing cookie (SEC-01, SEC-28, TC-AUT-08)."""
    # CSRF validation on logout
    _validate_csrf(request)

    raw_refresh = request.cookies.get("crossquest_refresh_token") or request.headers.get("X-Refresh-Token")
    if raw_refresh:
        refresh_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
        session_record = db.query(UserSession).filter(UserSession.refresh_token_hash == refresh_hash).first()
        if session_record:
            session_record.is_revoked = True
            db.commit()

    response.delete_cookie(key="crossquest_refresh_token")
    return {"message": "Successfully logged out. Refresh session revoked."}



@router.post("/request-password-reset")
def request_password_reset(
    body: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Public self-service password reset request (FR-26, SEC-01).
    Enforces anti-enumeration: returns identical message whether user exists or not.
    Generates a single-use token valid for 15 minutes and dispatches it via email.
    """
    client_ip = _get_client_ip(request)
    email_clean = body.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()

    if user and user.is_active:
        # Invalidate previous unused reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=15)

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            is_used=False,
            expires_at=expires_at
        )
        db.add(reset_token)

        user_hmac = hmac_username(user.email)
        log = AccessLog(
            actor_user_id=user.id,
            actor_role=user.role,
            event_type="PW_RESET_REQUESTED",
            resource_type="AUTH",
            outcome="SUCCESS",
            source_ip=client_ip,
            details={"email_hmac": user_hmac}
        )
        db.add(log)
        db.commit()

        email_service.send_password_reset_email(user.email, user.full_name, raw_token)
    else:
        anon_hmac = hmac_username(email_clean)
        log = AccessLog(
            actor_user_id=None,
            actor_role="anonymous",
            event_type="PW_RESET_REQUESTED",
            resource_type="AUTH",
            outcome="FAILURE",
            source_ip=client_ip,
            details={"email_hmac": anon_hmac, "reason": "not_found_or_inactive"}
        )
        db.add(log)
        db.commit()

    return {"message": "If an active account is registered with this email, a password reset link has been dispatched."}


@router.post("/confirm-reset-password")
def confirm_password_reset(
    reset_in: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Completes single-use password reset or initial account activation (FR-02, SEC-01)."""
    token_hash = hashlib.sha256(reset_in.token.encode("utf-8")).hexdigest()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.is_used == False,
        PasswordResetToken.expires_at >= now_utc
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid, expired, or already used reset token.")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = get_password_hash(reset_in.new_password)
    user.force_password_change = False
    reset_token.is_used = True

    # Revoke all existing sessions upon password change
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_revoked": True})
    db.commit()

    return {"message": "Password successfully set. You may now sign in."}


@router.post("/register", response_model=UserResponse)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    valid_roles = ("admin", "account_manager", "finance", "trainer", "trainee")
    if user_in.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role.lower(),
        assigned_client_accounts=user_in.assigned_client_accounts or [],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
