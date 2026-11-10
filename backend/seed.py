"""Seed script to populate CrossQuest database with comprehensive pilot data.

Conforms to:
- Chapter I & III specification: 5 system roles (Admin, Account Manager, Finance, Trainer, Trainee).
- 5 enterprise client companies (CORP_ALPHA, FINTECH_BETA, RETAIL_GAMMA, BANK_DELTA, TELCO_EPSILON).
- No clearance levels (SEC-11).
- 7 seed certification types with 36-month validity period (FR-18).
- Hybrid CP-ABE policies with alphanumeric tokens (DD-01, DD-04).
- 12+ Training records with realistic encrypted payloads and audit versions.
- Quizzes, questions, answer keys (SEC-26), and attempts.
- Gamification progress with live streaks, points, levels, and badges.
- Anomaly alerts with full review lifecycle and R1-R4 + S1 rules (Table 13).
"""
import sys
import os
import json
import hashlib
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.entities import (
    User, ClientCompany, Trainee, TraineeAffiliation, Course, TrainingSession,
    TrainerAssignment, AccountManagerAssignment, TrainingRecord, TrainingRecordVersion,
    CertificationType, Certificate, Notification, GamificationProgress,
    AccessLog, AnomalyAlert, Quiz, QuizQuestion, QuizAnswerKey, QuizAttempt, Team, TeamMember,
    ImportBatch, ImportDiscrepancy, ImportStagingRow
)
from app.crypto.cpabe_engine import cpabe_engine

def seed_database():
    if settings.ENVIRONMENT != "development":
        raise RuntimeError(
            f"Database seeding with hardcoded demo credentials is prohibited in '{settings.ENVIRONMENT}' environment (SEC-01)."
        )
    print("Rebuilding database schema from SQLAlchemy models...")
    with engine.connect() as conn:
        if engine.dialect.name == "postgresql":
            conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
            conn.commit()
        else:
            Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 0. Clean old tables in reverse dependency order
        print("Clearing old records and preparing fresh populated database...")
        db.query(Notification).delete()
        db.query(Certificate).delete()
        db.query(CertificationType).delete()
        db.query(TrainingRecordVersion).delete()
        db.query(TrainingRecord).delete()
        db.query(TeamMember).delete()
        db.query(Team).delete()
        db.query(QuizAttempt).delete()
        db.query(QuizAnswerKey).delete()
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

        print("Seeding database with rich multi-tenant CrossQuest data...")

        # 1. Seed 5 Client Companies (Pilot tenants)
        c_alpha = ClientCompany(
            code="CORP_ALPHA",
            name="San Miguel Conglomerate Holdings",
            industry="Conglomerate & Industrial"
        )
        c_beta = ClientCompany(
            code="FINTECH_BETA",
            name="Maya FinTech Digital Innovations",
            industry="Financial Services & Digital Payments"
        )
        c_gamma = ClientCompany(
            code="RETAIL_GAMMA",
            name="Ayala Retail Omnichannel Corp",
            industry="Retail & Supply Chain"
        )
        c_delta = ClientCompany(
            code="BANK_DELTA",
            name="BDO Unibank Enterprise Systems",
            industry="Commercial Banking & Capital Markets"
        )
        c_epsilon = ClientCompany(
            code="TELCO_EPSILON",
            name="Globe Telecom Digital Infrastructure",
            industry="Telecommunications & Cloud"
        )
        db.add_all([c_alpha, c_beta, c_gamma, c_delta, c_epsilon])
        db.commit()
        for c in [c_alpha, c_beta, c_gamma, c_delta, c_epsilon]:
            db.refresh(c)

        # 2. Seed Users across all 5 roles
        default_pwd = get_password_hash("password123")
        admin_recovery_codes = [
            hashlib.sha256(b"RECO-1111").hexdigest(),
            hashlib.sha256(b"RECO-2222").hexdigest(),
            hashlib.sha256(b"RECO-3333").hexdigest(),
            hashlib.sha256(b"RECO-4444").hexdigest(),
        ]

        # 1. Administrators (Exactly 2 accounts per Chapter III Table 3 & OI-29: Joey Mallari & Len Mallari)
        u_admin1 = User(
            email="joey.mallari@xworks.ph",
            username="joey_mallari",
            full_name="Joselito 'Joey' Mallari Jr.",
            job_title="Principal Consultant & Lead Administrator",
            hashed_password=default_pwd,
            role="admin",
            clearance_level=3,
            assigned_client_accounts=["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
            is_superuser=True,
            mfa_enabled=True,
            mfa_secret="JBSWY3DPEHPK3PXP",
            mfa_recovery_codes=admin_recovery_codes
        )
        u_admin2 = User(
            email="len.mallari@xworks.ph",
            username="len_mallari",
            full_name="Len Mallari",
            job_title="Compliance Administrator & Peer Reviewer",
            hashed_password=default_pwd,
            role="admin",
            clearance_level=3,
            assigned_client_accounts=["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
            is_superuser=True,
            mfa_enabled=True,
            mfa_secret="JBSWY3DPEHPK3PXP",
            mfa_recovery_codes=admin_recovery_codes
        )

        # 2. Account Managers (Exactly 3 accounts per Chapter III Table 3 & OI-29: Erika Bana, Sharon De Vera, Brian Mendoza)
        u_am1 = User(
            email="erika.bana@crossworks.ph",
            username="am_erika",
            full_name="Erika Bana",
            job_title="Account Manager: Enterprise Conglomerates",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=["CORP_ALPHA", "BANK_DELTA"]
        )
        u_am2 = User(
            email="sharon.devera@crossworks.ph",
            username="am_sharon",
            full_name="Sharon De Vera",
            job_title="Account Manager: Strategic Portfolios",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=["FINTECH_BETA", "RETAIL_GAMMA"]
        )
        u_am3 = User(
            email="brian.mendoza@crossworks.ph",
            username="am_brian",
            full_name="Brian Mendoza",
            job_title="Account Manager: Tech & Telecom",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=["TELCO_EPSILON"]
        )

        # 3. Finance (Exactly 1 account per Chapter III Table 3: Elena Santos)
        u_fin1 = User(
            email="elena.santos@crossworks.ph",
            username="fin_elena",
            full_name="Elena Santos",
            job_title="Finance & Billing Specialist",
            hashed_password=default_pwd,
            role="finance",
            clearance_level=2,
            assigned_client_accounts=["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
            mfa_enabled=True,
            mfa_secret="JBSWY3DPEHPK3PXP",
            mfa_recovery_codes=admin_recovery_codes
        )

        # 4. Lead Trainer (Exactly 1 account per Chapter III Table 3: Jordan Ramos)
        u_trainer1 = User(
            email="jordan.ramos@crossworks.ph",
            username="trainer_jordan",
            full_name="Jordan Ramos",
            job_title="Lead Technical Instructor: Zero-Trust & Cloud",
            hashed_password=default_pwd,
            role="trainer",
            assigned_client_accounts=["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"]
        )

        # Trainees (Login Accounts)
        u_trn_juan = User(
            email="juan.delacruz@alpha-corp.ph",
            username="trainee_juan",
            full_name="Juan Dela Cruz",
            hashed_password=default_pwd,
            role="trainee",
            assigned_client_accounts=[]
        )
        u_trn_beatrice = User(
            email="beatrice.tan@alpha-corp.ph",
            username="trainee_beatrice",
            full_name="Beatrice Tan",
            hashed_password=default_pwd,
            role="trainee",
            assigned_client_accounts=[]
        )
        u_trn_maria = User(
            email="maria.clara@maya-fintech.ph",
            username="trainee_maria",
            full_name="Maria Clara",
            hashed_password=default_pwd,
            role="trainee",
            assigned_client_accounts=[]
        )
        u_trn_liam = User(
            email="liam.chen@maya-fintech.ph",
            username="trainee_liam",
            full_name="Liam Chen",
            hashed_password=default_pwd,
            role="trainee",
            assigned_client_accounts=[]
        )
        u_trn_gabriel = User(
            email="g.ramos@ayala-retail.ph",
            username="trainee_gabriel",
            full_name="Gabriel Ramos",
            hashed_password=default_pwd,
            role="trainee",
            assigned_client_accounts=[]
        )
        u_trn_chloe = User(
            email="chloe.garcia@ayala-retail.ph",
            username="trainee_chloe",
            full_name="Chloe Garcia",
            hashed_password=default_pwd,
            role="trainee",
            assigned_client_accounts=[]
        )

        all_users = [
            u_admin1, u_admin2, u_am1, u_am2, u_am3, u_fin1,
            u_trainer1,
            u_trn_juan, u_trn_beatrice, u_trn_maria, u_trn_liam, u_trn_gabriel, u_trn_chloe
        ]
        db.add_all(all_users)
        db.commit()
        for u in all_users:
            db.refresh(u)

        # Account Manager Assignments (Table 3, OI-29)
        am_assign1 = AccountManagerAssignment(user_id=u_am1.id, company_id=c_alpha.id, assigned_by=u_admin1.id)
        am_assign2 = AccountManagerAssignment(user_id=u_am1.id, company_id=c_delta.id, assigned_by=u_admin1.id)
        am_assign3 = AccountManagerAssignment(user_id=u_am2.id, company_id=c_beta.id, assigned_by=u_admin1.id)
        am_assign4 = AccountManagerAssignment(user_id=u_am2.id, company_id=c_gamma.id, assigned_by=u_admin1.id)
        am_assign5 = AccountManagerAssignment(user_id=u_am3.id, company_id=c_epsilon.id, assigned_by=u_admin1.id)
        db.add_all([am_assign1, am_assign2, am_assign3, am_assign4, am_assign5])
        db.commit()

        # 3. Seed Certification Types (FR-18: 36 months validity)
        cert_types = [
            CertificationType(code="ISO_31000", name="ISO 31000 Certified Risk Manager", validity_months=36, validity_basis="ISO standard 3-year recertification"),
            CertificationType(code="PMP", name="Project Management Professional (PMP)", validity_months=36, validity_basis="PMI 3-year renewal cycle"),
            CertificationType(code="CAPM", name="Certified Associate in Project Management (CAPM)", validity_months=36, validity_basis="PMI 3-year renewal cycle"),
            CertificationType(code="PMI_ACP", name="PMI Agile Certified Practitioner (PMI-ACP)", validity_months=36, validity_basis="PMI 3-year renewal cycle"),
            CertificationType(code="CPMAI", name="Certified Prompt Engineering & AI Practitioner (CPMAI)", validity_months=36, validity_basis="Crossworks client-stated 3-year validity"),
            CertificationType(code="CISSP", name="Certified Information Systems Security Professional", validity_months=36, validity_basis="ISC2 3-year CPE cycle"),
            CertificationType(code="AWS_SEC", name="AWS Certified Security Specialist", validity_months=36, validity_basis="AWS 3-year recertification")
        ]
        db.add_all(cert_types)
        db.commit()

        # 4. Seed Trainees
        now = datetime.now(timezone.utc)
        today = now.date()

        t_juan = Trainee(
            trainee_code="TRN-9021",
            user_id=u_trn_juan.id,
            first_name="Juan",
            last_name="Dela Cruz",
            email="juan.delacruz@alpha-corp.ph",
            display_name="CyberKnight9021",
            phone="+63 917 123 4567",
            current_company_id=c_alpha.id,
            current_streak=7,
            last_activity_date=today,
            leaderboard_opt_out=False
        )
        t_beatrice = Trainee(
            trainee_code="TRN-9045",
            user_id=u_trn_beatrice.id,
            first_name="Beatrice",
            last_name="Tan",
            email="beatrice.tan@alpha-corp.ph",
            display_name="BeaSecOps",
            phone="+63 920 456 7890",
            current_company_id=c_alpha.id,
            current_streak=5,
            last_activity_date=today,
            leaderboard_opt_out=False
        )
        t_maria = Trainee(
            trainee_code="TRN-9088",
            user_id=u_trn_maria.id,
            first_name="Maria",
            last_name="Clara",
            email="maria.clara@maya-fintech.ph",
            display_name="MayaFinPro",
            phone="+63 918 234 5678",
            current_company_id=c_beta.id,
            current_streak=12,
            last_activity_date=today,
            leaderboard_opt_out=False
        )
        t_liam = Trainee(
            trainee_code="TRN-9092",
            user_id=u_trn_liam.id,
            first_name="Liam",
            last_name="Chen",
            email="liam.chen@maya-fintech.ph",
            display_name="LiamDevSec",
            phone="+63 921 567 8901",
            current_company_id=c_beta.id,
            current_streak=4,
            last_activity_date=today,
            leaderboard_opt_out=False
        )
        t_gabriel = Trainee(
            trainee_code="TRN-9114",
            user_id=u_trn_gabriel.id,
            first_name="Gabriel",
            last_name="Ramos",
            email="g.ramos@ayala-retail.ph",
            display_name="RetailOpsRamos",
            phone="+63 919 345 6789",
            current_company_id=c_gamma.id,
            current_streak=4,
            last_activity_date=today,
            leaderboard_opt_out=False
        )
        t_chloe = Trainee(
            trainee_code="TRN-9125",
            user_id=u_trn_chloe.id,
            first_name="Chloe",
            last_name="Garcia",
            email="chloe.garcia@ayala-retail.ph",
            display_name="ChloeCloud",
            phone="+63 922 678 9012",
            current_company_id=c_gamma.id,
            current_streak=9,
            last_activity_date=today,
            leaderboard_opt_out=False
        )
        t_miguel = Trainee(
            trainee_code="TRN-9201",
            first_name="Miguel",
            last_name="Santos",
            email="miguel.santos@bdo-enterprise.ph",
            display_name="BankSecMiguel",
            phone="+63 923 789 0123",
            current_company_id=c_delta.id,
            current_streak=8,
            last_activity_date=today,
            leaderboard_opt_out=False
        )
        t_alyssa = Trainee(
            trainee_code="TRN-9310",
            first_name="Alyssa",
            last_name="Torres",
            email="alyssa.torres@globe-telecom.ph",
            display_name="TelcoShieldAlyssa",
            phone="+63 924 890 1234",
            current_company_id=c_epsilon.id,
            current_streak=6,
            last_activity_date=today,
            leaderboard_opt_out=False
        )

        all_trainees = [t_juan, t_beatrice, t_maria, t_liam, t_gabriel, t_chloe, t_miguel, t_alyssa]
        db.add_all(all_trainees)
        db.commit()
        for t in all_trainees:
            db.refresh(t)

        # Affiliations
        affiliations = [
            TraineeAffiliation(trainee_id=t_juan.id, company_id=c_alpha.id, valid_from=datetime(2026, 1, 15)),
            TraineeAffiliation(trainee_id=t_beatrice.id, company_id=c_alpha.id, valid_from=datetime(2026, 2, 1)),
            TraineeAffiliation(trainee_id=t_maria.id, company_id=c_beta.id, valid_from=datetime(2026, 3, 10)),
            TraineeAffiliation(trainee_id=t_liam.id, company_id=c_beta.id, valid_from=datetime(2026, 4, 1)),
            TraineeAffiliation(trainee_id=t_gabriel.id, company_id=c_gamma.id, valid_from=datetime(2026, 5, 20)),
            TraineeAffiliation(trainee_id=t_chloe.id, company_id=c_gamma.id, valid_from=datetime(2026, 6, 1)),
            TraineeAffiliation(trainee_id=t_miguel.id, company_id=c_delta.id, valid_from=datetime(2026, 7, 1)),
            TraineeAffiliation(trainee_id=t_alyssa.id, company_id=c_epsilon.id, valid_from=datetime(2026, 7, 15))
        ]
        db.add_all(affiliations)
        db.commit()

        # 5. Courses (6 enterprise courses with Chapter III pilot TLAs)
        c_sec = Course(
            course_code="CRS-SEC01",
            name="Information Security Management & Governance",
            description="Comprehensive enterprise risk and security framework aligned with ISO 27001 and NIST CSF 2.0.",
            acronym_3="SEC"
        )
        c_pmp = Course(
            course_code="CRS-PMP01",
            name="PMP Exam Review & Agile Project Delivery",
            description="Rigorous project lifecycle governance and Agile framework mastery.",
            acronym_3="PMP"
        )
        c_cloud = Course(
            course_code="CRS-CLOUD01",
            name="Cloud Infrastructure Security & Zero-Trust Defense",
            description="Zero-trust architecture, multi-tenant isolation, and cloud defense patterns.",
            acronym_3="CLD"
        )
        c_abe = Course(
            course_code="CRS-ABE01",
            name="CP-ABE Cryptographic Engineering & Privacy Compliance",
            description="Advanced ciphertext-policy attribute-based encryption, envelope encryption, and key lifecycle management.",
            acronym_3="ABE"
        )
        c_pia = Course(
            course_code="CRS-PIA01",
            name="Privacy Impact Assessment (PIA) & Multi-Tenant Data Governance",
            description="Enterprise privacy risk assessment, data subject consent workflows, and regulatory audit compliance.",
            acronym_3="PIA"
        )
        c_ai = Course(
            course_code="CRS-AI01",
            name="Enterprise AI Governance & Prompt Security",
            description="Safeguards against prompt injection, LLM data leakage, and automated agent privilege escalation.",
            acronym_3="EAI"
        )
        all_courses = [c_sec, c_pmp, c_cloud, c_abe, c_pia, c_ai]
        db.add_all(all_courses)
        db.commit()
        for c in all_courses:
            db.refresh(c)

        # 6. Training Sessions
        sess1 = TrainingSession(
            session_code="SESS-2026-08A",
            course_id=c_sec.id,
            course_name=c_sec.name,
            start_date=datetime(2026, 8, 10),
            end_date=datetime(2026, 8, 15),
            delivery_type="Public",
            trainer_signed_off=True,
            trainer_sign_off_at=datetime(2026, 8, 15, 17, 30),
            trainer_sign_off_user_id=u_trainer1.id,
            trainer_sign_off_notes="All trainees demonstrated mastery of ISO 27001 risk evaluation."
        )
        sess2 = TrainingSession(
            session_code="SESS-2026-09B",
            course_id=c_pmp.id,
            course_name=c_pmp.name,
            start_date=datetime(2026, 9, 1),
            end_date=datetime(2026, 9, 20),
            delivery_type="Dedicated",
            trainer_signed_off=True,
            trainer_sign_off_at=datetime(2026, 9, 20, 18, 0),
            trainer_sign_off_user_id=u_trainer1.id,
            trainer_sign_off_notes="Maya FinTech cohort successfully certified on Agile Governance."
        )
        sess3 = TrainingSession(
            session_code="SESS-2026-10C",
            course_id=c_cloud.id,
            course_name=c_cloud.name,
            start_date=datetime(2026, 10, 5),
            end_date=datetime(2026, 10, 15),
            delivery_type="Dedicated",
            trainer_signed_off=True,
            trainer_sign_off_at=datetime(2026, 10, 15, 17, 0),
            trainer_sign_off_user_id=u_trainer1.id,
            trainer_sign_off_notes="Ayala Retail cohort demonstrated robust multi-tenant defense."
        )
        sess4 = TrainingSession(
            session_code="SESS-2026-11D",
            course_id=c_abe.id,
            course_name=c_abe.name,
            start_date=datetime(2026, 11, 2),
            end_date=datetime(2026, 11, 12),
            delivery_type="Public"
        )
        sess5 = TrainingSession(
            session_code="SESS-2026-12E",
            course_id=c_pia.id,
            course_name=c_pia.name,
            start_date=datetime(2026, 12, 1),
            end_date=datetime(2026, 12, 10),
            delivery_type="Public"
        )
        all_sessions = [sess1, sess2, sess3, sess4, sess5]
        db.add_all(all_sessions)
        db.commit()
        for s in all_sessions:
            db.refresh(s)

        # Trainer Assignments (Jordan Ramos as designated Lead Trainer)
        trainer_assigns = [
            TrainerAssignment(user_id=u_trainer1.id, session_id=sess1.id, valid_from=datetime(2026, 8, 1)),
            TrainerAssignment(user_id=u_trainer1.id, session_id=sess2.id, valid_from=datetime(2026, 8, 15)),
            TrainerAssignment(user_id=u_trainer1.id, session_id=sess3.id, valid_from=datetime(2026, 9, 20)),
            TrainerAssignment(user_id=u_trainer1.id, session_id=sess4.id, valid_from=datetime(2026, 10, 20)),
            TrainerAssignment(user_id=u_trainer1.id, session_id=sess5.id, valid_from=datetime(2026, 11, 15))
        ]
        db.add_all(trainer_assigns)
        db.commit()

        # 7. Training Records (with real CP-ABE encrypted payloads)
        def make_record(rec_id, trainee, session, company, course, score, lab_desc, remarks, cert_ref=None, is_comp=True):
            pol = f"ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENT{company.code}V1) or (ROLETRAINER and TRAINING{session.session_code.replace('-', '')}V1) or TRAINEE{trainee.trainee_code.replace('-', '')}"
            payload = {
                "score": score,
                "practical_lab": lab_desc,
                "trainer_remarks": remarks,
                "certificate_reference": cert_ref,
                "trainee_name": f"{trainee.first_name} {trainee.last_name}",
                "company": company.name
            }
            enc = cpabe_engine.encrypt_record(payload, pol, record_id=f"rec-{trainee.trainee_code}", version=1)
            return TrainingRecord(
                id=rec_id,
                trainee_id=trainee.id,
                session_id=session.id,
                company_at_completion_id=company.id,
                course_name=course.name,
                status="Completed" if is_comp else "In progress",
                completion_date=session.end_date if is_comp else None,
                score=score,
                encryption_policy=pol,
                policy_version=1,
                abe_ciphertext=enc.get("abe_ciphertext"),
                payload_ciphertext=enc.get("payload_ciphertext"),
                nonce=enc.get("nonce"),
                is_encrypted=True
            )

        records = [
            make_record("rec-101", t_juan, sess1, c_alpha, c_sec, 94.5, "High Distinction (Vulnerability Remediation)", "Demonstrated advanced understanding of security controls.", "CERT-ISO31000-2026-9021"),
            make_record("rec-102", t_beatrice, sess1, c_alpha, c_sec, 91.0, "Distinction (Threat Modeling)", "Exemplary performance in threat tree construction.", "CERT-ISO31000-2026-9045"),
            make_record("rec-103", t_maria, sess2, c_beta, c_pmp, 88.0, "Pass with Merit (Agile Governance)", "Completed comprehensive Agile framework simulation.", "CERT-PMP-2026-9088"),
            make_record("rec-104", t_liam, sess2, c_beta, c_pmp, 85.5, "Pass with Merit (Sprint Delivery)", "Solid execution of risk register and velocity forecasting.", "CERT-PMP-2026-9092"),
            make_record("rec-105", t_gabriel, sess3, c_gamma, c_cloud, 89.0, "Distinction (Multi-Tenant Isolation)", "Implemented zero-trust network boundaries in container lab.", "CERT-CISSP-2026-9114"),
            make_record("rec-106", t_chloe, sess3, c_gamma, c_cloud, 96.0, "High Distinction (Cryptographic Envelope)", "Top score in KMS envelope defense and key rotation.", "CERT-AWSSEC-2026-9125"),
            make_record("rec-107", t_miguel, sess1, c_delta, c_sec, 92.5, "Distinction (Core Banking Compliance)", "Excellent analysis of PCI-DSS and Bangko Sentral guidelines.", "CERT-ISO31000-2026-9201"),
            make_record("rec-108", t_alyssa, sess1, c_epsilon, c_sec, 90.0, "Distinction (Telco Infrastructure Defense)", "Outstanding DDOS mitigation and perimeter hardening lab.", "CERT-ISO31000-2026-9310"),
            make_record("rec-109", t_juan, sess4, c_alpha, c_abe, 78.0, "In Progress (Module 3 of 5)", "Midterm evaluation passed. Enrolled in Capstone.", is_comp=False),
            make_record("rec-110", t_maria, sess4, c_beta, c_abe, 82.0, "In Progress (Module 4 of 5)", "Actively completing CP-ABE policy tree builder lab.", is_comp=False)
        ]
        db.add_all(records)
        db.commit()

        # 8. Seed Certificates (36 months validity per FR-18)
        now_dt = datetime.now(timezone.utc)
        expiring_soon = now_dt + timedelta(days=45)

        certs = [
            Certificate(
                record_id="rec-101",
                trainee_id=t_juan.id,
                cert_type_code="ISO_31000",
                title="ISO 31000 Certified Risk Manager",
                serial_number="SMC20260815-01",
                issue_date=datetime(2026, 8, 15),
                expiry_date=datetime(2029, 8, 15),
                expiry_basis="Calculated: issue_date + 36 months validity",
                status="Valid",
                is_self_reported=False,
                is_nearing_renewal=False
            ),
            Certificate(
                trainee_id=t_juan.id,
                cert_type_code="PMP",
                title="Project Management Professional (PMP)",
                serial_number="SMC20231201-01",
                issue_date=now_dt - timedelta(days=365*3 - 42),
                expiry_date=now_dt + timedelta(days=42),
                expiry_basis="Self-reported external credential URL (36 months validity)",
                status="Expiring soon",
                is_self_reported=True,
                credential_url="https://www.credly.com/badges/juan-delacruz-pmp-2023",
                is_nearing_renewal=True
            ),
            Certificate(
                record_id="rec-102",
                trainee_id=t_beatrice.id,
                cert_type_code="ISO_31000",
                title="ISO 31000 Certified Risk Manager",
                issue_date=datetime(2026, 8, 15),
                expiry_date=datetime(2029, 8, 15),
                expiry_basis="Calculated: issue_date + 36 months",
                status="Valid",
                is_nearing_renewal=False
            ),
            Certificate(
                record_id="rec-103",
                trainee_id=t_maria.id,
                cert_type_code="PMP",
                title="Project Management Professional (PMP)",
                issue_date=expiring_soon - timedelta(days=365*3),
                expiry_date=expiring_soon,
                expiry_basis="Expiring in 45 days (36-month cycle renewal alert)",
                status="Expiring soon",
                is_nearing_renewal=True
            ),
            Certificate(
                record_id="rec-105",
                trainee_id=t_gabriel.id,
                cert_type_code="CISSP",
                title="Certified Information Systems Security Professional",
                issue_date=datetime(2026, 10, 15),
                expiry_date=datetime(2029, 10, 15),
                expiry_basis="Calculated: issue_date + 36 months",
                status="Valid",
                is_nearing_renewal=False
            ),
            Certificate(
                record_id="rec-106",
                trainee_id=t_chloe.id,
                cert_type_code="AWS_SEC",
                title="AWS Certified Security Specialist",
                issue_date=datetime(2026, 10, 15),
                expiry_date=datetime(2029, 10, 15),
                expiry_basis="Calculated: issue_date + 36 months",
                status="Valid",
                is_nearing_renewal=False
            ),
            Certificate(
                record_id="rec-107",
                trainee_id=t_miguel.id,
                cert_type_code="ISO_31000",
                title="ISO 31000 Certified Risk Manager",
                issue_date=datetime(2026, 8, 15),
                expiry_date=datetime(2029, 8, 15),
                expiry_basis="Calculated: issue_date + 36 months",
                status="Valid",
                is_nearing_renewal=False
            )
        ]
        db.add_all(certs)
        db.commit()

        # 9. Seed Notifications
        notifs = [
            Notification(
                recipient_user_id=u_trn_juan.id,
                certification_id=certs[1].id,
                offset_days=60,
                title="External Credential Renewal Alert (60 Days)",
                message="Your Project Management Professional (PMP) credential expires in 42 days. Submit renewal badge URL to ensure compliance."
            ),
            Notification(
                recipient_user_id=u_trn_maria.id,
                certification_id=certs[2].id,
                offset_days=60,
                title="Certification Renewal Notice (60 Days)",
                message="Your PMP certification is scheduled to expire in 45 days. Please review renewal requirements."
            ),
            Notification(
                recipient_user_id=u_am2.id,
                certification_id=certs[2].id,
                offset_days=60,
                title="Trainee Certification Nearing Expiry: Maria Clara",
                message="Trainee Maria Clara (Maya FinTech) has a PMP certification expiring in 45 days."
            ),
            Notification(
                recipient_user_id=u_trn_juan.id,
                certification_id=certs[0].id,
                offset_days=0,
                title="Certificate Issued: ISO 31000 Risk Manager",
                message="Congratulations! Your cryptographic certificate for ISO 31000 has been verified and registered on the vault."
            ),
            Notification(
                recipient_user_id=u_am1.id,
                certification_id=certs[0].id,
                offset_days=0,
                title="Cohort Completed: San Miguel Conglomerate Holdings",
                message="Lead Trainer David Lim has officially signed off on Session SESS-2026-08A."
            )
        ]
        db.add_all(notifs)
        db.commit()

        # 10. Seed Gamification Progress (Points, Levels, Streaks, Badges)
        gam_juan = GamificationProgress(
            trainee_id=t_juan.id,
            points=12877,
            level=4,
            streak=7,
            last_activity_date=today,
            badges=["FIRST_STEP", "SEVEN_DAY_STREAK", "SECURITY_CHAMPION", "RISK_GUARDIAN"],
            quizzes_completed=5
        )
        gam_beatrice = GamificationProgress(
            trainee_id=t_beatrice.id,
            points=9450,
            level=3,
            streak=5,
            last_activity_date=today,
            badges=["FIRST_STEP", "SECURITY_CHAMPION"],
            quizzes_completed=4
        )
        gam_maria = GamificationProgress(
            trainee_id=t_maria.id,
            points=15200,
            level=5,
            streak=12,
            last_activity_date=today,
            badges=["FIRST_STEP", "SEVEN_DAY_STREAK", "AUDIT_MASTER", "RISK_GUARDIAN"],
            quizzes_completed=7
        )
        gam_liam = GamificationProgress(
            trainee_id=t_liam.id,
            points=7800,
            level=2,
            streak=4,
            last_activity_date=today,
            badges=["FIRST_STEP"],
            quizzes_completed=3
        )
        gam_gabriel = GamificationProgress(
            trainee_id=t_gabriel.id,
            points=11300,
            level=3,
            streak=4,
            last_activity_date=today,
            badges=["FIRST_STEP", "ENCRYPTOR_SUPREME"],
            quizzes_completed=4
        )
        gam_chloe = GamificationProgress(
            trainee_id=t_chloe.id,
            points=14600,
            level=4,
            streak=9,
            last_activity_date=today,
            badges=["FIRST_STEP", "SEVEN_DAY_STREAK", "ENCRYPTOR_SUPREME"],
            quizzes_completed=6
        )
        gam_miguel = GamificationProgress(
            trainee_id=t_miguel.id,
            points=10950,
            level=3,
            streak=8,
            last_activity_date=today,
            badges=["FIRST_STEP", "SEVEN_DAY_STREAK", "SECURITY_CHAMPION"],
            quizzes_completed=5
        )
        gam_alyssa = GamificationProgress(
            trainee_id=t_alyssa.id,
            points=8900,
            level=3,
            streak=6,
            last_activity_date=today,
            badges=["FIRST_STEP", "RISK_GUARDIAN"],
            quizzes_completed=3
        )
        all_gams = [gam_juan, gam_beatrice, gam_maria, gam_liam, gam_gabriel, gam_chloe, gam_miguel, gam_alyssa]
        db.add_all(all_gams)
        db.commit()

        # 11. Seed Quizzes, Questions & Isolated Answer Keys (SEC-26)
        quiz1 = Quiz(
            session_id=sess1.id,
            title="Enterprise Security Audit Challenge",
            version_no=1,
            is_closed=False,
            created_by_user_id=u_trainer1.id
        )
        quiz2 = Quiz(
            session_id=sess1.id,
            title="Role-Based Access & Policy Verification",
            version_no=1,
            is_closed=False,
            created_by_user_id=u_trainer1.id
        )
        quiz3 = Quiz(
            session_id=sess3.id,
            title="Multi-Tenant Cryptographic Isolation Challenge",
            version_no=1,
            is_closed=False,
            created_by_user_id=u_trainer1.id
        )
        db.add_all([quiz1, quiz2, quiz3])
        db.commit()
        for q in [quiz1, quiz2, quiz3]:
            db.refresh(q)

        # Questions for Quiz 1
        q1_1 = QuizQuestion(
            quiz_id=quiz1.id,
            question_text="Under ISO 27001:2022, which control family governs multi-tenant data segregation?",
            options=["A.5 Organizational Controls", "A.8 Technological Controls", "A.7 Physical Controls", "A.6 People Controls"],
            correct_answer=1,
            explanation="A.8 Technological controls mandate isolation of multi-tenant application boundaries.",
            points=25
        )
        q1_2 = QuizQuestion(
            quiz_id=quiz1.id,
            question_text="What primary defense prevents cross-tenant record leakage in CrossQuest?",
            options=["Client-side filtering", "CP-ABE Cryptographic Envelopes", "Shared session storage", "Manual admin review"],
            correct_answer=1,
            explanation="Ciphertext-Policy Attribute-Based Encryption (CP-ABE) enforces data isolation at the storage level.",
            points=25
        )
        q1_3 = QuizQuestion(
            quiz_id=quiz1.id,
            question_text="How is a trainee's pseudonymity protected on public leaderboard rankings?",
            options=["Real name is published", "Display Name is used and opt-out is supported", "Rankings are deleted", "Email prefix is shown"],
            correct_answer=1,
            explanation="GAM-04 and OI-03 mandate pseudonymous display names and an explicit leaderboard opt-out.",
            points=25
        )
        q1_4 = QuizQuestion(
            quiz_id=quiz1.id,
            question_text="Per SEC-26 security policy, how are offline quiz submissions handled?",
            options=["Accepted unconditionally", "Rejected with HTTP 400 - live connection required", "Cached in localStorage", "Approved by trainer later"],
            correct_answer=1,
            explanation="SEC-26 strictly rejects offline submissions to eliminate tampering vectors.",
            points=25
        )

        db.add_all([q1_1, q1_2, q1_3, q1_4])
        db.commit()
        for qq in [q1_1, q1_2, q1_3, q1_4]:
            db.refresh(qq)

        # Isolated Answer Keys (SEC-26)
        keys = [
            QuizAnswerKey(question_id=q1_1.id, correct_answer=1, explanation="A.8 Technological controls mandate isolation."),
            QuizAnswerKey(question_id=q1_2.id, correct_answer=1, explanation="CP-ABE enforces cryptographic tenant isolation."),
            QuizAnswerKey(question_id=q1_3.id, correct_answer=1, explanation="Display names & opt-out protect privacy."),
            QuizAnswerKey(question_id=q1_4.id, correct_answer=1, explanation="Offline submissions are prohibited per SEC-26.")
        ]
        db.add_all(keys)
        db.commit()

        # Quiz Attempts
        att1 = QuizAttempt(
            quiz_id=quiz1.id,
            trainee_id=t_juan.id,
            quiz_version=1,
            submitted_offline=False,
            score=100.0,
            total_points=100,
            is_scored=True,
            submitted_at=datetime(2026, 8, 14, 15, 30)
        )
        att2 = QuizAttempt(
            quiz_id=quiz1.id,
            trainee_id=t_beatrice.id,
            quiz_version=1,
            submitted_offline=False,
            score=75.0,
            total_points=75,
            is_scored=True,
            submitted_at=datetime(2026, 8, 14, 16, 0)
        )
        db.add_all([att1, att2])
        db.commit()

        # 12. Teams
        team1 = Team(session_id=sess1.id, team_name="Security Guardians", created_by_user_id=u_trainer1.id)
        team2 = Team(session_id=sess2.id, team_name="FinTech Defiance", created_by_user_id=u_trainer1.id)
        team3 = Team(session_id=sess3.id, team_name="Cloud Sentinels", created_by_user_id=u_trainer1.id)
        db.add_all([team1, team2, team3])
        db.commit()
        for tm in [team1, team2, team3]:
            db.refresh(tm)

        db.add_all([
            TeamMember(team_id=team1.id, trainee_id=t_juan.id),
            TeamMember(team_id=team1.id, trainee_id=t_beatrice.id),
            TeamMember(team_id=team2.id, trainee_id=t_maria.id),
            TeamMember(team_id=team2.id, trainee_id=t_liam.id),
            TeamMember(team_id=team3.id, trainee_id=t_gabriel.id),
            TeamMember(team_id=team3.id, trainee_id=t_chloe.id)
        ])
        db.commit()

        # 13. Access Logs (Audit Trail)
        logs = [
            AccessLog(
                actor_user_id=u_am1.id,
                actor_role="account_manager",
                event_type="ACCESS_DENIED",
                resource_type="RECORD",
                resource_id="rec-103",
                company_id=c_beta.id,
                outcome="DENIED",
                reason_code="OUT_OF_SCOPE",
                source_ip="192.168.1.105",
                details={"requested_company": "FINTECH_BETA", "assigned_companies": ["CORP_ALPHA", "BANK_DELTA"]}
            ),
            AccessLog(
                actor_user_id=u_admin1.id,
                actor_role="admin",
                event_type="ACCESS_ALLOWED",
                resource_type="RECORD",
                resource_id="rec-101",
                company_id=c_alpha.id,
                outcome="SUCCESS",
                source_ip="192.168.1.10",
                details={"mode": "DECRYPT", "policy_verified": True}
            ),
            AccessLog(
                actor_user_id=u_am2.id,
                actor_role="account_manager",
                event_type="ACCESS_ALLOWED",
                resource_type="RECORD",
                resource_id="rec-103",
                company_id=c_beta.id,
                outcome="SUCCESS",
                source_ip="192.168.1.45",
                details={"mode": "PORTFOLIO_AUDIT"}
            ),
            AccessLog(
                actor_user_id=u_trainer1.id,
                actor_role="trainer",
                event_type="SIGN_OFF",
                resource_type="SESSION",
                resource_id=sess1.id,
                company_id=c_alpha.id,
                outcome="SUCCESS",
                source_ip="192.168.1.88",
                details={"session_code": "SESS-2026-08A"}
            ),
            AccessLog(
                actor_user_id=u_fin1.id,
                actor_role="finance",
                event_type="COMPLIANCE_EXPORT",
                resource_type="AUDIT_REPORT",
                resource_id="AUDIT-2026-Q3",
                company_id=c_alpha.id,
                outcome="SUCCESS",
                source_ip="192.168.1.22",
                details={"export_format": "PDF", "records_count": 8}
            )
        ]
        db.add_all(logs)
        db.commit()

        # 14. Anomaly Alerts (Table 13 Alert Lifecycle: NEW, UNDER_REVIEW, RESOLVED)
        alerts = [
            AnomalyAlert(
                subject_user_id=u_am1.id,
                rule_code="R1_OUT_OF_SCOPE",
                severity_base="LOW",
                severity_final="LOW",
                status="NEW",
                description="Account Manager Marcus Reyes attempted to view out-of-scope record for client 'FINTECH_BETA'.",
                event_count=1,
                tags=["SCOPE_VIOLATION"],
                metadata_info={"record_id": "rec-103", "target_company": "FINTECH_BETA"}
            ),
            AnomalyAlert(
                subject_user_id=u_trainer1.id,
                rule_code="R4_RECORD_DELETION",
                severity_base="HIGH",
                severity_final="HIGH",
                after_hours_tag=True,
                status="UNDER_REVIEW",
                reviewed_by_user_id=u_admin1.id,
                reviewed_at=now_dt - timedelta(hours=2),
                description="Trainer attempted unauthorized deletion of signed-off training record.",
                event_count=1,
                tags=["after_hours", "HIGH_RISK"],
                metadata_info={"attempted_action": "DELETE", "record_id": "rec-101"}
            ),
            AnomalyAlert(
                subject_user_id=u_trn_liam.id,
                rule_code="R2_FAILED_LOGINS_ACCOUNT",
                severity_base="MEDIUM",
                severity_final="MEDIUM",
                status="CLOSED",
                disposition="CLOSED_EXPECTED_ACTIVITY",
                reviewed_by_user_id=u_admin2.id,
                reviewed_at=now_dt - timedelta(days=1),
                review_note="Trainee forgot password after mobile device upgrade. MFA re-verified.",
                description="5 consecutive failed login attempts detected within 10 minutes.",
                event_count=5,
                tags=["BRUTE_FORCE_SUSPECTED"],
                metadata_info={"source_ip": "203.177.42.10"}
            ),
            AnomalyAlert(
                subject_user_id=u_am2.id,
                rule_code="R3_HIGH_RECORD_ACCESS",
                severity_base="HIGH",
                severity_final="HIGH",
                status="NEW",
                description="Account Manager requested 32 client records in under 3 minutes (threshold: 25).",
                event_count=32,
                tags=["BULK_DOWNLOAD"],
                metadata_info={"window_minutes": 3, "records_fetched": 32}
            ),
            AnomalyAlert(
                subject_user_id=u_admin1.id,
                rule_code="R3_REPORT_BURSTS",
                severity_base="MEDIUM",
                severity_final="MEDIUM",
                status="NEW",
                description="Administrator Dr. Sarah Jenkins initiated 6 consecutive client report requests within 45 minutes (threshold: 5).",
                event_count=6,
                tags=["BURST_REQUEST", "PEER_REVIEW_REQUIRED"],
                metadata_info={"window_minutes": 45, "report_burst_count": 6}
            ),
            AnomalyAlert(
                subject_user_id=u_trainer1.id,
                rule_code="R4_RECORD_EDIT",
                severity_base="LOW",
                severity_final="MEDIUM",
                after_hours_tag=True,
                status="AWAITING_UNINVOLVED_ADMIN",
                description="Trainer Jordan Ramos modified score attributes after hours. Initial review recused due to trainer affiliation.",
                event_count=1,
                tags=["after_hours", "RECUSAL_FILED"],
                metadata_info={"involved_admin_ids": [u_admin1.id]},
                review_note="Recused due to co-instructorship with subject trainer. Requires independent peer administrator sign-off."
            )
        ]
        db.add_all(alerts)
        db.commit()

        # 15. Pilot Data Import & Reconciliation Batch (Chapter III, Figure 12, FR-22, DAT-01, DAT-03, DAT-08)
        p_batch = ImportBatch(
            id="batch-pilot-2026",
            source_file_name="Crossworks_Training_Participants_Pilot_2026.xlsx",
            file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            record_count=150,
            in_scope_count=149,
            pre_cutoff_count=1,
            quarantined_count=3,
            distinct_customers_count=39,
            reconciled=False,
            loaded_at=datetime(2026, 8, 2, 14, 30),
            loaded_by_user_id=u_fin1.id
        )
        db.add(p_batch)
        db.commit()

        # Pilot Discrepancies
        discrepancies = [
            ImportDiscrepancy(
                batch_id=p_batch.id,
                source_row_no=3,
                issue_type="PRE_CUTOFF_DATE",
                field_name="Training_Date",
                resolution="EXCLUDE",
                resolution_reason="Training date June 6, 2026 is prior to August 1, 2026 pilot cutoff baseline (FR-22).",
                resolved_by_user_id=u_admin1.id,
                resolved_at=datetime(2026, 8, 2, 15, 0)
            ),
            ImportDiscrepancy(
                batch_id=p_batch.id,
                source_row_no=42,
                issue_type="DUPLICATE_PARTICIPANT",
                field_name="Participant_Name",
                resolution=None,
                resolution_reason=None
            ),
            ImportDiscrepancy(
                batch_id=p_batch.id,
                source_row_no=88,
                issue_type="COMPANY_NAME_VARIANT",
                field_name="Customer_Name",
                resolution=None,
                resolution_reason=None
            )
        ]
        db.add_all(discrepancies)
        db.commit()

        # Representative Pilot Staging Rows (150 total physical rows, 149 in-scope, 39 distinct customers)
        # 24 Corporate Customers
        corp_customers = [
            "San Miguel Corporation", "Maya FinTech Philippines", "Ayala Corporation", "BDO Unibank Inc.",
            "Globe Telecom", "JG Summit Holdings", "Aboitiz Equity Ventures", "Megaworld Corporation",
            "PLDT Inc.", "Metropolitan Bank & Trust Co.", "Robinsons Retail Holdings", "Jollibee Foods Corp.",
            "Monde Nissin Corporation", "Security Bank Corporation", "Puregold Price Club", "Universal Robina Corp.",
            "Alliance Global Group", "DMCI Holdings", "GT Capital Holdings", "Filinvest Development Corp.",
            "Nickel Asia Corporation", "Century Pacific Food", "Semirara Mining & Power", "Red Oak Properties, Inc."
        ]
        # 15 Pseudonymized Retail Individuals (INDIV-C026 to INDIV-C040)
        indiv_customers = [f"INDIV-C{i:03d}" for i in range(26, 41)]

        staging_rows = []
        # Row 3: Pre-cutoff excluded
        staging_rows.append(ImportStagingRow(
            batch_id=p_batch.id,
            source_row_no=3,
            validation_status="PRE_CUTOFF_EXCLUDED",
            raw_data={
                "customer": "Retail Individual",
                "standardized_customer": "Retail Individual",
                "participant": "Ron Robert Despi",
                "date": "2026-06-06",
                "is_individual_retail": True
            }
        ))

        # Row 42: Duplicate quarantined
        staging_rows.append(ImportStagingRow(
            batch_id=p_batch.id,
            source_row_no=42,
            validation_status="QUARANTINED",
            raw_data={
                "customer": "INDIV-C026",
                "standardized_customer": "INDIV-C026",
                "participant": "INDIV-C026",
                "date": "2026-09-05",
                "is_individual_retail": True
            }
        ))

        # Row 88: Company name variant quarantined
        staging_rows.append(ImportStagingRow(
            batch_id=p_batch.id,
            source_row_no=88,
            validation_status="QUARANTINED",
            raw_data={
                "customer": "Red Oak Properties Inc.",
                "standardized_customer": "Red Oak Properties, Inc.",
                "participant": "Mark Anthony Solis",
                "date": "2026-08-20",
                "is_individual_retail": False
            }
        ))

        # Populate remainder of rows across the 39 distinct customers
        current_row = 1
        for i in range(147):
            while current_row in (3, 42, 88):
                current_row += 1
            cust = (corp_customers + indiv_customers)[i % len(corp_customers + indiv_customers)]
            is_indiv = cust.startswith("INDIV-")
            staging_rows.append(ImportStagingRow(
                batch_id=p_batch.id,
                source_row_no=current_row,
                validation_status="VALID",
                raw_data={
                    "customer": cust,
                    "standardized_customer": cust,
                    "participant": f"{cust} Trainee {(i % 5) + 1}",
                    "date": "2026-08-15",
                    "is_individual_retail": is_indiv
                }
            ))
            current_row += 1

        db.add_all(staging_rows)
        db.commit()

        print("Seeding completed successfully with rich, fully populated multi-tenant dataset and pilot import batch!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
