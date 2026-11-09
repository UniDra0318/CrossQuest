from app.core.database import SessionLocal
from app.models.entities import User, AnomalyRule, AccessLog, AnomalyAlert
from app.core.security import get_password_hash
from app.api.endpoints.anomalies import DEFAULT_RULES
from datetime import datetime, timezone

db = SessionLocal()

# 1. Ensure joey.mallari exists and has correct password & role
u = db.query(User).filter(User.email == 'joey.mallari@xworks.ph').first()
if not u:
    u = User(
        email='joey.mallari@xworks.ph',
        username='joey_mallari',
        full_name="Dr. Julian Mercer",
        hashed_password=get_password_hash('password123'),
        role='admin',
        clearance_level=3,
        is_active=True,
        is_superuser=True,
        mfa_enabled=False
    )
    db.add(u)
    print("Created joey.mallari in DB")
else:
    u.full_name = "Dr. Julian Mercer"
    u.hashed_password = get_password_hash('password123')
    u.is_active = True
    u.mfa_enabled = False
    print("Updated joey.mallari in DB")

# 2. Ensure admin@crossworks.ph also has password123
a = db.query(User).filter(User.email == 'admin@crossworks.ph').first()
if a:
    a.hashed_password = get_password_hash('password123')
    a.mfa_enabled = False
    print("Updated admin@crossworks.ph in DB")

# 3. Seed AnomalyRule if not present
rule_count = db.query(AnomalyRule).count()
if rule_count == 0:
    for r_data in DEFAULT_RULES:
        rule = AnomalyRule(
            rule_code=r_data["rule_code"],
            parameters=r_data["parameters"],
            version_no=1,
            client_reviewed=True,
            description=r_data["description"]
        )
        db.add(rule)
    print(f"Seeded {len(DEFAULT_RULES)} AnomalyRule records in DB")
else:
    print(f"AnomalyRule already has {rule_count} records in DB")

# 4. Ensure sample AnomalyAlert records exist
alert_count = db.query(AnomalyAlert).count()
if alert_count == 0:
    sample_alerts = [
        AnomalyAlert(
            rule_code="R1_OUT_OF_SCOPE",
            severity="LOW",
            status="NEW",
            details={"attempted_client": "FINTECH_BETA", "reason": "Single out-of-scope decryption attempt"},
            actor_user_id=u.id,
            actor_role="account_manager",
            occurred_at=datetime.now(timezone.utc)
        ),
        AnomalyAlert(
            rule_code="S1_AFTER_HOURS",
            severity="MEDIUM",
            status="NEW",
            details={"hour": 23, "tz": "UTC+8", "reason": "Decryption outside 09:00-18:00 standard window"},
            actor_user_id=u.id,
            actor_role="trainer",
            occurred_at=datetime.now(timezone.utc)
        )
    ]
    for sa in sample_alerts:
        db.add(sa)
    print("Seeded sample AnomalyAlert records")

# 5. Ensure sample AccessLog records exist
log_count = db.query(AccessLog).count()
if log_count == 0:
    sample_logs = [
        AccessLog(
            actor_user_id=u.id,
            actor_role="admin",
            event_type="CRYPTOGRAPHIC_KEY_ROTATION",
            resource_type="DMA_ABE_KEY_AUTHORITY",
            outcome="SUCCESS",
            source_ip="127.0.0.1",
            details={"algorithm": "Native Charm CP-ABE BSW07", "curve": "SS512"}
        ),
        AccessLog(
            actor_user_id=u.id,
            actor_role="admin",
            event_type="RULE_MODIFIED",
            resource_type="ANOMALY_RULE",
            outcome="SUCCESS",
            source_ip="127.0.0.1",
            details={"rule_code": "R1_OUT_OF_SCOPE", "version": 1}
        ),
        AccessLog(
            actor_user_id=u.id,
            actor_role="system",
            event_type="SECURITY_AUDIT_VERIFIED",
            resource_type="AUDIT_ENGINE",
            outcome="SUCCESS",
            source_ip="127.0.0.1",
            details={"statutory_limit_days": 365, "schedule": "DAILY"}
        )
    ]
    for sl in sample_logs:
        db.add(sl)
    print("Seeded sample AccessLog records")

db.commit()
print("All DB seeds successfully committed!")

