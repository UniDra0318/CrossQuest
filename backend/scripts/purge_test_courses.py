"""Delete courses and sessions that were created by test runs, keeping only the 34 real Crossworks pilot courses and SESS-2026-*/DEMO-* sessions.

    python scripts/purge_test_courses.py          # dry run
    python scripts/purge_test_courses.py --apply  # commit
"""
import sys
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from app.core.database import admin_engine

APPLY = "--apply" in sys.argv

TEST_CODES = (
    "CRS-A267EA",  # Cloud Security Architecture Assessment (Course)
    "CRS-B0CA98",  # Red Team Operations
    "CRS-E9C7B7",  # Cloud Threat Modeling Challenge (Course)
    "CRS-8DDFF2",  # Zero-Trust Architecture
    "CRS-DC039D",  # Executive Communication & Stakeholder Alignment
    "CRS-54AFDE",  # Business Continuity & Crisis Management
)

# Official 34 real course names from Sample Data.xlsx (Sheet 1 + Sheet 2)
REAL_PILOT_COURSE_NAMES = (
    "Agile PME",
    "Business Continuity Management Essentials",
    "Coaching",
    "CONNECT",
    "Consulting",
    "Customized Program",
    "Enterprise Risk Management",
    "Impactful Leadership",
    "Implementing Data Privacy",
    "Innovation through Design Thinking",
    "ISMS 27001 Essentials",
    "ISMS 27001 Internal Auditor",
    "ISMS 27001 Lead Auditor Certification",
    "ISMS 27001:2022 Managing Infosec Controls",
    "ISMS 27001:2022 Transition Awareness",
    "ISO 31000 CRM",
    "Management Development Program",
    "Managing Stakeholders Effectively",
    "Maximizing Employee Engagement",
    "Negotiating for Results",
    "Performing Data Privacy Audits",
    "PMP Review (Saturdays)",
    "PMP Review (Weekdays)",
    "Project Management Essentials",
    "Strategic Management Tools",
    "Team Building",
    "Vendor Management",
    "WAVE",
    "Train the Trainer with Addie",
    "Mastering Business Presentation Skills",
    "Compliance Management Systems",
    "Supervisory Upskilling Program for Excellent",
    "Certified Associate in Project Management (CAPM)",
    "Business Strategy Simulatuon",
)



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
    try:
        _ensure_migrations(db)
        # 1. Remove synthetic test sessions (anything outside SESS-2026-% and DEMO-%) that have no real pilot records
        synth_sids = [
            r[0] for r in db.execute(text(
                "SELECT s.id FROM training_sessions s "
                "WHERE s.session_code NOT LIKE 'SESS-2026-%' AND s.session_code NOT LIKE 'DEMO-%' "
                "AND NOT EXISTS (SELECT 1 FROM training_records tr WHERE tr.session_id = s.id AND tr.id LIKE 'rec-pilot-%')"
            )).fetchall()
        ]
        if synth_sids:
            db.execute(text("DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE session_id IN :sids)"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM teams WHERE session_id IN :sids"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM quiz_answer_keys WHERE question_id IN (SELECT id FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE session_id IN :sids))"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE session_id IN :sids)"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM quiz_attempts WHERE quiz_id IN (SELECT id FROM quizzes WHERE session_id IN :sids)"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM quizzes WHERE session_id IN :sids"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM certificates WHERE record_id IN (SELECT id FROM training_records WHERE session_id IN :sids)"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM training_record_versions WHERE record_id IN (SELECT id FROM training_records WHERE session_id IN :sids)"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM training_records WHERE session_id IN :sids"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM trainer_assignments WHERE session_id IN :sids"), {"sids": tuple(synth_sids)})
            db.execute(text("DELETE FROM training_sessions WHERE id IN :sids"), {"sids": tuple(synth_sids)})
            print(f"Purged {len(synth_sids)} synthetic test sessions.")

        # 2. Delete non-pilot / test courses that have no remaining sessions or quizzes
        rows = db.execute(text(
            "SELECT c.id, c.course_code, c.name, "
            "(SELECT count(*) FROM training_sessions s WHERE s.course_id = c.id) AS sess, "
            "(SELECT count(*) FROM quizzes q WHERE q.course_id = c.id) AS qz "
            "FROM courses c WHERE c.course_code IN :codes OR c.name NOT IN :real_names"
        ), {"codes": TEST_CODES, "real_names": REAL_PILOT_COURSE_NAMES}).fetchall()
        for cid, code, name, sess, qz in rows:
            if sess or qz:
                print(f"SKIP {code} ({name}): has {sess} sessions, {qz} quizzes")
                continue
            db.execute(text("DELETE FROM trainer_programs WHERE course_id = :id"), {"id": cid})
            db.execute(text("DELETE FROM courses WHERE id = :id"), {"id": cid})
            print(f"DELETE {code}  {name}")
        if APPLY:
            db.commit()
            print(">>> COMMITTED")
        else:
            db.rollback()
            print(">>> DRY RUN, rolled back. Pass --apply to commit.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
