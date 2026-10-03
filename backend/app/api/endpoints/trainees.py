from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Trainee, ClientCompany, GamificationProgress
from app.schemas.schemas import TraineeCreate, TraineeResponse, ClientCompanyCreate, ClientCompanyResponse
from app.api.deps import get_current_user

router = APIRouter()

# Client Companies
@router.post("/companies", response_model=ClientCompanyResponse)
def create_client_company(company_in: ClientCompanyCreate, db: Session = Depends(get_db)):
    existing = db.query(ClientCompany).filter(ClientCompany.code == company_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company code already exists")
    company = ClientCompany(**company_in.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

@router.get("/companies", response_model=List[ClientCompanyResponse])
def list_client_companies(db: Session = Depends(get_db)):
    return db.query(ClientCompany).all()

# Trainees
@router.post("/", response_model=TraineeResponse)
def create_trainee(trainee_in: TraineeCreate, db: Session = Depends(get_db)):
    existing = db.query(Trainee).filter(Trainee.email == trainee_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Trainee with this email already exists")
    
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
    current_user = Depends(get_current_user)
):
    query = db.query(Trainee)
    if company_id:
        query = query.filter(Trainee.current_company_id == company_id)
    return query.all()
