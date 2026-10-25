from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CrossQuest"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretjwtkeyforcrossquestplatformchangeinproduction"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database: Use postgresql+psycopg2 for postgres, or sqlite for standalone development
    DATABASE_URL: str = "sqlite:///./crossquest_dev.db"

    # CP-ABE Configuration
    CPABE_MASTER_PUBLIC_KEY_PATH: Optional[str] = "keys/mpk.key"
    CPABE_MASTER_SECRET_KEY_PATH: Optional[str] = "keys/msk.key"

    # Anomaly Detection Thresholds (Chapter III Table 22, Section 3.7.3)
    ANOMALY_WORK_HOURS_START: int = 9   # 09:00 PHT
    ANOMALY_WORK_HOURS_END: int = 18    # 18:00 PHT
    ANOMALY_FAILED_ATTEMPT_THRESHOLD: int = 5 # 5 failed logins (R2-a)
    ANOMALY_WINDOW_MINUTES: int = 15
    ANOMALY_VOLUME_BURST_THRESHOLD: int = 25 # records requested in window (R3-a AcctMgr/Trainer)

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
