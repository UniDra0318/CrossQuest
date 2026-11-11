"""Idempotent Round 11 demo scenario seeder (SCN-01 through SCN-12) and mixed-question topper.

Run inside the backend container:
    python seed_demo_scenarios.py            # dry run
    python seed_demo_scenarios.py --apply
    python seed_demo_scenarios.py --remove --apply
    python seed_demo_scenarios.py --reset SCN-01 --apply
    python seed_demo_scenarios.py --reset all --apply
"""
import sys
import uuid
import hashlib
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.database import admin_engine
from app.core.security import get_password_hash
from app.models.entities import (
    User, ClientCompany, Course, Trainee, TraineeAffiliation, TrainingSession,
    TrainingRecord, TrainingRecordVersion, TrainerAssignment, Certificate,
    Notification, AnomalyAlert, ImportBatch,
    Quiz, QuizQuestion, QuizAnswerKey, QuizAttempt, GamificationProgress,
)
from seed_demo_cohorts import get_or_create_course, encrypt_and_add_record

APPLY = "--apply" in sys.argv
REMOVE = "--remove" in sys.argv

RESET_TARGET = None
if "--reset" in sys.argv:
    idx = sys.argv.index("--reset")
    if idx + 1 < len(sys.argv):
        RESET_TARGET = sys.argv[idx + 1]

DEV_PASSWORD = "password123"

SYNTHETIC_TRAINEES = [
    ("scn_mia", "Mia", "Villanueva", "scn_mia@demo.crossquest.test", "TRN-9001", "VHL", "MiaV"),
    ("scn_noel", "Noel", "Castillo", "scn_noel@demo.crossquest.test", "TRN-9002", "VHL", "NoelC"),
    ("scn_paolo", "Paolo", "Reyes", "scn_paolo@demo.crossquest.test", "TRN-9003", "ROP", "PaoloR"),
    ("scn_carla", "Carla", "Mendoza", "scn_carla@demo.crossquest.test", "TRN-9004", "EWALIC", "CarlaM"),
    ("scn_ines", "Ines", "Bautista", "scn_ines@demo.crossquest.test", "TRN-9005", "VHL", "InesB"),
    ("scn_gabe", "Gabe", "Soriano", "scn_gabe@demo.crossquest.test", "TRN-9006", "ROP", "GabeS"),
    ("scn_ivy", "Ivy", "Navarro", "scn_ivy@demo.crossquest.test", "TRN-9007", "BIBSP", "IvyN"),
]

MIXED_BANK = [
    (
        "true_false",
        "True or False: Only the assigned Trainer may issue the irreversible session-level sign-off.",
        ["True", "False"],
        0,
        None,
        None,
        "Per Capstone Rule U-17, only the assigned Trainer performs the irreversible session sign-off.",
    ),
    (
        "identification",
        "Identify the security control that keeps quiz answer keys in a separate server-side table.",
        [],
        0,
        None,
        {"accepted": ["sec-26", "server-side answer keys", "quiz_answer_keys", "answer key isolation"]},
        "SEC-26 isolates answer keys server-side and grades submissions on the backend.",
    ),
    (
        "sequence",
        "Order the CrossQuest training completion workflow from enrollment to certificate issuance.",
        [],
        0,
        {"steps": ["Enroll in Session", "Mark Attendance Present", "Trainer Sign-Off", "Issue Certificate"]},
        {"order": [0, 1, 2, 3]},
        "Participants must be enrolled and marked Present before Trainer sign-off issues a certificate.",
    ),
    (
        "multiple_choice",
        "Which role is permitted to enter or correct official assessment scores with a mandatory reason?",
        ["Account Manager", "Administrator", "Trainee", "External Auditor"],
        1,
        None,
        None,
        "Administrators only may enter or correct official scores, preserving prior versions.",
    ),
]


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def ensure_mixed_questions(db):
    """Tops up each approved quiz to 8 questions with a mix of the 4 Phase 1 types without deleting existing data."""
    approved_quizzes = db.query(Quiz).filter(Quiz.is_approved == True).all()
    added = 0
    for qz in approved_quizzes:
        existing = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == qz.id).all()
        if len(existing) >= 8:
            continue
        existing_prompts = {q.question_text.strip().lower() for q in existing}
        need = 8 - len(existing)
        idx = 0
        while need > 0 and idx < len(MIXED_BANK) * 2:
            qtype, prompt, opts, corr, pub_p, ans_p, expl = MIXED_BANK[idx % len(MIXED_BANK)]
            idx += 1
            if prompt.strip().lower() in existing_prompts:
                prompt_text = f"{prompt} ({qz.title[:24]} #{len(existing) + 1})"
            else:
                prompt_text = prompt
            existing_prompts.add(prompt_text.strip().lower())
            qq = QuizQuestion(
                id=str(uuid.uuid4()),
                quiz_id=qz.id,
                question_type=qtype,
                question_text=prompt_text,
                options=opts,
                payload=pub_p,
                correct_answer=corr,
                explanation=expl,
                points=10,
            )
            db.add(qq)
            db.flush()
            db.add(QuizAnswerKey(
                id=str(uuid.uuid4()),
                question_id=qq.id,
                correct_answer=corr,
                answer_payload=ans_p,
                explanation=expl,
            ))
            existing.append(qq)
            need -= 1
            added += 1
    return added


def _ensure_smt_quiz(db, trainer_id):
    smt = get_or_create_course(db, "Strategic Management Tools", "SMT")
    smt.is_pilot = True
    existing = db.query(Quiz).filter(Quiz.course_id == smt.id, Quiz.is_approved == True).first()
    if existing:
        return existing
    qz = Quiz(
        id="qz-scn-smt-01",
        course_id=smt.id,
        session_id=None,
        title="Strategic Management Tools: Frameworks & Execution",
        version_no=1,
        is_closed=False,
        is_approved=True,
        approved_by_user_id=trainer_id,
        approved_at=_now() - timedelta(days=5),
        created_by_user_id=trainer_id,
        created_at=_now() - timedelta(days=6),
    )
    db.add(qz)
    db.flush()
    for qtype, prompt, opts, corr, pub_p, ans_p, expl in MIXED_BANK:
        qq = QuizQuestion(
            id=str(uuid.uuid4()),
            quiz_id=qz.id,
            question_type=qtype,
            question_text=prompt,
            options=opts,
            payload=pub_p,
            correct_answer=corr,
            explanation=expl,
            points=10,
        )
        db.add(qq)
        db.flush()
        db.add(QuizAnswerKey(
            id=str(uuid.uuid4()),
            question_id=qq.id,
            correct_answer=corr,
            answer_payload=ans_p,
            explanation=expl,
        ))
    return qz


def _get_staff(db):
    def find_user(email_part, fallback_role=None):
        u = db.query(User).filter(User.email.ilike(f"%{email_part}%")).first()
        if not u and fallback_role:
            u = db.query(User).filter(User.role == fallback_role).first()
        return u

    joey = find_user("joey.mallari", "admin")
    len_admin = find_user("len.mallari", "admin") or find_user("info@crossworks", "admin") or joey
    erika = find_user("erika.bana", "account_manager")
    sharon = find_user("sharon.devera", "account_manager") or erika
    elena = find_user("finance@crossworks", "finance")
    jordan = find_user("jordan.ramos", "trainer")
    billy = find_user("billy", "trainer")
    if not billy:
        billy = User(
            id="u-scn-billy",
            email="billy.fernandez@demo.crossquest.test",
            full_name="Billy Fernandez",
            role="trainer",
            hashed_password=get_password_hash(DEV_PASSWORD),
            is_active=True,
        )
        db.add(billy)
        db.flush()
    return {
        "joey": joey, "len": len_admin, "erika": erika, "sharon": sharon,
        "elena": elena, "jordan": jordan, "billy": billy,
    }


def _ensure_companies(db):
    comp_map = {c.code: c for c in db.query(ClientCompany).all()}
    defaults = [
        ("VHL", "Vertiv (Singapore) Holdings PTE LTD-ROHQ"),
        ("ROP", "Red Oak Properties, Inc."),
        ("EWALIC", "East West Ageas Life Insurance Corporation"),
        ("BIBSP", "Boehringer Ingelheim Business Services Philippines Inc."),
    ]
    for code, name in defaults:
        if code not in comp_map:
            c = ClientCompany(id=str(uuid.uuid4()), code=code, name=name)
            db.add(c)
            db.flush()
            comp_map[code] = c
    return comp_map


def _ensure_synthetic_trainees(db, comp_map):
    pw_hash = get_password_hash(DEV_PASSWORD)
    t_map = {}
    for key, first, last, email, code, comp_code, disp in SYNTHETIC_TRAINEES:
        comp = comp_map[comp_code]
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                id=f"u-{key}",
                email=email,
                full_name=f"{first} {last}",
                role="trainee",
                assigned_client_accounts=[comp_code],
                hashed_password=pw_hash,
                is_active=True,
            )
            db.add(user)
            db.flush()
        trn = db.query(Trainee).filter(Trainee.trainee_code == code).first()
        if not trn:
            trn = Trainee(
                id=f"t-{key}",
                user_id=user.id,
                trainee_code=code,
                first_name=first,
                last_name=last,
                email=email,
                display_name=disp,
                current_company_id=comp.id,
                current_streak=3,
            )
            db.add(trn)
            db.flush()
        gam = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trn.id).first()
        if not gam:
            db.add(GamificationProgress(
                id=f"gam-{key}",
                trainee_id=trn.id,
                points=200,
                level=3,
                badges=["FIRST_STEP"],
                quizzes_completed=2,
                streak=3,
            ))
        t_map[key] = (user, trn, comp)
    return t_map


def _upsert_session(db, sess_id, code, course, start_dt, end_dt, trainer_id):
    s = db.query(TrainingSession).filter(TrainingSession.session_code == code).first()
    if not s:
        s = TrainingSession(
            id=sess_id,
            session_code=code,
            course_id=course.id,
            course_name=course.name,
            start_date=start_dt,
            end_date=end_dt,
            delivery_type="Dedicated",
            delivery_mode="Hybrid",
            venue="Crossworks Makati Training Center",
            trainer_signed_off=False,
        )
        db.add(s)
        db.flush()
    ta = db.query(TrainerAssignment).filter(
        TrainerAssignment.session_id == s.id,
        TrainerAssignment.user_id == trainer_id,
    ).first()
    if not ta:
        db.add(TrainerAssignment(
            id=f"ta-{code.lower()}",
            user_id=trainer_id,
            session_id=s.id,
        ))
    return s


def _ensure_pme_quizzes(db, pme_course, trainer_id):
    qs = db.query(Quiz).filter(Quiz.course_id == pme_course.id, Quiz.is_approved == True).all()
    for i in range(len(qs), 3):
        qz = Quiz(
            id=f"qz-scn-pme-{i+1}",
            course_id=pme_course.id,
            title=f"Project Management Essentials Module {i+1}",
            version_no=1,
            is_closed=False,
            is_approved=True,
            approved_by_user_id=trainer_id,
            approved_at=_now() - timedelta(days=5),
            created_by_user_id=trainer_id,
        )
        db.add(qz)
        db.flush()
        qs.append(qz)
    return qs


def _seed_attempts_for_trainee(db, trn, quizzes, count):
    db.query(QuizAttempt).filter(QuizAttempt.trainee_id == trn.id).delete()
    for qz in quizzes[:count]:
        db.add(QuizAttempt(
            id=f"att-{trn.trainee_code[-4:]}-{hashlib.md5(qz.id.encode()).hexdigest()[:20]}",
            quiz_id=qz.id,
            trainee_id=trn.id,
            quiz_version=qz.version_no or 1,
            score=100.0,
            total_points=80,
            is_scored=True,
            submitted_at=_now() - timedelta(days=1),
        ))


def apply_scenarios(db):
    staff = _get_staff(db)
    comp_map = _ensure_companies(db)
    t_map = _ensure_synthetic_trainees(db, comp_map)
    now = _now()

    pme = get_or_create_course(db, "Project Management Essentials", "PME")
    pme.is_pilot = True
    _ensure_smt_quiz(db, staff["jordan"].id)
    pme_quizzes = _ensure_pme_quizzes(db, pme, staff["jordan"].id)
    ensure_mixed_questions(db)

    # SCN-01 (also used by SCN-05 & SCN-06): Mia, VHL, PME, 2/3 quizzes, Present, In progress
    s01 = _upsert_session(db, "sess-scn-01", "SCN-01", pme, now - timedelta(days=7), now - timedelta(days=5), staff["jordan"].id)
    if not db.query(TrainingRecord).filter(TrainingRecord.id == "rec-scn-01").first():
        encrypt_and_add_record(db, "rec-scn-01", t_map["scn_mia"][1], t_map["scn_mia"][2], s01, pme.name, "In progress", "Present", None, None, staff["joey"].id)
    _seed_attempts_for_trainee(db, t_map["scn_mia"][1], pme_quizzes, 2)

    # SCN-02: Noel, VHL, 3/3 quizzes, Absent, In progress
    s02 = _upsert_session(db, "sess-scn-02", "SCN-02", pme, now - timedelta(days=6), now - timedelta(days=4), staff["jordan"].id)
    if not db.query(TrainingRecord).filter(TrainingRecord.id == "rec-scn-02").first():
        encrypt_and_add_record(db, "rec-scn-02", t_map["scn_noel"][1], t_map["scn_noel"][2], s02, pme.name, "In progress", "Absent", None, None, staff["joey"].id)
    _seed_attempts_for_trainee(db, t_map["scn_noel"][1], pme_quizzes, 3)

    # SCN-03: Paolo, ROP, future-dated session
    s03 = _upsert_session(db, "sess-scn-03", "SCN-03", pme, now + timedelta(days=10), now + timedelta(days=12), staff["jordan"].id)
    if not db.query(TrainingRecord).filter(TrainingRecord.id == "rec-scn-03").first():
        encrypt_and_add_record(db, "rec-scn-03", t_map["scn_paolo"][1], t_map["scn_paolo"][2], s03, pme.name, "In progress", "Present", None, None, staff["joey"].id)

    # SCN-04: Carla, EWALIC, Completed record with wrong score (62.0 -> Joey corrects)
    s04 = _upsert_session(db, "sess-scn-04", "SCN-04", pme, now - timedelta(days=14), now - timedelta(days=12), staff["jordan"].id)
    s04.trainer_signed_off = True
    s04.trainer_sign_off_at = now - timedelta(days=12)
    s04.trainer_sign_off_user_id = staff["jordan"].id
    if not db.query(TrainingRecord).filter(TrainingRecord.id == "rec-scn-04").first():
        encrypt_and_add_record(db, "rec-scn-04", t_map["scn_carla"][1], t_map["scn_carla"][2], s04, pme.name, "Completed", "Present", 62.0, now - timedelta(days=12), staff["joey"].id)

    # SCN-08: Ines, PMP expiring in 25 days + CAPM already expired
    if not db.query(Certificate).filter(Certificate.id == "cert-scn-08-pmp").first():
        db.add(Certificate(
            id="cert-scn-08-pmp",
            trainee_id=t_map["scn_ines"][1].id,
            cert_type_code="PMP",
            title="Project Management Professional (PMP)",
            serial_number="PMP-SCN08-01",
            issue_date=now - timedelta(days=1070),
            expiry_date=now + timedelta(days=25),
            status="Expiring soon",
            is_nearing_renewal=True,
        ))
    if not db.query(Certificate).filter(Certificate.id == "cert-scn-08-capm").first():
        db.add(Certificate(
            id="cert-scn-08-capm",
            trainee_id=t_map["scn_ines"][1].id,
            cert_type_code="CAPM",
            title="Certified Associate in Project Management (CAPM)",
            serial_number="CAPM-SCN08-02",
            issue_date=now - timedelta(days=1120),
            expiry_date=now - timedelta(days=25),
            status="Expired",
            is_nearing_renewal=False,
        ))

    # SCN-09: Peer alert review (Joey is subject -> blocked from reviewing; Len reviews)
    if not db.query(AnomalyAlert).filter(AnomalyAlert.id == "alt-scn-09-joey").first():
        db.add(AnomalyAlert(
            id="alt-scn-09-joey",
            subject_user_id=staff["joey"].id,
            rule_code="R4_ADMIN_DELETION",
            severity_base="HIGH", severity_final="HIGH", severity="HIGH",
            status="NEW",
            event_count=1,
            description="Scenario SCN-09: Record soft-deletion by Administrator Joey Mallari requires peer review (OI-30).",
        ))
    if not db.query(AnomalyAlert).filter(AnomalyAlert.id == "alt-scn-09-am").first():
        db.add(AnomalyAlert(
            id="alt-scn-09-am",
            subject_user_id=staff["erika"].id,
            rule_code="R1_OUT_OF_SCOPE",
            severity_base="MEDIUM", severity_final="MEDIUM", severity="MEDIUM",
            status="NEW",
            event_count=1,
            description="Scenario SCN-09: Out-of-scope tenant access attempt by Account Manager.",
        ))

    # SCN-11: Import batch with quarantined rows
    if not db.query(ImportBatch).filter(ImportBatch.id == "imp-scn-11").first():
        db.add(ImportBatch(
            id="imp-scn-11",
            file_hash="scn11" + "0" * 59,
            source_file_name="scn11_quarantine_batch.csv",
            record_count=10,
            in_scope_count=8,
            quarantined_count=2,
            reconciled=False,
            loaded_by_user_id=staff["elena"].id,
        ))

    # SCN-12: Ivy, BIBSP (Sharon De Vera's scope)
    s12 = _upsert_session(db, "sess-scn-12", "SCN-12", pme, now - timedelta(days=3), now - timedelta(days=1), staff["jordan"].id)
    if not db.query(TrainingRecord).filter(TrainingRecord.id == "rec-scn-12").first():
        encrypt_and_add_record(db, "rec-scn-12", t_map["scn_ivy"][1], t_map["scn_ivy"][2], s12, pme.name, "In progress", "Present", None, None, staff["joey"].id)


def reset_scenario(db, scenario_id: str):
    """Resets one scenario (or 'all') back to its initial seeded state."""
    sid = scenario_id.upper()
    if sid == "ALL":
        remove_scenarios(db)
        apply_scenarios(db)
        return

    staff = _get_staff(db)
    comp_map = _ensure_companies(db)
    t_map = _ensure_synthetic_trainees(db, comp_map)
    pme = get_or_create_course(db, "Project Management Essentials", "PME")
    pme_quizzes = _ensure_pme_quizzes(db, pme, staff["jordan"].id)

    sess_code = "SCN-01" if sid in ("SCN-01", "SCN-05", "SCN-06") else sid
    sess = db.query(TrainingSession).filter(TrainingSession.session_code == sess_code).first()
    if sess and sess_code != "SCN-04":
        sess.trainer_signed_off = False
        sess.trainer_sign_off_at = None
        sess.trainer_sign_off_user_id = None
        sess.trainer_sign_off_notes = None

    rec_id_map = {
        "SCN-01": ("rec-scn-01", "In progress", "Present", None, None, "scn_mia", 2),
        "SCN-05": ("rec-scn-01", "In progress", "Present", None, None, "scn_mia", 2),
        "SCN-06": ("rec-scn-01", "In progress", "Present", None, None, "scn_mia", 2),
        "SCN-02": ("rec-scn-02", "In progress", "Absent", None, None, "scn_noel", 3),
        "SCN-03": ("rec-scn-03", "In progress", "Present", None, None, "scn_paolo", 0),
        "SCN-04": ("rec-scn-04", "Completed", "Present", 62.0, _now() - timedelta(days=12), "scn_carla", 0),
        "SCN-12": ("rec-scn-12", "In progress", "Present", None, None, "scn_ivy", 0),
    }
    if sid in rec_id_map:
        rid, st, att, sc, cdate, tkey, qcount = rec_id_map[sid]
        rec = db.query(TrainingRecord).filter(TrainingRecord.id == rid).first()
        if rec:
            rec.status = st
            rec.attendance_status = att
            rec.score = sc
            rec.completion_date = cdate
            db.query(TrainingRecordVersion).filter(
                TrainingRecordVersion.record_id == rid,
                TrainingRecordVersion.version_no > 1,
            ).delete()
            db.query(Certificate).filter(
                Certificate.record_id == rid,
                ~Certificate.id.like("cert-scn-%"),
            ).delete(synchronize_session=False)
        trn = t_map[tkey][1]
        _seed_attempts_for_trainee(db, trn, pme_quizzes, qcount)
        gam = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trn.id).first()
        if gam:
            gam.points = qcount * 100
            gam.quizzes_completed = qcount
            gam.level = max(1, 1 + (gam.points // 100))

    if sid == "SCN-09":
        for aid in ("alt-scn-09-joey", "alt-scn-09-am"):
            al = db.query(AnomalyAlert).filter(AnomalyAlert.id == aid).first()
            if al:
                al.status = "NEW"
                al.disposition = None
                al.review_note = None
                al.reviewed_by_user_id = None
                al.reviewed_at = None


def remove_scenarios(db):
    for sql in [
        "DELETE FROM quiz_attempts WHERE id LIKE 'att-scn-%' OR trainee_id LIKE 't-scn_%'",
        "DELETE FROM certificates WHERE id LIKE 'cert-scn-%' OR record_id LIKE 'rec-scn-%'",
        "DELETE FROM training_record_versions WHERE record_id LIKE 'rec-scn-%'",
        "DELETE FROM training_records WHERE id LIKE 'rec-scn-%'",
        "DELETE FROM trainer_assignments WHERE id LIKE 'ta-scn-%'",
        "DELETE FROM training_sessions WHERE session_code LIKE 'SCN-%'",
        "DELETE FROM anomaly_alerts WHERE id LIKE 'alt-scn-%'",
        "DELETE FROM import_batches WHERE id LIKE 'imp-scn-%'",
        "DELETE FROM gamification_progress WHERE id LIKE 'gam-scn_%'",
    ]:
        db.execute(text(sql))


def main():
    SessionLocal = sessionmaker(bind=admin_engine)
    db = SessionLocal()
    try:
        if REMOVE:
            remove_scenarios(db)
            action = "removed scenarios"
        elif RESET_TARGET:
            reset_scenario(db, RESET_TARGET)
            action = f"reset {RESET_TARGET}"
        else:
            apply_scenarios(db)
            action = "applied SCN-01..SCN-12 + mixed questions"

        if APPLY:
            db.commit()
            print(f"[APPLIED] Successfully {action}.")
        else:
            db.rollback()
            print(f"[DRY RUN] Would have {action}. Pass --apply to commit.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
