"""Seed demo data on the real pilot accounts so every role switcher persona is testable.

    python seed_demo_real_accounts.py                 # dry run, rolls back
    python seed_demo_real_accounts.py --apply         # commit
    python seed_demo_real_accounts.py --remove --apply  # undo demo sessions, quizzes, attempts & status edits

Optional flags:
    --erika-accounts VHL,AOS,ISLA_LPG_CORPOR          # override Erika Bana's assigned client codes
"""
import json
import re
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.database import admin_engine
from app.models.entities import (
    User, ClientCompany, Course, Trainee, TrainingSession, TrainingRecord,
    TrainerAssignment, TrainerProgram, AccountManagerAssignment,
    Quiz, QuizQuestion, QuizAnswerKey, QuizAttempt, GamificationProgress
)
from app.crypto.cpabe_engine import cpabe_engine
from app.crypto.attribute_manager import attribute_manager

APPLY = "--apply" in sys.argv
REMOVE = "--remove" in sys.argv

TRAINER_EMAIL = "jordan.ramos@crossworks.ph"

# Default unassigned enterprise portfolio for Erika Bana (from pilot_sessions.csv 'Quel' rows)
DEFAULT_ERIKA_ACCOUNTS = [
    "VHL",
    "AOS",
    "ISLA_LPG_CORPOR",
    "ANALOG_DEVICE_INC",
    "MOS",
    "OCEANA_PHILS_INC",
    "LAARNI_UYCHUT",
]


def _get_erika_accounts() -> list[str]:
    for idx, arg in enumerate(sys.argv):
        if arg == "--erika-accounts" and idx + 1 < len(sys.argv):
            return [c.strip().upper() for c in sys.argv[idx + 1].split(",") if c.strip()]
    return list(DEFAULT_ERIKA_ACCOUNTS)


# 6 DEMO sessions for Jordan Ramos -> 3 "Needs Attendance", 3 "Awaiting Sign-off".
# Every course name is a real course in `courses`.
DEMO_SESSIONS = [
    # (session_code, stage, day_offset, course_name, company_codes_to_pull_trainees_from)
    ("DEMO-NA-01", "needs",     1, "Supervisory Upskilling Program for Excellent", ["VHL", "IPROY_SERVI", "ROP"]),
    ("DEMO-NA-02", "needs",     0, "Project Management Essentials",                ["ROP", "PHILIP_SAVING_BANK", "NSE"]),
    ("DEMO-NA-03", "needs",     3, "Business Strategy Simulatuon",                 ["EWALIC", "AMIHAN_SOLUTI"]),
    ("DEMO-AW-01", "awaiting", -4, "Supervisory Upskilling Program for Excellent", ["IPROY_SERVI", "ROP", "VHL"]),
    ("DEMO-AW-02", "awaiting", -3, "Certified Associate in Project Management (CAPM)", ["BIBSP", "AOS", "EMS"]),
    ("DEMO-AW-03", "awaiting", -6, "Negotiating for Results",                      ["ISLA_LPG_CORPOR", "WCD"]),
]

# Additional real trainers and their specialized course/session assignments
ADDITIONAL_TRAINER_SPECS = {
    "joey.trainer@crossworks.ph": {
        "job_title": "Lead Trainer: Agile PME & Project Management",
        "course_names": [
            "Agile PME",
            "Project Management Essentials",
            "PMP Review (Saturdays)",
            "PMP Review (Weekdays)",
            "Certified Associate in Project Management (CAPM)",
        ],
        "session_prefixes": ("SESS-2026-PMP-", "SESS-2026-CAP-", "SESS-2026-PME-", "DEMO-NA-02", "DEMO-AW-02"),
    },
    "billy@crossworks.ph": {
        "job_title": "Lead Trainer: CONNECT & Executive Comm",
        "course_names": [
            "CONNECT",
            "Negotiating for Results",
            "Business Strategy Simulatuon",
            "Strategic Management Tools",
            "Mastering Business Presentation Skills",
        ],
        "session_prefixes": ("SESS-2026-NFR-", "SESS-2026-BSS-", "SESS-2026-SMT-", "DEMO-NA-03", "DEMO-AW-03"),
    },
    "jobert@crossworks.ph": {
        "job_title": "Lead Trainer: High-Impact Coaching",
        "course_names": [
            "Coaching",
            "Supervisory Upskilling Program for Excellent",
            "Innovation through Design Thinking",
            "Impactful Leadership",
            "Management Development Program",
        ],
        "session_prefixes": ("SESS-2026-SUP-", "SESS-2026-IDT-", "DEMO-NA-01", "DEMO-AW-01"),
    },
    "owen@crossworks.ph": {
        "job_title": "Lead Trainer: Business Continuity (BCM)",
        "course_names": [
            "Business Continuity Management Essentials",
            "ISO 31000 CRM",
            "Customized Program",
            "Enterprise Risk Management",
            "Compliance Management Systems",
        ],
        "session_prefixes": ("SESS-2026-CRM-", "SESS-2026-XXX-", "DEMO-NA-03", "DEMO-AW-03"),
    },
}

# Status mix on the 9 DEMO_USERS trainees' existing SESS-2026-* records.
# Keyed by email -> list of statuses applied in session start_date order.
DEMO_MIX = {
    "andrea.aguilar@vertiv.com":               ["Completed", "In progress"],
    "ricardo.ocampo@iproyal.com":              ["Completed", "Not completed"],
    "bea.macaraeg@iproyal.com":                ["Completed", "In progress"],
    "rafael.dizon@amihansolutions.com":        ["Completed", "In progress", "Not completed"],
    "rowena.cabrera@ewageas.com":              ["Completed", "In progress"],
    "jjavier@islalpg.com":                     ["Completed", "Not completed"],
    "arvin.natividad@urc.com.ph":              ["Completed", "In progress"],
    "camille.morales@boehringer-ingelheim.com":["Completed", "In progress", "Not completed"],
    "santos.vincent@ayalaland.com.ph":         ["Completed", "In progress"],
}

# Extra courses to enroll each single-record demo trainee into (using real SESS-2026-* sessions)
# so every demo trainee has 2-3 records and can see the status mix on their own My Trainings page.
EXTRA_ENROLMENTS = {
    "andrea.aguilar@vertiv.com":                ["Project Management Essentials"],
    "ricardo.ocampo@iproyal.com":               ["Project Management Essentials"],
    "bea.macaraeg@iproyal.com":                 ["Negotiating for Results"],
    "rafael.dizon@amihansolutions.com":         ["Project Management Essentials", "ISO 31000 CRM"],
    "rowena.cabrera@ewageas.com":               ["Supervisory Upskilling Program for Excellent"],
    "jjavier@islalpg.com":                      ["Supervisory Upskilling Program for Excellent"],
    "arvin.natividad@urc.com.ph":               ["Project Management Essentials"],
    "camille.morales@boehringer-ingelheim.com": ["Supervisory Upskilling Program for Excellent", "Project Management Essentials"],
    "santos.vincent@ayalaland.com.ph":          ["Project Management Essentials"],
}

# Map the 4 quizzes in frontend/src/data/quizDatabase.js to real courses that have sessions & trainees.
QUIZ_TO_COURSE = {
    "act-1":  "Project Management Essentials",
    "act-2":  "Negotiating for Results",
    "act-3":  "Supervisory Upskilling Program for Excellent",
    "act-4":  "ISO 31000 CRM",
    "act-5":  "PMP Review (Saturdays)",
    "act-6":  "PMP Review (Weekdays)",
    "act-7":  "Certified Associate in Project Management (CAPM)",
    "act-8":  "Strategic Management Tools",
    "act-9":  "Customized Program",
    "act-10": "Business Strategy Simulatuon",
    "act-11": "Innovation through Design Thinking",
}

# Demo trainee quiz attempts and gamification stats (Round 11).
# Note: We intentionally leave at least one enrolled quiz unattempted per trainee so they can also take a live quiz.
DEMO_QUIZ_ATTEMPTS = {
    "andrea.aguilar@vertiv.com": {
        "points": 13500, "level": 4, "streak": 8,
        "badges": ["FIRST_STEP", "STREAK_3", "STREAK_7", "PERFECT_SCORE"],
        "attempts": [("act-3", 100.0, 200)],  # act-1 left open for live play
    },
    "ricardo.ocampo@iproyal.com": {
        "points": 10200, "level": 3, "streak": 6,
        "badges": ["FIRST_STEP", "STREAK_3"],
        "attempts": [("act-3", 90.0, 180)],   # act-1 left open for live play
    },
    "bea.macaraeg@iproyal.com": {
        "points": 14800, "level": 5, "streak": 11,
        "badges": ["FIRST_STEP", "STREAK_3", "STREAK_7", "PERFECT_SCORE", "QUIZ_MASTER"],
        "attempts": [("act-3", 100.0, 200), ("act-2", 95.0, 190)],
    },
    "rafael.dizon@amihansolutions.com": {
        "points": 8100, "level": 2, "streak": 4,
        "badges": ["FIRST_STEP", "STREAK_3"],
        "attempts": [("act-1", 85.0, 170)],   # act-4 left open for live play
    },
    "rowena.cabrera@ewageas.com": {
        "points": 12400, "level": 4, "streak": 9,
        "badges": ["FIRST_STEP", "STREAK_3", "STREAK_7"],
        "attempts": [("act-3", 95.0, 190)],
    },
    "jjavier@islalpg.com": {
        "points": 9900, "level": 3, "streak": 5,
        "badges": ["FIRST_STEP", "STREAK_3"],
        "attempts": [("act-2", 90.0, 180)],   # act-3 left open for live play
    },
    "arvin.natividad@urc.com.ph": {
        "points": 11800, "level": 3, "streak": 7,
        "badges": ["FIRST_STEP", "STREAK_3", "STREAK_7"],
        "attempts": [("act-1", 90.0, 180)],
    },
    "camille.morales@boehringer-ingelheim.com": {
        "points": 14200, "level": 4, "streak": 10,
        "badges": ["FIRST_STEP", "STREAK_3", "STREAK_7"],
        "attempts": [("act-3", 95.0, 190)],   # act-1 left open for live play
    },
    "santos.vincent@ayalaland.com.ph": {
        "points": 10500, "level": 3, "streak": 6,
        "badges": ["FIRST_STEP", "STREAK_3"],
        "attempts": [("act-1", 85.0, 170)],
    },
}


def _reencrypt(db, rec: TrainingRecord, trainee: Trainee, company: ClientCompany, sess: TrainingSession):
    pol = cpabe_engine.build_record_policy(
        company_code=company.code, session_code=sess.session_code, trainee_code=trainee.trainee_code)
    payload = {
        "score": rec.score,
        "trainee_name": f"{trainee.first_name} {trainee.last_name}",
        "trainee_email": trainee.email,
        "company": company.name,
        "course": rec.course_name,
        "session_code": sess.session_code,
        "completion_date": rec.completion_date.date().isoformat() if rec.completion_date else None,
    }
    enc = cpabe_engine.encrypt_record(payload, pol, record_id=f"rec-{trainee.trainee_code}", version=1)
    rec.encryption_policy = pol
    rec.abe_ciphertext = enc.get("abe_ciphertext")
    rec.payload_ciphertext = enc.get("payload_ciphertext")
    rec.nonce = enc.get("nonce")
    rec.is_encrypted = True


def _apply_status(db, rec: TrainingRecord, status: str, idx: int):
    trainee = db.get(Trainee, rec.trainee_id)
    company = db.get(ClientCompany, rec.company_at_completion_id)
    sess = db.get(TrainingSession, rec.session_id)
    rec.status = status
    if status == "Completed":
        rec.attendance_status = "Present"
        rec.score = rec.score if (rec.score and rec.score >= 80) else round(84.0 + (idx * 3.1) % 14.0, 1)
        rec.completion_date = sess.end_date if sess else datetime.now(timezone.utc).replace(tzinfo=None)
    elif status == "In progress":
        rec.attendance_status = "Present"
        rec.score = None
        rec.completion_date = None
        db.execute(text("DELETE FROM certificates WHERE record_id = :rid"), {"rid": rec.id})
    else:  # Not completed
        rec.attendance_status = "Absent" if idx % 2 == 0 else "Present"
        rec.score = round(58.0 + (idx * 4.3) % 15.0, 1) if rec.attendance_status == "Present" else None
        rec.completion_date = None
        db.execute(text("DELETE FROM certificates WHERE record_id = :rid"), {"rid": rec.id})
    if trainee and company and sess:
        _reencrypt(db, rec, trainee, company, sess)


EMBEDDED_QUIZ_DATABASE = {'act-1': {'id': 'act-1', 'title': 'Agile PME & Project Management Challenge', 'instructor': 'Instructor not assigned', 'category': 'Project Management', 'headerColor': '#1368ce', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'sec_champ', 'description': 'Master Agile Project Management and PME methodologies. Evaluate project critical paths, agile sprint governance, and earned value metrics under the Crossworks curriculum.', 'learningObjectives': ['Master Agile frameworks, sprint planning, and daily standup workflows', 'Analyze Critical Path Method (CPM) and Earned Value Management (EVM)', 'Inspect retrospective adaptation pipelines and continuous improvement'], 'questions': [{'id': 'q1-1', 'type': 'multiple_choice', 'question': 'In Agile Project Management, what is the primary operational objective of the Daily Standup ceremony?', 'options': ['Estimate annual resource budgets', 'Synchronize team progress and identify blockers within 15 minutes', 'Conduct individual formal performance appraisals', 'Deliver finalized stakeholder status invoices'], 'correctAnswer': 1, 'explanation': 'Daily Standup ensures rapid team synchronization and early blocker identification within a strict 15-minute timebox.'}, {'id': 'q1-2', 'type': 'identification', 'question': 'What project metric represents the ratio of Earned Value (EV) to Planned Value (PV)? (Hint: 3-letter acronym SPI)', 'acceptedAnswers': ['spi', 'schedule performance index'], 'placeholder': 'Enter 3-letter acronym...', 'explanation': 'Schedule Performance Index (SPI = EV / PV) measures project schedule efficiency.'}, {'id': 'q1-3', 'type': 'sequence_order', 'question': 'Arrange the 4 core phases of the Critical Path Method (CPM) and Project Scheduling in correct chronological sequence:', 'correctOrder': ['Define distinct project activities and milestones', 'Establish precedence dependencies and work breakdown structure (WBS)', 'Estimate task durations and identify the critical path', 'Calculate early/late start dates and monitor total float'], 'initialOrder': ['Estimate task durations and identify the critical path', 'Define distinct project activities and milestones', 'Calculate early/late start dates and monitor total float', 'Establish precedence dependencies and work breakdown structure (WBS)'], 'explanation': 'Critical path scheduling begins with defining deliverables, structuring dependencies, estimating durations, and analyzing float along the critical path.'}, {'id': 'q1-4', 'type': 'multiple_choice', 'question': 'In the Scrum framework, who possesses sole authority to cancel a Sprint prior to its scheduled completion?', 'options': ['Scrum Master', 'Development Team Lead', 'Product Owner', 'Project Management Office (PMO) Director'], 'correctAnswer': 2, 'explanation': 'Only the Product Owner has the authority to cancel a Sprint, typically if the sprint goal becomes obsolete.'}, {'id': 'q1-5', 'type': 'multiple_choice', 'question': 'What is the primary operational purpose of a Project Retrospective ceremony?', 'options': ['Determine salary adjustments for the iteration', 'Inspect team dynamics and adapt processes for continuous operational improvement', 'Bill corporate clients for completed story points', 'Lock code repositories permanently'], 'correctAnswer': 1, 'explanation': 'Retrospectives empower the team to reflect on recent work and implement concrete process improvements for upcoming sprints.'}, {'id': 'q1-6', 'type': 'matching', 'question': 'Match each Agile & Project Management artifact in Column A with its exact operational definition in Column B:', 'pairs': [{'id': 'm1-1', 'left': 'Product Backlog', 'right': 'Single prioritized source of requirements for product features'}, {'id': 'm1-2', 'left': 'Sprint Burndown Chart', 'right': 'Visual representation of work remaining versus elapsed sprint time'}, {'id': 'm1-3', 'left': 'Definition of Done (DoD)', 'right': 'Agreed quality checklist required before an increment is shippable'}, {'id': 'm1-4', 'left': 'Work Breakdown Structure', 'right': 'Hierarchical decomposition of total project scope into deliverables'}], 'explanation': 'Backlogs prioritize features, burndown charts track velocity, DoD ensures shippable quality, and WBS scopes deliverables.'}, {'id': 'q1-7', 'type': 'identification', 'question': 'In project cost management, what metric calculates Earned Value (EV) minus Actual Cost (AC)? (Hint: 2 words or CV)', 'acceptedAnswers': ['cost variance', 'cv'], 'placeholder': 'Enter metric name or acronym...', 'explanation': 'Cost Variance (CV = EV - AC) indicates whether a project is over or under budget.'}, {'id': 'q1-8', 'type': 'multiple_choice', 'question': 'What Agile ceremony is dedicated to sizing backlog user stories and clarifying acceptance criteria before sprint planning?', 'options': ['Backlog Refinement / Grooming', 'Sprint Review', 'Sprint Retrospective', 'Daily Scrum'], 'correctAnswer': 0, 'explanation': 'Backlog Refinement ensures user stories are estimated, clear, and ready for upcoming sprint planning.'}]}, 'act-2': {'id': 'act-2', 'title': 'Executive Communication & CONNECT Simulation', 'instructor': 'Instructor not assigned', 'category': 'Executive Leadership', 'headerColor': '#059669', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'crypto_knight', 'description': 'Simulate executive-level communication and high-impact stakeholder negotiations under the Crossworks CONNECT framework. Master the Pyramid Principle and strategic dialogues.', 'learningObjectives': ['Master the CONNECT framework for high-stakes executive negotiations', 'Structure executive briefings using the Pyramid Principle', 'Deploy active listening and reflective paraphrasing across multi-tenant cohorts'], 'questions': [{'id': 'q2-1', 'type': 'multiple_choice', 'question': 'In the Crossworks CONNECT executive communication framework, what is the crucial initial step in high-stakes negotiations?', 'options': ['State bottom-line budget immediately', 'Establish rapport and diagnose underlying stakeholder interests', 'Issue a formal legal ultimatum', 'Delegate communication entirely to junior staff'], 'correctAnswer': 1, 'explanation': 'Diagnosing stakeholder interests before stating rigid positions builds trust and reveals shared value opportunities.'}, {'id': 'q2-2', 'type': 'identification', 'question': 'What executive briefing methodology dictates stating the core recommendation or key finding first, followed by supporting logic? (Hint: 2 words)', 'acceptedAnswers': ['pyramid principle', 'the pyramid principle', 'minto pyramid', 'pyramid'], 'placeholder': 'Enter briefing structure name...', 'explanation': 'The Pyramid Principle structures executive communications top-down, leading directly with the answer/recommendation.'}, {'id': 'q2-3', 'type': 'sequence_order', 'question': 'Arrange the 4 stages of the CONNECT Strategic Stakeholder Alignment process in proper operational sequence:', 'correctOrder': ['Identify key stakeholder personas and their organizational drivers', 'Diagnose conflicting interests and shared business goals', 'Craft tailored value propositions and strategic briefings', 'Facilitate consensus alignment and document agreed commitments'], 'initialOrder': ['Craft tailored value propositions and strategic briefings', 'Identify key stakeholder personas and their organizational drivers', 'Facilitate consensus alignment and document agreed commitments', 'Diagnose conflicting interests and shared business goals'], 'explanation': 'Effective stakeholder alignment requires mapping personas, diagnosing underlying motivations, articulating value, and securing commitments.'}, {'id': 'q2-4', 'type': 'multiple_choice', 'question': 'Which communication channel possesses the highest information richness for resolving high-friction cross-functional disputes?', 'options': ['Company-wide text broadcast', 'Face-to-face or interactive video dialogue', 'Automated system email notification', 'Shared spreadsheet comment thread'], 'correctAnswer': 1, 'explanation': 'Face-to-face and interactive dialogue provides rich non-verbal cues, tone feedback, and rapid clarification.'}, {'id': 'q2-5', 'type': 'multiple_choice', 'question': 'In active listening, what technique involves restating the speaker emotional state and core message in your own words?', 'options': ['Passive reception', 'Reflective paraphrasing', 'Defensive rebuttal', 'Selective silence'], 'correctAnswer': 1, 'explanation': 'Reflective paraphrasing confirms mutual understanding and demonstrates genuine empathy.'}, {'id': 'q2-6', 'type': 'matching', 'question': 'Match each Communication Principle in Column A with its practical executive application in Column B:', 'pairs': [{'id': 'm2-1', 'left': 'Pyramid Principle', 'right': 'Lead with conclusions, followed by structured supporting pillars'}, {'id': 'm2-2', 'left': 'Empathic Inquiry', 'right': 'Clarify unstated concerns through open-ended discovery questions'}, {'id': 'm2-3', 'left': 'Non-Defensive Reframe', 'right': 'Transform critical feedback into collaborative problem-solving'}, {'id': 'm2-4', 'left': 'Executive Cadence', 'right': 'Deliver predictable, concise visual KPI summaries to the C-suite'}], 'explanation': 'Executive clarity requires structured pyramids, empathic questioning, constructive reframing, and predictable cadences.'}, {'id': 'q2-7', 'type': 'identification', 'question': 'What psychological condition describes an environment where team members feel safe to voice concerns, challenge ideas, and admit mistakes without fear of retribution? (Hint: 2 words)', 'acceptedAnswers': ['psychological safety', 'psychological security'], 'placeholder': 'Enter leadership term...', 'explanation': 'Psychological safety is the shared belief that team members will not be embarrassed, rejected, or punished for speaking up.'}, {'id': 'q2-8', 'type': 'multiple_choice', 'question': 'When presenting high-level strategic proposals to executive decision-makers, what approach is most persuasive?', 'options': ['Reading every bullet point verbatim from 40 technical slides', 'Focusing on quantifiable business outcomes, revenue impact, and strategic risk mitigations', 'Withholding all financial projections until the final slide', 'Debating defensive points during introductory remarks'], 'correctAnswer': 1, 'explanation': 'Executives prioritize decision-oriented briefs centered on financial ROI, strategic alignment, and risk management.'}]}, 'act-3': {'id': 'act-3', 'title': 'Supervisory Mastery & High-Impact Coaching', 'instructor': 'Instructor not assigned', 'category': 'Supervisory Mastery', 'headerColor': '#dc2626', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'first_step', 'description': 'Accelerate supervisory upskilling and situational leadership. Implement the GROW coaching model, performance delegation, and constructive feedback loops.', 'learningObjectives': ['Apply the GROW coaching methodology across developmental team dialogues', 'Navigate situational leadership models to delegate with high autonomy', 'Cultivate psychological safety and proactive mistake recovery within supervisory cohorts'], 'questions': [{'id': 'q3-1', 'type': 'multiple_choice', 'question': 'In the internationally recognized GROW coaching model, what does the letter R signify?', 'options': ['Reporting metrics', 'Reality - objectively assessing the current situation', 'Reimbursement', 'Reprimand'], 'correctAnswer': 1, 'explanation': 'Reality explores the coachee current situation, challenges, and factual context without imposing subjective judgment.'}, {'id': 'q3-2', 'type': 'identification', 'question': 'In the GROW coaching model, which stage is dedicated to identifying concrete next actions, accountability, and timelines? (Hint: Will or Way Forward)', 'acceptedAnswers': ['will', 'way forward', 'wrap up', 'what next'], 'placeholder': 'Enter GROW stage name...', 'explanation': 'Will (or Way Forward) commits the coachee to specific, actionable steps, completion timelines, and accountability.'}, {'id': 'q3-3', 'type': 'sequence_order', 'question': 'Arrange the 4 phases of the GROW Coaching Framework in standard coaching order:', 'correctOrder': ['Goal - Define the specific target outcome or developmental aspiration', 'Reality - Explore current challenges, strengths, and factual context', 'Options - Brainstorm all possible pathways, strategies, and resources', 'Will - Commit to concrete actions, measurable milestones, and accountability'], 'initialOrder': ['Options - Brainstorm all possible pathways, strategies, and resources', 'Goal - Define the specific target outcome or developmental aspiration', 'Will - Commit to concrete actions, measurable milestones, and accountability', 'Reality - Explore current challenges, strengths, and factual context'], 'explanation': 'Coaching flows naturally from setting the Goal, exploring Reality, generating creative Options, and securing the Will to act.'}, {'id': 'q3-4', 'type': 'multiple_choice', 'question': 'Under Situational Leadership theory, which leadership style is most effective for an employee who possesses high competence and high commitment?', 'options': ['Directing / Telling (S1)', 'Coaching / Selling (S2)', 'Supporting / Participating (S3)', 'Delegating (S4)'], 'correctAnswer': 3, 'explanation': 'Delegating (S4) empowers highly competent and committed individuals with autonomy and operational trust.'}, {'id': 'q3-5', 'type': 'multiple_choice', 'question': 'When transitioning from individual contributor to team supervisor, what represents the primary mindset shift?', 'options': ['Completing technical tasks faster than all subordinates', 'Achieving operational outcomes by developing, empowering, and coaching others', 'Retaining exclusive control over all task execution', 'Avoiding transparent communication with team members'], 'correctAnswer': 1, 'explanation': 'Supervision shifts focus from individual task execution to organizational enablement, team coaching, and strategic alignment.'}, {'id': 'q3-6', 'type': 'matching', 'question': 'Match each Supervisory Leadership Competency in Column A with its definition in Column B:', 'pairs': [{'id': 'm3-1', 'left': 'Delegation with Autonomy', 'right': 'Assigning outcome responsibility while granting execution freedom'}, {'id': 'm3-2', 'left': 'Constructive Feedback', 'right': 'Providing timely, behavior-specific, forward-looking guidance'}, {'id': 'm3-3', 'left': 'Conflict Resolution', 'right': 'Facilitating collaborative win-win solutions to interpersonal friction'}, {'id': 'm3-4', 'left': 'Performance Coaching', 'right': 'Unlocking potential through structured inquiry and reflective inquiry'}], 'explanation': 'Effective supervisors empower through delegation, coach through inquiry, provide actionable feedback, and resolve team friction.'}, {'id': 'q3-7', 'type': 'identification', 'question': 'What type of feedback focuses on future behaviors and strategic solutions rather than dwelling exclusively on past mistakes? (Hint: 2 words, Feed...)', 'acceptedAnswers': ['feedforward', 'feed forward', 'constructive feedback'], 'placeholder': 'Enter feedback term...', 'explanation': 'Feedforward provides positive, solution-oriented suggestions for future performance rather than dwelling on past errors.'}, {'id': 'q3-8', 'type': 'multiple_choice', 'question': 'Under situational leadership theory, what style combines high directive behavior with high supportive behavior?', 'options': ['Coaching / Selling', 'Delegating', 'Laissez-faire', 'Autocratic directing'], 'correctAnswer': 0, 'explanation': 'Coaching (S2) balances direct guidance with high personal support and two-way dialogue.'}]}, 'act-4': {'id': 'act-4', 'title': 'Business Continuity & ISO 31000 Risk Management', 'instructor': 'Instructor not assigned', 'category': 'Risk & Governance', 'headerColor': '#7c3aed', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'streak_master', 'description': 'Analyze business impact, recovery time objectives (RTO), and risk evaluation matrices under the ISO 31000 framework and Crossworks BCM standards.', 'learningObjectives': ['Master ISO 31000 principles for uncertainty and enterprise risk management', 'Differentiate Recovery Time Objective (RTO) vs. Recovery Point Objective (RPO)', 'Conduct Business Impact Analysis (BIA) to safeguard mission-critical activities'], 'questions': [{'id': 'q4-1', 'type': 'multiple_choice', 'question': 'According to the ISO 31000 international standard, how is Risk formally defined?', 'options': ['An inevitable financial loss', 'The effect of uncertainty on objectives', 'A catastrophic natural disaster event', 'An unmonitored software outage exceeding 4 hours'], 'correctAnswer': 1, 'explanation': 'ISO 31000 formally defines risk as the effect of uncertainty on organizational objectives.'}, {'id': 'q4-2', 'type': 'identification', 'question': 'In Business Continuity Planning, what 3-letter acronym represents the maximum acceptable duration of disruption before service restoration? (Hint: RTO)', 'acceptedAnswers': ['rto', 'recovery time objective'], 'placeholder': 'Enter 3-letter acronym...', 'explanation': 'Recovery Time Objective (RTO) dictates the maximum tolerable duration before an outage must be restored.'}, {'id': 'q4-3', 'type': 'sequence_order', 'question': 'Arrange the 4 steps of the ISO 31000 Risk Assessment process in standard operational sequence:', 'correctOrder': ['Risk Identification - Uncover potential threat vectors and vulnerabilities', 'Risk Analysis - Estimate the likelihood and consequence of each threat', 'Risk Evaluation - Prioritize risks against corporate appetite and tolerance', 'Risk Treatment - Deploy mitigation controls, transfer, or contingency plans'], 'initialOrder': ['Risk Evaluation - Prioritize risks against corporate appetite and tolerance', 'Risk Identification - Uncover potential threat vectors and vulnerabilities', 'Risk Treatment - Deploy mitigation controls, transfer, or contingency plans', 'Risk Analysis - Estimate the likelihood and consequence of each threat'], 'explanation': 'Risk management follows Identification, Analysis of likelihood/impact, Evaluation against thresholds, and targeted Treatment.'}, {'id': 'q4-4', 'type': 'multiple_choice', 'question': 'In enterprise risk assessment matrices, what two fundamental dimensions calculate the overall risk rating score?', 'options': ['Headcount and office footprint', 'Likelihood (Probability) and Impact (Consequence)', 'Network latency and disk capacity', 'Employee turnover and market inflation'], 'correctAnswer': 1, 'explanation': 'Risk Severity is calculated by evaluating the Likelihood of occurrence against the magnitude of operational Impact.'}, {'id': 'q4-5', 'type': 'multiple_choice', 'question': 'What differentiates Recovery Point Objective (RPO) from Recovery Time Objective (RTO)?', 'options': ['RPO measures maximum tolerable data loss in time, while RTO measures system downtime duration', 'RPO and RTO are completely identical metrics', 'RPO applies only to physical hardware fire drills', 'RTO measures financial penalties in local currency'], 'correctAnswer': 0, 'explanation': 'RPO defines allowable data loss tolerance (e.g., backup frequency), whereas RTO defines allowable system downtime duration.'}, {'id': 'q4-6', 'type': 'matching', 'question': 'Match each Risk Management Concept in Column A with its exact ISO 31000 definition in Column B:', 'pairs': [{'id': 'm4-1', 'left': 'Business Impact Analysis (BIA)', 'right': 'Quantifies operational impacts of disruptions over time'}, {'id': 'm4-2', 'left': 'Recovery Time Objective (RTO)', 'right': 'Target timeframe for restoring critical business activities'}, {'id': 'm4-3', 'left': 'Recovery Point Objective (RPO)', 'right': 'Maximum tolerable data loss measured back in time'}, {'id': 'm4-4', 'left': 'Risk Treatment Plan', 'right': 'Structured actions to mitigate, avoid, or transfer prioritized risk'}], 'explanation': 'BIA identifies mission-critical dependencies, RTO limits downtime, RPO limits data loss, and Treatment controls risk.'}, {'id': 'q4-7', 'type': 'identification', 'question': 'In a Business Continuity Plan, what formal assessment quantifies the operational and financial impact of disruptions across business units? (Hint: 3 words or BIA)', 'acceptedAnswers': ['business impact analysis', 'bia'], 'placeholder': 'Enter assessment name or acronym...', 'explanation': 'Business Impact Analysis (BIA) quantifies operational downtime consequences and establishes recovery priorities.'}, {'id': 'q4-8', 'type': 'multiple_choice', 'question': 'When treating an identified risk, choosing to purchase commercial insurance against asset loss is an example of which risk response strategy?', 'options': ['Risk Transfer', 'Risk Avoidance', 'Risk Acceptance', 'Risk Mitigation'], 'correctAnswer': 0, 'explanation': 'Purchasing insurance or contracting third-party guarantees transfers financial risk exposure to another party.'}]}, 'act-5': {'id': 'act-5', 'title': 'PMP Certification Exam Readiness (Saturdays Cohort)', 'instructor': 'Jordan Ramos', 'category': 'PMP Review (Saturdays)', 'headerColor': '#0891b2', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'sec_champ', 'description': 'Comprehensive PMP exam readiness assessment covering People, Process, and Business Environment domains under PMBOK 7th Edition.', 'learningObjectives': ['Evaluate predictive, hybrid, and agile project life cycles', 'Calculate Earned Value Management (EVM) CPI and SPI metrics', 'Execute stakeholder engagement and change control governance'], 'questions': [{'id': 'q5-1', 'type': 'multiple_choice', 'question': 'In Earned Value Management (EVM), a Cost Performance Index (CPI) of 0.85 indicates that the project is:', 'options': ['Under budget and ahead of schedule', 'Over budget, earning only 0.85 worth of value per currency unit spent', 'Exactly on budget with 15% management reserve remaining', 'Ahead of schedule by 15% of total float'], 'correctAnswer': 1, 'explanation': 'CPI = EV / AC. A CPI below 1.0 means the project is over budget for the work performed.'}, {'id': 'q5-2', 'type': 'identification', 'question': 'What formal PMP document authorizes the existence of a project and grants the Project Manager authority to apply organizational resources? (Hint: 2 words)', 'acceptedAnswers': ['project charter', 'charter'], 'placeholder': 'Enter document name...', 'explanation': 'The Project Charter formally authorizes the project and empowers the project manager to allocate resources.'}, {'id': 'q5-3', 'type': 'sequence_order', 'question': 'Arrange the 4 steps of the PMP Integrated Change Control workflow in chronological sequence:', 'correctOrder': ['Log the proposed change request and assess initial scope', 'Analyze impact across scope, schedule, cost, and quality baselines', 'Submit the evaluated change to the Change Control Board (CCB) for decision', 'Update project baselines and communicate the approved change to stakeholders'], 'initialOrder': ['Submit the evaluated change to the Change Control Board (CCB) for decision', 'Log the proposed change request and assess initial scope', 'Update project baselines and communicate the approved change to stakeholders', 'Analyze impact across scope, schedule, cost, and quality baselines'], 'explanation': 'Change requests are logged, analyzed for cross-baseline impact, reviewed by the CCB, and then applied to project baselines.'}, {'id': 'q5-4', 'type': 'matching', 'question': 'Match each PMP Project Governance Artifact in Column A with its core operational purpose in Column B:', 'pairs': [{'id': 'm5-1', 'left': 'Stakeholder Register', 'right': 'Identifies stakeholder influence, interest, and engagement classifications'}, {'id': 'm5-2', 'left': 'Risk Register', 'right': 'Tracks identified threats, opportunities, risk owners, and mitigation responses'}, {'id': 'm5-3', 'left': 'Lessons Learned Register', 'right': 'Captures organizational knowledge continuously throughout project execution'}, {'id': 'm5-4', 'left': 'Requirements Traceability Matrix', 'right': 'Links product requirements from business origin to verified deliverables'}], 'explanation': 'Registers and matrices maintain structured traceability across stakeholders, risks, lessons learned, and deliverables.'}, {'id': 'q5-5', 'type': 'multiple_choice', 'question': 'When a key stakeholder requests an unapproved scope addition directly from a developer, what should the Project Manager do first?', 'options': ['Instruct the developer to implement the change immediately to please the stakeholder', 'Evaluate the impact of the request and guide it through the formal Perform Integrated Change Control process', 'Terminate the stakeholder contract immediately', 'Deduct the cost from the contingency reserve without documentation'], 'correctAnswer': 1, 'explanation': 'All scope modifications must be evaluated for impact and processed through Perform Integrated Change Control.'}, {'id': 'q5-6', 'type': 'identification', 'question': 'What 3-letter acronym refers to the board responsible for reviewing, evaluating, approving, or rejecting changes to project baselines?', 'acceptedAnswers': ['ccb', 'change control board'], 'placeholder': 'Enter 3-letter acronym...', 'explanation': 'The Change Control Board (CCB) is the formally chartered group responsible for approving or rejecting baseline changes.'}]}, 'act-6': {'id': 'act-6', 'title': 'PMP Agile & Hybrid Delivery Mastery (Weekdays Cohort)', 'instructor': 'Jordan Ramos', 'category': 'PMP Review (Weekdays)', 'headerColor': '#d97706', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'crypto_knight', 'description': 'Assess hybrid project delivery, servant leadership, Kanban flow optimization, and value-driven delivery for weekday PMP candidates.', 'learningObjectives': ['Apply servant leadership principles across cross-functional project teams', 'Manage Work in Progress (WIP) limits and cycle time in Kanban workflows', 'Tailor hybrid governance combining predictive milestones with agile iterations'], 'questions': [{'id': 'q6-1', 'type': 'multiple_choice', 'question': 'In a hybrid project environment, what is the primary benefit of limiting Work in Progress (WIP) on a Kanban board?', 'options': ['It maximizes individual multitasking across 10 concurrent tasks', 'It exposes workflow bottlenecks and reduces task cycle time', 'It eliminates the need for quality testing', 'It prevents stakeholders from viewing project progress'], 'correctAnswer': 1, 'explanation': 'Limiting WIP reduces context-switching overhead, highlights bottlenecks, and improves throughput flow.'}, {'id': 'q6-2', 'type': 'identification', 'question': 'What leadership philosophy prioritizes removing team impediments, coaching growth, and shielding the team from external distractions? (Hint: 2 words)', 'acceptedAnswers': ['servant leadership', 'servant leader'], 'placeholder': 'Enter leadership style...', 'explanation': 'Servant leadership focuses on enabling team success by removing blockers and fostering self-organization.'}, {'id': 'q6-3', 'type': 'sequence_order', 'question': 'Arrange the 4 stages of Tuckman Team Development Model in chronological order:', 'correctOrder': ['Forming - Team members meet and learn project objectives and roles', 'Storming - Team members navigate differing opinions and workflow friction', 'Norming - Team establishes shared working agreements and constructive trust', 'Performing - High-trust team executes autonomously with peak synergy'], 'initialOrder': ['Norming - Team establishes shared working agreements and constructive trust', 'Forming - Team members meet and learn project objectives and roles', 'Performing - High-trust team executes autonomously with peak synergy', 'Storming - Team members navigate differing opinions and workflow friction'], 'explanation': 'Tuckman model progresses through Forming, Storming, Norming, Performing (and Adjourning).'}, {'id': 'q6-4', 'type': 'matching', 'question': 'Match each Agile/Hybrid Metric in Column A with what it measures in Column B:', 'pairs': [{'id': 'm6-1', 'left': 'Cycle Time', 'right': 'Elapsed time from when work begins on an item until it is completed'}, {'id': 'm6-2', 'left': 'Lead Time', 'right': 'Total time from when an item is requested on the backlog to final delivery'}, {'id': 'm6-3', 'left': 'Sprint Velocity', 'right': 'Story points of completed user stories delivered within a single sprint'}, {'id': 'm6-4', 'left': 'Cumulative Flow Diagram', 'right': 'Visualizes work item stability across states to spot queues and bottlenecks'}], 'explanation': 'Flow and velocity metrics help hybrid project managers forecast delivery and optimize throughput.'}, {'id': 'q6-5', 'type': 'multiple_choice', 'question': 'Which artifact defines the behavioral norms, communication rules, and conflict resolution guidelines agreed upon by an agile team?', 'options': ['Team Charter / Social Contract', 'Vendor Invoice Ledger', 'Procurement Statement of Work', 'Corporate Articles of Incorporation'], 'correctAnswer': 0, 'explanation': 'A Team Charter (or working agreement) establishes shared ground rules and behavioral expectations.'}, {'id': 'q6-6', 'type': 'identification', 'question': 'What 3-letter acronym represents the smallest buildable product version that delivers validated learning and core value to early users?', 'acceptedAnswers': ['mvp', 'minimum viable product'], 'placeholder': 'Enter 3-letter acronym...', 'explanation': 'A Minimum Viable Product (MVP) delivers essential features early to gather real user feedback.'}]}, 'act-7': {'id': 'act-7', 'title': 'CAPM Foundational Project Management Assessment', 'instructor': 'Jordan Ramos', 'category': 'Certified Associate in Project Management (CAPM)', 'headerColor': '#2563eb', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'first_step', 'description': 'Validate foundational CAPM concepts across project management fundamentals, predictive scheduling, business analysis frameworks, and agile basics.', 'learningObjectives': ['Distinguish project, program, and portfolio management hierarchies', 'Construct Work Breakdown Structures (WBS) and network logic diagrams', 'Execute business analysis requirements elicitation and validation'], 'questions': [{'id': 'q7-1', 'type': 'multiple_choice', 'question': 'How does a Program differ from a standalone Project under PMI standards?', 'options': ['A program is a group of related projects managed in a coordinated way to obtain benefits not available from managing them individually', 'A program has no defined objectives or governance', 'A program lasts less than 24 hours', 'A program only manages routine daily bookkeeping'], 'correctAnswer': 0, 'explanation': 'Programs coordinate related projects and subsidiary activities to realize shared strategic benefits.'}, {'id': 'q7-2', 'type': 'identification', 'question': 'In a Work Breakdown Structure (WBS), what term refers to the lowest-level deliverable where cost and duration can be reliably estimated and managed? (Hint: 2 words)', 'acceptedAnswers': ['work package', 'work packages'], 'placeholder': 'Enter WBS lowest level...', 'explanation': 'A work package is the lowest level of each branch in the WBS used to estimate and control cost and schedule.'}, {'id': 'q7-3', 'type': 'sequence_order', 'question': 'Arrange the 4 classic Predictive Project Life Cycle phases in chronological order:', 'correctOrder': ['Initiating - Authorize the project and identify initial stakeholders', 'Planning - Define scope, schedule, budget, and risk management plans', 'Executing & Monitoring - Coordinate resources, build deliverables, and track variances', 'Closing - Obtain formal deliverable acceptance and archive lessons learned'], 'initialOrder': ['Executing & Monitoring - Coordinate resources, build deliverables, and track variances', 'Initiating - Authorize the project and identify initial stakeholders', 'Closing - Obtain formal deliverable acceptance and archive lessons learned', 'Planning - Define scope, schedule, budget, and risk management plans'], 'explanation': 'Predictive project life cycles progress from Initiating to Planning, Executing/Monitoring & Controlling, and Closing.'}, {'id': 'q7-4', 'type': 'matching', 'question': 'Match each Schedule Dependency Type in Column A with its relationship rule in Column B:', 'pairs': [{'id': 'm7-1', 'left': 'Finish-to-Start (FS)', 'right': 'Successor activity cannot start until predecessor activity has finished'}, {'id': 'm7-2', 'left': 'Start-to-Start (SS)', 'right': 'Successor activity cannot start until predecessor activity has started'}, {'id': 'm7-3', 'left': 'Finish-to-Finish (FF)', 'right': 'Successor activity cannot finish until predecessor activity has finished'}, {'id': 'm7-4', 'left': 'Total Float', 'right': 'Amount of time an activity can be delayed without delaying the project end date'}], 'explanation': 'Precedence diagramming method (PDM) uses logical relationships and float to model critical schedules.'}, {'id': 'q7-5', 'type': 'multiple_choice', 'question': 'In the CAPM Business Analysis domain, which role is primarily responsible for eliciting, analyzing, documenting, and validating stakeholder requirements?', 'options': ['Business Analyst (BA)', 'Facility Maintenance Supervisor', 'External Freight Forwarder', 'Payroll Clerk'], 'correctAnswer': 0, 'explanation': 'The Business Analyst collaborates with stakeholders and the PM to elicit, model, and validate solution requirements.'}, {'id': 'q7-6', 'type': 'identification', 'question': 'What 4-letter matrix maps project tasks against roles using Responsible, Accountable, Consulted, and Informed designations?', 'acceptedAnswers': ['raci', 'raci matrix', 'raci chart'], 'placeholder': 'Enter 4-letter acronym...', 'explanation': 'A RACI matrix clarifies role responsibilities and decision-making accountability across deliverables.'}]}, 'act-8': {'id': 'act-8', 'title': 'Strategic Management Tools & Competitive Analysis', 'instructor': 'Billy Fernandez', 'category': 'Strategic Management Tools', 'headerColor': '#059669', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'crypto_knight', 'description': 'Evaluate corporate strategy frameworks including SWOT, PESTEL, Porter Five Forces, Balanced Scorecard, and OKR execution.', 'learningObjectives': ['Conduct macro-environmental PESTEL and Porter Five Forces industry analyses', 'Translate corporate vision into Balanced Scorecard perspectives and OKRs', 'Prioritize strategic initiatives using portfolio value matrices'], 'questions': [{'id': 'q8-1', 'type': 'multiple_choice', 'question': 'Which strategic management framework evaluates an organization across Financial, Customer, Internal Business Processes, and Learning & Growth perspectives?', 'options': ['Balanced Scorecard (BSC)', 'Daily Petty Cash Voucher', 'Server Rack Wiring Diagram', 'Single-Entry Bookkeeping Ledger'], 'correctAnswer': 0, 'explanation': 'Kaplan and Norton Balanced Scorecard balances financial metrics with customer, internal process, and learning drivers.'}, {'id': 'q8-2', 'type': 'identification', 'question': 'What 4-letter strategic framework evaluates internal Strengths and Weaknesses alongside external Opportunities and Threats?', 'acceptedAnswers': ['swot', 'swot analysis'], 'placeholder': 'Enter 4-letter acronym...', 'explanation': 'SWOT analysis synthesizes internal capabilities (Strengths, Weaknesses) and external market conditions (Opportunities, Threats).'}, {'id': 'q8-3', 'type': 'sequence_order', 'question': 'Arrange the 4 stages of the Strategic Management Cycle in logical execution order:', 'correctOrder': ['Environmental Scanning - Analyze internal capabilities and external market shifts', 'Strategy Formulation - Define corporate vision, differentiation, and strategic pillars', 'Strategy Implementation - Align budgets, OKRs, and cross-functional initiatives', 'Evaluation & Control - Monitor KPI scorecards and adapt strategic execution'], 'initialOrder': ['Strategy Implementation - Align budgets, OKRs, and cross-functional initiatives', 'Environmental Scanning - Analyze internal capabilities and external market shifts', 'Evaluation & Control - Monitor KPI scorecards and adapt strategic execution', 'Strategy Formulation - Define corporate vision, differentiation, and strategic pillars'], 'explanation': 'Strategic management flows from scanning the environment to formulating strategy, executing initiatives, and evaluating KPIs.'}, {'id': 'q8-4', 'type': 'matching', 'question': 'Match each Strategic Tool in Column A with its analytical focus in Column B:', 'pairs': [{'id': 'm8-1', 'left': 'PESTEL Analysis', 'right': 'Evaluates Political, Economic, Social, Technological, Environmental, and Legal macro factors'}, {'id': 'm8-2', 'left': 'Porter Five Forces', 'right': 'Assesses industry attractiveness via supplier/buyer power, substitutes, new entrants, and rivalry'}, {'id': 'm8-3', 'left': 'Blue Ocean Strategy', 'right': 'Creates uncontested market space through value innovation rather than head-to-head price war'}, {'id': 'm8-4', 'left': 'Objectives & Key Results (OKRs)', 'right': 'Couples ambitious qualitative goals with 3-5 measurable outcome targets'}], 'explanation': 'Each strategic tool targets a distinct layer of macro-environment, industry structure, value innovation, or execution alignment.'}, {'id': 'q8-5', 'type': 'multiple_choice', 'question': 'In the BCG Growth-Share Matrix, business units with high market share in a slow-growing, mature industry that generate steady surplus cash are called:', 'options': ['Cash Cows', 'Question Marks', 'Dogs', 'Sunk Costs'], 'correctAnswer': 0, 'explanation': 'Cash Cows hold strong market share in mature markets and fund emerging Stars and Question Marks.'}, {'id': 'q8-6', 'type': 'identification', 'question': 'What 3-letter goal-setting acronym stands for Objectives and Key Results?', 'acceptedAnswers': ['okr', 'okrs', 'objectives and key results'], 'placeholder': 'Enter 3-letter acronym...', 'explanation': 'OKRs align organizational and team priorities around qualitative Objectives and quantifiable Key Results.'}]}, 'act-9': {'id': 'act-9', 'title': 'Enterprise Operational Excellence & Customized Program', 'instructor': 'Owen Castillo', 'category': 'Customized Program', 'headerColor': '#7c3aed', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'streak_master', 'description': 'Assess custom enterprise workflows, Lean Six Sigma DMAIC problem-solving, cross-team SLA governance, and change adoption.', 'learningObjectives': ['Apply the DMAIC continuous improvement cycle to enterprise bottlenecks', 'Establish clear Service Level Agreements (SLAs) and operational handoffs', 'Drive organizational change adoption using structured stakeholder readiness'], 'questions': [{'id': 'q9-1', 'type': 'multiple_choice', 'question': 'In Lean Six Sigma process improvement, what is the primary focus of the Root Cause Analysis phase?', 'options': ['Treating superficial symptoms temporarily without changing the process', 'Identifying and verifying the underlying systemic drivers of process defects', 'Deleting quality logs before audit review', 'Increasing manual rework steps'], 'correctAnswer': 1, 'explanation': 'Root Cause Analysis uncovers the fundamental systemic causes of defects so permanent corrective controls can be implemented.'}, {'id': 'q9-2', 'type': 'identification', 'question': 'What 5-letter acronym represents the process improvement cycle of Define, Measure, Analyze, Improve, and Control?', 'acceptedAnswers': ['dmaic', 'define measure analyze improve control'], 'placeholder': 'Enter 5-letter acronym...', 'explanation': 'DMAIC (Define, Measure, Analyze, Improve, Control) is the core data-driven improvement cycle in Six Sigma.'}, {'id': 'q9-3', 'type': 'sequence_order', 'question': 'Arrange the 4 steps of the PDCA (Plan-Do-Check-Act) Continuous Improvement Cycle in order:', 'correctOrder': ['Plan - Identify the opportunity and design the target process improvement', 'Do - Implement the change on a small-scale pilot basis', 'Check - Measure pilot results against baseline target metrics', 'Act - Standardize the improvement enterprise-wide or refine the cycle'], 'initialOrder': ['Check - Measure pilot results against baseline target metrics', 'Plan - Identify the opportunity and design the target process improvement', 'Act - Standardize the improvement enterprise-wide or refine the cycle', 'Do - Implement the change on a small-scale pilot basis'], 'explanation': 'Deming PDCA cycle iterates through Plan, Do, Check, and Act to sustain continuous operational improvement.'}, {'id': 'q9-4', 'type': 'matching', 'question': 'Match each Operational Excellence Concept in Column A with its definition in Column B:', 'pairs': [{'id': 'm9-1', 'left': 'Kaizen', 'right': 'Continuous, incremental improvement engaging every level of the organization'}, {'id': 'm9-2', 'left': '5 Whys Technique', 'right': 'Iterative interrogative method used to drill down to the root cause of a defect'}, {'id': 'm9-3', 'left': 'Value Stream Mapping', 'right': 'Visualizes material and information flow to eliminate non-value-adding waste'}, {'id': 'm9-4', 'left': 'Poka-Yoke', 'right': 'Mistake-proofing mechanism that prevents human errors before they become defects'}], 'explanation': 'Lean tools eliminate waste, uncover root causes, and mistake-proof enterprise delivery.'}, {'id': 'q9-5', 'type': 'multiple_choice', 'question': 'When rolling out a customized workflow across multiple business units, what reduces employee resistance most effectively?', 'options': ['Early cross-functional involvement, transparent communication, and hands-on role training', 'Announcing the change on the day of cutover without documentation', 'Disabling support channels during transition week', 'Withholding the rationale behind the workflow redesign'], 'correctAnswer': 0, 'explanation': 'Engaging champions early and providing clear training and rationale accelerates change adoption.'}, {'id': 'q9-6', 'type': 'identification', 'question': 'What 3-letter acronym defines a formal commitment between a service provider and a client specifying target response and resolution times?', 'acceptedAnswers': ['sla', 'service level agreement'], 'placeholder': 'Enter 3-letter acronym...', 'explanation': 'A Service Level Agreement (SLA) establishes measurable performance, availability, and responsiveness targets.'}]}, 'act-10': {'id': 'act-10', 'title': 'Business Strategy Simulation (BSS) Executive Challenge', 'instructor': 'Billy Fernandez', 'category': 'Business Strategy Simulatuon', 'headerColor': '#dc2626', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'sec_champ', 'description': 'Test executive decision-making across capital allocation, market expansion, pricing elasticity, and cross-functional trade-offs in the Business Strategy Simulation.', 'learningObjectives': ['Balance short-term cash flow liquidity with long-term R&D and market positioning', 'Analyze unit economics, contribution margin, and customer acquisition cost (CAC)', 'Align pricing, capacity, and channel strategy across simulated market rounds'], 'questions': [{'id': 'q10-1', 'type': 'multiple_choice', 'question': 'In a multi-round Business Strategy Simulation, what happens when a firm expands production capacity aggressively without matching demand growth?', 'options': ['Fixed overhead and depreciation surge, depressing return on invested capital (ROIC)', 'Unit fixed costs automatically drop to zero', 'Competitors are forced to exit the industry immediately', 'Working capital requirements disappear'], 'correctAnswer': 0, 'explanation': 'Excess idle capacity increases fixed overhead and capital charges per unit sold, hurting profitability and ROIC.'}, {'id': 'q10-2', 'type': 'identification', 'question': 'What 3-letter financial metric measures the net gain or loss of an investment relative to its initial cost? (Hint: ROI)', 'acceptedAnswers': ['roi', 'return on investment'], 'placeholder': 'Enter 3-letter acronym...', 'explanation': 'Return on Investment (ROI) evaluates capital efficiency by comparing net benefit to investment cost.'}, {'id': 'q10-3', 'type': 'sequence_order', 'question': 'Arrange the 4 steps of a Business Strategy Simulation Decision Round in proper executive sequence:', 'correctOrder': ['Audit prior-round financial statements, market share shifts, and competitor moves', 'Forecast segment demand and align target positioning (cost leadership vs differentiation)', 'Allocate capital across R&D, operations capacity, marketing, and talent', 'Stress-test pro-forma cash flow projections before locking final round decisions'], 'initialOrder': ['Allocate capital across R&D, operations capacity, marketing, and talent', 'Audit prior-round financial statements, market share shifts, and competitor moves', 'Stress-test pro-forma cash flow projections before locking final round decisions', 'Forecast segment demand and align target positioning (cost leadership vs differentiation)'], 'explanation': 'Disciplined simulation teams diagnose market data, set strategy, allocate resources, and validate cash flow solvency.'}, {'id': 'q10-4', 'type': 'matching', 'question': 'Match each Executive Financial Metric in Column A with its business interpretation in Column B:', 'pairs': [{'id': 'm10-1', 'left': 'Contribution Margin', 'right': 'Revenue remaining after variable costs to cover fixed expenses and profit'}, {'id': 'm10-2', 'left': 'Working Capital', 'right': 'Current assets minus current liabilities funding day-to-day operations'}, {'id': 'm10-3', 'left': 'LTV to CAC Ratio', 'right': 'Compares customer lifetime value against the cost to acquire a customer'}, {'id': 'm10-4', 'left': 'Operating Leverage', 'right': 'Sensitivity of operating income to changes in revenue based on fixed-to-variable cost mix'}], 'explanation': 'Mastering unit economics and working capital prevents insolvency during rapid simulated growth.'}, {'id': 'q10-5', 'type': 'multiple_choice', 'question': 'Under Michael Porter generic competitive strategies, trying to be both the lowest-cost producer and the highest-cost luxury differentiator simultaneously without clear focus often results in:', 'options': ['Being stuck in the middle with conflicting cost structures and blurred brand positioning', 'Guaranteed monopoly profits in every segment', 'Zero customer churn', 'Automatic exemption from market competition'], 'correctAnswer': 0, 'explanation': 'Firms that fail to commit to a coherent strategic value proposition risk getting stuck in the middle with sub-par returns.'}, {'id': 'q10-6', 'type': 'identification', 'question': 'What 6-letter acronym represents Earnings Before Interest, Taxes, Depreciation, and Amortization?', 'acceptedAnswers': ['ebitda'], 'placeholder': 'Enter 6-letter acronym...', 'explanation': 'EBITDA measures core operational cash earnings before financing and accounting depreciation effects.'}]}, 'act-11': {'id': 'act-11', 'title': 'Innovation through Design Thinking & Prototyping', 'instructor': 'Jobert Cruz', 'category': 'Innovation through Design Thinking', 'headerColor': '#1368ce', 'timePerQuestion': 45, 'passingScore': 80, 'showCorrectAnswers': True, 'badgeAwarded': 'first_step', 'description': 'Master human-centered design thinking, empathy mapping, rapid low-fidelity prototyping, and iterative user testing.', 'learningObjectives': ['Conduct deep user empathy interviews and synthesize Point-of-View (POV) problem statements', 'Facilitate divergent ideation and convergent concept selection', 'Build rapid low-fidelity prototypes to test critical assumptions with real users'], 'questions': [{'id': 'q11-1', 'type': 'multiple_choice', 'question': 'What is the primary goal of the Empathize phase in the Design Thinking framework?', 'options': ['Pitch a finished product to investors before talking to users', 'Set aside assumptions and gain deep, first-hand insight into users real needs and pain points', 'Write production database schemas immediately', 'Finalize legal patent filings'], 'correctAnswer': 1, 'explanation': 'Empathy grounds innovation in genuine human needs observed through interviews, shadowing, and immersion.'}, {'id': 'q11-2', 'type': 'identification', 'question': 'In Design Thinking ideation, what 3-word phrase (or 3-letter acronym HMW) is used to reframe user pain points into open-ended innovation prompts?', 'acceptedAnswers': ['how might we', 'hmw'], 'placeholder': 'Enter 3-word phrase or HMW...', 'explanation': 'How Might We (HMW) questions frame problems optimistically to invite diverse creative solutions.'}, {'id': 'q11-3', 'type': 'sequence_order', 'question': 'Arrange the first 4 core stages of the Stanford d.school Design Thinking Process in sequence:', 'correctOrder': ['Empathize - Observe and interview users to uncover unmet needs', 'Define - Synthesize insights into a clear, human-centered problem statement', 'Ideate - Brainstorm a wide range of creative solution concepts without judgment', 'Prototype - Build quick, inexpensive representations to test key hypotheses'], 'initialOrder': ['Ideate - Brainstorm a wide range of creative solution concepts without judgment', 'Empathize - Observe and interview users to uncover unmet needs', 'Prototype - Build quick, inexpensive representations to test key hypotheses', 'Define - Synthesize insights into a clear, human-centered problem statement'], 'explanation': 'Design Thinking flows from Empathize to Define, Ideate, Prototype, and Test.'}, {'id': 'q11-4', 'type': 'matching', 'question': 'Match each Design Thinking Artifact in Column A with its purpose in Column B:', 'pairs': [{'id': 'm11-1', 'left': 'Empathy Map', 'right': 'Captures what a target user Says, Thinks, Does, and Feels'}, {'id': 'm11-2', 'left': 'Customer Journey Map', 'right': 'Visualizes end-to-end user touchpoints, emotions, and friction moments'}, {'id': 'm11-3', 'left': 'Low-Fidelity Prototype', 'right': 'Paper sketch or clickable wireframe built rapidly to test core assumptions'}, {'id': 'm11-4', 'left': 'Point-of-View (POV) Statement', 'right': 'Articulates User + Need + Surprising Insight to anchor ideation'}], 'explanation': 'Design thinking artifacts turn raw user observations into actionable problem frames and testable prototypes.'}, {'id': 'q11-5', 'type': 'multiple_choice', 'question': 'Why do Design Thinking teams build low-fidelity prototypes early instead of polished high-cost builds?', 'options': ['To fail fast and learn cheaply before committing engineering resources to unvalidated ideas', 'Because users prefer broken software in production', 'To avoid ever testing with real customers', 'To extend project timelines by 24 months'], 'correctAnswer': 0, 'explanation': 'Low-fidelity prototypes invite honest user critique and allow teams to pivot quickly at minimal cost.'}, {'id': 'q11-6', 'type': 'identification', 'question': 'What 3-letter acronym refers to a human-centered problem statement combining User, Need, and Insight? (Hint: Point of View)', 'acceptedAnswers': ['pov', 'point of view', 'point-of-view'], 'placeholder': 'Enter 3-letter acronym...', 'explanation': 'A Point-of-View (POV) statement synthesizes who the user is, their core need, and the underlying insight.'}]}}


def _load_quiz_database_js() -> dict:
    """Parse QUIZ_DATABASE from frontend/src/data/quizDatabase.js (with embedded fallback inside container)."""
    candidates = [
        Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "quizDatabase.js",
        Path("/quizDatabase.js"),
    ]
    src = next((p.read_text(encoding="utf-8") for p in candidates if p.exists()), None)
    if not src:
        return EMBEDDED_QUIZ_DATABASE
    try:
        body = src.split("export const QUIZ_DATABASE =", 1)[1].split("export const getActiveQuizDatabase", 1)[0].strip().rstrip(";")
        body = re.sub(r"//.*", "", body)
        token_re = re.compile(r"('(?:\\.|[^'\\])*')|(\"(?:\\.|[^\"\\])*\")|([a-zA-Z_][a-zA-Z0-9_]*)\s*:")
        def _repl(m):
            if m.group(1):
                return json.dumps(m.group(1)[1:-1].replace("\\'", "'"))
            if m.group(2):
                return m.group(2)
            return f'"{m.group(3)}":'
        body = token_re.sub(_repl, body)
        body = re.sub(r",\s*([}\]])", r"\1", body)
        return json.loads(body)
    except Exception:
        return EMBEDDED_QUIZ_DATABASE


def remove_all(db):
    demo_sids = "SELECT id FROM training_sessions WHERE session_code LIKE 'DEMO-%'"
    demo_rids = f"SELECT id FROM training_records WHERE session_id IN ({demo_sids}) OR id LIKE 'rec-demo-%'"
    for sql in [
        f"DELETE FROM certificates WHERE record_id IN ({demo_rids})",
        f"DELETE FROM training_record_versions WHERE record_id IN ({demo_rids})",
        f"DELETE FROM training_records WHERE id IN ({demo_rids})",
        f"DELETE FROM trainer_assignments WHERE session_id IN ({demo_sids})",
        "DELETE FROM training_sessions WHERE session_code LIKE 'DEMO-%'",
        "DELETE FROM quiz_answer_keys WHERE question_id IN (SELECT id FROM quiz_questions WHERE quiz_id IN ('act-1','act-2','act-3','act-4','act-5','act-6','act-7','act-8','act-9','act-10','act-11'))",
        "DELETE FROM quiz_questions WHERE quiz_id IN ('act-1','act-2','act-3','act-4','act-5','act-6','act-7','act-8','act-9','act-10','act-11')",
        "DELETE FROM quiz_attempts WHERE quiz_id IN ('act-1','act-2','act-3','act-4','act-5','act-6','act-7','act-8','act-9','act-10','act-11') OR id LIKE 'att-demo-%'",
        "DELETE FROM quizzes WHERE id IN ('act-1','act-2','act-3','act-4','act-5','act-6','act-7','act-8','act-9','act-10','act-11')",
    ]:
        db.execute(text(sql))
    # Restore any pilot record we previously set to In progress / Not completed back to Completed
    changed = db.query(TrainingRecord).filter(
        TrainingRecord.id.like("rec-pilot-%"),
        TrainingRecord.status != "Completed",
    ).all()
    for i, rec in enumerate(changed):
        _apply_status(db, rec, "Completed", i)
    print(f"Removed DEMO-* sessions/records/act-* quizzes; restored {len(changed)} pilot records to Completed.")



def _ensure_migrations(db):
    """Idempotently applies 007_trainer_programs and 008_quiz_course_scope DDL so PowerShell < redirection is not required."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS trainer_programs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            assigned_by VARCHAR(36),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
            CONSTRAINT uq_trainer_program UNIQUE (user_id, course_id)
        );
        CREATE INDEX IF NOT EXISTS ix_trainer_programs_user ON trainer_programs(user_id);
        CREATE INDEX IF NOT EXISTS ix_trainer_programs_course ON trainer_programs(course_id);
        ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS course_id VARCHAR(36) REFERENCES courses(id);
        CREATE INDEX IF NOT EXISTS ix_quizzes_course ON quizzes(course_id);
        UPDATE training_sessions s SET course_id = c.id
        FROM courses c WHERE s.course_id IS NULL AND c.name = s.course_name;
        UPDATE quizzes q SET course_id = s.course_id
        FROM training_sessions s WHERE q.session_id = s.id AND q.course_id IS NULL AND s.course_id IS NOT NULL;
        UPDATE quizzes SET session_id = NULL WHERE course_id IS NOT NULL;
    """))
    db.commit()


def main():
    db = sessionmaker(bind=admin_engine)()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today = now.date()
    try:
        _ensure_migrations(db)
        remove_all(db)
        if REMOVE:
            finish(db)
            return

        trainer = db.query(User).filter(User.email == TRAINER_EMAIL).first()
        admin = db.query(User).filter(User.role == "admin").first()
        if not trainer or not admin:
            sys.exit("Missing jordan.ramos@crossworks.ph or an admin user.")

        # ---- 1. Account Manager & Company Staff Assignments ----
        erika_codes = _get_erika_accounts()
        erika = db.query(User).filter(User.email == "erika.bana@crossworks.ph").first()
        if erika:
            erika.assigned_client_accounts = erika_codes
            db.execute(text("DELETE FROM account_manager_assignments WHERE user_id = :uid"), {"uid": erika.id})
            for code in erika_codes:
                comp = db.query(ClientCompany).filter(ClientCompany.code == code).first()
                if comp:
                    db.add(AccountManagerAssignment(
                        user_id=erika.id,
                        company_id=comp.id,
                        valid_from=now - timedelta(days=90),
                        assigned_by=admin.id,
                    ))
            print(f"Assigned Erika Bana ({erika.email}) to {len(erika_codes)} client accounts: {erika_codes}")

        # Ensure Brian Mendoza also has SERVIE_PHILIP_INC (merged from SPP0)
        brian = db.query(User).filter(User.email == "brian.mendoza@crossworks.ph").first()
        if brian:
            servier = db.query(ClientCompany).filter(ClientCompany.code == "SERVIE_PHILIP_INC").first()
            b_codes = list(brian.assigned_client_accounts or [])
            if servier and "SERVIE_PHILIP_INC" not in b_codes:
                b_codes.append("SERVIE_PHILIP_INC")
                brian.assigned_client_accounts = b_codes
                exists_ama = db.query(AccountManagerAssignment).filter_by(user_id=brian.id, company_id=servier.id).first()
                if not exists_ama:
                    db.add(AccountManagerAssignment(
                        user_id=brian.id,
                        company_id=servier.id,
                        valid_from=now - timedelta(days=90),
                        assigned_by=admin.id,
                    ))

        # Ensure company_staff users have AccountManagerAssignment rows for RLS company scoping
        staff_users = db.query(User).filter(User.role == "company_staff").all()
        for su in staff_users:
            for ccode in (su.assigned_client_accounts or []):
                comp = db.query(ClientCompany).filter(ClientCompany.code == ccode).first()
                if comp:
                    exists_ama = db.query(AccountManagerAssignment).filter_by(user_id=su.id, company_id=comp.id).first()
                    if not exists_ama:
                        db.add(AccountManagerAssignment(
                            user_id=su.id,
                            company_id=comp.id,
                            valid_from=now - timedelta(days=90),
                            assigned_by=admin.id,
                        ))
        db.flush()

        # ---- 2. 6 DEMO-* sessions for Jordan Ramos ----
        rec_seq = 0
        for i, (code, stage, offset, course_name, co_codes) in enumerate(DEMO_SESSIONS):
            course = db.query(Course).filter(Course.name == course_name).first()
            if not course:
                sys.exit(f"Course not found: {course_name}")
            start = now.replace(hour=1, minute=0, second=0, microsecond=0) + timedelta(days=offset)
            sess = TrainingSession(
                session_code=code, course_id=course.id, course_name=course.name,
                start_date=start, end_date=start + timedelta(days=2),
                delivery_type="Public", delivery_mode="F2F",
                venue="Crossworks Corporate Training Center, Makati",
                trainer_signed_off=False,
            )
            db.add(sess)
            db.flush()
            db.add(TrainerAssignment(user_id=trainer.id, session_id=sess.id, valid_from=start - timedelta(days=7)))

            trainees = (
                db.query(Trainee, ClientCompany)
                .join(ClientCompany, ClientCompany.id == Trainee.current_company_id)
                .filter(ClientCompany.code.in_(co_codes))
                .order_by(Trainee.trainee_code)
                .limit(5).all()
            )
            for k, (t, co) in enumerate(trainees):
                rec_seq += 1
                att = None if stage == "needs" else ("Absent" if (k == 4 and i % 2 == 0) else "Present")
                rec = TrainingRecord(
                    id=f"rec-demo-{rec_seq:03d}", trainee_id=t.id, session_id=sess.id,
                    company_at_completion_id=co.id, course_name=course.name,
                    status="In progress", attendance_status=att,
                    encryption_policy="", policy_version=1, payload_ciphertext="", is_encrypted=True,
                )
                _reencrypt(db, rec, t, co, sess)
                db.add(rec)
            print(f"Created {code:11s} ({stage:8s}) {len(trainees)} trainees  {course.name}")

        db.flush()

        # ---- 2b. Assign real sessions and programs to the other 4 trainers ----
        all_sessions = db.query(TrainingSession).all()
        for tr_email, spec in ADDITIONAL_TRAINER_SPECS.items():
            tr_user = db.query(User).filter(User.email == tr_email).first()
            if not tr_user:
                continue
            if not tr_user.job_title and spec.get("job_title"):
                tr_user.job_title = spec["job_title"]

            # Grant TrainerProgram rows
            for cname in spec["course_names"]:
                c_obj = db.query(Course).filter(Course.name == cname).first()
                if c_obj:
                    exists_tp = db.query(TrainerProgram).filter_by(user_id=tr_user.id, course_id=c_obj.id).first()
                    if not exists_tp:
                        db.add(TrainerProgram(user_id=tr_user.id, course_id=c_obj.id, assigned_by=admin.id))

            # Assign matching sessions
            assigned_cnt = 0
            co_set = set(tr_user.assigned_client_accounts or [])
            for s in all_sessions:
                if any(s.session_code.startswith(pfx) for pfx in spec["session_prefixes"]):
                    exists_ta = db.query(TrainerAssignment).filter_by(user_id=tr_user.id, session_id=s.id).first()
                    if not exists_ta:
                        db.add(TrainerAssignment(
                            user_id=tr_user.id,
                            session_id=s.id,
                            valid_from=(s.start_date or now) - timedelta(days=7),
                        ))
                    assigned_cnt += 1
                    for r in s.training_records:
                        if r.company_at_completion and r.company_at_completion.code:
                            co_set.add(r.company_at_completion.code)
            if co_set:
                tr_user.assigned_client_accounts = sorted(co_set)
            print(f"Assigned trainer {tr_email:28s} -> {assigned_cnt} sessions, {len(spec['course_names'])} programs")

        # ---- 3. Extra enrolments + status mix for the 9 demo trainees ----
        for email, extra_courses in EXTRA_ENROLMENTS.items():
            t = db.query(Trainee).filter(Trainee.email == email).first()
            if not t:
                continue
            co = db.get(ClientCompany, t.current_company_id)
            for cname in extra_courses:
                exists = db.query(TrainingRecord).filter(
                    TrainingRecord.trainee_id == t.id, TrainingRecord.course_name == cname,
                    TrainingRecord.id.notlike("rec-demo-%")).first()
                if exists:
                    continue
                sess = (db.query(TrainingSession)
                        .filter(TrainingSession.session_code.like("SESS-2026-%"),
                                TrainingSession.course_name == cname)
                        .order_by(TrainingSession.start_date).first())
                if not sess:
                    continue
                rec_seq += 1
                rec = TrainingRecord(
                    id=f"rec-demo-{rec_seq:03d}", trainee_id=t.id, session_id=sess.id,
                    company_at_completion_id=co.id, course_name=cname,
                    status="In progress", attendance_status="Present",
                    encryption_policy="", policy_version=1, payload_ciphertext="", is_encrypted=True,
                )
                _reencrypt(db, rec, t, co, sess)
                db.add(rec)
        db.flush()

        for email, statuses in DEMO_MIX.items():
            t = db.query(Trainee).filter(Trainee.email == email).first()
            if not t:
                continue
            recs = (db.query(TrainingRecord).join(TrainingSession, TrainingSession.id == TrainingRecord.session_id)
                    .filter(TrainingRecord.trainee_id == t.id,
                            TrainingSession.session_code.like("SESS-2026-%"),
                            TrainingRecord.deleted_at.is_(None))
                    .order_by(TrainingSession.start_date, TrainingRecord.id).all())
            for idx, (rec, st) in enumerate(zip(recs, statuses)):
                _apply_status(db, rec, st, idx)
            print(f"Trainee {email:42s} -> {[r.status for r in recs]}")

        # Also spread statuses across the remaining trainees of the 5 target companies
        demo_emails = set(DEMO_MIX.keys())
        for code in ("VHL", "IPROY_SERVI", "AMIHAN_SOLUTI", "EWALIC", "ROP"):
            co = db.query(ClientCompany).filter(ClientCompany.code == code).first()
            if not co:
                continue
            recs = (db.query(TrainingRecord).join(Trainee, Trainee.id == TrainingRecord.trainee_id)
                    .join(TrainingSession, TrainingSession.id == TrainingRecord.session_id)
                    .filter(TrainingRecord.company_at_completion_id == co.id,
                            TrainingSession.session_code.like("SESS-2026-%"),
                            ~Trainee.email.in_(demo_emails),
                            TrainingRecord.deleted_at.is_(None))
                    .order_by(Trainee.trainee_code).all())
            # ~60% Completed, ~25% In progress, ~15% Not completed
            pattern = ["Completed", "Completed", "Completed", "In progress", "Completed", "In progress", "Not completed"]
            for idx, rec in enumerate(recs):
                _apply_status(db, rec, pattern[idx % len(pattern)], idx)

        # ---- 4. Seed the 4 quizzes from quizDatabase.js with ALL 8 questions (all types) ----
        qdb = _load_quiz_database_js()
        for act_id, course_name in QUIZ_TO_COURSE.items():
            spec = qdb.get(act_id)
            course = db.query(Course).filter(Course.name == course_name).first()
            if not spec or not course:
                print(f"SKIP quiz {act_id}: spec={bool(spec)} course={bool(course)}")
                continue
            db.execute(text(
                "DELETE FROM quiz_answer_keys WHERE question_id IN "
                "(SELECT id FROM quiz_questions WHERE quiz_id IN "
                "(SELECT id FROM quizzes WHERE course_id = :cid AND lower(title) = :t))"
            ), {"cid": course.id, "t": spec["title"].lower()})
            db.execute(text(
                "DELETE FROM quiz_questions WHERE quiz_id IN "
                "(SELECT id FROM quizzes WHERE course_id = :cid AND lower(title) = :t)"
            ), {"cid": course.id, "t": spec["title"].lower()})
            db.execute(text(
                "DELETE FROM quizzes WHERE course_id = :cid AND lower(title) = :t"
            ), {"cid": course.id, "t": spec["title"].lower()})

            qz = Quiz(
                id=act_id, title=spec["title"], course_id=course.id, session_id=None,
                version_no=1, is_closed=False, is_approved=True,
                created_by_user_id=trainer.id, approved_by_user_id=admin.id, approved_at=now,
            )
            db.add(qz)
            db.flush()
            q_n = 0
            for q in spec.get("questions", []):
                q_type = q.get("type", "multiple_choice")
                q_n += 1
                qid = f"{act_id}-{q.get('id', q_n)}"
                exp = q.get("explanation", "")

                if q_type == "multiple_choice":
                    opts_payload = q["options"]
                    c_ans = int(q["correctAnswer"])
                elif q_type == "identification":
                    opts_payload = {
                        "type": "identification",
                        "options": [],
                        "placeholder": q.get("placeholder", "Enter answer..."),
                        "accepted_answers": q.get("acceptedAnswers", []),
                    }
                    c_ans = 0
                elif q_type == "sequence_order":
                    opts_payload = {
                        "type": "sequence_order",
                        "options": q.get("initialOrder") or q.get("correctOrder") or [],
                        "initial_order": q.get("initialOrder") or q.get("correctOrder") or [],
                        "correct_order": q.get("correctOrder") or [],
                    }
                    c_ans = 0
                elif q_type == "matching":
                    pairs = q.get("pairs", [])
                    opts_payload = {
                        "type": "matching",
                        "options": [p.get("left", "") for p in pairs],
                        "pairs": pairs,
                    }
                    c_ans = 0
                else:
                    continue

                qq = QuizQuestion(
                    id=qid,
                    quiz_id=qz.id,
                    question_text=q["question"],
                    options=opts_payload,
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
            print(f"Seeded quiz {act_id} ({spec['title']}) -> {course.name} with {q_n} questions (all types)")

        for cid in {q.course_id for q in db.query(Quiz).filter(Quiz.id.in_(list(QUIZ_TO_COURSE.keys()))).all()}:
            if not db.query(TrainerProgram).filter_by(user_id=trainer.id, course_id=cid).first():
                db.add(TrainerProgram(user_id=trainer.id, course_id=cid, assigned_by=admin.id))

        db.flush()

        # ---- 5. Seed QuizAttempt & GamificationProgress for demo trainees (Round 11) ----
        att_seq = 0
        for email, gspec in DEMO_QUIZ_ATTEMPTS.items():
            t = db.query(Trainee).filter(Trainee.email == email).first()
            if not t:
                continue
            t.current_streak = gspec["streak"]
            t.last_activity_date = today

            gam = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == t.id).first()
            if not gam:
                gam = GamificationProgress(trainee_id=t.id)
                db.add(gam)
            gam.points = gspec["points"]
            gam.level = gspec["level"]
            gam.streak = gspec["streak"]
            gam.badges = list(gspec["badges"])
            gam.quizzes_completed = len(gspec["attempts"])
            gam.last_activity_date = today

            for qid, score_val, pts_val in gspec["attempts"]:
                if not db.query(Quiz).filter(Quiz.id == qid).first():
                    continue
                att_seq += 1
                db.add(QuizAttempt(
                    id=f"att-demo-{att_seq:03d}",
                    quiz_id=qid,
                    trainee_id=t.id,
                    quiz_version=1,
                    submitted_offline=False,
                    score=score_val,
                    total_points=pts_val,
                    is_scored=True,
                    submitted_at=now - timedelta(days=att_seq % 5, hours=att_seq),
                ))
        print(f"Seeded {att_seq} scored quiz attempts and synced GamificationProgress for demo trainees.")

        db.flush()

        # ---- 6. Re-issue CP-ABE keys for all updated trainers, AMs, and company_staff ----
        users_to_rekey = [trainer]
        if erika:
            users_to_rekey.append(erika)
        if brian:
            users_to_rekey.append(brian)
        for tr_email in ADDITIONAL_TRAINER_SPECS:
            u = db.query(User).filter(User.email == tr_email).first()
            if u:
                users_to_rekey.append(u)
        users_to_rekey.extend(staff_users)

        for u in users_to_rekey:
            attribute_manager.issue_or_rekey_user(db=db, user=u, commit=False)

        finish(db)
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
        print("\n>>> DRY RUN, rolled back. Re-run with --apply to commit.")


if __name__ == "__main__":
    main()
