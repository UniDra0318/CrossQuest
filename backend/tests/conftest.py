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
            "ALTER TABLE users ADD COLUMN job_title VARCHAR(200)",
            "ALTER TABLE training_records ADD COLUMN deleted_at DATETIME",
            "ALTER TABLE training_records ADD COLUMN deleted_by VARCHAR(36)",
            "ALTER TABLE anomaly_alerts ADD COLUMN severity_base VARCHAR(20) DEFAULT 'MEDIUM'",
            "ALTER TABLE anomaly_alerts ADD COLUMN severity_final VARCHAR(20) DEFAULT 'MEDIUM'",
            "ALTER TABLE anomaly_alerts ADD COLUMN after_hours_tag BOOLEAN DEFAULT 0",
            "ALTER TABLE anomaly_alerts ADD COLUMN episode_start DATETIME",
            "ALTER TABLE anomaly_alerts ADD COLUMN client_reviewed BOOLEAN DEFAULT 0",
            "ALTER TABLE training_record_versions ADD COLUMN abe_ciphertext TEXT",
            "ALTER TABLE training_record_versions ADD COLUMN payload_ciphertext TEXT",
            "ALTER TABLE training_record_versions ADD COLUMN policy_tokens VARCHAR(500)",
            "ALTER TABLE training_record_versions ADD COLUMN edited_by_user_id VARCHAR(36)",
            "ALTER TABLE training_record_versions ADD COLUMN edited_at DATETIME",
            "ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT 0",
            "ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(64)",
            "ALTER TABLE users ADD COLUMN mfa_recovery_codes JSON",
            "ALTER TABLE user_sessions ADD COLUMN last_active_at DATETIME",
            "ALTER TABLE user_sessions ADD COLUMN idle_timeout_sec INTEGER DEFAULT 900",
            "ALTER TABLE user_sessions ADD COLUMN max_expires_at DATETIME",
            "ALTER TABLE training_sessions ADD COLUMN trainer_signed_off BOOLEAN DEFAULT 0",
            "ALTER TABLE training_sessions ADD COLUMN trainer_sign_off_at DATETIME",
            "ALTER TABLE training_sessions ADD COLUMN trainer_sign_off_user_id VARCHAR(36)",
            "ALTER TABLE training_sessions ADD COLUMN trainer_sign_off_notes TEXT",
            "ALTER TABLE training_records ADD COLUMN attendance_status VARCHAR(50) DEFAULT 'Present'",
            "ALTER TABLE training_record_versions ADD COLUMN reason TEXT",
            "ALTER TABLE certificates ADD COLUMN serial_number VARCHAR(50)",
            "ALTER TABLE certificates ADD COLUMN reissue_count INTEGER DEFAULT 0",
            "ALTER TABLE certificates ADD COLUMN reissue_reason TEXT",
            "ALTER TABLE certificates ADD COLUMN reissued_by_user_id VARCHAR(36)",
            "ALTER TABLE certificates ADD COLUMN is_self_reported BOOLEAN DEFAULT 0",
            "ALTER TABLE certificates ADD COLUMN credential_url VARCHAR(500)",
            "ALTER TABLE import_batches ADD COLUMN storage_path VARCHAR(500)",
            "ALTER TABLE import_batches ADD COLUMN in_scope_count INTEGER DEFAULT 0",
            "ALTER TABLE import_batches ADD COLUMN pre_cutoff_count INTEGER DEFAULT 0",
            "ALTER TABLE import_batches ADD COLUMN quarantined_count INTEGER DEFAULT 0",
            "ALTER TABLE import_batches ADD COLUMN distinct_customers_count INTEGER DEFAULT 0",
            "ALTER TABLE import_batches ADD COLUMN reconciled BOOLEAN DEFAULT 0",
            "ALTER TABLE import_discrepancies ADD COLUMN resolution_reason TEXT",
            "ALTER TABLE import_discrepancies ADD COLUMN resolved_by_user_id VARCHAR(36)",
            "ALTER TABLE import_discrepancies ADD COLUMN resolved_at DATETIME",
            "ALTER TABLE trainees ADD COLUMN leaderboard_opt_out BOOLEAN DEFAULT 0",
            "ALTER TABLE trainees ADD COLUMN current_streak INTEGER DEFAULT 0",
            "ALTER TABLE trainees ADD COLUMN last_activity_date DATE",
            "ALTER TABLE quizzes ADD COLUMN is_closed BOOLEAN DEFAULT 0",
            "ALTER TABLE quizzes ADD COLUMN closed_at DATETIME",
            "ALTER TABLE quiz_attempts ADD COLUMN is_scored BOOLEAN DEFAULT 1",
            "ALTER TABLE gamification_progress ADD COLUMN streak INTEGER DEFAULT 0",
            "ALTER TABLE gamification_progress ADD COLUMN last_activity_date DATE",
            "ALTER TABLE client_companies ADD COLUMN client_type VARCHAR(20) DEFAULT 'COMPANY'",
            "ALTER TABLE training_sessions ADD COLUMN venue VARCHAR(200)",
            "ALTER TABLE training_sessions ADD COLUMN delivery_mode VARCHAR(50) DEFAULT 'F2F'",
            "ALTER TABLE quizzes ADD COLUMN is_approved BOOLEAN DEFAULT 0",
            "ALTER TABLE quizzes ADD COLUMN approved_by_user_id VARCHAR(36)",
            "ALTER TABLE quizzes ADD COLUMN approved_at DATETIME",
            "ALTER TABLE courses ADD COLUMN acronym_3 VARCHAR(10)"
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
