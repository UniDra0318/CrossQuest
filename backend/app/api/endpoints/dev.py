"""Dev-only endpoints for the rebuilt Role Switcher & Demo Scenarios (Round 11 Part 4 & 5.1)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import (
    User, Trainee, TrainingSession, TrainingRecord,
    QuizAttempt, AnomalyAlert, Certificate, ImportBatch,
)
from seed_demo_scenarios import reset_scenario, SYNTHETIC_TRAINEES

router = APIRouter()


def _require_dev_scenarios():
    if settings.ENVIRONMENT == "production" or not getattr(settings, "ALLOW_DEV_SCENARIOS", False):
        raise HTTPException(status_code=404, detail="Not found")


@router.get("/personas")
def list_dev_personas(db: Session = Depends(get_db)):
    """Returns dev persona accounts synced with DB IDs and emails."""
    _require_dev_scenarios()
    users = db.query(User).filter(User.is_active == True).all()
    trainees = {t.user_id: t for t in db.query(Trainee).all() if t.user_id}
    scn_emails = {row[3]: row[0] for row in SYNTHETIC_TRAINEES}

    personas = []
    for u in users:
        t = trainees.get(u.id)
        key = scn_emails.get(u.email)
        personas.append({
            "key": key or u.id,
            "id": u.id,
            "email": u.email,
            "name": u.full_name,
            "role": u.role,
            "trainee_code": t.trainee_code if t else None,
            "display_name": t.display_name if t else None,
            "company_code": (t.company.code if t and t.company else None) or ("CROSSWORKS" if u.role != "trainee" else None),
            "initials": "".join([p[0] for p in (u.full_name or "U").split()[:2]]).upper(),
        })
    return {"personas": personas}


@router.get("/scenarios")
def list_dev_scenarios(db: Session = Depends(get_db)):
    """Returns live database state for SCN-01 through SCN-12."""
    _require_dev_scenarios()

    def sess_state(code):
        return db.query(TrainingSession).filter(TrainingSession.session_code == code).first()

    s01 = sess_state("SCN-01")
    r01 = db.query(TrainingRecord).filter(TrainingRecord.id == "rec-scn-01").first()
    mia_attempts = 0
    if r01:
        mia_attempts = db.query(QuizAttempt).filter(QuizAttempt.trainee_id == r01.trainee_id, QuizAttempt.is_scored == True).count()

    if s01 and s01.trainer_signed_off:
        scn01_state = "Completed — certificate issued"
    elif mia_attempts >= 3:
        scn01_state = "Awaiting trainer sign-off"
    else:
        scn01_state = f"{max(0, 3 - mia_attempts)} quiz left before sign-off"

    s02 = sess_state("SCN-02")
    r02 = db.query(TrainingRecord).filter(TrainingRecord.id == "rec-scn-02").first()
    scn02_state = (
        f"Signed off ({r02.status})" if (s02 and s02.trainer_signed_off and r02)
        else "100% quizzes, Absent — ready for sign-off"
    )

    r04 = db.query(TrainingRecord).filter(TrainingRecord.id == "rec-scn-04").first()
    scn04_state = f"Score: {r04.score}%" if r04 and r04.score is not None else "Needs score correction"

    a09 = db.query(AnomalyAlert).filter(AnomalyAlert.id == "alt-scn-09-joey").first()
    scn09_state = "Peer review completed" if (a09 and a09.status == "CLOSED") else "Open alert awaiting peer review"

    b11 = db.query(ImportBatch).filter(ImportBatch.id == "imp-scn-11").first()
    scn11_state = ("Reconciled" if b11.reconciled else f"{b11.quarantined_count} quarantined rows awaiting reconciliation") if b11 else "Ready for reconciliation"

    return {
        "SCN-01": {"state": scn01_state},
        "SCN-02": {"state": scn02_state},
        "SCN-03": {"state": "Future-dated — sign-off blocked"},
        "SCN-04": {"state": scn04_state},
        "SCN-05": {"state": scn01_state},
        "SCN-06": {"state": scn01_state},
        "SCN-07": {"state": "Multi-company affiliation history active"},
        "SCN-08": {"state": "PMP Expiring soon (25d) · CAPM Expired"},
        "SCN-09": {"state": scn09_state},
        "SCN-10": {"state": "Pending activation & TOTP lifecycle"},
        "SCN-11": {"state": scn11_state},
        "SCN-12": {"state": "Individual client assigned to Sharon De Vera"},
    }


@router.post("/scenarios/{scenario_id}/reset")
def reset_dev_scenario(scenario_id: str, db: Session = Depends(get_db)):
    """Resets a single scenario (or 'all') to its initial seeded state."""
    _require_dev_scenarios()
    reset_scenario(db, scenario_id)
    db.commit()
    return {"status": "reset", "scenario_id": scenario_id.upper()}
