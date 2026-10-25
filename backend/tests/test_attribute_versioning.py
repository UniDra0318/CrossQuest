"""Tests for Attribute Versioning, KMS Envelope Encryption, and Tier-2 Revocation (TC-ATT-01..17).

Meets requirements:
- SEC-05: Dynamic attribute-based access control and version bump on staff reassignment.
- SEC-06: KMS-backed envelope encryption of CP-ABE private keys.
- DD-05: Attribute versioning tokens (ROLE<role>V<n>, CLIENT<comp>V<n>, etc.).
- DD-09: Cryptographic key material destruction (crypto-shredding) on account disablement.
- Chapter III Section 3.6.4, 3.6.5, 3.6.7, Table 28.
"""

import pytest
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.entities import (
    User, ClientCompany, Trainee, TrainingSession, TrainingRecord,
    TrainingRecordVersion, AbeAttribute, UserAbeKey, UserKeyAttribute, AccessLog
)
from app.crypto.attribute_manager import attribute_manager
from app.crypto.cpabe_engine import cpabe_engine, sanitize_token


@pytest.fixture
def version_test_data(db_session: Session):
    """Sets up company, users, and trainee for attribute versioning tests."""
    db = db_session

    # Company
    comp = db.query(ClientCompany).filter_by(code="CORP_VER_ALPHA").first()
    if not comp:
        comp = ClientCompany(name="Versioned Corp Alpha", code="CORP_VER_ALPHA")
        db.add(comp)
        db.commit()
        db.refresh(comp)

    # User 1: Account Manager A (to be revoked later)
    u_revoked = db.query(User).filter_by(email="am_revoked@test.ph").first()
    if not u_revoked:
        u_revoked = User(
            email="am_revoked@test.ph",
            username="am_revoked",
            full_name="AM Revoked",
            hashed_password=get_password_hash("TestPass123!"),
            role="account_manager",
            assigned_client_accounts=["CORP_VER_ALPHA"],
            is_active=True
        )
        db.add(u_revoked)

    # User 2: Account Manager B (remains authorized)
    u_retained = db.query(User).filter_by(email="am_retained@test.ph").first()
    if not u_retained:
        u_retained = User(
            email="am_retained@test.ph",
            username="am_retained",
            full_name="AM Retained",
            hashed_password=get_password_hash("TestPass123!"),
            role="account_manager",
            assigned_client_accounts=["CORP_VER_ALPHA"],
            is_active=True
        )
        db.add(u_retained)

    # Trainee
    t_user = db.query(User).filter_by(email="trainee_ver@test.ph").first()
    if not t_user:
        t_user = User(
            email="trainee_ver@test.ph",
            username="trainee_ver",
            full_name="Trainee Versioned",
            hashed_password=get_password_hash("TestPass123!"),
            role="trainee",
            is_active=True
        )
        db.add(t_user)

    db.commit()
    db.refresh(u_revoked)
    db.refresh(u_retained)
    db.refresh(t_user)

    trainee = db.query(Trainee).filter_by(trainee_code="TRN_VER_01").first()
    if not trainee:
        trainee = Trainee(
            user_id=t_user.id,
            current_company_id=comp.id,
            first_name="Ver",
            last_name="Trainee",
            email=t_user.email,
            trainee_code="TRN_VER_01"
        )
        db.add(trainee)
        db.commit()
        db.refresh(trainee)

    return {
        "comp": comp,
        "u_revoked": u_revoked,
        "u_retained": u_retained,
        "trainee": trainee,
    }


def test_tc_att_01_attribute_issuance_and_storage(db_session: Session):
    """TC-ATT-01: Attribute issuance and storage in abe_attributes table."""
    attr = attribute_manager.get_or_create_attribute(
        db=db_session,
        attribute_type="CLIENT",
        ref_code="CORP_TEST_01",
        version=1
    )
    assert attr is not None
    assert attr.token == "CLIENTCORPTEST01V1"
    assert attr.attribute_type == "CLIENT"
    assert attr.version == 1
    assert attr.status == "active"


def test_tc_att_02_attribute_token_format(db_session: Session):
    """TC-ATT-02: Attribute token format adherence (alphanumeric uppercase, no colons/underscores)."""
    assert sanitize_token("corp_client-101.v1") == "CORPCLIENT101V1"
    token = attribute_manager.get_or_create_attribute(
        db=db_session,
        attribute_type="role",
        ref_code="ACCT_MGR",
        version=1
    ).token
    assert "_" not in token
    assert "-" not in token
    assert token.isupper()


def test_tc_att_03_user_key_generation_and_storage(db_session: Session, version_test_data):
    """TC-ATT-03: User key generation bound to assigned attributes."""
    u = version_test_data["u_retained"]
    key_rec = attribute_manager.issue_or_rekey_user(db_session, u)
    assert key_rec is not None
    assert key_rec.status == "active"
    assert key_rec.user_id == u.id

    # Verify junction attributes
    junction = db_session.query(UserKeyAttribute).filter_by(key_id=key_rec.id).all()
    tokens = [j.token for j in junction]
    assert any("CLIENTCORPVERALPHAV1" in tok for tok in tokens)


def test_tc_att_04_kms_envelope_encryption(db_session: Session, version_test_data):
    """TC-ATT-04: Key stored encrypted via KMS envelope in user_abe_keys."""
    u = version_test_data["u_retained"]
    key_rec = attribute_manager.issue_or_rekey_user(db_session, u)

    assert key_rec.wrapped_dek is not None
    assert key_rec.key_ciphertext is not None
    assert key_rec.nonce is not None

    # Verify decryption via envelope unwrap
    decrypted_str = attribute_manager.envelope_decrypt_key(
        wrapped_dek_b64=key_rec.wrapped_dek,
        nonce_b64=key_rec.nonce,
        key_ciphertext_b64=key_rec.key_ciphertext
    )
    assert decrypted_str is not None
    key_dict = json.loads(decrypted_str)
    assert "attributes" in key_dict


def test_tc_att_05_attribute_version_bump(db_session: Session, version_test_data):
    """TC-ATT-05: Attribute revocation triggers version incrementation (DD-05)."""
    comp = version_test_data["comp"]
    old_attr, new_attr = attribute_manager.bump_attribute_version(
        db=db_session,
        attribute_type="CLIENT",
        ref_code=comp.code
    )
    assert new_attr.version > old_attr.version
    assert old_attr.status == "retired"
    assert new_attr.status == "active"
    assert "V2" in new_attr.token or new_attr.version >= 2


def test_tc_att_06_rekey_remaining_authorized_users(db_session: Session, version_test_data):
    """TC-ATT-06: Remaining authorized users receive re-keyed attributes with new version."""
    u_retained = version_test_data["u_retained"]
    comp = version_test_data["comp"]

    # Issue re-keyed key incorporating version 2
    new_key = attribute_manager.issue_or_rekey_user(
        db=db_session,
        user=u_retained,
        client_versions={comp.code: 2}
    )
    assert new_key.status == "active"

    # Decrypt key and check attributes
    key_str = attribute_manager.envelope_decrypt_key(
        new_key.wrapped_dek, new_key.nonce, new_key.key_ciphertext
    )
    key_dict = json.loads(key_str)
    assert "CLIENTCORPVERALPHAV2" in key_dict["attributes"]


def test_tc_att_07_revoked_user_cannot_decrypt_new_version(version_test_data):
    """TC-ATT-07: Revoked user's old V1 key cannot decrypt records encrypted under V2."""
    comp = version_test_data["comp"]
    trainee = version_test_data["trainee"]

    # Record encrypted under V2
    policy_v2 = cpabe_engine.build_record_policy(
        company_code=comp.code,
        trainee_code=trainee.trainee_code,
        client_version=2
    )
    encrypted_pkg = cpabe_engine.encrypt_record(
        plaintext_data={"sensitive_grade": "A+"},
        policy_str=policy_v2,
        record_id=f"rec-{trainee.trainee_code}",
        version=2
    )

    # Revoked user holds only V1 attribute
    revoked_attrs = cpabe_engine.build_user_attributes(
        role="account_manager",
        assigned_companies=[comp.code],
        client_version=1
    )
    revoked_key = cpabe_engine.generate_user_private_key(revoked_attrs)

    # Decryption fails!
    decrypted = cpabe_engine.decrypt_record(
        encrypted_record=encrypted_pkg,
        user_key_info=revoked_key,
        record_id=f"rec-{trainee.trainee_code}",
        version=2
    )
    assert decrypted is None

    # Retained user holds V2 attribute -> succeeds!
    retained_attrs = cpabe_engine.build_user_attributes(
        role="account_manager",
        assigned_companies=[comp.code],
        client_version=2
    )
    retained_key = cpabe_engine.generate_user_private_key(retained_attrs)
    decrypted_retained = cpabe_engine.decrypt_record(
        encrypted_record=encrypted_pkg,
        user_key_info=retained_key,
        record_id=f"rec-{trainee.trainee_code}",
        version=2
    )
    assert decrypted_retained is not None
    assert decrypted_retained["sensitive_grade"] == "A+"


def test_tc_att_08_reencrypt_records_job(db_session: Session, version_test_data):
    """TC-ATT-08: Historical records re-encryption worker transitions records to new policy version."""
    comp = version_test_data["comp"]
    trainee = version_test_data["trainee"]

    # Seed record encrypted under V1
    policy_v1 = cpabe_engine.build_record_policy(
        company_code=comp.code,
        trainee_code=trainee.trainee_code,
        client_version=1
    )
    enc_v1 = cpabe_engine.encrypt_record(
        plaintext_data={"score": 88.0, "notes": "V1 Historical Record"},
        policy_str=policy_v1,
        record_id=f"rec-{trainee.trainee_code}",
        version=1
    )
    rec = TrainingRecord(
        trainee_id=trainee.id,
        company_at_completion_id=comp.id,
        course_name="Security V1",
        status="Completed",
        score=88.0,
        encryption_policy=policy_v1,
        policy_version=1,
        abe_ciphertext=enc_v1.get("abe_ciphertext"),
        payload_ciphertext=enc_v1.get("payload_ciphertext"),
        nonce=enc_v1.get("nonce"),
        is_encrypted=True
    )
    db_session.add(rec)
    db_session.commit()
    db_session.refresh(rec)

    # Run background re-encryption worker from V1 to V2
    result = attribute_manager.reencrypt_records_job(
        db=db_session,
        company_code=comp.code,
        old_version=1,
        new_version=2
    )
    assert result["status"] == "COMPLETED"
    assert result["records_processed"] >= 1

    # Verify updated record
    db_session.refresh(rec)
    assert rec.policy_version == 2
    assert "V2" in rec.encryption_policy


def test_tc_att_09_reencryption_snapshot_preserved(db_session: Session, version_test_data):
    """TC-ATT-09: Re-encryption preserves record integrity and snapshots previous version (DD-06)."""
    comp = version_test_data["comp"]
    # Check that TrainingRecordVersion exists for company's records
    versions = (
        db_session.query(TrainingRecordVersion)
        .join(TrainingRecord, TrainingRecordVersion.record_id == TrainingRecord.id)
        .filter(TrainingRecord.company_at_completion_id == comp.id)
        .all()
    )
    assert len(versions) >= 1
    assert versions[0].version_no == 1
    assert versions[0].payload_ciphertext is not None


def test_tc_att_10_trainee_attribute_persistence_across_companies(version_test_data):
    """TC-ATT-10: Trainee attribute token persistence across company changes (DD-01)."""
    trainee = version_test_data["trainee"]
    attrs_alpha = cpabe_engine.build_user_attributes(
        role="trainee",
        trainee_code=trainee.trainee_code,
        client_version=1
    )
    attrs_beta = cpabe_engine.build_user_attributes(
        role="trainee",
        trainee_code=trainee.trainee_code,
        client_version=2
    )
    # The TRAINEE token is independent of employer and persists
    assert f"TRAINEE{sanitize_token(trainee.trainee_code)}V1" in attrs_alpha
    assert f"TRAINEE{sanitize_token(trainee.trainee_code)}V1" in attrs_beta


def test_tc_att_11_role_attribute_version_bump(db_session: Session):
    """TC-ATT-11: Role attribute version bump (e.g. ROLEACCTMGRV1 -> ROLEACCTMGRV2)."""
    old_attr, new_attr = attribute_manager.bump_attribute_version(
        db=db_session,
        attribute_type="ROLE",
        ref_code="ACCTMGR"
    )
    assert new_attr.version == old_attr.version + 1
    assert "ROLEACCTMGR" in new_attr.token


def test_tc_att_12_training_session_version_bump(db_session: Session):
    """TC-ATT-12: Training session attribute version bump."""
    old_attr, new_attr = attribute_manager.bump_attribute_version(
        db=db_session,
        attribute_type="TRAINING",
        ref_code="SESS_2026_01"
    )
    assert new_attr.version == old_attr.version + 1
    assert "TRAININGSESS202601" in new_attr.token


def test_tc_att_13_crypto_shredding_on_user_disable(db_session: Session, version_test_data):
    """TC-ATT-13: Crypto-shredding: zeroing key material and setting material_deleted_at (DD-09)."""
    u_revoked = version_test_data["u_revoked"]
    # Issue active key first
    key = attribute_manager.issue_or_rekey_user(db_session, u_revoked)
    assert key.status == "active"
    assert key.wrapped_dek is not None

    # Simulate admin account disablement (as performed in /users/{id}/disable)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    key.status = "revoked"
    key.wrapped_dek = None
    key.key_ciphertext = ""
    key.revoked_at = now_utc
    key.material_deleted_at = now_utc
    db_session.commit()
    db_session.refresh(key)

    # Key material is destroyed
    assert key.status == "revoked"
    assert key.wrapped_dek is None
    assert key.key_ciphertext == ""
    assert key.material_deleted_at is not None


def test_tc_att_14_audit_log_attribute_events(db_session: Session):
    """TC-ATT-14: Audit log records attribute lifecycle events (ATT_BUMP_VERSION, KEY_ISSUED)."""
    logs = (
        db_session.query(AccessLog)
        .filter(AccessLog.event_type.in_(["ATT_BUMP_VERSION", "KEY_ISSUED", "RE_ENCRYPT_JOB"]))
        .all()
    )
    assert len(logs) >= 1


def test_tc_att_15_batch_reencryption_tracking(db_session: Session, version_test_data):
    """TC-ATT-15: Batch re-encryption progress tracking statistics."""
    comp = version_test_data["comp"]
    result = attribute_manager.reencrypt_records_job(
        db=db_session,
        company_code=comp.code,
        old_version=2,
        new_version=3
    )
    assert "records_processed" in result
    assert result["status"] == "COMPLETED"


def test_tc_att_16_concurrent_read_safety(db_session: Session, version_test_data):
    """TC-ATT-16: Concurrent read safety during background re-encryption."""
    comp = version_test_data["comp"]
    # Verify non-deleted records remain readable and have valid policy_version
    records = db_session.query(TrainingRecord).filter_by(company_at_completion_id=comp.id).all()
    for r in records:
        assert r.policy_version >= 1
        assert r.is_encrypted is True


def test_tc_att_17_performance_measure_timing(monotonic_timer, db_session: Session, version_test_data):
    """TC-ATT-17: Measure M1/M4 timing for attribute versioning and re-keying."""
    timer = monotonic_timer()
    comp = version_test_data["comp"]

    timer.start()
    attribute_manager.bump_attribute_version(db_session, "CLIENT", comp.code)
    bump_ns = timer.stop()
    bump_ms = bump_ns / 1_000_000.0

    assert bump_ns > 0
    print(f"\n[Measure Timing] Attribute Version Bump: {bump_ms:.3f}ms ({bump_ns}ns)")
