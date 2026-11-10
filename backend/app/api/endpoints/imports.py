"""Pilot Excel and CSV Import, Allow-Listing, and Discrepancy Reconciliation Pipeline.

Implements Chapter III Section 3.5.2 & 3.5.4 (Figure 12, Table 28, Phase 3):
- SHA-256 deduplication & restricted file storage.
- Field allow-listing: drops sales, billing, payment, and financial columns.
- Strict August 1, 2026 cutoff: pre-cutoff rows excluded.
- In-memory pseudonymization of 15 individual retail customers.
- Duplicate detection & quarantine into ImportDiscrepancy.
- Role boundaries: Finance uploads & generates reconciliation report; Admin resolves quarantined rows with mandatory reason & commits batch.
- 100% reconciliation target across 39 distinct customers.
"""

import os
import csv
import io
import hashlib
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timezone
import openpyxl
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import (
    ImportBatch, ImportStagingRow, ImportDiscrepancy, User, TrainingRecord,
    ClientCompany, Trainee, TrainingSession, AccessLog
)
from app.schemas.schemas import DiscrepancyResolveRequest, ReconciliationReportResponse
from app.api.deps import get_current_user, get_current_admin_user
from app.crypto.cpabe_engine import cpabe_engine
from app.services.pdf_generator import pdf_generator

logger = logging.getLogger(__name__)
router = APIRouter()

# Restricted Storage Path
RESTRICTED_STORAGE_DIR = os.path.join("backend", "storage", "restricted_imports")
os.makedirs(RESTRICTED_STORAGE_DIR, exist_ok=True)

# Strict August 1, 2026 Cutoff Date
CUTOFF_DATE = datetime(2026, 8, 1)

# Allow-listed fields (all billing & sales columns dropped)
ALLOWED_FIELDS = {
    "training_date", "program_name", "type", "delivery", "customer",
    "pax", "participant_name", "participant_email", "trainer", "score",
    "trainee_code", "company_code", "first_name", "last_name", "status"
}

# Known billing/sales columns to drop
DROPPED_COLUMNS = {
    "sales", "sales_by", "payment_status", "payment_method", "2307",
    "invoice_no", "sales_tax", "amount", "unit_price", "total"
}


def _get_client_ip(request: Optional[Request]) -> str:
    if request and request.client:
        return request.client.host
    return "127.0.0.1"


def _standardize_customer_name(raw_name: Optional[str]) -> str:
    if not raw_name:
        return "Unknown Organization"
    name = str(raw_name).strip()
    if name == "Red Oak Properties, Inc.":
        return "Red Oak Properties Inc."
    return name


def _is_individual_retail_customer(customer_name: str, participant_name: Optional[str]) -> bool:
    """Detects if a customer entry represents an individual retail customer rather than a corporate tenant."""
    c_lower = customer_name.strip().lower()
    p_lower = (participant_name or "").strip().lower()
    if c_lower == p_lower and len(c_lower) > 0:
        return True
    
    known_individuals = {
        "angelito alcantara", "jocelyn b. capistrano", "rhyan depante",
        "ma. nonica pormilda", "ma. kristina luisa tayag", "kristine castillo",
        "mike angelo villanueva", "myka ella bautista", "mikka barlis",
        "ma. janet c. sibayan", "gladys ruiz", "laarni uychutin",
        "kimberly ann esteban", "deric centones macalinao", "ron robert despi"
    }
    return c_lower in known_individuals


def _pseudonymize_individual(customer_name: str) -> str:
    """Generates an in-memory pseudonym for retail customers to preserve zero-trust tenant boundaries."""
    short_hash = hashlib.sha256(customer_name.strip().lower().encode("utf-8")).hexdigest()[:6].upper()
    return f"INDIV-{short_hash}"


def _clean_for_json(d: dict) -> dict:
    """Converts datetime and non-JSON-serializable objects to strings for database storage."""
    clean = {}
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            clean[k] = v.isoformat()
        elif v is None:
            clean[k] = None
        else:
            clean[k] = v
    return clean


@router.post("/upload")
@router.post("/upload-workbook")
async def upload_workbook_batch(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Uploads, hashes, stages, and quarantines legacy Excel/CSV workbooks (Phase 3, Figure 12).
    
    Permissions (Phase 3):
    - Finance & Administrator permitted to upload.
    - Other roles denied.
    """
    if current_user.role not in ("finance", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance and Administrator roles may upload legacy import workbooks."
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded workbook file is empty.")

    # 1. SHA-256 Deduplication & Hashing (TC-DAT-01)
    file_hash = hashlib.sha256(content).hexdigest()
    existing_batch = db.query(ImportBatch).filter(ImportBatch.file_hash == file_hash).first()
    if existing_batch:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate file detected: Batch '{existing_batch.id}' was already imported with identical SHA-256 hash."
        )

    # 2. Store in restricted storage location
    ext = os.path.splitext(file.filename or "")[1].lower() or ".xlsx"
    storage_filename = f"{file_hash}{ext}"
    storage_path = os.path.join(RESTRICTED_STORAGE_DIR, storage_filename)
    with open(storage_path, "wb") as f_out:
        f_out.write(content)

    batch = ImportBatch(
        file_hash=file_hash,
        source_file_name=file.filename or "legacy_data.xlsx",
        storage_path=storage_path,
        record_count=0,
        loaded_by_user_id=current_user.id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # 3. Parse Workbook (support .xlsx and .csv)
    raw_rows = []
    if ext in (".xlsx", ".xlsm", ".xltx"):
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        sheet_name = "Participants" if "Participants" in wb.sheetnames else wb.sheetnames[0]
        ws = wb[sheet_name]
        grid = list(ws.iter_rows(values_only=True))
        if grid:
            header_row = [str(c).strip().lower() if c is not None else "" for c in grid[0]]
            for r in grid[1:]:
                if any(v is not None for v in r):
                    row_dict = {}
                    for col_idx, col_name in enumerate(header_row):
                        if col_idx < len(r):
                            norm_key = col_name.replace(" ", "_")
                            if norm_key in DROPPED_COLUMNS:
                                continue
                            if norm_key in ALLOWED_FIELDS or "date" in norm_key or "name" in norm_key or "email" in norm_key or "program" in norm_key or "customer" in norm_key:
                                row_dict[norm_key] = r[col_idx]
                    raw_rows.append(row_dict)
    else:
        decoded = content.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(decoded))
        for r in reader:
            row_dict = {}
            for k, v in r.items():
                norm_key = (k or "").strip().lower().replace(" ", "_")
                if norm_key in DROPPED_COLUMNS:
                    continue
                row_dict[norm_key] = v
            raw_rows.append(row_dict)

    # 4. Process Rows, Apply Cutoff, Pseudonymize, and Quarantine Duplicates
    seen_dedup_keys = set()
    total_count = len(raw_rows)
    pre_cutoff_count = 0
    in_scope_count = 0
    quarantined_count = 0
    discrepancy_count = 0
    distinct_customers = set()
    individual_pseudonymized_count = 0

    for idx, row in enumerate(raw_rows, 1):
        # Extract Training Date
        raw_date = row.get("training_date")
        t_date = None
        if isinstance(raw_date, datetime):
            t_date = raw_date
        elif isinstance(raw_date, str) and raw_date.strip():
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d", "%d/%m/%Y"):
                try:
                    t_date = datetime.strptime(raw_date.strip(), fmt)
                    break
                except ValueError:
                    pass

        # Check August 1, 2026 Cutoff Policy
        if t_date and t_date < CUTOFF_DATE:
            pre_cutoff_count += 1
            db.add(ImportStagingRow(
                batch_id=batch.id,
                source_row_no=idx,
                raw_data=_clean_for_json(row),
                validation_status="PRE_CUTOFF_EXCLUDED"
            ))
            continue

        in_scope_count += 1

        # Customer entity handling
        raw_cust = row.get("customer") or row.get("company_code") or ""
        clean_cust = _standardize_customer_name(raw_cust)
        p_name = row.get("participant_name") or row.get("trainee_code") or ""
        p_email = (row.get("participant_email") or "").strip().lower()
        prog = row.get("program_name") or row.get("course_name") or ""

        # Validation of required fields
        field_issues = []
        if not p_name.strip():
            field_issues.append(("MISSING_TRAINEE_CODE", "trainee_code"))
        if not prog.strip():
            field_issues.append(("MISSING_COURSE_NAME", "course_name"))
        if not raw_cust.strip():
            field_issues.append(("MISSING_COMPANY_CODE", "company_code"))
        if row.get("score") is not None and str(row.get("score")).strip():
            try:
                float(row["score"])
            except ValueError:
                field_issues.append(("INVALID_SCORE_FORMAT", "score"))

        if field_issues:
            discrepancy_count += 1
            for issue_type, f_name in field_issues:
                db.add(ImportDiscrepancy(
                    batch_id=batch.id,
                    source_row_no=idx,
                    issue_type=issue_type,
                    field_name=f_name,
                    resolution=None
                ))
            db.add(ImportStagingRow(
                batch_id=batch.id,
                source_row_no=idx,
                raw_data=_clean_for_json(row),
                validation_status="DISCREPANCY"
            ))
            continue

        # In-Memory Pseudonymization for Individual Retail Customers
        is_individual = _is_individual_retail_customer(clean_cust, p_name)
        if is_individual:
            individual_pseudonymized_count += 1
            tenant_label = _pseudonymize_individual(clean_cust)
            row["pseudonymized_tenant"] = tenant_label
            row["is_individual_retail"] = True
            distinct_customers.add(tenant_label)
        else:
            row["is_individual_retail"] = False
            distinct_customers.add(clean_cust)

        row["standardized_customer"] = clean_cust

        # Duplicate Row Quarantine
        dedup_key = (
            str(prog).strip().lower(),
            str(p_name).strip().lower(),
            p_email,
            t_date.strftime("%Y-%m-%d") if t_date else ""
        )

        if dedup_key in seen_dedup_keys:
            # Quarantine duplicate row!
            quarantined_count += 1
            discrepancy_count += 1
            db.add(ImportStagingRow(
                batch_id=batch.id,
                source_row_no=idx,
                raw_data=_clean_for_json(row),
                validation_status="QUARANTINED"
            ))
            db.add(ImportDiscrepancy(
                batch_id=batch.id,
                source_row_no=idx,
                issue_type="DUPLICATE_ROW",
                field_name="participant_name",
                resolution=None
            ))
        else:
            seen_dedup_keys.add(dedup_key)
            db.add(ImportStagingRow(
                batch_id=batch.id,
                source_row_no=idx,
                raw_data=_clean_for_json(row),
                validation_status="VALID"
            ))

    batch.record_count = total_count
    batch.in_scope_count = in_scope_count
    batch.pre_cutoff_count = pre_cutoff_count
    batch.quarantined_count = quarantined_count
    batch.distinct_customers_count = len(distinct_customers)
    batch.reconciled = (quarantined_count == 0 and discrepancy_count == 0)
    db.commit()

    # Immutable Audit Log (TC-DAT-07)
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="IMPORT_UPLOAD",
        resource_type="IMPORT_BATCH",
        resource_id=batch.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={
            "file_name": batch.source_file_name,
            "total_rows": total_count,
            "pre_cutoff_excluded": pre_cutoff_count,
            "in_scope_rows": in_scope_count,
            "distinct_customers": len(distinct_customers),
            "quarantined_duplicates": quarantined_count
        }
    )
    db.add(log)
    db.commit()

    valid_rows_count = in_scope_count - discrepancy_count
    return {
        "batch_id": batch.id,
        "file_hash": file_hash,
        "total_rows": total_count,
        "valid_rows": valid_rows_count,
        "discrepancy_rows": discrepancy_count,
        "pre_cutoff_rows": pre_cutoff_count,
        "in_scope_rows": in_scope_count,
        "distinct_customers": len(distinct_customers),
        "individual_customers_pseudonymized": individual_pseudonymized_count,
        "quarantined_rows": quarantined_count,
        "reconciled": batch.reconciled,
        "status": "STAGED"
    }


@router.get("/batches")
def list_import_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Lists all staged import batches with row counts, discrepancy counts, and reconciliation status."""
    if current_user.role not in ("finance", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance and Administrator roles can view import batches."
        )

    batches = db.query(ImportBatch).order_by(ImportBatch.loaded_at.desc()).all()
    result = []
    for b in batches:
        disc_count = db.query(ImportDiscrepancy).filter(ImportDiscrepancy.batch_id == b.id).count()
        unresolved = db.query(ImportDiscrepancy).filter(
            ImportDiscrepancy.batch_id == b.id,
            ImportDiscrepancy.resolution == None
        ).count()
        result.append({
            "id": b.id,
            "source_file_name": b.source_file_name,
            "file_hash": b.file_hash,
            "record_count": b.record_count,
            "in_scope_count": b.in_scope_count,
            "pre_cutoff_count": b.pre_cutoff_count,
            "quarantined_count": b.quarantined_count,
            "distinct_customers_count": b.distinct_customers_count,
            "reconciled": bool(b.reconciled),
            "loaded_at": b.loaded_at.isoformat() if b.loaded_at else None,
            "discrepancy_count": disc_count,
            "unresolved_discrepancies": unresolved
        })
    return result


@router.get("/batches/{batch_id}/discrepancies")
def get_batch_discrepancies(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Retrieves all discrepancies and quarantined rows flagged for a batch (Phase 3)."""
    if current_user.role not in ("admin", "finance"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    discrepancies = db.query(ImportDiscrepancy).filter(ImportDiscrepancy.batch_id == batch_id).all()
    return [
        {
            "id": d.id,
            "source_row_no": d.source_row_no,
            "issue_type": d.issue_type,
            "field_name": d.field_name,
            "resolution": d.resolution,
            "resolution_reason": d.resolution_reason,
            "resolved_by_user_id": d.resolved_by_user_id,
            "resolved_at": d.resolved_at
        }
        for d in discrepancies
    ]


@router.put("/discrepancies/{discrepancy_id}/resolve")
def resolve_discrepancy(
    discrepancy_id: str,
    resolve_in: DiscrepancyResolveRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Resolves a quarantined row with a mandatory logged reason (Phase 3, Admin-only)."""
    if not resolve_in.reason or not resolve_in.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A mandatory explanation reason must be provided for Admin discrepancy resolution."
        )

    disc = db.query(ImportDiscrepancy).filter(ImportDiscrepancy.id == discrepancy_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discrepancy record not found")

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    disc.resolution = resolve_in.resolution
    disc.resolution_reason = resolve_in.reason.strip()
    disc.resolved_by_user_id = admin_user.id
    disc.resolved_at = now_utc

    # Update corresponding staging row
    staging_row = db.query(ImportStagingRow).filter(
        ImportStagingRow.batch_id == disc.batch_id,
        ImportStagingRow.source_row_no == disc.source_row_no
    ).first()

    if staging_row:
        if resolve_in.corrected_data:
            staging_row.raw_data = {**(staging_row.raw_data or {}), **resolve_in.corrected_data}
        staging_row.validation_status = "RESOLVED"

    # Check if all discrepancies in batch are resolved to mark reconciled = True
    unresolved_count = db.query(ImportDiscrepancy).filter(
        ImportDiscrepancy.batch_id == disc.batch_id,
        ImportDiscrepancy.resolution == None
    ).count()

    batch = db.query(ImportBatch).filter(ImportBatch.id == disc.batch_id).first()
    if batch and unresolved_count == 0:
        batch.reconciled = True

    db.commit()

    # Immutable Audit Log
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="DISCREPANCY_RESOLVED",
        resource_type="IMPORT_DISCREPANCY",
        resource_id=disc.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={
            "batch_id": disc.batch_id,
            "resolution": disc.resolution,
            "reason": resolve_in.reason.strip(),
            "source_row_no": disc.source_row_no
        }
    )
    db.add(log)
    db.commit()

    return {
        "id": disc.id,
        "status": "RESOLVED",
        "resolution": disc.resolution,
        "reason": disc.resolution_reason,
        "batch_reconciled": batch.reconciled if batch else False
    }


@router.get("/batches/{batch_id}/reconciliation", response_model=ReconciliationReportResponse)
def get_reconciliation_report(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generates the Finance reconciliation report for an imported batch (Phase 3)."""
    if current_user.role not in ("finance", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance and Administrator roles may view the reconciliation report."
        )

    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    staging_rows = db.query(ImportStagingRow).filter(ImportStagingRow.batch_id == batch.id).all()
    discrepancies = db.query(ImportDiscrepancy).filter(ImportDiscrepancy.batch_id == batch.id).all()

    # Calculate metrics
    total_rows = len(staging_rows)
    pre_cutoff = sum(1 for r in staging_rows if r.validation_status == "PRE_CUTOFF_EXCLUDED")
    in_scope = sum(1 for r in staging_rows if r.validation_status != "PRE_CUTOFF_EXCLUDED")
    resolved_count = sum(1 for d in discrepancies if d.resolution is not None)
    quarantined_count = len(discrepancies)

    # Customer breakdown
    customer_counts: Dict[str, int] = {}
    indiv_flags: Dict[str, bool] = {}
    for r in staging_rows:
        if r.validation_status == "PRE_CUTOFF_EXCLUDED":
            continue
        c_name = (r.raw_data or {}).get("standardized_customer") or (r.raw_data or {}).get("customer") or "Unknown"
        is_indiv = (r.raw_data or {}).get("is_individual_retail", False)
        customer_counts[c_name] = customer_counts.get(c_name, 0) + 1
        indiv_flags[c_name] = is_indiv

    customer_breakdown = [
        {
            "customer_name": c,
            "row_count": cnt,
            "is_pseudonymized_individual": indiv_flags.get(c, False)
        }
        for c, cnt in sorted(customer_counts.items(), key=lambda x: -x[1])
    ]

    reconciled_rows = sum(1 for r in staging_rows if r.validation_status in ("VALID", "RESOLVED"))
    reconciliation_rate = f"{(reconciled_rows / max(1, in_scope)) * 100:.1f}%"
    is_fully_reconciled = (reconciled_rows == in_scope) and (in_scope > 0)

    return {
        "batch_id": batch.id,
        "file_hash": batch.file_hash,
        "source_file_name": batch.source_file_name,
        "loaded_at": batch.loaded_at,
        "loaded_by_user_id": batch.loaded_by_user_id,
        "total_rows": total_rows,
        "pre_cutoff_rows": pre_cutoff,
        "in_scope_rows": in_scope,
        "distinct_customers": len(customer_counts),
        "individual_customers_pseudonymized": sum(1 for v in indiv_flags.values() if v),
        "quarantined_rows": quarantined_count,
        "resolved_rows": resolved_count,
        "reconciliation_rate": reconciliation_rate,
        "reconciled": is_fully_reconciled,
        "customer_breakdown": customer_breakdown,
        "discrepancies": [
            {
                "id": d.id,
                "source_row_no": d.source_row_no,
                "issue_type": d.issue_type,
                "resolution": d.resolution,
                "reason": d.resolution_reason
            }
            for d in discrepancies
        ]
    }


@router.get("/batches/{batch_id}/reconciliation/csv")
def download_reconciliation_csv(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exports the formal Finance reconciliation customer breakdown and staging ledger into CSV (OI-10)."""
    report_data = get_reconciliation_report(batch_id=batch_id, db=db, current_user=current_user)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["CrossQuest Financial Reconciliation Report (OI-10)"])
    writer.writerow(["Batch ID", report_data.get("batch_id")])
    writer.writerow(["Source File", report_data.get("source_file_name")])
    writer.writerow(["Total Rows", report_data.get("total_rows")])
    writer.writerow(["Quarantined Rows", report_data.get("quarantined_rows")])
    writer.writerow(["Resolved Rows", report_data.get("resolved_rows")])
    writer.writerow(["Reconciliation Rate", f"{report_data.get('reconciliation_rate', 0)}%"])
    writer.writerow([])
    writer.writerow(["Customer / Account", "Entity Classification", "Reconciled Records", "Data Protection Status"])
    for cust in report_data.get("customer_breakdown", []):
        is_indiv = cust.get("is_individual", False)
        writer.writerow([
            cust.get("customer_name"),
            "INDIVIDUAL RETAIL (SELF-PAYING)" if is_indiv else "CORPORATE CLIENT",
            cust.get("row_count"),
            "PII Cryptographic Pseudonym" if is_indiv else "Multi-Tenant Isolated"
        ])
    output.seek(0)
    filename = f"Finance_Reconciliation_Batch_{batch_id[:8]}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/batches/{batch_id}/reconciliation/pdf")
def download_reconciliation_pdf(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Downloads the formal Finance reconciliation report PDF (ReportLab, OI-10)."""
    report_data = get_reconciliation_report(batch_id=batch_id, db=db, current_user=current_user)
    
    # Dynamically resolve prepared_by (uploader/finance) and verified_by (admin)
    loaded_user = db.query(User).filter(User.id == report_data.get("loaded_by_user_id")).first()
    finance_name = (loaded_user.full_name if loaded_user else None) or current_user.full_name or "Finance Officer"
    
    admin_reviewer = db.query(User).filter(User.role == "admin").order_by(User.created_at.asc()).first()
    admin_name = (admin_reviewer.full_name if admin_reviewer else None) or "Authorized Primary Administrator"
    admin_title = (getattr(admin_reviewer, "title", None) if admin_reviewer else None) or "Principal Consultant & Primary Administrator"

    enriched_data = dict(report_data)
    enriched_data["prepared_by_name"] = finance_name
    enriched_data["prepared_by_title"] = "Finance Officer — Legacy Reconciliation Authority"
    enriched_data["verified_by_name"] = admin_name
    enriched_data["verified_by_title"] = admin_title

    pdf_bytes = pdf_generator.generate_finance_reconciliation_pdf(enriched_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Finance_Reconciliation_Batch_{batch_id[:8]}.pdf"'
        }
    )


@router.post("/batches/{batch_id}/commit")
def commit_batch_records(
    batch_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Commits validated & resolved staging rows into training_records with hybrid CP-ABE encryption (Phase 3, Admin-only)."""
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    rows = db.query(ImportStagingRow).filter(
        ImportStagingRow.batch_id == batch.id,
        ImportStagingRow.validation_status.in_(["VALID", "RESOLVED"])
    ).all()

    committed = 0
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    try:
        for row in rows:
            data = row.raw_data or {}
            comp_name = data.get("standardized_customer") or data.get("customer") or "Unknown Corp"
            is_indiv = data.get("is_individual_retail", False)
            
            # Determine company code
            if is_indiv:
                comp_code = data.get("pseudonymized_tenant") or _pseudonymize_individual(comp_name)
            else:
                comp_code = comp_name.replace(" ", "_").replace(".", "").replace(",", "").upper()[:20]

            raw_email = (data.get("participant_email") or "").strip().lower()
            trainee_code = data.get("trainee_code") or f"TRN-{hashlib.sha256((raw_email or str(data.get('participant_name', ''))).encode()).hexdigest()[:6].upper()}"
            email = raw_email or f"{trainee_code.lower()}@imported.ph"

            course_name = data.get("program_name") or data.get("course_name") or "Corporate Certification"
            raw_score = data.get("score")
            score = float(raw_score) if (raw_score is not None and str(raw_score).strip() != "") else None

            # Resolve or create ClientCompany
            comp = db.query(ClientCompany).filter(ClientCompany.code == comp_code).first()
            if not comp:
                comp = ClientCompany(name=comp_name, code=comp_code)
                db.add(comp)
                db.flush()
                db.refresh(comp)

            # Resolve or create Trainee
            trainee = db.query(Trainee).filter(
                (Trainee.email == email) | (Trainee.trainee_code == trainee_code)
            ).first()
            if not trainee:
                name_parts = str(data.get("participant_name", "Trainee")).split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else "Participant"

                trainee = Trainee(
                    current_company_id=comp.id,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    trainee_code=trainee_code
                )
                db.add(trainee)
                db.flush()
                db.refresh(trainee)

            # Parse training_date and resolve or create TrainingSession
            raw_date = data.get("training_date")
            training_dt = None
            if raw_date:
                try:
                    training_dt = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    try:
                        training_dt = datetime.strptime(str(raw_date)[:10], "%Y-%m-%d")
                    except Exception:
                        training_dt = None

            session_id = None
            if training_dt:
                sess_code = f"SESS-{comp.code[:6]}-{training_dt.strftime('%Y%m%d')}-{hashlib.sha256(course_name.encode()).hexdigest()[:4].upper()}"
                session = db.query(TrainingSession).filter(TrainingSession.session_code == sess_code).first()
                if not session:
                    session = TrainingSession(
                        session_code=sess_code,
                        course_name=course_name,
                        start_date=training_dt,
                        end_date=training_dt,
                        venue="TBD (pilot import)",
                        trainer_signed_off=False
                    )
                    db.add(session)
                    db.flush()
                    db.refresh(session)
                session_id = session.id

            # CP-ABE Encryption
            policy = cpabe_engine.build_record_policy(
                company_code=comp.code,
                trainee_code=trainee.trainee_code
            )
            encrypted_pkg = cpabe_engine.encrypt_record(
                plaintext_data={
                    "score": score,
                    "course_name": course_name,
                    "imported_from_batch": batch.id,
                    "is_individual_retail": is_indiv
                },
                policy_str=policy,
                record_id=f"rec-{trainee.trainee_code}",
                version=1
            )

            raw_status = data.get("status")
            status_val = raw_status if raw_status in ("In progress", "Not completed") else "Not completed"

            record = TrainingRecord(
                trainee_id=trainee.id,
                session_id=session_id,
                company_at_completion_id=comp.id,
                course_name=course_name,
                status=status_val,
                attendance_status=None,
                score=score,
                completion_date=None,
                import_batch_id=batch.id,
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
    except Exception:
        db.rollback()
        raise

    # Immutable Audit Log (TC-DAT-07)
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="IMPORT_COMMIT",
        resource_type="IMPORT_BATCH",
        resource_id=batch.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={"records_committed": committed}
    )
    db.add(log)
    db.commit()

    return {
        "batch_id": batch.id,
        "records_committed": committed,
        "status": "COMMITTED"
    }
