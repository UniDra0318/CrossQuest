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

# Enforce TLS for PostgreSQL database connections (SEC-18, Chapter III Section 3.7.2)
if "postgresql" in db_url:
    if "sslmode" not in db_url and "sslmode" not in connect_args:
        connect_args["sslmode"] = settings.DB_SSL_MODE
    if settings.DB_SSL_CERT_PATH and "sslrootcert" not in connect_args:
        connect_args["sslrootcert"] = settings.DB_SSL_CERT_PATH


engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

# Admin engine used for schema setup, migrations, and DDL operations
admin_db_url = settings.ADMIN_DATABASE_URL or db_url
if admin_db_url.startswith("postgresql://"):
    admin_db_url = admin_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

admin_connect_args = {}
if "postgresql" in admin_db_url:
    if "sslmode" not in admin_db_url and "sslmode" not in admin_connect_args:
        admin_connect_args["sslmode"] = settings.DB_SSL_MODE
    if settings.DB_SSL_CERT_PATH and "sslrootcert" not in admin_connect_args:
        admin_connect_args["sslrootcert"] = settings.DB_SSL_CERT_PATH

admin_engine = create_engine(
    admin_db_url,
    connect_args=admin_connect_args,
    pool_pre_ping=True
) if settings.ADMIN_DATABASE_URL else engine

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

def init_db_rls(target_engine=None):
    """Applies auto-migrations (RLS, columns) in order on PostgreSQL (SEC-08, Table 19)."""
    eng = target_engine or admin_engine
    if eng.dialect.name == "postgresql":
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        app_pw = os.getenv("POSTGRES_APP_PASSWORD", "app_secure_password")
        admin_pw = os.getenv("POSTGRES_PASSWORD", "crossquest_secret_password")
        # 004_rls_remaining_tables.sql is deliberately NOT listed: apply it by hand after testing.
        for name in ("001_enable_rls.sql", "002_add_user_job_title.sql", "003_add_record_import_batch.sql"):
            path = os.path.join(base_dir, "migrations", name)
            if not os.path.exists(path):
                continue
            with open(path, "r", encoding="utf-8") as f:
                sql_content = f.read()
            with eng.connect() as conn:
                raw_conn = conn.connection
                cursor = raw_conn.cursor()
                cursor.execute("SELECT set_config('crossquest.app_password', %s, false)", (app_pw,))
                cursor.execute("SELECT set_config('crossquest.admin_password', %s, false)", (admin_pw,))
                cursor.execute(sql_content)
                raw_conn.commit()
                cursor.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



def verify_database_tls_enforced(target_engine) -> Dict[str, Any]:
    """Verifies connection TLS status and sslmode for compliance auditing (SEC-18)."""
    dialect = target_engine.dialect.name
    if dialect != "postgresql":
        return {
            "dialect": dialect,
            "tls_enforced": False,
            "ssl_mode": "n/a (sqlite_dev)",
            "status": "DEVELOPMENT_SQLITE_NO_TLS"
        }
    
    with target_engine.connect() as conn:
        result = conn.execute(text("SHOW ssl;")).fetchone()
        ssl_status = result[0] if result else "unknown"
        return {
            "dialect": "postgresql",
            "tls_enforced": ssl_status.lower() in ("on", "true", "yes"),
            "ssl_mode": settings.DB_SSL_MODE,
            "ssl_status": ssl_status,
            "status": "COMPLIANT_TLS_ENFORCED" if ssl_status.lower() in ("on", "true", "yes") else "TLS_NOT_ACTIVE"
        }
