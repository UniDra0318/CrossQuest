from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.entities import ClientCompany, TrainingRecord, Trainee, Certificate
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/company/{company_code}")
def generate_company_report(
    company_code: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generates an auditable training report for a client company backed by attribute data separation."""
    company = db.query(ClientCompany).filter(ClientCompany.code == company_code.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Access control: ensure non-admin has this company assigned
    if current_user.role != "admin" and not current_user.is_superuser:
        if company.code not in (current_user.assigned_client_accounts or []):
            raise HTTPException(status_code=403, detail="Not authorized to access reports for this company")

    records = (
        db.query(TrainingRecord)
        .filter(TrainingRecord.company_at_completion_id == company.id)
        .all()
    )

    total_records = len(records)
    completed_count = sum(1 for r in records if r.status == "completed")
    avg_score = (
        sum((r.score or 0) for r in records if r.score is not None) / max(1, total_records)
    )

    return {
        "client_company": {
            "code": company.code,
            "name": company.name,
            "industry": company.industry
        },
        "summary": {
            "total_records": total_records,
            "completed_trainings": completed_count,
            "average_score": round(avg_score, 2),
            "compliance_rate": f"{round((completed_count / max(1, total_records)) * 100, 1)}%"
        },
        "records": [
            {
                "record_id": r.id,
                "trainee_id": r.trainee_id,
                "course_name": r.course_name,
                "status": r.status,
                "score": r.score,
                "is_encrypted": r.is_encrypted,
                "encryption_policy": r.encryption_policy
            }
            for r in records
        ]
    }
