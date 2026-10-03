from pydantic_settings import BaseSettings
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

    # Anomaly Detection Thresholds (Rule- & Threshold-based)
    ANOMALY_WORK_HOURS_START: int = 8   # 08:00
    ANOMALY_WORK_HOURS_END: int = 19    # 19:00
    ANOMALY_FAILED_ATTEMPT_THRESHOLD: int = 3 # 3 failed attempts in window
    ANOMALY_WINDOW_MINUTES: int = 15
    ANOMALY_VOLUME_BURST_THRESHOLD: int = 25 # records requested in window

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
