import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.entities import User, AccessLog, UserSession, PasswordResetToken
from app.schemas.schemas import Token, UserCreate, UserResponse, PasswordResetConfirm
from app.anomaly.detector import anomaly_detector

router = APIRouter()


def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


@router.post("/login", response_model=Token)
def login_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Authenticates users across all 5 roles.
    Logs AUTH_SUCCESS / AUTH_FAILURE, creates server-side refresh session, and sets HttpOnly cookie (SEC-01).
    """
    client_ip = _get_client_ip(request)
    entered_username = form_data.username.strip()

    user = db.query(User).filter(
        or_(User.email == entered_username, User.username == entered_username)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        # Log AUTH_FAILURE to audit log (Table 19)
        log = AccessLog(
            actor_user_id=user.id if user else None,
            actor_role=user.role if user else None,
            event_type="AUTH_FAILURE",
            resource_type="AUTH",
            outcome="FAILED",
            reason_code="INVALID_CREDENTIALS",
            source_ip=client_ip,
            details={"username": entered_username}
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

    # 1. Issue short-lived access token
    access_token = create_access_token(subject=user.id, expires_delta=timedelta(minutes=60))

    # 2. Issue long-lived refresh token stored server-side (SEC-01, TC-AUT-08)
    raw_refresh = secrets.token_urlsafe(48)
    refresh_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)

    session_record = UserSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        is_revoked=False,
        expires_at=expires_at
    )
    db.add(session_record)

    # 3. Set refresh token in HttpOnly, Secure cookie
    response.set_cookie(
        key="crossquest_refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=False if settings.ENVIRONMENT == "development" else True,
        samesite="strict",
        max_age=7 * 24 * 3600
    )

    # Log AUTH_SUCCESS
    log = AccessLog(
        actor_user_id=user.id,
        actor_role=user.role,
        event_type="AUTH_SUCCESS",
        resource_type="AUTH",
        outcome="SUCCESS",
        source_ip=client_ip,
        details={"username": user.email}
    )
    db.add(log)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "assigned_client_accounts": user.assigned_client_accounts or []
    }


@router.post("/refresh", response_model=Token)
def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Refreshes short-lived access token using verified server-side session (SEC-01, TC-AUT-08)."""
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

    # Rotate refresh token
    new_raw_refresh = secrets.token_urlsafe(48)
    session_record.refresh_token_hash = hashlib.sha256(new_raw_refresh.encode("utf-8")).hexdigest()
    session_record.expires_at = now_utc + timedelta(days=7)

    response.set_cookie(
        key="crossquest_refresh_token",
        value=new_raw_refresh,
        httponly=True,
        secure=False if settings.ENVIRONMENT == "development" else True,
        samesite="strict",
        max_age=7 * 24 * 3600
    )

    new_access_token = create_access_token(subject=user.id, expires_delta=timedelta(minutes=60))
    db.commit()

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "assigned_client_accounts": user.assigned_client_accounts or []
    }


@router.post("/logout")
def logout_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Logs out user, revoking server-side refresh token and clearing cookie (SEC-01, TC-AUT-08)."""
    raw_refresh = request.cookies.get("crossquest_refresh_token") or request.headers.get("X-Refresh-Token")
    if raw_refresh:
        refresh_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
        session_record = db.query(UserSession).filter(UserSession.refresh_token_hash == refresh_hash).first()
        if session_record:
            session_record.is_revoked = True
            db.commit()

    response.delete_cookie(key="crossquest_refresh_token")
    return {"message": "Successfully logged out. Refresh session revoked."}


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
