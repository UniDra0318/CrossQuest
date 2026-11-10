from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
import csv
import io
import json
from app.services.pdf_generator import pdf_generator
from app.anomaly.detector import anomaly_detector, clear_rule_cache
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import AnomalyAlert, AccessLog, User
from app.schemas.schemas import (
    AnomalyAlertResponse, AnomalyAlertReviewRequest, AccessLogResponse,
    RetentionJobRequest, RetentionJobResponse, RetentionWarningItem,
    RuleApproveRequest
)
from app.services.retention_service import run_retention_purge, get_retention_warnings
from app.api.deps import get_current_admin_user

router = APIRouter()


@router.get("/report")
def get_executive_anomaly_report(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Generates an aggregated executive platform posture and access anomaly incident audit report (OI-29, OI-30)."""
    alerts = db.query(AnomalyAlert).order_by(desc(AnomalyAlert.created_at)).all()
    total_alerts = len(alerts)
    unreviewed_alerts = len([a for a in alerts if a.status != "CLOSED"])
    closed_alerts = len([a for a in alerts if a.status == "CLOSED"])
    high_severity_count = len([a for a in alerts if (a.severity_final or a.severity) == "HIGH"])
    medium_severity_count = len([a for a in alerts if (a.severity_final or a.severity) == "MEDIUM"])
    low_severity_count = len([a for a in alerts if (a.severity_final or a.severity) == "LOW"])
    after_hours_count = len([a for a in alerts if a.after_hours_tag])

    # Rule breakdown
    from app.models.entities import AnomalyRule
    rules = db.query(AnomalyRule).all()
    rule_counts = {}
    for a in alerts:
        rc = a.rule_code or "UNKNOWN"
        rule_counts[rc] = rule_counts.get(rc, 0) + 1

    rules_breakdown = []
    for r in rules:
        code = r.rule_code
        params = r.parameters or {}
        max_events = params.get('max_attempts') or params.get('max_failed_logins') or params.get('max_views') or params.get('max_reports') or params.get('max_edits') or 1
        threshold_info = f"{max_events} events"
        rules_breakdown.append({
            "rule_code": code,
            "name": r.description or code,
            "severity": "HIGH" if "DELETION" in code else "MEDIUM",
            "threshold": threshold_info,
            "count": rule_counts.get(code, 0)
        })
    if not rules_breakdown:
        for rc, cnt in rule_counts.items():
            rules_breakdown.append({
                "rule_code": rc,
                "name": rc.replace("_", " "),
                "severity": "HIGH" if "DELETION" in rc else "MEDIUM",
                "threshold": "Threshold configured",
                "count": cnt
            })

    recent_alerts = []
    for a in alerts[:25]:
        recent_alerts.append({
            "id": a.id,
            "rule_code": a.rule_code,
            "severity": a.severity_final or a.severity,
            "status": a.status,
            "description": a.description,
            "created_at": a.created_at.isoformat() if a.created_at else "",
            "after_hours_tag": a.after_hours_tag,
            "disposition": a.disposition
        })

    # Resolve co-administrator from database for dual-admin peer review sign-off
    co_admin = db.query(User).filter(User.role == "admin", User.is_active == True, User.id != admin_user.id).first()
    co_admin_name = co_admin.full_name if (co_admin and co_admin.full_name) else "Authorized Co-Administrator"
    co_admin_title = (getattr(co_admin, "title", None) if co_admin else None) or "Co-Administrator (Peer Review Authority)"

    primary_title = getattr(admin_user, "title", None) or "Principal Consultant & Primary Administrator"

    return {
        "generated_at": datetime.now().strftime("%B %d, %Y %H:%M PHT"),
        "generated_by": f"{admin_user.full_name} ({primary_title})",
        "primary_admin_name": admin_user.full_name or "Primary Administrator",
        "primary_admin_title": primary_title,
        "co_admin_name": co_admin_name,
        "co_admin_title": co_admin_title,
        "total_alerts": total_alerts,
        "unreviewed_alerts": unreviewed_alerts,
        "closed_alerts": closed_alerts,
        "high_severity_count": high_severity_count,
        "medium_severity_count": medium_severity_count,
        "low_severity_count": low_severity_count,
        "after_hours_count": after_hours_count,
        "rules_breakdown": rules_breakdown,
        "recent_alerts": recent_alerts
    }


@router.get("/report/pdf")
def download_executive_anomaly_report_pdf(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Generates and downloads the official ReportLab Executive Anomaly & Platform Posture PDF Audit Report."""
    report_data = get_executive_anomaly_report(db=db, admin_user=admin_user)
    pdf_bytes = pdf_generator.generate_anomaly_report_pdf(report_data)
    
    filename = f"CrossQuest_Security_Anomaly_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/report/csv")
def download_anomaly_alerts_csv(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Exports all anomaly alerts into a CSV audit log."""
    alerts = db.query(AnomalyAlert).order_by(desc(AnomalyAlert.created_at)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Alert ID", "Created At (UTC)", "Rule Code", "Severity Base", 
        "Severity Final", "Status", "After Hours", "Subject User ID", "Description", "Disposition"
    ])
    for a in alerts:
        writer.writerow([
            a.id,
            a.created_at.isoformat() if a.created_at else "",
            a.rule_code,
            a.severity_base or a.severity,
            a.severity_final or a.severity,
            a.status,
            "YES" if a.after_hours_tag else "NO",
            a.subject_user_id or "",
            a.description or "",
            a.disposition or ""
        ])
    output.seek(0)
    filename = f"CrossQuest_Anomaly_Ledger_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


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
    """Administrator review of an anomaly alert with Peer Review enforcement (Section 3.7.5, OI-30).
    
    Transitions:
    - NEW -> UNDER_REVIEW
    - NEW / UNDER_REVIEW -> AWAITING_UNINVOLVED_ADMIN (when an involved admin must recuse or both are flagged)
    - UNDER_REVIEW / NEW / AWAITING_UNINVOLVED_ADMIN -> CLOSED with required disposition & review note:
        * CLOSED_EXPECTED_ACTIVITY
        * CLOSED_FOLLOW_UP_REQUIRED
    """
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Anomaly alert not found")

    # Closed alerts are immutable: no reopening, re-closing, or overwriting disposition/note/reviewer (Table 15, OI-30)
    if alert.status == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Closed alerts are immutable and cannot be reopened or re-reviewed."
        )

    # 1. Peer Review check (OI-30):
    # An Administrator cannot review or resolve an alert where they are the subject (subject_user_id != self)
    if alert.subject_user_id and alert.subject_user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of interest: Administrators cannot review or close alerts where they are the subject (OI-30). A peer Administrator must review this alert."
        )

    # 2. Check if alert is awaiting uninvolved administrator
    meta = alert.metadata_info or {}
    involved_admins = meta.get("involved_admin_ids", [])
    if alert.status == "AWAITING_UNINVOLVED_ADMIN":
        if admin_user.id in involved_admins or alert.subject_user_id == admin_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conflict of interest: Administrator is implicated in this alert. Only an uninvolved Administrator can review an alert in AWAITING_UNINVOLVED_ADMIN state (OI-30)."
            )

    new_status = review_in.status.upper()
    if new_status not in ("UNDER_REVIEW", "AWAITING_UNINVOLVED_ADMIN", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'UNDER_REVIEW', 'AWAITING_UNINVOLVED_ADMIN', or 'CLOSED'."
        )

    if new_status == "AWAITING_UNINVOLVED_ADMIN":
        if not review_in.review_note or not review_in.review_note.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A review note explaining why peer or uninvolved administrator review is required is mandatory."
            )
        # Store involved admin IDs if provided
        inv = list(review_in.involved_admin_ids or [])
        if alert.subject_user_id and alert.subject_user_id not in inv:
            inv.append(alert.subject_user_id)
        if admin_user.id not in inv:
            inv.append(admin_user.id)
        alert.metadata_info = {**meta, "involved_admin_ids": inv}

    if new_status == "CLOSED":
        if review_in.disposition not in ("CLOSED_EXPECTED_ACTIVITY", "CLOSED_FOLLOW_UP_REQUIRED"):
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


@router.get("/logs/csv")
def download_access_logs_csv(
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Exports immutable security audit trail logs into an official CSV report (SEC-12, SEC-13)."""
    query = db.query(AccessLog).order_by(desc(AccessLog.occurred_at))
    if limit and limit > 0:
        query = query.limit(limit)
    logs = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Log ID", "Occurred At (UTC)", "Actor User ID", "Actor Role",
        "Event Type", "Resource Type", "Resource ID", "Outcome",
        "Reason Code", "Source IP", "Details"
    ])
    for l in logs:
        det_str = json.dumps(l.details) if l.details else ""
        writer.writerow([
            l.id,
            l.occurred_at.isoformat() if l.occurred_at else "",
            l.actor_user_id or "",
            l.actor_role or "",
            l.event_type or "",
            l.resource_type or "",
            l.resource_id or "",
            l.outcome or "",
            l.reason_code or "",
            l.source_ip or "",
            det_str
        ])
    output.seek(0)
    filename = f"CrossQuest_Master_Audit_Trail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.delete("/alerts/{alert_id}")
def delete_alert_forbidden():
    """Alerts cannot be deleted by design (Chapter III Section 3.7.5)."""
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Alerts cannot be deleted by design. They must be reviewed and closed with an auditable disposition."
    )


# --- Rule Parameter & Approval Management (TC-ANO-20) ---
from app.models.entities import AnomalyRule
from app.schemas.schemas import AnomalyRuleResponse, AnomalyRuleUpdate, AnomalyRuleBatchRequest


def validate_rule_parameters(rule_code: str, params: Optional[dict]):
    """Server-side validation for threshold parameters per Chapter 3 Table 13 (OI-08, A5)."""
    if not params:
        return
    # S1_AFTER_HOURS limits
    if rule_code == "S1_AFTER_HOURS" or ("start_hour" in params and "end_hour" in params):
        start_h = params.get("start_hour")
        end_h = params.get("end_hour")
        if start_h is not None and end_h is not None:
            try:
                start_h = int(start_h)
                end_h = int(end_h)
            except (ValueError, TypeError):
                raise HTTPException(status_code=422, detail="Hours must be valid integers.")
            if not (0 <= start_h <= 23 and 0 <= end_h <= 23 and start_h < end_h):
                raise HTTPException(
                    status_code=422, 
                    detail="Start hour and end hour must be between 0 and 23 with start_hour strictly less than end_hour."
                )

    # Window minutes limits
    if "window_minutes" in params:
        try:
            wm = int(params["window_minutes"])
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Window minutes must be a valid integer.")
        if not (1 <= wm <= 10080):
            raise HTTPException(status_code=422, detail="Window minutes must be between 1 and 10080 (up to 7 days).")

    # Threshold limits
    if "threshold" in params:
        try:
            th = int(params["threshold"])
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Threshold must be a valid integer.")
        if not (1 <= th <= 10000):
            raise HTTPException(status_code=422, detail="Threshold must be between 1 and 10000.")

    # Table 13 R3_HIGH_RECORD_ACCESS role-based thresholds (OI-08, A5)
    if "thresholds" in params and isinstance(params["thresholds"], dict):
        for role_name, r_thresh in params["thresholds"].items():
            try:
                r_val = int(r_thresh)
            except (ValueError, TypeError):
                raise HTTPException(status_code=422, detail=f"Role threshold for '{role_name}' must be an integer.")
            if not (1 <= r_val <= 1000):
                raise HTTPException(
                    status_code=422,
                    detail=f"Role threshold for '{role_name}' must be between 1 and 1000 records (Table 13)."
                )

    # Table 13 R2_FAILED_LOGINS_IP distinct usernames threshold (A5)
    if "distinct_usernames_threshold" in params:
        try:
            dut = int(params["distinct_usernames_threshold"])
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Distinct usernames threshold must be an integer.")
        if not (1 <= dut <= 100):
            raise HTTPException(
                status_code=422,
                detail="Distinct usernames threshold must be between 1 and 100 distinct accounts."
            )


DEFAULT_RULES = [
    {"rule_code": "R1_OUT_OF_SCOPE", "parameters": {"threshold": 1, "window_minutes": 1440, "severity": "LOW"}, "description": "Single out-of-scope attempt aggregated daily"},
    {"rule_code": "R1_REPEATED_OUT_OF_SCOPE", "parameters": {"threshold": 3, "window_minutes": 15, "severity": "MEDIUM"}, "description": "Repeated out-of-scope attempts in 15 min"},
    {"rule_code": "R2_FAILED_LOGINS_ACCOUNT", "parameters": {"threshold": 5, "window_minutes": 10, "severity": "MEDIUM"}, "description": "Failed logins for single account"},
    {"rule_code": "R2_FAILED_LOGINS_IP", "parameters": {"threshold": 10, "distinct_usernames_threshold": 2, "window_minutes": 10, "severity": "MEDIUM"}, "description": "Failed logins for single IP (>=10 failures across >=2 distinct usernames in 10 min)"},
    {"rule_code": "R3_HIGH_RECORD_ACCESS", "parameters": {"thresholds": {"account_manager": 25, "trainer": 25, "finance": 50, "admin": 50, "trainee": 15}, "window_minutes": 15}, "description": "High distinct record access"},
    {"rule_code": "R3_REPORT_BURSTS", "parameters": {"threshold": 5, "window_minutes": 60, "severity": "MEDIUM"}, "description": "Report generation bursts"},
    {"rule_code": "R4_RECORD_DELETION", "parameters": {"threshold": 1, "severity": "HIGH"}, "description": "Soft deletion of client data"},
    {"rule_code": "R4_RECORD_EDIT", "parameters": {"threshold": 1, "severity": "LOW"}, "description": "Edit of client data"},
    {"rule_code": "R4_BULK_EDIT", "parameters": {"threshold": 10, "window_minutes": 15, "severity": "MEDIUM"}, "description": "Bulk record edits in 15 min"},
    {"rule_code": "S1_AFTER_HOURS", "parameters": {"start_hour": 9, "end_hour": 18, "tz": "Asia/Manila"}, "description": "After-hours supporting indicator"}
]


@router.get("/rules", response_model=List[AnomalyRuleResponse])
def get_anomaly_rules(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Lists anomaly detection rules and their approval status (Figure 10, Table 13)."""
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


@router.put("/rules-batch", response_model=List[AnomalyRuleResponse])
def batch_update_anomaly_rules(
    batch_in: AnomalyRuleBatchRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Administrator atomically updates multiple anomaly detection rule parameters (A6, OI-08).
    All updates succeed together or fail completely with atomic rollback.
    """
    if not batch_in.reason or not batch_in.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mandatory audit reason is required when modifying anomaly rule thresholds (OI-08, A2)."
        )

    clean_reason = batch_in.reason.strip()
    if not batch_in.rules:
        raise HTTPException(status_code=422, detail="At least one rule update must be provided.")

    # 1. Validate all rules upfront before modifying database (A5)
    for item in batch_in.rules:
        validate_rule_parameters(item.rule_code, item.parameters)

    updated_rules = []
    try:
        for item in batch_in.rules:
            rule = db.query(AnomalyRule).filter(AnomalyRule.rule_code == item.rule_code).first()
            old_params = {}
            old_v = 0
            if not rule:
                rule = AnomalyRule(
                    rule_code=item.rule_code,
                    parameters=item.parameters or {},
                    version_no=1,
                    client_reviewed=False,
                    last_edited_by_user_id=admin_user.id,
                    description=item.rule_code.replace('_', ' ').title()
                )
                db.add(rule)
            else:
                old_params = dict(rule.parameters or {})
                old_v = rule.version_no
                rule.parameters = item.parameters
                rule.version_no += 1
                rule.last_edited_by_user_id = admin_user.id
                # When parameters are changed, re-approval by Crossworks is required (A3)
                rule.client_reviewed = False

            log = AccessLog(
                actor_user_id=admin_user.id,
                actor_role=admin_user.role,
                event_type="RULE_MODIFIED",
                resource_type="ANOMALY_RULE",
                resource_id=rule.id,
                outcome="SUCCESS",
                details={
                    "rule_code": item.rule_code,
                    "old_parameters": old_params,
                    "new_parameters": rule.parameters,
                    "old_version": old_v,
                    "new_version": rule.version_no,
                    "client_reviewed": False,
                    "last_edited_by_user_id": admin_user.id,
                    "reason": clean_reason
                }
            )
            db.add(log)
            updated_rules.append(rule)

        db.commit()
        clear_rule_cache()
        for r in updated_rules:
            db.refresh(r)
        return updated_rules
    except Exception as err:
        db.rollback()
        if isinstance(err, HTTPException):
            raise err
        raise HTTPException(status_code=500, detail=f"Failed to batch update rules: {str(err)}")


@router.put("/rules/{rule_code}", response_model=AnomalyRuleResponse)
def update_anomaly_rule(
    rule_code: str,
    update_in: AnomalyRuleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Administrator updates rule thresholds/parameters and manages review approval (TC-ANO-20, OI-08)."""
    # Reject blank reasons with 422 (A2)
    clean_reason = (update_in.reason or update_in.description or "").strip()
    if not clean_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mandatory audit reason is required when modifying anomaly rule thresholds (OI-08, A2)."
        )

    # Validate parameters server-side (A5)
    validate_rule_parameters(rule_code, update_in.parameters)

    rule = db.query(AnomalyRule).filter(AnomalyRule.rule_code == rule_code).first()
    old_params = {}
    old_v = 0
    if not rule:
        # Create if not existing
        rule = AnomalyRule(
            rule_code=rule_code,
            parameters=update_in.parameters or {},
            version_no=1,
            client_reviewed=False,  # new rules always start Pending Review; approval needs a different admin (OI-08)
            last_edited_by_user_id=admin_user.id,
            description=update_in.description
        )
        db.add(rule)
    else:
        old_params = dict(rule.parameters or {})
        old_v = rule.version_no
        if update_in.parameters is not None:
            rule.parameters = update_in.parameters
            rule.version_no += 1
            rule.last_edited_by_user_id = admin_user.id
            # A3 & OI-08: Any parameter edit ALWAYS resets client_reviewed to False (Pending Review).
            # An administrator tuning a rule cannot self-approve in the same edit call.
            rule.client_reviewed = False
        elif update_in.client_reviewed is not None:
            if update_in.client_reviewed and rule.last_edited_by_user_id == admin_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Conflict of interest: An administrator cannot approve their own rule threshold edits. Independent peer administrator review is required (U-16, OI-08)."
                )
            rule.client_reviewed = update_in.client_reviewed
        if update_in.description is not None:
            rule.description = update_in.description

    # Audit log with comprehensive parameter delta for Crossworks review (OI-08)
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="RULE_APPROVED" if (update_in.parameters is None and update_in.client_reviewed is True and rule.client_reviewed) else "RULE_MODIFIED",
        resource_type="ANOMALY_RULE",
        resource_id=rule.id,
        outcome="SUCCESS",
        details={
            "rule_code": rule_code,
            "old_parameters": old_params,
            "new_parameters": rule.parameters,
            "old_version": old_v,
            "new_version": rule.version_no,
            "client_reviewed": rule.client_reviewed,
            "last_edited_by_user_id": admin_user.id,
            "reason": clean_reason
        }
    )
    db.add(log)
    db.commit()
    clear_rule_cache()
    db.refresh(rule)
    return rule


@router.post("/rules/{rule_code}/approve", response_model=AnomalyRuleResponse)
@router.post("/rules/{rule_code}/review", response_model=AnomalyRuleResponse)
def approve_rule_review(
    rule_code: str,
    approve_in: Optional[RuleApproveRequest] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Separate Crossworks Review & Approval step (A3, OI-08).
    Approves and freezes an anomaly detection rule version after independent peer review.
    Refuses self-approval from the same administrator who last modified the rule (403 Forbidden).
    """
    rule = db.query(AnomalyRule).filter(AnomalyRule.rule_code == rule_code).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Anomaly rule not found.")

    # Independent peer administrator check: the administrator who edited this rule cannot approve it (U-16, OI-08)
    if rule.last_edited_by_user_id and rule.last_edited_by_user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of interest: An administrator cannot approve their own rule threshold edits. Independent peer administrator review is required (U-16, OI-08)."
        )

    clean_reason = (approve_in.reason if approve_in and approve_in.reason else "Independent Crossworks review approval confirmed (OI-08)").strip()

    rule.client_reviewed = True

    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="RULE_APPROVED",
        resource_type="ANOMALY_RULE",
        resource_id=rule.id,
        outcome="SUCCESS",
        details={
            "rule_code": rule_code,
            "version": rule.version_no,
            "client_reviewed": True,
            "reviewer_id": admin_user.id,
            "reason": clean_reason
        }
    )
    db.add(log)
    db.commit()
    clear_rule_cache()
    db.refresh(rule)
    return rule


@router.post("/rules-batch/approve", response_model=List[AnomalyRuleResponse])
def batch_approve_rules(
    approve_in: Optional[RuleApproveRequest] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Atomically approves all pending anomaly detection rules after peer review (A3, OI-08).
    Refuses approval if the current administrator was the last editor of any pending rule (403 Forbidden).
    """
    pending_rules = db.query(AnomalyRule).filter(AnomalyRule.client_reviewed == False).all()
    if not pending_rules:
        return db.query(AnomalyRule).all()

    # Verify no conflict of interest for any pending rule
    for r in pending_rules:
        if r.last_edited_by_user_id and r.last_edited_by_user_id == admin_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Conflict of interest: Administrator {admin_user.email} edited rule '{r.rule_code}' and cannot self-approve. Peer administrator review required (U-16, OI-08)."
            )

    clean_reason = (approve_in.reason if approve_in and approve_in.reason else "Independent Crossworks review approval confirmed (OI-08)").strip()
    for r in pending_rules:
        r.client_reviewed = True
        log = AccessLog(
            actor_user_id=admin_user.id,
            actor_role=admin_user.role,
            event_type="RULE_APPROVED",
            resource_type="ANOMALY_RULE",
            resource_id=r.id,
            outcome="SUCCESS",
            details={
                "rule_code": r.rule_code,
                "version": r.version_no,
                "client_reviewed": True,
                "reviewer_id": admin_user.id,
                "reason": clean_reason
            }
        )
        db.add(log)

    db.commit()
    clear_rule_cache()
    for r in pending_rules:
        db.refresh(r)
    return db.query(AnomalyRule).all()


# --- 12-Month Audit & Anomaly Retention Endpoints (OI-20) ---

@router.post("/retention/run", response_model=RetentionJobResponse)
def trigger_retention_job(
    req: RetentionJobRequest = RetentionJobRequest(),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Executes 12-month data retention job, purging old audit logs and closed alerts,
    and generating proactive warnings for alerts approaching the 12-month limit (OI-20).
    """
    res = run_retention_purge(
        db=db,
        retention_days=req.retention_days,
        warning_days=req.warning_days,
        triggered_by_user_id=admin_user.id
    )
    return res


@router.get("/retention/warnings", response_model=List[RetentionWarningItem])
def list_retention_warnings(
    retention_days: int = 365,
    warning_days: int = 30,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Lists open anomaly alerts within 30 days of the 12-month retention disposal limit."""
    return get_retention_warnings(db=db, retention_days=retention_days, warning_days=warning_days)
