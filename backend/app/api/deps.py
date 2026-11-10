from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.entities import User, UserSession, Trainee
from app.schemas.schemas import TokenData
from app.core.database import sign_context, request_context_var

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        if user_id is None or token_type != "access":
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is disabled. Contact system administrator.")

    # Role-based idle timeout and 12-hour max session check on every authenticated request (SEC-07, OI-17)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    all_user_sessions = db.query(UserSession).filter(UserSession.user_id == user.id).all()
    if all_user_sessions:
        active_sessions = [s for s in all_user_sessions if not s.is_revoked]
        if not active_sessions:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been logged out or revoked (SEC-01, SEC-07)."
            )
        for s in active_sessions:
            if s.max_expires_at and now_utc > s.max_expires_at:
                s.is_revoked = True
            elif s.idle_timeout_sec and s.last_active_at and (now_utc - s.last_active_at).total_seconds() > s.idle_timeout_sec:
                s.is_revoked = True
            else:
                s.last_active_at = now_utc
        db.commit()

        if not any(not s.is_revoked for s in active_sessions):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session timed out due to inactivity or expired (SEC-07, OI-17)."
            )

    # Determine trainee_id if user is a trainee (DD-01, Section 3.6.6)
    trainee_id = None
    if user.role == "trainee":
        from app.core.database import admin_engine
        try:
            with admin_engine.connect() as aconn:
                from sqlalchemy import text
                row = aconn.execute(
                    text("SELECT id FROM trainees WHERE user_id = :uid OR email = :email LIMIT 1"),
                    {"uid": str(user.id), "email": user.email}
                ).fetchone()
                if row:
                    trainee_id = row[0]
        except Exception:
            pass
        if not trainee_id:
            trainee_obj = db.query(Trainee).filter((Trainee.user_id == user.id) | (Trainee.email == user.email)).first()
            trainee_id = trainee_obj.id if trainee_obj else None

    # Generate and inject HMAC-signed context for PostgreSQL RLS (SEC-08, SEC-24, OI-14)
    signed_ctx = sign_context(user_id=user.id, role=user.role, trainee_id=trainee_id)
    request_context_var.set(signed_ctx)
    if db.bind and db.bind.dialect.name == "postgresql":
        from sqlalchemy import text
        db.execute(text("SELECT set_config('crossquest.current_user_id', :uid, false)"), {"uid": signed_ctx["user_id"]})
        db.execute(text("SELECT set_config('crossquest.current_role', :role, false)"), {"role": signed_ctx["role"]})
        db.execute(text("SELECT set_config('crossquest.current_trainee_id', :tid, false)"), {"tid": signed_ctx["trainee_id"]})
        db.execute(text("SELECT set_config('crossquest.context_expiry', :exp, false)"), {"exp": str(signed_ctx["expiry"])})
        db.execute(text("SELECT set_config('crossquest.context_signature', :sig, false)"), {"sig": signed_ctx["signature"]})

    return user


def get_mfa_enrollment_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Accepts either a normal access token or a one-purpose mfa_setup token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    if payload.get("type") == "mfa_setup":
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        return user
    return get_current_user(db=db, token=token)


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have administrative privileges"
        )
    return current_user
