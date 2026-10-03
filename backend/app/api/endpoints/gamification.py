from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.entities import GamificationProgress, Trainee
from app.schemas.schemas import GamificationResponse, QuizSubmitRequest
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/trainee/{trainee_id}", response_model=GamificationResponse)
def get_trainee_gamification(trainee_id: str, db: Session = Depends(get_db)):
    progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee_id).first()
    if not progress:
        progress = GamificationProgress(trainee_id=trainee_id)
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress


@router.post("/submit-quiz", response_model=GamificationResponse)
def submit_quiz_score(quiz_data: QuizSubmitRequest, db: Session = Depends(get_db)):
    progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == quiz_data.trainee_id).first()
    if not progress:
        progress = GamificationProgress(trainee_id=quiz_data.trainee_id)
        db.add(progress)

    # Award points based on score
    earned_points = int(quiz_data.score * 10)
    progress.points += earned_points
    progress.quizzes_completed += 1

    # Level calculation: 100 points per level
    progress.level = max(1, 1 + (progress.points // 100))

    # Badge awards
    current_badges = list(progress.badges or [])
    if progress.quizzes_completed >= 1 and "FIRST_STEP" not in current_badges:
        current_badges.append("FIRST_STEP")
    if progress.quizzes_completed >= 5 and "QUIZ_MASTER" not in current_badges:
        current_badges.append("QUIZ_MASTER")
    if quiz_data.score >= 100 and "PERFECT_SCORE" not in current_badges:
        current_badges.append("PERFECT_SCORE")

    progress.badges = current_badges
    db.commit()
    db.refresh(progress)
    return progress


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    top_entries = (
        db.query(GamificationProgress, Trainee)
        .join(Trainee, GamificationProgress.trainee_id == Trainee.id)
        .order_by(desc(GamificationProgress.points))
        .limit(10)
        .all()
    )

    leaderboard = []
    for rank, (gam, trainee) in enumerate(top_entries, start=1):
        leaderboard.append({
            "rank": rank,
            "trainee_id": trainee.id,
            "trainee_name": f"{trainee.first_name} {trainee.last_name}",
            "points": gam.points,
            "level": gam.level,
            "badges_count": len(gam.badges or []),
            "quizzes_completed": gam.quizzes_completed
        })
    return leaderboard
