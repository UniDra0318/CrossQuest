"""Access Anomaly Detection Engine for CrossQuest.

Implements rule- and threshold-based anomaly monitoring as defined in
Chapter I (SEC-14, SEC-15, SEC-16) and Chapter III Section 3.7 & Table 20.

Rules:
- R1-a: Out-of-scope attempt (1 event) -> Low alert, aggregated daily.
- R1-b: Repeated out-of-scope attempts (3 events in 15 min) -> Medium alert.
- R2-a: Failed logins, single account (5 in 10 min) -> Medium alert (no lock-out).
- R2-b: Failed logins, single source IP (10 in 10 min) -> Medium alert (no lock-out).
- R3-a: High record access (distinct record-detail views in 15 min) -> Medium alert; High if >= 2x threshold.
        Thresholds by role: AcctMgr 25, Trainer 25, Finance 50, Admin 50, Trainee 15.
        (Note: list/search views are excluded from R3-a).
- R3-b: Report bursts (5 reports generated in 60 min) -> Medium alert.
- R4-a: Deletion of client data (1 event) -> High alert immediately (Crossworks priority).
- R4-b: Edit of client data (1 event) -> Low alert daily digest.
- R4-c: Bulk edit (10 distinct records in 15 min) -> Medium alert.
- S1: After-hours supporting indicator (Mon-Fri 09:00-18:00 Asia/Manila / UTC+8).
      NEVER an alert on its own (SEC-16). Raises severity by 1 level and adds 'after_hours' tag.

Alerts are recorded for Administrator review only (no automatic lock-out, immutable).
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.core.config import settings
from app.models.entities import AccessLog, AnomalyAlert, User, TrainingRecord


# Role-based thresholds for distinct record-detail views within 15 minutes (Table 20, R3-a)
R3_A_THRESHOLDS = {
    "account_manager": 25,
    "trainer": 25,
    "finance": 50,
    "admin": 50,
    "trainee": 15
}

SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def is_after_hours(dt: Optional[datetime] = None) -> bool:
    """Checks if a given UTC datetime falls outside Philippine business hours (Mon-Fri 09:00 - 18:00 UTC+8).
    Chapter III Section 3.7.3: S1 After-hours indicator.
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # Convert UTC to Philippine Time (UTC+8)
    pht = dt.astimezone(timezone(timedelta(hours=8)))
    
    # Check weekend (5=Saturday, 6=Sunday)
    if pht.weekday() >= 5:
        return True
    
    # Check operating hours 09:00 to 18:00
    if pht.hour < 9 or pht.hour >= 18:
        return True
        
    return False


def escalate_severity(base_severity: str) -> str:
    """Raises severity by one level when S1 after-hours indicator applies."""
    try:
        idx = SEVERITY_LEVELS.index(base_severity.upper())
        if idx < len(SEVERITY_LEVELS) - 1:
            return SEVERITY_LEVELS[idx + 1]
    except ValueError:
        pass
    return base_severity


class AccessAnomalyDetector:
    """Evaluates access events against Chapter III Table 20 rules."""

    @staticmethod
    def _create_or_update_alert(
        db: Session,
        rule_code: str,
        base_severity: str,
        description: str,
        subject_user_id: Optional[str] = None,
        metadata_info: Optional[Dict[str, Any]] = None,
        event_time: Optional[datetime] = None
    ) -> AnomalyAlert:
        """Applies S1 supporting indicator, aggregation window, and registers alert."""
        metadata = metadata_info or {}
        now = event_time or datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Evaluate S1 after-hours indicator
        after_hours = is_after_hours(now)
        severity = base_severity
        tags = []
        if after_hours:
            severity = escalate_severity(base_severity)
            tags.append("after_hours")

        # Check for open alert to aggregate within today (R1-a, R4-b daily aggregation)
        today_start = datetime(now.year, now.month, now.day)
        existing_alert = (
            db.query(AnomalyAlert)
            .filter(
                AnomalyAlert.subject_user_id == subject_user_id,
                AnomalyAlert.rule_code == rule_code,
                AnomalyAlert.status.in_(["NEW", "UNDER_REVIEW"]),
                AnomalyAlert.created_at >= today_start
            )
            .first()
        )

        if existing_alert and rule_code in ("R1_OUT_OF_SCOPE", "R4_RECORD_EDIT"):
            existing_alert.event_count += 1
            existing_alert.metadata_info = {**(existing_alert.metadata_info or {}), **metadata}
            if after_hours and "after_hours" not in (existing_alert.tags or []):
                existing_alert.tags = list(existing_alert.tags or []) + ["after_hours"]
                existing_alert.severity = escalate_severity(existing_alert.severity)
            db.commit()
            db.refresh(existing_alert)
            return existing_alert

        # Create new alert
        alert = AnomalyAlert(
            subject_user_id=subject_user_id,
            rule_code=rule_code,
            severity=severity,
            status="NEW",
            description=description,
            tags=tags,
            event_count=1,
            metadata_info=metadata,
            created_at=now
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    # --- Rule R1: Out-of-Scope Attempts ---
    def record_out_of_scope_attempt(
        self,
        user: User,
        target_resource: str,
        company_code: Optional[str],
        db: Session
    ) -> AnomalyAlert:
        """Rule R1: Flags requests denied because record is outside user scope (R1-a and R1-b)."""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_15m = now - timedelta(minutes=15)

        # Count out-of-scope denials in the last 15 minutes for this user
        recent_denials = (
            db.query(func.count(AccessLog.id))
            .filter(
                AccessLog.actor_user_id == user.id,
                AccessLog.outcome == "DENIED",
                AccessLog.reason_code.in_(["OUT_OF_SCOPE", "FAILED_POLICY"]),
                AccessLog.occurred_at >= window_15m
            )
            .scalar() or 0
        )

        # R1-b: Repeated attempts (3 in 15 min -> Medium alert)
        if recent_denials >= 3:
            return self._create_or_update_alert(
                db=db,
                rule_code="R1_REPEATED_OUT_OF_SCOPE",
                base_severity="MEDIUM",
                description=f"User {user.email} triggered {recent_denials} repeated out-of-scope access attempts within 15 minutes.",
                subject_user_id=user.id,
                metadata_info={"recent_denials": recent_denials, "last_target": target_resource, "target_company": company_code}
            )

        # R1-a: Single attempt -> Low alert (aggregated daily)
        return self._create_or_update_alert(
            db=db,
            rule_code="R1_OUT_OF_SCOPE",
            base_severity="LOW",
            description=f"Out-of-scope access attempt by {user.email} for {target_resource} (Client: {company_code or 'Unknown'}).",
            subject_user_id=user.id,
            metadata_info={"target_resource": target_resource, "target_company": company_code}
        )

    # --- Rule R2: Failed Logins ---
    def check_failed_logins(
        self,
        username: str,
        source_ip: str,
        db: Session
    ) -> Optional[AnomalyAlert]:
        """Rule R2: 5 failures/account (R2-a) or 10 failures/IP (R2-b) in 10 minutes. No lock-out."""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_10m = now - timedelta(minutes=10)

        # R2-a: Failed logins for one username
        account_failures = (
            db.query(func.count(AccessLog.id))
            .filter(
                AccessLog.event_type == "AUTH_FAILURE",
                AccessLog.details["username"].as_string() == username,
                AccessLog.occurred_at >= window_10m
            )
            .scalar() or 0
        )
        if account_failures >= 5:
            user = db.query(User).filter(or_(User.email == username, User.username == username)).first()
            return self._create_or_update_alert(
                db=db,
                rule_code="R2_FAILED_LOGINS_ACCOUNT",
                base_severity="MEDIUM",
                description=f"Repeated failed logins detected: {account_failures} failed login attempts for account '{username}' in 10 minutes.",
                subject_user_id=user.id if user else None,
                metadata_info={"username": username, "failures": account_failures, "window_minutes": 10}
            )

        # R2-b: Failed logins from one source address
        ip_failures = (
            db.query(func.count(AccessLog.id))
            .filter(
                AccessLog.event_type == "AUTH_FAILURE",
                AccessLog.source_ip == source_ip,
                AccessLog.occurred_at >= window_10m
            )
            .scalar() or 0
        )
        if ip_failures >= 10:
            return self._create_or_update_alert(
                db=db,
                rule_code="R2_FAILED_LOGINS_IP",
                base_severity="MEDIUM",
                description=f"Multiple failed logins from source IP {source_ip}: {ip_failures} failures in 10 minutes.",
                subject_user_id=None,
                metadata_info={"source_ip": source_ip, "failures": ip_failures, "window_minutes": 10}
            )

        return None

    # --- Rule R3: High Record Access & Report Bursts ---
    def check_high_record_access(self, user: User, db: Session) -> Optional[AnomalyAlert]:
        """Rule R3-a: Distinct record-detail views in 15 minutes by role threshold."""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_15m = now - timedelta(minutes=15)

        threshold = R3_A_THRESHOLDS.get(user.role, 25)

        distinct_views = (
            db.query(func.count(func.distinct(AccessLog.resource_id)))
            .filter(
                AccessLog.actor_user_id == user.id,
                AccessLog.event_type == "ACCESS_ALLOWED",
                AccessLog.resource_type == "RECORD",
                AccessLog.occurred_at >= window_15m
            )
            .scalar() or 0
        )

        if distinct_views >= threshold:
            base_sev = "HIGH" if distinct_views >= (threshold * 2) else "MEDIUM"
            return self._create_or_update_alert(
                db=db,
                rule_code="R3_HIGH_RECORD_ACCESS",
                base_severity=base_sev,
                description=f"High record access volume: User {user.email} viewed {distinct_views} distinct records in 15 minutes (threshold: {threshold}).",
                subject_user_id=user.id,
                metadata_info={"distinct_records_viewed": distinct_views, "threshold": threshold, "role": user.role}
            )
        return None

    def check_report_bursts(self, user: User, db: Session) -> Optional[AnomalyAlert]:
        """Rule R3-b: 5 reports generated in 60 minutes."""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_60m = now - timedelta(minutes=60)

        report_count = (
            db.query(func.count(AccessLog.id))
            .filter(
                AccessLog.actor_user_id == user.id,
                AccessLog.event_type == "REPORT_GENERATED",
                AccessLog.occurred_at >= window_60m
            )
            .scalar() or 0
        )

        if report_count >= 5:
            return self._create_or_update_alert(
                db=db,
                rule_code="R3_REPORT_BURSTS",
                base_severity="MEDIUM",
                description=f"Report burst detected: User {user.email} generated {report_count} reports in 60 minutes.",
                subject_user_id=user.id,
                metadata_info={"report_count": report_count, "window_minutes": 60}
            )
        return None

    # --- Rule R4: Data Modifications ---
    def record_deletion_event(self, user: User, record_id: str, company_code: Optional[str], db: Session) -> AnomalyAlert:
        """Rule R4-a: Soft deletion of any client data -> High alert immediately! (Crossworks priority)."""
        return self._create_or_update_alert(
            db=db,
            rule_code="R4_RECORD_DELETION",
            base_severity="HIGH",
            description=f"Client training record {record_id} was deleted by {user.email} (Role: {user.role}).",
            subject_user_id=user.id,
            metadata_info={"record_id": record_id, "company_code": company_code, "action": "SOFT_DELETE"}
        )

    def record_edit_event(self, user: User, record_id: str, fields_changed: List[str], db: Session) -> AnomalyAlert:
        """Rule R4-b: Edit of client data -> Low alert daily digest; R4-c: 10 edits in 15 min -> Medium alert."""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_15m = now - timedelta(minutes=15)

        recent_edits = (
            db.query(func.count(func.distinct(AccessLog.resource_id)))
            .filter(
                AccessLog.actor_user_id == user.id,
                AccessLog.event_type == "RECORD_EDIT",
                AccessLog.occurred_at >= window_15m
            )
            .scalar() or 0
        )

        if recent_edits >= 10:
            return self._create_or_update_alert(
                db=db,
                rule_code="R4_BULK_EDIT",
                base_severity="MEDIUM",
                description=f"Bulk edit detected: User {user.email} edited {recent_edits} distinct records in 15 minutes.",
                subject_user_id=user.id,
                metadata_info={"distinct_records_edited": recent_edits, "last_record": record_id}
            )

        return self._create_or_update_alert(
            db=db,
            rule_code="R4_RECORD_EDIT",
            base_severity="LOW",
            description=f"Client data edit recorded: User {user.email} modified record {record_id} ({', '.join(fields_changed)}).",
            subject_user_id=user.id,
            metadata_info={"record_id": record_id, "fields_changed": fields_changed}
        )


anomaly_detector = AccessAnomalyDetector()
