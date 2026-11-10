from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from datetime import datetime, timezone
from fastapi import Request
from app.models.entities import Trainee, ClientCompany, GamificationProgress, User, TraineeAffiliation, AccessLog
from app.schemas.schemas import (
    TraineeCreate, TraineeResponse, ClientCompanyCreate, ClientCompanyResponse,
    TraineeProfileUpdate, TraineeCompanyChangeRequest, TraineeAffiliationResponse
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
    client_type = (getattr(company_in, "client_type", None) or "COMPANY").upper()
    if client_type not in ("COMPANY", "INDIVIDUAL"):
        raise HTTPException(status_code=400, detail="client_type must be either 'COMPANY' or 'INDIVIDUAL' (FR-05)")

    company = ClientCompany(
        code=company_in.code.upper(),
        name=company_in.name,
        client_type=client_type,
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

    # Record initial employer affiliation (FR-15)
    if trainee.current_company_id:
        init_aff = TraineeAffiliation(
            trainee_id=trainee.id,
            company_id=trainee.current_company_id,
            valid_from=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(init_aff)

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


def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


# -----------------------------------------------------------------------------
# Trainee Employer Affiliation Management (FR-15)
# -----------------------------------------------------------------------------
@router.post("/{trainee_id}/change-company", response_model=TraineeResponse)
def record_trainee_company_change(
    trainee_id: str,
    change_in: TraineeCompanyChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Records a Trainee's company change while preserving historical training records (FR-15, U-06).
    Closes active TraineeAffiliation, creates a new one, and updates trainee.current_company_id.
    Prior training records retain their original company_at_completion_id.
    Permitted for Administrator only.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators can change trainee company affiliation (FR-15, U-06)."
        )

    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found.")

    new_company = db.query(ClientCompany).filter(ClientCompany.id == change_in.new_company_id).first()
    if not new_company:
        raise HTTPException(status_code=404, detail="Target client company not found.")

    if trainee.current_company_id == new_company.id:
        raise HTTPException(status_code=400, detail="Trainee is already affiliated with this company.")

    # Account Manager scoping check
    if current_user.role == "account_manager":
        assigned_codes = current_user.assigned_client_accounts or []
        old_comp = db.query(ClientCompany).filter(ClientCompany.id == trainee.current_company_id).first() if trainee.current_company_id else None
        old_code = old_comp.code if old_comp else ""
        if new_company.code not in assigned_codes and old_code not in assigned_codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account Manager can only manage company change for assigned accounts."
            )

    effective_dt = change_in.effective_date or datetime.now(timezone.utc).replace(tzinfo=None)
    old_company_id = trainee.current_company_id

    # 1. Close current active affiliation(s)
    db.query(TraineeAffiliation).filter(
        TraineeAffiliation.trainee_id == trainee.id,
        TraineeAffiliation.valid_to == None
    ).update({"valid_to": effective_dt})

    # 2. Insert new affiliation
    new_aff = TraineeAffiliation(
        trainee_id=trainee.id,
        company_id=new_company.id,
        valid_from=effective_dt,
        valid_to=None
    )
    db.add(new_aff)

    # 3. Update current active company pointer on Trainee profile
    trainee.current_company_id = new_company.id
    db.commit()
    db.refresh(trainee)

    # 4. Audit log TRAINEE_COMPANY_CHANGED
    log = AccessLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role,
        event_type="TRAINEE_COMPANY_CHANGED",
        resource_type="TRAINEE",
        resource_id=trainee.id,
        outcome="SUCCESS",
        source_ip=_get_client_ip(request),
        details={
            "trainee_code": trainee.trainee_code,
            "old_company_id": old_company_id,
            "new_company_id": new_company.id,
            "new_company_code": new_company.code,
            "effective_date": effective_dt.isoformat(),
            "reason": change_in.reason or "Employer transfer"
        }
    )
    db.add(log)
    db.commit()

    return trainee


@router.get("/{trainee_id}/affiliations", response_model=List[TraineeAffiliationResponse])
def get_trainee_affiliations(
    trainee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves the historical employment affiliation timeline for a Trainee (FR-15)."""
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found.")

    if current_user.role == "trainee" and trainee.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainees can only view own affiliations.")

    affiliations = db.query(TraineeAffiliation).filter(
        TraineeAffiliation.trainee_id == trainee_id
    ).order_by(TraineeAffiliation.valid_from.desc()).all()

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    result = []
    for a in affiliations:
        is_curr = bool(a.valid_to is None or a.valid_to > now_utc)
        result.append(TraineeAffiliationResponse(
            id=a.id,
            trainee_id=a.trainee_id,
            company_id=a.company_id,
            company_name=a.company.name if a.company else "Unknown Company",
            company_code=a.company.code if a.company else "",
            valid_from=a.valid_from,
            valid_to=a.valid_to,
            is_current=is_curr
        ))

    return result
