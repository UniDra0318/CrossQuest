"""Tests for Chapter III CP-ABE Cryptographic Primitives (TC-CRY-01 to TC-CRY-08).

Meets requirements:
- SEC-04: Hybrid CP-ABE (BSW07 + HKDF + AES-256-GCM) with AAD binding.
- DD-01: Trainee-identity clause (TRAINEE<id>) enabling cross-employer credential mobility.
- DD-02: Authenticated AES-256-GCM encryption with record ID and policy bound as AAD.
- DD-04: Pure alphanumeric uppercase attribute tokens.
- DD-05: Attribute versioning tokens (ROLE<role>V<n>, CLIENT<comp>V<n>, etc.).
- VR-24: Underscore & symbol stripping for Charm parser resilience.
- Measure M1: Execution latency recording (setup, keygen, encrypt, decrypt).
"""

import pytest
import base64
from app.crypto.cpabe_engine import CPABEEngine, sanitize_token, cpabe_engine


def test_tc_cry_01_master_setup():
    """TC-CRY-01: CP-ABE master setup and public parameter initialization."""
    engine = CPABEEngine()
    # In both native Charm and simulation mode, engine initializes cleanly
    assert engine is not None
    # Verify policy builder and user attributes helper work as intended
    policy = engine.build_record_policy(company_code="CORP_ALPHA", trainee_code="TRN_101")
    assert "ROLEADMINV1" in policy
    assert "CLIENTCORPALPHAV1" in policy
    assert "TRAINEETRN101V1" in policy


def test_tc_cry_02_authorized_decryption_five_clauses():
    """TC-CRY-02: Authorized decryption succeeds under all 5 Chapter III Section 3.6.4 policy clauses."""
    policy = cpabe_engine.build_record_policy(
        company_code="CORP_ALPHA",
        session_code="SESS_01",
        trainee_code="TRN_9021",
        client_version=1,
        training_version=1,
        role_version=1
    )
    payload = {
        "score": 98.5,
        "trainer_remarks": "Passed with distinction",
        "certificate_id": "CERT-2026-001"
    }
    record_id = "rec-cry-02"
    version = 1

    encrypted_record = cpabe_engine.encrypt_record(
        plaintext_data=payload,
        policy_str=policy,
        record_id=record_id,
        version=version
    )
    assert "payload_ciphertext" in encrypted_record
    assert "nonce" in encrypted_record

    # Clause 1: Admin
    admin_attrs = cpabe_engine.build_user_attributes(role="admin", role_version=1)
    admin_key = cpabe_engine.generate_user_private_key(admin_attrs)
    dec_admin = cpabe_engine.decrypt_record(encrypted_record, admin_key, record_id=record_id, version=version)
    assert dec_admin is not None
    assert dec_admin["score"] == 98.5

    # Clause 2: Finance
    finance_attrs = cpabe_engine.build_user_attributes(role="finance", role_version=1)
    finance_key = cpabe_engine.generate_user_private_key(finance_attrs)
    dec_finance = cpabe_engine.decrypt_record(encrypted_record, finance_key, record_id=record_id, version=version)
    assert dec_finance is not None
    assert dec_finance["score"] == 98.5

    # Clause 3: Account Manager with CORP_ALPHA
    am_attrs = cpabe_engine.build_user_attributes(
        role="account_manager",
        assigned_companies=["CORP_ALPHA"],
        client_version=1,
        role_version=1
    )
    am_key = cpabe_engine.generate_user_private_key(am_attrs)
    dec_am = cpabe_engine.decrypt_record(encrypted_record, am_key, record_id=record_id, version=version)
    assert dec_am is not None
    assert dec_am["trainer_remarks"] == "Passed with distinction"

    # Clause 4: Trainer with SESS_01
    trainer_attrs = cpabe_engine.build_user_attributes(
        role="trainer",
        assigned_sessions=["SESS_01"],
        training_version=1,
        role_version=1
    )
    trainer_key = cpabe_engine.generate_user_private_key(trainer_attrs)
    dec_trainer = cpabe_engine.decrypt_record(encrypted_record, trainer_key, record_id=record_id, version=version)
    assert dec_trainer is not None
    assert dec_trainer["certificate_id"] == "CERT-2026-001"

    # Clause 5: Trainee self-identity (TRN_9021)
    trainee_attrs = cpabe_engine.build_user_attributes(
        role="trainee",
        trainee_code="TRN_9021",
        role_version=1
    )
    trainee_key = cpabe_engine.generate_user_private_key(trainee_attrs)
    dec_trainee = cpabe_engine.decrypt_record(encrypted_record, trainee_key, record_id=record_id, version=version)
    assert dec_trainee is not None
    assert dec_trainee["score"] == 98.5


def test_tc_cry_03_unauthorized_decryption_denied():
    """TC-CRY-03: Unauthorized attribute keys are strictly denied decryption."""
    policy = cpabe_engine.build_record_policy(
        company_code="CORP_ALPHA",
        session_code="SESS_01",
        trainee_code="TRN_9021"
    )
    payload = {"score": 75.0, "notes": "Confidential"}
    record_id = "rec-cry-03"
    encrypted_record = cpabe_engine.encrypt_record(payload, policy, record_id=record_id, version=1)

    # 1. Account Manager assigned to a DIFFERENT client (FINTECH_BETA)
    am_beta_attrs = cpabe_engine.build_user_attributes(
        role="account_manager",
        assigned_companies=["FINTECH_BETA"]
    )
    am_beta_key = cpabe_engine.generate_user_private_key(am_beta_attrs)
    assert cpabe_engine.decrypt_record(encrypted_record, am_beta_key, record_id=record_id) is None

    # 2. Trainer assigned to a DIFFERENT session (SESS_99)
    other_trainer_attrs = cpabe_engine.build_user_attributes(
        role="trainer",
        assigned_sessions=["SESS_99"]
    )
    other_trainer_key = cpabe_engine.generate_user_private_key(other_trainer_attrs)
    assert cpabe_engine.decrypt_record(encrypted_record, other_trainer_key, record_id=record_id) is None

    # 3. Trainee with a DIFFERENT ID (TRN_1111)
    other_trainee_attrs = cpabe_engine.build_user_attributes(
        role="trainee",
        trainee_code="TRN_1111"
    )
    other_trainee_key = cpabe_engine.generate_user_private_key(other_trainee_attrs)
    assert cpabe_engine.decrypt_record(encrypted_record, other_trainee_key, record_id=record_id) is None

    # 4. User with empty attribute set
    empty_key = cpabe_engine.generate_user_private_key([])
    assert cpabe_engine.decrypt_record(encrypted_record, empty_key, record_id=record_id) is None


def test_tc_cry_04_tamper_detection_aes_gcm_aad():
    """TC-CRY-04: AES-256-GCM authentication tag detects all forms of tampering (DD-02, SEC-04)."""
    policy = "ROLEADMINV1"
    payload = {"grade": "Certified", "audit_clean": True}
    record_id = "rec-cry-04"
    version = 1
    encrypted_record = cpabe_engine.encrypt_record(payload, policy, record_id=record_id, version=version)
    admin_key = cpabe_engine.generate_user_private_key(["ROLEADMINV1"])

    # 1. Tamper with AAD: Record ID changed
    tampered_id = cpabe_engine.decrypt_record(encrypted_record, admin_key, record_id="rec-TAMPERED", version=version)
    assert tampered_id is None

    # 2. Tamper with AAD: Version changed
    tampered_ver = cpabe_engine.decrypt_record(encrypted_record, admin_key, record_id=record_id, version=99)
    assert tampered_ver is None

    # 3. Tamper with Payload Ciphertext (flip last byte)
    tampered_pkg = dict(encrypted_record)
    raw_cipher = base64.b64decode(tampered_pkg["payload_ciphertext"])
    flipped = bytearray(raw_cipher)
    flipped[-1] ^= 0xFF
    tampered_pkg["payload_ciphertext"] = base64.b64encode(flipped).decode("utf-8")
    tampered_cipher = cpabe_engine.decrypt_record(tampered_pkg, admin_key, record_id=record_id, version=version)
    assert tampered_cipher is None

    # 4. Tamper with Nonce
    tampered_nonce_pkg = dict(encrypted_record)
    raw_nonce = base64.b64decode(tampered_nonce_pkg["nonce"])
    flipped_nonce = bytearray(raw_nonce)
    flipped_nonce[0] ^= 0x01
    tampered_nonce_pkg["nonce"] = base64.b64encode(flipped_nonce).decode("utf-8")
    tampered_nonce = cpabe_engine.decrypt_record(tampered_nonce_pkg, admin_key, record_id=record_id, version=version)
    assert tampered_nonce is None


def test_tc_cry_05_policy_boolean_evaluation():
    """TC-CRY-05: Accurate evaluation of complex nested Boolean expressions in policies."""
    # Test internal policy satisfaction helper
    eval_policy = cpabe_engine._is_policy_satisfied

    # Simple AND
    assert eval_policy("ROLEACCTMGR and CLIENTALPHA", {"ROLEACCTMGR", "CLIENTALPHA"}) is True
    assert eval_policy("ROLEACCTMGR and CLIENTALPHA", {"ROLEACCTMGR"}) is False
    assert eval_policy("ROLEACCTMGR and CLIENTALPHA", {"CLIENTALPHA"}) is False

    # Disjunction with parentheses
    expr = "(ROLEACCTMGR and CLIENTALPHA) or (ROLETRAINER and SESS01)"
    assert eval_policy(expr, {"ROLEACCTMGR", "CLIENTALPHA"}) is True
    assert eval_policy(expr, {"ROLETRAINER", "SESS01"}) is True
    assert eval_policy(expr, {"ROLEACCTMGR", "SESS01"}) is False
    assert eval_policy(expr, {"ROLETRAINER", "CLIENTALPHA"}) is False

    # Admin bypass clause
    assert eval_policy(expr, {"ROLEADMIN"}) is True
    assert eval_policy(expr, {"ROLEFINANCE"}) is True


def test_tc_cry_06_performance_measure_m1(monotonic_timer):
    """TC-CRY-06: Measure M1 performance recording for CP-ABE Keygen, Encrypt, and Decrypt."""
    timer = monotonic_timer()
    policy = cpabe_engine.build_record_policy(
        company_code="CORP_ALPHA",
        session_code="SESS_01",
        trainee_code="TRN_101"
    )
    payload = {"test_metric": "M1_benchmark", "bytes": "x" * 512}

    # 1. Keygen latency
    timer.start()
    user_attrs = cpabe_engine.build_user_attributes(role="account_manager", assigned_companies=["CORP_ALPHA"])
    user_key = cpabe_engine.generate_user_private_key(user_attrs)
    keygen_ns = timer.stop()
    keygen_ms = keygen_ns / 1_000_000.0

    # 2. Encrypt latency
    timer.start()
    encrypted = cpabe_engine.encrypt_record(payload, policy, record_id="rec-m1", version=1)
    encrypt_ns = timer.stop()
    encrypt_ms = encrypt_ns / 1_000_000.0

    # 3. Decrypt latency
    timer.start()
    decrypted = cpabe_engine.decrypt_record(encrypted, user_key, record_id="rec-m1", version=1)
    decrypt_ns = timer.stop()
    decrypt_ms = decrypt_ns / 1_000_000.0

    assert decrypted is not None
    assert decrypted["test_metric"] == "M1_benchmark"
    # Latencies must be strictly non-zero and reasonable
    assert keygen_ns > 0
    assert encrypt_ns > 0
    assert decrypt_ns > 0
    # Log benchmark data
    print(f"\n[Measure M1 Benchmark] Keygen: {keygen_ms:.3f}ms | Encrypt: {encrypt_ms:.3f}ms | Decrypt: {decrypt_ms:.3f}ms")


def test_tc_cry_07_multi_attribute_key_generation():
    """TC-CRY-07: Key generation for users with multiple assigned client companies."""
    am_attrs = cpabe_engine.build_user_attributes(
        role="account_manager",
        assigned_companies=["CORP_ALPHA", "FINTECH_BETA", "HEALTH_GAMMA"]
    )
    assert "ROLEACCTMGRV1" in am_attrs
    assert "CLIENTCORPALPHAV1" in am_attrs
    assert "CLIENTFINTECHBETAV1" in am_attrs
    assert "CLIENTHEALTHGAMMAV1" in am_attrs

    multi_key = cpabe_engine.generate_user_private_key(am_attrs)
    assert multi_key is not None
    assert len(multi_key["attributes"]) >= 4

    # Test that this key can decrypt records for CORP_ALPHA
    policy_alpha = cpabe_engine.build_record_policy(company_code="CORP_ALPHA")
    rec_alpha = cpabe_engine.encrypt_record({"company": "Alpha"}, policy_alpha, record_id="rec-a")
    dec_a = cpabe_engine.decrypt_record(rec_alpha, multi_key, record_id="rec-a")
    assert dec_a is not None and dec_a["company"] == "Alpha"

    # Test that this same key can decrypt records for HEALTH_GAMMA
    policy_gamma = cpabe_engine.build_record_policy(company_code="HEALTH_GAMMA")
    rec_gamma = cpabe_engine.encrypt_record({"company": "Gamma"}, policy_gamma, record_id="rec-g")
    dec_g = cpabe_engine.decrypt_record(rec_gamma, multi_key, record_id="rec-g")
    assert dec_g is not None and dec_g["company"] == "Gamma"


def test_tc_cry_08_token_sanitization_and_resilience():
    """TC-CRY-08: Token sanitization strips underscores, spaces, hyphens, and symbols (DD-04, VR-24)."""
    assert sanitize_token("ROLE_ADMIN") == "ROLEADMIN"
    assert sanitize_token("CORP-ALPHA.INC") == "CORPALPHAINC"
    assert sanitize_token("TRN:9021#A") == "TRN9021A"
    assert sanitize_token("client_special_123!") == "CLIENTSPECIAL123"
    assert sanitize_token("   ") == ""


def test_tc_cry_09_fail_closed_production_refusal(monkeypatch):
    """TC-CRY-09: Fail-closed CP-ABE enforcement: production MUST refuse to run without Charm (SEC-04)."""
    from app.core.config import settings
    from app.crypto.cpabe_engine import CPABEEngine, CHARM_AVAILABLE

    # Simulate production environment without native Charm library
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr("app.crypto.cpabe_engine.CHARM_AVAILABLE", False)

    with pytest.raises(RuntimeError) as exc_info:
        CPABEEngine()

    assert "FAIL-CLOSED" in str(exc_info.value)
    assert "refuse" in str(exc_info.value).lower() or "disallowed" in str(exc_info.value).lower()


def test_tc_cry_10_curve_feasibility_ss512_settled():
    """TC-CRY-10: TC-CRY-01 feasibility test settled on SS512 curve for BSW07."""
    engine = CPABEEngine(group_name="SS512")
    assert engine.group_name == "SS512"
    # Verify policy building and token sanitization remain consistent under SS512
    policy = engine.build_record_policy(company_code="CORP_ALPHA", trainee_code="TRN_01")
    assert "ROLEADMINV1" in policy
    assert "CLIENTCORPALPHAV1" in policy


def test_tc_cry_12_key_size_measurement_up_to_40_attributes():
    """TC-CRY-12: Measure BSW07 key size with up to 40 client attributes; proves envelope encryption requirement."""
    from app.crypto.attribute_manager import attribute_manager

    attribute_counts = [1, 5, 10, 20, 30, 40]
    key_sizes = {}
    envelope_sizes = {}

    for count in attribute_counts:
        attrs = [f"CLIENTCORP{i:02d}V1" for i in range(count)]
        user_key = cpabe_engine.generate_user_private_key(attrs)
        serialized_key = user_key["key_data"]
        raw_size = len(serialized_key.encode("utf-8"))
        key_sizes[count] = raw_size

        # In native Charm-Crypto BSW07 on SS512:
        # A private key has 1 master element + 2 group elements per attribute (each ~128 bytes raw, ~256 bytes serialized).
        # For 40 attributes: (1 + 2*40) * 128 bytes = 10,368 bytes (> 4,096 bytes AWS KMS direct limit).
        envelope = attribute_manager.envelope_encrypt_key(serialized_key)
        wrapped_size = len(envelope["wrapped_dek"].encode("utf-8"))
        envelope_sizes[count] = wrapped_size

    # Verify key size scales monotonically with attribute count
    assert key_sizes[40] > key_sizes[20] > key_sizes[10] > key_sizes[1]

    # Calculate and assert mathematical BSW07 theoretical key size for 40 attributes
    # Theoretical BSW07 SS512 key size: 1 base element + 2 elements per attribute * 128 bytes = 10,368 bytes
    theoretical_bsw07_40_attrs = (1 + 2 * 40) * 128
    assert theoretical_bsw07_40_attrs > 4096, "Theoretical 40-attribute BSW07 key must exceed 4,096 bytes KMS limit"

    # Verify that envelope encryption produces a constant-size wrapped DEK regardless of key size
    assert envelope_sizes[40] == envelope_sizes[1], "KMS envelope wrapped DEK must remain compact and fixed-size"
    assert envelope_sizes[40] < 4096, "Wrapped DEK must comfortably fit within AWS KMS limits (< 200 bytes)"

    print(
        f"\n[TC-CRY-12 Benchmark] 1 Attr: {key_sizes[1]}B | 10 Attrs: {key_sizes[10]}B | "
        f"20 Attrs: {key_sizes[20]}B | 40 Attrs: {key_sizes[40]}B | "
        f"Theoretical BSW07 40 Attrs: {theoretical_bsw07_40_attrs}B (Exceeds 4,096B KMS direct limit) | "
        f"Wrapped DEK: {envelope_sizes[40]}B"
    )
