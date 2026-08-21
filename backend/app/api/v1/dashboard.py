"""IntelliProcure AI – Dashboard API Routes
Real DB-backed aggregated queries. Compatible with both SQLite and PostgreSQL.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta

from app.database.session import get_db, engine
from app.core.security import get_current_active_user
from app.models.supplier import Supplier
from app.models.purchase_request import PurchaseRequest, PRStatus
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.inventory import Inventory, InventoryStatus
from app.models.audit_log import AuditLog
from app.models.ai_recommendation import AIRecommendation

router = APIRouter()

# Detect dialect once at startup
_IS_SQLITE = engine.dialect.name == "sqlite"


def _cycle_time_expr():
    """Return a SQLAlchemy expression for PO cycle time in days (dialect-aware)."""
    if _IS_SQLITE:
        # SQLite: julianday difference
        return func.julianday(PurchaseOrder.issued_at) - func.julianday(PurchaseOrder.created_at)
    else:
        # PostgreSQL: extract epoch from interval / 86400
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import INTERVAL
        return func.extract(
            'epoch',
            PurchaseOrder.issued_at - PurchaseOrder.created_at
        ) / 86400.0


@router.get("/kpis")
async def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
    period: str = Query("year", pattern="^(month|quarter|year)$"),
):
    """Return all KPI metrics — real DB aggregates, SQLite + PostgreSQL compatible."""
    now = datetime.utcnow()

    if period == "month":
        start_date = now - timedelta(days=30)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    else:
        start_date = now - timedelta(days=365)

    # ── Supplier stats ──────────────────────────────────────────────────────
    active_suppliers = db.query(Supplier).filter(
        Supplier.is_deleted == False,
        Supplier.status == "active",
    ).count()

    high_risk_suppliers = db.query(Supplier).filter(
        Supplier.is_deleted == False,
        Supplier.risk_level.in_(["high", "critical"]),
    ).count()

    # ── Purchase Request stats ──────────────────────────────────────────────
    pending_approvals = db.query(PurchaseRequest).filter(
        PurchaseRequest.is_deleted == False,
        PurchaseRequest.status.in_([PRStatus.SUBMITTED, PRStatus.PENDING_APPROVAL]),
    ).count()

    total_prs = db.query(PurchaseRequest).filter(
        PurchaseRequest.is_deleted == False,
    ).count()

    approved_prs = db.query(PurchaseRequest).filter(
        PurchaseRequest.is_deleted == False,
        PurchaseRequest.status == PRStatus.APPROVED,
    ).count()

    # ── Purchase Order stats ────────────────────────────────────────────────
    open_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.is_deleted == False,
        PurchaseOrder.status.in_([POStatus.ISSUED, POStatus.ACKNOWLEDGED, POStatus.PARTIALLY_RECEIVED]),
    ).count()

    total_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.is_deleted == False,
    ).count()

    # ── Total spend ─────────────────────────────────────────────────────────
    total_spend = float(db.query(
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0)
    ).filter(
        PurchaseOrder.is_deleted == False,
        PurchaseOrder.issued_at >= start_date,
    ).scalar() or 0)

    prev_start = start_date - (now - start_date)
    prev_spend = float(db.query(
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0)
    ).filter(
        PurchaseOrder.is_deleted == False,
        PurchaseOrder.issued_at >= prev_start,
        PurchaseOrder.issued_at < start_date,
    ).scalar() or 0)

    total_spend_change = 0.0
    if prev_spend > 0:
        total_spend_change = round(((total_spend - prev_spend) / prev_spend) * 100, 1)

    # ── Savings ─────────────────────────────────────────────────────────────
    total_savings = float(db.query(
        func.coalesce(func.sum(PurchaseOrder.discount_amount), 0.0)
    ).filter(
        PurchaseOrder.is_deleted == False,
        PurchaseOrder.issued_at >= start_date,
    ).scalar() or 0)

    savings_rate = round((total_savings / total_spend) * 100, 1) if total_spend > 0 else 0.0

    # ── Avg PO cycle time (SQLite-safe) ─────────────────────────────────────
    try:
        avg_cycle_result = db.query(func.avg(_cycle_time_expr())).filter(
            PurchaseOrder.is_deleted == False,
            PurchaseOrder.issued_at.isnot(None),
            PurchaseOrder.created_at.isnot(None),
        ).scalar()
        avg_po_cycle_time = round(float(avg_cycle_result or 0), 1)
    except Exception:
        avg_po_cycle_time = 0.0

    # ── Invoice stats ───────────────────────────────────────────────────────
    total_invoices = db.query(Invoice).filter(Invoice.is_deleted == False).count()
    pending_invoices = db.query(Invoice).filter(
        Invoice.is_deleted == False,
        Invoice.status.in_([InvoiceStatus.RECEIVED, InvoiceStatus.UNDER_REVIEW, InvoiceStatus.MATCHED]),
    ).count()
    flagged_invoices = db.query(Invoice).filter(
        Invoice.is_deleted == False,
        Invoice.fraud_risk_score >= 50,
    ).count()

    # ── Inventory stats ─────────────────────────────────────────────────────
    total_inventory_items = db.query(Inventory).filter(Inventory.is_deleted == False).count()
    low_stock_items = db.query(Inventory).filter(
        Inventory.is_deleted == False,
        Inventory.status.in_([InventoryStatus.LOW_STOCK, InventoryStatus.OUT_OF_STOCK]),
    ).count()

    # ── Monthly spend trend (last 12 months) ────────────────────────────────
    month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_spend = []
    for i in range(11, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1)
        if i == 0:
            month_end = now
        else:
            nxt = month_start + timedelta(days=32)
            month_end = nxt.replace(day=1)

        month_spend = float(db.query(
            func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0)
        ).filter(
            PurchaseOrder.is_deleted == False,
            PurchaseOrder.issued_at >= month_start,
            PurchaseOrder.issued_at < month_end,
        ).scalar() or 0)

        month_savings = float(db.query(
            func.coalesce(func.sum(PurchaseOrder.discount_amount), 0.0)
        ).filter(
            PurchaseOrder.is_deleted == False,
            PurchaseOrder.issued_at >= month_start,
            PurchaseOrder.issued_at < month_end,
        ).scalar() or 0)

        monthly_spend.append({
            "month": month_labels[month_start.month - 1],
            "spend": round(month_spend),
            "savings": round(month_savings),
        })

    # ── Department spend breakdown ───────────────────────────────────────────
    dept_rows = db.query(
        PurchaseRequest.department,
        func.coalesce(func.sum(PurchaseRequest.estimated_amount), 0.0).label("spend"),
    ).filter(
        PurchaseRequest.is_deleted == False,
        PurchaseRequest.department.isnot(None),
    ).group_by(PurchaseRequest.department).all()

    total_dept = sum(float(r.spend) for r in dept_rows) or 1
    department_spend = [
        {
            "department": r.department or "Uncategorized",
            "spend": round(float(r.spend)),
            "percentage": round((float(r.spend) / total_dept) * 100),
        }
        for r in dept_rows
        if float(r.spend) > 0
    ]

    # ── Top suppliers by spend ───────────────────────────────────────────────
    top_suppliers_raw = db.query(Supplier).filter(
        Supplier.is_deleted == False,
        Supplier.status == "active",
    ).order_by(Supplier.total_spend.desc()).limit(5).all()

    top_suppliers = [
        {
            "id": str(s.id),
            "name": s.company_name,
            "spend": s.total_spend or 0,
            "rating": s.overall_rating or 0,
            "risk": s.risk_level or "low",
            "category": s.category or "",
        }
        for s in top_suppliers_raw
    ]

    # ── Recent activities from AuditLog ─────────────────────────────────────
    recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(15).all()
    recent_activities = [
        {
            "id": str(log.id),
            "type": log.action.lower().replace("_", " "),
            "message": f"{log.action.replace('_', ' ').title()} — {log.entity_type.replace('_', ' ').title()} {log.entity_id or ''}".strip(),
            "time": (log.created_at.isoformat() + "Z") if (log.created_at and not str(log.created_at).endswith("Z") and not ("+" in str(log.created_at)[-6:])) else (log.created_at.isoformat() if log.created_at else ""),
        }
        for log in recent_logs
    ]

    # ── AI insights from AIRecommendation ───────────────────────────────────
    ai_recs = db.query(AIRecommendation).filter(
        AIRecommendation.is_actioned == False,
    ).order_by(AIRecommendation.confidence_score.desc()).limit(5).all()

    # ── Real Budget Stats ───────────────────────────────────────────────────
    from app.models.budget import Budget
    budgets = db.query(Budget).filter(Budget.is_deleted == False).all()

    total_allocated_b = sum(b.allocated_amount or 0.0 for b in budgets)
    total_spent_b = sum(b.spent_amount or 0.0 for b in budgets)
    total_remaining_b = max(0.0, total_allocated_b - total_spent_b)
    overall_utilization_b = round((total_spent_b / total_allocated_b * 100.0), 1) if total_allocated_b > 0 else 0.0

    warning_count_80 = sum(1 for b in budgets if (b.spent_amount / b.allocated_amount * 100.0) >= 80.0 and (b.spent_amount / b.allocated_amount * 100.0) < 90.0) if budgets else 0
    critical_count_90 = sum(1 for b in budgets if (b.spent_amount / b.allocated_amount * 100.0) >= 90.0) if budgets else 0

    ai_insights = [
        {
            "type": rec.recommendation_type,
            "title": rec.title,
            "description": rec.content,
            "priority": "high" if (rec.confidence_score or 0) >= 80 else "medium" if (rec.confidence_score or 0) >= 60 else "low",
            "action": "View Details",
        }
        for rec in ai_recs
    ]

    return {
        "kpis": {
            "total_spend": total_spend,
            "total_spend_change": total_spend_change,
            "savings": total_savings,
            "savings_rate": savings_rate,
            "pending_approvals": pending_approvals,
            "total_prs": total_prs,
            "approved_prs": approved_prs,
            "open_pos": open_pos,
            "total_pos": total_pos,
            "avg_po_cycle_time": avg_po_cycle_time,
            "active_suppliers": active_suppliers,
            "high_risk_suppliers": high_risk_suppliers,
            "total_invoices": total_invoices,
            "pending_invoices": pending_invoices,
            "flagged_invoices": flagged_invoices,
            "total_inventory_items": total_inventory_items,
            "low_stock_items": low_stock_items,
        },
        "budget_summary": {
            "total_allocated": round(total_allocated_b, 2),
            "total_spent": round(total_spent_b, 2),
            "total_remaining": round(total_remaining_b, 2),
            "overall_utilization_pct": overall_utilization_b,
            "warning_count_80": warning_count_80,
            "critical_count_90": critical_count_90,
            "active_budgets_count": len(budgets),
        },
        "monthly_spend": monthly_spend,
        "spend_by_department": department_spend,
        "top_suppliers": top_suppliers,
        "recent_activities": recent_activities,
        "ai_insights": ai_insights,
    }


@router.get("/spend-trend")
async def get_spend_trend(
    period: str = Query("year", pattern="^(month|quarter|year)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Spend trend — real PO data, month by month."""
    now = datetime.utcnow()
    months_back = {"month": 1, "quarter": 3, "year": 12}.get(period, 12)
    month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    data = []
    for i in range(months_back - 1, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1)
        if i == 0:
            month_end = now
        else:
            nxt = month_start + timedelta(days=32)
            month_end = nxt.replace(day=1)

        actual = float(db.query(
            func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0)
        ).filter(
            PurchaseOrder.is_deleted == False,
            PurchaseOrder.issued_at >= month_start,
            PurchaseOrder.issued_at < month_end,
        ).scalar() or 0)

        data.append({
            "date": f"{month_labels[month_start.month - 1]} {month_start.year}",
            "actual": round(actual),
            "budget": 0,
            "forecast": 0,
        })
    return data


@router.get("/supplier-performance")
async def get_supplier_performance(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Radar chart — top 5 suppliers by spend."""
    suppliers = db.query(Supplier).filter(
        Supplier.is_deleted == False,
        Supplier.status == "active",
    ).order_by(Supplier.total_spend.desc()).limit(5).all()

    return [
        {
            "supplier": s.company_name,
            "quality": round((s.quality_score or 0) * 20),
            "delivery": round((s.delivery_score or 0) * 20),
            "price": round((s.price_score or 0) * 20),
            "communication": round((s.overall_rating or 0) * 20),
            "compliance": max(0, 100 - (s.risk_score or 0)),
        }
        for s in suppliers
    ]