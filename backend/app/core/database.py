import time
import hmac
import hashlib
from typing import Optional, Dict, Any
from contextvars import ContextVar
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Thread-safe and async-safe request context for database RLS session settings
request_context_var: ContextVar[Optional[Dict[str, Any]]] = ContextVar("request_context_var", default=None)

def sign_context(
    user_id: str,
    role: str,
    trainee_id: Optional[str] = None,
    ttl_seconds: int = 60,
    secret_key: Optional[str] = None
) -> Dict[str, Any]:
    """Generates an HMAC-SHA256 signed request context with expiration (SEC-24, OI-14)."""
    secret = (secret_key or settings.CONTEXT_SIGNING_SECRET).encode("utf-8")
    expiry = int(time.time()) + ttl_seconds
    clean_tid = trainee_id or ""
    canonical_str = f"{user_id}|{role.upper()}|{clean_tid}|{expiry}"
    signature = hmac.new(secret, canonical_str.encode("utf-8"), hashlib.sha256).hexdigest()
    return {
        "user_id": str(user_id),
        "role": role.upper(),
        "trainee_id": clean_tid,
        "expiry": expiry,
        "signature": signature
    }

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Re-inject transaction-local session settings on every transaction begin (SEC-08, TC-RLS-07)
@event.listens_for(Session, "after_begin")
def receive_after_begin(session, transaction, connection):
    if connection.dialect.name == "postgresql":
        ctx = request_context_var.get()
        if ctx:
            connection.execute(
                text("SELECT set_config('crossquest.current_user_id', :uid, true)"),
                {"uid": ctx.get("user_id", "")}
            )
            connection.execute(
                text("SELECT set_config('crossquest.current_role', :role, true)"),
                {"role": ctx.get("role", "")}
            )
            connection.execute(
                text("SELECT set_config('crossquest.current_trainee_id', :tid, true)"),
                {"tid": ctx.get("trainee_id", "")}
            )
            connection.execute(
                text("SELECT set_config('crossquest.context_expiry', :exp, true)"),
                {"exp": str(ctx.get("expiry", ""))}
            )
            connection.execute(
                text("SELECT set_config('crossquest.context_signature', :sig, true)"),
                {"sig": ctx.get("signature", "")}
            )

import os

Base = declarative_base()

def init_db_rls(target_engine):
    """Applies PostgreSQL Row-Level Security policies and context functions (SEC-08, Table 19)."""
    if target_engine.dialect.name == "postgresql":
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        migration_path = os.path.join(base_dir, "migrations", "001_enable_rls.sql")
        if os.path.exists(migration_path):
            with open(migration_path, "r", encoding="utf-8") as f:
                sql_content = f.read()
            with target_engine.connect() as conn:
                raw_conn = conn.connection
                cursor = raw_conn.cursor()
                cursor.execute(sql_content)
                raw_conn.commit()
                cursor.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


