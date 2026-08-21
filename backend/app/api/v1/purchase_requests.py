"""IntelliProcure AI – Purchase Requests API Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import random

from app.database.session import get_db
from app.core.security import (
    get_current_active_user,
    require_roles,
    require_internal_user,
    normalize_role
)
from app.models.purchase_request import PurchaseRequest, PRStatus, PRPriority
from app.models.purchase_request_item import PurchaseRequestItem
from app.schemas.schemas import (
    PurchaseRequestCreate, PurchaseRequestUpdate, PurchaseRequestResponse
)

router = APIRouter()


def generate_pr_number() -> str:
    return f"PR-{datetime.now().year}-{random.randint(10000, 99999)}"


@router.get("/", response_model=List[PurchaseRequestResponse])
async def list_purchase_requests(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """List purchase requests with search, status, and priority filters."""
    query = db.query(PurchaseRequest).options(
        joinedload(PurchaseRequest.requester),
        joinedload(PurchaseRequest.items)
    ).filter(PurchaseRequest.is_deleted == False)

    if status:
        query = query.filter(PurchaseRequest.status == status)
    if priority:
        query = query.filter(PurchaseRequest.priority == priority)
    if search:
        query = query.filter(
            PurchaseRequest.title.ilike(f"%{search}%") |
            PurchaseRequest.pr_number.ilike(f"%{search}%") |
            PurchaseRequest.category.ilike(f"%{search}%")
        )

    return query.order_by(PurchaseRequest.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=PurchaseRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_request(
    data: PurchaseRequestCreate,
    as_draft: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager", "finance"))
):
    """Create a new purchase request as DRAFT or SUBMITTED."""
    pr_status = PRStatus.DRAFT if as_draft else PRStatus.SUBMITTED
    submitted_time = None if as_draft else datetime.utcnow()

    # Map priority enum safely
    priority_val = data.priority
    if isinstance(priority_val, str):
        priority_val = priority_val.upper()
        if priority_val not in PRPriority.__members__:
            priority_val = PRPriority.MEDIUM
        else:
            priority_val = PRPriority[priority_val]

    pr = PurchaseRequest(
        pr_number=generate_pr_number(),
        title=data.title,
        description=data.description,
        justification=data.justification,
        priority=priority_val,
        category=data.category,
        department=data.department or current_user.department or "General",
        cost_center=data.cost_center,
        estimated_amount=data.estimated_amount,
        currency=data.currency or "USD",
        required_by_date=data.required_by_date,
        requester_id=current_user.id,
        status=pr_status,
        submitted_at=submitted_time,
        ai_price_estimate=data.estimated_amount * random.uniform(0.9, 1.15),
        ai_risk_flag="low" if data.estimated_amount < 50000 else "medium",
    )
    db.add(pr)
    db.flush()

    # Create line items
    if data.items:
        for item_data in data.items:
            item = PurchaseRequestItem(
                purchase_request_id=pr.id,
                **item_data.model_dump()
            )
            if item.unit_price and item.quantity:
                item.total_price = item.unit_price * item.quantity
            db.add(item)
    else:
        # Default line item from title if no line items explicitly sent
        item = PurchaseRequestItem(
            purchase_request_id=pr.id,
            item_name=data.title,
            description=data.description,
            quantity=1.0,
            unit_price=data.estimated_amount,
            total_price=data.estimated_amount,
            category=data.category
        )
        db.add(item)

    db.commit()
    db.refresh(pr)
    return pr


@router.get("/{pr_id}", response_model=PurchaseRequestResponse)
async def get_purchase_request(
    pr_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """Get single PR by ID."""
    pr = db.query(PurchaseRequest).options(
        joinedload(PurchaseRequest.requester),
        joinedload(PurchaseRequest.items)
    ).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    return pr


@router.put("/{pr_id}", response_model=PurchaseRequestResponse)
@router.patch("/{pr_id}", response_model=PurchaseRequestResponse)
async def update_purchase_request(
    pr_id: UUID,
    data: PurchaseRequestUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Update a purchase request. Legal transitions: DRAFT only can be edited."""
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    if pr.status not in [PRStatus.DRAFT, PRStatus.SUBMITTED]:
        raise HTTPException(status_code=400, detail=f"Cannot edit PR in '{pr.status}' status. Only DRAFT or SUBMITTED PRs can be modified.")

    update_dict = data.model_dump(exclude_unset=True)
    if "priority" in update_dict and update_dict["priority"]:
        p_str = str(update_dict["priority"]).upper()
        if p_str in PRPriority.__members__:
            update_dict["priority"] = PRPriority[p_str]

    for field, value in update_dict.items():
        if value is not None:
            setattr(pr, field, value)

    db.commit()
    db.refresh(pr)
    return pr


@router.post("/{pr_id}/submit", response_model=PurchaseRequestResponse)
async def submit_pr(
    pr_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Submit a DRAFT purchase request for approval."""
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    if pr.status not in [PRStatus.DRAFT, PRStatus.SUBMITTED, PRStatus.PENDING_APPROVAL]:
        raise HTTPException(status_code=400, detail=f"Cannot submit PR in '{pr.status}' status. Only DRAFT or SUBMITTED PRs can be submitted.")

    pr.status = PRStatus.SUBMITTED
    pr.submitted_at = datetime.utcnow()
    db.commit()
    db.refresh(pr)
    return pr


@router.post("/{pr_id}/approve")
async def approve_pr(
    pr_id: UUID,
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "finance"))
):
    """Approve a purchase request (SUBMITTED / PENDING_APPROVAL → APPROVED). Enforces separation of duties."""
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    # Separation of duties: Requester cannot approve their own PR unless Admin
    user_role = normalize_role(current_user.role)
    if pr.requester_id == current_user.id and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Separation of duties violation: You cannot approve your own purchase request."
        )

    if pr.status not in [PRStatus.SUBMITTED, PRStatus.PENDING_APPROVAL]:
        raise HTTPException(status_code=400, detail=f"Cannot approve PR in '{pr.status}' status. Only SUBMITTED or PENDING_APPROVAL PRs can be approved.")

    pr.status = PRStatus.APPROVED
    pr.approver_id = current_user.id
    pr.approved_at = datetime.utcnow()
    pr.approval_notes = notes
    db.commit()

    # Trigger real-time notification
    from app.services.notification_service import create_notification
    create_notification(
        db=db,
        user_id=str(pr.requester_id),
        title="Purchase Request Approved 🎉",
        message=f"PR {pr.pr_number} ({pr.title}) has been approved.",
        notification_type="success",
        action_url="/purchase-requests",
        reference_id=str(pr.id),
        reference_type="purchase_request"
    )

    return {"message": "Purchase request approved successfully", "pr_number": pr.pr_number, "status": "approved"}


@router.post("/{pr_id}/reject")
async def reject_pr(
    pr_id: UUID,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "finance"))
):
    """Reject a purchase request with a reason."""
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    if pr.status not in [PRStatus.SUBMITTED, PRStatus.PENDING_APPROVAL]:
        raise HTTPException(status_code=400, detail=f"Cannot reject PR in '{pr.status}' status. Only SUBMITTED or PENDING_APPROVAL PRs can be rejected.")

    pr.status = PRStatus.REJECTED
    pr.approver_id = current_user.id
    pr.rejected_at = datetime.utcnow()
    pr.rejection_reason = reason or "Rejected by approver"
    db.commit()
    return {"message": "Purchase request rejected", "pr_number": pr.pr_number, "status": "rejected"}


@router.delete("/{pr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pr(
    pr_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "buyer"))
):
    """Delete a purchase request (soft delete)."""
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    if pr.status not in [PRStatus.DRAFT, PRStatus.CANCELLED, PRStatus.REJECTED]:
        raise HTTPException(status_code=400, detail=f"Cannot delete PR in '{pr.status}' status. Only DRAFT, REJECTED or CANCELLED PRs can be deleted.")

    pr.is_deleted = True
    db.commit()
