"""Audit and Anomaly Alert Data Retention Service.

Implements Chapter III Section 3.7.5 & OI-20:
- Purges access audit logs older than 12 months (365 days).
- Purges resolved/closed anomaly alerts older than 12 months (365 days).
- Preserves open/unreviewed alerts and proactively warns Administrators 30 days ahead of the 12-month retention window.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.entities import AccessLog, AnomalyAlert
from app.core.config import settings


def run_retention_purge(
    db: Session,
    retention_days: Optional[int] = None,
    warning_days: Optional[int] = None,
    triggered_by_user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Disposes of audit rows and closed alerts older than retention_days (default 365 days / 12 months).
    Identifies open alerts that are older than (retention_days - warning_days) to warn Administrators 30 days ahead.
    """
    retention_days = retention_days or getattr(settings, "AUDIT_RETENTION_DAYS", 365)
    warning_days = warning_days or getattr(settings, "AUDIT_WARNING_DAYS", 30)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    purge_cutoff = now - timedelta(days=retention_days)
    warning_cutoff = now - timedelta(days=retention_days - warning_days)

    # 1. Purge AccessLog older than 12 months
    logs_to_purge = db.query(AccessLog).filter(AccessLog.occurred_at < purge_cutoff)
    purged_logs_count = logs_to_purge.count()
    logs_to_purge.delete(synchronize_session=False)

    # 2. Purge closed AnomalyAlerts older than 12 months
    closed_alerts_to_purge = db.query(AnomalyAlert).filter(
        AnomalyAlert.created_at < purge_cutoff,
        AnomalyAlert.status == "CLOSED"
    )
    purged_alerts_count = closed_alerts_to_purge.count()
    closed_alerts_to_purge.delete(synchronize_session=False)

    # 3. Detect open alerts approaching 12 months (within 30-day window)
    open_alerts_at_risk = db.query(AnomalyAlert).filter(
        AnomalyAlert.status != "CLOSED",
        AnomalyAlert.created_at < warning_cutoff
    ).all()

    warnings = []
    for alert in open_alerts_at_risk:
        age_days = (now - alert.created_at).days
        days_until_disposal_boundary = max(0, retention_days - age_days)
        warnings.append({
            "alert_id": alert.id,
            "rule_code": alert.rule_code,
            "severity": alert.severity_final or alert.severity,
            "status": alert.status,
            "created_at": alert.created_at.isoformat(),
            "age_days": age_days,
            "days_until_retention_limit": days_until_disposal_boundary,
            "warning": f"Alert {alert.id} has been open for {age_days} days and will reach the 12-month retention threshold in {days_until_disposal_boundary} days."
        })

    # 4. Record retention job execution in AccessLog (append-only audit trail)
    retention_log = AccessLog(
        actor_user_id=triggered_by_user_id,
        actor_role="admin",
        event_type="RETENTION_JOB_EXECUTED",
        resource_type="AUDIT_SYSTEM",
        outcome="SUCCESS",
        details={
            "retention_days": retention_days,
            "warning_days": warning_days,
            "purged_logs_count": purged_logs_count,
            "purged_closed_alerts_count": purged_alerts_count,
            "open_alerts_warned_count": len(warnings),
            "purge_cutoff": purge_cutoff.isoformat(),
            "warning_cutoff": warning_cutoff.isoformat()
        }
    )
    db.add(retention_log)
    db.commit()

    return {
        "success": True,
        "purged_logs_count": purged_logs_count,
        "purged_closed_alerts_count": purged_alerts_count,
        "open_alerts_warned_count": len(warnings),
        "warnings": warnings,
        "purge_cutoff": purge_cutoff.isoformat(),
        "warning_cutoff": warning_cutoff.isoformat()
    }


def get_retention_warnings(
    db: Session,
    retention_days: Optional[int] = None,
    warning_days: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Returns list of open anomaly alerts within 30 days of 12-month retention disposal."""
    retention_days = retention_days or getattr(settings, "AUDIT_RETENTION_DAYS", 365)
    warning_days = warning_days or getattr(settings, "AUDIT_WARNING_DAYS", 30)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    warning_cutoff = now - timedelta(days=retention_days - warning_days)

    open_alerts_at_risk = db.query(AnomalyAlert).filter(
        AnomalyAlert.status != "CLOSED",
        AnomalyAlert.created_at < warning_cutoff
    ).all()

    warnings = []
    for alert in open_alerts_at_risk:
        age_days = (now - alert.created_at).days
        days_until_limit = max(0, retention_days - age_days)
        warnings.append({
            "alert_id": alert.id,
            "rule_code": alert.rule_code,
            "severity": alert.severity_final or alert.severity,
            "status": alert.status,
            "created_at": alert.created_at.isoformat(),
            "age_days": age_days,
            "days_until_retention_limit": days_until_limit,
            "warning": f"Alert {alert.id} has been open for {age_days} days and will reach the 12-month retention threshold in {days_until_limit} days."
        })
    return warnings
