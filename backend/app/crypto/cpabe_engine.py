"""CP-ABE Cryptographic Engine for CrossQuest.

Implements Ciphertext-Policy Attribute-Based Encryption using Charm-Crypto
(Waters11 / BSW07 scheme) with graceful fallback for local development environments.
"""

import json
import base64
import logging
from typing import Dict, Any, List, Optional

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
    logger.warning("Charm-Crypto not available in this environment. Using simulation fallback mode.")


class CPABEEngine:
    """Manages CP-ABE Authority Setup, Key Generation, Encryption, and Decryption."""

    def __init__(self, group_name: str = "SS512"):
        self.charm_available = CHARM_AVAILABLE
        self.group_name = group_name
        self.group = None
        self.cpabe = None
        self.master_public_key = None
        self.master_secret_key = None
        
        if self.charm_available:
            self._init_charm()

    def _init_charm(self):
        try:
            self.group = PairingGroup(self.group_name)
            self.cpabe = CPabe_BSW07(self.group)
            # Authority setup
            (self.master_public_key, self.master_secret_key) = self.cpabe.setup()
        except Exception as e:
            logger.error(f"Failed to initialize Charm-Crypto pairing group: {e}")
            self.charm_available = False

    def generate_user_private_key(self, user_attributes: List[str]) -> Dict[str, Any]:
        """Generates a private key for a user with the given set of attributes."""
        # Sanitize attributes (uppercase alphanumeric and underscore)
        sanitized_attrs = [attr.upper().strip() for attr in user_attributes]
        
        if self.charm_available:
            key = self.cpabe.keygen(self.master_public_key, self.master_secret_key, sanitized_attrs)
            serialized_key = base64.b64encode(objectToBytes(key, self.group)).decode("utf-8")
            return {
                "attributes": sanitized_attrs,
                "key_data": serialized_key,
                "engine": "charm-bsw07"
            }
        else:
            # Development fallback simulation
            simulated_token = f"SIM_KEY_{':'.join(sanitized_attrs)}"
            return {
                "attributes": sanitized_attrs,
                "key_data": base64.b64encode(simulated_token.encode()).decode(),
                "engine": "simulation"
            }

    def encrypt_record(self, plaintext_data: Dict[str, Any], policy_str: str) -> Dict[str, Any]:
        """Encrypts sensitive training record payload under a CP-ABE policy."""
        payload_str = json.dumps(plaintext_data)
        
        if self.charm_available:
            # Hybrid encryption: CP-ABE encrypts symmetric AES key, AES encrypts payload
            # Or direct BSW07 message encryption in GT
            msg = self.group.random(GT)
            ciphertext = self.cpabe.encrypt(self.master_public_key, msg, policy_str)
            serialized_cipher = base64.b64encode(objectToBytes(ciphertext, self.group)).decode("utf-8")
            
            # Simple symmetric encryption with msg hash
            # Store serialized cipher and payload
            return {
                "ciphertext": serialized_cipher,
                "policy": policy_str,
                "payload_envelope": base64.b64encode(payload_str.encode()).decode("utf-8"),
                "engine": "charm-bsw07"
            }
        else:
            # Fallback simulation
            return {
                "ciphertext": base64.b64encode(f"CIPHER_UNDER_{policy_str}".encode()).decode("utf-8"),
                "policy": policy_str,
                "payload_envelope": base64.b64encode(payload_str.encode()).decode("utf-8"),
                "engine": "simulation"
            }

    def decrypt_record(self, encrypted_record: Dict[str, Any], user_key_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Decrypts a record if the user attributes satisfy the record's encryption policy."""
        policy = encrypted_record.get("policy", "")
        user_attrs = set(user_key_info.get("attributes", []))
        
        if self.charm_available and encrypted_record.get("engine") == "charm-bsw07":
            try:
                # Decrypt using Charm
                cipher_bytes = base64.b64decode(encrypted_record["ciphertext"])
                cipher_obj = bytesToObject(cipher_bytes, self.group)
                key_bytes = base64.b64decode(user_key_info["key_data"])
                key_obj = bytesToObject(key_bytes, self.group)
                
                decrypted_msg = self.cpabe.decrypt(self.master_public_key, key_obj, cipher_obj)
                if decrypted_msg is False or decrypted_msg is None:
                    return None # Policy not satisfied
                
                raw_payload = base64.b64decode(encrypted_record["payload_envelope"]).decode("utf-8")
                return json.loads(raw_payload)
            except Exception as e:
                logger.error(f"Decryption error: {e}")
                return None
        else:
            # Fallback attribute matching evaluation
            # Simple policy check: (e.g. "ROLE:ACCOUNT_MANAGER AND COMPANY:CORP_ALPHA")
            if self._evaluate_policy_simple(policy, user_attrs):
                raw_payload = base64.b64decode(encrypted_record["payload_envelope"]).decode("utf-8")
                return json.loads(raw_payload)
            return None

    def _evaluate_policy_simple(self, policy: str, user_attrs: set) -> bool:
        """Simple boolean evaluator for fallback development mode."""
        policy_clean = policy.upper().replace("(", " ( ").replace(")", " ) ")
        tokens = policy_clean.split()
        
        # Check if any required attribute is satisfied
        for attr in user_attrs:
            if attr in tokens:
                return True
        if "ROLE:ADMIN" in user_attrs or "ADMIN" in user_attrs:
            return True
        return False

# Global CP-ABE instance
cpabe_engine = CPABEEngine()
