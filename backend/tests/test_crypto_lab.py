import pytest
from fastapi.testclient import TestClient

def test_crypto_lab_personas(client: TestClient):
    """Verifies retrieval of official defense demo personas."""
    resp = client.get("/api/v1/crypto-lab/personas")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 5
    admin_p = next((p for p in data if p["role"] == "Administrator"), None)
    assert admin_p is not None
    assert "ROLEADMIN" in admin_p["attributes"]

def test_crypto_lab_encrypt_and_decrypt_lifecycle(client: TestClient):
    """Verifies full encryption, authorized decryption, unauthorized isolation, and tamper rejection."""
    # 1. Encrypt record under multi-tenant enterprise policy
    enc_payload = {
        "policy": "ROLEADMIN or (ROLEACCTMGR and CLIENTCORPALPHAV1) or TRAINEETRN9021",
        "payload": {
            "trainee_name": "Juan Dela Cruz",
            "score": 98.0,
            "remarks": "Mastery of CP-ABE zero-trust architecture"
        },
        "record_id": "REC-TEST-CAPSTONE-01",
        "version": 1
    }
    enc_resp = client.post("/api/v1/crypto-lab/encrypt", json=enc_payload)
    assert enc_resp.status_code == 200
    enc_data = enc_resp.json()
    assert "abe_ciphertext" in enc_data
    assert "payload_ciphertext" in enc_data
    assert "nonce" in enc_data
    assert enc_data["execution_time_ms"] > 0

    # 2. Authorized Account Manager (San Miguel) -> GRANTED
    dec_auth = client.post("/api/v1/crypto-lab/decrypt", json={
        "encrypted_record": enc_data,
        "user_attributes": ["ROLEACCTMGR", "CLIENTCORPALPHAV1"],
        "record_id": "REC-TEST-CAPSTONE-01",
        "version": 1
    })
    assert dec_auth.status_code == 200
    auth_data = dec_auth.json()
    assert auth_data["decryption_status"] == "GRANTED"
    assert auth_data["policy_satisfied"] is True
    assert auth_data["integrity_verified"] is True
    assert auth_data["decrypted_content"]["score"] == 98.0

    # 3. Competitor Account Manager (Maya FinTech) -> DENIED_POLICY_UNSATISFIED
    dec_unauth = client.post("/api/v1/crypto-lab/decrypt", json={
        "encrypted_record": enc_data,
        "user_attributes": ["ROLEACCTMGR", "CLIENTFINTECHBETAV1"],
        "record_id": "REC-TEST-CAPSTONE-01",
        "version": 1
    })
    assert dec_unauth.status_code == 200
    unauth_data = dec_unauth.json()
    assert unauth_data["decryption_status"] == "DENIED_POLICY_UNSATISFIED"
    assert unauth_data["policy_satisfied"] is False
    assert unauth_data["decrypted_content"] is None

    # 4. Tampered Ciphertext Bit-Flip Attack -> REJECTED_TAMPER_DETECTED
    dec_tamper = client.post("/api/v1/crypto-lab/decrypt", json={
        "encrypted_record": enc_data,
        "user_attributes": ["ROLEADMIN"],
        "record_id": "REC-TEST-CAPSTONE-01",
        "version": 1,
        "simulate_tamper": "CIPHERTEXT_BIT_FLIP"
    })
    assert dec_tamper.status_code == 200
    tamper_data = dec_tamper.json()
    assert tamper_data["decryption_status"] == "REJECTED_TAMPER_DETECTED"
    assert tamper_data["decrypted_content"] is None
    assert tamper_data["integrity_verified"] is False

