#!/usr/bin/env python3
"""CrossQuest Defense & Pilot Database Builder (build_defense_database.py).

Builds a 100% consistent, zero-orphan, defense-ready database combining:
1. All real Crossworks Pilot data from backend/data/pilot_sessions.csv,
   pilot_programs.csv, and pilot_participants.csv:
   - 40 canonical client tenants (25 corporate COMPANY + 15 retail INDIVIDUAL, zero duplicates).
   - 148 real pilot trainees (TRN-8000..TRN-8147) with 1-to-1 linked User accounts (0 orphans).
   - 31 official pilot courses and 46 in-scope pilot sessions (100% matched to their exact
     149 in-scope participant enrollments by Date + Program + Customer, 0 empty sessions).
   - 150-row Pilot Import & Reconciliation batch (batch-pilot-2026) with the exact June 6, 2026
     pre-cutoff exclusion (Ron Robert Despi) and tracked discrepancies.
2. Rich Defense Presentation Sample Data across all 5 roles & 3 Kanban stages:
   - Exact DEMO_USERS UUIDs and emails matching frontend/src/contexts/AuthContext.jsx.
   - 6 interactive DEMO-* cohorts (DEMO-NA-01..03 in Needs Attendance, DEMO-AW-01..03 in
     Awaiting Trainer Sign-Off) plus the November 2026 pilot cohorts so every Account Manager
     (Erika Bana, Sharon De Vera, Brian Mendoza) and Lead Trainer (Jordan Ramos) sees active
     cards with 4-5 enrolled participants in all 3 columns.
   - Native Charm-Crypto BSW07 CP-ABE encryption under rec-{trainee_code}, version history snapshots,
     registered AbeAttribute tokens, and active envelope-encrypted UserAbeKey rows for staff & demo trainees.
   - 133 Certificates (valid completion certs, 36-month certs, expiring-soon certs, and self-reported
     external credentials with renewal notifications).
   - 6 approved Quizzes (24 questions + 24 isolated SEC-26 answer keys), 96 QuizAttempts,
     8 session Teams with 40 TeamMembers, and 148 GamificationProgress profiles.
   - 10 reviewed AnomalyRules (Table 13), 8 AnomalyAlerts across all lifecycle states (NEW,
     UNDER_REVIEW, AWAITING_UNINVOLVED_ADMIN, CLOSED) with AlertEvent links and dual-admin
     peer review compliance, and AccessLog audit entries.
   - All 36 foreign keys intact, 29 PostgreSQL RLS policies, and trg_anomaly_alert_peer_review_guard.

Usage inside Docker container:
  docker cp build_defense_database.py crossquest-backend:/app/build_defense_database.py
  docker exec crossquest-backend python /app/build_defense_database.py
  docker exec crossquest-backend python /app/build_defense_database.py --apply
"""

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

# Ensure backend root (/app or ./backend) is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
for candidate in [SCRIPT_DIR, SCRIPT_DIR.parent, Path("/app")]:
    if (candidate / "app" / "models" / "entities.py").exists():
        if str(candidate) not in sys.path:
            sys.path.insert(0, str(candidate))
        BACKEND_ROOT = candidate
        break
else:
    BACKEND_ROOT = SCRIPT_DIR

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, init_db_rls
from app.core.security import get_password_hash
from app.crypto.attribute_manager import AttributeManager
from app.crypto.cpabe_engine import cpabe_engine
from app.models.entities import (
    AccessLog,
    AccountManagerAssignment,
    AlertEvent,
    AnomalyAlert,
    AnomalyRule,
    Certificate,
    CertificationType,
    ClientCompany,
    Course,
    GamificationProgress,
    ImportBatch,
    ImportDiscrepancy,
    ImportStagingRow,
    Notification,
    Quiz,
    QuizAnswerKey,
    QuizAttempt,
    QuizQuestion,
    ReencryptionJob,
    Team,
    TeamMember,
    Trainee,
    TraineeAffiliation,
    TrainerAssignment,
    TrainingRecord,
    TrainingRecordVersion,
    TrainingSession,
    User,
    UserAbeKey,
)

# ---------------------------------------------------------------------------
# Canonical Company Mapping (Matches AuthContext.jsx & Pilot Spreadsheets)
# ---------------------------------------------------------------------------
INDIVIDUAL_CUSTOMERS = {
    "angelito alcantara": ("ANGELI_ALCANT", "Angelito Alcantara"),
    "rhyan depante": ("RHYAN_DEPANT", "Rhyan Depante"),
    "ma nonica pormilda": ("MA_NONICA_PORMIL", "Ma. Nonica Pormilda"),
    "ma kristina luisa tayag": ("MKLT", "Ma. Kristina Luisa Tayag"),
    "kristine castillo": ("KRISTI_CASTIL", "Kristine Castillo"),
    "mike angelo villanueva": ("MIKE_ANGELO_VILLAN", "Mike Angelo Villanueva"),
    "myka ella bautista": ("MYKA_ELLA_BAUTIS", "Myka Ella Bautista"),
    "jocelyn b capistrano": ("JOCELY_B_CAPIST", "Jocelyn B. Capistrano"),
    "mikka barlis": ("MIKKA_BARLIS", "Mikka Barlis"),
    "ma janet c sibayan": ("MJCS", "Ma. Janet C. Sibayan"),
    "gladys ruiz": ("GLADYS_RUIZ", "Gladys Ruiz"),
    "laarni uychutin": ("LAARNI_UYCHUT", "Laarni Uychutin"),
    "kimberly ann esteban": ("KIMBER_ANN_ESTEBA", "Kimberly Ann Esteban"),
    "deric centones macalinao": ("DERIC_CENTON_MACALI", "Deric Centones Macalinao"),
    "ron robert despi": ("RON_ROBERT_DESPI", "Ron Robert Despi"),
}

CORPORATE_CANONICAL = {
    "vertiv singapore holdings pte ltdrohq": ("VHL", "Vertiv (Singapore) Holdings PTE LTD-ROHQ", "Technology & Data Center Infrastructure"),
    "iproyal services fze llc": ("IPROY_SERVI", "IPRoyal Services FZE LLC", "Technology & Network Services"),
    "red oak properties inc": ("ROP", "Red Oak Properties, Inc.", "Real Estate & Property Development"),
    "acen operations services inc": ("AOS", "Acen Operations Services Inc.", "Renewable Energy & Utilities"),
    "sydenham laboratories inc": ("SYDENH_LABORA_INC", "Sydenham Laboratories Inc.", "Healthcare & Pharmaceuticals"),
    "boehringer ingelheim business services philippines inc": ("BIBSP", "Boehringer Ingelheim Business Services Philippines Inc.", "Healthcare & Pharmaceuticals"),
    "wee community developers inc": ("WCD", "Wee Community Developers, Inc.", "Real Estate & Construction"),
    "expedise management solutions inc": ("EMS", "Expedise Management Solutions, Inc.", "Corporate Management Consulting"),
    "isla lpg corporation": ("ISLA_LPG_CORPOR", "Isla LPG Corporation", "Energy & Utilities"),
    "security bank corporation": ("SECURI_BANK_CORPOR", "Security Bank Corporation", "Commercial Banking & Financial Services"),
    "first flow hvac technologies inc": ("FFHT", "First Flow HVAC Technologies, Inc.", "Industrial Engineering & HVAC"),
    "ayala land inc": ("AYALA_LAND_INC", "Ayala Land, Inc.", "Real Estate & Conglomerate"),
    "philippine savings bank": ("PHILIP_SAVING_BANK", "Philippine Savings Bank (PSBank)", "Banking & Consumer Finance"),
    "networklab solutions corporation": ("NETWOR_SOLUTI_CORPOR", "Networklab Solutions Corporation", "IT & Enterprise Networking"),
    "norden subic entrepreneurs inc": ("NSE", "Norden Subic Entrepreneurs Inc.", "Logistics & Industrial Operations"),
    "xinyx semiconductor design services inc": ("XSDS", "Xinyx Semiconductor Design Services, Inc.", "Semiconductor & IC Design"),
    "diliman doctors hospital inc": ("DDH", "Diliman Doctors Hospital, Inc.", "Healthcare & Medical Services"),
    "amihan solutions opc": ("AMIHAN_SOLUTI", "Amihan Solutions (OPC)", "Cloud & Digital Transformation"),
    "immensity group business development services corporation": ("IGBDSC", "Immensity Group Business Development Services Corporation", "Business Development & Advisory"),
    "east west ageas life insurance corporation": ("EWALIC", "East West Ageas Life Insurance Corporation", "Insurance & Financial Services"),
    "analog devices inc": ("ANALOG_DEVICE_INC", "Analog Devices, Inc.", "Semiconductor & Electronics"),
    "mploy outsourcing solutions inc": ("MOS", "Mploy Outsourcing Solutions, Inc.", "Business Process Outsourcing"),
    "oceanagold phils inc": ("OCEANA_PHILS_INC", "OceanaGold (Philippines), Inc.", "Mining & Natural Resources"),
    "universal robina corporation": ("UNIVER_ROBINA_CORPOR", "Universal Robina Corporation", "Consumer Goods & Food Manufacturing"),
    "servier philippines inc": ("SERVIE_PHILIP_INC", "Servier Philippines, Inc.", "Pharmaceuticals & Life Sciences"),
}

# Fixed UUIDs & Trainee Codes from frontend/src/contexts/AuthContext.jsx
DEMO_TRAINEE_OVERRIDES = {
    "andrea.aguilar@vertiv.com": {
        "user_id": "e335aea7-fe01-436f-a05c-9db2fee10cfd",
        "trainee_code": "TRN-8000",
        "display_name": "AndreaVertiv",
        "streak": 8,
        "points": 13500,
        "level": 4,
    },
    "ricardo.ocampo@iproyal.com": {
        "user_id": "35076d4f-7548-4131-8dd1-6fc07389b17d",
        "trainee_code": "TRN-8001",
        "display_name": "RicardoOps",
        "streak": 6,
        "points": 10200,
        "level": 3,
    },
    "bea.macaraeg@iproyal.com": {
        "user_id": "82dd244c-84c5-4831-9381-279bd9fd5c37",
        "trainee_code": "TRN-8002",
        "display_name": "BeaMacaraeg",
        "streak": 11,
        "points": 14800,
        "level": 5,
    },
    "rafael.dizon@amihansolutions.com": {
        "user_id": "d4799846-9779-4b67-acc5-09a5d69a0ade",
        "trainee_code": "TRN-8015",
        "display_name": "RafaelDev",
        "streak": 4,
        "points": 8100,
        "level": 2,
    },
    "rowena.cabrera@ewageas.com": {
        "user_id": "7084364a-d26c-4154-b10f-b5c0cac75fe5",
        "trainee_code": "TRN-8032",
        "display_name": "RowenaEW",
        "streak": 9,
        "points": 12400,
        "level": 4,
    },
    "jjavier@islalpg.com": {
        "user_id": "0244b2b1-e722-4461-a5a2-4c1299e7f439",
        "trainee_code": "TRN-8049",
        "display_name": "JoshuaLPG",
        "streak": 5,
        "points": 9900,
        "level": 3,
    },
    "arvin.natividad@urc.com.ph": {
        "user_id": "78ef52e6-69f3-4be7-88fa-e8c6b78984be",
        "trainee_code": "TRN-8139",
        "display_name": "ArvinURC",
        "streak": 7,
        "points": 11800,
        "level": 3,
    },
    "camille.morales@boehringer-ingelheim.com": {
        "user_id": "d0068942-b729-4ae4-8611-916b94884110",
        "trainee_code": "TRN-8071",
        "display_name": "CamilleBI",
        "streak": 10,
        "points": 14200,
        "level": 4,
    },
    "santos.vincent@ayalaland.com.ph": {
        "user_id": "7ee5f39e-efb0-4c1a-afdd-0b680128e924",
        "trainee_code": "TRN-8088",
        "display_name": "VincentAyala",
        "streak": 6,
        "points": 10500,
        "level": 3,
    },
}

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
    {"rule_code": "S1_AFTER_HOURS", "parameters": {"start_hour": 9, "end_hour": 18, "tz": "Asia/Manila"}, "description": "After-hours supporting indicator"},
]


def normalize_customer_key(raw: str) -> str:
    s = re.sub(r"\(SI\s*#?.*?\)", "", str(raw or ""), flags=re.IGNORECASE)
    s = re.sub(r"PO\s*#.*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\(OPC\)", "opc", s, flags=re.IGNORECASE)
    s = re.sub(r"[^a-zA-Z0-9\s]", "", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def normalize_program_key(raw: str) -> str:
    s = re.sub(r"\s+", " ", str(raw or "")).strip().lower()
    return s.replace("simulatuon", "simulation")


def display_program_name(raw: str) -> str:
    s = re.sub(r"\s+", " ", str(raw or "")).strip()
    return s.replace("Simulatuon", "Simulation")


def build_database(target_url: str, apply_changes: bool = False):
    effective_url = target_url if apply_changes else "sqlite:////tmp/crossquest_dryrun_check.db"
    if not apply_changes and os.path.exists("/tmp/crossquest_dryrun_check.db"):
        os.remove("/tmp/crossquest_dryrun_check.db")

    print("=" * 76)
    print("CROSSQUEST DEFENSE & PILOT DATABASE BUILDER")
    print(f"Target URL : {target_url}")
    print(f"Mode       : {'APPLY (REBUILDING TARGET DATABASE)' if apply_changes else 'DRY RUN (TESTING IN /tmp/crossquest_dryrun_check.db)'}")
    print("=" * 76)

    data_dir = BACKEND_ROOT / "data"
    sessions_csv = data_dir / "pilot_sessions.csv"
    programs_csv = data_dir / "pilot_programs.csv"
    participants_csv = data_dir / "pilot_participants.csv"

    for p in (sessions_csv, programs_csv, participants_csv):
        if not p.exists():
            raise FileNotFoundError(f"Required pilot CSV not found: {p}")

    with open(sessions_csv, encoding="utf-8") as f:
        raw_sessions = [r for r in csv.DictReader(f) if any(r.values()) and r.get("Training Date")]
    with open(programs_csv, encoding="utf-8") as f:
        raw_programs = [r for r in csv.DictReader(f) if any(r.values()) and r.get("Program Name")]
    with open(participants_csv, encoding="utf-8") as f:
        raw_participants = [r for r in csv.DictReader(f) if any(r.values()) and r.get("Training Date")]

    print(f"[1/9] Loaded CSVs: {len(raw_programs)} programs, {len(raw_sessions)} session rows, {len(raw_participants)} participant rows.")

    connect_args = {"check_same_thread": False} if effective_url.startswith("sqlite") else {}
    if effective_url.startswith("postgresql://"):
        effective_url = effective_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    eng = create_engine(effective_url, connect_args=connect_args)
    is_pg = eng.dialect.name == "postgresql"

    print("[2/9] Resetting schema and creating all 33 SQLAlchemy tables...")
    with eng.connect() as conn:
        if is_pg:
            conn.execute(text("DROP SCHEMA IF EXISTS internal_security CASCADE;"))
            conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"))
            conn.commit()
        else:
            Base.metadata.drop_all(bind=eng)
    Base.metadata.create_all(bind=eng)

    SessionMaker = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    db = SessionMaker()

    try:
        now_utc = datetime(2026, 11, 11, 6, 0, 0)  # 2026-11-11 14:00 PHT (06:00 UTC)
        today_date = now_utc.date()
        default_pwd = get_password_hash("password123")
        recovery_hashes = [
            hashlib.sha256(b"RECO-1111").hexdigest(),
            hashlib.sha256(b"RECO-2222").hexdigest(),
            hashlib.sha256(b"RECO-3333").hexdigest(),
            hashlib.sha256(b"RECO-4444").hexdigest(),
        ]

        # -------------------------------------------------------------------
        # 1. Seed 40 Canonical Client Companies (25 Corporate + 15 Individual)
        # -------------------------------------------------------------------
        print("[3/9] Seeding canonical Client Companies (COMPANY & INDIVIDUAL)...")
        company_by_norm = {}
        company_by_code = {}
        all_company_codes = []

        for norm_k, (code, clean_name, industry) in sorted(CORPORATE_CANONICAL.items(), key=lambda x: x[1][0]):
            cc = ClientCompany(
                id=str(uuid.uuid4()),
                code=code,
                name=clean_name,
                client_type="COMPANY",
                industry=industry,
                created_at=now_utc - timedelta(days=120),
            )
            db.add(cc)
            company_by_norm[norm_k] = cc
            company_by_code[code] = cc
            all_company_codes.append(code)

        for norm_k, (code, clean_name) in sorted(INDIVIDUAL_CUSTOMERS.items(), key=lambda x: x[1][0]):
            cc = ClientCompany(
                id=str(uuid.uuid4()),
                code=code,
                name=clean_name,
                client_type="INDIVIDUAL",
                industry="Individual Professional Enrollment",
                created_at=now_utc - timedelta(days=90),
            )
            db.add(cc)
            company_by_norm[norm_k] = cc
            company_by_code[code] = cc
            all_company_codes.append(code)

        db.flush()

        # -------------------------------------------------------------------
        # 2. Seed Certification Types (Table 15, FR-18: 36 months validity)
        # -------------------------------------------------------------------
        cert_types_spec = [
            ("PMP", "Project Management Professional (PMP)", 36, "PMI 3-year renewal cycle (FR-18)"),
            ("CAPM", "Certified Associate in Project Management (CAPM)", 36, "PMI 3-year renewal cycle (FR-18)"),
            ("PMI_ACP", "PMI Agile Certified Practitioner (PMI-ACP)", 36, "PMI 3-year renewal cycle (FR-18)"),
            ("CPMAI", "Cognitive Project Management in AI (CPMAI)", 36, "Crossworks 3-year validity period (FR-18)"),
            ("ISO_31000", "ISO 31000 Certified Risk Manager", 36, "ISO standard 3-year recertification (FR-18)"),
            ("SUP", "Supervisory Upskilling & Leadership Certificate", 36, "Crossworks Corporate Leadership Accreditation"),
            ("CISSP", "Certified Information Systems Security Professional", 36, "ISC2 3-year CPE cycle"),
            ("AWS_SEC", "AWS Certified Security Specialist", 36, "AWS 3-year recertification"),
            ("COMPLIANCE", "Crossworks Certificate of Completion", 36, "Non-expiring / 36-month corporate accreditation"),
        ]
        for c_code, c_name, c_months, c_basis in cert_types_spec:
            db.add(CertificationType(code=c_code, name=c_name, validity_months=c_months, validity_basis=c_basis))
        db.flush()

        # -------------------------------------------------------------------
        # 3. Seed System Users (Admins, AMs, Finance, Trainers)
        # -------------------------------------------------------------------
        print("[4/9] Seeding Staff & Administrator accounts (exact DEMO_USERS UUIDs)...")
        u_joey = User(
            id="016868d1-5238-49a4-9b3f-1cd205dbdc44",
            email="joey.mallari@xworks.ph",
            username="joey_mallari",
            full_name="Joselito 'Joey' Mallari Jr.",
            job_title="Principal Consultant & Lead Administrator",
            hashed_password=default_pwd,
            role="admin",
            clearance_level=3,
            assigned_client_accounts=list(all_company_codes),
            is_active=True,
            is_superuser=True,
            mfa_enabled=True,
            mfa_secret="JBSWY3DPEHPK3PXP",
            mfa_recovery_codes=recovery_hashes,
        )
        u_len = User(
            id="5f9f8fa9-e288-4291-9ca7-acadcdd8faef",
            email="len.mallari@xworks.ph",
            username="len_mallari",
            full_name="Len Mallari",
            job_title="Compliance Administrator & Peer Reviewer",
            hashed_password=default_pwd,
            role="admin",
            clearance_level=3,
            assigned_client_accounts=list(all_company_codes),
            is_active=True,
            is_superuser=True,
            mfa_enabled=True,
            mfa_secret="JBSWY3DPEHPK3PXP",
            mfa_recovery_codes=recovery_hashes,
        )

        erika_codes = ["VHL", "ROP", "EWALIC", "WCD", "DDH", "ANALOG_DEVICE_INC"]
        sharon_codes = [
            "UNIVER_ROBINA_CORPOR", "ISLA_LPG_CORPOR", "AYALA_LAND_INC", "BIBSP",
            "ROP", "NSE", "FFHT", "NETWOR_SOLUTI_CORPOR", "SYDENH_LABORA_INC",
            "EMS", "IGBDSC", "WCD", "DDH",
            "ANGELI_ALCANT", "RHYAN_DEPANT", "MA_NONICA_PORMIL", "MKLT",
            "KRISTI_CASTIL", "MIKE_ANGELO_VILLAN", "MYKA_ELLA_BAUTIS",
            "JOCELY_B_CAPIST", "MIKKA_BARLIS", "MJCS", "GLADYS_RUIZ", "RON_ROBERT_DESPI",
        ]
        brian_codes = [
            "IPROY_SERVI", "AMIHAN_SOLUTI", "SECURI_BANK_CORPOR",
            "PHILIP_SAVING_BANK", "XSDS", "SERVIE_PHILIP_INC",
            "KIMBER_ANN_ESTEBA", "DERIC_CENTON_MACALI",
        ]
        quel_codes = ["AOS", "VHL", "ISLA_LPG_CORPOR", "ANALOG_DEVICE_INC", "MOS", "OCEANA_PHILS_INC", "LAARNI_UYCHUT"]
        jordan_sales_codes = ["AMIHAN_SOLUTI", "EWALIC"]
        cez_codes = ["SECURI_BANK_CORPOR", "AYALA_LAND_INC"]

        u_erika = User(
            id="81847717-dd7f-48fe-91ad-4391018fdef8",
            email="erika.bana@crossworks.ph",
            username="am_erika",
            full_name="Erika Bana",
            job_title="Account Manager (Enterprise Accounts)",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=erika_codes,
            is_active=True,
        )
        u_sharon = User(
            id="0525a57b-668d-46cf-ab3b-6f6862920a9c",
            email="sharon.devera@crossworks.ph",
            username="am_sharon",
            full_name="Sharon De Vera",
            job_title="Account Manager (Strategic Accounts)",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=sharon_codes,
            is_active=True,
        )
        u_brian = User(
            id="8049c06b-c340-4d3f-8fca-1e83a4beb4f1",
            email="brian.mendoza@crossworks.ph",
            username="am_brian",
            full_name="Brian Mendoza",
            job_title="Account Manager (Tech & Telecom)",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=brian_codes,
            is_active=True,
        )
        u_quel = User(
            id="d6cfb2eb-07d2-4629-8f41-60fee732c5d3",
            email="quel@crossworks.ph",
            username="am_quel",
            full_name="Raquel 'Quel' Santos",
            job_title="Strategic Partnerships Manager",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=quel_codes,
            is_active=True,
        )
        u_jordan_sales = User(
            id="2cc2fae0-d941-4d81-9e55-04e822726a6a",
            email="jordan.sales@crossworks.ph",
            username="am_jordan",
            full_name="Jordan Ramos (Sales)",
            job_title="Commercial Accounts Executive",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=jordan_sales_codes,
            is_active=True,
        )
        u_cez = User(
            id="e9c51def-d5a4-40ec-b61e-e3461921b8fe",
            email="cez@crossworks.ph",
            username="am_cez",
            full_name="Cezanne 'Cez' Garcia",
            job_title="Client Success Manager",
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=cez_codes,
            is_active=True,
        )

        # Finance accounts (both finance@crossworks.ph from DEMO_USERS and elena.santos@crossworks.ph)
        u_fin = User(
            id="3cce3076-e622-4468-921b-039ea82cae3b",
            email="finance@crossworks.ph",
            username="fin_elena",
            full_name="Elena Santos",
            job_title="Finance & Billing Specialist",
            hashed_password=default_pwd,
            role="finance",
            clearance_level=2,
            assigned_client_accounts=list(all_company_codes),
            is_active=True,
            mfa_enabled=True,
            mfa_secret="JBSWY3DPEHPK3PXP",
            mfa_recovery_codes=recovery_hashes,
        )
        u_fin_alt = User(
            id="5feb8afa-a318-48a5-837f-3c130b7babe0",
            email="elena.santos@crossworks.ph",
            username="elena_santos",
            full_name="Elena Santos (Billing & Audit)",
            job_title="Senior Finance & Reconciliation Officer",
            hashed_password=default_pwd,
            role="finance",
            clearance_level=2,
            assigned_client_accounts=list(all_company_codes),
            is_active=True,
            mfa_enabled=True,
            mfa_secret="JBSWY3DPEHPK3PXP",
            mfa_recovery_codes=recovery_hashes,
        )

        # Trainers (Jordan Ramos primary quick-login email is jordan.ramos@crossworks.ph)
        u_jordan = User(
            id="467d91d2-8dae-49a8-a90d-05c903a09a81",
            email="jordan.ramos@crossworks.ph",
            username="trainer_jordan",
            full_name="Jordan Ramos",
            job_title="Lead Technical Instructor: Agile PME, PMP & Leadership",
            hashed_password=default_pwd,
            role="trainer",
            clearance_level=2,
            assigned_client_accounts=list(all_company_codes),
            is_active=True,
        )
        u_billy = User(
            id="ad5d83e0-c70b-4bef-851e-6e4bddc44b87",
            email="billy@crossworks.ph",
            username="trainer_billy",
            full_name="Billy Fernandez",
            job_title="Lead Trainer: CONNECT & Executive Communication",
            hashed_password=default_pwd,
            role="trainer",
            clearance_level=2,
            assigned_client_accounts=list(all_company_codes),
            is_active=True,
        )
        u_jobert = User(
            id="58b734d7-e08d-4fb4-829f-38fa0d53f4b1",
            email="jobert@crossworks.ph",
            username="trainer_jobert",
            full_name="Jobert Cruz",
            job_title="Lead Trainer: Supervisory Mastery & High-Impact Coaching",
            hashed_password=default_pwd,
            role="trainer",
            clearance_level=2,
            assigned_client_accounts=list(all_company_codes),
            is_active=True,
        )
        u_owen = User(
            id="da0ea449-ace9-49a6-9ce8-5afdc4b4edd2",
            email="owen@crossworks.ph",
            username="trainer_owen",
            full_name="Owen Castillo",
            job_title="Lead Trainer: Business Continuity & ISO 31000 Risk Management",
            hashed_password=default_pwd,
            role="trainer",
            clearance_level=2,
            assigned_client_accounts=list(all_company_codes),
            is_active=True,
        )

        staff_users = [
            u_joey, u_len,
            u_erika, u_sharon, u_brian, u_quel, u_jordan_sales, u_cez,
            u_fin, u_fin_alt,
            u_jordan, u_billy, u_jobert, u_owen,
        ]
        db.add_all(staff_users)
        db.flush()

        # Create AccountManagerAssignment rows for all 6 Account Managers
        for am_user in (u_erika, u_sharon, u_brian, u_quel, u_jordan_sales, u_cez):
            for c_code in (am_user.assigned_client_accounts or []):
                comp = company_by_code.get(c_code)
                if comp:
                    db.add(AccountManagerAssignment(
                        user_id=am_user.id,
                        company_id=comp.id,
                        valid_from=datetime(2026, 6, 1),
                        assigned_by=u_joey.id,
                    ))
        db.flush()

        # -------------------------------------------------------------------
        # 4. Seed 148 Unique Pilot Trainees + Linked User Accounts (Zero Orphans)
        # -------------------------------------------------------------------
        print("[5/9] Seeding 148 Pilot Trainees, User logins, Affiliations & Gamification...")
        reserved_codes = {v["trainee_code"] for v in DEMO_TRAINEE_OVERRIDES.values()}
        next_code_num = 8000

        trainee_by_email = {}
        all_trainees = []
        seen_usernames = {u.username for u in staff_users}

        for r_idx, p_row in enumerate(raw_participants, start=1):
            raw_email = (p_row.get("Participant Email") or "").strip().lower()
            raw_name = (p_row.get("Participant Name") or "").strip()
            raw_cust = (p_row.get("Customer") or "").strip()
            if not raw_email or not raw_name:
                continue
            if raw_email in trainee_by_email:
                continue

            norm_c = normalize_customer_key(raw_cust)
            comp = company_by_norm.get(norm_c)
            if not comp:
                comp = company_by_code["VHL"]

            override = DEMO_TRAINEE_OVERRIDES.get(raw_email)
            if override:
                t_code = override["trainee_code"]
                u_id = override["user_id"]
            else:
                while f"TRN-{next_code_num:04d}" in reserved_codes:
                    next_code_num += 1
                t_code = f"TRN-{next_code_num:04d}"
                reserved_codes.add(t_code)
                next_code_num += 1
                u_id = str(uuid.uuid4())

            parts = raw_name.split()
            first_name = parts[0]
            last_name = " ".join(parts[1:]) if len(parts) > 1 else "Participant"

            slug = re.sub(r"[^a-z0-9_]", "_", raw_email.split("@")[0])[:20]
            base_uname = f"trn_{slug}"
            uname = base_uname
            seq = 2
            while uname in seen_usernames:
                uname = f"{base_uname}_{seq}"
                seq += 1
            seen_usernames.add(uname)

            u_trn = User(
                id=u_id,
                email=raw_email,
                username=uname,
                full_name=raw_name,
                job_title=f"Participant ({comp.name})",
                hashed_password=default_pwd,
                role="trainee",
                clearance_level=1,
                assigned_client_accounts=[comp.code],
                is_active=True,
            )
            db.add(u_trn)
            db.flush()

            streak_val = override["streak"] if override else (3 + (r_idx % 12))
            points_val = override["points"] if override else (3200 + (r_idx * 175) % 12500)
            level_val = override["level"] if override else max(1, min(5, 1 + (points_val // 3200)))
            disp_name = override["display_name"] if override else f"{re.sub(r'[^A-Za-z]', '', first_name)}{t_code[-3:]}"

            trn = Trainee(
                id=str(uuid.uuid4()),
                trainee_code=t_code,
                user_id=u_trn.id,
                first_name=first_name,
                last_name=last_name,
                email=raw_email,
                display_name=disp_name,
                phone="+63 917 " + f"{(1000000 + r_idx * 7919) % 9000000:07d}",
                current_company_id=comp.id,
                leaderboard_opt_out=False,
                current_streak=streak_val,
                last_activity_date=today_date,
                created_at=now_utc - timedelta(days=90),
            )
            db.add(trn)
            db.flush()

            db.add(TraineeAffiliation(
                trainee_id=trn.id,
                company_id=comp.id,
                valid_from=datetime(2026, 6, 1),
                valid_to=None,
            ))

            badges_list = ["FIRST_STEP"]
            if streak_val >= 7:
                badges_list.append("SEVEN_DAY_STREAK")
            if level_val >= 3:
                badges_list.append("SECURITY_CHAMPION")
            if level_val >= 4:
                badges_list.append("RISK_GUARDIAN")
            if level_val >= 5:
                badges_list.append("ENCRYPTOR_SUPREME")

            db.add(GamificationProgress(
                trainee_id=trn.id,
                points=points_val,
                level=level_val,
                badges=badges_list,
                quizzes_completed=2 + (r_idx % 4),
                streak=streak_val,
                last_activity_date=today_date,
            ))

            trainee_by_email[raw_email] = (trn, u_trn, comp)
            all_trainees.append((trn, u_trn, comp))

        # Give Andrea Aguilar a historical cross-company affiliation (FR-15 Option B demo)
        if "andrea.aguilar@vertiv.com" in trainee_by_email:
            t_andrea = trainee_by_email["andrea.aguilar@vertiv.com"][0]
            db.add(TraineeAffiliation(
                trainee_id=t_andrea.id,
                company_id=company_by_code["AOS"].id,
                valid_from=datetime(2025, 1, 10),
                valid_to=datetime(2026, 5, 31),
            ))
        db.flush()

        # -------------------------------------------------------------------
        # 5. Seed 31 Courses & 46 In-Scope Pilot Sessions + 6 DEMO Cohorts
        # -------------------------------------------------------------------
        print("[6/9] Seeding 31 Courses, 46 Pilot Sessions & 6 Interactive DEMO Cohorts...")
        course_by_norm = {}
        tla_overrides = {
            "supervisory upskilling program for excellent": "SUP",
            "pmp review (saturdays)": "PMP",
            "pmp review (weekdays)": "PMP",
            "certified associate in project management (capm)": "CAP",
            "negotiating for results": "NFR",
            "iso 31000 crm": "CRM",
            "project management essentials": "PME",
            "strategic management tools": "SMT",
            "customized program": "CSP",
            "business strategy simulation": "BSS",
            "innovation through design thinking": "IDT",
            "agile pme": "APM",
            "business continuity management essentials": "BCM",
        }

        for idx, pr in enumerate(raw_programs, start=1):
            p_name = display_program_name(pr["Program Name"])
            norm_p = normalize_program_key(p_name)
            if norm_p in course_by_norm:
                continue
            words = [w for w in re.sub(r"[^A-Za-z0-9\s]", "", p_name).split() if w.lower() not in ("in", "for", "and", "the", "of", "to", "with")]
            acr = tla_overrides.get(norm_p) or ("".join(w[0].upper() for w in words)[:3] if len(words) >= 2 else p_name[:3].upper())
            acr = acr.ljust(3, "X")[:3]
            c_obj = Course(
                id=str(uuid.uuid4()),
                course_code=f"CRS-{acr}-{idx:02d}",
                name=p_name,
                description=f"Official Crossworks Training & Consulting curriculum: {p_name}.",
                acronym_3=acr,
            )
            db.add(c_obj)
            course_by_norm[norm_p] = c_obj

        for sr in raw_sessions:
            p_name = display_program_name(sr["Program Name"])
            norm_p = normalize_program_key(p_name)
            if norm_p not in course_by_norm:
                acr = (sr.get("TLA") or "TRN").strip().upper()[:3]
                if acr == "XXX":
                    acr = "CSP"
                c_obj = Course(
                    id=str(uuid.uuid4()),
                    course_code=f"CRS-{acr}-{len(course_by_norm)+1:02d}",
                    name=p_name,
                    description=f"Official Crossworks Training & Consulting curriculum: {p_name}.",
                    acronym_3=acr,
                )
                db.add(c_obj)
                course_by_norm[norm_p] = c_obj
        db.flush()

        # Match all 150 participant rows to the 47 session rows by (Date, Program, Customer)
        session_buckets = defaultdict(list)
        for s_idx, sr in enumerate(raw_sessions):
            k = (
                sr["Training Date"].strip(),
                normalize_program_key(sr["Program Name"]),
                normalize_customer_key(sr["Customer"]),
            )
            session_buckets[k].append((s_idx, int(sr["Pax"] or 1)))

        session_participants = defaultdict(list)
        for p_row in raw_participants:
            k = (
                p_row["Training Date"].strip(),
                normalize_program_key(p_row["Program Name"]),
                normalize_customer_key(p_row["Customer"]),
            )
            cands = session_buckets.get(k, [])
            placed = False
            for s_idx, pax_cap in cands:
                if len(session_participants[s_idx]) < pax_cap:
                    session_participants[s_idx].append(p_row)
                    placed = True
                    break
            if not placed and cands:
                session_participants[cands[-1][0]].append(p_row)

        pilot_sessions = []
        for s_idx, sr in enumerate(raw_sessions):
            dt_str = sr["Training Date"].strip()
            if dt_str < "2026-08-01":
                continue

            s_date = datetime.strptime(dt_str, "%Y-%m-%d")
            e_date = s_date + timedelta(days=1, hours=17)
            p_name = display_program_name(sr["Program Name"])
            norm_p = normalize_program_key(p_name)
            course = course_by_norm[norm_p]
            tla = course.acronym_3 or "TRN"
            deliv_type = (sr.get("Type") or "Public").strip()
            deliv_mode = (sr.get("Delivery") or "F2F").strip()
            venue = (
                "Online (Virtual Meeting)"
                if deliv_mode.lower() == "online"
                else "Crossworks Makati Learning Hub"
            )

            is_completed_cohort = dt_str < "2026-11-01"
            is_awaiting_cohort = "2026-11-01" <= dt_str < "2026-11-10"

            sec_trainer = None
            if "supervisory" in norm_p or "coaching" in norm_p:
                sec_trainer = u_jobert
            elif "iso 31000" in norm_p or "continuity" in norm_p:
                sec_trainer = u_owen
            elif "negotiating" in norm_p or "connect" in norm_p or "simulation" in norm_p:
                sec_trainer = u_billy

            sess_code = f"SESS-2026-{tla}-{s_idx+1:02d}"
            sess_obj = TrainingSession(
                id=str(uuid.uuid4()),
                session_code=sess_code,
                course_id=course.id,
                course_name=course.name,
                start_date=s_date,
                end_date=e_date,
                delivery_type=deliv_type,
                delivery_mode=deliv_mode,
                venue=venue,
                trainer_signed_off=is_completed_cohort,
                trainer_sign_off_at=(e_date + timedelta(hours=1)) if is_completed_cohort else None,
                trainer_sign_off_user_id=u_jordan.id if is_completed_cohort else None,
                trainer_sign_off_notes=(
                    f"Official Crossworks Trainer sign-off verified for {len(session_participants[s_idx])} participant(s)."
                    if is_completed_cohort else None
                ),
            )
            db.add(sess_obj)
            db.flush()

            db.add(TrainerAssignment(
                user_id=u_jordan.id,
                session_id=sess_obj.id,
                valid_from=s_date - timedelta(days=14),
                valid_to=None,
            ))
            if sec_trainer:
                db.add(TrainerAssignment(
                    user_id=sec_trainer.id,
                    session_id=sess_obj.id,
                    valid_from=s_date - timedelta(days=14),
                    valid_to=None,
                ))

            pilot_sessions.append((s_idx, sess_obj, course, is_completed_cohort, is_awaiting_cohort))

        demo_cohort_specs = [
            ("DEMO-NA-01", "Supervisory Upskilling Program for Excellent", datetime(2026, 11, 12, 9, 0), "F2F", "Crossworks Makati Learning Hub", "needs"),
            ("DEMO-NA-02", "Business Strategy Simulation", datetime(2026, 11, 11, 9, 0), "F2F", "Crossworks Makati Learning Hub", "needs"),
            ("DEMO-NA-03", "Project Management Essentials", datetime(2026, 11, 14, 9, 0), "Online", "Online (Virtual Meeting)", "needs"),
            ("DEMO-AW-01", "Supervisory Upskilling Program for Excellent", datetime(2026, 11, 7, 9, 0), "F2F", "Crossworks Makati Learning Hub", "awaiting"),
            ("DEMO-AW-02", "Business Strategy Simulation", datetime(2026, 11, 8, 9, 0), "F2F", "Crossworks Makati Learning Hub", "awaiting"),
            ("DEMO-AW-03", "Project Management Essentials", datetime(2026, 11, 5, 9, 0), "Online", "Online (Virtual Meeting)", "awaiting"),
        ]
        demo_sessions = []
        for d_code, d_prog, d_start, d_mode, d_venue, d_stage in demo_cohort_specs:
            c_obj = course_by_norm[normalize_program_key(d_prog)]
            d_sess = TrainingSession(
                id=str(uuid.uuid4()),
                session_code=d_code,
                course_id=c_obj.id,
                course_name=c_obj.name,
                start_date=d_start,
                end_date=d_start + timedelta(days=1, hours=8),
                delivery_type="Public",
                delivery_mode=d_mode,
                venue=d_venue,
                trainer_signed_off=False,
            )
            db.add(d_sess)
            db.flush()
            db.add(TrainerAssignment(
                user_id=u_jordan.id,
                session_id=d_sess.id,
                valid_from=d_start - timedelta(days=10),
                valid_to=None,
            ))
            demo_sessions.append((d_sess, c_obj, d_stage))

        db.flush()

        # -------------------------------------------------------------------
        # 6. Seed Pilot Import Batch (batch-pilot-2026)
        # -------------------------------------------------------------------
        print("[7/9] Seeding Pilot Import Batch (150 staging rows, 1 pre-cutoff, 3 discrepancies)...")
        pilot_batch = ImportBatch(
            id="batch-pilot-2026",
            source_file_name="Training_Participants.xlsx",
            file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            record_count=150,
            in_scope_count=149,
            pre_cutoff_count=1,
            quarantined_count=3,
            distinct_customers_count=40,
            reconciled=True,
            loaded_at=datetime(2026, 8, 2, 14, 30),
            loaded_by_user_id=u_fin.id,
        )
        db.add(pilot_batch)
        db.flush()

        for row_no, p_row in enumerate(raw_participants, start=1):
            dt_s = p_row["Training Date"].strip()
            cust_s = p_row["Customer"].strip()
            norm_c = normalize_customer_key(cust_s)
            comp = company_by_norm.get(norm_c) or company_by_code["VHL"]
            is_indiv = comp.client_type == "INDIVIDUAL"
            val_status = "PRE_CUTOFF_EXCLUDED" if dt_s < "2026-08-01" else "VALID"
            if row_no in (43, 114, 115):
                val_status = "RESOLVED"
            db.add(ImportStagingRow(
                batch_id=pilot_batch.id,
                source_row_no=row_no,
                validation_status=val_status,
                raw_data={
                    "training_date": dt_s,
                    "program_name": display_program_name(p_row["Program Name"]),
                    "customer": cust_s,
                    "standardized_customer": comp.name,
                    "participant_name": p_row["Participant Name"].strip(),
                    "participant_email": p_row["Participant Email"].strip().lower(),
                    "is_individual_retail": is_indiv,
                },
            ))

        db.add_all([
            ImportDiscrepancy(
                batch_id=pilot_batch.id,
                source_row_no=150,
                issue_type="PRE_CUTOFF_DATE",
                field_name="Training Date",
                resolution="EXCLUDE",
                resolution_reason="Training date 2026-06-06 (Ron Robert Despi) precedes the August 1, 2026 pilot cutoff baseline (FR-22).",
                resolved_by_user_id=u_joey.id,
                resolved_at=datetime(2026, 8, 2, 15, 10),
            ),
            ImportDiscrepancy(
                batch_id=pilot_batch.id,
                source_row_no=43,
                issue_type="COMPANY_NAME_VARIANT",
                field_name="Customer",
                resolution="CORRECT",
                resolution_reason="Normalized 'Red Oak Properties Inc.' and 'Red Oak Properties, Inc.' to canonical tenant ROP (Table 12).",
                resolved_by_user_id=u_joey.id,
                resolved_at=datetime(2026, 8, 2, 15, 15),
            ),
            ImportDiscrepancy(
                batch_id=pilot_batch.id,
                source_row_no=114,
                issue_type="REPEAT_ENROLLMENT_VERIFIED",
                field_name="Participant Email",
                resolution="ACCEPT",
                resolution_reason="Verified distinct Sales Invoices (SI # 0194 & SI # 0233; SI # 0221 & SI # 0234) on 2026-09-05 (DAT-08).",
                resolved_by_user_id=u_len.id,
                resolved_at=datetime(2026, 8, 2, 15, 20),
            ),
        ])
        db.flush()

        # -------------------------------------------------------------------
        # 7. Seed CP-ABE Encrypted Training Records, Versions & Certificates
        # -------------------------------------------------------------------
        print("[8/9] Encrypting Training Records (rec-{trainee_code}), Versions, Certificates & Keys...")
        for r_tok in ("ADMIN", "FINANCE", "ACCTMGR", "TRAINER", "TRAINEE"):
            AttributeManager.get_or_create_attribute(db, "ROLE", r_tok, version=1)
        for c_code in all_company_codes:
            AttributeManager.get_or_create_attribute(db, "CLIENT", c_code, version=1)

        serial_counters = defaultdict(int)
        rec_seq = 1

        def create_encrypted_record(
            rec_id: str,
            trn: Trainee,
            comp: ClientCompany,
            sess: TrainingSession,
            course: Course,
            rec_status: str,
            att_status: str,
            score_val,
            comp_date,
            is_pilot_import: bool = True,
        ):
            AttributeManager.get_or_create_attribute(db, "TRAINING", sess.session_code, version=1)
            AttributeManager.get_or_create_attribute(db, "TRAINEE", trn.trainee_code, version=1)

            pol = cpabe_engine.build_record_policy(
                company_code=comp.code,
                session_code=sess.session_code,
                trainee_code=trn.trainee_code,
            )
            payload = {
                "score": score_val,
                "assessment_notes": (
                    f"Completed {course.name} cohort ({sess.session_code}) with verified proficiency."
                    if rec_status == "Completed"
                    else f"Active cohort enrollment for {course.name} ({sess.session_code})."
                ),
                "practical_lab": "Distinction" if (score_val and score_val >= 90) else "Satisfactory",
                "trainee_name": f"{trn.first_name} {trn.last_name}",
                "trainee_email": trn.email,
                "company": comp.name,
                "session_code": sess.session_code,
            }
            enc = cpabe_engine.encrypt_record(
                plaintext_data=payload,
                policy_str=pol,
                record_id=f"rec-{trn.trainee_code}",
                version=1,
            )
            rec = TrainingRecord(
                id=rec_id,
                trainee_id=trn.id,
                session_id=sess.id,
                company_at_completion_id=comp.id,
                course_name=course.name,
                status=rec_status,
                attendance_status=att_status,
                completion_date=comp_date,
                score=score_val,
                encryption_policy=pol,
                policy_version=1,
                abe_ciphertext=enc["abe_ciphertext"],
                payload_ciphertext=enc["payload_ciphertext"],
                nonce=enc["nonce"],
                is_encrypted=True,
                import_batch_id=pilot_batch.id if is_pilot_import else None,
                created_at=sess.start_date,
            )
            db.add(rec)
            db.flush()

            db.add(TrainingRecordVersion(
                record_id=rec.id,
                version_no=1,
                abe_ciphertext=enc["abe_ciphertext"],
                payload_ciphertext=enc["payload_ciphertext"],
                policy_tokens=pol,
                edited_by_user_id=u_joey.id,
                edited_at=sess.start_date,
                reason="Initial encrypted training record snapshot (DD-06).",
            ))
            return rec

        for s_idx, sess_obj, course_obj, is_comp, is_awaiting in pilot_sessions:
            p_list = session_participants[s_idx]
            for p_row in p_list:
                raw_email = p_row["Participant Email"].strip().lower()
                trn, _, _ = trainee_by_email[raw_email]
                rec_comp = company_by_norm.get(normalize_customer_key(p_row["Customer"])) or company_by_code["VHL"]
                rec_id = f"rec-pilot-{rec_seq:03d}"
                rec_seq += 1

                if is_comp:
                    r_status = "Completed"
                    a_status = "Present"
                    sc = round(86.0 + ((rec_seq * 3.7) % 13.0), 1)
                    c_date = sess_obj.end_date
                elif is_awaiting:
                    r_status = "In progress"
                    a_status = "Present"
                    sc = None
                    c_date = None
                else:
                    r_status = "Not completed"
                    a_status = None
                    sc = None
                    c_date = None

                rec = create_encrypted_record(
                    rec_id=rec_id,
                    trn=trn,
                    comp=rec_comp,
                    sess=sess_obj,
                    course=course_obj,
                    rec_status=r_status,
                    att_status=a_status,
                    score_val=sc,
                    comp_date=c_date,
                    is_pilot_import=True,
                )

                if is_comp:
                    tla = (course_obj.acronym_3 or "CRO")[:3].upper()
                    dt_tag = sess_obj.start_date.strftime("%Y%m%d")
                    prefix = f"{tla}{dt_tag}"
                    serial_counters[prefix] += 1
                    serial_no = f"{prefix}-{serial_counters[prefix]:02d}"

                    nl = course_obj.name.lower()
                    if "pmp" in nl or "project management essentials" in nl:
                        c_type = "PMP"
                        exp_dt = c_date + timedelta(days=365 * 3)
                        exp_basis = "Calculated: issue_date + 36 months validity (FR-18)"
                    elif "capm" in nl:
                        c_type = "CAPM"
                        exp_dt = c_date + timedelta(days=365 * 3)
                        exp_basis = "Calculated: issue_date + 36 months validity (FR-18)"
                    elif "iso 31000" in nl:
                        c_type = "ISO_31000"
                        exp_dt = c_date + timedelta(days=365 * 3)
                        exp_basis = "Calculated: issue_date + 36 months validity (FR-18)"
                    elif "supervisory" in nl:
                        c_type = "SUP"
                        exp_dt = None
                        exp_basis = "Non-expiring Crossworks completion certificate (Section 3.8.2)"
                    else:
                        c_type = "COMPLIANCE"
                        exp_dt = None
                        exp_basis = "Non-expiring Crossworks completion certificate (Section 3.8.2)"

                    cert = Certificate(
                        id=str(uuid.uuid4()),
                        record_id=rec.id,
                        trainee_id=trn.id,
                        cert_type_code=c_type,
                        title=f"Certificate of Completion — {course_obj.name}",
                        serial_number=serial_no,
                        issue_date=c_date,
                        expiry_date=exp_dt,
                        expiry_basis=exp_basis,
                        status="Valid",
                        is_nearing_renewal=False,
                        is_self_reported=False,
                    )
                    db.add(cert)

        # Ensure every current/future pilot session has at least 4 enrolled trainees
        erika_pool = [t for t, _, c in all_trainees if c.code in ("VHL", "ROP", "EWALIC")]
        for s_idx, sess_obj, course_obj, is_comp, is_awaiting in pilot_sessions:
            existing_cnt = len(session_participants[s_idx])
            if not is_comp and not is_awaiting and existing_cnt < 4:
                needed = 4 - existing_cnt
                for extra_idx in range(needed):
                    trn = erika_pool[(s_idx * 3 + extra_idx) % len(erika_pool)]
                    comp = next(c for t, _, c in all_trainees if t.id == trn.id)
                    create_encrypted_record(
                        rec_id=f"rec-fut-{s_idx+1:02d}-{extra_idx+1}",
                        trn=trn,
                        comp=comp,
                        sess=sess_obj,
                        course=course_obj,
                        rec_status="Not completed",
                        att_status=None,
                        score_val=None,
                        comp_date=None,
                        is_pilot_import=False,
                    )

        # Populate the 6 Interactive DEMO-* Cohorts (5 trainees each from VHL, ROP, EWALIC)
        for d_idx, (d_sess, d_course, d_stage) in enumerate(demo_sessions):
            cohort_slice = [erika_pool[(d_idx * 5 + i) % len(erika_pool)] for i in range(5)]
            for m_idx, trn in enumerate(cohort_slice):
                comp = next(c for t, _, c in all_trainees if t.id == trn.id)
                if d_stage == "needs":
                    r_stat = "Not completed"
                    a_stat = None
                else:
                    r_stat = "In progress"
                    a_stat = "Absent" if (d_sess.session_code in ("DEMO-AW-01", "DEMO-AW-02") and m_idx == 4) else "Present"

                create_encrypted_record(
                    rec_id=f"rec-{d_sess.session_code.lower()}-{m_idx+1:02d}",
                    trn=trn,
                    comp=comp,
                    sess=d_sess,
                    course=d_course,
                    rec_status=r_stat,
                    att_status=a_stat,
                    score_val=None,
                    comp_date=None,
                    is_pilot_import=False,
                )

        # Add Expiring-Soon & Self-Reported External Certificates + Notifications
        expiring_specs = [
            ("andrea.aguilar@vertiv.com", "PMP", "Project Management Professional (PMP)", 28, True, "https://www.credly.com/badges/andrea-aguilar-pmp", u_erika),
            ("ricardo.ocampo@iproyal.com", "ISO_31000", "ISO 31000 Certified Risk Manager", 45, False, None, u_brian),
            ("bea.macaraeg@iproyal.com", "PMI_ACP", "PMI Agile Certified Practitioner (PMI-ACP)", 58, True, "https://www.credly.com/badges/bea-macaraeg-acp", u_brian),
            ("rowena.cabrera@ewageas.com", "CPMAI", "Cognitive Project Management in AI (CPMAI)", 19, False, None, u_erika),
            ("camille.morales@boehringer-ingelheim.com", "CAPM", "Certified Associate in Project Management (CAPM)", 72, False, None, u_sharon),
        ]
        for em, c_code, c_title, days_left, is_self, cred_url, am_recip in expiring_specs:
            if em in trainee_by_email:
                trn, u_trn, comp = trainee_by_email[em]
                exp_dt = now_utc + timedelta(days=days_left)
                iss_dt = exp_dt - timedelta(days=365 * 3)
                ext_cert = Certificate(
                    id=str(uuid.uuid4()),
                    record_id=None,
                    trainee_id=trn.id,
                    cert_type_code=c_code,
                    title=c_title,
                    serial_number=f"{c_code[:3]}202312-{days_left:02d}",
                    issue_date=iss_dt,
                    expiry_date=exp_dt,
                    expiry_basis="Self-reported external credential (36-month cycle)" if is_self else "Calculated: issue_date + 36 months validity (FR-18)",
                    status="Expiring soon",
                    is_nearing_renewal=True,
                    is_self_reported=is_self,
                    credential_url=cred_url,
                )
                db.add(ext_cert)
                db.flush()

                offset_bucket = 30 if days_left <= 30 else (60 if days_left <= 60 else 90)
                db.add(Notification(
                    recipient_user_id=u_trn.id,
                    certification_id=ext_cert.id,
                    offset_days=offset_bucket,
                    title=f"Certification Renewal Alert ({days_left} Days Remaining)",
                    message=f"Your {c_title} credential ({ext_cert.serial_number}) expires in {days_left} days. Submit your renewal verification to maintain compliance.",
                ))
                db.add(Notification(
                    recipient_user_id=am_recip.id,
                    certification_id=ext_cert.id,
                    offset_days=offset_bucket,
                    title=f"Client Portfolio Renewal Notice: {trn.first_name} {trn.last_name} ({comp.code})",
                    message=f"Trainee {trn.first_name} {trn.last_name} ({comp.name}) holds a {c_title} certification expiring in {days_left} days.",
                ))

        db.flush()

        # -------------------------------------------------------------------
        # 8. Issue Envelope-Wrapped CP-ABE Private Keys for Staff & Demo Trainees
        # -------------------------------------------------------------------
        attr_mgr = AttributeManager()
        for staff_u in staff_users:
            attr_mgr.issue_or_rekey_user(db, staff_u, admin_user_id=u_joey.id, commit=False)
        for demo_email in DEMO_TRAINEE_OVERRIDES:
            if demo_email in trainee_by_email:
                _, u_trn, _ = trainee_by_email[demo_email]
                attr_mgr.issue_or_rekey_user(db, u_trn, admin_user_id=u_joey.id, commit=False)
        db.flush()

        # -------------------------------------------------------------------
        # 9. Seed Quizzes, Answer Keys (SEC-26), Attempts, Teams, Rules, Alerts & Logs
        # -------------------------------------------------------------------
        print("[9/9] Seeding Quizzes, Teams, Anomaly Rules, Peer-Review Alerts & Audit Trail...")
        quiz_catalog = [
            (
                "Supervisory Mastery & Leadership Assessment",
                "supervisory",
                [
                    ("What is the primary factor when choosing between delegating vs performing a task directly?", ["Team velocity and individual competency readiness", "Physical proximity to the client site", "Time of day the request arrived", "Seniority ranking on the org chart"], 0, "Delegation requires assessing competency readiness and growth opportunity."),
                    ("In the GROW coaching model, what does the 'R' stand for?", ["Remediation", "Reality", "Recognition", "Redirection"], 1, "GROW stands for Goal, Reality, Options, Will/Way Forward."),
                    ("Which feedback framework minimizes defensiveness during performance reviews?", ["SBI (Situation, Behavior, Impact)", "Sandwich method with vague praise", "Unannounced escalation to senior VP", "Public peer evaluation polling"], 0, "SBI grounds feedback in concrete observable facts."),
                    ("When team conflict escalates to interpersonal friction, what is the first leadership action?", ["Mediate privately to separate personalities from the process blocker", "Immediately terminate both team members", "Ignore the issue until project sprint ends", "Reassign entire project to an external contractor"], 0, "Leaders address interpersonal friction constructively and privately."),
                ],
            ),
            (
                "PMP Exam Review & Agile Governance Challenge",
                "pmp",
                [
                    ("Which artifact provides the formal authorization for a project manager to apply organizational resources?", ["Project Charter", "Work Breakdown Structure (WBS)", "Risk Register", "Stakeholder Engagement Matrix"], 0, "The Project Charter formally authorizes the existence of a project."),
                    ("What metric best indicates Agile sprint team predictability across iterations?", ["Velocity stability across sprints", "Gross lines of documentation authored", "Overtime hours billed per sprint", "Number of pull requests declined"], 0, "Velocity stability measures reliable sprint commitments."),
                    ("How should a Project Manager handle a newly identified high-impact risk during execution?", ["Log it in the Risk Register, analyze impact/probability, and plan a risk response", "Immediately halt all project work indefinitely", "Wait until the project retrospective to mention it", "Absorb the cost without documenting"], 0, "Structured risk management requires logging, qualitative/quantitative analysis, and response planning."),
                    ("What defines the 'Definition of Done' (DoD) in hybrid project delivery?", ["Shared quality criteria that every deliverable must satisfy to be accepted", "A verbal agreement between developer and tester", "The invoice date set by finance", "The conclusion of the fiscal quarter"], 0, "DoD ensures consistent quality and verification completeness."),
                ],
            ),
            (
                "ISO 31000 Certified Risk Management Framework",
                "31000",
                [
                    ("In ISO 31000, risk is formally defined as:", ["The effect of uncertainty on objectives", "A catastrophic monetary loss", "An unexpected network intrusion", "A hardware failure in production"], 0, "ISO 31000 defines risk as the effect of uncertainty on objectives."),
                    ("What are the two axes of a standard qualitative risk matrix?", ["Likelihood (Probability) and Impact (Consequence)", "Cost and Duration", "CPU Usage and Memory Latency", "Headcount and Seniority"], 0, "Risk severity is evaluated as Likelihood x Impact."),
                    ("Residual risk represents:", ["The risk remaining after risk treatment controls have been applied", "The initial unmitigated risk before any review", "Risks that cannot be calculated mathematically", "Risks covered by insurance policies"], 0, "Residual risk is the remaining exposure following control implementation."),
                    ("Which risk treatment strategy involves shifting financial liability to a third party?", ["Risk Sharing (Transfer)", "Risk Avoidance", "Risk Retention", "Risk Elimination"], 0, "Insurance and third-party warranties are examples of risk sharing."),
                ],
            ),
            (
                "Project Management Essentials & WBS Execution",
                "essentials",
                [
                    ("What is the smallest unit of work in a Work Breakdown Structure (WBS)?", ["Work Package", "Control Account", "Planning Phase", "Project Milestone"], 0, "The Work Package is the lowest level of the WBS where cost and duration are reliably estimated."),
                    ("On the Critical Path of a project schedule, what is the Total Float?", ["Zero (0 days)", "At least 5 buffer days", "Equal to the project duration", "Determined by the client"], 0, "Activities on the critical path have zero total float."),
                    ("Scope creep is best prevented by:", ["Enforcing a formal Change Control Process", "Refusing all communication with stakeholders", "Doubling the initial budget estimate", "Skipping requirements gathering"], 0, "Formal change control evaluates schedule, cost, and quality impact before approving scope changes."),
                    ("A RACI matrix clarifies roles using which four designations?", ["Responsible, Accountable, Consulted, Informed", "Required, Approved, Certified, Issued", "Reviewed, Audited, Closed, Archived", "Risk, Action, Control, Impact"], 0, "RACI stands for Responsible, Accountable, Consulted, and Informed."),
                ],
            ),
            (
                "Business Strategy Simulation & Executive Decision Lab",
                "strategy",
                [
                    ("In Porter's Five Forces, which force evaluates the ease with which new competitors can enter a market?", ["Threat of New Entrants", "Bargaining Power of Buyers", "Competitive Rivalry", "Threat of Substitutes"], 0, "Barriers to entry determine the Threat of New Entrants."),
                    ("What does Return on Invested Capital (ROIC) measure in a strategy simulation?", ["How efficiently a company allocates capital to generate profitable returns", "Gross headcount growth year-over-year", "Total marketing spend divided by revenue", "Short-term cash balance"], 0, "ROIC measures profitability relative to total capital invested."),
                    ("A Blue Ocean strategy focuses on:", ["Creating uncontested market space and new demand", "Engaging in price wars in saturated markets", "Reducing product quality to cut unit cost", "Copying competitor pricing tables"], 0, "Blue Ocean strategy combines differentiation and low cost to open new market space."),
                    ("Leading indicators in a Balanced Scorecard are:", ["Predictive performance drivers that influence future outcomes", "Historical financial results from prior fiscal years", "External tax audit findings", "Fixed depreciation schedules"], 0, "Leading indicators measure operational drivers of future strategic outcomes."),
                ],
            ),
            (
                "Innovation through Design Thinking & Prototyping",
                "design thinking",
                [
                    ("What is the very first stage of the 5-stage Design Thinking process?", ["Empathize", "Prototype", "Test", "Define"], 0, "Design Thinking begins with deep user empathy."),
                    ("Why are low-fidelity prototypes built early in the ideation cycle?", ["To test assumptions rapidly and cheaply before committing engineering resources", "To serve as final production code", "To bypass user testing completely", "To finalize graphic design typography"], 0, "Low-fidelity prototypes invite honest feedback and rapid iteration."),
                    ("A 'How Might We' (HMW) statement is used to:", ["Frame user problems as open-ended opportunities for ideation", "Assign blame for legacy system bugs", "Document database schema constraints", "Calculate project NPV"], 0, "HMW statements launch structured brainstorming during the Ideate phase."),
                    ("During the Test phase of Design Thinking, teams should:", ["Observe how users interact with the prototype without defending the design", "Argue with users who misunderstand the interface", "Only test with internal developers", "Skip testing if executives like the mockup"], 0, "Unbiased observation reveals genuine usability gaps."),
                ],
            ),
        ]

        created_quizzes = []
        for q_title, kw, q_items in quiz_catalog:
            matched_sess = next(
                (s_obj for _, s_obj, _, _, _ in pilot_sessions if kw in s_obj.course_name.lower()),
                pilot_sessions[0][1],
            )
            qz = Quiz(
                id=str(uuid.uuid4()),
                course_id=matched_sess.course_id,
                title=q_title,
                version_no=1,
                available_until=now_utc + timedelta(days=60),
                is_closed=False,
                is_approved=True,
                approved_by_user_id=u_joey.id,
                approved_at=now_utc - timedelta(days=30),
                created_by_user_id=u_jordan.id,
            )
            db.add(qz)
            db.flush()

            for q_text, opts, c_ans, exp in q_items:
                qq = QuizQuestion(
                    id=str(uuid.uuid4()),
                    quiz_id=qz.id,
                    question_text=q_text,
                    options=opts,
                    correct_answer=c_ans,
                    explanation=exp,
                    points=25,
                )
                db.add(qq)
                db.flush()
                db.add(QuizAnswerKey(
                    question_id=qq.id,
                    correct_answer=c_ans,
                    explanation=exp,
                ))
            created_quizzes.append((qz, matched_sess))

        for idx, (trn, _, _) in enumerate(all_trainees[:48]):
            for q_offset in range(2):
                qz, _ = created_quizzes[(idx + q_offset) % len(created_quizzes)]
                score_pct = [100.0, 75.0, 100.0, 75.0, 50.0][(idx + q_offset) % 5]
                db.add(QuizAttempt(
                    id=str(uuid.uuid4()),
                    quiz_id=qz.id,
                    trainee_id=trn.id,
                    quiz_version=1,
                    submitted_offline=False,
                    score=score_pct,
                    total_points=int(score_pct),
                    is_scored=True,
                    submitted_at=now_utc - timedelta(days=(idx % 25) + 1),
                ))

        team_names = [
            "Alpha Vanguard", "Red Oak Innovators", "IPRoyal Cyber Sentinels",
            "Amihan Cloud Architects", "EastWest Risk Guardians", "Security Bank Defenders",
            "Xinyx Silicon Pioneers", "URC Agile Champions",
        ]
        for t_idx, t_name in enumerate(team_names):
            _, s_obj, _, _, _ = pilot_sessions[t_idx % len(pilot_sessions)]
            tm = Team(
                id=str(uuid.uuid4()),
                session_id=s_obj.id,
                team_name=t_name,
                created_by_user_id=u_jordan.id,
            )
            db.add(tm)
            db.flush()
            for m_offset in range(5):
                trn, _, _ = all_trainees[(t_idx * 5 + m_offset) % len(all_trainees)]
                db.add(TeamMember(team_id=tm.id, trainee_id=trn.id))

        for r_spec in DEFAULT_RULES:
            db.add(AnomalyRule(
                id=str(uuid.uuid4()),
                rule_code=r_spec["rule_code"],
                parameters=r_spec["parameters"],
                version_no=1,
                client_reviewed=True,
                last_edited_by_user_id=None,
                description=r_spec["description"],
            ))

        log_entries = [
            AccessLog(
                id=str(uuid.uuid4()),
                occurred_at=now_utc - timedelta(hours=18),
                actor_user_id=u_erika.id,
                actor_role="account_manager",
                event_type="ACCESS_DENIED",
                resource_type="RECORD",
                resource_id="rec-pilot-002",
                company_id=company_by_code["IPROY_SERVI"].id,
                outcome="DENIED",
                reason_code="OUT_OF_SCOPE",
                source_ip="203.177.84.12",
                details={"requested_company": "IPROY_SERVI", "assigned_companies": erika_codes},
            ),
            AccessLog(
                id=str(uuid.uuid4()),
                occurred_at=now_utc - timedelta(hours=14),
                actor_user_id=u_sharon.id,
                actor_role="account_manager",
                event_type="ACCESS_DENIED",
                resource_type="REPORT",
                resource_id="REPORT:VHL",
                company_id=company_by_code["VHL"].id,
                outcome="DENIED",
                reason_code="OUT_OF_SCOPE",
                source_ip="203.177.84.19",
                details={"target_company": "VHL", "reason": "Repeated out-of-scope report request (3 in 15 min)"},
            ),
            AccessLog(
                id=str(uuid.uuid4()),
                occurred_at=now_utc - timedelta(hours=10),
                actor_user_id=u_brian.id,
                actor_role="account_manager",
                event_type="ACCESS_ALLOWED",
                resource_type="RECORD",
                resource_id="rec-pilot-002",
                company_id=company_by_code["IPROY_SERVI"].id,
                outcome="SUCCESS",
                source_ip="203.177.84.45",
                details={"mode": "DECRYPT", "distinct_views_15m": 28},
            ),
            AccessLog(
                id=str(uuid.uuid4()),
                occurred_at=now_utc - timedelta(hours=6),
                actor_user_id=u_joey.id,
                actor_role="admin",
                event_type="REPORT_GENERATED",
                resource_type="REPORT",
                resource_id="REPORT:ROP",
                company_id=company_by_code["ROP"].id,
                outcome="SUCCESS",
                source_ip="192.168.10.5",
                details={"company_code": "ROP", "report_burst_count": 6},
            ),
            AccessLog(
                id=str(uuid.uuid4()),
                occurred_at=now_utc - timedelta(hours=4),
                actor_user_id=u_joey.id,
                actor_role="admin",
                event_type="RECORD_DELETE",
                resource_type="RECORD",
                resource_id="rec-pilot-010",
                company_id=company_by_code["ROP"].id,
                outcome="SUCCESS",
                source_ip="192.168.10.5",
                details={"action": "SOFT_DELETE_TEST_RESTORED", "course_name": "Supervisory Upskilling Program for Excellent"},
            ),
            AccessLog(
                id=str(uuid.uuid4()),
                occurred_at=now_utc - timedelta(hours=2),
                actor_user_id=u_jordan.id,
                actor_role="trainer",
                event_type="TRAINER_SIGN_OFF",
                resource_type="SESSION",
                resource_id=pilot_sessions[0][1].id,
                company_id=company_by_code["VHL"].id,
                outcome="SUCCESS",
                source_ip="192.168.10.22",
                details={"session_code": pilot_sessions[0][1].session_code, "certificates_issued": 1},
            ),
        ]
        db.add_all(log_entries)
        db.flush()

        alerts_spec = [
            AnomalyAlert(
                id=str(uuid.uuid4()),
                subject_user_id=u_erika.id,
                rule_code="R1_OUT_OF_SCOPE",
                severity_base="LOW",
                severity_final="LOW",
                severity="LOW",
                after_hours_tag=False,
                status="NEW",
                description="Account Manager Erika Bana attempted out-of-scope access on IPRoyal Services (IPROY_SERVI).",
                event_count=1,
                tags=["SCOPE_VIOLATION"],
                metadata_info={"target_company": "IPROY_SERVI", "resource_id": "rec-pilot-002"},
                created_at=now_utc - timedelta(hours=18),
            ),
            AnomalyAlert(
                id=str(uuid.uuid4()),
                subject_user_id=u_sharon.id,
                rule_code="R1_REPEATED_OUT_OF_SCOPE",
                severity_base="MEDIUM",
                severity_final="HIGH",
                severity="HIGH",
                after_hours_tag=True,
                status="NEW",
                description="3 repeated out-of-scope client report attempts by Sharon De Vera within 15 minutes outside business hours (+1 severity via S1).",
                event_count=3,
                tags=["SCOPE_VIOLATION", "after_hours"],
                metadata_info={"target_company": "VHL", "window_minutes": 15, "attempts": 3},
                created_at=now_utc - timedelta(hours=14),
            ),
            AnomalyAlert(
                id=str(uuid.uuid4()),
                subject_user_id=u_brian.id,
                rule_code="R3_HIGH_RECORD_ACCESS",
                severity_base="MEDIUM",
                severity_final="MEDIUM",
                severity="MEDIUM",
                after_hours_tag=False,
                status="UNDER_REVIEW",
                reviewed_by_user_id=u_len.id,
                reviewed_at=now_utc - timedelta(hours=8),
                review_note="Reviewing bulk portfolio audit across IPRoyal and Xinyx Semiconductor cohorts.",
                description="Account Manager Brian Mendoza accessed 28 distinct encrypted training records in 12 minutes (threshold: 25).",
                event_count=28,
                tags=["HIGH_VOLUME_READ"],
                metadata_info={"distinct_records_viewed": 28, "threshold": 25, "window_minutes": 15},
                created_at=now_utc - timedelta(hours=10),
            ),
            AnomalyAlert(
                id=str(uuid.uuid4()),
                subject_user_id=u_joey.id,
                rule_code="R3_REPORT_BURSTS",
                severity_base="MEDIUM",
                severity_final="MEDIUM",
                severity="MEDIUM",
                after_hours_tag=False,
                status="NEW",
                description="Administrator Joselito 'Joey' Mallari Jr. generated 6 client compliance reports within 40 minutes (threshold: 5). Requires peer review by Len Mallari (OI-30).",
                event_count=6,
                tags=["REPORT_BURST", "PEER_REVIEW_REQUIRED"],
                metadata_info={"report_count": 6, "threshold": 5, "window_minutes": 60},
                created_at=now_utc - timedelta(hours=6),
            ),
            AnomalyAlert(
                id=str(uuid.uuid4()),
                subject_user_id=u_joey.id,
                rule_code="R4_RECORD_DELETION",
                severity_base="HIGH",
                severity_final="HIGH",
                severity="HIGH",
                after_hours_tag=False,
                status="CLOSED",
                disposition="CLOSED_EXPECTED_ACTIVITY",
                reviewed_by_user_id=u_len.id,
                reviewed_at=now_utc - timedelta(hours=3),
                review_note="Verified authorized administrative soft-delete test and immediate record restoration during pre-deployment audit.",
                description="Client training record rec-pilot-010 was soft-deleted by Administrator Joselito 'Joey' Mallari Jr. (Rule R4-a immediate High alert).",
                event_count=1,
                tags=["SOFT_DELETE", "HIGH_PRIORITY"],
                metadata_info={"record_id": "rec-pilot-010", "company_code": "ROP"},
                created_at=now_utc - timedelta(hours=4),
            ),
            AnomalyAlert(
                id=str(uuid.uuid4()),
                subject_user_id=u_jordan.id,
                rule_code="R4_RECORD_EDIT",
                severity_base="LOW",
                severity_final="MEDIUM",
                severity="MEDIUM",
                after_hours_tag=True,
                status="AWAITING_UNINVOLVED_ADMIN",
                description="After-hours record modification flagged for independent co-administrator review following recusal (OI-30).",
                event_count=1,
                tags=["after_hours", "RECUSAL_FILED"],
                metadata_info={"involved_admin_ids": [u_joey.id]},
                review_note="Recused by Joey Mallari due to co-instruction on session; escalated to Len Mallari.",
                created_at=now_utc - timedelta(hours=2),
            ),
            AnomalyAlert(
                id=str(uuid.uuid4()),
                subject_user_id=trainee_by_email["ricardo.ocampo@iproyal.com"][1].id,
                rule_code="R2_FAILED_LOGINS_ACCOUNT",
                severity_base="MEDIUM",
                severity_final="MEDIUM",
                severity="MEDIUM",
                after_hours_tag=False,
                status="CLOSED",
                disposition="CLOSED_EXPECTED_ACTIVITY",
                reviewed_by_user_id=u_joey.id,
                reviewed_at=now_utc - timedelta(days=1),
                review_note="Trainee mistyped password before resetting credentials; verified legitimate login afterward.",
                description="5 consecutive failed login attempts detected for account 'ricardo.ocampo@iproyal.com' within 10 minutes.",
                event_count=5,
                tags=["AUTH_THRESHOLD"],
                metadata_info={"username": "ricardo.ocampo@iproyal.com", "failures": 5, "threshold": 5},
                created_at=now_utc - timedelta(days=1, hours=2),
            ),
            AnomalyAlert(
                id=str(uuid.uuid4()),
                subject_user_id=u_fin.id,
                rule_code="R4_BULK_EDIT",
                severity_base="MEDIUM",
                severity_final="MEDIUM",
                severity="MEDIUM",
                after_hours_tag=False,
                status="CLOSED",
                disposition="CLOSED_EXPECTED_ACTIVITY",
                reviewed_by_user_id=u_len.id,
                reviewed_at=now_utc - timedelta(days=2),
                review_note="Confirmed scheduled billing & completion reconciliation batch update.",
                description="Finance specialist Elena Santos updated 11 non-import training records within 15 minutes (threshold: 10).",
                event_count=11,
                tags=["BULK_EDIT"],
                metadata_info={"distinct_records_edited": 11, "threshold": 10, "window_minutes": 15},
                created_at=now_utc - timedelta(days=2, hours=3),
            ),
        ]
        db.add_all(alerts_spec)
        db.flush()

        for idx_l in range(min(len(log_entries), len(alerts_spec))):
            db.add(AlertEvent(
                alert_id=alerts_spec[idx_l].id,
                log_id=log_entries[idx_l].id,
                linked_at=alerts_spec[idx_l].created_at,
            ))

        db.add(ReencryptionJob(
            id=str(uuid.uuid4()),
            company_code="VHL",
            old_version=1,
            new_version=1,
            batch_size=50,
            total_records=6,
            processed_records=6,
            status="COMPLETED",
            initiated_by_user_id=u_joey.id,
            created_at=now_utc - timedelta(days=5),
            completed_at=now_utc - timedelta(days=5) + timedelta(seconds=4),
        ))

        db.flush()

        # Verify live CP-ABE decryption on rec-pilot-001 using Joey Mallari's envelope-wrapped key
        sample_rec = db.query(TrainingRecord).filter(TrainingRecord.id == "rec-pilot-001").first()
        sample_trn = db.query(Trainee).filter(Trainee.id == sample_rec.trainee_id).first()
        joey_key_row = db.query(UserAbeKey).filter(UserAbeKey.user_id == u_joey.id, UserAbeKey.status == "active").first()
        unwrapped_json = AttributeManager.envelope_decrypt_key(
            joey_key_row.wrapped_dek, joey_key_row.nonce, joey_key_row.key_ciphertext, joey_key_row.kms_key_arn
        )
        decrypted_payload = cpabe_engine.decrypt_record(
            {
                "policy": sample_rec.encryption_policy,
                "policy_version": sample_rec.policy_version,
                "abe_ciphertext": sample_rec.abe_ciphertext,
                "payload_ciphertext": sample_rec.payload_ciphertext,
                "nonce": sample_rec.nonce,
                "engine": "charm-bsw07",
            },
            json.loads(unwrapped_json),
            record_id=f"rec-{sample_trn.trainee_code}",
            version=sample_rec.policy_version,
        )
        if not decrypted_payload or "score" not in decrypted_payload:
            raise RuntimeError("CP-ABE verification check failed on rec-pilot-001!")

        summary = {
            "client_companies": db.query(ClientCompany).count(),
            "users_total": db.query(User).count(),
            "trainees_total": db.query(Trainee).count(),
            "orphan_trainees": db.query(Trainee).filter(Trainee.user_id == None).count(),
            "courses": db.query(Course).count(),
            "training_sessions": db.query(TrainingSession).count(),
            "training_records": db.query(TrainingRecord).count(),
            "training_record_versions": db.query(TrainingRecordVersion).count(),
            "certificates": db.query(Certificate).count(),
            "notifications": db.query(Notification).count(),
            "quizzes": db.query(Quiz).count(),
            "quiz_questions": db.query(QuizQuestion).count(),
            "quiz_answer_keys": db.query(QuizAnswerKey).count(),
            "quiz_attempts": db.query(QuizAttempt).count(),
            "teams": db.query(Team).count(),
            "team_members": db.query(TeamMember).count(),
            "gamification_progress": db.query(GamificationProgress).count(),
            "anomaly_rules": db.query(AnomalyRule).count(),
            "anomaly_alerts": db.query(AnomalyAlert).count(),
            "access_logs": db.query(AccessLog).count(),
            "import_staging_rows": db.query(ImportStagingRow).count(),
            "import_discrepancies": db.query(ImportDiscrepancy).count(),
            "user_abe_keys": db.query(UserAbeKey).filter(UserAbeKey.status == "active").count(),
        }

        db.commit()

        if apply_changes and is_pg:
            print("Applying PostgreSQL RLS policies (001-006) & peer-review trigger...")
            init_db_rls(eng)
            mig_006 = BACKEND_ROOT / "migrations" / "006_acctmgr_view_trainer_assignments.sql"
            with eng.begin() as conn:
                if mig_006.exists():
                    conn.execute(text(mig_006.read_text(encoding="utf-8")))
                conn.execute(
                    text(
                        "INSERT INTO internal_security.context_secret (id, secret_key) "
                        "VALUES (1, :sec) ON CONFLICT (id) DO UPDATE SET secret_key = EXCLUDED.secret_key;"
                    ),
                    {"sec": settings.CONTEXT_SIGNING_SECRET},
                )
            with eng.connect() as conn:
                summary["pg_foreign_keys"] = conn.execute(text("SELECT count(*) FROM pg_constraint WHERE contype='f'")).scalar()
                summary["pg_policies"] = conn.execute(text("SELECT count(*) FROM pg_policies")).scalar()
                summary["peer_review_trigger"] = conn.execute(text("SELECT count(*) FROM pg_trigger WHERE tgname='trg_anomaly_alert_peer_review_guard'")).scalar()

        print("\n" + "=" * 76)
        print("DATABASE BUILD SUMMARY & INTEGRITY CHECK")
        print("=" * 76)
        for k, v in summary.items():
            print(f"  {k:28s}: {v}")
        print(f"  {'cpabe_live_decrypt_check':28s}: PASS (rec-pilot-001 -> score={decrypted_payload.get('score')})")
        print("=" * 76)
        if not apply_changes:
            print(">>> DRY RUN COMPLETE (tested in /tmp/crossquest_dryrun_check.db). Re-run with --apply to rebuild PostgreSQL.")
        else:
            print(">>> SUCCESS: Clean Pilot + Defense Demo Database is live!")

    finally:
        db.close()
        if not apply_changes and os.path.exists("/tmp/crossquest_dryrun_check.db"):
            os.remove("/tmp/crossquest_dryrun_check.db")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build CrossQuest Pilot + Defense Demo Database")
    parser.add_argument("--apply", action="store_true", help="Commit changes to target PostgreSQL database")
    parser.add_argument("--db-url", type=str, default=None, help="Override target database URL")
    args = parser.parse_args()

    url = (
        args.db_url
        or os.getenv("ADMIN_DATABASE_URL")
        or getattr(settings, "ADMIN_DATABASE_URL", None)
        or os.getenv("DATABASE_URL")
        or getattr(settings, "DATABASE_URL", "sqlite:///./crossquest_defense_test.db")
    )
    build_database(url, apply_changes=args.apply)