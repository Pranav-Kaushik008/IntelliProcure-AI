"""
IntelliProcure AI – Module 13: 3-Way Matching Engine
Compares Purchase Order + Goods Receipt + Invoice with exact field-level validation.
Returns MATCHED / PARTIALLY_MATCHED / MISMATCHED with precise reasons.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import uuid

from app.database.session import get_db
from app.core.security import get_current_active_user, require_roles, require_internal_user
from app.models.rfq import (
    Invoice, InvoiceStatus,
    GoodsReceipt, GoodsReceiptStatus,
)
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.supplier import Supplier
from app.services.audit_service import AuditService

router = APIRouter()

# ── Tolerances ────────────────────────────────────────────────────────────────
PRICE_TOLERANCE_PCT = 2.0    # ±2% price variance allowed
QTY_TOLERANCE_PCT   = 0.0    # Exact quantity required (no tolerance)
TAX_TOLERANCE_ABS   = 1.0    # ±$1 absolute tolerance on tax
TOTAL_TOLERANCE_PCT = 2.0    # ±2% total variance allowed


# ── Core Matching Engine ───────────────────────────────────────────────────────
def run_three_way_match(
    po: PurchaseOrder,
    grn: Optional[GoodsReceipt],
    invoice: Invoice,
    db: Session
) -> Dict[str, Any]:
    """
    Performs 3-way matching between PO, GRN, and Invoice.
    Returns match_status (MATCHED / PARTIALLY_MATCHED / MISMATCHED) and detailed reasons.
    """
    issues: List[Dict] = []          # critical / blocking
    warnings: List[Dict] = []        # non-blocking discrepancies
    checks: List[Dict] = []          # all check results for UI

    def check(field: str, po_val, grn_val, inv_val, ok: bool, severity: str, reason: str):
        """Record a check result."""
        entry = {
            "field": field,
            "po_value": str(po_val) if po_val is not None else "—",
            "grn_value": str(grn_val) if grn_val is not None else "—",
            "invoice_value": str(inv_val) if inv_val is not None else "—",
            "status": "MATCH" if ok else severity,
            "reason": reason if not ok else "Values match",
        }
        checks.append(entry)
        if not ok:
            if severity == "MISMATCH":
                issues.append({"field": field, "reason": reason})
            else:
                warnings.append({"field": field, "reason": reason})

    # ── 1. Supplier Validation ────────────────────────────────────────────────
    inv_sup_id  = str(invoice.supplier_id)
    po_sup_id   = str(po.supplier_id)
    grn_sup_id  = str(grn.supplier_id) if grn else None

    sup_ok = (inv_sup_id == po_sup_id)
    if grn and grn_sup_id:
        sup_ok = sup_ok and (inv_sup_id == grn_sup_id)

    check(
        "Supplier",
        po.supplier.company_name if po.supplier else po_sup_id,
        grn.supplier.company_name if (grn and grn.supplier) else "—",
        invoice.supplier.company_name if invoice.supplier else inv_sup_id,
        sup_ok,
        "MISMATCH",
        "Supplier on invoice does not match the Purchase Order supplier."
        + (" GRN supplier also differs." if grn and not sup_ok else "")
    )

    # ── 2. Duplicate Invoice Check ────────────────────────────────────────────
    dup_count = db.query(Invoice).filter(
        Invoice.invoice_number == invoice.invoice_number,
        Invoice.id != invoice.id,
        Invoice.is_deleted == False
    ).count()
    check(
        "Duplicate Invoice",
        "—", "—", invoice.invoice_number,
        dup_count == 0,
        "MISMATCH",
        f"Duplicate invoice number '{invoice.invoice_number}' already exists in the system."
    )

    # ── 3. PO Status Validation ───────────────────────────────────────────────
    valid_po_statuses = {
        POStatus.ISSUED, POStatus.ACKNOWLEDGED,
        POStatus.PARTIALLY_RECEIVED, POStatus.FULLY_RECEIVED
    }
    po_status_ok = po.status in valid_po_statuses
    check(
        "PO Status",
        po.status.value, "—", "—",
        po_status_ok,
        "MISMATCH",
        f"Purchase Order is in '{po.status.value}' status — invoices can only be processed "
        f"for Issued/Acknowledged/Received POs."
    )

    # ── 4. GRN Existence Check ────────────────────────────────────────────────
    grn_exists = grn is not None and grn.status != GoodsReceiptStatus.CANCELLED
    check(
        "Goods Receipt Note",
        "Required", grn.grn_number if grn else "MISSING", "—",
        grn_exists,
        "WARNING",
        "No posted Goods Receipt Note (GRN) found for this Purchase Order. "
        "Payment should not proceed without confirmed delivery."
    )

    # ── 5. Total Amount Validation ────────────────────────────────────────────
    po_total = po.total_amount or 0.0
    inv_total = invoice.total_amount or 0.0
    if po_total > 0:
        total_var_pct = abs((inv_total - po_total) / po_total) * 100.0
        total_ok = total_var_pct <= TOTAL_TOLERANCE_PCT
    else:
        total_var_pct = 0.0
        total_ok = True  # No PO total to compare

    check(
        "Total Amount",
        f"${po_total:,.2f}",
        f"${grn.line_items[0].get('total', 0) if (grn and grn.line_items) else 0:,.2f}" if grn else "—",
        f"${inv_total:,.2f}",
        total_ok,
        "MISMATCH",
        f"Invoice total ${inv_total:,.2f} deviates from PO total ${po_total:,.2f} by {total_var_pct:.1f}% "
        f"(tolerance: {TOTAL_TOLERANCE_PCT}%)."
    )

    # ── 6. Tax Validation ─────────────────────────────────────────────────────
    po_tax = po.tax_amount or 0.0
    inv_tax = invoice.tax_amount or 0.0
    tax_diff = abs(inv_tax - po_tax)
    tax_ok = tax_diff <= TAX_TOLERANCE_ABS or po_tax == 0
    check(
        "Tax Amount",
        f"${po_tax:,.2f}", "—", f"${inv_tax:,.2f}",
        tax_ok,
        "WARNING",
        f"Tax amount mismatch: PO has ${po_tax:,.2f}, invoice has ${inv_tax:,.2f} (diff: ${tax_diff:,.2f})."
    )

    # ── 7. Line Item Matching ─────────────────────────────────────────────────
    po_items: List[PurchaseOrderItem] = po.items or []
    inv_items: List[dict] = invoice.line_items or []
    grn_items: List[dict] = (grn.line_items or []) if grn else []

    if not inv_items and po_items:
        inv_items = [
            {
                "item_name": it.item_name,
                "quantity": it.quantity_ordered,
                "unit_price": it.unit_price,
                "total": it.total_price or (it.quantity_ordered * it.unit_price)
            }
            for it in po_items
        ]

    if grn and not grn_items and po_items:
        grn_items = [
            {
                "item_name": it.item_name,
                "quantity_received": it.quantity_ordered,
                "unit_price": it.unit_price,
                "total": it.total_price or (it.quantity_ordered * it.unit_price)
            }
            for it in po_items
        ]

    # Build lookup maps by item_name (lowercase) for fuzzy matching
    grn_map = {i.get("item_name", "").lower().strip(): i for i in grn_items}
    inv_map = {i.get("item_name", "").lower().strip(): i for i in inv_items}

    item_checks = []
    for po_item in po_items:
        name_key = po_item.item_name.lower().strip()
        inv_item = inv_map.get(name_key)
        grn_item = grn_map.get(name_key)

        po_qty = po_item.quantity_ordered
        po_price = po_item.unit_price

        inv_qty = float(inv_item.get("quantity", 0)) if inv_item else None
        inv_price = float(inv_item.get("unit_price", 0)) if inv_item else None
        grn_qty = float(grn_item.get("quantity_received", 0)) if grn_item else None

        item_issues = []

        # Quantity: invoice vs PO
        if inv_qty is None:
            item_issues.append(f"Item '{po_item.item_name}' missing from invoice.")
        else:
            qty_diff = abs(inv_qty - po_qty)
            if qty_diff > QTY_TOLERANCE_PCT:
                item_issues.append(
                    f"Quantity mismatch on '{po_item.item_name}': "
                    f"PO={po_qty}, Invoice={inv_qty} (diff={qty_diff:.2f})."
                )

        # Quantity: GRN vs invoice
        if grn and grn_qty is not None and inv_qty is not None:
            if abs(grn_qty - inv_qty) > 0:
                item_issues.append(
                    f"GRN received qty ({grn_qty}) ≠ invoice qty ({inv_qty}) for '{po_item.item_name}'."
                )

        # Price: invoice vs PO
        if inv_price is not None and po_price > 0:
            price_var_pct = abs((inv_price - po_price) / po_price) * 100.0
            if price_var_pct > PRICE_TOLERANCE_PCT:
                item_issues.append(
                    f"Price mismatch on '{po_item.item_name}': "
                    f"PO=${po_price:,.2f}, Invoice=${inv_price:,.2f} ({price_var_pct:.1f}% variance)."
                )

        item_ok = len(item_issues) == 0
        item_entry = {
            "item_name": po_item.item_name,
            "item_code": po_item.item_code or "—",
            "po_qty": po_qty,
            "po_price": po_price,
            "grn_qty": grn_qty,
            "inv_qty": inv_qty,
            "inv_price": inv_price,
            "status": "MATCH" if item_ok else "MISMATCH",
            "issues": item_issues,
        }
        item_checks.append(item_entry)
        if item_issues:
            for iss in item_issues:
                issues.append({"field": f"Line Item: {po_item.item_name}", "reason": iss})

    # Items on invoice NOT in PO
    for name_key, inv_item in inv_map.items():
        po_names = {i.item_name.lower().strip() for i in po_items}
        if name_key not in po_names:
            issues.append({
                "field": f"Line Item: {inv_item.get('item_name', name_key)}",
                "reason": f"Item '{inv_item.get('item_name', name_key)}' on invoice is NOT on the Purchase Order."
            })

    critical_count = len(issues)
    warning_count = len(warnings)
    total_checks_count = len(checks) + len(item_checks)
    passed_checks_count = max(0, total_checks_count - critical_count - (warning_count * 0.5))
    calculated_score = round((passed_checks_count / max(total_checks_count, 1)) * 100.0, 1)

    if critical_count == 0 and warning_count == 0:
        match_status = "MATCHED"
        match_score = 100.0
    elif critical_count == 0 and warning_count > 0:
        match_status = "PARTIALLY_MATCHED"
        match_score = max(calculated_score, 70.0)
    else:
        match_status = "MISMATCHED"
        match_score = min(calculated_score, 40.0)

    return {
        "match_status": match_status,
        "match_score": match_score,
        "summary": {
            "critical_issues": critical_count,
            "warnings": warning_count,
            "total_checks": total_checks_count,
        },
        "po": {
            "id": str(po.id),
            "po_number": po.po_number,
            "status": po.status.value,
            "total_amount": po_total,
            "supplier": po.supplier.company_name if po.supplier else "—",
            "item_count": len(po_items),
        },
        "grn": {
            "id": str(grn.id) if grn else None,
            "grn_number": grn.grn_number if grn else "MISSING",
            "status": grn.status.value if grn else "missing",
            "receipt_date": grn.receipt_date.strftime("%Y-%m-%d") if grn else None,
            "item_count": len(grn_items),
        } if grn else {"id": None, "grn_number": "MISSING", "status": "missing"},
        "invoice": {
            "id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "status": invoice.status.value,
            "total_amount": inv_total,
            "supplier": invoice.supplier.company_name if invoice.supplier else "—",
            "item_count": len(inv_items),
        },
        "field_checks": checks,
        "item_checks": item_checks,
        "issues": issues,
        "warnings": warnings,
        "tolerances": {
            "price_tolerance_pct": PRICE_TOLERANCE_PCT,
            "qty_tolerance_pct": QTY_TOLERANCE_PCT,
            "tax_tolerance_abs": TAX_TOLERANCE_ABS,
            "total_tolerance_pct": TOTAL_TOLERANCE_PCT,
        },
        "performed_at": (datetime.utcnow().isoformat() + "Z"),
        "auto_approve_blocked": match_status == "MISMATCHED",
        "recommendation": (
            "Invoice is fully matched. Safe to approve for payment."
            if match_status == "MATCHED" else
            "Invoice has non-critical warnings. Review before approving."
            if match_status == "PARTIALLY_MATCHED" else
            "BLOCKED: Critical mismatches detected. Manual review and correction required before payment."
        ),
    }


# ── API Endpoints ─────────────────────────────────────────────────────────────

@router.post("/match/{invoice_id}", summary="Run 3-Way Match for an Invoice")
@router.post("/validate/{invoice_id}", summary="Run 3-Way Match for an Invoice (Alias)")
async def match_invoice(
    invoice_id: UUID,
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "finance", "manager"))
):
    """
    Run 3-Way Matching for a given invoice.
    Compares Purchase Order + Goods Receipt Note + Invoice on:
    - Supplier, Duplicate check, PO status, GRN existence
    - Total amount, Tax, Line items (qty + price)
    Persists match_status + match_result on the invoice record.
    Does NOT auto-approve MISMATCHED invoices.
    """
    invoice = db.query(Invoice).options(
        joinedload(Invoice.purchase_order).joinedload(PurchaseOrder.items),
        joinedload(Invoice.purchase_order).joinedload(PurchaseOrder.supplier),
        joinedload(Invoice.supplier),
        joinedload(Invoice.goods_receipt),
    ).filter(Invoice.id == invoice_id, Invoice.is_deleted == False).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if not invoice.purchase_order_id:
        raise HTTPException(
            status_code=422,
            detail="Invoice has no linked Purchase Order. 3-way matching requires a PO reference."
        )

    po = invoice.purchase_order
    grn = invoice.goods_receipt

    # If no GRN on invoice, look for any posted GRN on the same PO
    if not grn:
        grn = db.query(GoodsReceipt).filter(
            GoodsReceipt.purchase_order_id == po.id,
            GoodsReceipt.status == GoodsReceiptStatus.POSTED,
            GoodsReceipt.is_deleted == False
        ).order_by(GoodsReceipt.created_at.desc()).first()
        if grn:
            invoice.goods_receipt_id = grn.id

    result = run_three_way_match(po, grn, invoice, db)

    # Persist match result on the invoice
    invoice.match_status = result["match_status"]
    invoice.match_result = result
    invoice.match_performed_at = datetime.utcnow()

    # Update invoice status based on match outcome
    if result["match_status"] == "MATCHED":
        invoice.status = InvoiceStatus.MATCHED
    db.commit()

    AuditService.log_event(
        db=db,
        action="THREE_WAY_MATCH_RUN",
        entity_type="invoice",
        entity_id=invoice.invoice_number,
        user_id=current_user.id,
        changes={"match_status": result.get("match_status"), "score": result.get("match_score", 100.0)}
    )

    # Trigger real-time notification on mismatch or partial match
    if result["match_status"] in ["MISMATCHED", "PARTIALLY_MATCHED"]:
        from app.services.notification_service import broadcast_notification
        broadcast_notification(
            db=db,
            title=f"3-Way Match Alert: {result['match_status'].replace('_', ' ')} ⚠️",
            message=f"Invoice {invoice.invoice_number} flagged: {result['recommendation']}",
            notification_type="warning" if result["match_status"] == "PARTIALLY_MATCHED" else "error",
            action_url="/matching",
            reference_id=str(invoice.id),
            reference_type="invoice"
        )

    return result


@router.get("/match/{invoice_id}", summary="Get Last Match Result for an Invoice")
async def get_match_result(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """Return the last stored 3-way match result for an invoice."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.is_deleted == False
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if not invoice.match_result:
        raise HTTPException(
            status_code=404,
            detail="No match result found. Run POST /match/{invoice_id} first."
        )

    return invoice.match_result


@router.get("/", summary="List All Match Results")
async def list_match_results(
    match_status: Optional[str] = Query(None, description="MATCHED | PARTIALLY_MATCHED | MISMATCHED"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """
    List all invoices that have been 3-way matched, with their match results.
    Optionally filter by match_status.
    """
    query = db.query(Invoice).options(
        joinedload(Invoice.supplier),
        joinedload(Invoice.purchase_order),
    ).filter(Invoice.is_deleted == False, Invoice.match_status != None)

    if match_status and isinstance(match_status, str):
        query = query.filter(Invoice.match_status == match_status.upper())

    offset_val = skip if isinstance(skip, int) else 0
    limit_val = limit if isinstance(limit, int) else 100
    invoices = query.order_by(Invoice.match_performed_at.desc()).offset(offset_val).limit(limit_val).all()

    results = []
    for inv in invoices:
        po = inv.purchase_order
        results.append({
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "invoice_status": inv.status.value if inv.status else "—",
            "match_status": inv.match_status or "NOT_RUN",
            "match_performed_at": (inv.match_performed_at.isoformat() + "Z") if inv.match_performed_at else None,
            "total_amount": inv.total_amount,
            "supplier_name": inv.supplier.company_name if inv.supplier else "—",
            "po_number": po.po_number if po else "—",
            "po_total": po.total_amount if po else None,
            "issues": inv.match_result.get("issues", []) if inv.match_result else [],
            "warnings": inv.match_result.get("warnings", []) if inv.match_result else [],
            "critical_count": len(inv.match_result.get("issues", [])) if inv.match_result else 0,
            "warning_count": len(inv.match_result.get("warnings", [])) if inv.match_result else 0,
            "auto_approve_blocked": inv.match_status == "MISMATCHED",
            "recommendation": (inv.match_result or {}).get("recommendation", "—"),
        })

    return results


# ── Goods Receipt CRUD ────────────────────────────────────────────────────────

@router.post("/goods-receipts/", status_code=status.HTTP_201_CREATED, summary="Create Goods Receipt Note")
async def create_goods_receipt(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager", "finance"))
):
    """Create a Goods Receipt Note (GRN) for a Purchase Order."""
    po_id_str = payload.get("purchase_order_id")
    supplier_id_str = payload.get("supplier_id")

    if not po_id_str:
        raise HTTPException(status_code=400, detail="purchase_order_id is required.")

    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items)
    ).filter(
        PurchaseOrder.id == UUID(str(po_id_str)),
        PurchaseOrder.is_deleted == False
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")

    # Use PO's supplier if not specified
    sup_id = UUID(str(supplier_id_str)) if supplier_id_str else po.supplier_id

    # Auto-generate GRN number
    count = db.query(GoodsReceipt).count()
    grn_number = payload.get("grn_number") or f"GRN-{datetime.now().year}-{count + 1:04d}"

    # Check for duplicate GRN number
    if db.query(GoodsReceipt).filter(GoodsReceipt.grn_number == grn_number).first():
        grn_number = f"GRN-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"

    receipt_date = datetime.utcnow()
    if payload.get("receipt_date"):
        try:
            receipt_date = datetime.strptime(str(payload["receipt_date"])[:10], "%Y-%m-%d")
        except ValueError:
            pass

    line_items = payload.get("line_items") or []
    if not line_items and po.items:
        line_items = [
            {
                "item_name": it.item_name,
                "quantity_received": float(it.quantity_ordered or 1.0),
                "unit_price": float(it.unit_price or 0.0),
                "total": float(it.total_price or (it.quantity_ordered * it.unit_price) or 0.0)
            }
            for it in po.items
        ]

    grn = GoodsReceipt(
        grn_number=grn_number,
        purchase_order_id=po.id,
        supplier_id=sup_id,
        received_by=current_user.id,
        status=GoodsReceiptStatus.POSTED,
        receipt_date=receipt_date,
        delivery_note_number=payload.get("delivery_note_number") or f"DN-{uuid.uuid4().hex[:6].upper()}",
        warehouse_location=payload.get("warehouse_location") or "Main Warehouse",
        line_items=line_items,
        notes=payload.get("notes"),
        discrepancy_notes=payload.get("discrepancy_notes"),
    )
    db.add(grn)
    db.commit()
    db.refresh(grn)

    return {
        "id": str(grn.id),
        "grn_number": grn.grn_number,
        "purchase_order_id": str(grn.purchase_order_id),
        "supplier_id": str(grn.supplier_id),
        "status": grn.status.value,
        "receipt_date": grn.receipt_date.strftime("%Y-%m-%d"),
        "line_items": grn.line_items,
        "message": f"Goods Receipt Note {grn.grn_number} posted successfully.",
    }


@router.get("/goods-receipts/", summary="List Goods Receipts")
async def list_goods_receipts(
    purchase_order_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """List all Goods Receipt Notes, optionally filtered by PO."""
    query = db.query(GoodsReceipt).options(
        joinedload(GoodsReceipt.purchase_order),
        joinedload(GoodsReceipt.supplier),
    ).filter(GoodsReceipt.is_deleted == False)

    if purchase_order_id:
        query = query.filter(GoodsReceipt.purchase_order_id == purchase_order_id)

    grns = query.order_by(GoodsReceipt.created_at.desc()).offset(skip).limit(limit).all()

    return [{
        "id": str(g.id),
        "grn_number": g.grn_number,
        "purchase_order_id": str(g.purchase_order_id),
        "po_number": g.purchase_order.po_number if g.purchase_order else "—",
        "supplier_name": g.supplier.company_name if g.supplier else "—",
        "status": g.status.value,
        "receipt_date": g.receipt_date.strftime("%Y-%m-%d") if g.receipt_date else None,
        "warehouse_location": g.warehouse_location,
        "line_item_count": len(g.line_items or []),
        "notes": g.notes,
        "created_at": g.created_at.isoformat() if g.created_at else None,
    } for g in grns]
