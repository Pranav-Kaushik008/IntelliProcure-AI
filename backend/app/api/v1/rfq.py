"""IntelliProcure AI – RFQ Management API Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import random

from app.database.session import get_db
from app.core.security import get_current_active_user, require_roles, require_internal_user, normalize_role, get_supplier_for_user
from app.models.rfq import RFQ, RFQStatus, Quotation
from app.models.purchase_request import PurchaseRequest, PRStatus
from app.models.supplier import Supplier
from app.services.audit_service import AuditService

router = APIRouter()


def generate_rfq_number() -> str:
    return f"RFQ-{datetime.now().year}-{random.randint(10000, 99999)}"


@router.get("/")
async def list_rfqs(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """List RFQs with search, status filtering, and count of bids/quotations received."""
    user_role = normalize_role(current_user.role)
    sup = None
    if user_role == "supplier":
        sup = get_supplier_for_user(current_user, db)
        if not sup:
            return []

    query = db.query(RFQ).filter(RFQ.is_deleted == False)

    if user_role == "supplier":
        # Supplier only sees published RFQs they are invited to or public RFQs
        query = query.filter(RFQ.status != RFQStatus.DRAFT)

    if status:
        query = query.filter(RFQ.status == status)
    if search:
        query = query.filter(
            RFQ.title.ilike(f"%{search}%") |
            RFQ.rfq_number.ilike(f"%{search}%")
        )

    rfqs = query.order_by(RFQ.created_at.desc()).offset(skip).limit(limit).all()

    # If supplier, filter to RFQs where supplier is in attachments list or attachments is empty (open RFQ)
    if user_role == "supplier" and sup:
        sup_id_str = str(sup.id)
        rfqs = [
            r for r in rfqs
            if not r.attachments or sup_id_str in [str(x) for x in r.attachments]
        ]


    result = []
    for rfq in rfqs:
        response_count = db.query(Quotation).filter(
            Quotation.rfq_id == rfq.id,
            Quotation.is_deleted == False
        ).count()

        result.append({
            "id": str(rfq.id),
            "rfq_number": rfq.rfq_number,
            "title": rfq.title,
            "description": rfq.description,
            "requirements": rfq.requirements,
            "terms_and_conditions": rfq.terms_and_conditions,
            "status": rfq.status,
            "issue_date": rfq.issue_date.isoformat() if rfq.issue_date else None,
            "deadline": rfq.deadline.strftime("%Y-%m-%d") if rfq.deadline else None,
            "estimated_value": rfq.estimated_value or 0.0,
            "currency": rfq.currency or "USD",
            "items": rfq.items or [],
            "attachments": rfq.attachments or [],
            "response_count": response_count,
            "purchase_request_id": str(rfq.purchase_request_id) if rfq.purchase_request_id else None,
            "created_at": rfq.created_at.isoformat() if rfq.created_at else None,
        })

    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_rfq(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Create a new RFQ in DRAFT state."""
    title = payload.get("title")
    if not title or len(title.strip()) < 3:
        raise HTTPException(status_code=400, detail="RFQ title is required (min 3 characters).")

    # If linked to Purchase Request, verify PR
    pr_id = payload.get("purchase_request_id")
    pr = None
    if pr_id:
        try:
            pr_uuid = UUID(str(pr_id))
            pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_uuid).first()
        except ValueError:
            pass

    # Parse deadline if provided
    deadline_dt = None
    if payload.get("deadline"):
        try:
            deadline_dt = datetime.strptime(str(payload.get("deadline"))[:10], "%Y-%m-%d")
        except ValueError:
            pass

    rfq = RFQ(
        rfq_number=generate_rfq_number(),
        purchase_request_id=pr.id if pr else None,
        title=title,
        description=payload.get("description"),
        requirements=payload.get("requirements"),
        terms_and_conditions=payload.get("terms_and_conditions"),
        status=RFQStatus.DRAFT,
        deadline=deadline_dt,
        estimated_value=float(payload.get("estimated_value") or 0.0),
        currency=payload.get("currency") or "USD",
        items=payload.get("items") or [],
        attachments=payload.get("selected_suppliers") or [],
    )

    db.add(rfq)
    db.commit()

    # Trigger real-time notification
    from app.services.notification_service import broadcast_notification
    broadcast_notification(
        db=db,
        title="New RFQ Published 📩",
        message=f"RFQ {rfq.rfq_number} ({rfq.title}) has been published for vendor sourcing.",
        notification_type="info",
        action_url="/rfq",
        reference_id=str(rfq.id),
        reference_type="rfq"
    )

    db.refresh(rfq)

    AuditService.log_event(
        db=db,
        action="RFQ_CREATED",
        entity_type="rfq",
        entity_id=rfq.rfq_number,
        user_id=current_user.id,
        changes={"title": rfq.title, "estimated_value": rfq.estimated_value}
    )

    return {
        "id": str(rfq.id),
        "rfq_number": rfq.rfq_number,
        "title": rfq.title,
        "status": rfq.status,
        "message": f"RFQ {rfq.rfq_number} created in DRAFT status."
    }


@router.get("/{rfq_id}")
async def get_rfq(
    rfq_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get single RFQ by ID with details and supplier list."""
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id, RFQ.is_deleted == False).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    user_role = normalize_role(current_user.role)
    if user_role == "supplier":
        sup = get_supplier_for_user(current_user, db)
        if not sup:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Supplier profile not found")
        if rfq.attachments and str(sup.id) not in [str(x) for x in rfq.attachments]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You are not invited to this RFQ.")


    response_count = db.query(Quotation).filter(
        Quotation.rfq_id == rfq.id,
        Quotation.is_deleted == False
    ).count()

    # Load selected suppliers details
    selected_supplier_ids = rfq.attachments or []
    suppliers_list = []
    if selected_supplier_ids:
        for sid in selected_supplier_ids:
            try:
                s_uuid = UUID(str(sid))
                s = db.query(Supplier).filter(Supplier.id == s_uuid).first()
                if s:
                    suppliers_list.append({
                        "id": str(s.id),
                        "company_name": s.company_name,
                        "email": s.email,
                        "category": s.category,
                        "rating": s.overall_rating
                    })
            except ValueError:
                pass

    return {
        "id": str(rfq.id),
        "rfq_number": rfq.rfq_number,
        "title": rfq.title,
        "description": rfq.description,
        "requirements": rfq.requirements,
        "terms_and_conditions": rfq.terms_and_conditions,
        "status": rfq.status,
        "issue_date": rfq.issue_date.isoformat() if rfq.issue_date else None,
        "deadline": rfq.deadline.strftime("%Y-%m-%d") if rfq.deadline else None,
        "estimated_value": rfq.estimated_value or 0.0,
        "currency": rfq.currency or "USD",
        "items": rfq.items or [],
        "selected_suppliers": suppliers_list,
        "response_count": response_count,
        "purchase_request_id": str(rfq.purchase_request_id) if rfq.purchase_request_id else None,
        "created_at": rfq.created_at.isoformat() if rfq.created_at else None,
    }


@router.put("/{rfq_id}")
@router.patch("/{rfq_id}")
async def update_rfq(
    rfq_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Edit an existing RFQ."""
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id, RFQ.is_deleted == False).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    if rfq.status in [RFQStatus.CANCELLED, RFQStatus.AWARDED]:
        raise HTTPException(status_code=400, detail=f"Cannot edit RFQ in '{rfq.status}' status.")

    if "title" in payload and payload["title"]:
        rfq.title = payload["title"]
    if "description" in payload:
        rfq.description = payload["description"]
    if "requirements" in payload:
        rfq.requirements = payload["requirements"]
    if "estimated_value" in payload and payload["estimated_value"] is not None:
        rfq.estimated_value = float(payload["estimated_value"])
    if "items" in payload:
        rfq.items = payload["items"]
    if "selected_suppliers" in payload:
        rfq.attachments = payload["selected_suppliers"]

    if payload.get("deadline"):
        try:
            rfq.deadline = datetime.strptime(str(payload.get("deadline"))[:10], "%Y-%m-%d")
        except ValueError:
            pass

    db.commit()
    db.refresh(rfq)
    return {"message": f"RFQ {rfq.rfq_number} updated successfully.", "id": str(rfq.id)}


@router.post("/{rfq_id}/send")
@router.post("/{rfq_id}/publish")
async def send_rfq(
    rfq_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Publish and send RFQ to selected suppliers (DRAFT → SENT)."""
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id, RFQ.is_deleted == False).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    if rfq.status != RFQStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"Cannot send RFQ in '{rfq.status}' status. Only DRAFT RFQs can be sent.")

    rfq.status = RFQStatus.SENT
    rfq.issue_date = datetime.utcnow()
    db.commit()
    db.refresh(rfq)

    AuditService.log_event(
        db=db,
        action="RFQ_PUBLISHED",
        entity_type="rfq",
        entity_id=rfq.rfq_number,
        user_id=current_user.id,
        changes={"issue_date": rfq.issue_date.isoformat(), "deadline": rfq.deadline.isoformat() if rfq.deadline else None}
    )

    return {
        "message": f"RFQ {rfq.rfq_number} has been published and sent to suppliers.",
        "status": "sent",
        "issue_date": rfq.issue_date.isoformat()
    }


@router.post("/{rfq_id}/cancel")
async def cancel_rfq(
    rfq_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "buyer"))
):
    """Cancel an active RFQ."""
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id, RFQ.is_deleted == False).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    if rfq.status in [RFQStatus.CANCELLED, RFQStatus.AWARDED]:
        raise HTTPException(status_code=400, detail=f"RFQ is already '{rfq.status}'.")

    rfq.status = RFQStatus.CANCELLED
    db.commit()
    return {"message": f"RFQ {rfq.rfq_number} cancelled.", "status": "cancelled"}


@router.delete("/{rfq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rfq(
    rfq_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "buyer"))
):
    """Soft-delete an RFQ."""
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id, RFQ.is_deleted == False).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    rfq.is_deleted = True
    db.commit()

