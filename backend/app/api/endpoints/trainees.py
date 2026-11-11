from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from datetime import datetime, timezone
from fastapi import Request
from app.models.entities import Trainee, ClientCompany, GamificationProgress, User, TraineeAffiliation, AccessLog, TrainingRecord
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
@router.post("/me/switch-company")
def switch_own_company(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows a multi-company trainee to switch their active company view/affiliation (FR-15, DD-01)."""
    if current_user.role != "trainee":
        raise HTTPException(status_code=403, detail="Only trainees can switch their active company view.")
    target_code = (payload.get("company_code") or "").strip().upper()
    target_id = payload.get("company_id")

    from app.core.database import admin_engine
    from sqlalchemy.orm import sessionmaker as _sm
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    with _sm(bind=admin_engine)() as adm_db:
        trainee = adm_db.query(Trainee).filter(
            (Trainee.user_id == current_user.id) | (Trainee.email == current_user.email)
        ).first()
        if not trainee:
            raise HTTPException(status_code=404, detail="Trainee profile not found.")
        comp = (adm_db.query(ClientCompany).filter(ClientCompany.id == target_id).first() if target_id
                else adm_db.query(ClientCompany).filter(ClientCompany.code == target_code).first())
        if not comp:
            raise HTTPException(status_code=404, detail="Target company not found.")

        allowed_cids = {a.company_id for a in adm_db.query(TraineeAffiliation).filter(TraineeAffiliation.trainee_id == trainee.id).all()}
        allowed_cids |= {r.company_at_completion_id for r in adm_db.query(TrainingRecord).filter(
            TrainingRecord.trainee_id == trainee.id, TrainingRecord.deleted_at == None).all()}
        if trainee.current_company_id:
            allowed_cids.add(trainee.current_company_id)
        if comp.id not in allowed_cids:
            raise HTTPException(status_code=403, detail="You are not affiliated with that organization.")

        old_company_id = trainee.current_company_id
        if old_company_id != comp.id:
            adm_db.query(TraineeAffiliation).filter(
                TraineeAffiliation.trainee_id == trainee.id,
                TraineeAffiliation.valid_to == None
            ).update({"valid_to": now_utc})
            adm_db.add(TraineeAffiliation(
                trainee_id=trainee.id, company_id=comp.id, valid_from=now_utc, valid_to=None
            ))
            trainee.current_company_id = comp.id
            adm_db.add(AccessLog(
                actor_user_id=current_user.id, actor_role=current_user.role,
                event_type="TRAINEE_COMPANY_CHANGED", resource_type="TRAINEE",
                resource_id=trainee.id, company_id=comp.id, outcome="SUCCESS",
                source_ip=_get_client_ip(request),
                details={"trainee_code": trainee.trainee_code, "old_company_id": old_company_id,
                         "new_company_id": comp.id, "new_company_code": comp.code, "reason": "Active company switch"}
            ))
            adm_db.commit()

        return {"status": "ok", "company_id": comp.id, "company_code": comp.code, "company_name": comp.name}


@router.post("/{trainee_id}/change-company", response_model=TraineeResponse)
def record_trainee_company_change(
    trainee_id: str,
    change_in: TraineeCompanyChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Records a Trainee's company change while preserving historical training records (FR-15, U-06)."""
    if current_user.role not in ("admin", "account_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and assigned Account Managers can change trainee company affiliation (FR-15, U-06)."
        )

    from app.core.database import admin_engine
    from sqlalchemy.orm import sessionmaker as _sm
    effective_dt = change_in.effective_date or datetime.now(timezone.utc).replace(tzinfo=None)

    with _sm(bind=admin_engine)() as adm_db:
        trainee = adm_db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise HTTPException(status_code=404, detail="Trainee not found.")
        new_company = adm_db.query(ClientCompany).filter(ClientCompany.id == change_in.new_company_id).first()
        if not new_company:
            raise HTTPException(status_code=404, detail="Target client company not found.")
        if trainee.current_company_id == new_company.id:
            raise HTTPException(status_code=400, detail="Trainee is already affiliated with this company.")

        old_comp = adm_db.query(ClientCompany).filter(ClientCompany.id == trainee.current_company_id).first() if trainee.current_company_id else None
        old_code = old_comp.code if old_comp else ""
        if current_user.role == "account_manager":
            assigned_codes = current_user.assigned_client_accounts or []
            if new_company.code not in assigned_codes and old_code not in assigned_codes:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account Manager can only manage company change for assigned accounts."
                )

        old_company_id = trainee.current_company_id
        adm_db.query(TraineeAffiliation).filter(
            TraineeAffiliation.trainee_id == trainee.id,
            TraineeAffiliation.valid_to == None
        ).update({"valid_to": effective_dt})

        adm_db.add(TraineeAffiliation(
            trainee_id=trainee.id, company_id=new_company.id, valid_from=effective_dt, valid_to=None
        ))
        trainee.current_company_id = new_company.id

        if trainee.user_id:
            u = adm_db.query(User).filter(User.id == trainee.user_id).first()
            if u:
                existing_codes = list(u.assigned_client_accounts or [])
                if new_company.code not in existing_codes:
                    existing_codes.append(new_company.code)
                u.assigned_client_accounts = existing_codes

        adm_db.add(AccessLog(
            actor_user_id=current_user.id, actor_role=current_user.role,
            event_type="TRAINEE_COMPANY_CHANGED", resource_type="TRAINEE",
            resource_id=trainee.id, company_id=new_company.id, outcome="SUCCESS",
            source_ip=_get_client_ip(request),
            details={"trainee_code": trainee.trainee_code, "old_company_id": old_company_id,
                     "new_company_id": new_company.id, "new_company_code": new_company.code,
                     "effective_date": effective_dt.isoformat(), "reason": change_in.reason or "Employer transfer"}
        ))
        adm_db.commit()
        adm_db.refresh(trainee)
        return TraineeResponse.model_validate(trainee)


@router.get("/{trainee_id}/affiliations", response_model=List[TraineeAffiliationResponse])
def get_trainee_affiliations(
    trainee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves the historical employment affiliation timeline for a Trainee (FR-15)."""
    from app.core.database import admin_engine
    from sqlalchemy.orm import sessionmaker as _sm
    with _sm(bind=admin_engine)() as adm_db:
        trainee = adm_db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise HTTPException(status_code=404, detail="Trainee not found.")
        if current_user.role == "trainee" and trainee.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainees can only view own affiliations.")

        affiliations = adm_db.query(TraineeAffiliation).filter(
            TraineeAffiliation.trainee_id == trainee_id
        ).order_by(TraineeAffiliation.valid_from.desc()).all()
        comps = {c.id: c for c in adm_db.query(ClientCompany).all()}

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        result = []
        for a in affiliations:
            comp = comps.get(a.company_id)
            is_curr = bool(a.valid_to is None or a.valid_to > now_utc)
            result.append(TraineeAffiliationResponse(
                id=a.id,
                trainee_id=a.trainee_id,
                company_id=a.company_id,
                company_name=comp.name if comp else "Unknown Company",
                company_code=comp.code if comp else "",
                valid_from=a.valid_from,
                valid_to=a.valid_to,
                is_current=is_curr
            ))
        return result
