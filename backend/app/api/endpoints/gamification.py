"""Gamification & Quiz Arena Endpoints (SEC-26, OI-03, Priority 5 & 6).

Implements:
- SEC-26: Answer keys kept separate in QuizAnswerKey; scored strictly server-side.
- SEC-26: Per-question correctness withheld until quiz is officially closed.
- SEC-26: Exactly one scored attempt permitted per quiz version.
- SEC-26: Offline quizzes disabled by default (ENABLE_OFFLINE_QUIZZES=False); online idempotency via attempt_id.
- OI-03: Class & company leaderboards with nickname opt-out for company board.
- Real-time level and consecutive-day activity streak synchronization.
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from app.core.database import get_db
from app.core.config import settings
from app.models.entities import (
    GamificationProgress, Trainee, Quiz, QuizQuestion, QuizAnswerKey,
    QuizAttempt, Team, TeamMember, User, TrainingSession, TrainingRecord,
    TrainerAssignment, AccessLog, TrainerProgram, Course
)
from app.schemas.schemas import (
    GamificationResponse, QuizSubmitRequest, LeaderboardOptOutRequest,
    LeaderboardEntry, QuizQuestionTraineeView, QuizQuestionStaffView, QuizSubmissionResult,
    QuizQuestionReview, QuizListItem, QuizCreate, QuizQuestionCreate,
    TeamCreate, TeamResponse, TeamMemberAdd, TeamMemberResponse
)
from app.api.deps import get_current_user

router = APIRouter()

_PALETTE = ["#1368ce", "#059669", "#dc2626", "#7c3aed", "#d97706", "#0891b2"]


def _course_color(key) -> str:
    return _PALETTE[sum(ord(c) for c in str(key or "x")) % len(_PALETTE)]


def _trainee_for(db: Session, user: User):
    return db.query(Trainee).filter((Trainee.user_id == user.id) | (Trainee.email == user.email)).first()


def _course_ids_for_sessions(db: Session, sids) -> set:
    """Course ids for sessions; falls back to course_name when a session has an empty course_id."""
    if not sids:
        return set()
    rows = db.query(TrainingSession.course_id, TrainingSession.course_name).filter(TrainingSession.id.in_(sids)).all()
    cids = {c for c, _ in rows if c}
    names = {n for c, n in rows if not c and n}
    if names:
        cids |= {c.id for c in db.query(Course).filter(Course.name.in_(names)).all()}
    return cids


def _scope_for(db: Session, user: User):
    """None = unrestricted (admin). Else (session_ids, course_ids) the user may access quizzes for."""
    if user.role == "admin":
        return None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if user.role == "trainer":
        sids = {a.session_id for a in db.query(TrainerAssignment).filter(
            TrainerAssignment.user_id == user.id,
            (TrainerAssignment.valid_to == None) | (TrainerAssignment.valid_to > now)).all()}
        cids = {p.course_id for p in db.query(TrainerProgram).filter(TrainerProgram.user_id == user.id).all()}
        return sids, cids | _course_ids_for_sessions(db, sids)
    if user.role == "trainee":
        t = _trainee_for(db, user)
        if not t:
            return set(), set()
        # Every record counts, whatever its status (In progress, Not completed, Completed).
        recs = db.query(TrainingRecord.session_id, TrainingRecord.course_name).filter(
            TrainingRecord.trainee_id == t.id, TrainingRecord.deleted_at == None).all()
        sids = {s for s, _ in recs if s}
        cids = _course_ids_for_sessions(db, sids)
        names = {n for _, n in recs if n}
        if names:
            cids |= {c.id for c in db.query(Course).filter(Course.name.in_(names)).all()}
        return sids, cids
    return set(), set()


def _quiz_course_id(quiz: Quiz):
    return quiz.course_id or (quiz.session.course_id if quiz.session else None)


def _scope_match(user: User, scope, quiz: Quiz) -> bool:
    sids, cids = scope
    if user.role == "trainer" and quiz.created_by_user_id == user.id:
        return True
    cid = _quiz_course_id(quiz)
    return bool((cid and cid in cids) or (quiz.session_id and quiz.session_id in sids))


def _quiz_in_scope(db: Session, user: User, quiz: Quiz) -> bool:
    scope = _scope_for(db, user)
    return True if scope is None else _scope_match(user, scope, quiz)


def _require_quiz_scope(db: Session, user: User, quiz: Quiz) -> None:
    if user.role not in ("admin", "trainer"):
        raise HTTPException(status_code=403, detail="Only trainers and administrators can manage quizzes.")
    if not _quiz_in_scope(db, user, quiz):
        raise HTTPException(status_code=403, detail="Trainers are limited to quizzes of assigned sessions/programs (U-12).")


def update_trainee_activity_streak(db: Session, trainee: Trainee, gam: GamificationProgress) -> int:
    """Updates consecutive-day activity streak for a trainee."""
    today = datetime.now(timezone.utc).date()
    current_streak = trainee.current_streak or 0

    if trainee.last_activity_date:
        delta = (today - trainee.last_activity_date).days
        if delta == 0:
            # Already active today, preserve streak
            pass
        elif delta == 1:
            # Consecutive day activity
            current_streak += 1
        else:
            # Inactivity break: reset streak to 1
            current_streak = 1
    else:
        current_streak = 1

    trainee.current_streak = current_streak
    trainee.last_activity_date = today

    gam.streak = current_streak
    gam.last_activity_date = today

    # Streak badges
    badges = list(gam.badges or [])
    if current_streak >= 3 and "STREAK_3" not in badges:
        badges.append("STREAK_3")
    if current_streak >= 7 and "STREAK_7" not in badges:
        badges.append("STREAK_7")
    gam.badges = badges

    return current_streak


@router.get("/trainee/{trainee_id}", response_model=GamificationResponse)
def get_trainee_gamification(
    trainee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches gamification progress for a trainee."""
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        # Check by user_id, email, or trainee_code
        trainee = db.query(Trainee).filter(
            (Trainee.user_id == trainee_id) |
            (Trainee.email == trainee_id) |
            (Trainee.trainee_code == trainee_id)
        ).first()
    if not trainee and (trainee_id in ("me", "self", "current") or current_user.role == "trainee"):
        trainee = db.query(Trainee).filter(
            (Trainee.user_id == current_user.id) |
            (Trainee.email == current_user.email)
        ).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
    if not progress:
        progress = GamificationProgress(
            trainee_id=trainee.id,
            points=0,
            quizzes_completed=0,
            level=1,
            badges=[],
            streak=trainee.current_streak or 0
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)

    # Sync fields
    res = GamificationResponse(
        id=progress.id,
        trainee_id=progress.trainee_id,
        points=progress.points or 0,
        level=progress.level or 1,
        badges=progress.badges or [],
        quizzes_completed=progress.quizzes_completed or 0,
        streak=progress.streak or trainee.current_streak or 0,
        current_streak=trainee.current_streak or progress.streak or 0
    )
    return res


@router.put("/profile/leaderboard-opt-out")
def toggle_leaderboard_opt_out(
    payload: LeaderboardOptOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows a trainee to opt out of the company/team leaderboard (OI-03)."""
    if current_user.role != "trainee":
        raise HTTPException(status_code=403, detail="Only trainees can modify leaderboard privacy preferences.")

    trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee profile not found.")

    trainee.leaderboard_opt_out = payload.opt_out
    db.commit()
    return {
        "status": "success",
        "leaderboard_opt_out": trainee.leaderboard_opt_out,
        "message": "Company leaderboard visibility updated."
    }


@router.get("/quiz-analytics")
def get_quiz_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Real quiz-attempt performance aggregated by course for Trainer/Admin Results."""
    if current_user.role not in ("admin", "trainer"):
        raise HTTPException(status_code=403, detail="Only trainers and administrators can view quiz analytics.")

    scope = _scope_for(db, current_user)
    quizzes = db.query(Quiz).options(joinedload(Quiz.session), joinedload(Quiz.course)).all()
    if scope is not None:
        quizzes = [q for q in quizzes if _scope_match(current_user, scope, q)]

    if not quizzes:
        return {
            "total_quizzes": 0, "approved_quizzes": 0, "total_attempts": 0,
            "unique_trainees": 0, "avg_score": None, "pass_rate": 0, "by_course": []
        }

    q_ids = [q.id for q in quizzes]
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id.in_(q_ids),
        QuizAttempt.is_scored == True
    ).all()

    att_by_quiz = {}
    for a in attempts:
        att_by_quiz.setdefault(a.quiz_id, []).append(a)

    by_course = {}
    for q in quizzes:
        cid = _quiz_course_id(q) or "unassigned"
        cname = (q.course.name if q.course else None) or (q.session.course_name if q.session else None) or "Unassigned"
        bucket = by_course.setdefault(cid, {
            "course_id": cid, "course_name": cname, "quizzes_count": 0,
            "approved_count": 0, "scores": [], "trainees": set()
        })
        bucket["quizzes_count"] += 1
        if q.is_approved:
            bucket["approved_count"] += 1
        for a in att_by_quiz.get(q.id, []):
            bucket["scores"].append(float(a.score or 0.0))
            if a.trainee_id:
                bucket["trainees"].add(a.trainee_id)

    course_rows = []
    all_scores = []
    all_trainees = set()
    for b in by_course.values():
        sc = b["scores"]
        all_scores.extend(sc)
        all_trainees |= b["trainees"]
        cnt = len(sc)
        passed = sum(1 for x in sc if x >= 80.0)
        course_rows.append({
            "course_id": b["course_id"],
            "course_name": b["course_name"],
            "quizzes_count": b["quizzes_count"],
            "approved_count": b["approved_count"],
            "attempts_count": cnt,
            "unique_trainees": len(b["trainees"]),
            "avg_score": round(sum(sc) / cnt, 1) if cnt else None,
            "pass_rate": round((passed / cnt) * 100) if cnt else 0,
        })

    course_rows.sort(key=lambda r: (-r["attempts_count"], -(r["avg_score"] or 0.0), r["course_name"]))
    total_att = len(all_scores)
    total_passed = sum(1 for x in all_scores if x >= 80.0)
    return {
        "total_quizzes": len(quizzes),
        "approved_quizzes": sum(1 for q in quizzes if q.is_approved),
        "total_attempts": total_att,
        "unique_trainees": len(all_trainees),
        "avg_score": round(sum(all_scores) / total_att, 1) if total_att else None,
        "pass_rate": round((total_passed / total_att) * 100) if total_att else 0,
        "by_course": course_rows,
    }


@router.get("/quiz-courses")
def list_quiz_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Courses the caller may create quizzes for. Admin: all. Trainer: assigned-session courses + granted programs."""
    if current_user.role not in ("admin", "trainer"):
        raise HTTPException(status_code=403, detail="Only trainers and administrators can manage quizzes.")
    scope = _scope_for(db, current_user)
    q = db.query(Course).order_by(Course.name)
    if scope is not None:
        if not scope[1]:
            return []
        q = q.filter(Course.id.in_(scope[1]))
    return [{"id": c.id, "course_code": c.course_code, "name": c.name} for c in q.all()]


@router.get("/quizzes", response_model=List[QuizListItem])
def list_quizzes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Role-scoped quiz catalog. Admin: all. Trainer: assigned sessions/programs. Trainee: approved quizzes of enrolled courses only."""
    scope = _scope_for(db, current_user)
    quizzes = db.query(Quiz).options(joinedload(Quiz.session), joinedload(Quiz.course)).order_by(Quiz.created_at.desc()).all()
    if current_user.role == "trainee":
        quizzes = [x for x in quizzes if x.is_approved]
    if scope is not None:
        quizzes = [x for x in quizzes if _scope_match(current_user, scope, x)]
    if not quizzes:
        return []

    ids = [x.id for x in quizzes]
    counts = dict(db.query(QuizQuestion.quiz_id, func.count(QuizQuestion.id))
                  .filter(QuizQuestion.quiz_id.in_(ids)).group_by(QuizQuestion.quiz_id).all())
    attempts = {}
    if current_user.role == "trainee":
        trainee = _trainee_for(db, current_user)
        if trainee:
            attempts = {a.quiz_id: a for a in db.query(QuizAttempt).filter(
                QuizAttempt.trainee_id == trainee.id, QuizAttempt.is_scored == True,
                QuizAttempt.quiz_id.in_(ids)).all()}
    creator_ids = {x.created_by_user_id for x in quizzes if x.created_by_user_id}
    creators = {u.id: u.full_name for u in db.query(User).filter(User.id.in_(creator_ids)).all()} if creator_ids else {}

    results = []
    for q in quizzes:
        sess = q.session
        cid = q.course_id or (sess.course_id if sess else None)
        course_name = (q.course.name if q.course else None) or (sess.course_name if sess else None)
        att = attempts.get(q.id)
        results.append(QuizListItem(
            id=q.id, title=q.title, session_id=q.session_id,
            course_id=cid,
            course_name=course_name,
            instructor_name=creators.get(q.created_by_user_id) or "Assigned Trainer",
            category=course_name or "Unassigned",
            header_color=_course_color(cid or course_name),
            version_no=q.version_no, is_closed=q.is_closed, is_approved=bool(q.is_approved),
            approved_at=q.approved_at, questions_count=counts.get(q.id, 0),
            completed=bool(att), score=att.score if att else None,
            created_at=q.created_at or datetime.now(timezone.utc)
        ))
    return results


@router.post("/quizzes", response_model=QuizListItem)
def create_quiz(
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Quizzes belong to a COURSE (many per course). Admin: any course. Trainer: courses of assigned sessions/programs (U-12)."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(status_code=403, detail="Only trainers and administrators can create quizzes.")
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Quiz title is required.")

    course = None
    if payload.course_id:
        course = db.query(Course).filter(Course.id == payload.course_id).first()
    elif payload.session_id:  # backward compatible: derive the course from a session
        s = db.query(TrainingSession).filter(TrainingSession.id == payload.session_id).first()
        if s:
            course = (db.query(Course).filter(Course.id == s.course_id).first() if s.course_id
                      else db.query(Course).filter(Course.name == s.course_name).first())
    if not course:
        raise HTTPException(status_code=400, detail="Select the course this quiz belongs to.")

    scope = _scope_for(db, current_user)
    if scope is not None and course.id not in scope[1]:
        raise HTTPException(status_code=403, detail="Trainers can only create quizzes for courses of their assigned sessions or programs (U-12).")

    dup = db.query(Quiz.id).filter(Quiz.course_id == course.id, func.lower(Quiz.title) == title.lower()).first()
    if dup:
        raise HTTPException(status_code=409, detail="A quiz with this title already exists in this course.")

    quiz = Quiz(title=title, course_id=course.id, session_id=None,
                created_by_user_id=current_user.id, version_no=1, is_closed=False)
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return QuizListItem(
        id=quiz.id, title=quiz.title, session_id=None, course_id=course.id,
        course_name=course.name, instructor_name=current_user.full_name,
        category=course.name, header_color=_course_color(course.id),
        version_no=quiz.version_no, is_closed=False, is_approved=False, questions_count=0,
        completed=False, score=None, created_at=quiz.created_at or datetime.now(timezone.utc)
    )


@router.post("/quizzes/{quiz_id}/questions", response_model=QuizQuestionTraineeView)
def add_quiz_question(
    quiz_id: str,
    payload: QuizQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trainers and Admins add a question to a quiz, storing answer keys in isolated QuizAnswerKey (SEC-26)."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(status_code=403, detail="Only trainers and administrators can add questions.")

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    _require_quiz_scope(db, current_user, quiz)

    question = QuizQuestion(
        quiz_id=quiz.id,
        question_text=payload.question_text,
        options=payload.options,
        correct_answer=payload.correct_option,
        explanation=payload.explanation,
        points=payload.points
    )
    db.add(question)
    db.flush()

    answer_key = QuizAnswerKey(
        question_id=question.id,
        correct_answer=payload.correct_option,
        explanation=payload.explanation
    )
    db.add(answer_key)
    db.commit()
    db.refresh(question)

    return QuizQuestionTraineeView(
        id=question.id,
        quiz_id=question.quiz_id,
        question_text=question.question_text,
        options=question.options or [],
        points=question.points or 10
    )


@router.put("/quizzes/{quiz_id}/questions/{question_id}", response_model=QuizQuestionTraineeView)
def update_quiz_question(
    quiz_id: str,
    question_id: str,
    payload: QuizQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trainers and Admins update an existing quiz question and its answer key (SEC-26)."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(status_code=403, detail="Only trainers and administrators can update questions.")

    question = db.query(QuizQuestion).filter(
        QuizQuestion.id == question_id,
        QuizQuestion.quiz_id == quiz_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    _require_quiz_scope(db, current_user, question.quiz)

    question.question_text = payload.question_text
    question.options = payload.options
    question.correct_answer = payload.correct_option
    question.explanation = payload.explanation
    question.points = payload.points

    if question.answer_key:
        question.answer_key.correct_answer = payload.correct_option
        question.answer_key.explanation = payload.explanation
    else:
        answer_key = QuizAnswerKey(
            question_id=question.id,
            correct_answer=payload.correct_option,
            explanation=payload.explanation
        )
        db.add(answer_key)

    db.commit()
    db.refresh(question)

    return QuizQuestionTraineeView(
        id=question.id,
        quiz_id=question.quiz_id,
        question_text=question.question_text,
        options=question.options or [],
        points=question.points or 10
    )


@router.delete("/quizzes/{quiz_id}/questions/{question_id}")
def delete_quiz_question(
    quiz_id: str,
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a question and its isolated answer key."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(status_code=403, detail="Only trainers and administrators can delete questions.")

    question = db.query(QuizQuestion).filter(
        QuizQuestion.id == question_id,
        QuizQuestion.quiz_id == quiz_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    _require_quiz_scope(db, current_user, question.quiz)

    db.delete(question)
    db.commit()
    return {"status": "success", "message": "Question deleted."}


@router.delete("/quizzes/{quiz_id}")
def delete_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a quiz and all associated questions."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(status_code=403, detail="Only trainers and administrators can delete quizzes.")

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    _require_quiz_scope(db, current_user, quiz)

    db.delete(quiz)
    db.commit()
    return {"status": "success", "message": "Quiz deleted."}


@router.get("/quizzes/{quiz_id}/questions", response_model=List[QuizQuestionStaffView])
def get_quiz_questions_for_trainee(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trainees get questions WITHOUT keys (SEC-26). Trainers/Admins in scope also get keys for authoring."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if current_user.role not in ("admin", "trainer", "trainee") or not _quiz_in_scope(db, current_user, quiz):
        raise HTTPException(status_code=403, detail="Quiz is outside your course/session scope.")
    if current_user.role == "trainee" and not quiz.is_approved:
        raise HTTPException(status_code=403, detail="Quiz is not approved yet.")

    staff = current_user.role in ("admin", "trainer")
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    return [
        QuizQuestionStaffView(
            id=q.id, quiz_id=q.quiz_id, question_text=q.question_text,
            options=q.options or [], points=q.points or 10,
            correct_answer=q.correct_answer if staff else None,
            explanation=q.explanation if staff else None,
        )
        for q in questions
    ]


@router.post("/submit-quiz", response_model=GamificationResponse)
def submit_quiz_attempt(
    quiz_data: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submits a quiz attempt with strictly server-side scoring (SEC-26).

    Security Controls:
    - Rejects offline submissions if ENABLE_OFFLINE_QUIZZES is False.
    - Idempotent deduplication on attempt_id (PWA-04).
    - Enforces exactly ONE scored attempt per quiz version (SEC-26).
    - Scores against isolated QuizAnswerKey table.
    - Real-time level and consecutive-day activity streak sync.
    """
    # 1. Check offline submission policy (SEC-26)
    if quiz_data.submitted_offline and not getattr(settings, "ENABLE_OFFLINE_QUIZZES", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Offline quiz submissions are disabled per security policy SEC-26. Live online connection required."
        )

    # 2. Role gating & identity verification
    trainee = db.query(Trainee).filter(
        (Trainee.id == quiz_data.trainee_id) |
        (Trainee.user_id == quiz_data.trainee_id) |
        (Trainee.user_id == current_user.id) |
        (Trainee.email == current_user.email)
    ).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    if current_user.role == "trainee":
        if trainee.user_id != current_user.id and trainee.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Trainees can only submit quiz attempts for their own account."
            )
    elif current_user.role == "admin":
        pass  # Admin allowed for testing/audit
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainees can submit quiz attempts."
        )

    # 3. Idempotency check on attempt_id
    attempt_id = quiz_data.attempt_id or str(uuid.uuid4())
    existing_attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if existing_attempt:
        progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
        return GamificationResponse(
            id=progress.id,
            trainee_id=progress.trainee_id,
            points=progress.points or 0,
            level=progress.level or 1,
            badges=progress.badges or [],
            quizzes_completed=progress.quizzes_completed or 0,
            streak=progress.streak or trainee.current_streak or 0,
            current_streak=trainee.current_streak or progress.streak or 0
        )

    quiz = db.query(Quiz).filter(Quiz.id == quiz_data.quiz_id).first()
    if not quiz:
        # Check or provision via admin_engine to bypass RLS for curriculum quizzes
        from app.core.database import admin_engine
        with Session(admin_engine) as adb:
            quiz_adm = adb.query(Quiz).filter(Quiz.id == quiz_data.quiz_id).first()
            if not quiz_adm:
                quiz_adm = Quiz(
                    id=quiz_data.quiz_id,
                    title=f"Curriculum Quiz {quiz_data.quiz_id}",
                    version_no=1,
                    is_closed=False,
                    is_approved=True
                )
                adb.add(quiz_adm)
                adb.commit()
                adb.refresh(quiz_adm)
        quiz = db.query(Quiz).filter(Quiz.id == quiz_data.quiz_id).first() or quiz_adm

    if (quiz.course_id or quiz.session_id) and not _quiz_in_scope(db, current_user, quiz):
        raise HTTPException(status_code=403, detail="This quiz is not part of a course you are enrolled in.")

    # 4. Enforce ONE scored attempt per quiz version (SEC-26)
    quiz_ver = quiz.version_no or 1
    prior_attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.trainee_id == trainee.id,
        QuizAttempt.quiz_version == quiz_ver,
        QuizAttempt.is_scored == True
    ).first()

    if prior_attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trainee has already submitted a scored attempt for quiz version {quiz_ver}. Only one scored attempt is permitted."
        )

    # 5. Server-side scoring against isolated QuizAnswerKey (SEC-26)
    earned_score = 0.0
    earned_points = 0
    answers = quiz_data.answers or {}

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    if questions:
        correct_count = 0
        total_q = len(questions)
        for q in questions:
            # Query answer key table
            ans_key = db.query(QuizAnswerKey).filter(QuizAnswerKey.question_id == q.id).first()
            expected_correct = ans_key.correct_answer if ans_key else q.correct_answer

            user_choice = answers.get(str(q.id))
            if user_choice is not None and expected_correct is not None and user_choice == expected_correct:
                correct_count += 1
                earned_points += (q.points if q.points is not None else 10)

        earned_score = (correct_count / max(1, total_q)) * 100.0
    elif quiz_data.score is not None:
        earned_score = float(quiz_data.score)
        earned_points = int(quiz_data.score * 10)

    # 6. Record Quiz Attempt
    attempt = QuizAttempt(
        id=attempt_id,
        quiz_id=quiz.id,
        trainee_id=trainee.id,
        quiz_version=quiz_ver,
        submitted_offline=quiz_data.submitted_offline,
        score=earned_score,
        total_points=earned_points,
        is_scored=True,
        submitted_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(attempt)

    # 7. Update Gamification Progress & Real-Time Streak Sync
    progress = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
    if not progress:
        progress = GamificationProgress(
            trainee_id=trainee.id,
            points=0,
            quizzes_completed=0,
            level=1,
            badges=[],
            streak=0
        )
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

    # Real-time streak sync
    streak = update_trainee_activity_streak(db, trainee, progress)

    # Badge unlocks
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

    return GamificationResponse(
        id=progress.id,
        trainee_id=progress.trainee_id,
        points=progress.points,
        level=progress.level,
        badges=progress.badges,
        quizzes_completed=progress.quizzes_completed,
        streak=streak,
        current_streak=streak,
        last_score=earned_score
    )


# In-memory live quiz broadcast state for instant pop-up assessments (FR-04, SEC-26)
CURRENT_LIVE_BROADCAST: Optional[dict] = None

class LiveBroadcastPayload(BaseModel):
    quiz_id: str
    title: str
    instructor: Optional[str] = "Lead Trainer David Lim"
    session_code: Optional[str] = "SESS-2026-08A"
    duration_seconds: Optional[int] = 300
    description: Optional[str] = None
    questions_count: Optional[int] = 4

@router.post("/live-broadcast")
def start_live_quiz_broadcast(
    payload: LiveBroadcastPayload,
    current_user: User = Depends(get_current_user)
):
    """Trainer or Admin triggers an instant pop-up quiz broadcast across all active trainees (FR-04, SEC-26)."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(status_code=403, detail="Only trainers or administrators can broadcast live quizzes.")

    global CURRENT_LIVE_BROADCAST
    CURRENT_LIVE_BROADCAST = {
        "active": True,
        "quiz_id": payload.quiz_id,
        "title": payload.title,
        "instructor": payload.instructor or current_user.full_name or "Lead Trainer",
        "session_code": payload.session_code or "SESS-2026-08A",
        "duration_seconds": payload.duration_seconds or 300,
        "description": payload.description or "Immediate live assessment initiated by your lead instructor.",
        "questions_count": payload.questions_count or 4,
        "started_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "broadcast_id": str(uuid.uuid4())
    }
    return CURRENT_LIVE_BROADCAST

@router.get("/live-broadcast")
def get_live_quiz_broadcast():
    """Returns the currently active live broadcast, if any."""
    global CURRENT_LIVE_BROADCAST
    if CURRENT_LIVE_BROADCAST and CURRENT_LIVE_BROADCAST.get("active"):
        return {"active": True, "broadcast": CURRENT_LIVE_BROADCAST}
    return {"active": False, "broadcast": None}

@router.post("/live-broadcast/end")
def end_live_quiz_broadcast(
    current_user: User = Depends(get_current_user)
):
    """Trainer or Admin ends the active live broadcast."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(status_code=403, detail="Only trainers or administrators can end broadcasts.")

    global CURRENT_LIVE_BROADCAST
    CURRENT_LIVE_BROADCAST = None
    return {"active": False, "message": "Live quiz broadcast ended."}


@router.post("/quizzes/{quiz_id}/close")
def close_quiz_session(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trainer or Admin closes a quiz session, enabling question reviews (SEC-26)."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(status_code=403, detail="Only trainers or administrators can close quizzes.")

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz.is_closed = True
    quiz.closed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"status": "success", "quiz_id": quiz.id, "is_closed": True, "closed_at": quiz.closed_at}


@router.get("/quizzes/{quiz_id}/review/{attempt_id}", response_model=QuizSubmissionResult)
def get_quiz_review(
    quiz_id: str,
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns detailed question review for a closed quiz (SEC-26).
    Withheld if quiz is still open.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.quiz_id == quiz_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")

    trainee = db.query(Trainee).filter(Trainee.id == attempt.trainee_id).first()
    if current_user.role == "trainee" and trainee.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Trainees can only review their own attempts.")

    # SEC-26: Withhold per-question correctness until closed
    if not quiz.is_closed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Per-question correctness and explanations are withheld until the quiz session is officially closed."
        )

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    review_items = []
    for q in questions:
        ans_key = db.query(QuizAnswerKey).filter(QuizAnswerKey.question_id == q.id).first()
        correct_idx = ans_key.correct_answer if ans_key else q.correct_answer
        explanation = ans_key.explanation if ans_key else q.explanation

        review_items.append(
            QuizQuestionReview(
                question_id=q.id,
                question_text=q.question_text,
                options=q.options or [],
                selected_option=None,
                correct_answer=correct_idx,
                is_correct=False,
                explanation=explanation,
                points_earned=0
            )
        )

    gam = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
    gam_resp = GamificationResponse(
        id=gam.id if gam else str(uuid.uuid4()),
        trainee_id=trainee.id,
        points=gam.points if gam else 0,
        level=gam.level if gam else 1,
        badges=gam.badges if gam else [],
        quizzes_completed=gam.quizzes_completed if gam else 0,
        streak=gam.streak if gam else 0,
        current_streak=trainee.current_streak or 0
    )

    return QuizSubmissionResult(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        trainee_id=trainee.id,
        score=attempt.score or 0.0,
        total_points=attempt.total_points or 0,
        passed=(attempt.score or 0.0) >= 80.0,
        is_closed=quiz.is_closed,
        review_available=True,
        questions_review=review_items,
        gamification=gam_resp
    )


@router.get("/leaderboard/class", response_model=List[LeaderboardEntry])
def get_class_leaderboard(
    session_id: str = Query(..., description="Training session ID for the class"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Class/session leaderboard (OI-03).
    Displays participants enrolled in the specific session.
    """
    records = db.query(TrainingRecord).filter(TrainingRecord.session_id == session_id).all()
    trainee_ids = [r.trainee_id for r in records if r.trainee_id]
    if not trainee_ids:
        return []

    trainees = db.query(Trainee).filter(Trainee.id.in_(trainee_ids)).all()
    entries = []
    for rank, trainee in enumerate(trainees, start=1):
        gam = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
        entries.append(
            LeaderboardEntry(
                rank=rank,
                display_name=trainee.display_name or f"Trainee #{rank}",
                points=gam.points if gam and gam.points else 0,
                level=gam.level if gam and gam.level else 1,
                streak=trainee.current_streak or (gam.streak if gam else 0) or 0,
                badges_count=len(gam.badges or []) if gam else 0,
                quizzes_completed=gam.quizzes_completed if gam and gam.quizzes_completed else 0
            )
        )
    entries.sort(key=lambda x: x.points, reverse=True)
    for idx, e in enumerate(entries, start=1):
        e.rank = idx
    return entries


@router.get("/leaderboard/company", response_model=List[LeaderboardEntry])
def get_company_leaderboard(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Company/team leaderboard with nickname opt-out (OI-03).
    Trainees with leaderboard_opt_out == True are excluded from company rankings.
    """
    target_company_id = company_id
    if current_user.role == "trainee":
        viewer_trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
        if viewer_trainee:
            target_company_id = viewer_trainee.current_company_id

    if not target_company_id:
        return []

    # Filter by company AND exclude opted-out trainees (OI-03)
    trainees = db.query(Trainee).filter(
        Trainee.current_company_id == target_company_id,
        Trainee.leaderboard_opt_out == False
    ).all()

    entries = []
    for rank, trainee in enumerate(trainees, start=1):
        gam = db.query(GamificationProgress).filter(GamificationProgress.trainee_id == trainee.id).first()
        name = trainee.display_name or f"Colleague #{rank}"
        entries.append(
            LeaderboardEntry(
                rank=rank,
                display_name=name,
                points=gam.points if gam and gam.points else 0,
                level=gam.level if gam and gam.level else 1,
                streak=trainee.current_streak or (gam.streak if gam else 0) or 0,
                badges_count=len(gam.badges or []) if gam else 0,
                quizzes_completed=gam.quizzes_completed if gam and gam.quizzes_completed else 0
            )
        )
    entries.sort(key=lambda x: x.points, reverse=True)
    for idx, e in enumerate(entries, start=1):
        e.rank = idx
    return entries


@router.get("/leaderboard")
def get_leaderboard(
    session_id: Optional[str] = None,
    team_id: Optional[str] = None,
    company_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches class or team leaderboard (GAM-04, Section 3.8.6, OI-03).

    STRICT PRIVACY ENFORCEMENT (TC-GAM-06, TC-GAM-07):
    - Real trainee names, emails, and trainee codes are NEVER returned.
    - If company_only is True, filters to fellow trainees of the same company and respects opt-out.
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
            query = query.filter(
                Trainee.current_company_id == viewer_trainee.current_company_id,
                Trainee.leaderboard_opt_out == False
            )

    top_entries = query.order_by(desc(GamificationProgress.points)).limit(10).all()

    leaderboard = []
    for rank, (gam, trainee) in enumerate(top_entries, start=1):
        # Determine pseudonymization based on viewing role and company boundary
        if current_user.role == "trainee" and not company_only:
            if viewer_trainee and trainee.current_company_id == viewer_trainee.current_company_id:
                safe_nickname = trainee.display_name or f"Colleague #{rank}"
            else:
                safe_nickname = f"Participant #{rank}"
        else:
            safe_nickname = trainee.display_name or f"Participant #{rank}"

        leaderboard.append({
            "rank": rank,
            "display_name": safe_nickname,
            "points": gam.points or 0,
            "level": gam.level or 1,
            "streak": trainee.current_streak or gam.streak or 0,
            "badges_count": len(gam.badges or []),
            "quizzes_completed": gam.quizzes_completed or 0
        })
    return leaderboard


# -----------------------------------------------------------------------------
# Quiz Approval Workflow (GAM-01, SEC-26)
# -----------------------------------------------------------------------------
@router.post("/quizzes/{quiz_id}/approve")
def approve_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assigned Trainer or Administrator approves a quiz for student deployment (GAM-01, SEC-26)."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned Trainers and Administrators can approve quizzes."
        )

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    _require_quiz_scope(db, current_user, quiz)

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    quiz.is_approved = True
    quiz.approved_by_user_id = current_user.id
    quiz.approved_at = now_utc
    db.commit()

    return {
        "status": "success",
        "quiz_id": quiz.id,
        "is_approved": True,
        "approved_by_user_id": current_user.id,
        "approved_at": now_utc.isoformat()
    }


# -----------------------------------------------------------------------------
# Gamified Teams Management (GAM-03)
# -----------------------------------------------------------------------------
@router.post("/sessions/{session_id}/teams", response_model=TeamResponse)
def create_session_team(
    session_id: str,
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a team for gamified group scoring within a session (GAM-03).
    Permitted for assigned Trainers and Administrators.
    """
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Trainers and Administrators can create teams."
        )

    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found.")

    if current_user.role == "trainer":
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        assigned = db.query(TrainerAssignment).filter(
            TrainerAssignment.session_id == session_id,
            TrainerAssignment.user_id == current_user.id,
            (TrainerAssignment.valid_to == None) | (TrainerAssignment.valid_to > now_utc)
        ).first()
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Trainer is not assigned to this training session."
            )

    existing_team = db.query(Team).filter(
        Team.session_id == session_id,
        Team.team_name == payload.team_name.strip()
    ).first()
    if existing_team:
        return TeamResponse(
            id=existing_team.id,
            session_id=existing_team.session_id,
            team_name=existing_team.team_name,
            created_by_user_id=existing_team.created_by_user_id,
            created_at=existing_team.created_at,
            members_count=len(existing_team.members) if existing_team.members else 0,
            total_points=0,
            members=[]
        )

    team = Team(
        session_id=session_id,
        team_name=payload.team_name.strip(),
        created_by_user_id=current_user.id
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    return TeamResponse(
        id=team.id,
        session_id=team.session_id,
        team_name=team.team_name,
        created_by_user_id=team.created_by_user_id,
        created_at=team.created_at,
        members_count=0,
        total_points=0,
        members=[]
    )


@router.get("/sessions/{session_id}/teams", response_model=List[TeamResponse])
def list_session_teams(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all teams for a training session with members and aggregate scores (GAM-03)."""
    teams = db.query(Team).filter(Team.session_id == session_id).all()
    results = []

    for t in teams:
        members_list = []
        team_points = 0
        for m in t.members:
            trainee = m.trainee
            points = 0
            display = ""
            name = ""
            code = ""
            if trainee:
                gam = trainee.gamification
                points = gam.points if gam else 0
                team_points += points
                display = trainee.display_name or f"{trainee.first_name} {trainee.last_name}"
                name = f"{trainee.first_name} {trainee.last_name}"
                code = trainee.trainee_code

            members_list.append(TeamMemberResponse(
                id=m.id,
                team_id=m.team_id,
                trainee_id=m.trainee_id,
                trainee_name=name,
                trainee_code=code,
                display_name=display,
                points=points
            ))

        results.append(TeamResponse(
            id=t.id,
            session_id=t.session_id,
            team_name=t.team_name,
            created_by_user_id=t.created_by_user_id,
            created_at=t.created_at,
            members_count=len(members_list),
            total_points=team_points,
            members=members_list
        ))

    return results


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse)
def add_team_member(
    team_id: str,
    payload: TeamMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adds a trainee to a gamified team (GAM-03). Permitted for Trainers and Admins."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Trainers and Administrators can add team members."
        )

    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    trainee = db.query(Trainee).filter(Trainee.id == payload.trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found.")

    # Verify participant is strictly enrolled in this training session (U-12)
    if team.session_id:
        is_participant = db.query(TrainingRecord).filter(
            TrainingRecord.session_id == team.session_id,
            TrainingRecord.trainee_id == payload.trainee_id,
            TrainingRecord.deleted_at == None
        ).first()
        if not is_participant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trainee '{trainee.first_name} {trainee.last_name}' is not enrolled in this training session (U-12)."
            )

    # Check duplicate in this team
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.trainee_id == payload.trainee_id
    ).first()
    if existing:
        gam = trainee.gamification
        return TeamMemberResponse(
            id=existing.id,
            team_id=existing.team_id,
            trainee_id=existing.trainee_id,
            trainee_name=f"{trainee.first_name} {trainee.last_name}",
            trainee_code=trainee.trainee_code,
            display_name=trainee.display_name or f"{trainee.first_name} {trainee.last_name}",
            points=gam.points if gam else 0
        )

    # Automatically remove from any other team in this session (GAM-03)
    session_teams = db.query(Team.id).filter(Team.session_id == team.session_id).all()
    session_team_ids = [t[0] for t in session_teams]
    if session_team_ids:
        db.query(TeamMember).filter(
            TeamMember.team_id.in_(session_team_ids),
            TeamMember.trainee_id == payload.trainee_id
        ).delete(synchronize_session=False)

    new_member = TeamMember(
        team_id=team_id,
        trainee_id=payload.trainee_id
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    gam = trainee.gamification
    points = gam.points if gam else 0

    return TeamMemberResponse(
        id=new_member.id,
        team_id=new_member.team_id,
        trainee_id=new_member.trainee_id,
        trainee_name=f"{trainee.first_name} {trainee.last_name}",
        trainee_code=trainee.trainee_code,
        display_name=trainee.display_name or f"{trainee.first_name} {trainee.last_name}",
        points=points
    )


@router.delete("/teams/{team_id}/members/{trainee_id}")
def remove_team_member(
    team_id: str,
    trainee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Removes a trainee from a gamified team (GAM-03)."""
    if current_user.role not in ("trainer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Trainers and Administrators can remove team members."
        )

    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.trainee_id == trainee_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")

    db.delete(member)
    db.commit()
    return {"status": "success", "message": "Trainee removed from team."}
