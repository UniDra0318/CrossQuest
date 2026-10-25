"""Tests for Gamification & PWA Offline Queue (TC-GAM-01..08, TC-PWA-01..02).

Meets requirements:
- DD-07: Strictly server-side quiz scoring. Client-provided scores are discarded.
- PWA-04, REL-03: Client-generated UUID attempt_id for idempotent offline queue sync.
- GAM-01..04: Points, levels, badges, and privacy-preserving leaderboards.
- Table 28 test cases.
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, create_access_token
from app.models.entities import (
    User, ClientCompany, Trainee, Quiz, QuizQuestion, QuizAttempt, GamificationProgress
)


@pytest.fixture(scope="module", autouse=True)
def clean_gamification_tables():
    """Clean gamification and quiz attempt tables before tests."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        db.query(QuizAttempt).delete()
        db.query(GamificationProgress).delete()
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
            current_company_id=company_a.id
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
            current_company_id=company_b.id
        )
        db.add(t2)
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

    # Create Quiz with 2 Questions
    quiz = db.query(Quiz).filter_by(title="Cybersecurity Fundamentals Quiz").first()
    if not quiz:
        quiz = Quiz(
            id=str(uuid.uuid4()),
            title="Cybersecurity Fundamentals Quiz",
            version_no=1
        )
        db.add(quiz)
        db.commit()

        q1 = QuizQuestion(
            id=str(uuid.uuid4()),
            quiz_id=quiz.id,
            question_text="What does CP-ABE stand for?",
            options=["Ciphertext-Policy Attribute-Based Encryption", "Central Public AES", "Core Protection ABE"],
            correct_answer=0, # Index 0 is correct
            points=20
        )
        q2 = QuizQuestion(
            id=str(uuid.uuid4()),
            quiz_id=quiz.id,
            question_text="Which curve provides 128-bit security for pairings?",
            options=["Secp256k1", "BN254", "Curve25519"],
            correct_answer=1, # Index 1 is correct (BN254)
            points=30
        )
        db.add(q1)
        db.add(q2)
        db.commit()

    db.refresh(quiz)
    return {
        "user1": u1,
        "trainee1": t1,
        "user2": u2,
        "trainee2": t2,
        "trainer": u_trainer,
        "quiz": quiz,
        "company_a": company_a,
        "company_b": company_b
    }


def test_tc_gam_01_server_side_scoring(client: TestClient, gamification_fixture):
    """TC-GAM-01: Quiz answers scored strictly server-side against stored answer keys."""
    user1 = gamification_fixture["user1"]
    trainee1 = gamification_fixture["trainee1"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user1.id)

    q_ids = [str(q.id) for q in quiz.questions]
    # Q0: correct (choice 0), Q1: wrong (choice 0 instead of 1)
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

    # Trainee earned 20 points from Q0 (Q1 was wrong)
    assert data["points"] == 20
    assert data["quizzes_completed"] == 1


def test_tc_gam_02_client_score_tampering_ignored(client: TestClient, gamification_fixture, db_session: Session):
    """TC-GAM-02: Client-provided score=100 is discarded; server evaluates against key."""
    user1 = gamification_fixture["user1"]
    trainee1 = gamification_fixture["trainee1"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user1.id)

    q_ids = [str(q.id) for q in quiz.questions]
    # Both answers WRONG
    tampered_answers = {q_ids[0]: 2, q_ids[1]: 2}

    attempt_id = str(uuid.uuid4())
    payload = {
        "attempt_id": attempt_id,
        "trainee_id": trainee1.id,
        "quiz_id": quiz.id,
        "score": 100.0, # Attempting to forge a 100% score from client
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
    user1 = gamification_fixture["user1"]
    trainee1 = gamification_fixture["trainee1"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user1.id)

    attempt_id = str(uuid.uuid4())
    q_ids = [str(q.id) for q in quiz.questions]
    # Both answers CORRECT (20 + 30 = 50 pts)
    answers = {q_ids[0]: 0, q_ids[1]: 1}

    payload = {
        "attempt_id": attempt_id,
        "trainee_id": trainee1.id,
        "quiz_id": quiz.id,
        "answers": answers,
        "submitted_offline": True
    }

    # 1. First submission succeeds
    resp1 = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp1.status_code == 200
    pts_after_1 = resp1.json()["points"]
    quizzes_after_1 = resp1.json()["quizzes_completed"]

    # 2. Replay of same attempt (PWA queue network retry)
    resp2 = client.post("/api/v1/gamification/submit-quiz", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp2.status_code == 200
    pts_after_2 = resp2.json()["points"]
    quizzes_after_2 = resp2.json()["quizzes_completed"]

    # Points and completed counts MUST NOT double count
    assert pts_after_2 == pts_after_1
    assert quizzes_after_2 == quizzes_after_1


def test_tc_gam_04_and_05_badges_and_level_progression(client: TestClient, gamification_fixture):
    """TC-GAM-04 & TC-GAM-05: Badges unlocked on milestone and levels incremented."""
    user1 = gamification_fixture["user1"]
    trainee1 = gamification_fixture["trainee1"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user1.id)

    # Check that trainee unlocked FIRST_STEP and PERFECT_SCORE
    resp = client.get(f"/api/v1/gamification/trainee/{trainee1.id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "FIRST_STEP" in data["badges"]
    assert "PERFECT_SCORE" in data["badges"]
    assert data["level"] >= 1


def test_tc_gam_06_leaderboard_privacy(client: TestClient, gamification_fixture):
    """TC-GAM-06: Leaderboard response NEVER returns PII (first_name, last_name, email, trainee_code)."""
    user1 = gamification_fixture["user1"]
    token = create_access_token(subject=user1.id)

    resp = client.get("/api/v1/gamification/leaderboard", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    leaderboard = resp.json()
    assert len(leaderboard) >= 1

    for entry in leaderboard:
        # Check allowed fields
        assert "rank" in entry
        assert "display_name" in entry
        assert "points" in entry
        assert "level" in entry

        # Verify strict privacy: forbidden fields
        assert "first_name" not in entry
        assert "last_name" not in entry
        assert "email" not in entry
        assert "trainee_code" not in entry
        assert "trainee_id" not in entry


def test_tc_gam_07_cross_company_pseudonymization(client: TestClient, gamification_fixture):
    """TC-GAM-07: In cross-company view, trainees from other companies appear as Participant #Rank."""
    user1 = gamification_fixture["user1"]  # Trainee from Company A
    token1 = create_access_token(subject=user1.id)

    # User 1 views global cross-company leaderboard
    resp = client.get("/api/v1/gamification/leaderboard?company_only=false", headers={"Authorization": f"Bearer {token1}"})
    assert resp.status_code == 200
    entries = resp.json()

    # User 1 should see own display name ("CyberNinja_Alice"), but Company B's trainee should be pseudonymized
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


def test_tc_pwa_01_and_02_offline_batch_replay(client: TestClient, gamification_fixture, db_session: Session):
    """TC-PWA-01 & TC-PWA-02: Queued offline attempts persist submitted_offline flag and sync correctly."""
    user2 = gamification_fixture["user2"]
    trainee2 = gamification_fixture["trainee2"]
    quiz = gamification_fixture["quiz"]
    token = create_access_token(subject=user2.id)

    # Simulate 2 queued attempts in Dexie/IndexedDB offline queue
    q_ids = [str(q.id) for q in quiz.questions]
    attempt_id_1 = str(uuid.uuid4())
    attempt_id_2 = str(uuid.uuid4())

    queue = [
        {
            "attempt_id": attempt_id_1,
            "trainee_id": trainee2.id,
            "quiz_id": quiz.id,
            "answers": {q_ids[0]: 0}, # 20 pts
            "submitted_offline": True
        },
        {
            "attempt_id": attempt_id_2,
            "trainee_id": trainee2.id,
            "quiz_id": quiz.id,
            "answers": {q_ids[0]: 0, q_ids[1]: 1}, # 50 pts
            "submitted_offline": True
        }
    ]

    for item in queue:
        resp = client.post("/api/v1/gamification/submit-quiz", json=item, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200

    # Verify both records saved with submitted_offline=True
    rec1 = db_session.query(QuizAttempt).filter_by(id=attempt_id_1).first()
    rec2 = db_session.query(QuizAttempt).filter_by(id=attempt_id_2).first()
    assert rec1 is not None and rec1.submitted_offline is True
    assert rec2 is not None and rec2.submitted_offline is True
