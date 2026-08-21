"""IntelliProcure AI – Approval Workflow API Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database.session import get_db
from app.core.security import get_current_active_user, normalize_role, require_internal_user
from app.models.user import User, UserRole
from app.models.purchase_request import PurchaseRequest, PRStatus
from app.models.rfq import AuditLog, Notification, NotificationType

router = APIRouter()

APPROVER_ROLE_NAMES = {"admin", "manager", "finance"}


@router.get("/pending")
async def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all purchase requests awaiting approval."""
    pending_prs = db.query(PurchaseRequest).options(
        joinedload(PurchaseRequest.requester),
        joinedload(PurchaseRequest.items)
    ).filter(
        PurchaseRequest.is_deleted == False,
        PurchaseRequest.status.in_([PRStatus.SUBMITTED, PRStatus.PENDING_APPROVAL])
    ).order_by(PurchaseRequest.created_at.desc()).all()

    result = []
    user_role = normalize_role(current_user.role)
    for pr in pending_prs:
        is_own = pr.requester_id == current_user.id
        can_approve = (user_role in APPROVER_ROLE_NAMES) and (not is_own or user_role == "admin")

        result.append({
            "id": str(pr.id),
            "pr_number": pr.pr_number,
            "title": pr.title,
            "description": pr.description,
            "justification": pr.justification,
            "priority": pr.priority,
            "category": pr.category,
            "department": pr.department,
            "estimated_amount": pr.estimated_amount,
            "currency": pr.currency or "USD",
            "status": pr.status,
            "submitted_at": pr.submitted_at.isoformat() if pr.submitted_at else pr.created_at.isoformat(),
            "requester": {
                "id": str(pr.requester.id) if pr.requester else None,
                "full_name": pr.requester.full_name if pr.requester else "System User",
                "email": pr.requester.email if pr.requester else "",
                "department": pr.requester.department if pr.requester else ""
            },
            "is_own_request": is_own,
            "can_approve": can_approve,
        })

    return result


@router.post("/{pr_id}/approve")
async def approve_request(
    pr_id: UUID,
    comment: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Approve a pending purchase request with authorization and audit trail."""
    user_role = normalize_role(current_user.role)
    # Authorization check
    if user_role not in APPROVER_ROLE_NAMES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Managers, Finance, or Admins can approve purchase requests."
        )

    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    if pr.status not in [PRStatus.SUBMITTED, PRStatus.PENDING_APPROVAL]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve PR in '{pr.status}' status. Only pending requests can be approved."
        )

    # Self-approval check
    if pr.requester_id == current_user.id and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of Interest: You cannot approve your own purchase request unless you are a System Administrator."
        )

    # Execute Approval
    pr.status = PRStatus.APPROVED
    pr.approver_id = current_user.id
    pr.approved_at = datetime.utcnow()
    pr.approval_notes = comment or "Approved"

    # Create Audit Log entry
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="PR_APPROVED",
        entity_type="purchase_request",
        entity_id=str(pr.id),
        changes={
            "pr_number": pr.pr_number,
            "title": pr.title,
            "amount": pr.estimated_amount,
            "approver": current_user.email,
            "comment": comment
        }
    )
    db.add(audit_entry)

    # Send Notification to requester
    notif = Notification(
        user_id=pr.requester_id,
        title="Purchase Request Approved 🎉",
        message=f"Your purchase request {pr.pr_number} ({pr.title}) has been approved.",
        type=NotificationType.APPROVAL_REQUIRED,
        reference_id=str(pr.id)
    )
    db.add(notif)

    db.commit()
    db.refresh(pr)

    return {
        "message": f"Purchase request {pr.pr_number} approved successfully.",
        "pr_number": pr.pr_number,
        "status": "approved",
        "approved_at": pr.approved_at.isoformat(),
        "approver": f"{current_user.first_name} {current_user.last_name}"
    }


@router.post("/{pr_id}/reject")
async def reject_request(
    pr_id: UUID,
    reason: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Reject a pending purchase request with reason, notification, and audit trail."""
    user_role = normalize_role(current_user.role)
    if user_role not in APPROVER_ROLE_NAMES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Managers, Finance, or Admins can reject purchase requests."
        )

    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    if pr.status not in [PRStatus.SUBMITTED, PRStatus.PENDING_APPROVAL]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject PR in '{pr.status}' status. Only pending requests can be rejected."
        )

    # Execute Rejection
    pr.status = PRStatus.REJECTED
    pr.approver_id = current_user.id
    pr.rejected_at = datetime.utcnow()
    pr.rejection_reason = reason

    # Create Audit Log entry
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="PR_REJECTED",
        entity_type="purchase_request",
        entity_id=str(pr.id),
        changes={
            "pr_number": pr.pr_number,
            "title": pr.title,
            "amount": pr.estimated_amount,
            "approver": current_user.email,
            "reason": reason
        }
    )
    db.add(audit_entry)

    # Create Notification for Requester
    if pr.requester_id:
        notification = Notification(
            user_id=pr.requester_id,
            title="Purchase Request Rejected",
            message=f"Your request {pr.pr_number} ('{pr.title}') was rejected by {current_user.first_name} {current_user.last_name}. Reason: {reason}",
            notification_type=NotificationType.WARNING,
            action_url="/purchase-requests",
            reference_id=str(pr.id),
            reference_type="purchase_request"
        )
        db.add(notification)

    db.commit()
    db.refresh(pr)

    return {
        "message": f"Purchase request {pr.pr_number} rejected.",
        "pr_number": pr.pr_number,
        "status": "rejected",
        "rejected_at": pr.rejected_at.isoformat(),
        "reason": reason
    }


@router.get("/history")
async def get_approval_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get audit history of all approval and rejection actions."""
    logs = db.query(AuditLog).options(
        joinedload(AuditLog.user)
    ).filter(
        AuditLog.action.in_(["PR_APPROVED", "PR_REJECTED"])
    ).order_by(AuditLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": str(log.id),
            "action": log.action,
            "pr_id": log.entity_id,
            "pr_number": log.changes.get("pr_number") if log.changes else "N/A",
            "title": log.changes.get("title") if log.changes else "N/A",
            "amount": log.changes.get("amount") if log.changes else 0,
            "actor": log.user.full_name if log.user else "System",
            "timestamp": log.created_at.isoformat() if log.created_at else "",
            "comment_or_reason": log.changes.get("comment") or log.changes.get("reason") or "",
        }
        for log in logs
    ]
