import time
import base64
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status
from app.crypto.cpabe_engine import cpabe_engine, sanitize_token

router = APIRouter()

DEMO_PERSONAS = [
    {
        "id": "persona_admin",
        "name": "Dr. Sarah Jenkins",
        "role": "Administrator",
        "organization": "Crossworks Training & Consulting",
        "attributes": ["ROLEADMIN"],
        "description": "Master Authority: Can decrypt all records across all enterprise tenants via universal authority clause.",
        "badge_color": "#7c3aed"
    },
    {
        "id": "persona_am_alpha",
        "name": "Marcus Reyes",
        "role": "Account Manager",
        "organization": "Assigned: San Miguel & BDO Unibank",
        "attributes": ["ROLEACCTMGR", "CLIENTCORPALPHAV1", "CLIENTBANKDELTAV1"],
        "description": "Enterprise Scoped: Permitted for San Miguel (CORP_ALPHA) and BDO (BANK_DELTA) records only.",
        "badge_color": "#2563eb"
    },
    {
        "id": "persona_am_beta",
        "name": "Andrea Salazar",
        "role": "Account Manager",
        "organization": "Assigned: Maya FinTech & Ayala Retail",
        "attributes": ["ROLEACCTMGR", "CLIENTFINTECHBETAV1", "CLIENTRETAILGAMMAV1"],
        "description": "Competitor Tenant: Permitted for Maya FinTech and Ayala Retail. Out-of-scope for San Miguel.",
        "badge_color": "#0284c7"
    },
    {
        "id": "persona_trainee_juan",
        "name": "Juan Dela Cruz",
        "role": "Trainee Analyst",
        "organization": "San Miguel Conglomerate Holdings",
        "attributes": ["TRAINEE", "TRAINEETRN9021"],
        "description": "Personal Identity Portability (DD-01): Decrypts his own lifetime learning achievements across employers.",
        "badge_color": "#059669"
    },
    {
        "id": "persona_trainer_david",
        "name": "David Lim",
        "role": "Lead Security Trainer",
        "organization": "Crossworks Instructor Faculty",
        "attributes": ["ROLETRAINER", "TRAININGSEC2026V1"],
        "description": "Course Scoped: Authorized for Information Security cohort sessions.",
        "badge_color": "#d97706"
    },
    {
        "id": "persona_adversary",
        "name": "Unauthorized Intruder / Attacker",
        "role": "Untrusted External Entity",
        "organization": "External Internet / Rogue DBA",
        "attributes": ["ANONYMOUS_ACTOR", "UNAUTHORIZED_GUEST"],
        "description": "Adversary Simulation: Zero valid enterprise attributes. Mathematical decryption provably impossible.",
        "badge_color": "#e11d48"
    }
]


class EncryptRequest(BaseModel):
    payload: Dict[str, Any] = Field(
        default={
            "trainee_name": "Juan Dela Cruz",
            "trainee_id": "TRN-9021",
            "course": "ISO 31000 Enterprise Risk Management",
            "score": 96.5,
            "evaluation": "Passed with High Distinction",
            "trainer_remarks": "Exemplary understanding of zero-trust architecture and cryptographic policy verification.",
            "certificate_ref": "CERT-ISO31000-2026-9021"
        }
    )
    policy: str = Field(default="ROLEADMIN or (ROLEACCTMGR and CLIENTCORPALPHAV1) or TRAINEETRN9021")
    record_id: str = Field(default="REC-PILOT-9021")
    version: int = Field(default=1)


class DecryptRequest(BaseModel):
    encrypted_record: Dict[str, Any]
    user_attributes: List[str]
    record_id: str = "REC-PILOT-9021"
    version: int = 1
    simulate_tamper: str = "NONE"  # "NONE" | "CIPHERTEXT_BIT_FLIP" | "AAD_METADATA_ALTER"


@router.get("/personas")
def get_demo_personas():
    """Returns official test personas for capstone defense panel demonstrations."""
    return DEMO_PERSONAS


@router.post("/encrypt")
def sandbox_encrypt(req: EncryptRequest):
    """Executes real-time hybrid CP-ABE + AES-256-GCM encryption with nanosecond timing."""
    start_ns = time.perf_counter_ns()
    
    clean_policy = req.policy.strip()
    if not clean_policy:
        raise HTTPException(status_code=400, detail="Policy string cannot be empty.")
        
    try:
        enc_result = cpabe_engine.encrypt_record(
            plaintext_data=req.payload,
            policy_str=clean_policy,
            record_id=req.record_id,
            version=req.version
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Encryption failed: {str(e)}")

    elapsed_ms = round((time.perf_counter_ns() - start_ns) / 1_000_000, 3)
    
    # Extract attributes referenced in policy
    policy_tokens = list(set(re.findall(r'[A-Za-z0-9]+', clean_policy)))
    policy_attrs = [t for t in policy_tokens if t.upper() not in ("OR", "AND")]

    return {
        **enc_result,
        "record_id": req.record_id,
        "aad": f"{req.record_id}:{req.version}:{clean_policy}",
        "attributes_in_policy": policy_attrs,
        "execution_time_ms": elapsed_ms,
        "payload_plaintext_preview": req.payload
    }


@router.post("/decrypt")
def sandbox_decrypt(req: DecryptRequest):
    """Executes real-time CP-ABE policy evaluation and AES-256-GCM authenticated decryption with optional tamper simulation."""
    start_ns = time.perf_counter_ns()

    enc_record = dict(req.encrypted_record)
    policy = enc_record.get("policy", "")
    sanitized_attrs = [sanitize_token(a) for a in req.user_attributes if a]
    user_attrs_set = set(sanitized_attrs)

    # Generate synthetic user private key from requested attributes
    user_key_info = cpabe_engine.generate_user_private_key(sanitized_attrs)

    # 1. Step 1: Mathematical Boolean Policy Tree Check
    policy_satisfied = cpabe_engine._is_policy_satisfied(policy, user_attrs_set)

    # Tamper simulation injections
    tampered = False
    tamper_message = ""
    target_record_id = req.record_id

    if req.simulate_tamper == "CIPHERTEXT_BIT_FLIP":
        tampered = True
        tamper_message = "Adversary flipped 1 byte in the stored AES-256-GCM ciphertext payload."
        try:
            raw_c = bytearray(base64.b64decode(enc_record["payload_ciphertext"]))
            if len(raw_c) > 5:
                raw_c[5] ^= 0xFF
            enc_record["payload_ciphertext"] = base64.b64encode(raw_c).decode("utf-8")
        except Exception:
            pass
    elif req.simulate_tamper == "AAD_METADATA_ALTER":
        tampered = True
        tamper_message = "Adversary altered the record ID metadata header (AAD) from authorized ID to fraudulent ID."
        target_record_id = "REC-FRAUDULENT-9999"

    # 2. Step 2: Attempt Decryption
    decrypted_content = None
    decryption_status = "DENIED_POLICY_UNSATISFIED"
    explanation = ""

    if not policy_satisfied:
        decryption_status = "DENIED_POLICY_UNSATISFIED"
        explanation = (
            f"ACCESS DENIED (Cryptographic Isolation): User attribute set {sanitized_attrs} "
            f"does NOT satisfy access policy '{policy}'. The user cannot mathematically reconstruct the "
            f"256-bit symmetric AES key from the pairing element."
        )
    else:
        # User attributes satisfy policy; attempt AES-256-GCM decryption
        try:
            decrypted_content = cpabe_engine.decrypt_record(
                encrypted_record=enc_record,
                user_key_info=user_key_info,
                record_id=target_record_id,
                version=req.version
            )
        except Exception:
            decrypted_content = None

        if decrypted_content is not None:
            decryption_status = "GRANTED"
            explanation = (
                f"ACCESS GRANTED: User attributes {sanitized_attrs} satisfy the policy '{policy}'. "
                f"Symmetric AES-256-GCM DEK successfully derived via HKDF-SHA256, and the GCM authentication "
                f"tag (MAC) was cryptographically verified. Plaintext recovered."
            )
        else:
            if tampered:
                decryption_status = "REJECTED_TAMPER_DETECTED"
                explanation = (
                    f"TAMPER DETECTED (Integrity Failure): {tamper_message} "
                    f"While the user possessed the authorized attributes, the AES-256-GCM authentication tag "
                    f"verification failed. The system detected unauthorized modification and aborted without leaking plaintext."
                )
            else:
                decryption_status = "DENIED_DECRYPTION_ERROR"
                explanation = "Decryption error occurred during pairing evaluation."

    elapsed_ms = round((time.perf_counter_ns() - start_ns) / 1_000_000, 3)

    return {
        "decryption_status": decryption_status,
        "policy_satisfied": policy_satisfied,
        "integrity_verified": (decryption_status == "GRANTED"),
        "decrypted_content": decrypted_content,
        "explanation": explanation,
        "user_attributes_tested": sanitized_attrs,
        "policy_tested": policy,
        "execution_time_ms": elapsed_ms,
        "tamper_simulation_applied": req.simulate_tamper
    }
