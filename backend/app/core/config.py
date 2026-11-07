from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "CrossQuest"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretjwtkeyforcrossquestplatformchangeinproduction"
    ALGORITHM: str = "HS256"

    # Token Lifetimes (OI-17)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10       # 10-minute access token
    REFRESH_TOKEN_EXPIRE_HOURS: int = 8         # 8-hour refresh token
    MAX_SESSION_LIFETIME_HOURS: int = 12        # 12-hour maximum session lifetime

    # Role-based Idle Timeouts in Seconds (SEC-07)
    IDLE_TIMEOUT_ADMIN_FINANCE: int = 900       # 15 minutes
    IDLE_TIMEOUT_STAFF_TRAINER: int = 1800      # 30 minutes
    IDLE_TIMEOUT_TRAINEE: int = 3600            # 60 minutes

    # Email Delivery (crossquest@xworks.ph)
    EMAILS_FROM_EMAIL: str = "crossquest@xworks.ph"
    SMTP_HOST: Optional[str] = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = ""
    SMTP_PASSWORD: Optional[str] = ""
    USE_SES: bool = False

    # MFA Configuration (SEC-01, OI-26)
    MFA_ISSUER_NAME: str = "CrossQuest (Crossworks)"

    # CSRF Protection (SEC-28)
    CSRF_HEADER_NAME: str = "X-CrossQuest-CSRF"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://crossquest.xworks.ph"
    ]

    # Database: Use postgresql+psycopg2 for postgres, or sqlite for standalone development
    DATABASE_URL: str = "sqlite:///./crossquest_dev.db"

    # CP-ABE Configuration
    CPABE_MASTER_PUBLIC_KEY_PATH: Optional[str] = "keys/mpk.key"
    CPABE_MASTER_SECRET_KEY_PATH: Optional[str] = "keys/msk.key"

    # Anomaly Detection Thresholds (Chapter III Table 13, Section 3.7.3 & Phase 4)
    ANOMALY_WORK_HOURS_START: int = 9   # 09:00 PHT
    ANOMALY_WORK_HOURS_END: int = 18    # 18:00 PHT
    ANOMALY_FAILED_ATTEMPT_THRESHOLD: int = 5 # 5 failed logins (R2-a)
    ANOMALY_R2_B_IP_THRESHOLD: int = 10       # 10 failed logins for single IP (R2-b)
    ANOMALY_R2_B_DISTINCT_USERS_THRESHOLD: int = 2 # at least 2 distinct targeted usernames (R2-b)
    ANOMALY_WINDOW_MINUTES: int = 15
    ANOMALY_VOLUME_BURST_THRESHOLD: int = 25 # records requested in window (R3-a AcctMgr/Trainer)

    # Audit Retention & Compliance (OI-20)
    AUDIT_RETENTION_DAYS: int = 365           # 12-month retention
    AUDIT_WARNING_DAYS: int = 30              # Proactive warning window for open alerts

    # pgAudit and Amazon RDS Logging (OI-20)
    PGAUDIT_ENABLED: bool = True
    RDS_LOGGING_ENABLED: bool = True
    PGAUDIT_LOG_STATEMENTS: str = "read, write, ddl, role"
    PGAUDIT_LOG_CATALOG: bool = False
    PGAUDIT_LOG_RELATION: bool = True

    # Environment & Context Signing (SEC-24, OI-14)
    ENVIRONMENT: str = "development"
    CONTEXT_SIGNING_SECRET: str = "crossquest_internal_context_signing_secret_key_change_in_prod"

    # Gamification & PWA Security (SEC-26, Phase 6)
    ENABLE_OFFLINE_QUIZZES: bool = False

    # AWS KMS Configuration (DD-09, SEC-06)
    AWS_REGION: str = "ap-southeast-1"
    AWS_KMS_KEY_ID: Optional[str] = None
    AWS_KMS_KEY_ARN: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # Database TLS Configuration (SEC-18)
    DB_SSL_MODE: str = "prefer" # disable, allow, prefer, require, verify-ca, verify-full
    DB_SSL_CERT_PATH: Optional[str] = None


    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
