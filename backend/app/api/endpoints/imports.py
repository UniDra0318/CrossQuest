"""Pilot CSV Import and Discrepancy Reconciliation Pipeline (TC-DAT-01 to TC-DAT-12).

Implements Chapter III Section 3.5.2 & 3.5.4 (Figure 12, Table 28):
- SHA-256 deduplication (TC-DAT-01).
- Staging row ingestion (TC-DAT-02).
- Data validation & missing mandatory field detection (TC-DAT-03).
- Discrepancy flagging and resolution workflow (TC-DAT-04, TC-DAT-05).
- Batch commit into training_records with hybrid CP-ABE encryption (TC-DAT-06).
- Audit log tracking (TC-DAT-07).
"""

import csv
import io
import hashlib
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import (
    ImportBatch, ImportStagingRow, ImportDiscrepancy, User, TrainingRecord,
    ClientCompany, Trainee, AccessLog
)
from app.api.deps import get_current_admin_user
from app.crypto.cpabe_engine import cpabe_engine

logger = logging.getLogger(__name__)
router = APIRouter()


class DiscrepancyResolveRequest(BaseModel):
    resolution: str # ACCEPT, CORRECT, OVERRIDE_FLAG
    corrected_data: Optional[Dict[str, Any]] = None


@router.post("/upload")
async def upload_csv_batch(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Uploads and stages an anonymized pilot CSV file (Figure 12, TC-DAT-01..04)."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 1. SHA-256 deduplication (TC-DAT-01)
    file_hash = hashlib.sha256(content).hexdigest()
    existing_batch = db.query(ImportBatch).filter(ImportBatch.file_hash == file_hash).first()
    if existing_batch:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate file detected: Batch '{existing_batch.id}' was already imported with identical SHA-256 hash."
        )

    # 2. Create ImportBatch
    batch = ImportBatch(
        file_hash=file_hash,
        source_file_name=file.filename or "unknown.csv",
        record_count=0,
        loaded_by_user_id=admin_user.id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # 3. Parse CSV rows into Staging
    decoded = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(decoded))
    
    row_no = 0
    valid_count = 0
    discrepancy_count = 0

    for row in reader:
        row_no += 1
        # Check required fields (TC-DAT-03)
        issues = []
        if not row.get("trainee_code") or not row.get("trainee_code").strip():
            issues.append(("MISSING_TRAINEE_CODE", "trainee_code"))
        if not row.get("course_name") or not row.get("course_name").strip():
            issues.append(("MISSING_COURSE_NAME", "course_name"))
        if not row.get("company_code") or not row.get("company_code").strip():
            issues.append(("MISSING_COMPANY_CODE", "company_code"))

        # Score parse validation
        if row.get("score"):
            try:
                float(row["score"])
            except ValueError:
                issues.append(("INVALID_SCORE_FORMAT", "score"))

        status_str = "VALID" if not issues else "DISCREPANCY"
        if issues:
            discrepancy_count += 1
            for issue_type, field in issues:
                db.add(ImportDiscrepancy(
                    batch_id=batch.id,
                    source_row_no=row_no,
                    issue_type=issue_type,
                    field_name=field,
                    resolution=None
                ))
        else:
            valid_count += 1

        db.add(ImportStagingRow(
            batch_id=batch.id,
            source_row_no=row_no,
            raw_data=dict(row),
            validation_status=status_str
        ))

    batch.record_count = row_no
    db.commit()

    # Log to audit log (TC-DAT-07)
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="IMPORT_UPLOAD",
        resource_type="IMPORT_BATCH",
        resource_id=batch.id,
        outcome="SUCCESS",
        details={"file_name": batch.source_file_name, "records": row_no, "discrepancies": discrepancy_count}
    )
    db.add(log)
    db.commit()

    return {
        "batch_id": batch.id,
        "file_hash": file_hash,
        "total_rows": row_no,
        "valid_rows": valid_count,
        "discrepancy_rows": discrepancy_count,
        "status": "STAGED"
    }


@router.get("/batches/{batch_id}/discrepancies")
def get_batch_discrepancies(
    batch_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
) -> List[Dict[str, Any]]:
    """Retrieves all discrepancies flagged for a batch (TC-DAT-04)."""
    discrepancies = db.query(ImportDiscrepancy).filter(ImportDiscrepancy.batch_id == batch_id).all()
    return [
        {
            "id": d.id,
            "source_row_no": d.source_row_no,
            "issue_type": d.issue_type,
            "field_name": d.field_name,
            "resolution": d.resolution
        }
        for d in discrepancies
    ]


@router.put("/discrepancies/{discrepancy_id}/resolve")
def resolve_discrepancy(
    discrepancy_id: str,
    resolve_in: DiscrepancyResolveRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Resolves a data discrepancy (ACCEPT, CORRECT, OVERRIDE_FLAG) (TC-DAT-05)."""
    disc = db.query(ImportDiscrepancy).filter(ImportDiscrepancy.id == discrepancy_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discrepancy record not found")

    disc.resolution = resolve_in.resolution

    # Update corresponding staging row if correction provided
    staging_row = db.query(ImportStagingRow).filter(
        ImportStagingRow.batch_id == disc.batch_id,
        ImportStagingRow.source_row_no == disc.source_row_no
    ).first()

    if staging_row:
        if resolve_in.corrected_data:
            staging_row.raw_data = {**(staging_row.raw_data or {}), **resolve_in.corrected_data}
        staging_row.validation_status = "RESOLVED"

    db.commit()
    return {"id": disc.id, "status": "RESOLVED", "resolution": disc.resolution}


@router.post("/batches/{batch_id}/commit")
def commit_batch_records(
    batch_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Commits validated & resolved staging rows into training_records with hybrid CP-ABE encryption (TC-DAT-06)."""
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    rows = db.query(ImportStagingRow).filter(
        ImportStagingRow.batch_id == batch.id,
        ImportStagingRow.validation_status.in_(["VALID", "RESOLVED"])
    ).all()

    committed = 0
    for row in rows:
        data = row.raw_data or {}
        comp_code = data.get("company_code", "CORP_DEFAULT").strip()
        trainee_code = data.get("trainee_code", "TRN_UNKNOWN").strip()
        course_name = data.get("course_name", "General Training").strip()
        score = float(data.get("score", 85.0)) if data.get("score") else 85.0

        # Resolve or create ClientCompany
        comp = db.query(ClientCompany).filter(ClientCompany.code == comp_code).first()
        if not comp:
            comp = ClientCompany(name=comp_code.title(), code=comp_code)
            db.add(comp)
            db.commit()
            db.refresh(comp)

        # Resolve or create Trainee
        trainee = db.query(Trainee).filter(Trainee.trainee_code == trainee_code).first()
        if not trainee:
            trainee = Trainee(
                current_company_id=comp.id,
                first_name=data.get("first_name", "Trainee"),
                last_name=data.get("last_name", trainee_code),
                email=f"{trainee_code.lower()}@imported.ph",
                trainee_code=trainee_code
            )
            db.add(trainee)
            db.commit()
            db.refresh(trainee)

        # Hybrid CP-ABE encryption
        policy = cpabe_engine.build_record_policy(
            company_code=comp.code,
            trainee_code=trainee.trainee_code
        )
        encrypted_pkg = cpabe_engine.encrypt_record(
            plaintext_data={"score": score, "imported_from_batch": batch.id},
            policy_str=policy,
            record_id=f"rec-{trainee.trainee_code}",
            version=1
        )

        record = TrainingRecord(
            trainee_id=trainee.id,
            company_at_completion_id=comp.id,
            course_name=course_name,
            status=data.get("status", "Completed"),
            score=score,
            encryption_policy=policy,
            policy_version=1,
            abe_ciphertext=encrypted_pkg.get("abe_ciphertext"),
            payload_ciphertext=encrypted_pkg.get("payload_ciphertext"),
            nonce=encrypted_pkg.get("nonce"),
            is_encrypted=True
        )
        db.add(record)
        row.validation_status = "COMMITTED"
        committed += 1

    db.commit()

    # Log to audit log (TC-DAT-07)
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="IMPORT_COMMIT",
        resource_type="IMPORT_BATCH",
        resource_id=batch.id,
        outcome="SUCCESS",
        details={"records_committed": committed}
    )
    db.add(log)
    db.commit()

    return {
        "batch_id": batch.id,
        "records_committed": committed,
        "status": "COMMITTED"
    }
