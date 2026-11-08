"""CrossQuest Pilot Data ETL Pipeline & Seeder.

Ingests the 3 real-world Crossworks pilot Excel spreadsheets:
1. c:\\Users\\Asus\\Downloads\\Sample Data.xlsx (or Sample Data_1.xlsx)
   - Sheet 1: 47 Training Sessions (Dates, Programs, Delivery, Sales, Customer, Pax)
   - Sheet 2: 31 Programs, Trainers, Delivery Formats, Sales Reps
2. c:\\Users\\Asus\\Downloads\\Training_Participants.xlsx
   - 150 Real Corporate Participants, Emails, Companies, Training Programs

Builds and seeds a dedicated pilot database:
- 41 Client Companies (Tenants)
- User Accounts: Admins, Sales AMs, Trainers, Company Staff, 150 Trainees
- 31 Courses & 47 Scheduled Training Sessions
- Curriculum Quizzes with Questions & Answer Keys (SEC-26)
- CP-ABE Encrypted Training Records & Certificates (36-month validity per FR-18)
"""

import os
import sys
import re
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
import openpyxl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend directory is in sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.models.entities import (
    Base, User, ClientCompany, Course, TrainingSession, Trainee,
    AccountManagerAssignment, TrainerAssignment, TraineeAffiliation,
    Quiz, QuizQuestion, QuizAnswerKey, QuizAttempt, GamificationProgress,
    TrainingRecord, Certificate, Notification, AccessLog
)
from app.core.security import get_password_hash
from app.crypto.cpabe_engine import cpabe_engine


# Helper function to generate safe uppercase company code
def generate_company_code(name: str) -> str:
    cleaned = re.sub(r'\(SI\s*#\s*\d+\)', '', name, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(.*?\)', '', cleaned).strip()
    # Remove punctuation
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', cleaned)
    words = cleaned.split()
    if not words:
        return f"CORP_{uuid.uuid4().hex[:6].upper()}"
    if len(words) == 1:
        return words[0][:10].upper()
    # Acronym or condensed
    if len(words) <= 3:
        return "_".join(w[:6].upper() for w in words)
    # 4+ words: take first 3 significant words or acronym
    first_letters = "".join(w[0].upper() for w in words if w.lower() not in ('inc', 'corp', 'fze', 'llc', 'ltd', 'pte', 'the', 'of', 'and'))
    if len(first_letters) >= 3:
        return first_letters[:8]
    return f"{words[0][:5].upper()}_{words[1][:5].upper()}"


def clean_company_name(name: str) -> str:
    if not name:
        return "Crossworks Enterprise Client"
    n = str(name).strip()
    n = re.sub(r'\(SI\s*#\s*\d+\)', '', n, flags=re.IGNORECASE)
    n = re.sub(r'\s+', ' ', n)
    return n.strip()


def seed_pilot(db_url: str = "sqlite:///./crossquest_pilot.db"):
    print("=" * 70)
    print("🚀 CROSSQUEST PILOT DATA ETL INGESTION PIPELINE")
    print(f"Target Database: {db_url}")
    print("=" * 70)

    # 1. Initialize SQLite / PostgreSQL Database
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(db_url, connect_args=connect_args)
    print("Creating all database tables from entities schema...")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()

    # Default password hash for all demo/pilot accounts: "password123"
    default_pwd = get_password_hash("password123")
    today = datetime.now(timezone.utc).date()
    now_dt = datetime.now(timezone.utc)

    # 2. System Administrators
    print("\n[1/7] Provisioning Administrator Accounts...")
    u_admin1 = User(
        email="joey.mallari@xworks.ph",
        username="joey_mallari",
        full_name="Joselito 'Joey' Mallari Jr.",
        hashed_password=default_pwd,
        role="admin",
        clearance_level=3,
        assigned_client_accounts=["*"],
        is_superuser=True
    )
    u_admin2 = User(
        email="info@crossworks.ph",
        username="admin_general",
        full_name="Crossworks Administration",
        hashed_password=default_pwd,
        role="admin",
        clearance_level=3,
        assigned_client_accounts=["*"],
        is_superuser=True
    )
    db.add_all([u_admin1, u_admin2])
    db.commit()

    # 3. Account Managers (Sales Reps from Pilot Spreadsheet)
    print("\n[2/7] Provisioning Real Account Managers (Sales Reps)...")
    am_data = [
        ("sharon@crossworks.ph", "am_sharon", "Sharon De Vera", "Senior Corporate Account Manager"),
        ("brian@crossworks.ph", "am_brian", "Brian Mendoza", "Enterprise Solutions Manager"),
        ("quel@crossworks.ph", "am_quel", "Raquel 'Quel' Santos", "Strategic Partnerships Manager"),
        ("joey.sales@crossworks.ph", "am_joey", "Joey Ramos (Sales)", "Commercial Accounts Executive"),
        ("cez@crossworks.ph", "am_cez", "Cezanne 'Cez' Garcia", "Client Success Manager")
    ]
    am_users = {}
    for email, uname, fname, title in am_data:
        u_am = User(
            email=email,
            username=uname,
            full_name=fname,
            hashed_password=default_pwd,
            role="account_manager",
            clearance_level=2,
            assigned_client_accounts=[]
        )
        db.add(u_am)
        db.flush()
        am_users[fname.split()[0].lower().replace("'", "")] = u_am

    # 4. Lead Trainers (from Sheet 2)
    print("\n[3/7] Provisioning Real Lead Trainers...")
    trainer_data = [
        ("joey.trainer@crossworks.ph", "trainer_joey", "Joey Ramos", "Lead Trainer: Agile PME & Leadership"),
        ("billy@crossworks.ph", "trainer_billy", "Billy Fernandez", "Lead Trainer: CONNECT & Executive Comm"),
        ("jobert@crossworks.ph", "trainer_jobert", "Jobert Cruz", "Lead Trainer: High-Impact Coaching"),
        ("owen@crossworks.ph", "trainer_owen", "Owen Castillo", "Lead Trainer: Business Continuity (BCM)")
    ]
    trainer_users = {}
    for email, uname, fname, title in trainer_data:
        u_tr = User(
            email=email,
            username=uname,
            full_name=fname,
            hashed_password=default_pwd,
            role="trainer",
            clearance_level=2,
            assigned_client_accounts=[]
        )
        db.add(u_tr)
        db.flush()
        trainer_users[fname.split()[0].lower()] = u_tr

    # 5. Ingest Pilot Excel Spreadsheets
    sample_file_1 = r"c:\Users\Asus\Downloads\Sample Data.xlsx"
    if not os.path.exists(sample_file_1):
        sample_file_1 = r"c:\Users\Asus\Downloads\Sample Data_1.xlsx"
    participants_file = r"c:\Users\Asus\Downloads\Training_Participants.xlsx"

    print(f"\n[4/7] Ingesting Spreadsheets:\n - {sample_file_1}\n - {participants_file}")
    wb_sample = openpyxl.load_workbook(sample_file_1, data_only=True)
    wb_part = openpyxl.load_workbook(participants_file, data_only=True)

    # Ingest Companies
    ws_part = wb_part['Participants']
    ws1 = wb_sample['Sheet1']
    ws2 = wb_sample['Sheet2']

    companies_raw = set()
    for r in range(2, ws_part.max_row + 1):
        c = ws_part.cell(r, 3).value
        if c:
            companies_raw.add(str(c).strip())
    for r in range(2, ws1.max_row + 1):
        c = ws1.cell(r, 7).value
        if c:
            companies_raw.add(str(c).strip())

    print(f"Discovered {len(companies_raw)} unique customer companies. Seeding tenants...")
    company_models = {}
    company_codes_set = set()

    # Industry classifier helper
    def infer_industry(name: str) -> str:
        nl = name.lower()
        if any(k in nl for k in ("energy", "acen", "renewables", "lpg", "isla", "hvac")):
            return "Energy & Utilities"
        if any(k in nl for k in ("insurance", "life", "east west", "bank", "financial", "credit")):
            return "Financial Services & Insurance"
        if any(k in nl for k in ("tech", "software", "solutions", "fze", "cloud", "digital", "amihan", "vertiv")):
            return "Technology & Software"
        if any(k in nl for k in ("hospital", "doctors", "boehringer", "pharma", "health", "medical")):
            return "Healthcare & Pharmaceuticals"
        if any(k in nl for k in ("land", "properties", "realty", "estate", "oak", "ayala")):
            return "Real Estate & Construction"
        if any(k in nl for k in ("robina", "urc", "foods", "beverage", "retail", "store")):
            return "Consumer Goods & Retail"
        return "Corporate Enterprise"

    for raw_name in sorted(companies_raw):
        clean_name = clean_company_name(raw_name)
        base_code = generate_company_code(clean_name)
        code = base_code
        counter = 2
        while code in company_codes_set:
            code = f"{base_code}_{counter}"
            counter += 1
        company_codes_set.add(code)

        cc = ClientCompany(
            code=code,
            name=clean_name,
            client_type="ENTERPRISE" if any(k in clean_name.lower() for k in ("holdings", "corp", "inc", "ltd", "corporation")) else "SME",
            industry=infer_industry(clean_name)
        )
        db.add(cc)
        db.flush()
        company_models[clean_name.lower()] = cc
        company_models[raw_name.lower()] = cc

    # Also map sales AM to companies
    for r in range(2, ws1.max_row + 1):
        cust = ws1.cell(r, 7).value
        sales_rep = ws1.cell(r, 6).value
        if cust and sales_rep:
            c_model = company_models.get(clean_company_name(cust).lower()) or company_models.get(str(cust).lower())
            am_model = am_users.get(str(sales_rep).strip().lower())
            if c_model and am_model:
                if c_model.code not in (am_model.assigned_client_accounts or []):
                    current_list = list(am_model.assigned_client_accounts or [])
                    current_list.append(c_model.code)
                    am_model.assigned_client_accounts = current_list
                    db.add(AccountManagerAssignment(
                        user_id=am_model.id,
                        company_id=c_model.id,
                        assigned_by=u_admin1.id
                    ))

    # Provision representative Company Staff accounts for top enterprise accounts
    top_company_domains = [
        ("Vertiv", "staff@vertiv.com", "Elena Vance (Vertiv HR)"),
        ("East West Ageas Life Insurance", "staff@ewageas.com", "Maricar Ramos (EW Ageas Training)"),
        ("Amihan Solutions", "staff@amihansolutions.com", "Kenneth Sy (Amihan HR Manager)"),
        ("IPRoyal Services", "staff@iproyal.com", "Dmitri Volkov (IPRoyal Ops)"),
        ("Red Oak Properties", "staff@redoak.com", "Patricia Tan (Red Oak L&D)")
    ]
    for c_query, s_email, s_name in top_company_domains:
        target_co = None
        for k, v in company_models.items():
            if c_query.lower() in k:
                target_co = v
                break
        if target_co:
            u_staff = User(
                email=s_email,
                username=f"{s_email.split('@')[1].split('.')[0]}_staff",
                full_name=s_name,
                hashed_password=default_pwd,
                role="company_staff",
                clearance_level=2,
                assigned_client_accounts=[target_co.code]
            )
            db.add(u_staff)

    db.commit()

    # 6. Ingest Courses (31 Programs from Sheet 2)
    print("\n[5/7] Provisioning 31 Official Courses & 47 Scheduled Training Sessions...")
    course_models = {}
    for r in range(2, ws2.max_row + 1):
        vals = [ws2.cell(r, c).value for c in range(1, 9)]
        if any(vals) and vals[0]:
            p_name = str(vals[0]).strip()
            # Generate clean 3-4 letter acronym
            words = [w for w in p_name.split() if w.lower() not in ('in', 'for', 'and', 'the', 'of', 'to')]
            acronym = "".join(w[0].upper() for w in words)[:4] if len(words) >= 2 else p_name[:3].upper()
            code = f"CRS-{acronym}-{uuid.uuid4().hex[:4].upper()}"

            course = Course(
                course_code=code,
                name=p_name,
                description=f"Professional development curriculum: {p_name}. Aligned with Crossworks industry standards.",
                acronym_3=acronym[:3]
            )
            db.add(course)
            db.flush()
            course_models[p_name.lower()] = course

    # Ingest 47 Sessions from Sheet 1
    session_models = []
    for r in range(2, ws1.max_row + 1):
        vals = [ws1.cell(r, c).value for c in range(1, 9)]
        if any(vals) and vals[1]:
            dt, prog, tla, t_type, deliv, sales, cust, pax = vals
            prog_name = str(prog).strip()
            course = course_models.get(prog_name.lower())
            if not course:
                # create on the fly if not in sheet 2
                course = Course(
                    course_code=f"CRS-{tla or 'TRN'}-{uuid.uuid4().hex[:4].upper()}",
                    name=prog_name,
                    description=f"Custom enterprise module: {prog_name}",
                    acronym_3=(tla or 'TRN')[:3]
                )
                db.add(course)
                db.flush()
                course_models[prog_name.lower()] = course

            s_date = dt if isinstance(dt, datetime) else datetime(2026, 8, 15)
            e_date = s_date + timedelta(days=2)
            assigned_tr = trainer_users.get("joey")
            # match trainer
            if "billy" in prog_name.lower():
                assigned_tr = trainer_users.get("billy")
            elif "continuity" in prog_name.lower():
                assigned_tr = trainer_users.get("owen")
            elif "coaching" in prog_name.lower():
                assigned_tr = trainer_users.get("jobert")

            sess = TrainingSession(
                session_code=f"SESS-2026-{(tla or 'TRN')[:3]}-{r:02d}",
                course_id=course.id,
                course_name=course.name,
                start_date=s_date,
                end_date=e_date,
                delivery_type=str(t_type or 'Public'),
                delivery_mode=str(deliv or 'F2F'),
                venue="Crossworks Corporate Training Center, Makati" if deliv == 'F2F' else "CrossQuest Secure Virtual Sandbox Room",
                trainer_signed_off=True,
                trainer_sign_off_at=e_date,
                trainer_sign_off_user_id=assigned_tr.id if assigned_tr else u_admin1.id,
                trainer_sign_off_notes=f"All {pax or 1} participant(s) completed required compliance criteria."
            )
            db.add(sess)
            db.flush()
            session_models.append(sess)

    # 7. Ingest 150 Trainees (Participants)
    print("\n[6/7] Provisioning 150 Real Trainee Accounts from Training_Participants.xlsx...")
    trainee_models = []
    seen_emails = set()
    seen_usernames = set()

    for r in range(2, ws_part.max_row + 1):
        dt = ws_part.cell(r, 1).value
        prog = ws_part.cell(r, 2).value
        cust = ws_part.cell(r, 3).value
        p_name = ws_part.cell(r, 4).value
        p_email = ws_part.cell(r, 5).value

        if not p_name or not p_email:
            continue

        raw_email = str(p_email).strip().lower()
        if raw_email in seen_emails:
            continue
        seen_emails.add(raw_email)

        full_name = str(p_name).strip()
        name_parts = full_name.split()
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "Trainee"

        clean_cust = clean_company_name(cust)
        c_model = company_models.get(clean_cust.lower()) or company_models.get(str(cust).lower())
        if not c_model:
            c_model = list(company_models.values())[0]

        t_code = f"TRN-{8000 + len(trainee_models):04d}"
        raw_slug = raw_email.split('@')[0].replace('.', '_').replace('-', '_')
        base_u = f"trn_{raw_slug}"[:24]
        u_name = base_u
        u_cnt = 2
        while u_name in seen_usernames:
            u_name = f"{base_u}_{u_cnt}"
            u_cnt += 1
        seen_usernames.add(u_name)

        u_trainee = User(
            email=raw_email,
            username=u_name,
            full_name=full_name,
            hashed_password=default_pwd,
            role="trainee",
            clearance_level=1,
            assigned_client_accounts=[c_model.code]
        )
        db.add(u_trainee)
        db.flush()

        trainee = Trainee(
            trainee_code=t_code,
            user_id=u_trainee.id,
            first_name=first_name,
            last_name=last_name,
            email=raw_email,
            display_name=f"{first_name}{t_code[-3:]}",
            phone="+63 9" + "".join([str((r * 7 + i * 3) % 10) for i in range(9)]),
            current_company_id=c_model.id,
            current_streak=3 + (r % 12),
            last_activity_date=today,
            leaderboard_opt_out=False
        )
        db.add(trainee)
        db.flush()

        # Gamification progress
        points = 2500 + (r * 115) % 15000
        lvl = 1 + (points // 3500)
        gam = GamificationProgress(
            trainee_id=trainee.id,
            points=points,
            level=lvl,
            badges=["FIRST_STEP"] + (["SEVEN_DAY_STREAK"] if trainee.current_streak >= 7 else []),
            quizzes_completed=1 + (r % 3),
            streak=trainee.current_streak,
            last_activity_date=today
        )
        db.add(gam)
        trainee_models.append((trainee, u_trainee, c_model, str(prog).strip() if prog else "General Training"))

    # 8. Curriculum Quizzes with Answer Keys & Training Records
    print("\n[7/7] Building Quizzes & CP-ABE Encrypted Training Records...")
    quiz_specs = [
        {
            "title": "Supervisory Upskilling & Leadership Assessment",
            "course_kw": "supervisory",
            "questions": [
                ("What is the primary factor when choosing between delegating vs performing a task directly?", ["Team velocity and individual competency", "Physical proximity to the client", "Time of day the request arrived", "Seniority ranking on the team org chart"], 0, "Delegation requires assessing competency readiness and growth opportunity."),
                ("In the GROW coaching model, what does the 'R' stand for?", ["Remediation", "Reality", "Recognition", "Redirection"], 1, "GROW stands for Goal, Reality, Options, Will/Way Forward."),
                ("Which feedback technique minimizes defensiveness during performance reviews?", ["SBI (Situation, Behavior, Impact)", "Sandwich method with vague praise", "Unannounced escalation to senior VP", "Public peer evaluation polling"], 0, "SBI grounds feedback in concrete observable facts."),
                ("When team conflict escalates to personal friction, what is the first leadership action?", ["Mediate privately to separate personalities from the underlying process blocker", "Immediately terminate both team members", "Ignore the issue until project sprint ends", "Reassign entire project to an external contractor"], 0, "Leaders must address interpersonal friction constructively and privately.")
            ]
        },
        {
            "title": "Agile PME Sprint Execution & Ceremonies",
            "course_kw": "agile",
            "questions": [
                ("What is the primary objective of the Daily Standup ceremony?", ["Synchronize team progress and identify delivery blockers", "Detailed line-by-line code review with architecture lead", "Formal status report delivered to executive sponsors", "Performance grading of individual engineers"], 0, "The standup is a 15-minute sync on yesterday, today, and blockers."),
                ("Which metric best indicates team consistency across multiple iterations?", ["Velocity predictability", "Number of pull requests declined", "Gross lines of documentation authored", "Overtime hours billed per sprint"], 0, "Velocity predictability measures reliable sprint commitments."),
                ("What defines the 'Definition of Done' (DoD)?", ["Shared criteria that every backlog item must satisfy before being considered complete", "A verbal agreement between developer and tester", "The date set by the client contract", "The conclusion of the fiscal quarter"], 0, "DoD ensures standard quality and testing completeness across all stories."),
                ("During a Sprint Retrospective, the team focuses on:", ["Continuous process improvement and actionable adjustments", "Assigning personal blame for missed sprint goals", "Presenting sales forecasts to commercial clients", "Renegotiating developer hourly billing rates"], 0, "Retrospectives focus on inspection and adaptation.")
            ]
        },
        {
            "title": "ISO 31000 Certified Risk Management Framework",
            "course_kw": "31000",
            "questions": [
                ("In ISO 31000, risk is formally defined as:", ["The effect of uncertainty on objectives", "A catastrophic monetary loss", "An unexpected network intrusion", "A hardware failure in production"], 0, "ISO 31000 defines risk as the effect of uncertainty on objectives."),
                ("What are the two axes of a standard qualitative risk matrix?", ["Likelihood (Probability) and Impact (Consequence)", "Cost and Duration", "CPU Usage and Memory Latency", "Headcount and Seniority"], 0, "Risk severity is calculated as Likelihood x Impact."),
                ("Residual risk represents:", ["The risk remaining after risk treatment controls have been applied", "The initial unmitigated risk before any review", "Risks that cannot be calculated mathematically", "Risks covered by insurance policies"], 0, "Residual risk is the remaining exposure following control implementation."),
                ("Which risk treatment strategy involves shifting liability to a third party?", ["Risk Sharing (Transfer)", "Risk Avoidance", "Risk Retention", "Risk Elimination"], 0, "Insurance and third-party warranties are examples of risk sharing.")
            ]
        },
        {
            "title": "Business Continuity & Crisis Management Essentials",
            "course_kw": "continuity",
            "questions": [
                ("What does Recovery Time Objective (RTO) dictate?", ["The acceptable duration of time an application can remain offline before catastrophic impact", "The maximum allowable data loss measured in hours of transactions", "The total budget allocated for crisis insurance", "The response time for customer support tickets"], 0, "RTO sets the maximum allowable downtime."),
                ("What does Recovery Point Objective (RPO) measure?", ["The acceptable age of files/data that must be recovered from backup", "The time required to assemble crisis team members", "The monetary value of lost physical equipment", "The percentage of employees enrolled in evacuation drills"], 0, "RPO dictates data freshness and maximum transaction loss."),
                ("The initial phase of a Business Continuity Plan (BCP) is:", ["Business Impact Analysis (BIA)", "Purchasing disaster recovery data centers", "Immediate full-scale building evacuation", "Publishing press releases to commercial news outlets"], 0, "BIA identifies critical organizational processes and dependencies."),
                ("A tabletop exercise is designed to:", ["Walk through crisis scenarios in a conference room without operational disruption", "Simulate live data corruption in production databases", "Physically sever primary fiber optic cables", "Test fire suppression sprinkler systems"], 0, "Tabletop exercises validate procedures through discussion without production risk.")
            ]
        }
    ]

    for q_spec in quiz_specs:
        target_sess = None
        for s in session_models:
            if q_spec["course_kw"] in s.course_name.lower():
                target_sess = s
                break
        if not target_sess:
            target_sess = session_models[0]

        quiz = Quiz(
            session_id=target_sess.id,
            title=q_spec["title"],
            version_no=1,
            is_closed=False,
            created_by_user_id=trainer_users.get("joey", u_admin1).id,
            is_approved=True,
            approved_by_user_id=u_admin1.id,
            approved_at=now_dt
        )
        db.add(quiz)
        db.flush()

        for q_text, opts, c_idx, exp in q_spec["questions"]:
            qq = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q_text,
                options=opts,
                correct_answer=c_idx,
                explanation=exp,
                points=25
            )
            db.add(qq)
            db.flush()

            db.add(QuizAnswerKey(
                question_id=qq.id,
                correct_answer=c_idx,
                explanation=exp
            ))

    # Generate CP-ABE Encrypted Records for each Trainee
    print("Generating CP-ABE hybrid-encrypted training records...")
    records_count = 0
    for idx, (trainee, u_trn, co, prog_name) in enumerate(trainee_models):
        target_sess = None
        for s in session_models:
            if prog_name.lower() in s.course_name.lower():
                target_sess = s
                break
        if not target_sess:
            target_sess = session_models[idx % len(session_models)]

        pol = f"ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENT{co.code}V1) or (ROLETRAINER and TRAINING{target_sess.session_code.replace('-', '')}V1) or TRAINEE{trainee.trainee_code.replace('-', '')}"
        score = 85.0 + (idx * 3.7) % 15.0
        rec_id = f"rec-pilot-{idx + 1:03d}"
        payload = {
            "score": round(score, 1),
            "trainee_name": f"{trainee.first_name} {trainee.last_name}",
            "trainee_email": trainee.email,
            "company": co.name,
            "course": prog_name,
            "session_code": target_sess.session_code,
            "completion_date": str(target_sess.end_date.date() if hasattr(target_sess.end_date, 'date') else target_sess.end_date)
        }
        enc = cpabe_engine.encrypt_record(payload, pol, record_id=rec_id, version=1)

        tr_rec = TrainingRecord(
            id=rec_id,
            trainee_id=trainee.id,
            session_id=target_sess.id,
            company_at_completion_id=co.id,
            course_name=prog_name,
            status="Completed",
            attendance_status="Present",
            completion_date=target_sess.end_date,
            score=round(score, 1),
            encryption_policy=pol,
            policy_version=1,
            abe_ciphertext=enc.get("abe_ciphertext"),
            payload_ciphertext=enc.get("payload_ciphertext"),
            nonce=enc.get("nonce"),
            is_encrypted=True
        )
        db.add(tr_rec)

        # 36-Month Certified Certificate
        serial = f"PILOT-{co.code[:4]}-{2026}-{idx+1:03d}"
        issue_d = target_sess.end_date if isinstance(target_sess.end_date, datetime) else datetime(2026, 8, 15)
        expiry_d = issue_d + timedelta(days=36 * 30)
        cert = Certificate(
            record_id=rec_id,
            trainee_id=trainee.id,
            cert_type_code="COMPLIANCE",
            title=f"Certified Specialist in {prog_name}",
            serial_number=serial,
            issue_date=issue_d,
            expiry_date=expiry_d,
            expiry_basis="Calculated: issue_date + 36 months validity per FR-18",
            status="Valid",
            is_self_reported=False,
            is_nearing_renewal=False
        )
        db.add(cert)
        records_count += 1

    db.commit()

    print("\n" + "=" * 70)
    print("✅ PILOT DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    print(f"📊 Summary of Entities Seeded into {db_url}:")
    print(f" • Client Companies (Tenants): {len(companies_raw)}")
    print(f" • Account Managers:           {len(am_data)}")
    print(f" • Lead Trainers:              {len(trainer_data)}")
    print(f" • Trainee Accounts:           {len(trainee_models)}")
    print(f" • Training Courses:           {len(course_models)}")
    print(f" • Scheduled Sessions:         {len(session_models)}")
    print(f" • Curriculum Quizzes:         {len(quiz_specs)}")
    print(f" • CP-ABE Encrypted Records:   {records_count}")
    print(f" • Certificates Issued:        {records_count}")
    print("=" * 70)


if __name__ == "__main__":
    db_target = sys.argv[1] if len(sys.argv) > 1 else "sqlite:///./crossquest_pilot.db"
    seed_pilot(db_target)
