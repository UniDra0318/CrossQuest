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
    active_sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == user.id, UserSession.is_revoked == False)
        .all()
    )
    if active_sessions:
        for s in active_sessions:
            if s.max_expires_at and now_utc > s.max_expires_at:
                s.is_revoked = True
            elif s.idle_timeout_sec and s.last_active_at:
                if (now_utc - s.last_active_at).total_seconds() > s.idle_timeout_sec:
                    s.is_revoked = True
            else:
                s.last_active_at = now_utc
        db.commit()

        has_active = any(not s.is_revoked for s in active_sessions)
        if not has_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session timed out due to inactivity or expired (SEC-07, OI-17)."
            )

    # Determine trainee_id if user is a trainee (DD-01, Section 3.6.6)
    trainee_obj = db.query(Trainee).filter(Trainee.user_id == user.id).first()
    trainee_id = trainee_obj.id if trainee_obj else None

    # Generate and inject HMAC-signed context for PostgreSQL RLS (SEC-08, SEC-24, OI-14)
    signed_ctx = sign_context(user_id=user.id, role=user.role, trainee_id=trainee_id)
    request_context_var.set(signed_ctx)

    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have administrative privileges"
        )
    return current_user
