from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.entities import User, AccessLog
from app.schemas.schemas import Token, UserCreate, UserResponse
from app.anomaly.detector import anomaly_detector

router = APIRouter()

def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


@router.post("/login", response_model=Token)
def login_access_token(
    request: Request,
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Authenticates users across all 5 roles.
    Logs AUTH_SUCCESS / AUTH_FAILURE and monitors Rule R2 failed login bursts (Table 20).
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
        raise HTTPException(status_code=400, detail="Account is disabled. Contact system administrator.")

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

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "assigned_client_accounts": user.assigned_client_accounts or []
    }


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
