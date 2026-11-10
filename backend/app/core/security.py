import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

# Configure Argon2id as primary scheme (SEC-01, Table 23), with pbkdf2 and bcrypt for migration
pwd_context = CryptContext(
    schemes=["argon2", "pbkdf2_sha256", "bcrypt"],
    deprecated=["pbkdf2_sha256", "bcrypt"]
)


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_mfa_challenge_token(user_id: str) -> str:
    """Creates a short-lived (5-minute) signed challenge token for second-factor TOTP verification."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    to_encode = {"exp": expire, "sub": str(user_id), "type": "mfa_challenge"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decodes and validates a JWT token."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def hmac_username(username: str) -> str:
    """Keyed-HMAC of username for audit logging to avoid storing sensitive mistyped credentials in plaintext.
    
    Adheres to: Phase 1 & Chapter III Section 3.7 access log anonymization.
    """
    normalized = username.strip().lower()
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), normalized.encode("utf-8"), hashlib.sha256).hexdigest()


COMMON_WEAK_PASSWORDS = {
    "password", "password123", "12345678", "123456789", "qwerty123",
    "admin123", "letmein123", "welcome123", "crossquest", "crossworks"
}

def validate_password_strength(password: str) -> None:
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long (SEC-01).")
    if password.strip().lower() in COMMON_WEAK_PASSWORDS:
        raise ValueError("Password is too common or leaked. Choose a stronger password (SEC-01).")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
