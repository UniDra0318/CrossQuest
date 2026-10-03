"""Seed script to populate CrossQuest database with initial real data."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.entities import (
    User, ClientCompany, Trainee, TrainingRecord, Certificate, GamificationProgress, AnomalyAlert
)
from datetime import datetime, timedelta

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains records. Skipping seed.")
            return

        print("Seeding database with initial CrossQuest data...")

        # 1. Companies
        c_alpha = ClientCompany(
            code="CORP_ALPHA",
            name="San Miguel Conglomerate Holdings",
            industry="Conglomerate & Industrial"
        )
        c_beta = ClientCompany(
            code="FINTECH_BETA",
            name="Maya FinTech Digital Innovations",
            industry="Financial Services & Banking"
        )
        c_gamma = ClientCompany(
            code="RETAIL_GAMMA",
            name="Ayala Retail Omnichannel Corp",
            industry="Retail & Supply Chain"
        )
        db.add_all([c_alpha, c_beta, c_gamma])
        db.commit()

        # 2. Users (5 Roles)
        default_pwd = get_password_hash("password123")
        u_admin = User(
            email="admin@crossworks.ph",
            full_name="Dr. Sarah Jenkins",
            hashed_password=default_pwd,
            role="admin",
            clearance_level=3,
            assigned_client_accounts=["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
            is_superuser=True
        )
        u_staff = User(
            email="marcus.reyes@crossworks.ph",
            full_name="Marcus Reyes",
            hashed_password=default_pwd,
            role="crossworks_staff",
            clearance_level=2,
            assigned_client_accounts=["CORP_ALPHA"]
        )
        u_trainer = User(
            email="david.lim@crossworks.ph",
            full_name="David Lim",
            hashed_password=default_pwd,
            role="trainer",
            clearance_level=1,
            assigned_client_accounts=["CORP_ALPHA", "FINTECH_BETA"]
        )
        u_company = User(
            email="patricia.hr@alpha-corp.ph",
            full_name="Patricia Santos",
            hashed_password=default_pwd,
            role="company_staff",
            clearance_level=1,
            assigned_client_accounts=["CORP_ALPHA"]
        )
        u_trainee = User(
            email="juan.delacruz@alpha-corp.ph",
            full_name="Juan Dela Cruz",
            hashed_password=default_pwd,
            role="trainee",
            clearance_level=1,
            assigned_client_accounts=["CORP_ALPHA"]
        )
        db.add_all([u_admin, u_staff, u_trainer, u_company, u_trainee])
        db.commit()

        # 3. Trainees
        t1 = Trainee(
            first_name="Juan",
            last_name="Dela Cruz",
            email="juan.delacruz@alpha-corp.ph",
            current_company_id=c_alpha.id
        )
        t2 = Trainee(
            first_name="Maria",
            last_name="Clara",
            email="maria.clara@maya-fintech.ph",
            current_company_id=c_beta.id
        )
        t3 = Trainee(
            first_name="Beatrice",
            last_name="Tan",
            email="beatrice.tan@alpha-corp.ph",
            current_company_id=c_alpha.id
        )
        t4 = Trainee(
            first_name="Gabriel",
            last_name="Ramos",
            email="g.ramos@ayala-retail.ph",
            current_company_id=c_gamma.id
        )
        db.add_all([t1, t2, t3, t4])
        db.commit()

        # 4. Gamification Profile
        g1 = GamificationProgress(
            trainee_id=t1.id,
            points=12877,
            level=4,
            badges=["FIRST_STEP", "SECURITY_CHAMPION", "STREAK_MASTER"],
            quizzes_completed=5
        )
        db.add(g1)

        # 5. Training Records
        rec1 = TrainingRecord(
            trainee_id=t1.id,
            company_at_completion_id=c_alpha.id,
            course_name="Security Audit & Compliance",
            status="completed",
            score=94.5,
            completion_date=datetime.utcnow() - timedelta(days=20),
            encryption_policy="COMPANY:CORP_ALPHA OR ROLE:ADMIN",
            encrypted_payload='{"score": "94.5%", "remarks": "Passed practical audit with honors", "credentialHash": "SHA256:e3b0c44298fc1c14"}',
            is_encrypted=True
        )
        rec2 = TrainingRecord(
            trainee_id=t2.id,
            company_at_completion_id=c_beta.id,
            course_name="Privacy Information Management",
            status="completed",
            score=88.0,
            completion_date=datetime.utcnow() - timedelta(days=12),
            encryption_policy="COMPANY:FINTECH_BETA OR ROLE:ADMIN",
            encrypted_payload='{"score": "88.0%", "remarks": "High distinction on data mapping API", "credentialHash": "SHA256:8f434346648f6b96"}',
            is_encrypted=True
        )
        rec3 = TrainingRecord(
            trainee_id=t3.id,
            company_at_completion_id=c_alpha.id,
            course_name="Pipeline Security & Guardrails",
            status="completed",
            score=98.0,
            completion_date=datetime.utcnow() - timedelta(days=5),
            encryption_policy="COMPANY:CORP_ALPHA OR ROLE:ADMIN",
            encrypted_payload='{"score": "98.0%", "remarks": "Exemplary capstone project", "credentialHash": "SHA256:d4735e3a265e16ee"}',
            is_encrypted=True
        )
        rec4 = TrainingRecord(
            trainee_id=t4.id,
            company_at_completion_id=c_gamma.id,
            course_name="Threat Modeling & Incident Response",
            status="in_progress",
            score=72.0,
            encryption_policy="COMPANY:RETAIL_GAMMA OR ROLE:ADMIN",
            encrypted_payload='{"score": "72.0%", "remarks": "Midterm evaluation passed", "credentialHash": "PENDING"}',
            is_encrypted=True
        )
        db.add_all([rec1, rec2, rec3, rec4])

        # 6. Certificates
        cert1 = Certificate(
            trainee_id=t1.id,
            title="Certified Security Implementer",
            issue_date=datetime.utcnow() - timedelta(days=320),
            expiry_date=datetime.utcnow() + timedelta(days=38),
            is_nearing_renewal=True,
            status="active"
        )
        db.add(cert1)

        # 7. Anomalies
        a1 = AnomalyAlert(
            user_id=u_staff.id,
            anomaly_type="OUT_OF_SCOPE",
            severity="HIGH",
            description="Attempted to access record belonging to Maya FinTech without matching company attribute.",
            metadata_info={"record_id": rec2.id, "target_company": "FINTECH_BETA"},
            is_reviewed=False
        )
        db.add(a1)

        db.commit()
        print("Database successfully seeded!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
