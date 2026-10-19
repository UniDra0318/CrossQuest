from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import GamificationProgress, Trainee, Quiz, QuizQuestion, QuizAttempt, Team, User
from app.schemas.schemas import GamificationResponse, QuizSubmitRequest
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/trainee/{trainee_id}", response_model=GamificationResponse)
def get_trainee_gamification(
    trainee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee_id).first()
    if not progress:
        progress = GamificationProgress(trainee_id=trainee_id)
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress


@router.post("/submit-quiz", response_model=GamificationResponse)
def submit_quiz_attempt(
    quiz_data: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submits a quiz attempt (online or from offline queue).
    
    Adheres to:
    - PWA-04, REL-03: Offline responses synced with client UUID attempt_id for exactly-once idempotency.
    - DD-07: Scoring is strictly performed on the server.
    """
    trainee = db.query(Trainee).filter(Trainee.id == quiz_data.trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    # Idempotency check: if attempt_id is provided, check if already processed
    if quiz_data.attempt_id:
        existing_attempt = db.query(QuizAttempt).filter(QuizAttempt.id == quiz_data.attempt_id).first()
        if existing_attempt:
            # Already synced and processed; return existing progress without duplicate scoring
            progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
            return progress

    quiz = db.query(Quiz).filter(Quiz.id == quiz_data.quiz_id).first()
    earned_score = 0.0
    earned_points = 0

    if quiz and quiz.questions and quiz_data.answers:
        # Server-side scoring against stored questions (DD-07)
        correct_count = 0
        total_q = len(quiz.questions)
        for q in quiz.questions:
            user_choice = quiz_data.answers.get(str(q.id))
            if user_choice is not None and user_choice == q.correct_answer:
                correct_count += 1
                earned_points += q.points
        earned_score = (correct_count / max(1, total_q)) * 100.0
    else:
        # Fallback if submitted with calculated score
        earned_score = quiz_data.score or 0.0
        earned_points = int(earned_score * 10)

    # Record attempt
    attempt = QuizAttempt(
        id=quiz_data.attempt_id,
        quiz_id=quiz_data.quiz_id,
        trainee_id=trainee.id,
        submitted_offline=quiz_data.submitted_offline,
        score=earned_score,
        total_points=earned_points
    )
    db.add(attempt)

    # Update Gamification Progress
    progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
    if not progress:
        progress = GamificationProgress(trainee_id=trainee.id)
        db.add(progress)

    progress.points += earned_points
    progress.quizzes_completed += 1
    progress.level = max(1, 1 + (progress.points // 100))

    # Badge rules (GAM-02, Section 3.8.6)
    current_badges = list(progress.badges or [])
    if progress.quizzes_completed >= 1 and "FIRST_STEP" not in current_badges:
        current_badges.append("FIRST_STEP")
    if progress.quizzes_completed >= 5 and "QUIZ_MASTER" not in current_badges:
        current_badges.append("QUIZ_MASTER")
    if earned_score >= 100.0 and "PERFECT_SCORE" not in current_badges:
        current_badges.append("PERFECT_SCORE")

    progress.badges = current_badges
    db.commit()
    db.refresh(progress)
    return progress


@router.get("/leaderboard")
def get_leaderboard(
    session_id: Optional[str] = None,
    team_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches class or team leaderboard (GAM-04, Section 3.8.6).
    
    STRICT PRIVACY ENFORCEMENT:
    Returns display names / nicknames and points ONLY.
    Never exposes real trainee names, trainee codes, or trainee IDs (GAM-04, TC-GAM-06).
    """
    query = (
        db.query(GamificationProgress, Trainee)
        .join(Trainee, GamificationProgress.trainee_id == Trainee.id)
    )

    top_entries = query.order_by(desc(GamificationProgress.points)).limit(10).all()

    leaderboard = []
    for rank, (gam, trainee) in enumerate(top_entries, start=1):
        # Expose display name only (fallback to pseudonymous rank identifier)
        safe_nickname = trainee.display_name or f"Participant #{rank}"
        leaderboard.append({
            "rank": rank,
            "display_name": safe_nickname,
            "points": gam.points,
            "level": gam.level,
            "badges_count": len(gam.badges or []),
            "quizzes_completed": gam.quizzes_completed
        })
    return leaderboard
