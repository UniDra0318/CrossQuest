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
        progress = GamificationProgress(trainee_id=trainee_id, points=0, quizzes_completed=0, level=1, badges=[])
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
    - DD-07: Scoring is strictly performed on the server. Client-provided score is ignored.
    - TC-GAM-08: Non-trainees (Trainers/Account Managers/Finance) cannot submit quiz attempts.
    """
    # Role gating & identity verification
    trainee = db.query(Trainee).filter(Trainee.id == quiz_data.trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    if current_user.role == "trainee":
        if trainee.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Trainees can only submit quiz attempts for their own account."
            )
    elif current_user.role == "admin":
        pass  # Admin allowed for test/admin purposes
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainees can submit quiz attempts."
        )

    # Idempotency check: if attempt_id is provided, check if already processed (PWA-04)
    if quiz_data.attempt_id:
        existing_attempt = db.query(QuizAttempt).filter(QuizAttempt.id == quiz_data.attempt_id).first()
        if existing_attempt:
            # Already synced and processed; return existing progress without duplicate scoring
            progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
            return progress

    quiz = db.query(Quiz).filter(Quiz.id == quiz_data.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    earned_score = 0.0
    earned_points = 0

    # Strictly server-side scoring against stored questions (DD-07, TC-GAM-01, TC-GAM-02)
    if quiz.questions:
        correct_count = 0
        total_q = len(quiz.questions)
        answers = quiz_data.answers or {}
        for q in quiz.questions:
            user_choice = answers.get(str(q.id))
            if user_choice is not None and user_choice == q.correct_answer:
                correct_count += 1
                earned_points += (q.points if q.points is not None else 10)
        earned_score = (correct_count / max(1, total_q)) * 100.0
    else:
        earned_score = 0.0
        earned_points = 0

    # Record attempt with attempt_id for future idempotent replay
    attempt_id = quiz_data.attempt_id or str(uuid.uuid4())
    attempt = QuizAttempt(
        id=attempt_id,
        quiz_id=quiz.id,
        trainee_id=trainee.id,
        submitted_offline=quiz_data.submitted_offline,
        score=earned_score,
        total_points=earned_points
    )
    db.add(attempt)

    # Update Gamification Progress
    progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
    if not progress:
        progress = GamificationProgress(trainee_id=trainee.id, points=0, quizzes_completed=0, level=1, badges=[])
        db.add(progress)

    if progress.points is None:
        progress.points = 0
    if progress.quizzes_completed is None:
        progress.quizzes_completed = 0
    if progress.level is None:
        progress.level = 1

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
    company_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches class or team leaderboard (GAM-04, Section 3.8.6).
    
    STRICT PRIVACY ENFORCEMENT (TC-GAM-06, TC-GAM-07):
    - Real trainee names, emails, and trainee codes are NEVER returned.
    - Trainee company scoping: if company_only is True, filters to fellow trainees of the same company.
    - Global cross-company view: participants outside the trainee's company are strictly pseudonymized.
    """
    query = (
        db.query(GamificationProgress, Trainee)
        .join(Trainee, GamificationProgress.trainee_id == Trainee.id)
    )

    viewer_trainee = None
    if current_user.role == "trainee":
        viewer_trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
        if company_only and viewer_trainee and viewer_trainee.current_company_id:
            query = query.filter(Trainee.current_company_id == viewer_trainee.current_company_id)

    top_entries = query.order_by(desc(GamificationProgress.points)).limit(10).all()

    leaderboard = []
    for rank, (gam, trainee) in enumerate(top_entries, start=1):
        # Determine pseudonymization based on viewing role and company boundary
        if current_user.role == "trainee" and not company_only:
            # Trainee looking at global cross-company leaderboard
            if viewer_trainee and trainee.current_company_id == viewer_trainee.current_company_id:
                safe_nickname = trainee.display_name or f"Colleague #{rank}"
            else:
                safe_nickname = f"Participant #{rank}"
        else:
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

