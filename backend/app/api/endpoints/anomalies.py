from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import AnomalyAlert, AccessLog, User
from app.schemas.schemas import (
    AnomalyAlertResponse, AnomalyAlertReviewRequest, AccessLogResponse
)
from app.api.deps import get_current_admin_user

router = APIRouter()

@router.get("/alerts", response_model=List[AnomalyAlertResponse])
def get_anomaly_alerts(
    status_filter: Optional[str] = None, # NEW, UNDER_REVIEW, CLOSED
    unreviewed_only: bool = False,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Lists anomaly alerts for Administrator review (Section 3.7.5).
    Only Administrators can view or review alerts (FR-21, Table 17).
    """
    query = db.query(AnomalyAlert)
    if unreviewed_only:
        query = query.filter(AnomalyAlert.status != "CLOSED")
    elif status_filter:
        query = query.filter(AnomalyAlert.status == status_filter.upper())
    return query.order_by(desc(AnomalyAlert.created_at)).all()


@router.put("/alerts/{alert_id}/review", response_model=AnomalyAlertResponse)
def review_anomaly_alert(
    alert_id: str,
    review_in: AnomalyAlertReviewRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Administrator review of an anomaly alert (Section 3.7.5).
    
    Transitions:
    - NEW -> UNDER_REVIEW
    - UNDER_REVIEW / NEW -> CLOSED with required disposition & review note:
        * CLOSED_EXPECTED_ACTIVITY
        * CLOSED_FOLLOW_UP_REQUIRED
    """
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Anomaly alert not found")

    new_status = review_in.status.upper()
    if new_status not in ("UNDER_REVIEW", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'UNDER_REVIEW' or 'CLOSED'."
        )

    if new_status == "CLOSED":
        if not review_in.disposition:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A disposition ('CLOSED_EXPECTED_ACTIVITY' or 'CLOSED_FOLLOW_UP_REQUIRED') is required to close an alert."
            )
        if not review_in.review_note or not review_in.review_note.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A review note is strictly required to close an anomaly alert (Section 3.7.5)."
            )
        alert.disposition = review_in.disposition

    alert.status = new_status
    if review_in.review_note:
        alert.review_note = review_in.review_note
    alert.reviewed_by_user_id = admin_user.id
    alert.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # Log review to audit log
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="ALERT_REVIEWED",
        resource_type="ALERT",
        resource_id=alert.id,
        outcome="SUCCESS",
        details={"status": alert.status, "disposition": alert.disposition, "note": alert.review_note}
    )
    db.add(log)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/logs", response_model=List[AccessLogResponse])
def get_access_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Fetches append-only audit log entries for Administrator compliance review (SEC-12, SEC-13)."""
    return db.query(AccessLog).order_by(desc(AccessLog.occurred_at)).limit(limit).all()


@router.delete("/alerts/{alert_id}")
def delete_alert_forbidden():
    """Alerts cannot be deleted by design (Chapter III Section 3.7.5)."""
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Alerts cannot be deleted by design. They must be reviewed and closed with an auditable disposition."
    )
