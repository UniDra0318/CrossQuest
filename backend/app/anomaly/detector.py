"""Access Anomaly Detection Engine for CrossQuest.

Implements rule- and threshold-based detection:
1. Out-of-scope access attempts
2. Unusual access times (off-hours / weekend)
3. Repeated failed decryption attempts
4. Abnormal record-access volume
"""

from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings
from app.models.entities import AccessLog, AnomalyAlert, User, TrainingRecord


class AccessAnomalyDetector:
    """Evaluates access events against predefined security rules and thresholds."""

    @staticmethod
    def check_out_of_scope_access(
        user: User, 
        record: TrainingRecord, 
        db: Session
    ) -> Optional[AnomalyAlert]:
        """Rule 1: Detects attempts to access trainee records outside assigned client accounts."""
        if user.is_superuser or user.role == "admin":
            return None

        # Check if record's company at completion is in user's assigned accounts
        company_code = record.company_at_completion.code if record.company_at_completion else None
        user_accounts = user.assigned_client_accounts or []

        if company_code and company_code not in user_accounts:
            alert = AnomalyAlert(
                user_id=user.id,
                anomaly_type="OUT_OF_SCOPE",
                severity="HIGH",
                description=(
                    f"User {user.email} (Role: {user.role}) attempted to access out-of-scope "
                    f"record ID {record.id} belonging to client {company_code}."
                ),
                metadata_info={
                    "record_id": record.id,
                    "target_company": company_code,
                    "user_assigned_companies": user_accounts,
                }
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert
        return None

    @staticmethod
    def check_unusual_access_time(user: User, db: Session) -> Optional[AnomalyAlert]:
        """Rule 2: Detects access attempts outside normal working hours or on weekends."""
        now = datetime.utcnow()
        current_hour = now.hour
        is_weekend = now.weekday() >= 5 # 5=Saturday, 6=Sunday

        is_off_hours = (
            current_hour < settings.ANOMALY_WORK_HOURS_START 
            or current_hour >= settings.ANOMALY_WORK_HOURS_END
        )

        if is_weekend or is_off_hours:
            alert = AnomalyAlert(
                user_id=user.id,
                anomaly_type="OFF_HOURS",
                severity="MEDIUM",
                description=(
                    f"Off-hours access detected by user {user.email} at "
                    f"{now.strftime('%Y-%m-%d %H:%M:%S UTC')} (Weekend: {is_weekend})."
                ),
                metadata_info={
                    "timestamp": now.isoformat(),
                    "hour": current_hour,
                    "is_weekend": is_weekend
                }
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert
        return None

    @staticmethod
    def check_repeated_failed_attempts(user: User, db: Session) -> Optional[AnomalyAlert]:
        """Rule 3: Flags multiple consecutive failed decryption attempts within time window."""
        window_start = datetime.utcnow() - timedelta(minutes=settings.ANOMALY_WINDOW_MINUTES)
        
        failed_count = (
            db.query(func.count(AccessLog.id))
            .filter(
                AccessLog.user_id == user.id,
                AccessLog.status.in_(["FAILED_POLICY", "DENIED"]),
                AccessLog.timestamp >= window_start
            )
            .scalar() or 0
        )

        if failed_count >= settings.ANOMALY_FAILED_ATTEMPT_THRESHOLD:
            alert = AnomalyAlert(
                user_id=user.id,
                anomaly_type="REPEATED_FAILED_ATTEMPTS",
                severity="HIGH",
                description=(
                    f"User {user.email} triggered {failed_count} failed decryption/access attempts "
                    f"within the past {settings.ANOMALY_WINDOW_MINUTES} minutes."
                ),
                metadata_info={
                    "failed_count": failed_count,
                    "window_minutes": settings.ANOMALY_WINDOW_MINUTES
                }
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert
        return None

    @staticmethod
    def check_abnormal_access_volume(user: User, db: Session) -> Optional[AnomalyAlert]:
        """Rule 4: Flags unusually high record access/decryption volume in short time."""
        window_start = datetime.utcnow() - timedelta(minutes=settings.ANOMALY_WINDOW_MINUTES)
        
        access_count = (
            db.query(func.count(AccessLog.id))
            .filter(
                AccessLog.user_id == user.id,
                AccessLog.timestamp >= window_start
            )
            .scalar() or 0
        )

        if access_count >= settings.ANOMALY_VOLUME_BURST_THRESHOLD:
            alert = AnomalyAlert(
                user_id=user.id,
                anomaly_type="ABNORMAL_VOLUME",
                severity="CRITICAL",
                description=(
                    f"Abnormal access volume detected: User {user.email} accessed {access_count} records "
                    f"in {settings.ANOMALY_WINDOW_MINUTES} minutes (threshold: {settings.ANOMALY_VOLUME_BURST_THRESHOLD})."
                ),
                metadata_info={
                    "access_count": access_count,
                    "threshold": settings.ANOMALY_VOLUME_BURST_THRESHOLD
                }
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert
        return None


anomaly_detector = AccessAnomalyDetector()
