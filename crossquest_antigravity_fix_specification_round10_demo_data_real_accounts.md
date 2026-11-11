# CrossQuest: Antigravity Spec, Round 10 v2 (Demo data on REAL accounts, filled quizzes, fewer courses)

**Replaces the earlier Round 10 file.** That version created three made-up trainees and matched the real trainees by `trainee_code`, which is wrong for 6 of the 9 dev-switch personas in your database. This version creates no accounts and matches everyone by email.
**Baseline:** Rounds 8 and 9 applied (this zip). Your database backup (`backup_2026-11-10_2242.sql`) does **not** have migration `008_quiz_course_scope.sql` yet (`quizzes` has no `course_id`), so apply 008 first (see the manual checks).
**Token rules for Antigravity:** do only what is listed. Do NOT run the app, tests, docker, builds or the two scripts (the user runs them). Do not touch Cohorts, Analytics, other trainer pages or account-manager pages. Anchors are unique strings; line numbers are approximate. Edit each file once.

## Roadmap

| Step | Scope |
|---|---|
| Round 8 / 9 | Trainer speed, session board; quizzes belong to a course (done) |
| **Round 10 v2 (this file)** | Real accounts with In progress / Not completed / Completed records, real multi-company histories, filled quizzes, course clean-up, dev-switch fixes |
| Round 11 | Real quiz-performance data for Results, lazy question loading, leftovers |

## What the backup shows (read-only investigation)

1. **The 4 approved quizzes are empty.** `act-1` to `act-4` ("Agile PME & Project Management Challenge", "Executive Communication & CONNECT Simulation", "Supervisory Mastery & High-Impact Coaching", "Business Continuity & ISO 31000 Risk Management") have 0 rows in `quiz_questions`, and no session, so no course. Their questions exist only in `frontend/src/data/quizDatabase.js` (4 multiple-choice + 4 other types each). After migration 008 they would belong to no course, so no trainee or trainer would see them.
2. **Too many course types.** `courses` has 81 rows: 34 real Crossworks programs and 47 left over from automated tests (26 copies of "Project Management Professional Bootcamp", 16 "Secure Architecture Module N", "Course Alpha 1", "Security V1", and so on). 162 of the 209 sessions are test sessions (`SESS-PMP`, `SESS-FUT`, `SESS-F2F`, `SESS-ONL`, `SESS-TRN`, `SESS-TM`, `SESS-GAM`). The Round 9 admin dropdown lists every course, and the quiz list shows every heading.
3. **Statuses.** All 148 training records are Completed/Present, one per trainee, spread over only 11 real courses. There are no `In progress` or `Not completed` records and no `trainee_affiliations` rows.
4. **The real trainer has no sessions.** All 79 `trainer_assignments` belong to deleted test users. So the lead trainer Jordan Ramos (`jordan.ramos@crossworks.ph`) has an empty quiz scope.
5. **Wrong codes in the dev switcher.** `DEMO_USERS` shows the wrong `trainee_code` for 6 personas (it appears in the Sidebar). Real codes: Rafael Dizon TRN-8098, Rowena Cabrera TRN-8114, Joshua Javier TRN-8050, Arvin Natividad TRN-8138, Camille Morales TRN-8034, Vincent Santos TRN-8062. (TRN-8015, 8032, 8049, 8139, 8071, 8088 belong to other people.)
6. **Account Manager scope in the database differs from `DEMO_USERS`.** Real `account_manager_assignments`: Sharon De Vera has ROP, URC, AYALA, BIBSP, WCD, NSE and others; Brian Mendoza has IPROY_SERVI, SECURI_BANK, PSB, XSDS and others; `joey.sales@crossworks.ph` ("Jordan Ramos (Sales)") has AMIHAN_SOLUTI and EWALIC. Erika Bana has **no assignments** (her `assigned_client_accounts` says CORP_ALPHA, BANK_DELTA). This round does not change assignments (see "Not in this round").

## Design

- **Real accounts only.** The 9 dev-switch trainees already exist in your database; the scripts match them by email.
- **Real quiz content.** The scripts load the 4 multiple-choice questions of each `act-N` quiz from `quizDatabase.js` into the database (the database only stores multiple choice) and attach each quiz to a real course that has trainees:

| Quiz | Course |
|---|---|
| act-1 Agile PME & Project Management Challenge | Project Management Essentials |
| act-2 Executive Communication & CONNECT Simulation | Business Strategy Simulatuon (closest match, a judgement call; change `QUIZ_COURSE` in the script if you prefer another) |
| act-3 Supervisory Mastery & High-Impact Coaching | Supervisory Upskilling Program for Excellent |
| act-4 Business Continuity & ISO 31000 Risk Management | ISO 31000 CRM |

- **Demo sessions** `DEMOT-*` exist only on those four courses, so every demo record has a quiz behind it. Prefix `DEMOT-` (not `DEMO-`) keeps `seed_demo_cohorts.py --remove` from deleting them.
- **Statuses follow the real sign-off flow:** Completed = signed-off session, attendance Present, score, non-expiring certificate. Not completed = signed-off session, Absent. In progress = session not signed off.
- **Records added per real trainee** (existing pilot records are never changed; a record is skipped if the trainee already has that status at that company):

| Real trainee | Company | Added records |
|---|---|---|
| Andrea Aguilar | VHL | In progress |
| Ricardo Ocampo | IPROY_SERVI | Not completed |
| Bea Macaraeg | IPROY_SERVI | Not completed, In progress |
| **Rafael Dizon** | AMIHAN_SOLUTI (earlier IPROY_SERVI) | Completed at IPROY_SERVI, In progress |
| **Rowena Cabrera** | EWALIC (earlier ROP) | Not completed at ROP, In progress |
| Joshua Javier | ISLA_LPG_CORPOR | Not completed, In progress |
| **Arvin Natividad** | UNIVER_ROBINA_CORPOR (earlier SECURI_BANK_CORPOR) | Completed at SECURI_BANK_CORPOR, Not completed |
| Camille Morales | BIBSP | In progress |
| Vincent Santos | AYALA_LAND_INC | Not completed |

  The three in bold also get company history (`trainee_affiliations`), so the trainee "My Trainings" company filter and the Admin company switch have real data. The earlier company of each is a different real company with a different Account Manager.
- **Lead trainer scope:** the script grants Jordan Ramos the programs that have pilot sessions (admin-style `trainer_programs` rows tagged `demo-r10`) and assigns him the `DEMOT-*` sessions.
- **Fewer courses:** a purge script removes the test sessions, test quizzes and the 47 test courses (dry run first). The Admin quiz dropdown then shows only courses that have a session or a quiz, and the quiz list shows only courses that have quizzes.

---

## 1. `backend/scripts/purge_test_courses.py` (new file)

Create the file with exactly this content:

```python
"""Round 10: remove leftover automated-test sessions, quizzes and courses so only the real Crossworks program
catalog remains (34 courses instead of 81).

Run inside the backend container (copy the file to /app first). TAKE A pg_dump BACKUP FIRST.

    python purge_test_courses.py            # DRY RUN: prints what would be deleted, rolls back
    python purge_test_courses.py --apply    # commit

Deletes only: sessions whose code is not SESS-2026-* / DEMO* and that have NO training records, plus their teams,
trainer assignments and quizzes (with questions, answer keys, attempts); then courses that are not in the real
catalog and have no remaining sessions, quizzes or trainer programs. Real pilot data is never touched.
"""
import sys

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.database import admin_engine

APPLY = "--apply" in sys.argv

KEEP_COURSE_NAMES = ['Agile PME',
 'Business Continuity Management Essentials',
 'Coaching',
 'CONNECT',
 'Consulting',
 'Customized Program',
 'Enterprise Risk Management',
 'Impactful Leadership',
 'Implementing Data Privacy',
 'Innovation through Design Thinking',
 'ISMS 27001 Essentials',
 'ISMS 27001 Internal Auditor',
 'ISMS 27001 Lead Auditor Certification',
 'ISMS 27001:2022 Managing Infosec Controls',
 'ISMS 27001:2022 Transition Awareness',
 'ISO 31000 CRM',
 'Management Development Program',
 'Managing Stakeholders Effectively',
 'Maximizing Employee Engagement',
 'Negotiating for Results',
 'Performing Data Privacy Audits',
 'PMP Review (Saturdays)',
 'PMP Review (Weekdays)',
 'Project Management Essentials',
 'Strategic Management Tools',
 'Team Building',
 'Vendor Management',
 'WAVE',
 'Train the Trainer with Addie',
 'Mastering Business Presentation Skills',
 'Compliance Management Systems',
 'Supervisory Upskilling Program for Excellent',
 'Certified Associate in Project Management (CAPM)',
 'Business Strategy Simulatuon']


def ids(db, sql, **params):
    return [r[0] for r in db.execute(text(sql), params).fetchall()]


def run(db, label, sql, **params):
    n = db.execute(text(sql), params).rowcount
    print(f"  {label}: {n}")
    return n


def main():
    db = sessionmaker(bind=admin_engine)()
    try:
        junk = ids(db, "SELECT s.id FROM training_sessions s WHERE s.session_code NOT LIKE 'SESS-2026-%' "
                       "AND s.session_code NOT LIKE 'DEMO%' "
                       "AND NOT EXISTS (SELECT 1 FROM training_records r WHERE r.session_id = s.id)")
        print(f"Test sessions to delete: {len(junk)}")
        if junk:
            quizzes = ids(db, "SELECT id FROM quizzes WHERE session_id = ANY(:j)", j=junk)
            if quizzes:
                run(db, "quiz answer keys", "DELETE FROM quiz_answer_keys WHERE question_id IN "
                    "(SELECT id FROM quiz_questions WHERE quiz_id = ANY(:q))", q=quizzes)
                run(db, "quiz questions", "DELETE FROM quiz_questions WHERE quiz_id = ANY(:q)", q=quizzes)
                run(db, "quiz attempts", "DELETE FROM quiz_attempts WHERE quiz_id = ANY(:q)", q=quizzes)
                run(db, "quizzes", "DELETE FROM quizzes WHERE id = ANY(:q)", q=quizzes)
            run(db, "team members", "DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE session_id = ANY(:j))", j=junk)
            run(db, "teams", "DELETE FROM teams WHERE session_id = ANY(:j)", j=junk)
            run(db, "trainer assignments", "DELETE FROM trainer_assignments WHERE session_id = ANY(:j)", j=junk)
            run(db, "sessions", "DELETE FROM training_sessions WHERE id = ANY(:j)", j=junk)

        junk_courses = ids(db,
            "SELECT c.id FROM courses c WHERE NOT (c.name = ANY(:keep)) "
            "AND NOT EXISTS (SELECT 1 FROM training_sessions s WHERE s.course_id = c.id) "
            "AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.course_id = c.id)", keep=KEEP_COURSE_NAMES)
        print(f"Test courses to delete: {len(junk_courses)}")
        if junk_courses:
            run(db, "trainer programs", "DELETE FROM trainer_programs WHERE course_id = ANY(:c)", c=junk_courses)
            run(db, "courses", "DELETE FROM courses WHERE id = ANY(:c)", c=junk_courses)
        left = db.execute(text("SELECT COUNT(*) FROM courses")).scalar()
        print(f"Courses remaining: {left}")
        if APPLY:
            db.commit()
            print("\n>>> COMMITTED")
        else:
            db.rollback()
            print("\n>>> DRY RUN ONLY, rolled back. Re-run with --apply to commit.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

## 2. `backend/seed_demo_real_accounts.py` (new file)

Create the file with exactly this content:

```python
"""Round 10 (real accounts): fills the empty quizzes and gives REAL trainee accounts a mix of record statuses
and company histories. No new user accounts are created.

Run inside the backend container AFTER migration 008 (copy the file to /app first):

    python seed_demo_real_accounts.py                  # DRY RUN: prints the plan, rolls back
    python seed_demo_real_accounts.py --apply          # commit
    python seed_demo_real_accounts.py --remove --apply # remove demo sessions/records/history/program grants

What it does
  1. Quizzes act-1..act-4 (empty, no course): sets their course and loads their 4 multiple-choice questions each.
  2. Grants the lead trainer (jordan.ramos@crossworks.ph) the programs that have pilot sessions.
  3. Creates DEMOT-* sessions on 4 real courses (the ones that have a quiz), assigned to the lead trainer.
  4. For the 9 real dev-switch trainees (matched by EMAIL), adds only the missing Completed / Not completed /
     In progress records, CP-ABE encrypted with the normal policy. Existing pilot records are never touched.
  5. Writes company history (TraineeAffiliation) for 3 real trainees whose earlier record is at another real company.
--remove does not undo step 1 (the quiz questions are real content).
"""
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.database import admin_engine
from app.models.entities import (
    User, ClientCompany, Trainee, TraineeAffiliation, Course, TrainingSession, TrainingRecord,
    TrainerAssignment, TrainerProgram, Certificate, Quiz, QuizQuestion, QuizAnswerKey,
)
from app.crypto.cpabe_engine import cpabe_engine
from app.crypto.attribute_manager import attribute_manager
from app.api.endpoints.certifications import generate_cert_serial

APPLY = "--apply" in sys.argv
REMOVE = "--remove" in sys.argv
LEAD_TRAINER_EMAIL = "jordan.ramos@crossworks.ph"
GRANT_TAG = "demo-r10"

SUP = "Supervisory Upskilling Program for Excellent"
PME = "Project Management Essentials"
ISO = "ISO 31000 CRM"
BSS = "Business Strategy Simulatuon"  # spelling as stored in the database

# Existing empty quizzes (ids act-1..act-4) and the real course each belongs to.
# act-2 (Executive Communication & CONNECT) has no matching course with trainees: it is attached to the
# closest one (Business Strategy Simulation). Change it here if you prefer another course.
QUIZ_COURSE = {"act-1": PME, "act-2": BSS, "act-3": SUP, "act-4": ISO}

# session key -> (stage, start offset in days from today, course name)
SESSION_PLAN = {
    "C-SUP": ("Completed", -70, SUP), "C-PME": ("Completed", -55, PME),
    "N-ISO": ("Not completed", -30, ISO), "N-BSS": ("Not completed", -22, BSS),
    "P-SUP": ("In progress", -1, SUP), "P-PME": ("In progress", 0, PME), "P-ISO": ("In progress", -1, ISO),
}

# Real accounts (by email) -> records to add: (status, session key, company code, or None = current company)
NEEDS = {
    "andrea.aguilar@vertiv.com": [("In progress", "P-SUP", None)],
    "ricardo.ocampo@iproyal.com": [("Not completed", "N-ISO", None)],
    "bea.macaraeg@iproyal.com": [("Not completed", "N-BSS", None), ("In progress", "P-PME", None)],
    "rafael.dizon@amihansolutions.com": [("Completed", "C-PME", "IPROY_SERVI"), ("In progress", "P-SUP", None)],
    "rowena.cabrera@ewageas.com": [("Not completed", "N-ISO", "ROP"), ("In progress", "P-ISO", None)],
    "jjavier@islalpg.com": [("Not completed", "N-ISO", None), ("In progress", "P-PME", None)],
    "arvin.natividad@urc.com.ph": [("Completed", "C-SUP", "SECURI_BANK_CORPOR"), ("Not completed", "N-BSS", None)],
    "camille.morales@boehringer-ingelheim.com": [("In progress", "P-ISO", None)],
    "santos.vincent@ayalaland.com.ph": [("Not completed", "N-ISO", None)],
}

# Company history of 3 real trainees: (company code, valid_from offset, valid_to offset or None). The last entry
# must be the trainee's current company. Earlier records above fall inside the earlier period.
HISTORY = {
    "rafael.dizon@amihansolutions.com": [("IPROY_SERVI", -400, -50), ("AMIHAN_SOLUTI", -50, None)],
    "rowena.cabrera@ewageas.com": [("ROP", -400, -25), ("EWALIC", -25, None)],
    "arvin.natividad@urc.com.ph": [("SECURI_BANK_CORPOR", -400, -60), ("UNIVER_ROBINA_CORPOR", -60, None)],
}

# 4 multiple-choice questions per quiz, taken from frontend/src/data/quizDatabase.js: (question, options, correct index, explanation)
ACT_QUESTIONS = {'act-1': [('In Agile Project Management, what is the primary operational objective of the Daily Standup '
            'ceremony?',
            ['Estimate annual resource budgets',
             'Synchronize team progress and identify blockers within 15 minutes',
             'Conduct individual formal performance appraisals',
             'Deliver finalized stakeholder status invoices'],
            1,
            'Daily Standup ensures rapid team synchronization and early blocker identification within a '
            'strict 15-minute timebox.'),
           ('In the Scrum framework, who possesses sole authority to cancel a Sprint prior to its scheduled '
            'completion?',
            ['Scrum Master',
             'Development Team Lead',
             'Product Owner',
             'Project Management Office (PMO) Director'],
            2,
            'Only the Product Owner has the authority to cancel a Sprint, typically if the sprint goal '
            'becomes obsolete.'),
           ('What is the primary operational purpose of a Project Retrospective ceremony?',
            ['Determine salary adjustments for the iteration',
             'Inspect team dynamics and adapt processes for continuous operational improvement',
             'Bill corporate clients for completed story points',
             'Lock code repositories permanently'],
            1,
            'Retrospectives empower the team to reflect on recent work and implement concrete process '
            'improvements for upcoming sprints.'),
           ('What Agile ceremony is dedicated to sizing backlog user stories and clarifying acceptance '
            'criteria before sprint planning?',
            ['Backlog Refinement / Grooming', 'Sprint Review', 'Sprint Retrospective', 'Daily Scrum'],
            0,
            'Backlog Refinement ensures user stories are estimated, clear, and ready for upcoming sprint '
            'planning.')],
 'act-2': [('In the Crossworks CONNECT executive communication framework, what is the crucial initial step '
            'in high-stakes negotiations?',
            ['State bottom-line budget immediately',
             'Establish rapport and diagnose underlying stakeholder interests',
             'Issue a formal legal ultimatum',
             'Delegate communication entirely to junior staff'],
            1,
            'Diagnosing stakeholder interests before stating rigid positions builds trust and reveals shared '
            'value opportunities.'),
           ('Which communication channel possesses the highest information richness for resolving '
            'high-friction cross-functional disputes?',
            ['Company-wide text broadcast',
             'Face-to-face or interactive video dialogue',
             'Automated system email notification',
             'Shared spreadsheet comment thread'],
            1,
            'Face-to-face and interactive dialogue provides rich non-verbal cues, tone feedback, and rapid '
            'clarification.'),
           ('In active listening, what technique involves restating the speaker emotional state and core '
            'message in your own words?',
            ['Passive reception', 'Reflective paraphrasing', 'Defensive rebuttal', 'Selective silence'],
            1,
            'Reflective paraphrasing confirms mutual understanding and demonstrates genuine empathy.'),
           ('When presenting high-level strategic proposals to executive decision-makers, what approach is '
            'most persuasive?',
            ['Reading every bullet point verbatim from 40 technical slides',
             'Focusing on quantifiable business outcomes, revenue impact, and strategic risk mitigations',
             'Withholding all financial projections until the final slide',
             'Debating defensive points during introductory remarks'],
            1,
            'Executives prioritize decision-oriented briefs centered on financial ROI, strategic alignment, '
            'and risk management.')],
 'act-3': [('In the internationally recognized GROW coaching model, what does the letter R signify?',
            ['Reporting metrics',
             'Reality - objectively assessing the current situation',
             'Reimbursement',
             'Reprimand'],
            1,
            'Reality explores the coachee current situation, challenges, and factual context without '
            'imposing subjective judgment.'),
           ('Under Situational Leadership theory, which leadership style is most effective for an employee '
            'who possesses high competence and high commitment?',
            ['Directing / Telling (S1)',
             'Coaching / Selling (S2)',
             'Supporting / Participating (S3)',
             'Delegating (S4)'],
            3,
            'Delegating (S4) empowers highly competent and committed individuals with autonomy and '
            'operational trust.'),
           ('When transitioning from individual contributor to team supervisor, what represents the primary '
            'mindset shift?',
            ['Completing technical tasks faster than all subordinates',
             'Achieving operational outcomes by developing, empowering, and coaching others',
             'Retaining exclusive control over all task execution',
             'Avoiding transparent communication with team members'],
            1,
            'Supervision shifts focus from individual task execution to organizational enablement, team '
            'coaching, and strategic alignment.'),
           ('Under situational leadership theory, what style combines high directive behavior with high '
            'supportive behavior?',
            ['Coaching / Selling', 'Delegating', 'Laissez-faire', 'Autocratic directing'],
            0,
            'Coaching (S2) balances direct guidance with high personal support and two-way dialogue.')],
 'act-4': [('According to the ISO 31000 international standard, how is Risk formally defined?',
            ['An inevitable financial loss',
             'The effect of uncertainty on objectives',
             'A catastrophic natural disaster event',
             'An unmonitored software outage exceeding 4 hours'],
            1,
            'ISO 31000 formally defines risk as the effect of uncertainty on organizational objectives.'),
           ('In enterprise risk assessment matrices, what two fundamental dimensions calculate the overall '
            'risk rating score?',
            ['Headcount and office footprint',
             'Likelihood (Probability) and Impact (Consequence)',
             'Network latency and disk capacity',
             'Employee turnover and market inflation'],
            1,
            'Risk Severity is calculated by evaluating the Likelihood of occurrence against the magnitude of '
            'operational Impact.'),
           ('What differentiates Recovery Point Objective (RPO) from Recovery Time Objective (RTO)?',
            ['RPO measures maximum tolerable data loss in time, while RTO measures system downtime duration',
             'RPO and RTO are completely identical metrics',
             'RPO applies only to physical hardware fire drills',
             'RTO measures financial penalties in local currency'],
            0,
            'RPO defines allowable data loss tolerance (e.g., backup frequency), whereas RTO defines '
            'allowable system downtime duration.'),
           ('When treating an identified risk, choosing to purchase commercial insurance against asset loss '
            'is an example of which risk response strategy?',
            ['Risk Transfer', 'Risk Avoidance', 'Risk Acceptance', 'Risk Mitigation'],
            0,
            'Purchasing insurance or contracting third-party guarantees transfers financial risk exposure to '
            'another party.')]}

CLEAN_SQL = [
    ("certificates", "DELETE FROM certificates WHERE record_id IN (SELECT id FROM training_records WHERE id LIKE 'rec-demot-%')", {}),
    ("record versions", "DELETE FROM training_record_versions WHERE record_id IN (SELECT id FROM training_records WHERE id LIKE 'rec-demot-%')", {}),
    ("training records", "DELETE FROM training_records WHERE id LIKE 'rec-demot-%'", {}),
    ("trainer assignments", "DELETE FROM trainer_assignments WHERE session_id IN (SELECT id FROM training_sessions WHERE session_code LIKE 'DEMOT-%')", {}),
    ("sessions", "DELETE FROM training_sessions WHERE session_code LIKE 'DEMOT-%'", {}),
    ("company history", "DELETE FROM trainee_affiliations WHERE trainee_id IN (SELECT id FROM trainees WHERE email = ANY(:emails))", {"emails": list(HISTORY)}),
    ("program grants", "DELETE FROM trainer_programs WHERE assigned_by = :tag", {"tag": GRANT_TAG}),
]


def remove_demo(db):
    return {label: db.execute(text(sql), params).rowcount for label, sql, params in CLEAN_SQL}


def fill_quizzes(db):
    for qid, course_name in QUIZ_COURSE.items():
        quiz = db.query(Quiz).filter(Quiz.id == qid).first()
        course = db.query(Course).filter(Course.name == course_name).first()
        if not quiz or not course:
            print(f"  ! quiz {qid} or course '{course_name}' not found, skipped")
            continue
        quiz.course_id = course.id
        quiz.session_id = None
        have = db.query(QuizQuestion.id).filter(QuizQuestion.quiz_id == qid).count()
        if have:
            print(f"  {qid}: course set to {course_name}; already has {have} questions")
            continue
        for q_text, opts, ans, expl in ACT_QUESTIONS[qid]:
            qq = QuizQuestion(quiz_id=qid, question_text=q_text, options=list(opts), correct_answer=ans,
                              explanation=expl, points=10)
            db.add(qq)
            db.flush()
            db.add(QuizAnswerKey(question_id=qq.id, correct_answer=ans, explanation=expl))
        print(f"  {qid}: {quiz.title} -> {course_name}, {len(ACT_QUESTIONS[qid])} questions added")


def apply_history(db, trainee, history, companies, base):
    last = companies[history[-1][0]]
    if trainee.current_company_id != last.id:
        print(f"  ! {trainee.email}: current company is not {last.code}, history skipped")
        return False
    db.query(TraineeAffiliation).filter(TraineeAffiliation.trainee_id == trainee.id).delete()
    for code, frm, to in history:
        db.add(TraineeAffiliation(
            trainee_id=trainee.id, company_id=companies[code].id,
            valid_from=base + timedelta(days=frm), valid_to=(base + timedelta(days=to)) if to is not None else None))
    return True


def main():
    db = sessionmaker(bind=admin_engine)()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    base = now.replace(hour=1, minute=0, second=0, microsecond=0)
    try:
        print("Removed existing demo data:", remove_demo(db))
        if REMOVE:
            finish(db)
            return

        trainer = db.query(User).filter(User.email == LEAD_TRAINER_EMAIL, User.role == "trainer").first()
        if not trainer:
            sys.exit(f"Lead trainer {LEAD_TRAINER_EMAIL} not found.")
        companies = {c.code: c for c in db.query(ClientCompany).all()}
        wanted = {code for h in HISTORY.values() for code, _, _ in h}
        wanted |= {c for needs in NEEDS.values() for _, _, c in needs if c}
        missing = sorted(wanted - set(companies))
        if missing:
            sys.exit(f"Client companies not found: {missing}")

        # 1. Real quizzes: course + questions
        print("Quizzes:")
        fill_quizzes(db)

        # 2. Lead trainer program scope = every course that has a pilot session
        pilot_courses = [c for (c,) in db.execute(text(
            "SELECT DISTINCT course_id FROM training_sessions WHERE session_code LIKE 'SESS-2026-%' AND course_id IS NOT NULL")).fetchall()]
        granted = {p.course_id for p in db.query(TrainerProgram).filter(TrainerProgram.user_id == trainer.id).all()}
        added = 0
        for cid in pilot_courses:
            if cid not in granted:
                db.add(TrainerProgram(user_id=trainer.id, course_id=cid, assigned_by=GRANT_TAG))
                added += 1
        print(f"Program grants added for the lead trainer: {added}")

        # 3. Real trainees by email
        trainees = {}
        for email in NEEDS:
            t = db.query(Trainee).filter(Trainee.email == email).first()
            if not t:
                print(f"  ! trainee {email} not found, skipped")
                continue
            trainees[email] = t
        for email, hist in HISTORY.items():
            if email in trainees and apply_history(db, trainees[email], hist, companies, base):
                print(f"  history {email}: " + " -> ".join(c for c, _, _ in hist))
        db.flush()

        # 4. Demo sessions on real courses
        used = sorted({k for needs in NEEDS.values() for _, k, _ in needs})
        sessions = {}
        for key in used:
            stage, offset, course_name = SESSION_PLAN[key]
            course = db.query(Course).filter(Course.name == course_name).first()
            if not course:
                sys.exit(f"Course not found: {course_name}")
            start = base + timedelta(days=offset)
            end = start + timedelta(days=2)
            signed = stage != "In progress"
            s = TrainingSession(
                session_code=f"DEMOT-{key}", course_id=course.id, course_name=course.name,
                start_date=start, end_date=end, delivery_type="Public", delivery_mode="F2F",
                venue="Crossworks Corporate Training Center, Makati", trainer_signed_off=signed,
                trainer_sign_off_at=end if signed else None,
                trainer_sign_off_user_id=trainer.id if signed else None,
                trainer_sign_off_notes="Demo session" if signed else None)
            db.add(s)
            db.flush()
            db.add(TrainerAssignment(user_id=trainer.id, session_id=s.id, valid_from=start - timedelta(days=7)))
            sessions[key] = (s, course)

        # 5. Records for the real trainees
        n = 0
        for email, needs in NEEDS.items():
            t = trainees.get(email)
            if not t:
                continue
            have = {(st, cid) for (st, cid) in db.query(TrainingRecord.status, TrainingRecord.company_at_completion_id).filter(
                TrainingRecord.trainee_id == t.id, TrainingRecord.deleted_at == None).all()}
            for status, key, company_code in needs:
                sess, course = sessions[key]
                company = companies[company_code] if company_code else db.query(ClientCompany).filter(
                    ClientCompany.id == t.current_company_id).first()
                if not company:
                    print(f"  ! {email}: no company, skipped")
                    continue
                if (status, company.id) in have:
                    print(f"  {email}: already has {status} at {company.code}, skipped")
                    continue
                n += 1
                attendance = {"Completed": "Present", "Not completed": "Absent",
                              "In progress": "Present" if key == "P-PME" else None}[status]
                score = round(82.0 + (n * 4) % 17, 1) if status == "Completed" else None
                completion = sess.end_date if status == "Completed" else None
                policy = cpabe_engine.build_record_policy(
                    company_code=company.code, session_code=sess.session_code, trainee_code=t.trainee_code)
                payload = {
                    "trainee_name": f"{t.first_name} {t.last_name}", "trainee_email": t.email,
                    "company": company.name, "course": course.name, "session_code": sess.session_code,
                    "status": status, "attendance_status": attendance, "score": score,
                    "completion_date": completion.isoformat() if completion else None}
                enc = cpabe_engine.encrypt_record(payload, policy, record_id=f"rec-{t.trainee_code}", version=1)
                rec = TrainingRecord(
                    id=f"rec-demot-{n:03d}", trainee_id=t.id, session_id=sess.id,
                    company_at_completion_id=company.id, course_name=course.name, status=status,
                    attendance_status=attendance, completion_date=completion, score=score,
                    encryption_policy=policy, policy_version=1, abe_ciphertext=enc.get("abe_ciphertext"),
                    payload_ciphertext=enc.get("payload_ciphertext"), nonce=enc.get("nonce"), is_encrypted=True)
                db.add(rec)
                db.flush()
                if status == "Completed":
                    tla = course.acronym_3 or "".join(ch for ch in course.name.upper() if ch.isalnum())[:3]
                    serial = generate_cert_serial(db, course_tla=tla, training_date=sess.start_date,
                                                  company_code=company.code)
                    db.add(Certificate(
                        record_id=rec.id, trainee_id=t.id,
                        title=f"Certificate of Completion - {course.name}", serial_number=serial,
                        issue_date=sess.end_date, expiry_date=None,
                        expiry_basis="Non-expiring completion certificate", status="Valid"))
                    db.flush()
                print(f"  {t.trainee_code} {t.first_name} {t.last_name}: {status:13s} {sess.session_code}  {company.code}")

        db.flush()
        attribute_manager.issue_or_rekey_user(db=db, user=trainer, commit=False)
        print(f"\nNew records: {n}")
        finish(db)
    except SystemExit:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def finish(db):
    if APPLY:
        db.commit()
        print("\n>>> COMMITTED")
    else:
        db.rollback()
        print("\n>>> DRY RUN ONLY, rolled back. Re-run with --apply to commit.")


if __name__ == "__main__":
    main()
```

## 3. `backend/app/api/endpoints/gamification.py` (Admin course dropdown)

In `list_quiz_courses`, change the docstring `Admin: all.` to `Admin: courses with a session or a quiz.` and replace:

```python
    q = db.query(Course).order_by(Course.name)
    if scope is not None:
        if not scope[1]:
            return []
        q = q.filter(Course.id.in_(scope[1]))
```

with:

```python
    q = db.query(Course).order_by(Course.name)
    if scope is None:
        # Admin: only courses that are actually run (have a session) or already have a quiz.
        active = {c for (c,) in db.query(TrainingSession.course_id).filter(TrainingSession.course_id != None).distinct().all()}
        active |= {c for (c,) in db.query(Quiz.course_id).filter(Quiz.course_id != None).distinct().all()}
        if not active:
            return []
        q = q.filter(Course.id.in_(active))
    else:
        if not scope[1]:
            return []
        q = q.filter(Course.id.in_(scope[1]))
```

## 4. `frontend/src/trainer/pages/Quiz.jsx` (only courses that have quizzes)

- Replace the grouping block (`const byCourse = {};` through `const quizGroups = Object.entries(byCourse);`) with:

```js
  const byCourse = {};
  (quizzes || []).forEach((q) => { (byCourse[q.course || 'Unassigned'] ||= []).push(q); });
  const quizGroups = Object.entries(byCourse).sort((a, b) => a[0].localeCompare(b[0]));
```

- Delete the whole block that starts `{items.length === 0 && (` and ends with its closing `)}` (the "No quizzes in this course yet. Create the first one below." hint).
- Directly above `{quizGroups.map(([course, items]) => (` add:

```jsx
          {quizGroups.length === 0 && (
            <small style={{ display: 'block', padding: '6px 4px', color: isDark ? '#94a3b8' : '#64748b' }}>
              No quizzes yet. Select a course below to create the first one.
            </small>
          )}
```

- In `scopeLabel` change `'GLOBAL SCOPE · all courses'` to `'GLOBAL SCOPE · courses with sessions or quizzes'`.

## 5. `backend/scripts/seed_pilot_data.py` (Round 9 leftover, one line)

In the `quiz = Quiz(` block (around line 494) replace `session_id=target_sess.id,` with `course_id=target_sess.course_id,`. Do not touch the other `session_id=target_sess.id,` (around line 551, it belongs to `TrainingRecord`).

## 6. `frontend/src/contexts/AuthContext.jsx`

**a) Correct trainee codes** (display only, shown in the Sidebar). Replace exactly:
- `trainee_code: "TRN-8015",` with `trainee_code: "TRN-8098",` (Rafael)
- `trainee_code: "TRN-8032",` with `trainee_code: "TRN-8114",` (Rowena)
- `trainee_code: "TRN-8049",` with `trainee_code: "TRN-8050",` (Joshua)
- `trainee_code: "TRN-8139",` with `trainee_code: "TRN-8138",` (Arvin)
- `trainee_code: "TRN-8071",` with `trainee_code: "TRN-8034",` (Camille)
- `trainee_code: "TRN-8088",` with `trainee_code: "TRN-8062",` (Vincent)

**b) Company history for the three multi-company personas.** Replace exactly:
- `assigned_companies: ["AMIHAN_SOLUTI"],` with `assigned_companies: ["AMIHAN_SOLUTI", "IPROY_SERVI"],` (Rafael)
- `assigned_companies: ["EWALIC"],` with `assigned_companies: ["EWALIC", "ROP"],` (Rowena)
- `assigned_companies: ["UNIVER_ROBINA_CORPOR"],` with `assigned_companies: ["UNIVER_ROBINA_CORPOR", "SECURI_BANK_CORPOR"],` (Arvin)

(Each of these strings occurs once in the file, inside `DEMO_USERS`.)

**c) Status-mix constant.** Directly above `export function normalizeRole(role) {` add:

```js
// Record-status mix each trainee persona has in the demo data (see backend/seed_demo_real_accounts.py).
export const DEMO_STATUS_MIX = {
  trainee: ['Completed', 'In progress'],
  trainee_ricardo: ['Completed', 'Not completed'],
  trainee_bea: ['Completed', 'Not completed', 'In progress'],
  trainee_rafael: ['Completed', 'In progress'],
  trainee_rowena: ['Completed', 'Not completed', 'In progress'],
  trainee_joshua: ['Completed', 'Not completed', 'In progress'],
  trainee_arvin: ['Completed', 'Not completed'],
  trainee_camille: ['Completed', 'In progress'],
  trainee_vincent: ['Completed', 'Not completed']
};
```

## 7. `frontend/src/components/DevRoleSwitcherModal.jsx`

- Import: change `import { useAuth } from '../contexts/AuthContext';` to `import { useAuth, DEMO_STATUS_MIX } from '../contexts/AuthContext';`.
- In the `companies` array, directly after the `{ id: 'ROP', label: 'Red Oak Properties' }` entry add a comma and:

```js
    { id: 'ISLA_LPG_CORPOR', label: 'Isla LPG' },
    { id: 'UNIVER_ROBINA_CORPOR', label: 'Universal Robina' },
    { id: 'BIBSP', label: 'Boehringer Ingelheim' },
    { id: 'AYALA_LAND_INC', label: 'Ayala Land' },
    { id: 'SECURI_BANK_CORPOR', label: 'Security Bank' }
```

- Change the header text `across all 5 pilot companies.` to `across the pilot companies.`
- In the badges row, directly **before** the line `{u.streak !== undefined && (`, add:

```jsx
                  {u.role === 'trainee' && (u.assigned_companies || []).length > 1 && (
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: '800',
                      background: '#e0e7ff', color: '#4338ca', border: '1px solid #a5b4fc'
                    }}>
                      {u.assigned_companies.length} companies
                    </span>
                  )}
                  {(DEMO_STATUS_MIX[u.key] || []).map((s) => (
                    <span key={s} style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: '700',
                      background: s === 'Completed' ? '#dcfce7' : s === 'Not completed' ? '#fee2e2' : '#fef3c7',
                      color: s === 'Completed' ? '#15803d' : s === 'Not completed' ? '#b91c1c' : '#b45309'
                    }}>
                      {s}
                    </span>
                  ))}
```

The existing company pill filter already matches `assigned_companies`, so Rafael appears under both Amihan and IPRoyal, and so on.

## 8. `frontend/src/components/LoginView.jsx`

- In `roleList`, delete the four hardcoded trainee lines (`key: 'trainee'`, `'trainee_ricardo'`, `'trainee_bea'`, `'trainee_rafael'`). After the `trainer` line (it keeps its trailing comma) add:

```js
    ...Object.entries(DEMO_USERS)
      .filter(([, u]) => u.role === 'trainee')
      .map(([key, u]) => ({
        key,
        title: `Trainee · ${u.organization}`,
        name: u.name,
        org: `${u.company_code} • ${u.trainee_code}`,
        icon: Award,
        badgeClass: 'trainee'
      }))
```

(`DEMO_USERS` is already destructured from `useAuth()` here, and `Award` is already imported.) The array's closing `];` stays.

- Change `<div className="demo-roles-stack">` to `<div className="demo-roles-stack" style={{ maxHeight: '52vh', overflowY: 'auto' }}>`.

## 9. Finish

```bash
python -m py_compile backend/scripts/purge_test_courses.py backend/seed_demo_real_accounts.py backend/app/api/endpoints/gamification.py
git add -A && git commit -m "Round 10 v2: real-account demo data, filled quizzes, test-course purge, dev-switch fixes" && git push
```

No tests, no docker, no app run, and do not run the scripts.

---

## Manual checks for you (not for Antigravity), in this order

1. **Fresh backup**, then apply migration 008 as the superuser (it is not in your backup yet):
   `docker exec -i <postgres-container> psql -U postgres -d <db> < backend/migrations/008_quiz_course_scope.sql`
2. **Purge the test data.** Copy and dry-run first:
   `docker cp backend/scripts/purge_test_courses.py <backend-container>:/app/` then
   `docker exec <backend-container> python purge_test_courses.py`
   Expect about 162 test sessions and 47 test courses, "Courses remaining: 34". If the numbers look different, stop and send me the output. Then `--apply`.
3. **Seed.** `docker cp backend/seed_demo_real_accounts.py <backend-container>:/app/`, run it without flags (dry run), check the list, then `--apply`. Undo the demo records with `--remove --apply` (quiz questions stay).
4. **Restart the backend**, then verify: `SELECT id, title, course_id, (SELECT count(*) FROM quiz_questions q WHERE q.quiz_id = quizzes.id) AS questions FROM quizzes;` shows act-1 to act-4 with a course and 4 questions each.
5. **Admin Quizzes and Teams.** The dropdown lists about 11 courses (not 81) and the list shows only courses that have quizzes.
6. **Trainer (Jordan Ramos).** Quizzes and Teams shows act-1 to act-4 with 4 questions each. The Sessions board also shows the `DEMOT-P*` sessions (running, unsigned); that is expected.
7. **Trainee quiz tabs** (approved quizzes of enrolled courses): Andrea sees act-3; Bea sees act-1, act-2, act-3; Rafael act-1 and act-3; Rowena act-2 and act-4; Joshua act-1 and act-4; Arvin act-2 and act-3; Ricardo act-3 and act-4; Camille and Vincent act-4. Trainees on courses without a quiz (for example only "PMP Review") still see an empty tab; the other 7 real courses have no quiz content yet.
8. **Multi-company trainees.** Rafael, Rowena and Arvin show two companies in "My Trainings" with the company filter. Dev switcher: 9 trainee cards with status chips, three marked "2 companies".
9. **Account Managers** (real assignments): `joey.sales@crossworks.ph` decrypts Rafael's Amihan record and Rowena's EWALIC record; Brian decrypts Rafael's IPRoyal record and Arvin's Security Bank record; Sharon decrypts Rowena's Red Oak record and Arvin's Universal Robina record. Erika sees none (no assignments, see root cause 6).
10. **Company switch** as Admin through the Record Vault transfer form on any of the three; old records keep their original company.

## Not in this round

- **Quiz questions of other types** (identification, sequence, matching): the database only stores multiple choice, so only the 4 multiple-choice questions per quiz are loaded.
- **Quizzes for the other 7 real courses** (PMP Review, CAPM, Negotiating, Strategic Management Tools, Customized Program, Innovation, and so on) need real questions from Crossworks; not invented here.
- **Account Manager assignments** (Erika has none; the dev switcher lists her with VHL, ROP, EWALIC; `DEMO_USERS` for Sharon, Brian and Erika does not match the database). Tell me which assignments Erika should have and I'll add it.
- **Real trainers other than Jordan** (Billy, Jobert, Owen, `joey.trainer@`) have no sessions; the pilot CSVs have no trainer column to assign from.
- **Company-staff accounts** (`staff@vertiv.com` and the other four) are not in the dev switcher.
- **Quiz attempts and scores** for the demo trainees and lazy question loading: Round 11.
