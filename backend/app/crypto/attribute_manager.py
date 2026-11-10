"""Attribute Versioning, KMS Envelope Encryption, and Tier-2 Revocation Manager.

Implements Chapter III Section 3.6.4, 3.6.5, 3.6.7 (DD-05, DD-09, SEC-05, SEC-06):
- Attribute token management & version bumping (e.g. CLIENTCORPALPHAV1 -> CLIENTCORPALPHAV2).
- Key envelope encryption under simulated or AWS KMS.
- Re-keying of remaining authorized users upon role change or account removal.
- Background re-encryption worker for transitioning historical records to current attribute versions.
- Crypto-shredding: zeroing and deletion of CP-ABE private key material upon user termination.
"""

import os
import json
import base64
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from app.core.config import settings
from app.models.entities import (
    AbeAttribute, UserAbeKey, UserKeyAttribute, User, TrainingRecord,
    TrainingRecordVersion, AccessLog, ClientCompany, Trainee, ReencryptionJob,
    TrainerAssignment, TrainingSession
)
from app.crypto.cpabe_engine import cpabe_engine, sanitize_token

logger = logging.getLogger(__name__)


class AttributeManager:
    """Manages attribute versions, user key envelopes, and background re-encryption."""

    # -------------------------------------------------------------------------
    # 1. Attribute Lifecycle & Version Bumping (DD-05, SEC-05)
    # -------------------------------------------------------------------------
    @staticmethod
    def get_or_create_attribute(
        db: Session,
        attribute_type: str,
        ref_code: str,
        version: int = 1
    ) -> AbeAttribute:
        """Retrieves or creates an attribute token with versioning (e.g. CLIENTCORPALPHAV1)."""
        clean_ref = sanitize_token(ref_code)
        type_prefix = sanitize_token(attribute_type)
        token = f"{type_prefix}{clean_ref}V{version}"

        attr = db.query(AbeAttribute).filter(AbeAttribute.token == token).first()
        if not attr:
            attr = AbeAttribute(
                token=token,
                attribute_type=attribute_type.upper(),
                ref_code=clean_ref,
                version=version,
                status="active"
            )
            db.add(attr)
            db.commit()
            db.refresh(attr)
        return attr

    @staticmethod
    def bump_attribute_version(
        db: Session,
        attribute_type: str,
        ref_code: str,
        admin_user_id: Optional[str] = None
    ) -> Tuple[AbeAttribute, AbeAttribute]:
        """Retires current active attribute version and creates version v+1 (DD-05)."""
        clean_ref = sanitize_token(ref_code)
        type_prefix = sanitize_token(attribute_type)

        # Find latest version
        current_attr = (
            db.query(AbeAttribute)
            .filter(
                AbeAttribute.attribute_type == attribute_type.upper(),
                AbeAttribute.ref_code == clean_ref
            )
            .order_by(desc(AbeAttribute.version))
            .first()
        )

        if not current_attr:
            current_attr = AbeAttribute(
                token=f"{type_prefix}{clean_ref}V1",
                attribute_type=attribute_type.upper(),
                ref_code=clean_ref,
                version=1,
                status="retired"
            )
            db.add(current_attr)
            db.commit()
            db.refresh(current_attr)

        old_ver = current_attr.version
        new_ver = old_ver + 1
        current_attr.status = "retired"

        new_token = f"{type_prefix}{clean_ref}V{new_ver}"
        new_attr = AbeAttribute(
            token=new_token,
            attribute_type=attribute_type.upper(),
            ref_code=clean_ref,
            version=new_ver,
            status="active"
        )
        db.add(new_attr)

        # Audit log
        log = AccessLog(
            actor_user_id=admin_user_id,
            actor_role="admin" if admin_user_id else "system",
            event_type="ATT_BUMP_VERSION",
            resource_type="ATTRIBUTE",
            outcome="SUCCESS",
            details={
                "type": attribute_type,
                "ref_code": clean_ref,
                "old_token": current_attr.token if current_attr else None,
                "new_token": new_token,
                "new_version": new_ver
            }
        )
        db.add(log)
        db.commit()
        db.refresh(new_attr)
        return current_attr, new_attr

    # -------------------------------------------------------------------------
    # 2. KMS Envelope Encryption for Private Keys (DD-09, SEC-06)
    # -------------------------------------------------------------------------
    @staticmethod
    def _get_kms_client():
        """Initializes boto3 AWS KMS client if configured, otherwise returns None."""
        try:
            import boto3
            from botocore.config import Config
            boto_config = Config(connect_timeout=3, read_timeout=3, retries={'max_attempts': 2})
            kwargs = {"region_name": getattr(settings, "AWS_REGION", "ap-southeast-1"), "config": boto_config}
            if getattr(settings, "AWS_ACCESS_KEY_ID", None) and getattr(settings, "AWS_SECRET_ACCESS_KEY", None):
                kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            return boto3.client("kms", **kwargs)
        except Exception as e:
            logger.debug(f"[AWS KMS] Client initialization skipped or unavailable: {e}")
            return None

    @staticmethod
    def envelope_encrypt_key(serialized_key: str, kms_key_arn: Optional[str] = None) -> Dict[str, str]:
        """Encrypts serialized CP-ABE user key using AES-256-GCM envelope encryption (SEC-06, DD-09).
        
        A random 256-bit Data Encryption Key (DEK) is generated.
        DEK is wrapped with real AWS KMS when configured; falls back gracefully to
        local HKDF AES-256-GCM KEK in development or offline environments.
        """
        raw_key_bytes = serialized_key.encode("utf-8")
        dek = os.urandom(32) # 256-bit DEK
        nonce = os.urandom(12)

        # Encrypt key payload with DEK
        aesgcm = AESGCM(dek)
        key_ciphertext = aesgcm.encrypt(nonce, raw_key_bytes, b"crossquest-cpabe-dek-aad")

        target_arn = kms_key_arn or getattr(settings, "AWS_KMS_KEY_ARN", None) or getattr(settings, "AWS_KMS_KEY_ID", None)
        wrapped_payload = None
        final_arn = target_arn or "arn:aws:kms:ap-southeast-1:local:crossquest-master-key"

        # Attempt real AWS KMS wrapping if target ARN is a live AWS KMS ARN
        if target_arn and ":local:" not in target_arn:
            kms = AttributeManager._get_kms_client()
            if kms:
                try:
                    resp = kms.encrypt(
                        KeyId=target_arn,
                        Plaintext=dek,
                        EncryptionContext={"Service": "CrossQuest", "Type": "CP-ABE-DEK"}
                    )
                    # Prefix with magic tag b"AWSKMS:" to indicate real AWS KMS wrapped blob
                    wrapped_payload = b"AWSKMS:" + resp["CiphertextBlob"]
                    logger.info(f"[AWS KMS] DEK successfully envelope-wrapped under AWS KMS key: {target_arn}")
                except Exception as e:
                    logger.warning(f"[AWS KMS] Call failed ({e}); falling back to local AES-256-GCM envelope KEK.")
                    if getattr(settings, "ENVIRONMENT", "development") == "production":
                        raise RuntimeError(
                            f"FAIL-CLOSED SECURITY ENFORCEMENT: AWS KMS key wrapping failed in production: {e}"
                        ) from e
            elif getattr(settings, "ENVIRONMENT", "development") == "production":
                raise RuntimeError(
                    f"FAIL-CLOSED SECURITY ENFORCEMENT: AWS KMS client could not be initialized for ARN '{target_arn}' in production."
                )

        if wrapped_payload is None and getattr(settings, "ENVIRONMENT", "development") == "production":
            raise RuntimeError(
                "FAIL-CLOSED SECURITY ENFORCEMENT: Local KEK envelope fallback is forbidden in production (SEC-06, DD-09)."
            )

        # Fallback to local HKDF AES-256-GCM KEK
        if wrapped_payload is None:
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"kms-envelope-salt",
                info=b"crossquest-kms-wrapping-key"
            )
            master_kek = hkdf.derive(settings.SECRET_KEY.encode("utf-8"))
            kek_nonce = os.urandom(12)
            kek_cipher = AESGCM(master_kek)
            wrapped_dek_bytes = kek_cipher.encrypt(kek_nonce, dek, b"dek-envelope")
            wrapped_payload = b"LOCAL:" + kek_nonce + wrapped_dek_bytes

        return {
            "wrapped_dek": base64.b64encode(wrapped_payload).decode("utf-8"),
            "nonce": base64.b64encode(nonce).decode("utf-8"),
            "key_ciphertext": base64.b64encode(key_ciphertext).decode("utf-8"),
            "kms_key_arn": final_arn
        }

    @staticmethod
    def envelope_decrypt_key(wrapped_dek_b64: str, nonce_b64: str, key_ciphertext_b64: str, kms_key_arn: Optional[str] = None) -> Optional[str]:
        """Unwraps DEK using AWS KMS or local KEK fallback and decrypts CP-ABE key (SEC-06)."""
        try:
            wrapped_payload = base64.b64decode(wrapped_dek_b64)
            nonce = base64.b64decode(nonce_b64)
            key_ciphertext = base64.b64decode(key_ciphertext_b64)
            dek = None

            # Check if wrapped via real AWS KMS
            if wrapped_payload.startswith(b"AWSKMS:"):
                kms_ciphertext = wrapped_payload[7:]
                kms = AttributeManager._get_kms_client()
                if kms:
                    try:
                        resp = kms.decrypt(
                            CiphertextBlob=kms_ciphertext,
                            EncryptionContext={"Service": "CrossQuest", "Type": "CP-ABE-DEK"}
                        )
                        dek = resp["Plaintext"]
                    except Exception as e:
                        logger.warning(f"[AWS KMS] KMS unwrap failed: {e}")
                        if getattr(settings, "ENVIRONMENT", "development") == "production":
                            raise RuntimeError(
                                f"FAIL-CLOSED SECURITY ENFORCEMENT: AWS KMS unwrap failed in production: {e}"
                            ) from e
                elif getattr(settings, "ENVIRONMENT", "development") == "production":
                    raise RuntimeError(
                        "FAIL-CLOSED SECURITY ENFORCEMENT: Cannot unwrap AWS KMS payload without AWS KMS client in production."
                    )
                if dek is None and getattr(settings, "ENVIRONMENT", "development") == "production":
                    raise RuntimeError(
                        "FAIL-CLOSED SECURITY ENFORCEMENT: AWS KMS key unwrapping failed in production."
                    )

            # Local KEK unwrapping
            if dek is None:
                raw_local = wrapped_payload[6:] if wrapped_payload.startswith(b"LOCAL:") else wrapped_payload
                kek_nonce = raw_local[:12]
                wrapped_dek_bytes = raw_local[12:]

                hkdf = HKDF(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=b"kms-envelope-salt",
                    info=b"crossquest-kms-wrapping-key"
                )
                master_kek = hkdf.derive(settings.SECRET_KEY.encode("utf-8"))
                kek_cipher = AESGCM(master_kek)
                dek = kek_cipher.decrypt(kek_nonce, wrapped_dek_bytes, b"dek-envelope")

            # Decrypt CP-ABE key payload
            aesgcm = AESGCM(dek)
            decrypted_key_bytes = aesgcm.decrypt(nonce, key_ciphertext, b"crossquest-cpabe-dek-aad")
            return decrypted_key_bytes.decode("utf-8")
        except Exception as e:
            if getattr(settings, "ENVIRONMENT", "development") == "production" and isinstance(e, RuntimeError):
                raise
            logger.error(f"Envelope key decryption failed: {e}")
            return None

    # -------------------------------------------------------------------------
    # 3. User Re-Keying & Key Storage (TC-ATT-03, TC-ATT-06)
    # -------------------------------------------------------------------------
    def issue_or_rekey_user(
        self,
        db: Session,
        user: User,
        client_versions: Optional[Dict[str, int]] = None,
        admin_user_id: Optional[str] = None,
        commit: bool = True
    ) -> UserAbeKey:
        """Generates, envelope-encrypts, and stores a new CP-ABE key for a user with current attributes."""
        # Retire any active previous key for this user
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        db.query(UserAbeKey).filter(
            UserAbeKey.user_id == user.id,
            UserAbeKey.status == "active"
        ).update({"status": "retired", "revoked_at": now_utc})

        # Trainee code if applicable
        trainee = db.query(Trainee).filter(Trainee.user_id == user.id).first()
        t_code = trainee.trainee_code if trainee else None

        # Build user attributes for ALL assigned companies with active versions
        resolved_client_versions: Dict[str, int] = dict(client_versions or {})
        for comp_code in (user.assigned_client_accounts or []):
            clean_c = sanitize_token(comp_code)
            if comp_code not in resolved_client_versions and clean_c not in resolved_client_versions:
                attr = (
                    db.query(AbeAttribute)
                    .filter(
                        AbeAttribute.attribute_type == "CLIENT",
                        AbeAttribute.ref_code == clean_c,
                        AbeAttribute.status == "active"
                    )
                    .order_by(desc(AbeAttribute.version))
                    .first()
                )
                resolved_client_versions[comp_code] = attr.version if attr else 1

        # Look up trainer assigned sessions if role is trainer
        assigned_sessions: List[str] = []
        resolved_session_versions: Dict[str, int] = {}
        if user.role.lower() == "trainer":
            active_assignments = (
                db.query(TrainingSession.session_code)
                .join(TrainerAssignment, TrainerAssignment.session_id == TrainingSession.id)
                .filter(
                    TrainerAssignment.user_id == user.id,
                    TrainerAssignment.valid_to == None
                )
                .all()
            )
            assigned_sessions = [s[0] for s in active_assignments if s[0]]
            for sess_code in assigned_sessions:
                clean_s = sanitize_token(sess_code)
                attr = (
                    db.query(AbeAttribute)
                    .filter(
                        AbeAttribute.attribute_type == "TRAINING",
                        AbeAttribute.ref_code == clean_s,
                        AbeAttribute.status == "active"
                    )
                    .order_by(desc(AbeAttribute.version))
                    .first()
                )
                resolved_session_versions[sess_code] = attr.version if attr else 1

        attrs = cpabe_engine.build_user_attributes(
            role=user.role,
            assigned_companies=user.assigned_client_accounts,
            assigned_sessions=assigned_sessions,
            trainee_code=t_code,
            client_versions=resolved_client_versions,
            session_versions=resolved_session_versions
        )

        # Generate CP-ABE key
        raw_key = cpabe_engine.generate_user_private_key(attrs)
        serialized_key = json.dumps(raw_key)

        # Envelope encrypt
        envelope = self.envelope_encrypt_key(serialized_key)

        # Store in user_abe_keys
        key_record = UserAbeKey(
            user_id=user.id,
            status="active",
            wrapped_dek=envelope["wrapped_dek"],
            nonce=envelope["nonce"],
            key_ciphertext=envelope["key_ciphertext"],
            kms_key_arn=envelope["kms_key_arn"],
            issued_at=now_utc
        )
        db.add(key_record)
        db.flush()

        # Bind attributes in junction table
        for attr_str in attrs:
            db.add(UserKeyAttribute(key_id=key_record.id, token=attr_str))

        # Audit log
        log = AccessLog(
            actor_user_id=admin_user_id or user.id,
            actor_role="admin" if admin_user_id else user.role,
            event_type="KEY_ISSUED",
            resource_type="USER_KEY",
            resource_id=key_record.id,
            outcome="SUCCESS",
            details={"attributes": attrs, "user_email": user.email}
        )
        db.add(log)

        if commit:
            db.commit()
            db.refresh(key_record)
        else:
            db.flush()

        return key_record

    # -------------------------------------------------------------------------
    # 4. Background Re-Encryption Worker & Batching Policy (DD-05, OI-16, TC-ATT-08..09, TC-ATT-15)
    # -------------------------------------------------------------------------
    def reencrypt_records_job(
        self,
        db: Session,
        company_code: str,
        old_version: int,
        new_version: int,
        admin_user_id: Optional[str] = None,
        batch_size: int = 50
    ) -> Dict[str, Any]:
        """Background worker that re-encrypts historical records to new policy version in defined batches (OI-16).
        
        Resumable from the first unprocessed record (TC-ATT-13 / Section 3.6.7).
        Skips records that fail decryption without corrupting data, marking job PARTIAL or FAILED.
        """
        clean_code = sanitize_token(company_code)
        comp = db.query(ClientCompany).filter(ClientCompany.code == company_code).first()
        if not comp:
            return {"status": "FAILED", "error": "Company not found", "records_processed": 0}

        # Check for an existing uncompleted/failed job to resume rather than start fresh
        job = (
            db.query(ReencryptionJob)
            .filter(
                ReencryptionJob.company_code == company_code,
                ReencryptionJob.old_version == old_version,
                ReencryptionJob.new_version == new_version,
                ReencryptionJob.status.in_(["IN_PROGRESS", "FAILED", "PARTIAL"])
            )
            .order_by(desc(ReencryptionJob.created_at))
            .first()
        )

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

        # Query all records still requiring re-encryption (policy_version == old_version)
        records = (
            db.query(TrainingRecord)
            .filter(
                TrainingRecord.company_at_completion_id == comp.id,
                TrainingRecord.policy_version == old_version,
                TrainingRecord.deleted_at == None
            )
            .all()
        )

        total_unprocessed = len(records)

        if job:
            job.status = "IN_PROGRESS"
            job.error_message = None
            if job.total_records is None or job.total_records == 0:
                job.total_records = (job.processed_records or 0) + total_unprocessed
        else:
            job = ReencryptionJob(
                company_code=company_code,
                old_version=old_version,
                new_version=new_version,
                batch_size=batch_size,
                total_records=total_unprocessed,
                processed_records=0,
                status="IN_PROGRESS",
                initiated_by_user_id=admin_user_id,
                created_at=now_utc
            )
            db.add(job)

        db.commit()
        db.refresh(job)

        # Admin key with authority to decrypt all versioned records
        admin_key = cpabe_engine.generate_user_private_key(["ROLEADMIN", "ROLEADMINV1", "ROLEFINANCE", "ROLEFINANCEV1"])
        processed_this_run = 0
        failed_records = 0

        try:
            if records:
                for i in range(0, total_unprocessed, batch_size):
                    chunk = records[i:i + batch_size]
                    chunk_processed = 0
                    for rec in chunk:
                        cipher_pkg = {
                            "policy": rec.encryption_policy,
                            "policy_version": rec.policy_version,
                            "abe_ciphertext": rec.abe_ciphertext,
                            "payload_ciphertext": rec.payload_ciphertext,
                            "nonce": rec.nonce,
                            "engine": "charm-bsw07" if cpabe_engine.charm_available else "simulation"
                        }

                        trainee = db.query(Trainee).filter(Trainee.id == rec.trainee_id).first()
                        trainee_code = trainee.trainee_code if trainee else "default"
                        decrypted = cpabe_engine.decrypt_record(
                            cipher_pkg,
                            admin_key,
                            record_id=f"rec-{trainee_code}",
                            version=rec.policy_version
                        )

                        # Skip corrupted/un-decryptable record without overwriting with dummy data
                        if decrypted is None:
                            logger.warning(f"Record {rec.id} failed decryption during re-encryption job {job.id}. Skipping record.")
                            failed_records += 1
                            continue

                        # 1. Snapshot previous version into TrainingRecordVersion (DD-06)
                        snapshot = TrainingRecordVersion(
                            record_id=rec.id,
                            version_no=rec.policy_version,
                            abe_ciphertext=rec.abe_ciphertext,
                            payload_ciphertext=rec.payload_ciphertext,
                            policy_tokens=rec.encryption_policy,
                            edited_by_user_id=admin_user_id,
                            edited_at=datetime.now(timezone.utc).replace(tzinfo=None)
                        )
                        db.add(snapshot)

                        # 2. Re-encrypt with new client version token
                        new_policy = cpabe_engine.build_record_policy(
                            company_code=company_code,
                            session_code=rec.session.session_code if rec.session else None,
                            trainee_code=trainee_code,
                            client_version=new_version
                        )

                        re_encrypted = cpabe_engine.encrypt_record(
                            plaintext_data=decrypted,
                            policy_str=new_policy,
                            record_id=f"rec-{trainee_code}",
                            version=new_version
                        )

                        rec.encryption_policy = new_policy
                        rec.policy_version = new_version
                        rec.abe_ciphertext = re_encrypted.get("abe_ciphertext")
                        rec.payload_ciphertext = re_encrypted.get("payload_ciphertext")
                        rec.nonce = re_encrypted.get("nonce")
                        chunk_processed += 1
                        processed_this_run += 1

                    # Commit progress per batch so job can resume from last completed batch
                    job.processed_records = (job.processed_records or 0) + chunk_processed
                    db.commit()

            # Set status based on outcomes
            if failed_records > 0 and (job.processed_records or 0) > 0:
                job.status = "PARTIAL"
                job.error_message = f"{failed_records} records failed decryption and were skipped."
            elif failed_records > 0 and (job.processed_records or 0) == 0:
                job.status = "FAILED"
                job.error_message = f"All {failed_records} records failed decryption."
            else:
                job.status = "COMPLETED"

            job.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()

        except Exception as e:
            logger.error(f"Re-encryption job {job.id} encountered an error: {e}")
            job.status = "FAILED"
            job.error_message = str(e)
            db.commit()
            raise

        # Audit log
        log = AccessLog(
            actor_user_id=admin_user_id,
            actor_role="admin" if admin_user_id else "system",
            event_type="RE_ENCRYPT_JOB",
            resource_type="RECORD_BATCH",
            resource_id=job.id,
            outcome="SUCCESS" if job.status in ("COMPLETED", "PARTIAL") else "FAILED",
            details={
                "job_id": job.id,
                "company_code": company_code,
                "old_version": old_version,
                "new_version": new_version,
                "batch_size": batch_size,
                "records_processed": job.processed_records,
                "records_failed": failed_records,
                "total_records": job.total_records,
                "status": job.status
            }
        )
        db.add(log)
        db.commit()

        return {
            "job_id": job.id,
            "status": job.status,
            "company_code": company_code,
            "old_version": old_version,
            "new_version": new_version,
            "batch_size": batch_size,
            "records_processed": job.processed_records,
            "records_failed": failed_records,
            "total_records": job.total_records
        }


attribute_manager = AttributeManager()
