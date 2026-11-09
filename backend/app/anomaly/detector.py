"""Access Anomaly Detection Engine for CrossQuest.

Implements rule- and threshold-based anomaly monitoring as defined in
Chapter I (SEC-14, SEC-15, SEC-16) and Chapter III Section 3.7 & Table 13.

Rules:
- R1-a: Out-of-scope attempt (1 event) -> Low alert, aggregated daily.
- R1-b: Repeated out-of-scope attempts (3 events in 15 min) -> Medium alert.
- R2-a: Failed logins, single account (5 in 10 min) -> Medium alert (no lock-out).
- R2-b: Failed logins, single source IP (>=10 failures AND >=2 distinct usernames in 10 min) -> Medium alert (no lock-out).
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

import hmac
import hashlib
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.core.config import settings
from app.models.entities import AccessLog, AnomalyAlert, User, TrainingRecord, AnomalyRule

logger = logging.getLogger(__name__)

# Role-based thresholds for distinct record-detail views within 15 minutes (Table 13, R3-a)
R3_A_THRESHOLDS = {
    "account_manager": 25,
    "trainer": 25,
    "finance": 50,
    "admin": 50,
    "trainee": 15
}

# Chapter III Section 3.7.3: Severity scale has Low, Medium, and High (High is the maximum; no CRITICAL).
SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH"]

# In-memory timed cache for reviewed anomaly rules
_RULES_CACHE: Optional[Dict[str, Dict[str, Any]]] = None
_RULES_CACHE_TIME: float = 0.0
RULES_CACHE_TTL_SEC: float = 10.0


def clear_rule_cache() -> None:
    """Clears the cached anomaly detection rules so changes take effect immediately."""
    global _RULES_CACHE, _RULES_CACHE_TIME
    _RULES_CACHE = None
    _RULES_CACHE_TIME = 0.0


def load_reviewed_rules(db: Optional[Session]) -> Dict[str, Dict[str, Any]]:
    """Loads all reviewed anomaly detection rules into an in-memory dictionary.
    Per Chapter III baseline specification, only rules marked client_reviewed=True
    are enforced in active detection. Unreviewed/pending threshold edits are ignored
    until formally approved by an independent administrator (OI-08).
    """
    global _RULES_CACHE, _RULES_CACHE_TIME
    now_mono = time.monotonic()
    if _RULES_CACHE is not None and (now_mono - _RULES_CACHE_TIME) < RULES_CACHE_TTL_SEC:
        return _RULES_CACHE

    if db is None:
        return {}

    try:
        rules = db.query(AnomalyRule).all()
        reviewed_map = {}
        for r in rules:
            if r.client_reviewed and r.parameters:
                reviewed_map[r.rule_code] = dict(r.parameters)
        _RULES_CACHE = reviewed_map
        _RULES_CACHE_TIME = now_mono
        return reviewed_map
    except Exception as exc:
        logger.warning("Could not read rule parameters from database: %s; rolling back and using defaults", exc, exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
        return {}


def safe_int(val: Any, default: int, param_name: str = "") -> int:
    """Safely converts parameter value to integer, logging a warning and falling back to default on failure."""
    try:
        return int(val)
    except (ValueError, TypeError):
        logger.warning("Invalid integer parameter '%s' with value '%r'; using default %d", param_name, val, default)
        return default


def get_rule_parameters(db: Optional[Session], rule_code: str, default_params: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieves reviewed active parameters for an anomaly rule from cache/DB, falling back to Table 13 defaults."""
    rules_map = load_reviewed_rules(db)
    if rule_code in rules_map:
        merged = dict(default_params)
        merged.update(rules_map[rule_code])
        return merged
    return default_params


def is_after_hours(dt: Optional[datetime] = None, db: Optional[Session] = None) -> bool:
    """Checks if a given UTC datetime falls outside Philippine operating hours (Table 13: S1 After-hours indicator).
    Reads active S1 parameters from reviewed AnomalyRule if available, otherwise defaults to Mon-Fri 09:00 - 18:00 UTC+8.
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # Convert UTC to Philippine Time (UTC+8)
    pht = dt.astimezone(timezone(timedelta(hours=8)))
    
    s1_params = get_rule_parameters(
        db,
        "S1_AFTER_HOURS",
        {"start_hour": 9, "end_hour": 18, "days": ["MON", "TUE", "WED", "THU", "FRI"]}
    )

    day_names = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    current_day = day_names[pht.weekday()]
    allowed_days = s1_params.get("days") or ["MON", "TUE", "WED", "THU", "FRI"]
    if current_day not in allowed_days:
        return True

    start_h = safe_int(s1_params.get("start_hour"), 9, "S1.start_hour")
    end_h = safe_int(s1_params.get("end_hour"), 18, "S1.end_hour")
    if pht.hour < start_h or pht.hour >= end_h:
        return True
        
    return False


def escalate_severity(base_severity: str) -> str:
    """Raises severity by one level when S1 after-hours or volume escalation applies.
    Capped strictly at HIGH per Chapter III Section 3.7.3 (p. 53, 56):
    'There are three levels, Low, Medium, and High, and High is the maximum. There is no higher level.'
    """
    try:
        idx = SEVERITY_LEVELS.index(base_severity.upper())
        if idx < len(SEVERITY_LEVELS) - 1:
            return SEVERITY_LEVELS[idx + 1]
    except ValueError:
        pass
    return "HIGH" if base_severity.upper() == "CRITICAL" else base_severity


class AccessAnomalyDetector:
    """Evaluates access events against Chapter III Table 13 rules."""

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
        
        # Evaluate S1 after-hours indicator (Table 13, Section 3.7.3)
        after_hours = is_after_hours(now, db=db)
        final_sev = base_severity
        tags = []
        if after_hours:
            final_sev = escalate_severity(base_severity)
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
                existing_alert.after_hours_tag = True
                existing_alert.severity_final = escalate_severity(existing_alert.severity_final or existing_alert.severity)
                existing_alert.severity = existing_alert.severity_final
            db.commit()
            db.refresh(existing_alert)
            return existing_alert

        # Create new alert with full thesis fields (Figure 10, Table 13)
        alert = AnomalyAlert(
            subject_user_id=subject_user_id,
            rule_code=rule_code,
            severity_base=base_severity,
            severity_final=final_sev,
            severity=final_sev,
            after_hours_tag=after_hours,
            episode_start=now,
            client_reviewed=False,
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
        r1b_params = get_rule_parameters(db, "R1_REPEATED_OUT_OF_SCOPE", {"threshold": 3, "window_minutes": 15})
        threshold_repeated = safe_int(r1b_params.get("threshold"), 3, "R1_REPEATED.threshold")
        window_minutes = safe_int(r1b_params.get("window_minutes"), 15, "R1_REPEATED.window_minutes")
        window_recent = now - timedelta(minutes=window_minutes)

        # Count out-of-scope denials in the configured window for this user
        recent_denials = (
            db.query(func.count(AccessLog.id))
            .filter(
                AccessLog.actor_user_id == user.id,
                AccessLog.outcome == "DENIED",
                AccessLog.reason_code.in_(["OUT_OF_SCOPE", "FAILED_POLICY"]),
                AccessLog.occurred_at >= window_recent
            )
            .scalar() or 0
        )

        # R1-b: Repeated attempts (threshold in configured window -> Medium alert)
        if recent_denials >= threshold_repeated:
            return self._create_or_update_alert(
                db=db,
                rule_code="R1_REPEATED_OUT_OF_SCOPE",
                base_severity="MEDIUM",
                description=f"User {user.email} triggered {recent_denials} repeated out-of-scope access attempts within {window_minutes} minutes.",
                subject_user_id=user.id,
                metadata_info={"recent_denials": recent_denials, "last_target": target_resource, "target_company": company_code, "threshold": threshold_repeated}
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
        """Rule R2: failures/account (R2-a) or failures across distinct targeted usernames for IP (R2-b). No lock-out."""
        r2a_params = get_rule_parameters(db, "R2_FAILED_LOGINS_ACCOUNT", {"threshold": 5, "window_minutes": 10})
        threshold_account = safe_int(r2a_params.get("threshold"), 5, "R2_ACCOUNT.threshold")
        window_account = safe_int(r2a_params.get("window_minutes"), 10, "R2_ACCOUNT.window_minutes")

        r2b_params = get_rule_parameters(
            db,
            "R2_FAILED_LOGINS_IP",
            {
                "threshold": getattr(settings, "ANOMALY_R2_B_IP_THRESHOLD", 10),
                "distinct_usernames_threshold": getattr(settings, "ANOMALY_R2_B_DISTINCT_USERS_THRESHOLD", 2),
                "window_minutes": 10
            }
        )
        threshold_ip = safe_int(r2b_params.get("threshold"), 10, "R2_IP.threshold")
        threshold_distinct = safe_int(r2b_params.get("distinct_usernames_threshold"), 2, "R2_IP.distinct_usernames_threshold")
        window_ip = safe_int(r2b_params.get("window_minutes"), 10, "R2_IP.window_minutes")

        max_window = max(window_account, window_ip)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_start = now - timedelta(minutes=max_window)

        # Compute keyed-HMAC username for privacy-preserving match
        uname_normalized = username.lower().strip() if username else ""
        username_hmac = hmac.new(settings.SECRET_KEY.encode(), uname_normalized.encode(), hashlib.sha256).hexdigest()

        # Query recent AUTH_FAILURE logs within the maximum evaluation window
        recent_failures = (
            db.query(AccessLog)
            .filter(
                AccessLog.event_type == "AUTH_FAILURE",
                AccessLog.occurred_at >= window_start
            )
            .all()
        )

        # R2-a: Failed logins for targeted account
        account_failures = 0
        window_acct_start = now - timedelta(minutes=window_account)
        for log in recent_failures:
            if log.occurred_at >= window_acct_start:
                det = log.details or {}
                log_uname = det.get("username")
                log_hmac = det.get("username_hmac")
                if (log_uname and log_uname.lower().strip() == uname_normalized) or (log_hmac and log_hmac == username_hmac):
                    account_failures += 1

        if account_failures >= threshold_account:
            user = db.query(User).filter(or_(User.email == username, User.username == username)).first()
            return self._create_or_update_alert(
                db=db,
                rule_code="R2_FAILED_LOGINS_ACCOUNT",
                base_severity="MEDIUM",
                description=f"Repeated failed logins detected: {account_failures} failed login attempts for account '{username}' in {window_account} minutes (threshold: {threshold_account}).",
                subject_user_id=user.id if user else None,
                metadata_info={"username": username, "failures": account_failures, "window_minutes": window_account, "threshold": threshold_account}
            )

        # R2-b: Failed logins from single source IP (dual threshold: failures AND distinct targeted usernames)
        ip_failures = 0
        distinct_targeted_users = set()
        window_ip_start = now - timedelta(minutes=window_ip)
        for log in recent_failures:
            if log.occurred_at >= window_ip_start and log.source_ip == source_ip:
                ip_failures += 1
                det = log.details or {}
                identifier = det.get("username_hmac") or det.get("username")
                if identifier:
                    distinct_targeted_users.add(identifier)

        if ip_failures >= threshold_ip and len(distinct_targeted_users) >= threshold_distinct:
            return self._create_or_update_alert(
                db=db,
                rule_code="R2_FAILED_LOGINS_IP",
                base_severity="MEDIUM",
                description=(
                    f"Multiple failed logins from source IP {source_ip}: "
                    f"{ip_failures} failures across {len(distinct_targeted_users)} distinct targeted accounts in {window_ip} minutes."
                ),
                subject_user_id=None,
                metadata_info={
                    "source_ip": source_ip,
                    "failures": ip_failures,
                    "distinct_targeted_usernames": len(distinct_targeted_users),
                    "window_minutes": window_ip,
                    "threshold_ip": threshold_ip,
                    "threshold_distinct": threshold_distinct
                }
            )

        return None

    # --- Rule R3: High Record Access & Report Bursts ---
    def check_high_record_access(self, user: User, db: Session) -> Optional[AnomalyAlert]:
        """Rule R3-a: Distinct record-detail views in configured window by role threshold."""
        r3a_params = get_rule_parameters(db, "R3_HIGH_RECORD_ACCESS", {"thresholds": R3_A_THRESHOLDS, "window_minutes": 15})
        role_thresholds = r3a_params.get("thresholds") or R3_A_THRESHOLDS
        threshold = safe_int(role_thresholds.get(user.role, 25), 25, f"R3_A.{user.role}.threshold")
        window_minutes = safe_int(r3a_params.get("window_minutes"), 15, "R3_A.window_minutes")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_start = now - timedelta(minutes=window_minutes)

        distinct_views = (
            db.query(func.count(func.distinct(AccessLog.resource_id)))
            .filter(
                AccessLog.actor_user_id == user.id,
                AccessLog.event_type == "ACCESS_ALLOWED",
                AccessLog.resource_type == "RECORD",
                AccessLog.occurred_at >= window_start
            )
            .scalar() or 0
        )

        if distinct_views >= threshold:
            base_sev = "HIGH" if distinct_views >= (threshold * 2) else "MEDIUM"
            return self._create_or_update_alert(
                db=db,
                rule_code="R3_HIGH_RECORD_ACCESS",
                base_severity=base_sev,
                description=f"High record access volume: User {user.email} viewed {distinct_views} distinct records in {window_minutes} minutes (threshold: {threshold}).",
                subject_user_id=user.id,
                metadata_info={"distinct_records_viewed": distinct_views, "threshold": threshold, "role": user.role, "window_minutes": window_minutes}
            )
        return None

    def check_report_bursts(self, user: User, db: Session) -> Optional[AnomalyAlert]:
        """Rule R3-b: Report generation bursts in configured window."""
        r3b_params = get_rule_parameters(db, "R3_REPORT_BURSTS", {"threshold": 5, "window_minutes": 60})
        threshold = safe_int(r3b_params.get("threshold"), 5, "R3_BURST.threshold")
        window_minutes = safe_int(r3b_params.get("window_minutes"), 60, "R3_BURST.window_minutes")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_start = now - timedelta(minutes=window_minutes)

        report_count = (
            db.query(func.count(AccessLog.id))
            .filter(
                AccessLog.actor_user_id == user.id,
                AccessLog.event_type == "REPORT_GENERATED",
                AccessLog.occurred_at >= window_start
            )
            .scalar() or 0
        )

        if report_count >= threshold:
            return self._create_or_update_alert(
                db=db,
                rule_code="R3_REPORT_BURSTS",
                base_severity="MEDIUM",
                description=f"Report burst detected: User {user.email} generated {report_count} reports in {window_minutes} minutes (threshold: {threshold}).",
                subject_user_id=user.id,
                metadata_info={"report_count": report_count, "window_minutes": window_minutes, "threshold": threshold}
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
        """Rule R4-b: Edit of client data -> Low alert daily digest; R4-c: Distinct edits in configured window -> Medium alert."""
        r4c_params = get_rule_parameters(db, "R4_BULK_EDIT", {"threshold": 10, "window_minutes": 15})
        threshold_bulk = safe_int(r4c_params.get("threshold"), 10, "R4_BULK.threshold")
        window_minutes = safe_int(r4c_params.get("window_minutes"), 15, "R4_BULK.window_minutes")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        window_start = now - timedelta(minutes=window_minutes)

        recent_edits = (
            db.query(func.count(func.distinct(AccessLog.resource_id)))
            .filter(
                AccessLog.actor_user_id == user.id,
                AccessLog.event_type == "RECORD_EDIT",
                AccessLog.occurred_at >= window_start
            )
            .scalar() or 0
        )

        if recent_edits >= threshold_bulk:
            return self._create_or_update_alert(
                db=db,
                rule_code="R4_BULK_EDIT",
                base_severity="MEDIUM",
                description=f"Bulk edit detected: User {user.email} edited {recent_edits} distinct records in {window_minutes} minutes (threshold: {threshold_bulk}).",
                subject_user_id=user.id,
                metadata_info={"distinct_records_edited": recent_edits, "last_record": record_id, "threshold": threshold_bulk, "window_minutes": window_minutes}
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
