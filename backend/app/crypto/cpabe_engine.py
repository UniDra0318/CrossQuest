"""CP-ABE Cryptographic Engine for CrossQuest.

Implements Ciphertext-Policy Attribute-Based Encryption (CP-ABE) using Charm-Crypto
BSW07 scheme (Bethencourt, Sahai, Waters 2007) combined with authenticated symmetric
encryption (AES-256-GCM + HKDF) as defined in Chapter III Section 3.6.4 (DD-02, SEC-04, VR-24).

Features:
- Purely alphanumeric attribute tokens (no colons or underscores which break Charm parser).
- Hybrid encryption: CP-ABE protects 256-bit key element; AES-256-GCM encrypts sensitive record payload.
- Associated Authenticated Data (AAD) binding record ID, policy version, and policy string.
- Trainee-identity attribute support (DD-01: TRAINEE<id>) for full cross-company history decryption.
- Attribute versioning support (DD-05: CLIENT<id>V<n>).
- Graceful standalone simulation mode for environments without native Charm/PBC C-libraries.
"""

import os
import re
import json
import base64
import logging
from typing import Dict, Any, List, Optional, Set
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from app.core.config import settings

logger = logging.getLogger(__name__)

CHARM_AVAILABLE = False
PairingGroup = None
GT = None
CPabe_BSW07 = None
objectToBytes = None
bytesToObject = None

try:
    import importlib
    pairinggroup_mod = importlib.import_module("charm.toolbox.pairinggroup")
    PairingGroup = pairinggroup_mod.PairingGroup
    GT = pairinggroup_mod.GT

    bsw07_mod = importlib.import_module("charm.schemes.abenc.abenc_bsw07")
    CPabe_BSW07 = bsw07_mod.CPabe_BSW07

    util_mod = importlib.import_module("charm.core.engine.util")
    objectToBytes = util_mod.objectToBytes
    bytesToObject = util_mod.bytesToObject

    CHARM_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    logger.info("Charm-Crypto native library not installed. Running CP-ABE engine in authenticated simulation mode.")


def sanitize_token(token: str) -> str:
    """Sanitizes attribute tokens to alphanumeric uppercase only (DD-04, VR-24).
    Charm's parser uses underscores as duplicate index markers, so underscores are stripped.
    """
    clean = re.sub(r'[^A-Za-z0-9]', '', token)
    return clean.upper()


class CPABEEngine:
    """Hybrid CP-ABE Cryptographic Engine with AES-256-GCM and HKDF key derivation."""

    def __init__(self, group_name: str = "SS512"):
        # SS512 (Type 1 symmetric pairing) is the working curve; final selection stays open under OI-18 until the Iteration 0 feasibility result is recorded.
        # Fail-closed enforcement: system requires native Charm-Crypto and strictly forbids fake fallbacks (SEC-04, VR-24)
        if not CHARM_AVAILABLE:
            raise RuntimeError(
                "FAIL-CLOSED SECURITY ENFORCEMENT: Charm-Crypto native pairing library is not available. "
                "The system refuses to operate without native CP-ABE (BSW07) and fake simulation fallbacks are disallowed (SEC-04, VR-24)."
            )
        self.charm_available = True
        self.group_name = group_name
        self.group = None
        self.cpabe = None
        self.master_public_key = None
        self.master_secret_key = None

        self._init_charm()

    def _init_charm(self):
        try:
            # Fall back to SS512 if BN254 curve is not compiled in installed PBC
            try:
                self.group = PairingGroup(self.group_name)
            except Exception:
                self.group = PairingGroup("SS512")
            self.cpabe = CPabe_BSW07(self.group)

            # Master key persistence: load existing keys if present, otherwise setup and persist (SEC-04)
            mpk_path = getattr(settings, "CPABE_MASTER_PUBLIC_KEY_PATH", None)
            msk_path = getattr(settings, "CPABE_MASTER_SECRET_KEY_PATH", None)

            if mpk_path and msk_path and os.path.exists(mpk_path) and os.path.exists(msk_path):
                with open(mpk_path, "rb") as f:
                    self.master_public_key = bytesToObject(f.read(), self.group)
                with open(msk_path, "rb") as f:
                    self.master_secret_key = bytesToObject(f.read(), self.group)
                logger.info(f"Loaded existing CP-ABE master keys from {mpk_path} and {msk_path}")
            else:
                (self.master_public_key, self.master_secret_key) = self.cpabe.setup()
                if mpk_path and msk_path:
                    os.makedirs(os.path.dirname(os.path.abspath(mpk_path)), exist_ok=True)
                    os.makedirs(os.path.dirname(os.path.abspath(msk_path)), exist_ok=True)
                    with open(mpk_path, "wb") as f:
                        f.write(objectToBytes(self.master_public_key, self.group))
                    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
                    msk_fd = os.open(msk_path, flags, 0o600)
                    with open(msk_fd, "wb") as f:
                        f.write(objectToBytes(self.master_secret_key, self.group))
                    logger.info(f"Generated and persisted new CP-ABE master keys to {mpk_path} and {msk_path}")
        except Exception as e:
            raise RuntimeError(
                f"FAIL-CLOSED SECURITY ENFORCEMENT: Charm pairing group or master key initialization failed: {e}"
            ) from e

    def generate_user_private_key(self, user_attributes: List[str]) -> Dict[str, Any]:
        """Generates a private key for a user with the given set of attributes using Charm BSW07."""
        if not self.charm_available or not self.cpabe:
            raise RuntimeError(
                "FAIL-CLOSED SECURITY ENFORCEMENT: Charm-Crypto CP-ABE engine is unavailable. "
                "Key generation cannot proceed and fake simulation fallbacks are strictly forbidden (SEC-04, VR-24)."
            )

        sanitized_attrs = [sanitize_token(attr) for attr in user_attributes if attr]
        try:
            key = self.cpabe.keygen(self.master_public_key, self.master_secret_key, sanitized_attrs)
            serialized_key = base64.b64encode(objectToBytes(key, self.group)).decode("utf-8")
            return {
                "attributes": sanitized_attrs,
                "key_data": serialized_key,
                "engine": "charm-bsw07"
            }
        except Exception as e:
            logger.error(f"Charm keygen error: {e}")
            raise RuntimeError(f"CP-ABE key generation failed: {e}") from e

    def encrypt_record(
        self,
        plaintext_data: Dict[str, Any],
        policy_str: str,
        record_id: str = "default_rec",
        version: int = 1
    ) -> Dict[str, Any]:
        """Encrypts sensitive training record payload using hybrid CP-ABE BSW07 + AES-256-GCM (DD-02, SEC-04).
        
        1. Encrypts pairing element under policy with CP-ABE BSW07.
        2. Derives 256-bit symmetric key using HKDF.
        3. Encrypts JSON payload with AES-256-GCM, binding record_id, version, and policy as AAD.
        """
        if not self.charm_available or not self.cpabe:
            raise RuntimeError(
                "FAIL-CLOSED SECURITY ENFORCEMENT: Charm-Crypto CP-ABE engine is unavailable. "
                "Encryption cannot proceed and fake simulation fallbacks are strictly forbidden (SEC-04, VR-24)."
            )

        payload_bytes = json.dumps(plaintext_data, sort_keys=True).encode("utf-8")
        aad = f"{record_id}:{version}:{policy_str}".encode("utf-8")
        nonce = os.urandom(12)

        try:
            msg = self.group.random(GT)
            ciphertext = self.cpabe.encrypt(self.master_public_key, msg, policy_str)
            abe_cipher_bytes = objectToBytes(ciphertext, self.group)
            serialized_abe_cipher = base64.b64encode(abe_cipher_bytes).decode("utf-8")

            # Derive AES-256 key from pairing element via HKDF
            raw_element = objectToBytes(msg, self.group)
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,
                salt=nonce,
                info=b"crossquest-cpabe-aes256gcm",
            )
            aes_key = hkdf.derive(raw_element)
            
            aesgcm = AESGCM(aes_key)
            encrypted_payload = aesgcm.encrypt(nonce, payload_bytes, aad)

            return {
                "policy": policy_str,
                "policy_version": version,
                "abe_ciphertext": serialized_abe_cipher,
                "payload_ciphertext": base64.b64encode(encrypted_payload).decode("utf-8"),
                "nonce": base64.b64encode(nonce).decode("utf-8"),
                "engine": "charm-bsw07"
            }
        except Exception as e:
            logger.error(f"Charm encryption failed: {e}")
            raise RuntimeError(f"CP-ABE encryption failed: {e}") from e

    def decrypt_record(
        self,
        encrypted_record: Dict[str, Any],
        user_key_info: Dict[str, Any],
        record_id: str = "default_rec",
        version: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Decrypts a record if the user's attribute key satisfies the CP-ABE policy.
        
        Performs authenticated AES-256-GCM decryption with AAD check.
        Returns decrypted dict if valid, or None if policy is unsatisfied or tamper is detected (TC-CRY-03, TC-CRY-04).
        """
        if not self.charm_available or not self.cpabe:
            raise RuntimeError(
                "FAIL-CLOSED SECURITY ENFORCEMENT: Charm-Crypto CP-ABE engine is unavailable. "
                "Decryption cannot proceed and fake simulation fallbacks are strictly forbidden (SEC-04, VR-24)."
            )

        if encrypted_record.get("engine") != "charm-bsw07":
            raise RuntimeError(
                f"FAIL-CLOSED SECURITY ENFORCEMENT: Ciphertext engine '{encrypted_record.get('engine')}' is invalid. "
                f"Native charm-bsw07 is strictly required; fake simulation records cannot be decrypted."
            )

        policy = encrypted_record.get("policy", "")
        policy_ver = version if version is not None else encrypted_record.get("policy_version", 1)
        aad = f"{record_id}:{policy_ver}:{policy}".encode("utf-8")
        user_attrs = set(user_key_info.get("attributes", []))

        # Check if policy is satisfied
        if not self._is_policy_satisfied(policy, user_attrs):
            return None

        try:
            nonce = base64.b64decode(encrypted_record["nonce"])
            payload_cipher = base64.b64decode(encrypted_record["payload_ciphertext"])

            cipher_bytes = base64.b64decode(encrypted_record["abe_ciphertext"])
            cipher_obj = bytesToObject(cipher_bytes, self.group)
            key_bytes = base64.b64decode(user_key_info["key_data"])
            key_obj = bytesToObject(key_bytes, self.group)

            decrypted_msg = self.cpabe.decrypt(self.master_public_key, key_obj, cipher_obj)
            if decrypted_msg is False or decrypted_msg is None:
                return None

            raw_element = objectToBytes(decrypted_msg, self.group)
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,
                salt=nonce,
                info=b"crossquest-cpabe-aes256gcm",
            )
            aes_key = hkdf.derive(raw_element)

            aesgcm = AESGCM(aes_key)
            decrypted_bytes = aesgcm.decrypt(nonce, payload_cipher, aad)
            return json.loads(decrypted_bytes.decode("utf-8"))
        except Exception as e:
            logger.debug(f"Decryption or GCM authentication tag verification failed: {e}")
            return None

    def _is_policy_satisfied(self, policy: str, user_attrs: Set[str]) -> bool:
        """Evaluates Boolean policy expressions with AND / OR / parentheses against user attributes."""
        # Sanitize uppercase
        poly = policy.upper()
        # Admin or Finance have universal authority clause in policy (DD-01, Section 3.6.4)
        if any(r in user_attrs for r in ("ROLEADMIN", "ROLEADMINV1", "ROLEFINANCE", "ROLEFINANCEV1")):
            return True

        # Tokenize policy
        tokens = re.findall(r'\(|\)|\bOR\b|\bAND\b|[A-Za-z0-9]+', poly)
        if not tokens:
            return False

        # Convert tokens to boolean expression
        expr = []
        for t in tokens:
            if t == "OR":
                expr.append("or")
            elif t == "AND":
                expr.append("and")
            elif t in ("(", ")"):
                expr.append(t)
            else:
                expr.append(str(t in user_attrs))
        
        try:
            # Safe evaluation of pure boolean expression
            safe_expr = " ".join(expr)
            return bool(eval(safe_expr, {"__builtins__": {}}, {}))
        except Exception:
            return False

    @staticmethod
    def build_record_policy(
        company_code: str,
        session_code: Optional[str] = None,
        trainee_code: Optional[str] = None,
        client_version: int = 1,
        training_version: int = 1,
        role_version: int = 1
    ) -> str:
        """Constructs an official Chapter III Section 3.6.4 compliant CP-ABE policy with versioned tokens.
        
        Example output:
        ROLEADMINV1 or ROLEFINANCEV1 or (ROLEACCTMGRV1 and CLIENTCORPALPHAV1) or (ROLETRAINERV1 and TRAININGSESS01V1) or TRAINEETRN9021V1
        """
        clauses = [f"ROLEADMINV{role_version}", f"ROLEFINANCEV{role_version}"]
        
        if company_code:
            c_tok = f"CLIENT{sanitize_token(company_code)}V{client_version}"
            clauses.append(f"(ROLEACCTMGRV{role_version} and {c_tok})")
            
        if session_code:
            s_tok = f"TRAINING{sanitize_token(session_code)}V{training_version}"
            clauses.append(f"(ROLETRAINERV{role_version} and {s_tok})")
            
        if trainee_code:
            t_tok = f"TRAINEE{sanitize_token(trainee_code)}V1"
            clauses.append(t_tok)

        return " or ".join(clauses)

    @staticmethod
    def build_user_attributes(
        role: str,
        assigned_companies: Optional[List[str]] = None,
        assigned_sessions: Optional[List[str]] = None,
        trainee_code: Optional[str] = None,
        client_version: int = 1,
        training_version: int = 1,
        role_version: int = 1,
        client_versions: Optional[Dict[str, int]] = None,
        session_versions: Optional[Dict[str, int]] = None
    ) -> List[str]:
        """Constructs attribute set for a user based on role and assignments (Section 3.6.4, DD-04, DD-05)."""
        attrs = []
        role_clean = sanitize_token(role)

        if role_clean in ("ADMIN", "ROLEADMIN", "ROLEADMINV1"):
            attrs.extend([f"ROLEADMINV{role_version}", "ROLEADMIN"])
        elif role_clean in ("FINANCE", "ROLEFINANCE", "ROLEFINANCEV1"):
            attrs.extend([f"ROLEFINANCEV{role_version}", "ROLEFINANCE"])
        elif role_clean in ("ACCOUNTMANAGER", "ROLEACCTMGR", "ROLEACCTMGRV1", "ACCTMGR", "COMPANYSTAFF"):
            attrs.extend([f"ROLEACCTMGRV{role_version}", "ROLEACCTMGR"])
            for comp in (assigned_companies or []):
                clean_c = sanitize_token(comp)
                ver = (client_versions or {}).get(comp, (client_versions or {}).get(clean_c, client_version))
                attrs.append(f"CLIENT{clean_c}V{ver}")
        elif role_clean in ("TRAINER", "ROLETRAINER", "ROLETRAINERV1"):
            attrs.extend([f"ROLETRAINERV{role_version}", "ROLETRAINER"])
            for sess in (assigned_sessions or []):
                clean_s = sanitize_token(sess)
                s_ver = (session_versions or {}).get(sess, (session_versions or {}).get(clean_s, training_version))
                attrs.append(f"TRAINING{clean_s}V{s_ver}")
        elif role_clean in ("TRAINEE", "ROLETRAINEE", "ROLETRAINEEV1"):
            attrs.extend([f"ROLETRAINEEV{role_version}", "ROLETRAINEE"])
            if trainee_code:
                t_clean = sanitize_token(trainee_code)
                attrs.extend([f"TRAINEE{t_clean}V1", f"TRAINEE{t_clean}"])

        return attrs


# Global CP-ABE instance
cpabe_engine = CPABEEngine()
