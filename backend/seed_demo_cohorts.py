"""Idempotent Round 10 defense demo data seeder (statuses, multi-company clients, course quizzes).

Run inside the backend container:
    python seed_demo_cohorts.py --apply
    python seed_demo_cohorts.py --remove --apply
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.database import admin_engine
from app.models.entities import (
    User, ClientCompany, Course, Trainee, TraineeAffiliation, TrainingSession,
    TrainingRecord, TrainingRecordVersion, TrainerAssignment, Certificate,
    Quiz, QuizQuestion, QuizAnswerKey, QuizAttempt,
)
from app.crypto.cpabe_engine import cpabe_engine
from app.crypto.attribute_manager import attribute_manager, AttributeManager

APPLY = "--apply" in sys.argv
REMOVE = "--remove" in sys.argv

DEMO_SESSIONS_SQL = "SELECT id FROM training_sessions WHERE session_code LIKE 'DEMO-%'"
DEMO_RECORDS_SQL = "SELECT id FROM training_records WHERE id LIKE 'rec-demo-%'"
DEMO_QUIZZES_SQL = "SELECT id FROM quizzes WHERE id LIKE 'qz-demo-%'"


def remove_demo(db):
    for sql in [
        f"DELETE FROM quiz_attempts WHERE quiz_id IN ({DEMO_QUIZZES_SQL}) OR id LIKE 'att-demo-%'",
        f"DELETE FROM quiz_answer_keys WHERE question_id IN (SELECT id FROM quiz_questions WHERE quiz_id IN ({DEMO_QUIZZES_SQL}))",
        f"DELETE FROM quiz_questions WHERE quiz_id IN ({DEMO_QUIZZES_SQL})",
        "DELETE FROM quizzes WHERE id LIKE 'qz-demo-%'",
        f"DELETE FROM certificates WHERE record_id IN ({DEMO_RECORDS_SQL}) OR id LIKE 'cert-demo-%'",
        f"DELETE FROM training_record_versions WHERE record_id IN ({DEMO_RECORDS_SQL})",
        "DELETE FROM training_records WHERE id LIKE 'rec-demo-%'",
        f"DELETE FROM trainer_assignments WHERE session_id IN ({DEMO_SESSIONS_SQL})",
        "DELETE FROM training_sessions WHERE session_code LIKE 'DEMO-%'",
        "DELETE FROM trainee_affiliations WHERE id LIKE 'aff-demo-%'",
    ]:
        db.execute(text(sql))


def get_or_create_course(db, name, code_prefix):
    norm = name.strip().lower().replace("simulatuon", "simulation")
    for c in db.query(Course).all():
        if c.name.strip().lower().replace("simulatuon", "simulation") == norm:
            return c
    c = Course(
        id=str(uuid.uuid4()),
        course_code=f"CRS-{code_prefix}-{uuid.uuid4().hex[:3].upper()}",
        name=name,
        description=f"Official Crossworks Training & Consulting curriculum: {name}.",
        acronym_3=code_prefix[:3].upper(),
    )
    db.add(c)
    db.flush()
    return c


def encrypt_and_add_record(db, rec_id, trn, comp, sess, course_name, status, attendance, score, comp_date, joey_id):
    AttributeManager.get_or_create_attribute(db, "CLIENT", comp.code, version=1)
    AttributeManager.get_or_create_attribute(db, "TRAINING", sess.session_code, version=1)
    AttributeManager.get_or_create_attribute(db, "TRAINEE", trn.trainee_code, version=1)

    policy = cpabe_engine.build_record_policy(
        company_code=comp.code, session_code=sess.session_code, trainee_code=trn.trainee_code
    )
    payload = {
        "score": score,
        "assessment_notes": (
            f"Completed {course_name} ({sess.session_code}) under {comp.name}."
            if status == "Completed"
            else f"Cohort {sess.session_code} ({status}) for {course_name}."
        ),
        "practical_lab": "Distinction" if (score and score >= 90) else ("Needs Remediation" if status == "Not completed" else "Satisfactory"),
        "trainee_name": f"{trn.first_name} {trn.last_name}",
        "trainee_email": trn.email,
        "company": comp.name,
        "session_code": sess.session_code,
    }
    enc = cpabe_engine.encrypt_record(payload, policy, record_id=f"rec-{trn.trainee_code}", version=1)
    rec = TrainingRecord(
        id=rec_id,
        trainee_id=trn.id,
        session_id=sess.id,
        company_at_completion_id=comp.id,
        course_name=course_name,
        status=status,
        attendance_status=attendance,
        completion_date=comp_date,
        score=score,
        encryption_policy=policy,
        policy_version=1,
        abe_ciphertext=enc.get("abe_ciphertext"),
        payload_ciphertext=enc.get("payload_ciphertext"),
        nonce=enc.get("nonce"),
        is_encrypted=True,
        created_at=sess.start_date,
    )
    db.add(rec)
    db.flush()
    db.add(TrainingRecordVersion(
        record_id=rec.id,
        version_no=1,
        abe_ciphertext=enc.get("abe_ciphertext"),
        payload_ciphertext=enc.get("payload_ciphertext"),
        policy_tokens=policy,
        edited_by_user_id=joey_id,
        edited_at=sess.start_date,
        reason="Initial encrypted training record snapshot (DD-06).",
    ))
    return rec


QUIZ_BANK = [
    ("Supervisory Upskilling Program for Excellent", "SUP", [
        ("Supervisory Mastery: Coaching & Delegation Quiz", [
            ("What is the primary factor when choosing between delegating vs performing a task directly?", ["Team velocity and individual competency readiness", "Physical proximity to the client site", "Time of day the request arrived", "Seniority ranking on the org chart"], 0, "Delegation requires assessing competency readiness and growth opportunity."),
            ("In the GROW coaching model, what does the 'R' stand for?", ["Remediation", "Reality", "Recognition", "Redirection"], 1, "GROW stands for Goal, Reality, Options, Will."),
            ("Which feedback framework minimizes defensiveness during performance reviews?", ["SBI (Situation, Behavior, Impact)", "Sandwich method with vague praise", "Unannounced escalation to senior VP", "Public peer evaluation polling"], 0, "SBI grounds feedback in observable facts."),
            ("When team conflict escalates to interpersonal friction, what is the first leadership action?", ["Mediate privately to separate personalities from the process blocker", "Immediately terminate both team members", "Ignore the issue until sprint ends", "Reassign entire project externally"], 0, "Leaders address interpersonal friction constructively and privately."),
        ]),
        ("Supervisory Mastery: Performance & KPI Lab", [
            ("What distinguishes a leading indicator from a lagging indicator in team supervision?", ["Leading indicators predict future performance; lagging indicators measure past results", "Leading indicators are financial only", "Lagging indicators are updated daily", "They are identical in coaching"], 0, "Leading indicators measure actionable behaviours that drive outcomes."),
            ("During a 1-on-1 coaching session, who should do most of the problem-solving analysis?", ["The team member being coached, guided by open-ended questions", "The supervisor reading from a script", "HR compliance officers", "External auditors"], 0, "Effective coaching builds autonomy through guided reflection."),
            ("Psychological safety in a high-performing team means:", ["Team members can raise risks and mistakes without fear of humiliation", "Lowering performance standards for everyone", "Avoiding all critical feedback", "Eliminating project deadlines"], 0, "Psychological safety pairs high accountability with safe candor."),
            ("Which action best supports a newly promoted supervisor in their first 90 days?", ["Clear role expectations, structured peer mentoring, and milestone feedback", "Leaving them isolated to test resilience", "Assigning only administrative paperwork", "Removing all decision authority"], 0, "Structured onboarding accelerates leadership transition."),
        ]),
    ]),
    ("Business Strategy Simulation", "BSS", [
        ("Business Strategy Simulation: Market Forces Quiz", [
            ("In Porter's Five Forces, which force evaluates the ease with which new competitors enter a market?", ["Threat of New Entrants", "Bargaining Power of Buyers", "Competitive Rivalry", "Threat of Substitutes"], 0, "Barriers to entry determine the Threat of New Entrants."),
            ("What does Return on Invested Capital (ROIC) measure in a strategy simulation?", ["How efficiently a company allocates capital to generate profitable returns", "Gross headcount growth year-over-year", "Total marketing spend divided by revenue", "Short-term cash balance"], 0, "ROIC measures profitability relative to total capital invested."),
            ("A Blue Ocean strategy focuses on:", ["Creating uncontested market space and new demand", "Engaging in price wars in saturated markets", "Reducing product quality to cut unit cost", "Copying competitor pricing tables"], 0, "Blue Ocean strategy combines differentiation and low cost."),
            ("Leading indicators in a Balanced Scorecard are:", ["Predictive performance drivers that influence future outcomes", "Historical financial results from prior fiscal years", "External tax audit findings", "Fixed depreciation schedules"], 0, "Leading indicators measure operational drivers of future outcomes."),
        ]),
        ("Business Strategy Simulation: Capital Allocation Challenge", [
            ("When simulation demand outstrips factory capacity, which lever protects margins best?", ["Targeted capacity expansion paired with value-based pricing", "Slashing prices below variable cost", "Halting all customer service", "Defaulting on supplier contracts"], 0, "Aligning capacity with value-based pricing preserves unit economics."),
            ("Working capital optimization requires balancing:", ["Inventory turnover, receivables collection, and payables terms", "Office lease aesthetics", "Social media impressions", "Unrelated sunk costs"], 0, "The cash conversion cycle governs working capital efficiency."),
            ("Competitive differentiation is sustainable only when:", ["Capabilities are difficult for rivals to imitate and valued by customers", "Built on temporary promotional discounts", "Kept secret from customers", "Based on one-time accounting adjustments"], 0, "Durable differentiation rests on non-imitable customer value."),
            ("Scenario sensitivity analysis helps executives:", ["Stress-test strategic plans against demand and cost shocks", "Guarantee zero market risk", "Replace financial statements", "Avoid board oversight"], 0, "Sensitivity analysis reveals how key assumptions impact returns."),
        ]),
    ]),
    ("Project Management Essentials", "PME", [
        ("Project Management Essentials: WBS & Scope Quiz", [
            ("What is the smallest unit of work in a Work Breakdown Structure (WBS)?", ["Work Package", "Control Account", "Planning Phase", "Project Milestone"], 0, "The Work Package is the lowest level of the WBS."),
            ("On the Critical Path of a project schedule, what is the Total Float?", ["Zero (0 days)", "At least 5 buffer days", "Equal to the project duration", "Determined by the client"], 0, "Activities on the critical path have zero total float."),
            ("Scope creep is best prevented by:", ["Enforcing a formal Change Control Process", "Refusing all communication with stakeholders", "Doubling the initial budget estimate", "Skipping requirements gathering"], 0, "Formal change control evaluates schedule, cost, and quality impact."),
            ("A RACI matrix clarifies roles using which four designations?", ["Responsible, Accountable, Consulted, Informed", "Required, Approved, Certified, Issued", "Reviewed, Audited, Closed, Archived", "Risk, Action, Control, Impact"], 0, "RACI stands for Responsible, Accountable, Consulted, and Informed."),
        ]),
        ("Project Management Essentials: Earned Value & Risk Quiz", [
            ("A Cost Performance Index (CPI) of 0.85 indicates that the project is:", ["Over budget (earning 85 cents of value per dollar spent)", "Under budget by 15%", "Ahead of schedule by 15%", "Exactly on budget"], 0, "CPI = EV / AC; values below 1.0 indicate cost overrun."),
            ("Which document formally authorizes the existence of a project?", ["Project Charter", "Issue Log", "Sprint Burndown", "Procurement Invoice"], 0, "The Project Charter grants the PM authority to apply resources."),
            ("Qualitative risk analysis prioritizes risks by evaluating:", ["Probability of occurrence and impact on objectives", "Exact Monte Carlo dollar variance", "Vendor stock price", "Team seating chart"], 0, "Probability and impact ratings prioritize risks for treatment."),
            ("During project closure, lessons learned should be:", ["Documented and archived in organizational process assets", "Deleted to save storage", "Kept private by the sponsor", "Deferred to the next fiscal audit"], 0, "Capturing lessons learned prevents repeating delivery pitfalls."),
        ]),
    ]),
    ("Negotiating for Results", "NFR", [
        ("Negotiating for Results: BATNA & ZOPA Assessment", [
            ("In negotiation theory, what does BATNA stand for?", ["Best Alternative to a Negotiated Agreement", "Baseline Agreement for Tactical Negotiation Actions", "Bilateral Assessment of Trade and Net Assets", "Budget Allocation for Targeted New Accounts"], 0, "Your BATNA is your strongest walk-away alternative."),
            ("The Zone of Possible Agreement (ZOPA) exists when:", ["The buyer's reservation price exceeds the seller's reservation price", "Both parties refuse to share any information", "One party issues an ultimatum", "There is no overlap between walk-away positions"], 0, "ZOPA is the overlap range between both parties' reservation points."),
            ("Integrative ('win-win') bargaining creates value by:", ["Trading across multiple issues where parties have different priorities", "Splitting a fixed pie down the middle", "Hiding all underlying interests", "Threatening litigation early"], 0, "Logrolling across differently valued issues expands the pie."),
            ("Anchoring in a commercial negotiation works because:", ["The first credible number shapes the reference range for counter-offers", "It legally binds the counterparty", "It eliminates the need for preparation", "It hides the product specifications"], 0, "Well-researched anchors pull the negotiation zone toward your target."),
        ]),
    ]),
    ("ISO 31000 CRM", "CRM", [
        ("ISO 31000 Certified Risk Management Framework", [
            ("In ISO 31000, risk is formally defined as:", ["The effect of uncertainty on objectives", "A catastrophic monetary loss", "An unexpected network intrusion", "A hardware failure in production"], 0, "ISO 31000 defines risk as the effect of uncertainty on objectives."),
            ("What are the two axes of a standard qualitative risk matrix?", ["Likelihood (Probability) and Impact (Consequence)", "Cost and Duration", "CPU Usage and Memory Latency", "Headcount and Seniority"], 0, "Risk severity is evaluated as Likelihood x Impact."),
            ("Residual risk represents:", ["The risk remaining after risk treatment controls have been applied", "The initial unmitigated risk before any review", "Risks that cannot be calculated mathematically", "Risks covered by insurance policies"], 0, "Residual risk is the remaining exposure following control implementation."),
            ("Which risk treatment strategy involves shifting financial liability to a third party?", ["Risk Sharing (Transfer)", "Risk Avoidance", "Risk Retention", "Risk Elimination"], 0, "Insurance and third-party warranties are examples of risk sharing."),
        ]),
    ]),
    ("PMP Review (Saturdays)", "PMP", [
        ("PMP Exam Review: Predictive & Hybrid Governance", [
            ("Which artifact provides formal authorization for a project manager to apply resources?", ["Project Charter", "Work Breakdown Structure (WBS)", "Risk Register", "Stakeholder Engagement Matrix"], 0, "The Project Charter formally authorizes the project."),
            ("What metric best indicates Agile sprint team predictability across iterations?", ["Velocity stability across sprints", "Gross lines of documentation authored", "Overtime hours billed per sprint", "Number of pull requests declined"], 0, "Velocity stability measures reliable sprint commitments."),
            ("How should a PM handle a newly identified high-impact risk during execution?", ["Log it in the Risk Register, analyze impact/probability, and plan a response", "Immediately halt all project work indefinitely", "Wait until the retrospective to mention it", "Absorb the cost without documenting"], 0, "Structured risk management requires logging, analysis, and response planning."),
            ("What defines the 'Definition of Done' (DoD) in hybrid delivery?", ["Shared quality criteria that every deliverable must satisfy to be accepted", "A verbal agreement between developer and tester", "The invoice date set by finance", "The conclusion of the fiscal quarter"], 0, "DoD ensures consistent quality and verification completeness."),
        ]),
    ]),
    ("PMP Review (Weekdays)", "PMP", [
        ("PMP Weekday Intensive: Schedule & Stakeholder Mastery", [
            ("When a stakeholder's influence is high and interest is high, how should the PM manage them?", ["Manage Closely with proactive engagement", "Monitor with minimal effort", "Keep Informed via monthly newsletter only", "Exclude from change reviews"], 0, "High-power, high-interest stakeholders require close collaboration."),
            ("Crashing a project schedule involves:", ["Adding resources to critical path activities to shorten duration for the least incremental cost", "Removing quality assurance testing", "Running sequential tasks without dependencies", "Canceling customer acceptance"], 0, "Crashing trades cost for schedule compression on the critical path."),
            ("A Schedule Performance Index (SPI) of 1.12 means:", ["The project is progressing at 112% of the planned rate (ahead of schedule)", "The project is 12% behind schedule", "The budget is 12% overspent", "The critical path has 12 tasks"], 0, "SPI = EV / PV; values above 1.0 indicate ahead-of-schedule progress."),
            ("Servant leadership in agile project teams focuses on:", ["Removing impediments and shielding the team from distractions", "Micromanaging daily task assignments", "Approving every line of code personally", "command-and-control status meetings"], 0, "Servant leaders unblock the team so they can deliver value."),
        ]),
    ]),
    ("Certified Associate in Project Management (CAPM)", "CAP", [
        ("CAPM Certification Readiness Assessment", [
            ("Which process group contains the 'Develop Project Charter' process?", ["Initiating", "Planning", "Executing", "Monitoring and Controlling"], 0, "Develop Project Charter belongs to the Initiating process group."),
            ("What is the primary output of the 'Collect Requirements' process?", ["Requirements Documentation and Requirements Traceability Matrix", "Approved Change Requests", "Team Charter", "Seller Proposals"], 0, "Collect Requirements produces documented requirements and the traceability matrix."),
            ("In a projectized organization, who holds the highest authority over project resources?", ["The Project Manager", "The Functional Manager", "The Accounting Clerk", "External Vendors"], 0, "In a projectized structure, the PM has full authority over the team."),
            ("Parametric estimating calculates activity duration or cost by:", ["Multiplying historical statistical unit rates by the quantity of work", "Guessing based on intuition", "Asking only one junior team member", "Copying last year's total budget"], 0, "Parametric estimating uses statistical relationships and unit quantities."),
        ]),
    ]),
    ("Innovation through Design Thinking", "IDT", [
        ("Design Thinking & Rapid Prototyping Challenge", [
            ("What is the very first stage of the 5-stage Design Thinking process?", ["Empathize", "Prototype", "Test", "Define"], 0, "Design Thinking begins with deep user empathy."),
            ("Why are low-fidelity prototypes built early in the ideation cycle?", ["To test assumptions rapidly and cheaply before committing engineering resources", "To serve as final production code", "To bypass user testing completely", "To finalize graphic design typography"], 0, "Low-fidelity prototypes invite honest feedback and rapid iteration."),
            ("A 'How Might We' (HMW) statement is used to:", ["Frame user problems as open-ended opportunities for ideation", "Assign blame for legacy system bugs", "Document database schema constraints", "Calculate project NPV"], 0, "HMW statements launch structured brainstorming."),
            ("During the Test phase of Design Thinking, teams should:", ["Observe how users interact with the prototype without defending the design", "Argue with users who misunderstand the interface", "Only test with internal developers", "Skip testing if executives like the mockup"], 0, "Unbiased observation reveals genuine usability gaps."),
        ]),
    ]),
    ("Customized Program", "CSP", [
        ("Enterprise Transformation & Digital Governance Quiz", [
            ("What is the foundational pillar of Zero-Trust enterprise architecture?", ["Never trust implicitly; always verify identity, device, and least-privilege scope", "Trust all traffic inside the corporate VPN", "Share administrator passwords across teams", "Disable audit logging for speed"], 0, "Zero-Trust verifies every access request explicitly."),
            ("Change management succeeds in digital transformation when:", ["Executive sponsorship is paired with role-specific training and clear metrics", "New tools are deployed without user training", "Legacy workflows are kept alongside new ones forever", "Feedback channels are closed"], 0, "People and process alignment drive technology adoption."),
            ("Data governance policies classify records primarily to:", ["Enforce appropriate access control, encryption, and retention rules", "Slow down database queries", "Increase storage costs", "Prevent authorized staff from working"], 0, "Classification binds security controls to data sensitivity."),
            ("Continuous improvement (Kaizen) relies on:", ["Iterative PDCA (Plan-Do-Check-Act) cycles driven by operational metrics", "Waiting 5 years between process reviews", "Blaming individuals for systemic bottlenecks", "Ignoring customer feedback"], 0, "PDCA cycles institutionalize measurable improvement."),
        ]),
    ]),
]


def main():
    db = sessionmaker(bind=admin_engine)()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        remove_demo(db)
        if REMOVE:
            if APPLY:
                db.commit()
                print("Removed Round 10 demo data.")
            else:
                db.rollback()
            return

        joey = db.query(User).filter(User.email == "joey.mallari@xworks.ph").first() or db.query(User).filter(User.role == "admin").first()
        trainer = db.query(User).filter(User.email == "jordan.ramos@crossworks.ph").first() or db.query(User).filter(User.role == "trainer").first()
        if not joey or not trainer:
            sys.exit("Required admin/trainer user not found.")

        # 1. Map canonical companies by base code (normalizing any _2 / _3 suffixes on demo trainees)
        all_comps = db.query(ClientCompany).all()
        comp_by_code = {c.code: c for c in all_comps}

        def get_comp(code, fallback_name="Crossworks Partner"):
            if code in comp_by_code:
                return comp_by_code[code]
            c = ClientCompany(id=str(uuid.uuid4()), code=code, name=fallback_name, client_type="COMPANY", industry="Enterprise Client")
            db.add(c)
            db.flush()
            comp_by_code[code] = c
            return c

        DEMO_CANONICAL = {
            "andrea.aguilar@vertiv.com": ("VHL", "Vertiv (Singapore) Holdings PTE LTD-ROHQ"),
            "ricardo.ocampo@iproyal.com": ("IPROY_SERVI", "IPRoyal Services FZE LLC"),
            "bea.macaraeg@iproyal.com": ("IPROY_SERVI", "IPRoyal Services FZE LLC"),
            "rafael.dizon@amihansolutions.com": ("AMIHAN_SOLUTI", "Amihan Solutions (OPC)"),
            "rowena.cabrera@ewageas.com": ("EWALIC", "East West Ageas Life Insurance Corporation"),
            "jjavier@islalpg.com": ("ISLA_LPG_CORPOR", "Isla LPG Corporation"),
            "arvin.natividad@urc.com.ph": ("UNIVER_ROBINA_CORPOR", "Universal Robina Corporation"),
            "camille.morales@boehringer-ingelheim.com": ("BIBSP", "Boehringer Ingelheim Business Services Philippines Inc."),
            "santos.vincent@ayalaland.com.ph": ("AYALA_LAND_INC", "Ayala Land, Inc."),
        }

        demo_trainees = {}
        for email, (canon_code, canon_name) in DEMO_CANONICAL.items():
            canon_comp = get_comp(canon_code, canon_name)
            trn = db.query(Trainee).filter(Trainee.email == email).first()
            if not trn:
                continue
            old_cid = trn.current_company_id
            trn.current_company_id = canon_comp.id
            if old_cid and old_cid != canon_comp.id:
                for r in db.query(TrainingRecord).filter(
                    TrainingRecord.trainee_id == trn.id, TrainingRecord.company_at_completion_id == old_cid
                ).all():
                    r.company_at_completion_id = canon_comp.id
            # Ensure active affiliation for current company exists
            has_curr_aff = db.query(TraineeAffiliation).filter(
                TraineeAffiliation.trainee_id == trn.id, TraineeAffiliation.company_id == canon_comp.id
            ).first()
            if not has_curr_aff:
                db.add(TraineeAffiliation(
                    id=f"aff-demo-curr-{trn.trainee_code.lower()}",
                    trainee_id=trn.id, company_id=canon_comp.id,
                    valid_from=datetime(2026, 7, 1), valid_to=None
                ))
            demo_trainees[email] = (trn, canon_comp)
        db.flush()

        # 2. Ensure courses exist and backfill TrainingSession.course_id
        courses_map = {}
        for c_name, acr, _ in QUIZ_BANK:
            courses_map[c_name] = get_or_create_course(db, c_name, acr)
        for s in db.query(TrainingSession).filter(TrainingSession.course_id == None).all():
            if s.course_name:
                c = get_or_create_course(db, s.course_name, (s.session_code.split("-")[2] if "-" in (s.session_code or "") else "TRN")[:3])
                s.course_id = c.id
        db.flush()

        # Fix Arvin Natividad's future 2026-11-23 pilot record to 'In progress' if it was marked 'Completed'
        if "arvin.natividad@urc.com.ph" in demo_trainees:
            arvin_t, _ = demo_trainees["arvin.natividad@urc.com.ph"]
            for r in db.query(TrainingRecord).filter(TrainingRecord.trainee_id == arvin_t.id).all():
                if "weekdays" in (r.course_name or "").lower():
                    r.status = "In progress"
                    r.score = None
                    r.completion_date = None

        # 3. Create 8 DEMO sessions (3 Upcoming Needs Attendance, 3 Awaiting Sign-Off, 2 Signed-Off Past Cohorts)
        SESSION_SPECS = [
            ("DEMO-NA-01", "Supervisory Upskilling Program for Excellent", 2, "F2F", "Crossworks Makati Learning Hub", False),
            ("DEMO-NA-02", "Business Strategy Simulation", 1, "F2F", "Crossworks Makati Learning Hub", False),
            ("DEMO-NA-03", "Project Management Essentials", 4, "Online", "Online (Virtual Meeting)", False),
            ("DEMO-AW-01", "Supervisory Upskilling Program for Excellent", -4, "F2F", "Crossworks Makati Learning Hub", False),
            ("DEMO-AW-02", "Business Strategy Simulation", -3, "F2F", "Crossworks Makati Learning Hub", False),
            ("DEMO-AW-03", "Project Management Essentials", -5, "Online", "Online (Virtual Meeting)", False),
            ("DEMO-NC-01", "Negotiating for Results", -18, "F2F", "Crossworks Makati Learning Hub", True),
            ("DEMO-NC-02", "ISO 31000 CRM", -14, "Online", "Online (Virtual Meeting)", True),
        ]
        demo_sess = {}
        for code, c_name, offset_days, mode, venue, signed in SESSION_SPECS:
            c_obj = courses_map[c_name]
            start = now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=offset_days)
            end = start + timedelta(days=1, hours=8)
            s = TrainingSession(
                id=str(uuid.uuid4()),
                session_code=code,
                course_id=c_obj.id,
                course_name=c_obj.name,
                start_date=start,
                end_date=end,
                delivery_type="Public",
                delivery_mode=mode,
                venue=venue,
                trainer_signed_off=signed,
                trainer_sign_off_at=(end + timedelta(hours=2)) if signed else None,
                trainer_sign_off_user_id=trainer.id if signed else None,
                trainer_sign_off_notes="Official Trainer sign-off completed." if signed else None,
            )
            db.add(s)
            db.flush()
            db.add(TrainerAssignment(user_id=trainer.id, session_id=s.id, valid_from=start - timedelta(days=10)))
            demo_sess[code] = (s, c_obj)
        db.flush()

        # 4. Enroll DEMO_USERS trainees so each has Completed + In progress + Not completed records
        #    AND multi-company historical records (FR-15, DD-01, Option B)
        rec_num = 1

        def add_demo_rec(email, comp_code, comp_name, sess_code, status, att, score):
            nonlocal rec_num
            if email not in demo_trainees:
                return None
            trn, _ = demo_trainees[email]
            comp = get_comp(comp_code, comp_name)
            s, c_obj = demo_sess[sess_code]
            rid = f"rec-demo-{rec_num:03d}"
            rec_num += 1
            c_date = s.end_date if status == "Completed" else None
            rec = encrypt_and_add_record(db, rid, trn, comp, s, c_obj.name, status, att, score, c_date, joey.id)
            if status == "Completed":
                db.add(Certificate(
                    id=f"cert-demo-{rec_num:03d}",
                    record_id=rec.id,
                    trainee_id=trn.id,
                    cert_type_code="PMP" if "project" in c_obj.name.lower() else ("ISO_31000" if "31000" in c_obj.name.lower() else "COMPLIANCE"),
                    title=f"Certificate of Completion — {c_obj.name}",
                    serial_number=f"{(c_obj.acronym_3 or 'CRO')[:3]}{s.start_date.strftime('%Y%m%d')}-{rec_num:02d}",
                    issue_date=s.end_date,
                    expiry_date=s.end_date + timedelta(days=365 * 3),
                    expiry_basis="Calculated: issue_date + 36 months validity (FR-18)",
                    status="Valid",
                    is_nearing_renewal=False,
                    is_self_reported=False,
                ))
            return rec

        # In-progress & Not-completed records at current companies
        ENROLLMENTS = [
            # Andrea Aguilar (VHL): In progress in DEMO-AW-02, Not completed in DEMO-NC-01
            ("andrea.aguilar@vertiv.com", "VHL", "Vertiv (Singapore) Holdings PTE LTD-ROHQ", "DEMO-AW-02", "In progress", "Present", None),
            ("andrea.aguilar@vertiv.com", "VHL", "Vertiv (Singapore) Holdings PTE LTD-ROHQ", "DEMO-NC-01", "Not completed", "Absent", 62.0),
            # Ricardo Ocampo (IPROY_SERVI): In progress in DEMO-AW-03, Not completed in DEMO-NC-02
            ("ricardo.ocampo@iproyal.com", "IPROY_SERVI", "IPRoyal Services FZE LLC", "DEMO-AW-03", "In progress", "Present", None),
            ("ricardo.ocampo@iproyal.com", "IPROY_SERVI", "IPRoyal Services FZE LLC", "DEMO-NC-02", "Not completed", "Absent", 64.5),
            # Bea Macaraeg (IPROY_SERVI): In progress in DEMO-NA-03, Not completed in DEMO-NC-01
            ("bea.macaraeg@iproyal.com", "IPROY_SERVI", "IPRoyal Services FZE LLC", "DEMO-NA-03", "In progress", None, None),
            ("bea.macaraeg@iproyal.com", "IPROY_SERVI", "IPRoyal Services FZE LLC", "DEMO-NC-01", "Not completed", "Present", 68.0),
            # Rafael Dizon (AMIHAN_SOLUTI): In progress in DEMO-AW-01, Not completed in DEMO-NC-02
            ("rafael.dizon@amihansolutions.com", "AMIHAN_SOLUTI", "Amihan Solutions (OPC)", "DEMO-AW-01", "In progress", "Present", None),
            ("rafael.dizon@amihansolutions.com", "AMIHAN_SOLUTI", "Amihan Solutions (OPC)", "DEMO-NC-02", "Not completed", "Absent", 65.0),
            # Rowena Cabrera (EWALIC): In progress in DEMO-AW-03, Not completed in DEMO-NC-01
            ("rowena.cabrera@ewageas.com", "EWALIC", "East West Ageas Life Insurance Corporation", "DEMO-AW-03", "In progress", "Present", None),
            ("rowena.cabrera@ewageas.com", "EWALIC", "East West Ageas Life Insurance Corporation", "DEMO-NC-01", "Not completed", "Absent", 66.0),
            # Joshua Javier (ISLA_LPG_CORPOR): In progress in DEMO-NA-01, Not completed in DEMO-NC-02
            ("jjavier@islalpg.com", "ISLA_LPG_CORPOR", "Isla LPG Corporation", "DEMO-NA-01", "In progress", None, None),
            ("jjavier@islalpg.com", "ISLA_LPG_CORPOR", "Isla LPG Corporation", "DEMO-NC-02", "Not completed", "Present", 63.0),
            # Arvin Natividad (UNIVER_ROBINA_CORPOR): Completed in DEMO-NC-01, Not completed in DEMO-NC-02
            ("arvin.natividad@urc.com.ph", "UNIVER_ROBINA_CORPOR", "Universal Robina Corporation", "DEMO-NC-01", "Completed", "Present", 89.5),
            ("arvin.natividad@urc.com.ph", "UNIVER_ROBINA_CORPOR", "Universal Robina Corporation", "DEMO-NC-02", "Not completed", "Absent", 61.0),
            # Camille Morales (BIBSP): In progress in DEMO-NA-02, Not completed in DEMO-NC-01
            ("camille.morales@boehringer-ingelheim.com", "BIBSP", "Boehringer Ingelheim Business Services Philippines Inc.", "DEMO-NA-02", "In progress", None, None),
            ("camille.morales@boehringer-ingelheim.com", "BIBSP", "Boehringer Ingelheim Business Services Philippines Inc.", "DEMO-NC-01", "Not completed", "Present", 67.5),
            # Vincent Santos (AYALA_LAND_INC): In progress in DEMO-AW-01, Not completed in DEMO-NC-02
            ("santos.vincent@ayalaland.com.ph", "AYALA_LAND_INC", "Ayala Land, Inc.", "DEMO-AW-01", "In progress", "Present", None),
            ("santos.vincent@ayalaland.com.ph", "AYALA_LAND_INC", "Ayala Land, Inc.", "DEMO-NC-02", "Not completed", "Absent", 65.5),
        ]
        for spec in ENROLLMENTS:
            add_demo_rec(*spec)

        # Also fill DEMO-NA-01..03 and DEMO-AW-01..02 with extra VHL/ROP/EWALIC trainees so each cohort has 4+ members
        extra_pool = (
            db.query(Trainee, ClientCompany)
            .join(ClientCompany, ClientCompany.id == Trainee.current_company_id)
            .filter(ClientCompany.code.in_(["VHL", "ROP", "EWALIC"]))
            .order_by(Trainee.last_name)
            .limit(15)
            .all()
        )
        for s_idx, code in enumerate(["DEMO-NA-01", "DEMO-NA-02", "DEMO-NA-03", "DEMO-AW-01", "DEMO-AW-02", "DEMO-AW-03"]):
            s, c_obj = demo_sess[code]
            existing_tids = {r.trainee_id for r in db.query(TrainingRecord).filter(TrainingRecord.session_id == s.id).all()}
            for trn, comp in extra_pool[s_idx * 2 : s_idx * 2 + 4]:
                if trn.id in existing_tids:
                    continue
                existing_tids.add(trn.id)
                rid = f"rec-demo-{rec_num:03d}"
                rec_num += 1
                att = None if code.startswith("DEMO-NA") else "Present"
                encrypt_and_add_record(db, rid, trn, comp, s, c_obj.name, "In progress", att, None, None, joey.id)

        # 5. Multi-Company Historical Affiliations & Completed Cross-Company Records (FR-15, DD-01, Option B)
        MULTI_COMPANY_SPECS = [
            # (email, prior_comp_code, prior_comp_name, sess_code, score, valid_from, valid_to)
            ("andrea.aguilar@vertiv.com", "AOS", "Acen Operations Services Inc.", "DEMO-NC-02", 91.5, datetime(2025, 1, 10), datetime(2026, 1, 31)),
            ("andrea.aguilar@vertiv.com", "ROP", "Red Oak Properties, Inc.", "DEMO-NC-01", 89.0, datetime(2026, 2, 1), datetime(2026, 6, 30)),
            ("ricardo.ocampo@iproyal.com", "AMIHAN_SOLUTI", "Amihan Solutions (OPC)", "DEMO-NC-01", 88.0, datetime(2025, 3, 1), datetime(2026, 1, 31)),
            ("ricardo.ocampo@iproyal.com", "VHL", "Vertiv (Singapore) Holdings PTE LTD-ROHQ", "DEMO-NC-02", 92.0, datetime(2026, 2, 1), datetime(2026, 6, 30)),
            ("rafael.dizon@amihansolutions.com", "SECURI_BANK_CORPOR", "Security Bank Corporation", "DEMO-NC-01", 90.5, datetime(2025, 4, 1), datetime(2026, 1, 31)),
            ("rafael.dizon@amihansolutions.com", "ROP", "Red Oak Properties, Inc.", "DEMO-NC-02", 87.0, datetime(2026, 2, 1), datetime(2026, 6, 30)),
            ("rowena.cabrera@ewageas.com", "VHL", "Vertiv (Singapore) Holdings PTE LTD-ROHQ", "DEMO-NC-02", 91.0, datetime(2025, 5, 1), datetime(2026, 1, 31)),
            ("rowena.cabrera@ewageas.com", "BIBSP", "Boehringer Ingelheim Business Services Philippines Inc.", "DEMO-NC-01", 88.5, datetime(2026, 2, 1), datetime(2026, 6, 30)),
        ]
        aff_seq = 1
        for email, p_code, p_name, s_code, score, v_from, v_to in MULTI_COMPANY_SPECS:
            if email not in demo_trainees:
                continue
            trn, curr_comp = demo_trainees[email]
            p_comp = get_comp(p_code, p_name)
            db.add(TraineeAffiliation(
                id=f"aff-demo-{aff_seq:03d}",
                trainee_id=trn.id,
                company_id=p_comp.id,
                valid_from=v_from,
                valid_to=v_to,
            ))
            aff_seq += 1
            add_demo_rec(email, p_code, p_name, s_code, "Completed", "Present", score)
            if trn.user_id:
                u = db.query(User).filter(User.id == trn.user_id).first()
                if u:
                    codes = list(u.assigned_client_accounts or [curr_comp.code])
                    if curr_comp.code not in codes:
                        codes.insert(0, curr_comp.code)
                    if p_code not in codes:
                        codes.append(p_code)
                    u.assigned_client_accounts = codes
        db.flush()

        # 6. Seed Approved Course-Scoped Quizzes across all demo courses
        has_quiz_course_col = hasattr(Quiz, "course_id")
        qz_seq = 1
        first_quiz_by_course = {}
        for c_name, acr, quizzes_for_course in QUIZ_BANK:
            c_obj = courses_map[c_name]
            fallback_sess = db.query(TrainingSession).filter(TrainingSession.course_id == c_obj.id).first()
            for q_title, q_items in quizzes_for_course:
                qz_id = f"qz-demo-{qz_seq:03d}"
                qz_seq += 1
                qz_kwargs = dict(
                    id=qz_id,
                    title=q_title,
                    session_id=None if has_quiz_course_col else (fallback_sess.id if fallback_sess else None),
                    created_by_user_id=trainer.id,
                    version_no=1,
                    is_closed=False,
                    is_approved=True,
                    approved_by_user_id=joey.id,
                    approved_at=now - timedelta(days=5),
                    available_until=now + timedelta(days=60),
                )
                if has_quiz_course_col:
                    qz_kwargs["course_id"] = c_obj.id
                qz = Quiz(**qz_kwargs)
                db.add(qz)
                db.flush()
                first_quiz_by_course.setdefault(c_name, qz)

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
                    db.add(QuizAnswerKey(question_id=qq.id, correct_answer=c_ans, explanation=exp))

        # Give Andrea, Ricardo, and Rowena 1 completed attempt on Supervisory Upskilling Quiz 1
        # so they show both "1Completed" and several "Pending (Start Assessment)" quizzes
        sup_q1 = first_quiz_by_course.get("Supervisory Upskilling Program for Excellent")
        if sup_q1:
            for idx, em in enumerate(["andrea.aguilar@vertiv.com", "ricardo.ocampo@iproyal.com", "rowena.cabrera@ewageas.com"], start=1):
                if em in demo_trainees:
                    t_obj, _ = demo_trainees[em]
                    db.add(QuizAttempt(
                        id=f"att-demo-{idx:03d}",
                        quiz_id=sup_q1.id,
                        trainee_id=t_obj.id,
                        quiz_version=1,
                        submitted_offline=False,
                        score=100.0 if idx == 1 else 75.0,
                        total_points=100 if idx == 1 else 75,
                        is_scored=True,
                        submitted_at=now - timedelta(days=2),
                    ))
        db.flush()

        # 7. Re-issue CP-ABE keys for staff & demo trainees so all new records decrypt cleanly
        for u in db.query(User).filter(User.role.in_(["admin", "finance", "account_manager", "trainer"])).all():
            attribute_manager.issue_or_rekey_user(db=db, user=u, admin_user_id=joey.id, commit=False)
        for em, (trn, _) in demo_trainees.items():
            if trn.user_id:
                u_t = db.query(User).filter(User.id == trn.user_id).first()
                if u_t:
                    attribute_manager.issue_or_rekey_user(db=db, user=u_t, admin_user_id=joey.id, commit=False)

        if APPLY:
            db.commit()
            print(f"Round 10 demo data committed: {rec_num - 1} demo records, {qz_seq - 1} approved course quizzes, {aff_seq - 1} cross-company affiliations.")
        else:
            db.rollback()
            print("Dry run complete (rolled back). Re-run with --apply to commit.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

