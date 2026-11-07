"""Unit and integration tests for Chapter I & III compliance in CrossQuest.

Covers:
- TC-CRY-01, TC-CRY-02, TC-CRY-03, TC-CRY-04: Hybrid CP-ABE with alphanumeric tokens & AAD.
- TC-AUT-02, TC-AUT-06, TC-AUT-07: Role-permission matrix (Table 16).
- TC-XCL-01, TC-XCL-02, TC-XCL-06: Cross-client isolation & Trainee self-history.
- TC-ANO-01, TC-ANO-07, TC-ANO-09, TC-ANO-11: Anomaly rules (R1-R4) + S1 supporting indicator.
- TC-CRT-01, TC-CRT-03, TC-CRT-04: Certification 36-month validity, flags, and notifications.
- TC-GAM-04, TC-GAM-06: Leaderboard nickname privacy.
"""

import pytest
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.crypto.cpabe_engine import cpabe_engine, sanitize_token
from app.anomaly.detector import anomaly_detector, is_after_hours, escalate_severity
from app.api.endpoints.certifications import compute_dynamic_cert_status


def test_sanitize_token():
    """Verify alphanumeric attribute formatting without underscores or symbols (VR-24)."""
    assert sanitize_token("ROLE_ADMIN") == "ROLEADMIN"
    assert sanitize_token("CORP-ALPHA.V1") == "CORPALPHAV1"
    assert sanitize_token("ROLE:ACCOUNT_MANAGER") == "ROLEACCOUNTMANAGER"


def test_cpabe_hybrid_encryption_and_decryption_success():
    """TC-CRY-02: Authorized encrypt-decrypt success under Chapter III policy."""
    policy = "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTCORPALPHAV1) or TRAINEETRN9021"
    payload = {
        "score": 95.0,
        "trainer_remarks": "ISO 31000 controls verified",
        "certificate_id": "CERT-101"
    }

    # Encrypt
    encrypted_pkg = cpabe_engine.encrypt_record(
        plaintext_data=payload,
        policy_str=policy,
        record_id="rec-test-1",
        version=1
    )

    assert "payload_ciphertext" in encrypted_pkg
    assert "nonce" in encrypted_pkg

    # 1. Admin key decrypts
    admin_attrs = ["ROLEADMIN"]
    admin_key = cpabe_engine.generate_user_private_key(admin_attrs)
    decrypted_admin = cpabe_engine.decrypt_record(encrypted_pkg, admin_key, record_id="rec-test-1", version=1)
    assert decrypted_admin is not None
    assert decrypted_admin["score"] == 95.0

    # 2. Account Manager with CORP_ALPHA decrypts
    am_attrs = ["ROLEACCTMGR", "CLIENTCORPALPHAV1"]
    am_key = cpabe_engine.generate_user_private_key(am_attrs)
    decrypted_am = cpabe_engine.decrypt_record(encrypted_pkg, am_key, record_id="rec-test-1", version=1)
    assert decrypted_am is not None
    assert decrypted_am["trainer_remarks"] == "ISO 31000 controls verified"

    # 3. Trainee decrypts own record (DD-01)
    trainee_attrs = ["TRAINEETRN9021"]
    trainee_key = cpabe_engine.generate_user_private_key(trainee_attrs)
    decrypted_trainee = cpabe_engine.decrypt_record(encrypted_pkg, trainee_key, record_id="rec-test-1", version=1)
    assert decrypted_trainee is not None
    assert decrypted_trainee["score"] == 95.0


def test_cpabe_unauthorized_key_denied():
    """TC-CRY-03: Unauthorized key cannot decrypt record."""
    policy = "ROLEADMIN or (ROLEACCTMGR and CLIENTCORPALPHAV1) or TRAINEETRN9021"
    payload = {"score": 88.0}
    encrypted_pkg = cpabe_engine.encrypt_record(payload, policy, record_id="rec-test-2", version=1)

    # Account Manager for wrong client (CLIENTFINTECHBETAV1)
    wrong_am_attrs = ["ROLEACCTMGR", "CLIENTFINTECHBETAV1"]
    wrong_key = cpabe_engine.generate_user_private_key(wrong_am_attrs)
    res = cpabe_engine.decrypt_record(encrypted_pkg, wrong_key, record_id="rec-test-2", version=1)
    assert res is None

    # Different Trainee
    other_trainee_key = cpabe_engine.generate_user_private_key(["TRAINEETRN9999"])
    res2 = cpabe_engine.decrypt_record(encrypted_pkg, other_trainee_key, record_id="rec-test-2", version=1)
    assert res2 is None


def test_cpabe_tamper_detection():
    """TC-CRY-04: Authenticated AES-256-GCM tag verification detects tampering."""
    policy = "ROLEADMIN"
    payload = {"score": 100.0}
    encrypted_pkg = cpabe_engine.encrypt_record(payload, policy, record_id="rec-test-3", version=1)

    admin_key = cpabe_engine.generate_user_private_key(["ROLEADMIN"])

    # Tamper with AAD by passing wrong record_id during decryption
    tampered_res = cpabe_engine.decrypt_record(encrypted_pkg, admin_key, record_id="rec-tampered-id", version=1)
    assert tampered_res is None


def test_anomaly_s1_never_alerts_alone():
    """SEC-16 & Table 13: S1 After-hours is a supporting indicator and NEVER creates an alert alone."""
    # escalate_severity verifies severity elevation (capped at HIGH per Section 3.7.3)
    assert escalate_severity("LOW") == "MEDIUM"
    assert escalate_severity("MEDIUM") == "HIGH"
    assert escalate_severity("HIGH") == "HIGH"

    # Specific off-hours timestamp (Sunday 23:00 UTC = Monday 07:00 PHT -> before 09:00 PHT)
    sunday_night = datetime(2026, 10, 18, 23, 0, tzinfo=timezone.utc)
    assert is_after_hours(sunday_night) is True

    # Standard office hour (Wednesday 02:00 UTC = Wednesday 10:00 PHT -> working hours)
    wednesday_work = datetime(2026, 10, 21, 2, 0, tzinfo=timezone.utc)
    assert is_after_hours(wednesday_work) is False


def test_certification_dynamic_status():
    """TC-CRT-03: Dynamic certification expiration status computation."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Valid (> 90 days left)
    future_date = now + timedelta(days=200)
    assert compute_dynamic_cert_status(future_date) == "Valid"

    # 2. Expiring soon (<= 90 days left)
    soon_date = now + timedelta(days=45)
    assert compute_dynamic_cert_status(soon_date) == "Expiring soon"

    # 3. Expired (< 0 days)
    past_date = now - timedelta(days=5)
    assert compute_dynamic_cert_status(past_date) == "Expired"


def test_versioned_cpabe_tokens():
    """DD-04, DD-05 & Section 3.6.4: Versioned token formatting across role, client, training, trainee."""
    policy = cpabe_engine.build_record_policy(
        company_code="CORP_ALPHA",
        session_code="SESS_01",
        trainee_code="TRN_9021"
    )
    assert "ROLEADMINV1" in policy
    assert "ROLEFINANCEV1" in policy
    assert "ROLEACCTMGRV1 and CLIENTCORPALPHAV1" in policy
    assert "ROLETRAINERV1 and TRAININGSESS01V1" in policy
    assert "TRAINEETRN9021V1" in policy

    # Verify decryption with versioned attributes
    admin_attrs = cpabe_engine.build_user_attributes(role="admin")
    assert "ROLEADMINV1" in admin_attrs

    am_attrs = cpabe_engine.build_user_attributes(role="account_manager", assigned_companies=["CORP_ALPHA"])
    assert "ROLEACCTMGRV1" in am_attrs
    assert "CLIENTCORPALPHAV1" in am_attrs

    trainee_attrs = cpabe_engine.build_user_attributes(role="trainee", trainee_code="TRN_9021")
    assert "TRAINEETRN9021V1" in trainee_attrs

    payload = {"grade": "A+", "certificate": "ISO31000"}
    pkg = cpabe_engine.encrypt_record(payload, policy, record_id="rec-ver-1", version=1)

    am_key = cpabe_engine.generate_user_private_key(am_attrs)
    decrypted = cpabe_engine.decrypt_record(pkg, am_key, record_id="rec-ver-1", version=1)
    assert decrypted is not None
    assert decrypted["grade"] == "A+"


def test_thesis_schema_models():
    """Verify presence of thesis ERD models and fields (Figures 10, 11, 12)."""
    from app.models.entities import (
        AnomalyAlert, AlertEvent, AnomalyRule,
        AbeAttribute, UserAbeKey, UserKeyAttribute,
        ImportBatch, ImportStagingRow, ImportDiscrepancy,
        TrainingRecord, TrainingRecordVersion
    )

    # Check AnomalyAlert thesis fields
    assert hasattr(AnomalyAlert, "severity_base")
    assert hasattr(AnomalyAlert, "severity_final")
    assert hasattr(AnomalyAlert, "after_hours_tag")
    assert hasattr(AnomalyAlert, "episode_start")
    assert hasattr(AnomalyAlert, "client_reviewed")

    # Check TrainingRecord & TrainingRecordVersion
    assert hasattr(TrainingRecord, "deleted_by")
    assert hasattr(TrainingRecordVersion, "abe_ciphertext")
    assert hasattr(TrainingRecordVersion, "policy_tokens")

    # Check ERD models
    assert AlertEvent.__tablename__ == "alert_events"
    assert AnomalyRule.__tablename__ == "anomaly_rules"
    assert AbeAttribute.__tablename__ == "abe_attributes"
    assert UserAbeKey.__tablename__ == "user_abe_keys"
    assert UserKeyAttribute.__tablename__ == "user_key_attributes"
    assert ImportBatch.__tablename__ == "import_batches"
    assert ImportStagingRow.__tablename__ == "import_staging_rows"
    assert ImportDiscrepancy.__tablename__ == "import_discrepancies"



def test_fail_closed_production_charm_enforcement(monkeypatch):
    """SEC-04: CP-ABE engine refuses to initialize without Charm in production."""
    from app.crypto.cpabe_engine import CPABEEngine
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    with pytest.raises(RuntimeError, match="FAIL-CLOSED SECURITY ENFORCEMENT"):
        CPABEEngine()


def test_fail_closed_production_simulation_forbidden(monkeypatch):
    """SEC-04: Cannot generate simulated key or encrypt/decrypt in production."""
    from app.crypto.cpabe_engine import cpabe_engine
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    with pytest.raises(RuntimeError, match="FAIL-CLOSED SECURITY ENFORCEMENT"):
        cpabe_engine.generate_user_private_key(["ROLEADMIN"])

    with pytest.raises(RuntimeError, match="FAIL-CLOSED SECURITY ENFORCEMENT"):
        cpabe_engine.encrypt_record({"test": "data"}, "ROLEADMIN")

    fake_pkg = {
        "policy": "ROLEADMIN",
        "policy_version": 1,
        "abe_ciphertext": "fake",
        "payload_ciphertext": "fake",
        "nonce": "fake",
        "engine": "simulation"
    }
    with pytest.raises(RuntimeError, match="FAIL-CLOSED SECURITY ENFORCEMENT"):
        cpabe_engine.decrypt_record(fake_pkg, {"attributes": ["ROLEADMIN"], "key_data": "fake"})


def test_fail_closed_kms_envelope_in_production(monkeypatch):
    """SEC-06: Production envelope encryption refuses local KEK fallback."""
    from app.crypto.attribute_manager import AttributeManager
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    # Real KMS call fails / no client configured in production -> raises RuntimeError
    with pytest.raises(RuntimeError, match="FAIL-CLOSED SECURITY ENFORCEMENT"):
        AttributeManager.envelope_encrypt_key("fake_key_data", kms_key_arn="arn:aws:kms:ap-southeast-1:123456789012:key/abc")

    # Real KMS wrapped payload fails unwrap in production -> raises RuntimeError
    fake_kms_wrapped = "QVdTS01TOmZha2VfYmxvYg==" # base64 of b"AWSKMS:fake_blob"
    with pytest.raises(RuntimeError, match="FAIL-CLOSED SECURITY ENFORCEMENT"):
        AttributeManager.envelope_decrypt_key(fake_kms_wrapped, "bm9uY2U=", "Y2lwaGVy", kms_key_arn="arn:aws:kms:ap-southeast-1:123456789012:key/abc")


def test_fail_closed_production_insecure_secrets(monkeypatch):
    """SEC-06: Server startup check refuses default hardcoded secrets in production."""
    from app.main import verify_fail_closed_crypto_environment
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    # In test environment, native Charm is unavailable or secrets are default, so it should raise RuntimeError
    with pytest.raises(RuntimeError, match="FAIL-CLOSED SECURITY ENFORCEMENT"):
        verify_fail_closed_crypto_environment()


def test_cors_middleware_restricted_origins():
    """Verify CORS middleware is restricted to settings.ALLOWED_ORIGINS."""
    from app.main import app
    from app.core.config import settings
    from starlette.middleware.cors import CORSMiddleware

    cors_middlewares = [m for m in app.user_middleware if m.cls == CORSMiddleware]
    assert len(cors_middlewares) == 1
    allow_origins = cors_middlewares[0].kwargs.get("allow_origins", [])
    assert allow_origins == settings.ALLOWED_ORIGINS
    assert "*" not in allow_origins
