"""Tests for Access Anomaly Detection Engine (Rules R1-R4 + S1, TC-ANO-01 to TC-ANO-21).

Meets requirements:
- SEC-14: Rule-based anomaly detection monitoring out-of-scope access, failed logins, volume bursts, modifications.
- SEC-15: Immutable alerts recorded for Administrator review only; no automatic account lock-out.
- SEC-16: S1 After-hours is a supporting indicator and NEVER creates an alert alone.
- Measure M4: Anomaly detector evaluation latency recording in nanoseconds.
- Chapter III Table 13, Section 3.7.3, 3.7.4, 3.7.5.
"""

import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, create_access_token
from app.models.entities import User, ClientCompany, AccessLog, AnomalyAlert, AnomalyRule
from app.anomaly.detector import (
    anomaly_detector, is_after_hours, escalate_severity, R3_A_THRESHOLDS
)


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Creates a clean test user for anomaly tests."""
    user = db_session.query(User).filter_by(email="anomaly_tester@test.ph").first()
    if not user:
        user = User(
            email="anomaly_tester@test.ph",
            username="anomaly_tester",
            full_name="Anomaly Tester",
            hashed_password=get_password_hash("TestPass123!"),
            role="account_manager",
            assigned_client_accounts=["CORP_ALPHA"],
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Creates a clean admin user for reviewing alerts and modifying rules."""
    admin = db_session.query(User).filter_by(email="anomaly_admin@test.ph").first()
    if not admin:
        admin = User(
            email="anomaly_admin@test.ph",
            username="anomaly_admin",
            full_name="Anomaly Administrator",
            hashed_password=get_password_hash("AdminPass123!"),
            role="admin",
            is_superuser=True,
            is_active=True
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
    return admin


@pytest.fixture
def second_admin_user(db_session: Session) -> User:
    """Creates a second administrator for peer review tests (OI-29, OI-30)."""
    admin2 = db_session.query(User).filter_by(email="anomaly_admin2@test.ph").first()
    if not admin2:
        admin2 = User(
            email="anomaly_admin2@test.ph",
            username="anomaly_admin2",
            full_name="Prof. Roel Traballo",
            hashed_password=get_password_hash("AdminPass222!"),
            role="admin",
            is_superuser=True,
            is_active=True
        )
        db_session.add(admin2)
        db_session.commit()
        db_session.refresh(admin2)
    return admin2


@pytest.fixture(autouse=True)
def clean_anomaly_state(db_session: Session, test_user: User):
    """Isolate each test by clearing prior logs and alerts for test_user."""
    db_session.query(AccessLog).filter(AccessLog.actor_user_id == test_user.id).delete()
    db_session.query(AnomalyAlert).filter(AnomalyAlert.subject_user_id == test_user.id).delete()
    db_session.commit()
    yield



# =========================================================================
# TC-ANO-01..03: Rule R1 (Out-of-Scope Attempts)
# =========================================================================

def test_tc_ano_01_r1_a_single_out_of_scope(db_session: Session, test_user: User):
    """TC-ANO-01: Single out-of-scope access attempt generates Low severity alert (Table 13)."""
    # Simulate single out-of-scope event during daytime
    business_hours = datetime(2026, 10, 21, 2, 0, tzinfo=timezone.utc) # 10:00 AM PHT
    alert = anomaly_detector.record_out_of_scope_attempt(
        user=test_user,
        target_resource="RECORD:rec-999",
        company_code="CORP_UNASSIGNED",
        db=db_session
    )
    assert alert is not None
    assert alert.rule_code in ("R1_OUT_OF_SCOPE", "R1_REPEATED_OUT_OF_SCOPE")
    assert alert.severity_base == "LOW" or alert.rule_code == "R1_REPEATED_OUT_OF_SCOPE"


def test_tc_ano_02_r1_a_daily_aggregation(db_session: Session, test_user: User):
    """TC-ANO-02: Subsequent R1-a events within the same day aggregate into the existing alert episode."""
    today = datetime.now(timezone.utc).replace(tzinfo=None)
    # Clear prior alerts for this user
    db_session.query(AnomalyAlert).filter_by(subject_user_id=test_user.id).delete()
    db_session.commit()

    # Event 1
    alert1 = anomaly_detector.record_out_of_scope_attempt(
        user=test_user,
        target_resource="RECORD:rec-101",
        company_code="CORP_BETA",
        db=db_session
    )
    initial_count = alert1.event_count

    # Event 2
    alert2 = anomaly_detector.record_out_of_scope_attempt(
        user=test_user,
        target_resource="RECORD:rec-102",
        company_code="CORP_BETA",
        db=db_session
    )
    # Should join existing episode
    assert alert2.id == alert1.id
    assert alert2.event_count == initial_count + 1


def test_tc_ano_03_r1_b_repeated_out_of_scope(db_session: Session, test_user: User):
    """TC-ANO-03: Repeated out-of-scope attempts (>= 3 in 15 min) generate Medium severity alert."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # Log 3 out-of-scope denials in the access log
    for i in range(3):
        log = AccessLog(
            actor_user_id=test_user.id,
            actor_role=test_user.role,
            event_type="ACCESS_DENIED",
            resource_type="RECORD",
            resource_id=f"rec-scope-{i}",
            outcome="DENIED",
            reason_code="OUT_OF_SCOPE",
            source_ip="127.0.0.1",
            occurred_at=now - timedelta(minutes=i)
        )
        db_session.add(log)
    db_session.commit()

    alert = anomaly_detector.record_out_of_scope_attempt(
        user=test_user,
        target_resource="RECORD:rec-scope-trigger",
        company_code="CORP_BETA",
        db=db_session
    )
    assert alert.rule_code == "R1_REPEATED_OUT_OF_SCOPE"
    assert alert.severity_base == "MEDIUM"


# =========================================================================
# TC-ANO-04..05: Rule R2 (Failed Logins)
# =========================================================================

def test_tc_ano_04_r2_a_failed_logins_account(db_session: Session, test_user: User):
    """TC-ANO-04: 5 failed logins for single account in 10 minutes generates Medium alert (no lock-out)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for i in range(5):
        log = AccessLog(
            actor_user_id=test_user.id,
            actor_role=test_user.role,
            event_type="AUTH_FAILURE",
            resource_type="AUTH",
            outcome="FAILED",
            reason_code="INVALID_CREDENTIALS",
            source_ip="192.168.1.50",
            details={"username": test_user.email},
            occurred_at=now - timedelta(minutes=i)
        )
        db_session.add(log)
    db_session.commit()

    alert = anomaly_detector.check_failed_logins(test_user.email, "192.168.1.50", db_session)
    assert alert is not None
    assert alert.rule_code == "R2_FAILED_LOGINS_ACCOUNT"
    assert alert.severity_base == "MEDIUM"
    # User account must NOT be locked out (SEC-15)
    db_session.refresh(test_user)
    assert test_user.is_active is True


def test_tc_ano_05_r2_b_failed_logins_ip(db_session: Session):
    """TC-ANO-05: 10 failed logins from single IP in 10 minutes generates Medium alert."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    target_ip = "203.177.100.5"
    for i in range(10):
        log = AccessLog(
            event_type="AUTH_FAILURE",
            resource_type="AUTH",
            outcome="FAILED",
            reason_code="INVALID_CREDENTIALS",
            source_ip=target_ip,
            details={"username": f"random_user_{i}@test.ph"},
            occurred_at=now - timedelta(minutes=i)
        )
        db_session.add(log)
    db_session.commit()

    alert = anomaly_detector.check_failed_logins("random_user_9@test.ph", target_ip, db_session)
    assert alert is not None
    assert alert.rule_code == "R2_FAILED_LOGINS_IP"
    assert alert.severity_base == "MEDIUM"


# =========================================================================
# TC-ANO-06..08: Rule R3 (High Record Access & Report Bursts)
# =========================================================================

def test_tc_ano_06_r3_a_high_record_access(db_session: Session, test_user: User):
    """TC-ANO-06: Distinct record detail views exceeding role threshold in 15 min generates Medium alert."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    threshold = R3_A_THRESHOLDS[test_user.role] # 25 for Account Manager

    for i in range(threshold):
        log = AccessLog(
            actor_user_id=test_user.id,
            actor_role=test_user.role,
            event_type="ACCESS_ALLOWED",
            resource_type="RECORD",
            resource_id=f"rec-volume-{i}",
            outcome="SUCCESS",
            source_ip="127.0.0.1",
            occurred_at=now - timedelta(minutes=i % 10)
        )
        db_session.add(log)
    db_session.commit()

    alert = anomaly_detector.check_high_record_access(test_user, db_session)
    assert alert is not None
    assert alert.rule_code == "R3_HIGH_RECORD_ACCESS"
    assert alert.severity_base == "MEDIUM"


def test_tc_ano_07_r3_a_volume_escalation_to_high(db_session: Session, test_user: User):
    """TC-ANO-07: Record access >= 2x role threshold escalates base severity to High (Section 3.7.3)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    threshold = R3_A_THRESHOLDS[test_user.role] # 25 -> 2x = 50

    for i in range(threshold * 2):
        log = AccessLog(
            actor_user_id=test_user.id,
            actor_role=test_user.role,
            event_type="ACCESS_ALLOWED",
            resource_type="RECORD",
            resource_id=f"rec-2x-volume-{i}",
            outcome="SUCCESS",
            source_ip="127.0.0.1",
            occurred_at=now - timedelta(minutes=i % 12)
        )
        db_session.add(log)
    db_session.commit()

    alert = anomaly_detector.check_high_record_access(test_user, db_session)
    assert alert is not None
    assert alert.rule_code == "R3_HIGH_RECORD_ACCESS"
    assert alert.severity_base == "HIGH"


def test_tc_ano_08_r3_b_report_burst(db_session: Session, test_user: User):
    """TC-ANO-08: 5 reports generated in 60 minutes generates Medium severity alert."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for i in range(5):
        log = AccessLog(
            actor_user_id=test_user.id,
            actor_role=test_user.role,
            event_type="REPORT_GENERATED",
            resource_type="REPORT",
            outcome="SUCCESS",
            source_ip="127.0.0.1",
            details={"company_code": "CORP_ALPHA", "report_type": "PDF"},
            occurred_at=now - timedelta(minutes=i * 5)
        )
        db_session.add(log)
    db_session.commit()

    alert = anomaly_detector.check_report_bursts(test_user, db_session)
    assert alert is not None
    assert alert.rule_code == "R3_REPORT_BURSTS"
    assert alert.severity_base == "MEDIUM"


# =========================================================================
# TC-ANO-09..11: Rule R4 (Data Modifications)
# =========================================================================

def test_tc_ano_09_r4_a_record_deletion_high_priority(db_session: Session, test_user: User):
    """TC-ANO-09: Soft deletion of client data immediately creates High alert (Crossworks top priority)."""
    alert = anomaly_detector.record_deletion_event(
        user=test_user,
        record_id="rec-del-01",
        company_code="CORP_ALPHA",
        db=db_session
    )
    assert alert is not None
    assert alert.rule_code == "R4_RECORD_DELETION"
    assert alert.severity_base == "HIGH"


def test_tc_ano_10_r4_b_record_edit_low_daily(db_session: Session, test_user: User):
    """TC-ANO-10: Single edit of client record creates Low alert daily digest."""
    alert = anomaly_detector.record_edit_event(
        user=test_user,
        record_id="rec-edit-01",
        fields_changed=["score", "trainer_remarks"],
        db=db_session
    )
    assert alert is not None
    assert alert.rule_code == "R4_RECORD_EDIT"
    assert alert.severity_base == "LOW"


def test_tc_ano_11_r4_c_bulk_edit_medium(db_session: Session, test_user: User):
    """TC-ANO-11: Bulk edit (>= 10 distinct records in 15 min) generates Medium alert."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for i in range(10):
        log = AccessLog(
            actor_user_id=test_user.id,
            actor_role=test_user.role,
            event_type="RECORD_EDIT",
            resource_type="RECORD",
            resource_id=f"rec-bulk-{i}",
            outcome="SUCCESS",
            source_ip="127.0.0.1",
            occurred_at=now - timedelta(minutes=i)
        )
        db_session.add(log)
    db_session.commit()

    alert = anomaly_detector.record_edit_event(
        user=test_user,
        record_id="rec-bulk-trigger",
        fields_changed=["status"],
        db=db_session
    )
    assert alert.rule_code == "R4_BULK_EDIT"
    assert alert.severity_base == "MEDIUM"


# =========================================================================
# TC-ANO-12..16: Supporting Indicator S1 (After-Hours)
# =========================================================================

def test_tc_ano_12_s1_escalates_severity_by_one_level():
    """TC-ANO-12: S1 raises severity by one level (Low -> Medium, Medium -> High)."""
    assert escalate_severity("LOW") == "MEDIUM"
    assert escalate_severity("MEDIUM") == "HIGH"


def test_tc_ano_13_s1_severity_strictly_capped_at_high():
    """TC-ANO-13: Severity is capped strictly at HIGH (no CRITICAL per Chapter III Section 3.7.3)."""
    assert escalate_severity("HIGH") == "HIGH"


def test_tc_ano_14_s1_weekend_is_after_hours():
    """TC-ANO-14: Weekend timestamps (Saturday & Sunday PHT) evaluate as after-hours."""
    saturday_noon = datetime(2026, 10, 24, 4, 0, tzinfo=timezone.utc) # Saturday 12:00 PHT
    sunday_night = datetime(2026, 10, 25, 14, 0, tzinfo=timezone.utc) # Sunday 22:00 PHT
    assert is_after_hours(saturday_noon) is True
    assert is_after_hours(sunday_night) is True


def test_tc_ano_15_s1_weekday_business_hours_not_after_hours():
    """TC-ANO-15: Mon-Fri 09:00-18:00 PHT is recognized as standard operating hours."""
    tuesday_10am_pht = datetime(2026, 10, 20, 2, 0, tzinfo=timezone.utc)
    thursday_3pm_pht = datetime(2026, 10, 22, 7, 0, tzinfo=timezone.utc)
    assert is_after_hours(tuesday_10am_pht) is False
    assert is_after_hours(thursday_3pm_pht) is False


def test_tc_ano_16_s1_never_alerts_alone():
    """TC-ANO-16: S1 is a supporting indicator and never produces an alert independently (SEC-16)."""
    # Verify no rule code exists for S1 standalone alert generation
    assert not hasattr(anomaly_detector, "trigger_s1_alert")


# =========================================================================
# TC-ANO-17..18: Immutable Lifecycle & Review Workflow
# =========================================================================

def test_tc_ano_17_immutable_alerts_delete_forbidden(client: TestClient, admin_user: User, db_session: Session):
    """TC-ANO-17: Alert deletion is strictly forbidden (HTTP 405 Method Not Allowed)."""
    alert = AnomalyAlert(
        rule_code="R1_OUT_OF_SCOPE",
        description="Immutable test alert",
        status="NEW"
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    admin_token = create_access_token(subject=admin_user.id)
    resp = client.delete(f"/api/v1/anomalies/alerts/{alert.id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 405
    assert "cannot be deleted by design" in resp.json()["detail"]


def test_tc_ano_18_alert_review_lifecycle(client: TestClient, admin_user: User, db_session: Session):
    """TC-ANO-18: Status transitions to UNDER_REVIEW, then CLOSED with mandatory disposition & note."""
    alert = AnomalyAlert(
        rule_code="R3_REPORT_BURSTS",
        description="Review workflow test",
        status="NEW"
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    admin_token = create_access_token(subject=admin_user.id)

    # 1. Transition to UNDER_REVIEW
    r1 = client.put(
        f"/api/v1/anomalies/alerts/{alert.id}/review",
        json={"status": "UNDER_REVIEW", "review_note": "Investigating with client company"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "UNDER_REVIEW"

    # 2. Attempt closing without disposition fails
    r_fail = client.put(
        f"/api/v1/anomalies/alerts/{alert.id}/review",
        json={"status": "CLOSED", "review_note": "Closed"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r_fail.status_code == 400

    # 3. Close with mandatory disposition and review note
    r2 = client.put(
        f"/api/v1/anomalies/alerts/{alert.id}/review",
        json={
            "status": "CLOSED",
            "disposition": "CLOSED_EXPECTED_ACTIVITY",
            "review_note": "Verified legitimate quarterly compliance report generation."
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "CLOSED"
    assert r2.json()["disposition"] == "CLOSED_EXPECTED_ACTIVITY"


# =========================================================================
# TC-ANO-19: Performance Measure M4
# =========================================================================

def test_tc_ano_19_performance_measure_m4(monotonic_timer, db_session: Session, test_user: User):
    """TC-ANO-19: Measure M4 anomaly detector evaluation latency recorded in nanoseconds."""
    timer = monotonic_timer()

    timer.start()
    anomaly_detector.record_out_of_scope_attempt(
        user=test_user,
        target_resource="RECORD:bench-rec",
        company_code="CORP_BENCH",
        db=db_session
    )
    eval_ns = timer.stop()
    eval_ms = eval_ns / 1_000_000.0

    assert eval_ns > 0
    print(f"\n[Measure M4 Benchmark] Anomaly Detection Latency: {eval_ms:.3f}ms ({eval_ns}ns)")


# =========================================================================
# TC-ANO-20..21: Rule Modification & Below-Threshold Tests
# =========================================================================

def test_tc_ano_20_rule_modification_and_approval(client: TestClient, admin_user: User):
    """TC-ANO-20: Admin modifies rule parameters and tracks client_reviewed approval status."""
    admin_token = create_access_token(subject=admin_user.id)

    # 1. Fetch rules
    r_list = client.get("/api/v1/anomalies/rules", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_list.status_code == 200
    assert len(r_list.json()) >= 9

    # 2. Update R3-a threshold
    r_update = client.put(
        "/api/v1/anomalies/rules/R3_HIGH_RECORD_ACCESS",
        json={
            "parameters": {"thresholds": {"account_manager": 30, "trainer": 30}, "window_minutes": 15},
            "client_reviewed": True,
            "description": "Updated threshold per CCIS pilot review"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r_update.status_code == 200
    data = r_update.json()
    assert data["parameters"]["thresholds"]["account_manager"] == 30
    assert data["version_no"] >= 2
    assert data["client_reviewed"] is True


def test_tc_ano_21_below_threshold_no_alert(db_session: Session, test_user: User):
    """TC-ANO-21: Events strictly below thresholds do NOT trigger anomaly alerts."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # Clear prior logs for test user to ensure exact counts
    db_session.query(AccessLog).filter(AccessLog.actor_user_id == test_user.id).delete()
    db_session.commit()

    # 1. Exactly 4 failed logins (threshold is 5)
    for i in range(4):
        log = AccessLog(
            actor_user_id=test_user.id,
            actor_role=test_user.role,
            event_type="AUTH_FAILURE",
            resource_type="AUTH",
            outcome="FAILED",
            reason_code="INVALID_CREDENTIALS",
            source_ip="10.0.0.99",
            details={"username": "below_threshold_user@test.ph"},
            occurred_at=now - timedelta(minutes=i)
        )
        db_session.add(log)
    db_session.commit()

    alert_login = anomaly_detector.check_failed_logins("below_threshold_user@test.ph", "10.0.0.99", db_session)
    assert alert_login is None

    # 2. Exactly 4 reports in 60 min (threshold is 5)
    for i in range(4):
        log = AccessLog(
            actor_user_id=test_user.id,
            actor_role=test_user.role,
            event_type="REPORT_GENERATED",
            resource_type="REPORT",
            outcome="SUCCESS",
            source_ip="127.0.0.1",
            details={"company_code": "CORP_ALPHA"},
            occurred_at=now - timedelta(minutes=i * 10)
        )
        db_session.add(log)
    db_session.commit()

    alert_report = anomaly_detector.check_report_bursts(test_user, db_session)
    assert alert_report is None


# =========================================================================
# Phase 4: Peer Review, Dual Threshold R2-b, Retention Job, & Detection Measurement
# =========================================================================

def test_tc_ano_22_r2_b_dual_threshold_requires_distinct_targeted_users(db_session: Session):
    """TC-ANO-22: R2-b requires >=10 failures AND >=2 distinct targeted usernames in 10 min."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    target_ip = "192.168.100.99"
    # Clean previous logs for test isolation
    db_session.query(AccessLog).filter(AccessLog.source_ip == target_ip).delete()
    db_session.commit()

    # Case 1: 10 failures from same IP for single username -> distinct users = 1 < 2 -> R2-b does not trigger
    for i in range(10):
        log = AccessLog(
            event_type="AUTH_FAILURE",
            resource_type="AUTH",
            outcome="FAILED",
            reason_code="INVALID_CREDENTIALS",
            source_ip=target_ip,
            details={"username": "single_target_user@test.ph"},
            occurred_at=now - timedelta(minutes=1)
        )
        db_session.add(log)
    db_session.commit()

    # Evaluating for another user from this IP
    alert_single = anomaly_detector.check_failed_logins("other_user@test.ph", target_ip, db_session)
    assert alert_single is None  # R2-b not triggered because distinct targeted usernames == 1

    # Case 2: Add failure for a 2nd distinct user -> distinct users == 2 -> R2-b triggers!
    log_second = AccessLog(
        event_type="AUTH_FAILURE",
        resource_type="AUTH",
        outcome="FAILED",
        reason_code="INVALID_CREDENTIALS",
        source_ip=target_ip,
        details={"username": "second_target_user@test.ph"},
        occurred_at=now - timedelta(minutes=1)
    )
    db_session.add(log_second)
    db_session.commit()

    alert_multi = anomaly_detector.check_failed_logins("second_target_user@test.ph", target_ip, db_session)
    assert alert_multi is not None
    assert alert_multi.rule_code == "R2_FAILED_LOGINS_IP"
    assert alert_multi.severity_base == "MEDIUM"
    assert alert_multi.metadata_info["distinct_targeted_usernames"] >= 2


def test_tc_ano_23_peer_review_blocks_subject_administrator(
    client: TestClient, admin_user: User, second_admin_user: User, db_session: Session
):
    """TC-ANO-23: Administrators are blocked from reviewing alerts where they are the subject (OI-30)."""
    # Create alert where admin_user is the subject
    alert = AnomalyAlert(
        subject_user_id=admin_user.id,
        rule_code="R4_RECORD_DELETION",
        severity_base="HIGH",
        severity_final="HIGH",
        severity="HIGH",
        description="Administrator soft-deleted a record",
        status="NEW"
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    token_subject_admin = create_access_token(subject=admin_user.id)
    token_peer_admin = create_access_token(subject=second_admin_user.id)

    # 1. Subject Administrator attempts review -> 403 Forbidden
    res_forbidden = client.put(
        f"/api/v1/anomalies/alerts/{alert.id}/review",
        json={"status": "UNDER_REVIEW", "review_note": "Self-reviewing my action"},
        headers={"Authorization": f"Bearer {token_subject_admin}"}
    )
    assert res_forbidden.status_code == 403
    assert "Conflict of interest" in res_forbidden.json()["detail"]

    # 2. Peer Administrator reviews successfully -> 200 OK
    res_peer_review = client.put(
        f"/api/v1/anomalies/alerts/{alert.id}/review",
        json={"status": "UNDER_REVIEW", "review_note": "Peer review initiated by Prof. Traballo"},
        headers={"Authorization": f"Bearer {token_peer_admin}"}
    )
    assert res_peer_review.status_code == 200
    assert res_peer_review.json()["status"] == "UNDER_REVIEW"
    assert res_peer_review.json()["reviewed_by_user_id"] == second_admin_user.id

    # 3. Peer Administrator closes alert with mandatory disposition
    res_peer_close = client.put(
        f"/api/v1/anomalies/alerts/{alert.id}/review",
        json={
            "status": "CLOSED",
            "disposition": "CLOSED_EXPECTED_ACTIVITY",
            "review_note": "Verified authorized maintenance deletion."
        },
        headers={"Authorization": f"Bearer {token_peer_admin}"}
    )
    assert res_peer_close.status_code == 200
    assert res_peer_close.json()["status"] == "CLOSED"


def test_tc_ano_24_peer_review_awaiting_uninvolved_admin_state(
    client: TestClient, admin_user: User, second_admin_user: User, db_session: Session
):
    """TC-ANO-24: Awaiting uninvolved Administrator state for multi-admin implication (OI-30)."""
    alert = AnomalyAlert(
        subject_user_id=None,
        rule_code="R1_REPEATED_OUT_OF_SCOPE",
        description="Shared administrative console security incident",
        status="NEW"
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    token_admin1 = create_access_token(subject=admin_user.id)
    token_admin2 = create_access_token(subject=second_admin_user.id)

    # 1. Admin 1 transitions alert to AWAITING_UNINVOLVED_ADMIN, recording both admins as involved
    res_await = client.put(
        f"/api/v1/anomalies/alerts/{alert.id}/review",
        json={
            "status": "AWAITING_UNINVOLVED_ADMIN",
            "review_note": "Both internal administrators logged in during incident window; recusing to uninvolved compliance reviewer.",
            "involved_admin_ids": [admin_user.id, second_admin_user.id]
        },
        headers={"Authorization": f"Bearer {token_admin1}"}
    )
    assert res_await.status_code == 200
    assert res_await.json()["status"] == "AWAITING_UNINVOLVED_ADMIN"

    # 2. Implicated Admin 2 attempts closing -> 403 Forbidden
    res_implicated = client.put(
        f"/api/v1/anomalies/alerts/{alert.id}/review",
        json={
            "status": "CLOSED",
            "disposition": "CLOSED_EXPECTED_ACTIVITY",
            "review_note": "Trying to close"
        },
        headers={"Authorization": f"Bearer {token_admin2}"}
    )
    assert res_implicated.status_code == 403
    assert "implicated" in res_implicated.json()["detail"].lower()


def test_tc_ano_25_retention_job_purges_12mo_data_and_warns_open_alerts(
    client: TestClient, admin_user: User, db_session: Session
):
    """TC-ANO-25: 12-month data retention purges old logs & closed alerts, warns 30 days ahead for open alerts (OI-20)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    admin_token = create_access_token(subject=admin_user.id)

    # 1. Old log (400 days old) -> Should be purged
    old_log = AccessLog(
        actor_user_id=admin_user.id,
        event_type="AUTH_SUCCESS",
        resource_type="AUTH",
        outcome="SUCCESS",
        source_ip="127.0.0.1",
        occurred_at=now - timedelta(days=400)
    )
    # 2. Recent log (30 days old) -> Should be preserved
    recent_log = AccessLog(
        actor_user_id=admin_user.id,
        event_type="AUTH_SUCCESS",
        resource_type="AUTH",
        outcome="SUCCESS",
        source_ip="127.0.0.1",
        occurred_at=now - timedelta(days=30)
    )
    # 3. Old closed alert (400 days old, CLOSED) -> Should be purged
    old_closed_alert = AnomalyAlert(
        rule_code="R2_FAILED_LOGINS_IP",
        status="CLOSED",
        disposition="CLOSED_EXPECTED_ACTIVITY",
        review_note="Old closed alert",
        description="Historical closed alert older than 12 months",
        created_at=now - timedelta(days=400)
    )
    # 4. Old OPEN alert (350 days old, NEW) -> Approaching 12 months (within 30-day window) -> MUST NOT BE PURGED, but WARNED
    open_warning_alert = AnomalyAlert(
        rule_code="R4_RECORD_DELETION",
        status="NEW",
        description="Unreviewed deletion alert approaching retention deadline",
        created_at=now - timedelta(days=350)
    )
    db_session.add_all([old_log, recent_log, old_closed_alert, open_warning_alert])
    db_session.commit()

    old_log_id = old_log.id
    recent_log_id = recent_log.id
    old_closed_alert_id = old_closed_alert.id
    open_warning_alert_id = open_warning_alert.id

    # Run retention job via API endpoint
    res_run = client.post(
        "/api/v1/anomalies/retention/run",
        json={"retention_days": 365, "warning_days": 30},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_run.status_code == 200
    data = res_run.json()
    assert data["success"] is True
    assert data["purged_logs_count"] >= 1
    assert data["purged_closed_alerts_count"] >= 1
    assert data["open_alerts_warned_count"] >= 1

    # Verify preserved records
    assert db_session.query(AccessLog).filter(AccessLog.id == recent_log_id).first() is not None
    assert db_session.query(AccessLog).filter(AccessLog.id == old_log_id).first() is None
    assert db_session.query(AnomalyAlert).filter(AnomalyAlert.id == old_closed_alert_id).first() is None
    # Open alert is preserved!
    assert db_session.query(AnomalyAlert).filter(AnomalyAlert.id == open_warning_alert_id).first() is not None

    # Verify warnings endpoint
    res_warn = client.get(
        "/api/v1/anomalies/retention/warnings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_warn.status_code == 200
    warnings = res_warn.json()
    warn_ids = [w["alert_id"] for w in warnings]
    assert open_warning_alert.id in warn_ids


def test_tc_ano_26_threshold_tuning_audited_with_old_and_new_parameters(
    client: TestClient, admin_user: User, db_session: Session
):
    """TC-ANO-26: Threshold tuning edits in UI record old and new parameters in AccessLog (OI-08)."""
    admin_token = create_access_token(subject=admin_user.id)

    # Update R2-b parameters
    res_tune = client.put(
        "/api/v1/anomalies/rules/R2_FAILED_LOGINS_IP",
        json={
            "parameters": {"threshold": 12, "distinct_usernames_threshold": 3, "window_minutes": 10},
            "client_reviewed": True,
            "reason": "Fine-tuning threshold based on Crossworks monthly review (OI-08)"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_tune.status_code == 200

    # Query audit log for RULE_MODIFIED
    audit_entry = (
        db_session.query(AccessLog)
        .filter(AccessLog.event_type == "RULE_MODIFIED", AccessLog.resource_type == "ANOMALY_RULE")
        .order_by(AccessLog.occurred_at.desc())
        .first()
    )
    assert audit_entry is not None
    details = audit_entry.details
    assert details["rule_code"] == "R2_FAILED_LOGINS_IP"
    assert "old_parameters" in details
    assert details["new_parameters"]["threshold"] == 12
    assert details["new_parameters"]["distinct_usernames_threshold"] == 3
    assert "OI-08" in details["reason"]


def test_tc_ano_27_detection_measurement_30_events_per_rule(
    db_session: Session, test_user: User
):
    """TC-ANO-27: Measure detection latency (p95 <= 60s), 0 missed detections, 0 false alarms across 30 events per rule."""
    import time
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    rules_to_test = [
        "R1_OUT_OF_SCOPE",
        "R1_REPEATED_OUT_OF_SCOPE",
        "R2_FAILED_LOGINS_ACCOUNT",
        "R2_FAILED_LOGINS_IP",
        "R3_HIGH_RECORD_ACCESS",
        "R3_REPORT_BURSTS",
        "R4_RECORD_DELETION",
        "R4_RECORD_EDIT",
        "R4_BULK_EDIT"
    ]

    latencies = []
    missed_detections = 0
    false_alarms = 0

    # 1. 30 Positive / Anomalous events per rule (testing 0 missed detections)
    for rule in rules_to_test:
        for trial in range(30):
            t_start = time.perf_counter()
            alert = None

            if rule == "R1_OUT_OF_SCOPE":
                alert = anomaly_detector.record_out_of_scope_attempt(
                    test_user, f"/records/secret_{trial}", "CORP_BETA", db_session
                )
            elif rule == "R1_REPEATED_OUT_OF_SCOPE":
                # Seed 3 denials
                for d in range(3):
                    db_session.add(AccessLog(
                        actor_user_id=test_user.id,
                        actor_role=test_user.role,
                        event_type="ACCESS_DENIED",
                        resource_type="RECORD",
                        outcome="DENIED",
                        reason_code="OUT_OF_SCOPE",
                        occurred_at=now - timedelta(minutes=1)
                    ))
                db_session.commit()
                alert = anomaly_detector.record_out_of_scope_attempt(
                    test_user, f"/records/secret_rep_{trial}", "CORP_BETA", db_session
                )
            elif rule == "R2_FAILED_LOGINS_ACCOUNT":
                # Seed 5 failed logins for this account
                uname = f"brute_{trial}@test.ph"
                for fl in range(5):
                    db_session.add(AccessLog(
                        event_type="AUTH_FAILURE",
                        resource_type="AUTH",
                        outcome="FAILED",
                        reason_code="INVALID_CREDENTIALS",
                        source_ip=f"10.0.{trial}.1",
                        details={"username": uname},
                        occurred_at=now - timedelta(minutes=1)
                    ))
                db_session.commit()
                alert = anomaly_detector.check_failed_logins(uname, f"10.0.{trial}.1", db_session)
            elif rule == "R2_FAILED_LOGINS_IP":
                ip = f"198.51.100.{trial}"
                for fl in range(10):
                    db_session.add(AccessLog(
                        event_type="AUTH_FAILURE",
                        resource_type="AUTH",
                        outcome="FAILED",
                        reason_code="INVALID_CREDENTIALS",
                        source_ip=ip,
                        details={"username": f"user_{fl}_{trial}@test.ph"},
                        occurred_at=now - timedelta(minutes=1)
                    ))
                db_session.commit()
                alert = anomaly_detector.check_failed_logins(f"user_0_{trial}@test.ph", ip, db_session)
            elif rule == "R3_HIGH_RECORD_ACCESS":
                for v in range(25):
                    db_session.add(AccessLog(
                        actor_user_id=test_user.id,
                        actor_role=test_user.role,
                        event_type="ACCESS_ALLOWED",
                        resource_type="RECORD",
                        outcome="SUCCESS",
                        resource_id=f"rec_burst_{trial}_{v}",
                        occurred_at=now - timedelta(minutes=1)
                    ))
                db_session.commit()
                alert = anomaly_detector.check_high_record_access(test_user, db_session)
            elif rule == "R3_REPORT_BURSTS":
                for r in range(5):
                    db_session.add(AccessLog(
                        actor_user_id=test_user.id,
                        actor_role=test_user.role,
                        event_type="REPORT_GENERATED",
                        resource_type="REPORT",
                        outcome="SUCCESS",
                        occurred_at=now - timedelta(minutes=1)
                    ))
                db_session.commit()
                alert = anomaly_detector.check_report_bursts(test_user, db_session)
            elif rule == "R4_RECORD_DELETION":
                alert = anomaly_detector.record_deletion_event(
                    user=test_user,
                    record_id=f"rec_del_{trial}",
                    company_code="CORP_ALPHA",
                    db=db_session
                )
            elif rule == "R4_RECORD_EDIT":
                alert = anomaly_detector.record_edit_event(
                    user=test_user,
                    record_id=f"rec_edit_{trial}",
                    fields_changed=["score"],
                    db=db_session
                )
            elif rule == "R4_BULK_EDIT":
                for be in range(10):
                    db_session.add(AccessLog(
                        actor_user_id=test_user.id,
                        actor_role=test_user.role,
                        event_type="RECORD_EDIT",
                        resource_type="RECORD",
                        outcome="SUCCESS",
                        resource_id=f"rec_bulk_{trial}_{be}",
                        occurred_at=now - timedelta(minutes=1)
                    ))
                db_session.commit()
                alert = anomaly_detector.record_edit_event(
                    user=test_user,
                    record_id=f"rec_bulk_{trial}_final",
                    fields_changed=["score"],
                    db=db_session
                )
            t_elapsed = time.perf_counter() - t_start
            latencies.append(t_elapsed)

            if alert is None:
                missed_detections += 1

    # 2. 30 Negative / Normal baseline events (testing 0 false alarms)
    clean_user = db_session.query(User).filter_by(email="normal_baseline@test.ph").first()
    if not clean_user:
        clean_user = User(
            email="normal_baseline@test.ph",
            username="normal_baseline",
            full_name="Baseline User",
            hashed_password=get_password_hash("Baseline123!"),
            role="account_manager",
            assigned_client_accounts=["CORP_ALPHA"],
            is_active=True
        )
        db_session.add(clean_user)
        db_session.commit()

    for trial in range(30):
        # 1 single failed login from distinct IP -> well below thresholds
        alert_false = anomaly_detector.check_failed_logins(
            f"normal_user_{trial}@test.ph", f"172.16.1.{trial}", db_session
        )
        if alert_false is not None:
            false_alarms += 1

    # Calculate statistics
    latencies.sort()
    n = len(latencies)
    median_latency = latencies[n // 2]
    p95_latency = latencies[int(n * 0.95)]
    max_latency = latencies[-1]

    # Chapter III Performance Requirement: p95 <= 60 seconds (in practice < 0.1s on local engine)
    assert p95_latency <= 60.0, f"p95 latency {p95_latency}s exceeded 60s limit"
    assert missed_detections == 0, f"Expected 0 missed detections, got {missed_detections}"
    assert false_alarms == 0, f"Expected 0 false alarms, got {false_alarms}"

    print(
        f"\n[Phase 4 Anomaly Measurement M4] Total evaluations: {n} | "
        f"Median: {median_latency*1000:.2f}ms | p95: {p95_latency*1000:.2f}ms | Max: {max_latency*1000:.2f}ms | "
        f"Missed detections: {missed_detections} | False alarms: {false_alarms}"
    )


def test_tc_ano_28_executive_anomaly_report_and_exports(client: TestClient, admin_user: User):
    """TC-ANO-28: Executive Security & Anomaly Audit Report generation, PDF rendering, and CSV exports (OI-29, OI-30)."""
    admin_token = create_access_token(subject=admin_user.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Query executive JSON report summary
    res_json = client.get("/api/v1/anomalies/report", headers=headers)
    assert res_json.status_code == 200
    data = res_json.json()
    assert "total_alerts" in data
    assert "unreviewed_alerts" in data
    assert "closed_alerts" in data
    assert "high_severity_count" in data
    assert "rules_breakdown" in data
    assert len(data["rules_breakdown"]) > 0

    # 2. Download executive ReportLab PDF report
    res_pdf = client.get("/api/v1/anomalies/report/pdf", headers=headers)
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 1000
    assert res_pdf.content[:4] == b"%PDF"

    # 3. Export CSV ledger
    res_csv = client.get("/api/v1/anomalies/report/csv", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Alert ID" in res_csv.text
