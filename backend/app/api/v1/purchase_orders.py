"""IntelliProcure AI – Purchase Orders API Routes"""

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
    normalize_role,
    get_supplier_for_user
)
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.supplier import Supplier
from app.models.rfq import RFQ, Quotation
from app.models.user import User, UserRole
from app.services.audit_service import AuditService

router = APIRouter()

APPROVER_ROLE_NAMES = {"admin", "manager", "finance"}


def generate_po_number() -> str:
    return f"PO-{datetime.now().year}-{random.randint(10000, 99999)}"


def calculate_po_financials(items_data: List[dict]):
    """Calculate line item totals, PO subtotal, discount, tax, and grand total server-side."""
    calculated_items = []
    total_subtotal = 0.0
    total_discount = 0.0
    total_tax = 0.0

    for item in items_data:
        qty = float(item.get("quantity_ordered") or item.get("qty") or item.get("quantity") or 1.0)
        unit_price = float(item.get("unit_price") or 0.0)
        discount_rate = float(item.get("discount_rate") or 0.0)
        tax_rate = float(item.get("tax_rate") or 0.0)

        subtotal = qty * unit_price
        disc_amt = subtotal * (discount_rate / 100.0)
        taxable = subtotal - disc_amt
        tax_amt = taxable * (tax_rate / 100.0)
        item_total = taxable + tax_amt

        total_subtotal += subtotal
        total_discount += disc_amt
        total_tax += tax_amt

        calculated_items.append({
            "item_name": item.get("item_name") or item.get("name") or "PO Item",
            "description": item.get("description"),
            "unit_of_measure": item.get("unit_of_measure") or "units",
            "quantity_ordered": qty,
            "unit_price": unit_price,
            "discount_rate": discount_rate,
            "tax_rate": tax_rate,
            "total_price": round(item_total, 2),
            "specifications": item.get("specifications")
        })

    grand_total = total_subtotal - total_discount + total_tax
    return calculated_items, round(total_subtotal, 2), round(total_discount, 2), round(total_tax, 2), round(grand_total, 2)


@router.get("/")
async def list_purchase_orders(
    status: Optional[str] = Query(None),
    supplier_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """List purchase orders with status filtering, search, supplier isolation, and details."""
    query = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.items)
    ).filter(PurchaseOrder.is_deleted == False)

    user_role = normalize_role(current_user.role)
    if user_role == "supplier":
        sup = get_supplier_for_user(current_user, db)
        if not sup:
            return []
        query = query.filter(PurchaseOrder.supplier_id == sup.id)
    elif supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    if search:
        query = query.filter(
            PurchaseOrder.title.ilike(f"%{search}%") |
            PurchaseOrder.po_number.ilike(f"%{search}%")
        )

    pos = query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for po in pos:
        result.append({
            "id": str(po.id),
            "po_number": po.po_number,
            "title": po.title,
            "description": po.description,
            "status": po.status,
            "supplier_id": str(po.supplier_id),
            "supplier_name": po.supplier.company_name if po.supplier else "Supplier",
            "supplier_code": po.supplier.supplier_code if po.supplier else "",
            "subtotal": po.subtotal,
            "discount_amount": po.discount_amount,
            "tax_amount": po.tax_amount,
            "total_amount": po.total_amount,
            "currency": po.currency or "USD",
            "payment_terms": po.payment_terms or "Net 30",
            "issued_at": po.issued_at.isoformat() if po.issued_at else None,
            "expected_delivery_date": po.expected_delivery_date.strftime("%Y-%m-%d") if po.expected_delivery_date else None,
            "items_count": len(po.items),
            "items": [
                {
                    "id": str(it.id),
                    "item_name": it.item_name,
                    "quantity_ordered": it.quantity_ordered,
                    "unit_price": it.unit_price,
                    "total_price": it.total_price,
                }
                for it in po.items
            ],
            "created_at": po.created_at.isoformat() if po.created_at else None,
        })

    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    payload: dict,
    as_draft: bool = Query(True),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Create a new Purchase Order with server-calculated financials and supplier association."""
    title = payload.get("title")
    supplier_id_str = payload.get("supplier_id")

    if not title or len(title.strip()) < 3:
        raise HTTPException(status_code=400, detail="PO title is required.")
    if not supplier_id_str:
        raise HTTPException(status_code=400, detail="supplier_id is required.")

    try:
        supplier_uuid = UUID(str(supplier_id_str))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid supplier_id UUID format.")

    supplier = db.query(Supplier).filter(Supplier.id == supplier_uuid).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    raw_items = payload.get("items") or []
    if not raw_items:
        raw_items = [{
            "item_name": title,
            "quantity_ordered": 1.0,
            "unit_price": float(payload.get("total_amount") or 1000.0)
        }]

    # Calculate financial totals server-side
    calc_items, subtotal, discount, tax, total_amount = calculate_po_financials(raw_items)

    exp_date = None
    if payload.get("expected_delivery_date"):
        try:
            exp_date = datetime.strptime(str(payload.get("expected_delivery_date"))[:10], "%Y-%m-%d")
        except ValueError:
            pass

    initial_status = POStatus.DRAFT if as_draft else POStatus.PENDING_APPROVAL

    po = PurchaseOrder(
        po_number=generate_po_number(),
        title=title,
        supplier_id=supplier.id,
        purchase_request_id=UUID(str(payload["purchase_request_id"])) if payload.get("purchase_request_id") else None,
        quotation_id=UUID(str(payload["quotation_id"])) if payload.get("quotation_id") else None,
        created_by=current_user.id,
        description=payload.get("description"),
        delivery_address=payload.get("delivery_address") or "Default Warehouse",
        payment_terms=payload.get("payment_terms") or supplier.payment_terms or "Net 30",
        currency=payload.get("currency") or "USD",
        subtotal=subtotal,
        discount_amount=discount,
        tax_amount=tax,
        total_amount=total_amount,
        expected_delivery_date=exp_date,
        notes=payload.get("notes"),
        status=initial_status,
    )

    db.add(po)
    db.flush()

    for item_data in calc_items:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            item_name=item_data["item_name"],
            description=item_data.get("description"),
            unit_of_measure=item_data.get("unit_of_measure", "units"),
            quantity_ordered=item_data["quantity_ordered"],
            unit_price=item_data["unit_price"],
            discount_rate=item_data.get("discount_rate", 0.0),
            tax_rate=item_data.get("tax_rate", 0.0),
            total_price=item_data["total_price"],
            specifications=item_data.get("specifications"),
        )
        db.add(po_item)

    db.commit()
    db.refresh(po)

    AuditService.log_event(
        db=db,
        action="PO_CREATED",
        entity_type="purchase_order",
        entity_id=po.po_number,
        user_id=current_user.id,
        changes={"title": po.title, "amount": po.total_amount, "supplier_id": str(po.supplier_id)}
    )

    return {
        "id": str(po.id),
        "po_number": po.po_number,
        "title": po.title,
        "status": po.status,
        "subtotal": po.subtotal,
        "discount_amount": po.discount_amount,
        "tax_amount": po.tax_amount,
        "total_amount": po.total_amount,
        "message": f"Purchase Order {po.po_number} created successfully."
    }


@router.get("/{po_id}")
async def get_purchase_order(
    po_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get single PO by ID with line items, supplier info, and role check."""
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.items)
    ).filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    user_role = normalize_role(current_user.role)
    if user_role == "supplier":
        sup = get_supplier_for_user(current_user, db)
        if not sup or po.supplier_id != sup.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only view Purchase Orders assigned to your supplier account."
            )

    return {
        "id": str(po.id),
        "po_number": po.po_number,
        "title": po.title,
        "description": po.description,
        "delivery_address": po.delivery_address,
        "status": po.status,
        "supplier_id": str(po.supplier_id),
        "supplier_name": po.supplier.company_name if po.supplier else "Supplier",
        "supplier_code": po.supplier.supplier_code if po.supplier else "",
        "subtotal": po.subtotal,
        "discount_amount": po.discount_amount,
        "tax_amount": po.tax_amount,
        "total_amount": po.total_amount,
        "currency": po.currency or "USD",
        "payment_terms": po.payment_terms,
        "issued_at": po.issued_at.isoformat() if po.issued_at else None,
        "expected_delivery_date": po.expected_delivery_date.strftime("%Y-%m-%d") if po.expected_delivery_date else None,
        "notes": po.notes,
        "items": [
            {
                "id": str(it.id),
                "item_name": it.item_name,
                "unit_of_measure": it.unit_of_measure,
                "quantity_ordered": it.quantity_ordered,
                "unit_price": it.unit_price,
                "discount_rate": it.discount_rate,
                "tax_rate": it.tax_rate,
                "total_price": it.total_price,
                "specifications": it.specifications,
            }
            for it in po.items
        ],
        "created_at": po.created_at.isoformat() if po.created_at else None,
    }


@router.put("/{po_id}")
@router.patch("/{po_id}")
async def update_purchase_order(
    po_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Edit a purchase order. Only permitted in DRAFT or REJECTED state."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status not in [POStatus.DRAFT, POStatus.REJECTED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit PO in '{po.status}' status. Only DRAFT or REJECTED POs can be edited."
        )

    if "title" in payload and payload["title"]:
        po.title = payload["title"]
    if "description" in payload:
        po.description = payload["description"]
    if "delivery_address" in payload:
        po.delivery_address = payload["delivery_address"]
    if "payment_terms" in payload:
        po.payment_terms = payload["payment_terms"]

    if "items" in payload and payload["items"]:
        calc_items, subtotal, discount, tax, total_amount = calculate_po_financials(payload["items"])
        po.subtotal = subtotal
        po.discount_amount = discount
        po.tax_amount = tax
        po.total_amount = total_amount

        # Delete existing items and recreate
        db.query(PurchaseOrderItem).filter(PurchaseOrderItem.purchase_order_id == po.id).delete()
        for item_data in calc_items:
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                item_name=item_data["item_name"],
                description=item_data.get("description"),
                unit_of_measure=item_data.get("unit_of_measure", "units"),
                quantity_ordered=item_data["quantity_ordered"],
                unit_price=item_data["unit_price"],
                discount_rate=item_data.get("discount_rate", 0.0),
                tax_rate=item_data.get("tax_rate", 0.0),
                total_price=item_data["total_price"],
                specifications=item_data.get("specifications"),
            )
            db.add(po_item)

    db.commit()
    db.refresh(po)
    return {"message": f"Purchase Order {po.po_number} updated.", "id": str(po.id), "total_amount": po.total_amount}


@router.post("/{po_id}/submit")
async def submit_po(
    po_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Submit a draft PO for approval (DRAFT → PENDING_APPROVAL)."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status != POStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"Cannot submit PO in '{po.status}' status.")

    po.status = POStatus.PENDING_APPROVAL
    db.commit()

    AuditService.log_event(
        db=db,
        action="PO_SUBMITTED",
        entity_type="purchase_order",
        entity_id=po.po_number,
        user_id=current_user.id
    )

    return {"message": f"Purchase Order {po.po_number} submitted for approval.", "status": "pending_approval"}


@router.post("/{po_id}/approve")
async def approve_po(
    po_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "finance"))
):
    """Approve a PO (PENDING_APPROVAL → APPROVED)."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status not in [POStatus.PENDING_APPROVAL, POStatus.SUBMITTED, POStatus.DRAFT]:
        raise HTTPException(status_code=400, detail=f"Cannot approve PO in '{po.status}' status.")

    po.status = POStatus.APPROVED
    db.commit()

    AuditService.log_event(
        db=db,
        action="PO_APPROVED",
        entity_type="purchase_order",
        entity_id=po.po_number,
        user_id=current_user.id,
        changes={"amount": po.total_amount, "approver": current_user.email}
    )

    return {"message": f"Purchase Order {po.po_number} approved.", "status": "approved"}


@router.post("/{po_id}/reject")
async def reject_po(
    po_id: UUID,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "finance"))
):
    """Reject a PO (PENDING_APPROVAL → REJECTED)."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status not in [POStatus.PENDING_APPROVAL, POStatus.SUBMITTED]:
        raise HTTPException(status_code=400, detail=f"Cannot reject PO in '{po.status}' status.")

    po.status = POStatus.REJECTED
    if reason:
        po.notes = f"Rejected: {reason}"
    db.commit()

    AuditService.log_event(
        db=db,
        action="PO_REJECTED",
        entity_type="purchase_order",
        entity_id=po.po_number,
        user_id=current_user.id,
        changes={"reason": reason}
    )

    return {"message": f"Purchase Order {po.po_number} rejected.", "status": "rejected"}


@router.post("/{po_id}/send")
@router.post("/{po_id}/issue")
async def send_po(
    po_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Send/Issue PO to supplier (APPROVED / DRAFT → ISSUED). Sets issued_at timestamp."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status in [POStatus.CANCELLED, POStatus.PAID, POStatus.INVOICED]:
        raise HTTPException(status_code=400, detail=f"Cannot send PO in '{po.status}' status.")

    po.status = POStatus.ISSUED
    po.issued_at = datetime.utcnow()
    db.commit()

    AuditService.log_event(
        db=db,
        action="PO_ISSUED",
        entity_type="purchase_order",
        entity_id=po.po_number,
        user_id=current_user.id,
        changes={"amount": po.total_amount, "issued_at": po.issued_at.isoformat()}
    )

    # Trigger real-time broadcast notification
    from app.services.notification_service import broadcast_notification
    broadcast_notification(
        db=db,
        title="Purchase Order Issued 📄",
        message=f"PO {po.po_number} for ${po.total_amount:,.2f} has been issued and sent to vendor.",
        notification_type="info",
        action_url="/purchase-orders",
        reference_id=str(po.id),
        reference_type="purchase_order"
    )

    return {
        "message": f"Purchase Order {po.po_number} issued and sent to supplier successfully.",
        "status": "issued",
        "issued_at": po.issued_at.isoformat()
    }


@router.post("/{po_id}/cancel")
async def cancel_po(
    po_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "buyer"))
):
    """Cancel a Purchase Order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status in [POStatus.INVOICED, POStatus.PAID, POStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel PO in '{po.status}' status.")

    po.status = POStatus.CANCELLED
    db.commit()
    return {"message": f"Purchase Order {po.po_number} cancelled.", "status": "cancelled"}


@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_po(
    po_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager", "buyer"))
):
    """Soft-delete a PO draft."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    po.is_deleted = True
    db.commit()
