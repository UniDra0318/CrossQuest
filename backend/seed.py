"""Seed script to populate CrossQuest database with initial pilot data.

Conforms to:
- Chapter I & III specification: 5 system roles (Admin, Account Manager, Finance, Trainer, Trainee).
- No client company accounts.
- No clearance levels (SEC-11).
- 5 seed certification types with 36-month validity period (FR-18).
- Hybrid CP-ABE policies with alphanumeric tokens (DD-01, DD-04).
- Anomaly alerts with full review lifecycle and R1-R4 + S1 rules (Table 20).
"""
import sys
import os
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.entities import (
    User, ClientCompany, Trainee, TraineeAffiliation, Course, TrainingSession,
    TrainerAssignment, AccountManagerAssignment, TrainingRecord, TrainingRecordVersion,
    CertificationType, Certificate, Notification, GamificationProgress,
    AccessLog, AnomalyAlert, Quiz, QuizQuestion, Team, TeamMember
)
from app.crypto.cpabe_engine import cpabe_engine

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains records. Clearing and reseeding to conform with Chapter III...")
            db.query(Notification).delete()
            db.query(Certificate).delete()
            db.query(CertificationType).delete()
            db.query(TrainingRecordVersion).delete()
            db.query(TrainingRecord).delete()
            db.query(TeamMember).delete()
            db.query(Team).delete()
            db.query(QuizQuestion).delete()
            db.query(Quiz).delete()
            db.query(GamificationProgress).delete()
            db.query(TraineeAffiliation).delete()
            db.query(TrainerAssignment).delete()
            db.query(AccountManagerAssignment).delete()
            db.query(TrainingSession).delete()
            db.query(Course).delete()
            db.query(Trainee).delete()
            db.query(AnomalyAlert).delete()
            db.query(AccessLog).delete()
            db.query(User).delete()
            db.query(ClientCompany).delete()
            db.commit()

        print("Seeding database with Chapter III compliant CrossQuest pilot data...")

        # 1. Seed Client Companies (Pilot tenants)
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
        db.refresh(c_alpha)
        db.refresh(c_beta)
        db.refresh(c_gamma)

        # 2. Seed 5 Roles (FR-01: Admin, Account Manager, Finance, Trainer, Trainee)
        default_pwd = get_password_hash("password123")
        
        u_admin = User(
            email="admin@crossworks.ph",
            username="admin_sarah",
            full_name="Dr. Sarah Jenkins",
            hashed_password=default_pwd,
            role="admin",
            assigned_client_accounts=["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
            is_superuser=True
        )
        u_acct_mgr = User(
            email="marcus.reyes@crossworks.ph",
            username="am_marcus",
            full_name="Marcus Reyes",
            hashed_password=default_pwd,
            role="account_manager",
            assigned_client_accounts=["CORP_ALPHA"]
        )
        u_finance = User(
            email="elena.santos@crossworks.ph",
            username="fin_elena",
            full_name="Elena Santos",
            hashed_password=default_pwd,
            role="finance",
            assigned_client_accounts=["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"]
        )
        u_trainer = User(
            email="david.lim@crossworks.ph",
            username="trainer_david",
            full_name="David Lim",
            hashed_password=default_pwd,
            role="trainer",
            assigned_client_accounts=[]
        )
        u_trainee = User(
            email="juan.delacruz@alpha-corp.ph",
            username="trainee_juan",
            full_name="Juan Dela Cruz",
            hashed_password=default_pwd,
            role="trainee",
            assigned_client_accounts=[]
        )
        db.add_all([u_admin, u_acct_mgr, u_finance, u_trainer, u_trainee])
        db.commit()
        for u in [u_admin, u_acct_mgr, u_finance, u_trainer, u_trainee]:
            db.refresh(u)

        # Link Account Manager Assignment
        am_assign = AccountManagerAssignment(
            user_id=u_acct_mgr.id,
            company_id=c_alpha.id,
            assigned_by=u_admin.id
        )
        db.add(am_assign)
        db.commit()

        # 3. Seed Certification Types (FR-18: 5 named certifications, 36 months validity)
        cert_types = [
            CertificationType(code="PMP", name="Project Management Professional (PMP)", validity_months=36, validity_basis="PMI 3-year renewal cycle"),
            CertificationType(code="CAPM", name="Certified Associate in Project Management (CAPM)", validity_months=36, validity_basis="PMI 3-year renewal cycle"),
            CertificationType(code="PMI_ACP", name="PMI Agile Certified Practitioner (PMI-ACP)", validity_months=36, validity_basis="PMI 3-year renewal cycle"),
            CertificationType(code="CPMAI", name="Certified Prompt Engineering & AI Practitioner (CPMAI)", validity_months=36, validity_basis="Crossworks client-stated 3-year validity"),
            CertificationType(code="ISO_31000", name="ISO 31000 Certified Risk Manager", validity_months=36, validity_basis="ISO standard 3-year recertification")
        ]
        db.add_all(cert_types)
        db.commit()

        # 4. Seed Trainees
        t_juan = Trainee(
            trainee_code="TRN-9021",
            user_id=u_trainee.id,
            first_name="Juan",
            last_name="Dela Cruz",
            email="juan.delacruz@alpha-corp.ph",
            display_name="CyberKnight9021",
            phone="+63 917 123 4567",
            current_company_id=c_alpha.id
        )
        t_maria = Trainee(
            trainee_code="TRN-9088",
            first_name="Maria",
            last_name="Clara",
            email="maria.clara@maya-fintech.ph",
            display_name="MayaFinPro",
            phone="+63 918 234 5678",
            current_company_id=c_beta.id
        )
        t_gabriel = Trainee(
            trainee_code="TRN-9114",
            first_name="Gabriel",
            last_name="Ramos",
            email="g.ramos@ayala-retail.ph",
            display_name="RetailOpsRamos",
            phone="+63 919 345 6789",
            current_company_id=c_gamma.id
        )
        t_beatrice = Trainee(
            trainee_code="TRN-9045",
            first_name="Beatrice",
            last_name="Tan",
            email="beatrice.tan@alpha-corp.ph",
            display_name="BeaSecOps",
            phone="+63 920 456 7890",
            current_company_id=c_alpha.id
        )
        db.add_all([t_juan, t_maria, t_gabriel, t_beatrice])
        db.commit()
        for t in [t_juan, t_maria, t_gabriel, t_beatrice]:
            db.refresh(t)

        # Historical Trainee Affiliations
        affil_juan = TraineeAffiliation(
            trainee_id=t_juan.id,
            company_id=c_alpha.id,
            valid_from=datetime(2026, 8, 1)
        )
        db.add(affil_juan)
        db.commit()

        # 5. Courses and Training Sessions
        c_sec = Course(
            course_code="CRS-SEC01",
            name="Information Security Management & Governance",
            description="Comprehensive enterprise risk and security framework aligned with ISO 27001 and NIST CSF 2.0."
        )
        c_pmp = Course(
            course_code="CRS-PMP01",
            name="PMP Exam Review & Agile Project Delivery",
            description="Rigorous project lifecycle governance and Agile framework mastery."
        )
        db.add_all([c_sec, c_pmp])
        db.commit()
        db.refresh(c_sec)
        db.refresh(c_pmp)

        sess1 = TrainingSession(
            session_code="SESS-2026-08A",
            course_id=c_sec.id,
            course_name=c_sec.name,
            start_date=datetime(2026, 8, 10),
            end_date=datetime(2026, 8, 15),
            delivery_type="Public"
        )
        sess2 = TrainingSession(
            session_code="SESS-2026-09B",
            course_id=c_pmp.id,
            course_name=c_pmp.name,
            start_date=datetime(2026, 9, 1),
            end_date=datetime(2026, 9, 20),
            delivery_type="Dedicated"
        )
        db.add_all([sess1, sess2])
        db.commit()
        db.refresh(sess1)
        db.refresh(sess2)

        # Trainer Assignment
        tr_assign = TrainerAssignment(
            user_id=u_trainer.id,
            session_id=sess1.id,
            valid_from=datetime(2026, 8, 1)
        )
        db.add(tr_assign)
        db.commit()

        # 6. Training Records (with DD-01 trainee attribute & DD-04 alphanumeric tokens)
        # Policy format: ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTCORPALPHAV1) or (ROLETRAINER and TRAININGT001V1) or TRAINEETRN9021
        rec1_policy = "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTCORPALPHAV1) or (ROLETRAINER and TRAININGSESS202608AV1) or TRAINEETRN9021"
        rec1_payload = {
            "score": 94.5,
            "practical_lab": "High Distinction (Vulnerability Remediation)",
            "trainer_remarks": "Demonstrated advanced understanding of security controls and ISO 27001 audit protocols.",
            "certificate_reference": "CERT-ISO31000-2026-9021"
        }
        enc1 = cpabe_engine.encrypt_record(rec1_payload, rec1_policy, record_id="rec-101", version=1)

        rec1 = TrainingRecord(
            id="rec-101",
            trainee_id=t_juan.id,
            session_id=sess1.id,
            company_at_completion_id=c_alpha.id,
            course_name=c_sec.name,
            status="Completed",
            completion_date=datetime(2026, 8, 15),
            score=94.5,
            encryption_policy=rec1_policy,
            policy_version=1,
            abe_ciphertext=enc1.get("abe_ciphertext"),
            payload_ciphertext=enc1.get("payload_ciphertext"),
            nonce=enc1.get("nonce"),
            is_encrypted=True
        )

        rec2_policy = "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTFINTECHBETAV1) or TRAINEETRN9088"
        rec2_payload = {
            "score": 88.0,
            "practical_lab": "Pass with Merit (Data Mapping & Consent Flow)",
            "trainer_remarks": "Completed comprehensive privacy impact assessment simulation.",
            "certificate_reference": "CERT-PMP-2026-9088"
        }
        enc2 = cpabe_engine.encrypt_record(rec2_payload, rec2_policy, record_id="rec-102", version=1)

        rec2 = TrainingRecord(
            id="rec-102",
            trainee_id=t_maria.id,
            session_id=sess2.id,
            company_at_completion_id=c_beta.id,
            course_name=c_pmp.name,
            status="Completed",
            completion_date=datetime(2026, 9, 20),
            score=88.0,
            encryption_policy=rec2_policy,
            policy_version=1,
            abe_ciphertext=enc2.get("abe_ciphertext"),
            payload_ciphertext=enc2.get("payload_ciphertext"),
            nonce=enc2.get("nonce"),
            is_encrypted=True
        )

        rec3_policy = "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTRETAILGAMMAV1) or TRAINEETRN9114"
        rec3_payload = {
            "score": 72.0,
            "practical_lab": "In Progress (Module 4 of 6)",
            "trainer_remarks": "Midterm evaluation passed. Preparing for capstone simulation.",
            "certificate_reference": None
        }
        enc3 = cpabe_engine.encrypt_record(rec3_payload, rec3_policy, record_id="rec-103", version=1)

        rec3 = TrainingRecord(
            id="rec-103",
            trainee_id=t_gabriel.id,
            session_id=sess1.id,
            company_at_completion_id=c_gamma.id,
            course_name=c_sec.name,
            status="In progress",
            completion_date=None,
            score=72.0,
            encryption_policy=rec3_policy,
            policy_version=1,
            abe_ciphertext=enc3.get("abe_ciphertext"),
            payload_ciphertext=enc3.get("payload_ciphertext"),
            nonce=enc3.get("nonce"),
            is_encrypted=True
        )

        db.add_all([rec1, rec2, rec3])
        db.commit()

        # 7. Seed Certificates (36 months validity)
        cert_juan = Certificate(
            record_id=rec1.id,
            trainee_id=t_juan.id,
            cert_type_code="ISO_31000",
            title="ISO 31000 Certified Risk Manager",
            issue_date=datetime(2026, 8, 15),
            expiry_date=datetime(2029, 8, 15),
            expiry_basis="Calculated: issue_date + 36 months",
            status="Valid",
            is_nearing_renewal=False
        )
        
        # An expiring soon certificate (e.g. simulated issued in 2023, expiring in 45 days)
        expiring_date = datetime.utcnow() + timedelta(days=45)
        cert_maria = Certificate(
            record_id=rec2.id,
            trainee_id=t_maria.id,
            cert_type_code="PMP",
            title="Project Management Professional (PMP)",
            issue_date=expiring_date - timedelta(days=365*3),
            expiry_date=expiring_date,
            expiry_basis="Provided in source (Expiring in 45 days)",
            status="Expiring soon",
            is_nearing_renewal=True
        )
        db.add_all([cert_juan, cert_maria])
        db.commit()
        db.refresh(cert_maria)

        # Expiry notification for Maria's cert
        notif_trainee = Notification(
            recipient_user_id=u_trainee.id,
            certification_id=cert_maria.id,
            offset_days=60,
            title="Certification Renewal Notice (60 Days)",
            message="Your PMP certification is scheduled to expire in 45 days. Please review renewal requirements."
        )
        notif_am = Notification(
            recipient_user_id=u_acct_mgr.id,
            certification_id=cert_maria.id,
            offset_days=60,
            title="Trainee Certification Nearing Expiry: Maria Clara",
            message="Trainee Maria Clara (Maya FinTech) has a PMP certification expiring in 45 days."
        )
        db.add_all([notif_trainee, notif_am])
        db.commit()

        # 8. Seed Gamification (Badges, Points, Display Names)
        gam_juan = GamificationProgress(
            trainee_id=t_juan.id,
            points=240,
            level=3,
            badges=["FIRST_STEP", "RISK_GUARDIAN"],
            quizzes_completed=3
        )
        gam_maria = GamificationProgress(
            trainee_id=t_maria.id,
            points=180,
            level=2,
            badges=["FIRST_STEP"],
            quizzes_completed=2
        )
        db.add_all([gam_juan, gam_maria])
        db.commit()

        # Seed Team
        team1 = Team(
            session_id=sess1.id,
            team_name="Security Guardians",
            created_by_user_id=u_trainer.id
        )
        db.add(team1)
        db.commit()
        db.refresh(team1)

        db.add(TeamMember(team_id=team1.id, trainee_id=t_juan.id))
        db.commit()

        # 9. Seed Access Logs & Anomaly Alerts (Table 20 & Alert Lifecycle)
        log1 = AccessLog(
            actor_user_id=u_acct_mgr.id,
            actor_role="account_manager",
            event_type="ACCESS_DENIED",
            resource_type="RECORD",
            resource_id="rec-102",
            company_id=c_beta.id,
            outcome="DENIED",
            reason_code="OUT_OF_SCOPE",
            source_ip="192.168.1.105",
            details={"requested_company": "FINTECH_BETA", "assigned_companies": ["CORP_ALPHA"]}
        )
        log2 = AccessLog(
            actor_user_id=u_admin.id,
            actor_role="admin",
            event_type="ACCESS_ALLOWED",
            resource_type="RECORD",
            resource_id="rec-101",
            company_id=c_alpha.id,
            outcome="SUCCESS",
            source_ip="192.168.1.10",
            details={"mode": "DECRYPT"}
        )
        db.add_all([log1, log2])
        db.commit()

        alert1 = AnomalyAlert(
            subject_user_id=u_acct_mgr.id,
            rule_code="R1_OUT_OF_SCOPE",
            severity="LOW",
            status="NEW",
            description="Account Manager Marcus Reyes attempted to view out-of-scope record for client 'FINTECH_BETA'.",
            event_count=1,
            tags=[],
            metadata_info={"record_id": "rec-102", "target_company": "FINTECH_BETA"}
        )
        alert2 = AnomalyAlert(
            subject_user_id=u_trainer.id,
            rule_code="R4_RECORD_DELETION",
            severity="CRITICAL", # Elevated from HIGH due to S1 after-hours tag
            status="UNDER_REVIEW",
            reviewed_by_user_id=u_admin.id,
            reviewed_at=datetime.utcnow() - timedelta(hours=2),
            description="Attempted deletion of client record outside normal working hours.",
            event_count=1,
            tags=["after_hours"],
            metadata_info={"record_id": "rec-103", "hour_utc": 23}
        )
        alert3 = AnomalyAlert(
            subject_user_id=u_acct_mgr.id,
            rule_code="R1_REPEATED_OUT_OF_SCOPE",
            severity="MEDIUM",
            status="CLOSED",
            disposition="CLOSED_EXPECTED_ACTIVITY",
            review_note="Verified with client: Marcus was consulting during client transition period.",
            reviewed_by_user_id=u_admin.id,
            reviewed_at=datetime.utcnow() - timedelta(days=1),
            description="3 consecutive out-of-scope requests detected within 15 minutes.",
            event_count=3,
            tags=[],
            metadata_info={"records": ["rec-102", "rec-103"]}
        )
        db.add_all([alert1, alert2, alert3])
        db.commit()

        print("Seeding completed successfully with full Chapter III adherence!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
