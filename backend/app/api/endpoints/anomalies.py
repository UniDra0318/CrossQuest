from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import AnomalyAlert, AccessLog, User
from app.schemas.schemas import AnomalyAlertResponse, AccessLogResponse
from app.api.deps import get_current_admin_user

router = APIRouter()

@router.get("/alerts", response_model=List[AnomalyAlertResponse])
def get_anomaly_alerts(
    unreviewed_only: bool = False,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    query = db.query(AnomalyAlert)
    if unreviewed_only:
        query = query.filter(AnomalyAlert.is_reviewed == False)
    return query.order_by(desc(AnomalyAlert.created_at)).all()


@router.put("/alerts/{alert_id}/review", response_model=AnomalyAlertResponse)
def review_anomaly_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Anomaly alert not found")
    alert.is_reviewed = True
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/logs", response_model=List[AccessLogResponse])
def get_access_logs(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    return db.query(AccessLog).order_by(desc(AccessLog.timestamp)).limit(100).all()
