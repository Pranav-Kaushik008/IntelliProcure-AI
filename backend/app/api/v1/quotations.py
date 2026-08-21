"""IntelliProcure AI – Quotation Management API Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import random

from app.database.session import get_db
from app.core.security import get_current_active_user, require_internal_user, normalize_role, get_supplier_for_user
from app.models.rfq import RFQ, RFQStatus, Quotation, QuotationStatus
from app.models.supplier import Supplier

router = APIRouter()


def generate_quote_number() -> str:
    return f"QUO-{datetime.now().year}-{random.randint(10000, 99999)}"


def calculate_financials(line_items: List[dict]):
    """Calculate subtotal, discount, tax, and item total for every line item, plus total_amount."""
    calculated_items = []
    grand_total = 0.0

    for item in line_items:
        qty = float(item.get("quantity") or item.get("qty") or 1.0)
        unit_price = float(item.get("unit_price") or 0.0)
        discount_rate = float(item.get("discount_rate") or 0.0)
        tax_rate = float(item.get("tax_rate") or 0.0)

        subtotal = qty * unit_price
        discount_amount = subtotal * (discount_rate / 100.0)
        taxable = subtotal - discount_amount
        tax_amount = taxable * (tax_rate / 100.0)
        item_total = taxable + tax_amount

        grand_total += item_total

        calculated_items.append({
            "item_name": item.get("item_name") or item.get("name") or "Item",
            "quantity": qty,
            "unit_price": unit_price,
            "subtotal": round(subtotal, 2),
            "discount_rate": discount_rate,
            "discount_amount": round(discount_amount, 2),
            "tax_rate": tax_rate,
            "tax_amount": round(tax_amount, 2),
            "total_price": round(item_total, 2),
        })

    return calculated_items, round(grand_total, 2)


@router.get("/")
async def list_quotations(
    rfq_id: Optional[UUID] = Query(None),
    supplier_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """List quotations. Suppliers only see their own submitted quotations."""
    user_role = normalize_role(current_user.role)
    if user_role == "supplier":
        sup = get_supplier_for_user(current_user, db)
        if not sup:
            return []
        supplier_id = sup.id

    query = db.query(Quotation).options(
        joinedload(Quotation.supplier),
        joinedload(Quotation.rfq)
    ).filter(Quotation.is_deleted == False)

    if rfq_id:
        query = query.filter(Quotation.rfq_id == rfq_id)
    if supplier_id:
        query = query.filter(Quotation.supplier_id == supplier_id)
    if status:
        query = query.filter(Quotation.status == status)

    quotes = query.order_by(Quotation.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for q in quotes:
        result.append({
            "id": str(q.id),
            "quotation_number": q.quotation_number,
            "rfq_id": str(q.rfq_id),
            "rfq_number": q.rfq.rfq_number if q.rfq else None,
            "supplier_id": str(q.supplier_id),
            "supplier_name": q.supplier.company_name if q.supplier else "Supplier",
            "supplier_code": q.supplier.supplier_code if q.supplier else "",
            "status": q.status,
            "total_amount": q.total_amount,
            "currency": q.currency or "USD",
            "payment_terms": q.payment_terms or "Net 30",
            "delivery_days": q.delivery_days or 14,
            "warranty_months": q.warranty_months or 12,
            "line_items": q.line_items or [],
            "notes": q.notes,
            "created_at": q.created_at.isoformat() if q.created_at else None,
        })

    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_quotation(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Create a new supplier quotation. Enforces authenticated supplier identity."""
    user_role = normalize_role(current_user.role)
    rfq_id_str = payload.get("rfq_id")
    supplier_id_str = payload.get("supplier_id")

    if user_role == "supplier":
        sup = get_supplier_for_user(current_user, db)
        if not sup:
            raise HTTPException(status_code=403, detail="Forbidden: No linked supplier profile found.")
        # Override payload supplier_id with authenticated user's actual supplier id
        supplier_id_str = str(sup.id)

    if not rfq_id_str or not supplier_id_str:
        raise HTTPException(status_code=400, detail="Both rfq_id and supplier_id are required.")

    try:
        rfq_uuid = UUID(str(rfq_id_str))
        supplier_uuid = UUID(str(supplier_id_str))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format for rfq_id or supplier_id.")

    rfq = db.query(RFQ).filter(RFQ.id == rfq_uuid).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    supplier = db.query(Supplier).filter(Supplier.id == supplier_uuid).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Financial calculation
    raw_items = payload.get("line_items") or payload.get("items") or []
    if not raw_items:
        raw_items = [{
            "item_name": rfq.title,
            "quantity": 1.0,
            "unit_price": float(payload.get("total_amount") or rfq.estimated_value or 1000.0)
        }]

    calculated_items, grand_total = calculate_financials(raw_items)

    quotation = Quotation(
        quotation_number=generate_quote_number(),
        rfq_id=rfq.id,
        supplier_id=supplier.id,
        status=QuotationStatus.RECEIVED,
        received_date=datetime.utcnow(),
        total_amount=grand_total,
        currency=payload.get("currency") or "USD",
        payment_terms=payload.get("payment_terms") or supplier.payment_terms or "Net 30",
        delivery_days=int(payload.get("delivery_days") or 14),
        warranty_months=int(payload.get("warranty_months") or 12),
        line_items=calculated_items,
        notes=payload.get("notes"),
    )

    if rfq.status in [RFQStatus.SENT, RFQStatus.DRAFT]:
        rfq.status = RFQStatus.RESPONSES_RECEIVED

    db.add(quotation)
    db.commit()
    db.refresh(quotation)

    return {
        "id": str(quotation.id),
        "quotation_number": quotation.quotation_number,
        "total_amount": quotation.total_amount,
        "status": quotation.status,
        "message": f"Quotation {quotation.quotation_number} submitted successfully."
    }


@router.get("/compare/{rfq_id}")
async def compare_quotations(
    rfq_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """
    Quotation Comparison Matrix for an RFQ (Internal Users Only - Competitor bids hidden from suppliers).
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")


    quotes = db.query(Quotation).options(
        joinedload(Quotation.supplier)
    ).filter(
        Quotation.rfq_id == rfq_id,
        Quotation.is_deleted == False
    ).all()

    if not quotes:
        return {
            "rfq_id": str(rfq.id),
            "rfq_number": rfq.rfq_number,
            "title": rfq.title,
            "quotations_count": 0,
            "comparison_matrix": [],
            "message": "No quotations received yet for this RFQ."
        }

    # Find benchmark metrics
    prices = [q.total_amount for q in quotes if q.total_amount > 0]
    min_price = min(prices) if prices else 0
    deliveries = [q.delivery_days for q in quotes if q.delivery_days is not None]
    min_delivery = min(deliveries) if deliveries else 0

    comparison_matrix = []
    for q in quotes:
        sup = q.supplier
        overall_rating = sup.overall_rating if sup and sup.overall_rating else 4.0
        quality_score = sup.quality_score if sup and sup.quality_score else 4.0
        delivery_score = sup.delivery_score if sup and sup.delivery_score else 4.0
        risk_score = sup.risk_score if sup and sup.risk_score else 20.0
        risk_level = sup.risk_level if sup and sup.risk_level else "low"

        is_lowest_price = (q.total_amount == min_price) if min_price > 0 else False
        is_fastest_delivery = (q.delivery_days == min_delivery) if min_delivery > 0 else False

        comparison_matrix.append({
            "id": str(q.id),
            "quotation_number": q.quotation_number,
            "supplier": {
                "id": str(sup.id) if sup else None,
                "name": sup.company_name if sup else "Supplier",
                "code": sup.supplier_code if sup else "",
                "overall_rating": overall_rating,
                "quality_score": quality_score,
                "delivery_score": delivery_score,
                "risk_score": risk_score,
                "risk_level": risk_level,
            },
            "total_amount": q.total_amount,
            "currency": q.currency or "USD",
            "delivery_days": q.delivery_days or 14,
            "payment_terms": q.payment_terms or "Net 30",
            "warranty_months": q.warranty_months or 12,
            "line_items": q.line_items or [],
            "status": q.status,
            "indicators": {
                "is_lowest_price": is_lowest_price,
                "is_fastest_delivery": is_fastest_delivery,
                "is_low_risk": risk_score <= 30,
            },
            # AI Payload structure prepared for next module
            "ai_prepared_features": {
                "normalized_price_score": round((min_price / q.total_amount * 100), 1) if q.total_amount > 0 else 0,
                "normalized_delivery_score": round((min_delivery / q.delivery_days * 100), 1) if q.delivery_days and q.delivery_days > 0 else 0,
                "supplier_trust_score": round(overall_rating * 20, 1),
                "risk_penalty": risk_score,
            }
        })

    return {
        "rfq_id": str(rfq.id),
        "rfq_number": rfq.rfq_number,
        "title": rfq.title,
        "estimated_value": rfq.estimated_value,
        "quotations_count": len(quotes),
        "comparison_matrix": comparison_matrix,
    }


@router.get("/{quote_id}")
async def get_quotation(
    quote_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get single quotation details."""
    quote = db.query(Quotation).options(
        joinedload(Quotation.supplier),
        joinedload(Quotation.rfq)
    ).filter(Quotation.id == quote_id, Quotation.is_deleted == False).first()

    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    return {
        "id": str(quote.id),
        "quotation_number": quote.quotation_number,
        "rfq_id": str(quote.rfq_id),
        "rfq_number": quote.rfq.rfq_number if quote.rfq else None,
        "supplier_id": str(quote.supplier_id),
        "supplier_name": quote.supplier.company_name if quote.supplier else "Supplier",
        "supplier_code": quote.supplier.supplier_code if quote.supplier else "",
        "status": quote.status,
        "total_amount": quote.total_amount,
        "currency": quote.currency or "USD",
        "payment_terms": quote.payment_terms,
        "delivery_days": quote.delivery_days,
        "warranty_months": quote.warranty_months,
        "line_items": quote.line_items or [],
        "notes": quote.notes,
        "created_at": quote.created_at.isoformat() if quote.created_at else None,
    }


@router.put("/{quote_id}")
@router.patch("/{quote_id}")
async def update_quotation(
    quote_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Update a quotation and recalculate totals if items changed."""
    quote = db.query(Quotation).filter(Quotation.id == quote_id, Quotation.is_deleted == False).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if "line_items" in payload or "items" in payload:
        raw_items = payload.get("line_items") or payload.get("items")
        calculated_items, grand_total = calculate_financials(raw_items)
        quote.line_items = calculated_items
        quote.total_amount = grand_total

    if "payment_terms" in payload:
        quote.payment_terms = payload["payment_terms"]
    if "delivery_days" in payload and payload["delivery_days"] is not None:
        quote.delivery_days = int(payload["delivery_days"])
    if "warranty_months" in payload and payload["warranty_months"] is not None:
        quote.warranty_months = int(payload["warranty_months"])
    if "status" in payload:
        quote.status = payload["status"]

    db.commit()
    db.refresh(quote)

    return {
        "message": f"Quotation {quote.quotation_number} updated.",
        "id": str(quote.id),
        "total_amount": quote.total_amount
    }


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(
    quote_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Soft-delete a quotation."""
    quote = db.query(Quotation).filter(Quotation.id == quote_id, Quotation.is_deleted == False).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    quote.is_deleted = True
    db.commit()
