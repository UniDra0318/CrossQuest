"""Create (or remove) demo training cohorts built from existing pilot data.

Run inside the backend container (copy the file to /app first):

    python seed_demo_cohorts.py                 # DRY RUN: builds everything, prints the plan, rolls back
    python seed_demo_cohorts.py --apply         # commit the demo cohorts
    python seed_demo_cohorts.py --remove --apply  # delete every DEMO- session and its records

Options:
    --am-name "Erika Bana"        Account Manager whose clients supply the trainees
    --trainer-name "Jordan Ramos" Trainer assigned to every demo session

What it creates (6 sessions, 5 pilot trainees each, DEMO- codes):
    3 x Needs Attendance     attendance not logged yet (starts today / tomorrow / in 3 days)
    3 x Awaiting Sign-off    past-dated, attendance logged, ready for the Trainer to sign off
Records use the pilot trainees and clients, are CP-ABE encrypted with the normal policy and the
rec-{trainee_code} context, and the trainer's key is re-issued so it covers the demo sessions.

It also un-signs pilot sessions that are still in the future and have no records
(--keep-future-signed-off to skip this). That part is NOT undone by --remove.
"""
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.database import admin_engine
from app.models.entities import (
    User, ClientCompany, Trainee, TrainingSession, TrainingRecord, TrainerAssignment,
)
from app.crypto.cpabe_engine import cpabe_engine
from app.crypto.attribute_manager import attribute_manager

APPLY = "--apply" in sys.argv
REMOVE = "--remove" in sys.argv
KEEP_FUTURE = "--keep-future-signed-off" in sys.argv


def arg_value(flag, default):
    if flag in sys.argv:
        i = sys.argv.index(flag)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


AM_NAME = arg_value("--am-name", "Erika Bana")
TRAINER_NAME = arg_value("--trainer-name", "Jordan Ramos")
COHORT_SIZE = 5

# (session code, stage, start offset in days from today)
PLAN = [
    ("DEMO-NA-01", "needs", 1),
    ("DEMO-NA-02", "needs", 0),
    ("DEMO-NA-03", "needs", 3),
    ("DEMO-AW-01", "awaiting", -4),
    ("DEMO-AW-02", "awaiting", -3),
    ("DEMO-AW-03", "awaiting", -6),
]

DEMO_SESSIONS_SQL = "SELECT id FROM training_sessions WHERE session_code LIKE 'DEMO-%'"
DEMO_RECORDS_SQL = f"SELECT id FROM training_records WHERE session_id IN ({DEMO_SESSIONS_SQL})"


def remove_demo(db):
    counts = {}
    for label, sql in [
        ("certificates", f"DELETE FROM certificates WHERE record_id IN ({DEMO_RECORDS_SQL})"),
        ("record versions", f"DELETE FROM training_record_versions WHERE record_id IN ({DEMO_RECORDS_SQL})"),
        ("training records", f"DELETE FROM training_records WHERE session_id IN ({DEMO_SESSIONS_SQL})"),
        ("trainer assignments", f"DELETE FROM trainer_assignments WHERE session_id IN ({DEMO_SESSIONS_SQL})"),
        ("sessions", "DELETE FROM training_sessions WHERE session_code LIKE 'DEMO-%'"),
    ]:
        counts[label] = db.execute(text(sql)).rowcount
    return counts


def main():
    db = sessionmaker(bind=admin_engine)()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        removed = remove_demo(db)
        print("Removed existing demo data:", removed)
        if REMOVE:
            finish(db)
            return

        am = db.query(User).filter(User.full_name == AM_NAME).first()
        trainer = db.query(User).filter(User.full_name == TRAINER_NAME).first()
        if not am or not trainer:
            sys.exit(f"Could not find users: AM={bool(am)} ({AM_NAME}), trainer={bool(trainer)} ({TRAINER_NAME})")
        codes = list(am.assigned_client_accounts or [])
        if not codes:
            sys.exit(f"{AM_NAME} has no assigned client accounts.")
        print(f"AM {AM_NAME} clients: {codes}; trainer: {TRAINER_NAME}")

        # 1. Un-sign future-dated pilot sessions that have no records
        if not KEEP_FUTURE:
            res = db.execute(text(
                "UPDATE training_sessions SET trainer_signed_off = false, trainer_sign_off_at = NULL, "
                "trainer_sign_off_user_id = NULL, trainer_sign_off_notes = NULL "
                "WHERE session_code LIKE 'SESS-2026-%' AND start_date > :now AND trainer_signed_off = true "
                "AND NOT EXISTS (SELECT 1 FROM training_records r WHERE r.session_id = training_sessions.id)"
            ), {"now": now})
            print(f"Un-signed future-dated empty pilot sessions: {res.rowcount}")

        # 2. Pool of existing pilot enrolments inside the AM's clients, grouped by course
        pilot_ids = [r[0] for r in db.execute(text(
            "SELECT id FROM training_sessions WHERE session_code LIKE 'SESS-2026-%'")).fetchall()]
        rows = (
            db.query(TrainingRecord.course_name, Trainee, ClientCompany)
            .join(Trainee, Trainee.id == TrainingRecord.trainee_id)
            .join(ClientCompany, ClientCompany.id == TrainingRecord.company_at_completion_id)
            .filter(
                ClientCompany.code.in_(codes),
                TrainingRecord.deleted_at.is_(None),
                TrainingRecord.session_id.in_(pilot_ids),
            )
            .order_by(TrainingRecord.course_name, Trainee.last_name, Trainee.first_name)
            .all()
        )
        pool = {}
        seen = set()
        for course, trainee, company in rows:
            if (course, trainee.id) in seen:
                continue
            seen.add((course, trainee.id))
            pool.setdefault(course, []).append((trainee, company))
        ranked = sorted((c for c in pool if len(pool[c]) >= 3), key=lambda c: -len(pool[c]))
        if not ranked:
            sys.exit("No pilot course has 3+ trainees inside this Account Manager's clients.")
        print(f"Courses available: {[(c, len(pool[c])) for c in ranked]}")

        # 3. Build sessions, assignments and encrypted records
        counter = 0
        summary = []
        for i, (code, stage, offset) in enumerate(PLAN):
            course = ranked[i % len(ranked)]
            members = pool[course]
            n = min(COHORT_SIZE, len(members))
            first = ((i // len(ranked)) * COHORT_SIZE) % len(members)
            picks = [members[(first + k) % len(members)] for k in range(n)]

            tmpl = (
                db.query(TrainingSession)
                .filter(TrainingSession.session_code.like("SESS-2026-%"), TrainingSession.course_name == course)
                .first()
            )
            start = now.replace(hour=1, minute=0, second=0, microsecond=0) + timedelta(days=offset)
            sess = TrainingSession(
                session_code=code,
                course_id=tmpl.course_id if tmpl else None,
                course_name=course,
                start_date=start,
                end_date=start + timedelta(days=2),
                delivery_type=(tmpl.delivery_type if tmpl else "Public") or "Public",
                delivery_mode=(tmpl.delivery_mode if tmpl else "F2F") or "F2F",
                venue=(tmpl.venue if tmpl else "Crossworks Corporate Training Center, Makati"),
                trainer_signed_off=False,
            )
            db.add(sess)
            db.flush()
            db.add(TrainerAssignment(user_id=trainer.id, session_id=sess.id, valid_from=start - timedelta(days=7)))

            for k, (trainee, company) in enumerate(picks):
                counter += 1
                policy = cpabe_engine.build_record_policy(
                    company_code=company.code, session_code=code, trainee_code=trainee.trainee_code)
                payload = {
                    "score": None,
                    "trainee_name": f"{trainee.first_name} {trainee.last_name}",
                    "trainee_email": trainee.email,
                    "company": company.name,
                    "course": course,
                    "session_code": code,
                    "completion_date": None,
                }
                enc = cpabe_engine.encrypt_record(
                    payload, policy, record_id=f"rec-{trainee.trainee_code}", version=1)
                if stage == "needs":
                    attendance = None
                else:
                    attendance = "Absent" if (k == n - 1 and i % 2 == 0) else "Present"
                db.add(TrainingRecord(
                    id=f"rec-demo-{counter:03d}",
                    trainee_id=trainee.id,
                    session_id=sess.id,
                    company_at_completion_id=company.id,
                    course_name=course,
                    status="In progress",
                    attendance_status=attendance,
                    encryption_policy=policy,
                    policy_version=1,
                    abe_ciphertext=enc.get("abe_ciphertext"),
                    payload_ciphertext=enc.get("payload_ciphertext"),
                    nonce=enc.get("nonce"),
                    is_encrypted=True,
                ))
            summary.append((code, stage, start.date().isoformat(), course, n))

        db.flush()
        # 4. Re-issue the trainer key so it covers the new demo sessions (and the backfilled pilot ones)
        attribute_manager.issue_or_rekey_user(db=db, user=trainer, commit=False)

        print("\nDemo cohorts:")
        for code, stage, d, course, n in summary:
            print(f"  {code:11s} {stage:9s} {d}  {n} trainees  {course}")
        print(f"  total new records: {counter}")
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
