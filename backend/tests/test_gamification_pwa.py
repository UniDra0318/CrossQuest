"""Tests for Gamification, Security Hardening & PWA Offline Prevention.

Meets Chapter III Requirements (Phase 6, SEC-26, OI-03):
- SEC-26: Offline quizzes disabled (ENABLE_OFFLINE_QUIZZES=False); online idempotency via attempt_id.
- SEC-26: Answer keys isolated in QuizAnswerKey; scored strictly server-side.
- SEC-26: Exactly one scored attempt permitted per quiz version.
- SEC-26: Per-question correctness withheld until quiz is closed.
- OI-03: Class & company leaderboards with nickname opt-out from company board.
- Real-time level and consecutive-day activity streak synchronization.
- Table 28 test cases.
"""

import pytest
import uuid
from datetime import datetime, date, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, create_access_token
from app.core.config import settings
from app.models.entities import (
    User, ClientCompany, Trainee, Quiz, QuizQuestion, QuizAnswerKey,
    QuizAttempt, GamificationProgress, TrainingSession, TrainingRecord
)


@pytest.fixture(scope="module", autouse=True)
def clean_gamification_tables():
    """Clean gamification and quiz attempt tables before tests."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        db.query(QuizAttempt).delete()
        db.query(GamificationProgress).delete()
        db.query(QuizAnswerKey).delete()
        db.query(QuizQuestion).delete()
        db.query(Quiz).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture
def gamification_fixture(db_session: Session):
    """Sets up company, trainees, trainer, quiz, and questions."""
    db = db_session

    company_a = db.query(ClientCompany).filter_by(code="CORP_GAM_A").first()
    if not company_a:
        company_a = ClientCompany(id="comp-gam-a", name="Gamification Corp A", code="CORP_GAM_A")
        db.add(company_a)

    company_b = db.query(ClientCompany).filter_by(code="CORP_GAM_B").first()
    if not company_b:
        company_b = ClientCompany(id="comp-gam-b", name="Gamification Corp B", code="CORP_GAM_B")
        db.add(company_b)

    db.commit()

    # Trainee 1 (Company A)
    u1 = db.query(User).filter_by(email="trainee_gam1@test.ph").first()
    if not u1:
        u1 = User(
            id=str(uuid.uuid4()),
            email="trainee_gam1@test.ph",
            username="trainee_gam1",
            full_name="Alice Dela Cruz",
            hashed_password=get_password_hash("Pass123!"),
            role="trainee",
            is_active=True
        )
        db.add(u1)
        db.commit()

    t1 = db.query(Trainee).filter_by(user_id=u1.id).first()
    if not t1:
        t1 = Trainee(
            id=str(uuid.uuid4()),
            user_id=u1.id,
            first_name="Alice",
            last_name="Dela Cruz",
            email="trainee_gam1@test.ph",
            display_name="CyberNinja_Alice",
            trainee_code="TRN_GAM_01",
            current_company_id=company_a.id,
            leaderboard_opt_out=False,
            current_streak=0
        )
        db.add(t1)
        db.commit()

    # Trainee 2 (Company B)
    u2 = db.query(User).filter_by(email="trainee_gam2@test.ph").first()
    if not u2:
        u2 = User(
            id=str(uuid.uuid4()),
            email="trainee_gam2@test.ph",
            username="trainee_gam2",
            full_name="Bob Smith",
            hashed_password=get_password_hash("Pass123!"),
            role="trainee",
            is_active=True
        )
        db.add(u2)
        db.commit()

    t2 = db.query(Trainee).filter_by(user_id=u2.id).first()
    if not t2:
        t2 = Trainee(
            id=str(uuid.uuid4()),
            user_id=u2.id,
            first_name="Bob",
            last_name="Smith",
            email="trainee_gam2@test.ph",
            display_name="Shadow_Bob",
            trainee_code="TRN_GAM_02",
            current_company_id=company_b.id,
            leaderboard_opt_out=False,
            current_streak=0
        )
        db.add(t2)
        db.commit()

    # Trainee 3 (Company A - for company leaderboard tests)
    u3 = db.query(User).filter_by(email="trainee_gam3@test.ph").first()
    if not u3:
        u3 = User(
            id=str(uuid.uuid4()),
            email="trainee_gam3@test.ph",
            username="trainee_gam3",
            full_name="Charlie Ramos",
            hashed_password=get_password_hash("Pass123!"),
            role="trainee",
            is_active=True
        )
        db.add(u3)
        db.commit()

    t3 = db.query(Trainee).filter_by(user_id=u3.id).first()
    if not t3:
        t3 = Trainee(
            id=str(uuid.uuid4()),
            user_id=u3.id,
            first_name="Charlie",
            last_name="Ramos",
            email="trainee_gam3@test.ph",
            display_name="SecPro_Charlie",
            trainee_code="TRN_GAM_03",
            current_company_id=company_a.id,
            leaderboard_opt_out=False,
            current_streak=0
        )
        db.add(t3)
        db.commit()

    # Trainer User (non-trainee)
    u_trainer = db.query(User).filter_by(email="trainer_gam@test.ph").first()
    if not u_trainer:
        u_trainer = User(
            id=str(uuid.uuid4()),
            email="trainer_gam@test.ph",
            username="trainer_gam",
            full_name="Prof Trainer",
            hashed_password=get_password_hash("Pass123!"),
            role="trainer",
            is_active=True
        )
        db.add(u_trainer)
        db.commit()

    # Training Session for class tests
    sess = db.query(TrainingSession).filter_by(course_name="Gamified SecOps Workshop").first()
    if not sess:
        sess = TrainingSession(
            id=str(uuid.uuid4()),
            session_code="SESS-GAM-001",
            course_name="Gamified SecOps Workshop",
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=2)
        )
        db.add(sess)
        db.commit()

    # Enroll Alice and Charlie in session
    r1 = db.query(TrainingRecord).filter_by(trainee_id=t1.id, session_id=sess.id).first()
    if not r1:
        r1 = TrainingRecord(
            id=str(uuid.uuid4()),
            trainee_id=t1.id,
            session_id=sess.id,
            course_name=sess.course_name,
            company_at_completion_id=company_a.id,
            encryption_policy="CORP_GAM_A_ONLY",
            payload_ciphertext="dummy_ct",
            status="In progress"
        )
        db.add(r1)

    r3 = db.query(TrainingRecord).filter_by(trainee_id=t3.id, session_id=sess.id).first()
    if not r3:
        r3 = TrainingRecord(
            id=str(uuid.uuid4()),
            trainee_id=t3.id,
            session_id=sess.id,
            course_name=sess.course_name,
            company_at_completion_id=company_a.id,
            encryption_policy="CORP_GAM_A_ONLY",
            payload_ciphertext="dummy_ct",
            status="In progress"
        )
        db.add(r3)
    db.commit()

    # Create Quiz with 2 Questions & Separate Answer Keys (SEC-26)
    quiz = db.query(Quiz).filter_by(title="Cybersecurity Fundamentals Quiz").first()
    if not quiz:
        quiz = Quiz(
            id=str(uuid.uuid4()),
            session_id=sess.id,
            title="Cybersecurity Fundamentals Quiz",
            version_no=1,
            is_closed=False
        )
        db.add(quiz)
        db.commit()

        q1 = QuizQuestion(
            id=str(uuid.uuid4()),
            quiz_id=quiz.id,
            question_text="What does CP-ABE stand for?",
            options=["Ciphertext-Policy Attribute-Based Encryption", "Central Public AES", "Core Protection ABE"],
            correct_answer=0,
            points=20
        )
        q2 = QuizQuestion(
            id=str(uuid.uuid4()),
            quiz_id=quiz.id,
            question_text="Which curve provides 128-bit security for pairings?",
            options=["Secp256k1", "BN254", "Curve25519"],
            correct_answer=1,
            points=30
        )
        db.add(q1)
        db.add(q2)
        db.commit()

        # Isolate Answer Keys in dedicated QuizAnswerKey table (SEC-26)
        ans1 = QuizAnswerKey(
            id=str(uuid.uuid4()),
            question_id=q1.id,
            correct_answer=0,
            explanation="Ciphertext-Policy Attribute-Based Encryption embeds policies into ciphertexts."
        )
        ans2 = QuizAnswerKey(
            id=str(uuid.uuid4()),
            question_id=q2.id,
            correct_answer=1,
            explanation="BN254 is a Barreto-Naehrig pairing-friendly elliptic curve offering ~128-bit security."
        )
        db.add(ans1)
        db.add(ans2)
        db.commit()

    db.refresh(quiz)
    return {
        "user1": u1,
        "trainee1": t1,
        "user2": u2,
        "trainee2": t2,
        "user3": u3,
        "trainee3": t3,
        "trainer": u_trainer,
        "session": sess,
        "quiz": quiz,
        "company_a": company_a,
        "company_b": company_b
    }


def test_tc_gam_01_server_side_scoring(client: TestClient, gamification_fixture):
    """TC-GAM-01: Quiz answers scored strictly server-side against isolated QuizAnswerKey."""
    user1 = gamification_fixture["user1"]
    trainee1 = gamification_fixture["trainee1"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user1.id)

    q_ids = [str(q.id) for q in quiz.questions]
    # Q0: correct (0), Q1: wrong (0 instead of 1)
    answers = {q_ids[0]: 0, q_ids[1]: 0}

    attempt_id = str(uuid.uuid4())
    payload = {
        "attempt_id": attempt_id,
        "trainee_id": trainee1.id,
        "quiz_id": quiz.id,
        "answers": answers,
        "submitted_offline": False
    }

    resp = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()

    # Trainee earned 20 points from Q0 (Q1 wrong)
    assert data["points"] == 20
    assert data["quizzes_completed"] == 1
    assert data["streak"] >= 1


def test_tc_gam_02_client_score_tampering_ignored(client: TestClient, gamification_fixture, db_session: Session):
    """TC-GAM-02: Client-provided score=100 is discarded; server evaluates strictly against QuizAnswerKey."""
    user2 = gamification_fixture["user2"]
    trainee2 = gamification_fixture["trainee2"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user2.id)

    q_ids = [str(q.id) for q in quiz.questions]
    # Both answers WRONG (index 2)
    tampered_answers = {q_ids[0]: 2, q_ids[1]: 2}

    attempt_id = str(uuid.uuid4())
    payload = {
        "attempt_id": attempt_id,
        "trainee_id": trainee2.id,
        "quiz_id": quiz.id,
        "score": 100.0, # Attempting client score forgery
        "answers": tampered_answers,
        "submitted_offline": False
    }

    resp = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200

    # Query QuizAttempt record in DB to verify server stored 0 score, NOT 100
    attempt_record = db_session.query(QuizAttempt).filter_by(id=attempt_id).first()
    assert attempt_record is not None
    assert attempt_record.score == 0.0
    assert attempt_record.total_points == 0


def test_tc_gam_03_idempotent_attempt_replay(client: TestClient, gamification_fixture):
    """TC-GAM-03: Replaying an attempt with identical attempt_id returns cached result without duplicate points."""
    user3 = gamification_fixture["user3"]
    trainee3 = gamification_fixture["trainee3"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user3.id)

    attempt_id = str(uuid.uuid4())
    q_ids = [str(q.id) for q in quiz.questions]
    # Both answers CORRECT (20 + 30 = 50 pts)
    answers = {q_ids[0]: 0, q_ids[1]: 1}

    payload = {
        "attempt_id": attempt_id,
        "trainee_id": trainee3.id,
        "quiz_id": quiz.id,
        "answers": answers,
        "submitted_offline": False
    }

    # 1. First submission succeeds
    resp1 = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp1.status_code == 200
    pts_after_1 = resp1.json()["points"]
    quizzes_after_1 = resp1.json()["quizzes_completed"]

    # 2. Replay of same attempt
    resp2 = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp2.status_code == 200
    pts_after_2 = resp2.json()["points"]
    quizzes_after_2 = resp2.json()["quizzes_completed"]

    # Points and completed counts MUST NOT double count
    assert pts_after_2 == pts_after_1
    assert quizzes_after_2 == quizzes_after_1


def test_tc_gam_04_and_05_badges_and_level_progression(client: TestClient, gamification_fixture):
    """TC-GAM-04 & TC-GAM-05: Badges unlocked on milestone and levels incremented."""
    user3 = gamification_fixture["user3"]
    trainee3 = gamification_fixture["trainee3"]
    token = create_access_token(subject=user3.id)

    resp = client.get(f"/api/v1/gamification/trainee/{trainee3.id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "FIRST_STEP" in data["badges"]
    assert "PERFECT_SCORE" in data["badges"]
    assert data["level"] >= 1
    assert data["streak"] >= 1


def test_tc_gam_06_leaderboard_privacy(client: TestClient, gamification_fixture):
    """TC-GAM-06: Leaderboard response NEVER returns PII (first_name, last_name, email, trainee_code)."""
    user1 = gamification_fixture["user1"]
    token = create_access_token(subject=user1.id)

    resp = client.get("/api/v1/gamification/leaderboard", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    leaderboard = resp.json()
    assert len(leaderboard) >= 1

    for entry in leaderboard:
        assert "rank" in entry
        assert "display_name" in entry
        assert "points" in entry
        assert "level" in entry

        # Verify strict privacy
        assert "first_name" not in entry
        assert "last_name" not in entry
        assert "email" not in entry
        assert "trainee_code" not in entry
        assert "trainee_id" not in entry


def test_tc_gam_07_cross_company_pseudonymization(client: TestClient, gamification_fixture):
    """TC-GAM-07: In cross-company view, trainees from other companies appear as Participant #Rank."""
    user1 = gamification_fixture["user1"]  # Trainee from Company A
    token1 = create_access_token(subject=user1.id)

    resp = client.get("/api/v1/gamification/leaderboard?company_only=false", headers={"Authorization": f"Bearer {token1}"})
    assert resp.status_code == 200
    entries = resp.json()

    names = [e["display_name"] for e in entries]
    assert "CyberNinja_Alice" in names
    # Company B's display name ("Shadow_Bob") should be pseudonymized to Participant #... for Trainee from Company A
    assert "Shadow_Bob" not in names


def test_tc_gam_08_role_gating_trainer_forbidden(client: TestClient, gamification_fixture):
    """TC-GAM-08: Trainers and non-trainees receive 403 Forbidden on quiz submission."""
    trainer = gamification_fixture["trainer"]
    trainee1 = gamification_fixture["trainee1"]
    quiz = gamification_fixture["quiz"]
    token_trainer = create_access_token(subject=trainer.id)

    payload = {
        "attempt_id": str(uuid.uuid4()),
        "trainee_id": trainee1.id,
        "quiz_id": quiz.id,
        "answers": {},
        "submitted_offline": False
    }

    resp = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token_trainer}"})
    assert resp.status_code == 403


def test_tc_sec_26_offline_quiz_disabled(client: TestClient, gamification_fixture):
    """SEC-26: Offline quiz submission is disabled; returns 400 Bad Request."""
    user1 = gamification_fixture["user1"]
    trainee1 = gamification_fixture["trainee1"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user1.id)

    payload = {
        "attempt_id": str(uuid.uuid4()),
        "trainee_id": trainee1.id,
        "quiz_id": quiz.id,
        "answers": {},
        "submitted_offline": True # Flagged as offline submission
    }

    resp = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert "Offline quiz submissions are disabled" in resp.json()["detail"]


def test_tc_sec_26_isolated_answer_keys_not_exposed_to_trainee(client: TestClient, gamification_fixture):
    """SEC-26: Trainees fetching quiz questions NEVER receive correct answers or explanations."""
    user1 = gamification_fixture["user1"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user1.id)

    resp = client.get(f"/api/v1/gamification/quizzes/{quiz.id}/questions", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    questions = resp.json()
    assert len(questions) >= 2

    for q in questions:
        assert "question_text" in q
        assert "options" in q
        assert "points" in q
        # SEC-26 verification: correct answers & explanations strictly absent
        assert "correct_answer" not in q
        assert "explanation" not in q


def test_tc_sec_26_one_scored_attempt_per_quiz_version(client: TestClient, gamification_fixture):
    """SEC-26: Only one scored attempt is permitted per quiz version."""
    user1 = gamification_fixture["user1"]
    trainee1 = gamification_fixture["trainee1"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user1.id)

    # Trainee1 already submitted in test_tc_gam_01 for quiz version 1.
    # Attempting a second scored attempt with a NEW attempt_id must be rejected.
    payload = {
        "attempt_id": str(uuid.uuid4()),
        "trainee_id": trainee1.id,
        "quiz_id": quiz.id,
        "answers": {},
        "submitted_offline": False
    }

    resp = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert "Only one scored attempt is permitted" in resp.json()["detail"]


def test_tc_sec_26_withhold_correctness_until_closed(client: TestClient, gamification_fixture, db_session: Session):
    """SEC-26: Detailed per-question review is withheld until quiz session is closed by trainer."""
    user3 = gamification_fixture["user3"]
    quiz = gamification_fixture["quiz"]
    trainer = gamification_fixture["trainer"]
    token_trainee = create_access_token(subject=user3.id)
    token_trainer = create_access_token(subject=trainer.id)

    attempt = db_session.query(QuizAttempt).filter_by(quiz_id=quiz.id, trainee_id=gamification_fixture["trainee3"].id).first()
    assert attempt is not None

    # 1. While quiz.is_closed == False, review endpoint returns 403 Forbidden
    resp1 = client.get(
        f"/api/v1/gamification/quizzes/{quiz.id}/review/{attempt.id}",
        headers={"Authorization": f"Bearer {token_trainee}"}
    )
    assert resp1.status_code == 403
    assert "withheld until the quiz session is officially closed" in resp1.json()["detail"]

    # 2. Trainer officially closes the quiz session
    resp_close = client.post(
        f"/api/v1/gamification/quizzes/{quiz.id}/close",
        headers={"Authorization": f"Bearer {token_trainer}"}
    )
    assert resp_close.status_code == 200
    assert resp_close.json()["is_closed"] is True

    # 3. Now review endpoint returns question explanations and answer keys
    resp2 = client.get(
        f"/api/v1/gamification/quizzes/{quiz.id}/review/{attempt.id}",
        headers={"Authorization": f"Bearer {token_trainee}"}
    )
    assert resp2.status_code == 200
    data = resp2.json()
    assert data["review_available"] is True
    assert len(data["questions_review"]) >= 2
    for item in data["questions_review"]:
        assert "explanation" in item
        assert "correct_answer" in item


def test_tc_oi_03_class_and_company_leaderboards_with_opt_out(client: TestClient, gamification_fixture):
    """OI-03: Class & company leaderboards with nickname opt-out from company board."""
    user1 = gamification_fixture["user1"]
    trainee1 = gamification_fixture["trainee1"]
    session = gamification_fixture["session"]
    company_a = gamification_fixture["company_a"]
    token1 = create_access_token(subject=user1.id)

    # Ensure opt-out is False initially
    client.put(
        "/api/v1/gamification/profile/leaderboard-opt-out",
        json={"opt_out": False},
        headers={"Authorization": f"Bearer {token1}"}
    )

    # 1. Class leaderboard returns session participants
    resp_class = client.get(
        f"/api/v1/gamification/leaderboard/class?session_id={session.id}",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert resp_class.status_code == 200
    class_entries = resp_class.json()
    assert len(class_entries) >= 1

    # 2. Company leaderboard initially includes trainee1
    resp_comp1 = client.get(
        "/api/v1/gamification/leaderboard/company",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert resp_comp1.status_code == 200
    names1 = [e["display_name"] for e in resp_comp1.json()]
    assert trainee1.display_name in names1

    # 3. Trainee opts out of company leaderboard
    resp_opt = client.put(
        "/api/v1/gamification/profile/leaderboard-opt-out",
        json={"opt_out": True},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert resp_opt.status_code == 200
    assert resp_opt.json()["leaderboard_opt_out"] is True

    # 4. Company leaderboard now EXCLUDES trainee1 (OI-03)
    resp_comp2 = client.get(
        "/api/v1/gamification/leaderboard/company",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert resp_comp2.status_code == 200
    names2 = [e["display_name"] for e in resp_comp2.json()]
    assert trainee1.display_name not in names2

    # 5. But trainee1 remains in the class leaderboard
    resp_class2 = client.get(
        f"/api/v1/gamification/leaderboard/class?session_id={session.id}",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert resp_class2.status_code == 200
    class_names2 = [e["display_name"] for e in resp_class2.json()]
    assert trainee1.display_name in class_names2


def test_tc_gam_13_quiz_catalog_and_authoring(client: TestClient, gamification_fixture):
    """Verifies real database quiz catalog retrieval and Trainer/Admin question authoring."""
    trainer = gamification_fixture["trainer"]
    user1 = gamification_fixture["user1"]

    trainer_token = create_access_token(subject=trainer.id)
    trainee_token = create_access_token(subject=user1.id)

    # 1. Trainer creates new quiz in DB
    create_resp = client.post(
        "/api/v1/gamification/quizzes",
        json={"title": "Cloud Threat Modeling Challenge"},
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert create_resp.status_code == 200
    quiz_data = create_resp.json()
    quiz_id = quiz_data["id"]
    assert quiz_data["title"] == "Cloud Threat Modeling Challenge"

    # 2. Trainer adds question with isolated answer key
    q_resp = client.post(
        f"/api/v1/gamification/quizzes/{quiz_id}/questions",
        json={
            "question_text": "What is the primary objective of STRIDE threat modeling?",
            "options": ["Identify security threats", "Compile source code", "Deploy containers", "Format database"],
            "correct_option": 0,
            "points": 15,
            "explanation": "STRIDE categorizes system threats into Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, and Elevation of privilege."
        },
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert q_resp.status_code == 200
    q_data = q_resp.json()
    assert q_data["question_text"].startswith("What is the primary")

    # 3. Trainee lists quizzes from real DB
    list_resp = client.get(
        "/api/v1/gamification/quizzes",
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert list_resp.status_code == 200
    quizzes = list_resp.json()
    assert any(q["id"] == quiz_id for q in quizzes)
