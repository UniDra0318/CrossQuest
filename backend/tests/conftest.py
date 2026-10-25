"""Test configuration and shared fixtures for CrossQuest test suite.

Includes:
- High-precision monotonic timer fixture (perf_counter_ns) for Chapter III measures (M1, M4, M8).
- Database session setup and teardown.
- FastAPI TestClient and role-specific authenticated clients.
"""

import time
import pytest
from typing import Generator, Dict, Any
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash, create_access_token
from app.models.entities import (
    User, ClientCompany, Trainee, TrainingSession, TrainingRecord,
    AccountManagerAssignment, TrainerAssignment, UserSession
)


@pytest.fixture(scope="session")
def monotonic_timer():
    """High-precision monotonic timer fixture using time.perf_counter_ns().
    
    Used to record execution latencies for:
    - Measure M1: CP-ABE setup, keygen, encrypt, decrypt.
    - Measure M4: Anomaly detection latency.
    - Measure M8: RLS query latency and overhead.
    """
    class MonotonicTimer:
        def __init__(self):
            self.start_ns = 0
            self.end_ns = 0

        def start(self):
            self.start_ns = time.perf_counter_ns()
            return self

        def stop(self) -> int:
            self.end_ns = time.perf_counter_ns()
            return self.elapsed_ns

        @property
        def elapsed_ns(self) -> int:
            return self.end_ns - self.start_ns

        @property
        def elapsed_ms(self) -> float:
            return (self.end_ns - self.start_ns) / 1_000_000.0

        @property
        def elapsed_us(self) -> float:
            return (self.end_ns - self.start_ns) / 1_000.0

    return MonotonicTimer


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure all database tables and schema migrations are applied."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT 0",
            "ALTER TABLE training_records ADD COLUMN deleted_at DATETIME",
            "ALTER TABLE training_records ADD COLUMN deleted_by VARCHAR(36)",
            "ALTER TABLE anomaly_alerts ADD COLUMN severity_base VARCHAR(20) DEFAULT 'MEDIUM'",
            "ALTER TABLE anomaly_alerts ADD COLUMN severity_final VARCHAR(20) DEFAULT 'MEDIUM'",
            "ALTER TABLE anomaly_alerts ADD COLUMN after_hours_tag BOOLEAN DEFAULT 0",
            "ALTER TABLE anomaly_alerts ADD COLUMN episode_start DATETIME",
            "ALTER TABLE anomaly_alerts ADD COLUMN client_reviewed BOOLEAN DEFAULT 0"
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass


@pytest.fixture
def db_session() -> Generator:
    """Provides a transactional database session for a test."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def client() -> Generator:
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


def create_token_for_user(user: User) -> str:
    """Generates an access token for a given user."""
    return create_access_token(subject=user.id)
