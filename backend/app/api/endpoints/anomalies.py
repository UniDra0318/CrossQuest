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


# --- Rule Parameter & Approval Management (TC-ANO-20) ---
from app.models.entities import AnomalyRule
from app.schemas.schemas import AnomalyRuleResponse, AnomalyRuleUpdate


DEFAULT_RULES = [
    {"rule_code": "R1_OUT_OF_SCOPE", "parameters": {"threshold": 1, "window_minutes": 1440, "severity": "LOW"}, "description": "Single out-of-scope attempt aggregated daily"},
    {"rule_code": "R1_REPEATED_OUT_OF_SCOPE", "parameters": {"threshold": 3, "window_minutes": 15, "severity": "MEDIUM"}, "description": "Repeated out-of-scope attempts in 15 min"},
    {"rule_code": "R2_FAILED_LOGINS_ACCOUNT", "parameters": {"threshold": 5, "window_minutes": 10, "severity": "MEDIUM"}, "description": "Failed logins for single account"},
    {"rule_code": "R2_FAILED_LOGINS_IP", "parameters": {"threshold": 10, "window_minutes": 10, "severity": "MEDIUM"}, "description": "Failed logins for single IP"},
    {"rule_code": "R3_HIGH_RECORD_ACCESS", "parameters": {"thresholds": {"account_manager": 25, "trainer": 25, "finance": 50, "admin": 50, "trainee": 15}, "window_minutes": 15}, "description": "High distinct record access"},
    {"rule_code": "R3_REPORT_BURSTS", "parameters": {"threshold": 5, "window_minutes": 60, "severity": "MEDIUM"}, "description": "Report generation bursts"},
    {"rule_code": "R4_RECORD_DELETION", "parameters": {"threshold": 1, "severity": "HIGH"}, "description": "Soft deletion of client data"},
    {"rule_code": "R4_RECORD_EDIT", "parameters": {"threshold": 1, "severity": "LOW"}, "description": "Edit of client data"},
    {"rule_code": "R4_BULK_EDIT", "parameters": {"threshold": 10, "window_minutes": 15, "severity": "MEDIUM"}, "description": "Bulk record edits in 15 min"},
    {"rule_code": "S1_AFTER_HOURS", "parameters": {"start_hour": 9, "end_hour": 18, "tz": "UTC+8"}, "description": "After-hours supporting indicator"}
]


@router.get("/rules", response_model=List[AnomalyRuleResponse])
def get_anomaly_rules(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Lists anomaly detection rules and their approval status (Figure 10, Table 22)."""
    rules = db.query(AnomalyRule).all()
    if not rules:
        # Seed default rules
        for r_data in DEFAULT_RULES:
            rule = AnomalyRule(
                rule_code=r_data["rule_code"],
                parameters=r_data["parameters"],
                version_no=1,
                client_reviewed=True,
                description=r_data["description"]
            )
            db.add(rule)
        db.commit()
        rules = db.query(AnomalyRule).all()
    return rules


@router.put("/rules/{rule_code}", response_model=AnomalyRuleResponse)
def update_anomaly_rule(
    rule_code: str,
    update_in: AnomalyRuleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Administrator updates rule thresholds/parameters and manages review approval (TC-ANO-20)."""
    rule = db.query(AnomalyRule).filter(AnomalyRule.rule_code == rule_code).first()
    if not rule:
        # Create if not existing
        rule = AnomalyRule(
            rule_code=rule_code,
            parameters=update_in.parameters or {},
            version_no=1,
            client_reviewed=update_in.client_reviewed if update_in.client_reviewed is not None else False,
            description=update_in.description
        )
        db.add(rule)
    else:
        if update_in.parameters is not None:
            rule.parameters = update_in.parameters
            rule.version_no += 1
        if update_in.client_reviewed is not None:
            rule.client_reviewed = update_in.client_reviewed
        if update_in.description is not None:
            rule.description = update_in.description

    # Audit log
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="RULE_MODIFIED",
        resource_type="ANOMALY_RULE",
        resource_id=rule.id,
        outcome="SUCCESS",
        details={"rule_code": rule_code, "version": rule.version_no, "client_reviewed": rule.client_reviewed}
    )
    db.add(log)
    db.commit()
    db.refresh(rule)
    return rule
