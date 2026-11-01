"""Attribute Authority, Tier-2 Revocation & Batch Re-encryption Endpoints.

Implements Chapter III Section 3.6.4, 3.6.7 (DD-05, DD-09, SEC-05, OI-16):
- Bumping attribute versions (e.g. CLIENTCORPALPHAV1 -> CLIENTCORPALPHAV2).
- Batch re-encryption jobs with defined chunk policy (batch_size=50) and progress tracking (OI-16).
- Status inspection of background re-encryption tasks.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import User, AbeAttribute, ReencryptionJob, ClientCompany
from app.schemas.schemas import (
    ReencryptionTriggerRequest, ReencryptionJobResponse, AttributeBumpRequest, AttributeBumpResponse
)
from app.api.deps import get_current_admin_user
from app.crypto.attribute_manager import attribute_manager

router = APIRouter()


@router.get("/", response_model=List[dict])
def list_attributes(
    attribute_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Lists CP-ABE attribute tokens managed by the Attribute Authority (DD-05)."""
    query = db.query(AbeAttribute)
    if attribute_type:
        query = query.filter(AbeAttribute.attribute_type == attribute_type.upper())
    if status_filter:
        query = query.filter(AbeAttribute.status == status_filter.lower())
    attrs = query.order_by(AbeAttribute.attribute_type, desc(AbeAttribute.version)).all()
    return [
        {
            "id": a.id,
            "token": a.token,
            "attribute_type": a.attribute_type,
            "ref_code": a.ref_code,
            "version": a.version,
            "status": a.status,
            "created_at": a.created_at
        }
        for a in attrs
    ]


@router.post("/bump-version", response_model=AttributeBumpResponse)
def bump_attribute_version(
    req: AttributeBumpRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Retires current attribute version and generates version v+1 (SEC-05, DD-05)."""
    old_attr, new_attr = attribute_manager.bump_attribute_version(
        db=db,
        attribute_type=req.attribute_type,
        ref_code=req.ref_code,
        admin_user_id=admin_user.id
    )
    return {
        "attribute_type": req.attribute_type.upper(),
        "ref_code": req.ref_code.upper(),
        "old_token": old_attr.token,
        "new_token": new_attr.token,
        "old_version": old_attr.version,
        "new_version": new_attr.version
    }


@router.post("/reencrypt", response_model=ReencryptionJobResponse)
def trigger_batch_reencryption(
    req: ReencryptionTriggerRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Triggers background re-encryption of historical records under the new attribute version (OI-16).
    Applies the defined batching policy (default 50 records per batch) with progress tracking.
    """
    comp = db.query(ClientCompany).filter(ClientCompany.code == req.company_code).first()
    if not comp:
        raise HTTPException(status_code=404, detail=f"Company with code '{req.company_code}' not found.")

    res = attribute_manager.reencrypt_records_job(
        db=db,
        company_code=req.company_code,
        old_version=req.old_version,
        new_version=req.new_version,
        admin_user_id=admin_user.id,
        batch_size=req.batch_size or 50
    )

    if res.get("status") == "FAILED":
        raise HTTPException(status_code=400, detail=res.get("error", "Re-encryption job failed."))

    job = db.query(ReencryptionJob).filter(ReencryptionJob.id == res["job_id"]).first()
    pct = (job.processed_records / job.total_records * 100.0) if job.total_records > 0 else 100.0
    return {
        "id": job.id,
        "company_code": job.company_code,
        "old_version": job.old_version,
        "new_version": job.new_version,
        "batch_size": job.batch_size,
        "total_records": job.total_records,
        "processed_records": job.processed_records,
        "progress_percent": round(pct, 2),
        "status": job.status,
        "error_message": job.error_message,
        "created_at": job.created_at,
        "completed_at": job.completed_at
    }


@router.get("/reencryption-jobs", response_model=List[ReencryptionJobResponse])
def list_reencryption_jobs(
    company_code: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Lists re-encryption jobs and their progress/batch status (OI-16)."""
    query = db.query(ReencryptionJob)
    if company_code:
        query = query.filter(ReencryptionJob.company_code == company_code)
    jobs = query.order_by(desc(ReencryptionJob.created_at)).all()

    resp = []
    for job in jobs:
        pct = (job.processed_records / job.total_records * 100.0) if job.total_records > 0 else 100.0
        resp.append({
            "id": job.id,
            "company_code": job.company_code,
            "old_version": job.old_version,
            "new_version": job.new_version,
            "batch_size": job.batch_size,
            "total_records": job.total_records,
            "processed_records": job.processed_records,
            "progress_percent": round(pct, 2),
            "status": job.status,
            "error_message": job.error_message,
            "created_at": job.created_at,
            "completed_at": job.completed_at
        })
    return resp


@router.get("/reencryption-jobs/{job_id}", response_model=ReencryptionJobResponse)
def get_reencryption_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Gets real-time status and progress percentage for a specific re-encryption job (OI-16)."""
    job = db.query(ReencryptionJob).filter(ReencryptionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Re-encryption job not found.")

    pct = (job.processed_records / job.total_records * 100.0) if job.total_records > 0 else 100.0
    return {
        "id": job.id,
        "company_code": job.company_code,
        "old_version": job.old_version,
        "new_version": job.new_version,
        "batch_size": job.batch_size,
        "total_records": job.total_records,
        "processed_records": job.processed_records,
        "progress_percent": round(pct, 2),
        "status": job.status,
        "error_message": job.error_message,
        "created_at": job.created_at,
        "completed_at": job.completed_at
    }
