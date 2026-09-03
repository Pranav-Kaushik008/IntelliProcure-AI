"""IntelliProcure AI – Users API Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database.session import get_db
from app.core.security import get_current_active_user, get_password_hash, require_admin, require_internal_user, normalize_role
from app.models.user import User
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def list_users(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """List users. Internal users see active users; Admin can include inactive."""
    query = db.query(User).filter(User.is_deleted == False)
    if not include_inactive:
        query = query.filter(User.is_active == True)
    return query.order_by(User.created_at.desc()).all()

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """Admin-only: Create a new system user with designated role and department."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    norm_role = normalize_role(data.role)
    new_user = User(
        email=data.email.strip().lower(),
        hashed_password=get_password_hash(data.password),
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        role=norm_role,
        department=data.department,
        job_title=data.job_title,
        phone=data.phone,
        is_active=True,
        is_verified=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, db: Session = Depends(get_db), current_user=Depends(require_internal_user)):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """Admin-only: Edit user details, status, or role."""
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if "first_name" in payload and payload["first_name"]:
        target_user.first_name = payload["first_name"].strip()
    if "last_name" in payload and payload["last_name"]:
        target_user.last_name = payload["last_name"].strip()
    if "department" in payload:
        target_user.department = payload["department"]
    if "job_title" in payload:
        target_user.job_title = payload["job_title"]
    if "phone" in payload:
        target_user.phone = payload["phone"]
    if "role" in payload and payload["role"]:
        target_user.role = normalize_role(payload["role"])
    if "is_active" in payload and payload["is_active"] is not None:
        target_user.is_active = bool(payload["is_active"])
    if "password" in payload and payload["password"]:
        if len(payload["password"]) >= 6:
            target_user.hashed_password = get_password_hash(payload["password"])

    db.commit()
    db.refresh(target_user)
    return target_user

@router.patch("/{user_id}/status")
async def toggle_user_status(
    user_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """Admin-only: Activate or deactivate a user account."""
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    is_active = bool(payload.get("is_active", False))

    if not is_active:
        if target_user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Security Violation: You cannot deactivate your own active Administrator account.")
        if target_user.email.lower() == "pranavkaushikyr@gmail.com":
            raise HTTPException(status_code=400, detail="Security Violation: The Master Administrator account cannot be deactivated.")

    target_user.is_active = is_active
    db.commit()
    db.refresh(target_user)
    return {
        "message": f"User account {'activated' if target_user.is_active else 'deactivated'} successfully",
        "user_id": str(target_user.id),
        "is_active": target_user.is_active
    }

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """Admin-only: Soft delete a user account."""
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Security Violation: Admin cannot delete their own active account.")
    if target_user.email.lower() == "pranavkaushikyr@gmail.com":
        raise HTTPException(status_code=400, detail="Security Violation: The Master Administrator account cannot be deleted.")

    target_user.is_deleted = True
    target_user.is_active = False
    db.commit()

@router.post("/assign-role")
async def assign_user_role(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """
    Admin-only endpoint to assign or change user roles.
    Allows admin to promote/assign emails as Manager, Finance, Buyer, Auditor, Supplier, or Admin.
    """
    email = payload.get("email")
    new_role = payload.get("role")

    if not email or not new_role:
        raise HTTPException(status_code=400, detail="Missing email or role")

    norm_role = normalize_role(new_role)
    target_user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not target_user:
        target_user = User(
            email=email.strip().lower(),
            hashed_password=get_password_hash("Welcome@1234"),
            first_name=email.split("@")[0].capitalize(),
            last_name="User",
            role=norm_role,
            is_active=True,
            is_verified=True,
        )
        db.add(target_user)
    else:
        target_user.role = norm_role

    db.commit()
    return {
        "message": f"Successfully assigned role '{norm_role}' to {email}",
        "email": email,
        "role": norm_role
    }

