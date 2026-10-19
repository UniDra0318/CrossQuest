from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Trainee, ClientCompany, GamificationProgress, User
from app.schemas.schemas import (
    TraineeCreate, TraineeResponse, ClientCompanyCreate, ClientCompanyResponse,
    TraineeProfileUpdate
)
from app.api.deps import get_current_user, get_current_admin_user

router = APIRouter()

# Client Companies (Admin / Staff operations)
@router.post("/companies", response_model=ClientCompanyResponse)
def create_client_company(
    company_in: ClientCompanyCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    existing = db.query(ClientCompany).filter(ClientCompany.code == company_in.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company code already exists")
    company = ClientCompany(
        code=company_in.code.upper(),
        name=company_in.name,
        industry=company_in.industry
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/companies", response_model=List[ClientCompanyResponse])
def list_client_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "account_manager":
        assigned = current_user.assigned_client_accounts or []
        return db.query(ClientCompany).filter(ClientCompany.code.in_(assigned)).all()
    return db.query(ClientCompany).all()


# Trainees
@router.post("/", response_model=TraineeResponse)
def create_trainee(
    trainee_in: TraineeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin or Finance can create trainee profiles."""
    if current_user.role not in ("admin", "finance", "account_manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create trainees")

    existing = db.query(Trainee).filter(Trainee.email == trainee_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Trainee with this email already exists")
    
    existing_code = db.query(Trainee).filter(Trainee.trainee_code == trainee_in.trainee_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Trainee code must be unique")

    trainee = Trainee(**trainee_in.model_dump())
    db.add(trainee)
    db.commit()
    db.refresh(trainee)
    
    # Initialize gamification profile
    gamification = GamificationProgress(trainee_id=trainee.id)
    db.add(gamification)
    db.commit()

    return trainee


@router.get("/", response_model=List[TraineeResponse])
def list_trainees(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Trainee)
    if current_user.role == "trainee":
        # Trainee can only view own profile (FR-09)
        query = query.filter(Trainee.user_id == current_user.id)
    elif current_user.role == "account_manager":
        # Scoped to assigned companies
        assigned_codes = current_user.assigned_client_accounts or []
        assigned_companies = db.query(ClientCompany.id).filter(ClientCompany.code.in_(assigned_codes)).all()
        company_ids = [c[0] for c in assigned_companies]
        query = query.filter(Trainee.current_company_id.in_(company_ids))

    if company_id:
        query = query.filter(Trainee.current_company_id == company_id)

    return query.all()


@router.put("/me/profile", response_model=TraineeResponse)
def update_own_trainee_profile(
    profile_in: TraineeProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trainee self-service profile update: permitted personal fields only (FR-14, OI-03).
    Trainee may modify display_name and phone; identifiers, employer, and records are not trainee-editable.
    """
    if current_user.role != "trainee":
        raise HTTPException(status_code=400, detail="This endpoint is for trainees")

    trainee = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee profile not found")

    if profile_in.display_name is not None:
        trainee.display_name = profile_in.display_name
    if profile_in.phone is not None:
        trainee.phone = profile_in.phone

    db.commit()
    db.refresh(trainee)
    return trainee
