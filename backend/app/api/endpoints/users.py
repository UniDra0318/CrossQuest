from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import User, Trainee, AccessLog
from app.schemas.schemas import UserResponse, UserAttributeUpdate
from app.api.deps import get_current_user, get_current_admin_user
from app.crypto.cpabe_engine import cpabe_engine

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to list all system accounts."""
    return db.query(User).all()


@router.put("/{user_id}/attributes", response_model=UserResponse)
def update_user_attributes(
    user_id: str,
    attrs: UserAttributeUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to issue, modify, or revoke staff attributes for CP-ABE (FR-02, FR-03, SEC-05, SEC-06).
    Note: Clearance levels are omitted per SEC-11.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    old_accounts = list(user.assigned_client_accounts or [])

    if attrs.role is not None:
        valid_roles = ("admin", "account_manager", "finance", "trainer", "trainee")
        if attrs.role.lower() not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        user.role = attrs.role.lower()

    if attrs.assigned_client_accounts is not None:
        user.assigned_client_accounts = attrs.assigned_client_accounts

    db.commit()
    db.refresh(user)

    # Log attribute change to audit log (SEC-12, Table 19: ATTRIBUTE_CHANGE)
    log = AccessLog(
        actor_user_id=admin_user.id,
        actor_role=admin_user.role,
        event_type="ATTRIBUTE_CHANGE",
        resource_type="USER",
        resource_id=user.id,
        outcome="SUCCESS",
        details={
            "old_role": old_role,
            "new_role": user.role,
            "old_assigned_companies": old_accounts,
            "new_assigned_companies": user.assigned_client_accounts
        }
    )
    db.add(log)
    db.commit()

    return user


@router.get("/{user_id}/cpabe-key")
def get_user_cpabe_key(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches/generates the CP-ABE private key corresponding to user's active attributes (Section 3.6.4)."""
    if current_user.id != user_id and current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to access keys for this user")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    trainee_obj = db.query(Trainee).filter(Trainee.user_id == target_user.id).first()
    trainee_code = trainee_obj.trainee_code if trainee_obj else None

    # Build attribute set: alphanumeric tokens only, no clearance levels (DD-01, DD-04, SEC-11)
    attributes = cpabe_engine.build_user_attributes(
        role=target_user.role,
        assigned_companies=target_user.assigned_client_accounts,
        trainee_code=trainee_code
    )

    key_info = cpabe_engine.generate_user_private_key(attributes)
    return key_info
