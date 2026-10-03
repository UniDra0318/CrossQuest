from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import User
from app.schemas.schemas import UserResponse, UserAttributeUpdate
from app.api.deps import get_current_user, get_current_admin_user
from app.crypto.cpabe_engine import cpabe_engine

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/", response_model=List[UserResponse])
def list_staff_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    return db.query(User).all()

@router.put("/{user_id}/attributes", response_model=UserResponse)
def update_staff_attributes(
    user_id: str,
    attrs: UserAttributeUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to issue, modify, or revoke staff attributes for CP-ABE."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if attrs.role is not None:
        user.role = attrs.role
    if attrs.clearance_level is not None:
        user.clearance_level = attrs.clearance_level
    if attrs.assigned_client_accounts is not None:
        user.assigned_client_accounts = attrs.assigned_client_accounts

    db.commit()
    db.refresh(user)
    return user

@router.get("/{user_id}/cpabe-key")
def get_user_cpabe_key(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch/Generate CP-ABE private key corresponding to user's active attributes."""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access keys for this user")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Form attributes list
    attributes = [f"ROLE:{target_user.role}", f"CLEARANCE:{target_user.clearance_level}"]
    for comp in (target_user.assigned_client_accounts or []):
        attributes.append(f"COMPANY:{comp}")

    key_info = cpabe_engine.generate_user_private_key(attributes)
    return key_info
