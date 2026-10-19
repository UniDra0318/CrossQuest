from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import ClientCompany, TrainingRecord, Trainee, Certificate, User, AccessLog
from app.api.deps import get_current_user
from app.anomaly.detector import anomaly_detector

router = APIRouter()

def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


@router.get("/company/{company_code}")
def generate_client_report(
    company_code: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generates an on-demand client-specific training report (FR-20, DAT-06, Section 3.8.4).
    
    Permissions (Table 16, OI-04):
    - Account Manager: permitted ONLY for currently assigned client companies.
    - Admin: permitted for oversight.
    - Other roles: denied.
    """
    company = db.query(ClientCompany).filter(ClientCompany.code == company_code.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail="Client company not found")

    client_ip = _get_client_ip(request)

    # Scoping check (SEC-10)
    if current_user.role == "account_manager":
        if company.code not in (current_user.assigned_client_accounts or []):
            # Out-of-scope attempt
            log = AccessLog(
                actor_user_id=current_user.id,
                actor_role=current_user.role,
                event_type="ACCESS_DENIED",
                resource_type="REPORT",
                company_id=company.id,
                outcome="DENIED",
                reason_code="OUT_OF_SCOPE",
                source_ip=client_ip,
                details={"target_company": company.code}
            )
            db.add(log)
            db.commit()
            anomaly_detector.record_out_of_scope_attempt(current_user, f"REPORT:{company.code}", company.code, db)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not authorized to generate reports for unassigned company '{company.code}'."
            )
    elif current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Report generation is restricted to authorized Account Managers."
        )

    # Query training records for this client company under RLS / scoping logic
    records = (
        db.query(TrainingRecord, Trainee)
        .join(Trainee, TrainingRecord.trainee_id == Trainee.id)
        .filter(
            TrainingRecord.company_at_completion_id == company.id,
            TrainingRecord.deleted_at == None
        )
        .order_by(TrainingRecord.completion_date.desc().nullslast())
        .all()
    )

    total_records = len(records)
    completed_count = sum(1 for r, _ in records if r.status == "Completed")
    avg_score = (
        sum((r.score or 0) for r, _ in records if r.score is not None) / max(1, total_records)
    )

    # Log report generation (SEC-12, Table 19)
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="REPORT_GENERATED",
        resource_type="REPORT",
        company_id=company.id,
        outcome="SUCCESS",
        source_ip=client_ip,
        details={"company_code": company.code, "record_count": total_records}
    )
    db.add(log)
    db.commit()

    # Check for report bursts (R3-b)
    anomaly_detector.check_report_bursts(current_user, db)

    # Proposed layout (Section 3.8.4, OI-10): header + training, training date, trainee table
    return {
        "header": {
            "client_name": company.name,
            "client_code": company.code,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generated_by_user": current_user.full_name,
            "user_role": current_user.role
        },
        "summary": {
            "total_records": total_records,
            "completed_trainings": completed_count,
            "average_score": round(avg_score, 2),
            "compliance_rate": f"{round((completed_count / max(1, total_records)) * 100, 1)}%"
        },
        "trainees": [
            {
                "record_id": r.id,
                "trainee_code": t.trainee_code,
                "trainee_name": f"{t.first_name} {t.last_name}",
                "course_name": r.course_name,
                "training_date": r.completion_date.strftime("%Y-%m-%d") if r.completion_date else "In progress",
                "status": r.status,
                "score": r.score
            }
            for r, t in records
        ]
    }
