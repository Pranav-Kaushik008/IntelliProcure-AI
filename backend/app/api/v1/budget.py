"""
IntelliProcure AI – Module 16: Budget Management API Routes
Implements:
  - Create Budget
  - Edit Budget
  - Department / Category allocation
  - Server-side financial calculations:
      * allocated_amount
      * spent_amount
      * remaining_amount (allocated - spent)
      * utilization_pct (spent / allocated * 100)
  - Utilization Threshold Alerts:
      * > 80%  -> WARNING
      * > 90%  -> CRITICAL
      * > 100% -> EXCEEDED
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from app.database.session import get_db
from app.core.security import get_current_active_user, require_roles, require_internal_user
from app.models.budget import Budget, BudgetStatus
from app.models.rfq import Department

router = APIRouter()


def _compute_budget_metrics(b: Budget) -> Dict[str, Any]:
    """Calculate financial totals and threshold alerts server-side."""
    allocated = b.allocated_amount or 0.0
    spent = b.spent_amount or 0.0
    committed = b.committed_amount or 0.0
    remaining = max(0.0, allocated - spent)
    utilization_pct = round((spent / allocated * 100.0), 1) if allocated > 0 else 0.0

    # Determine threshold status
    if utilization_pct > 100.0:
        threshold_status = "EXCEEDED"
        threshold_alert = "CRITICAL: Budget limit exceeded!"
    elif utilization_pct >= 90.0:
        threshold_status = "CRITICAL"
        threshold_alert = f"CRITICAL: High utilization ({utilization_pct}% > 90% threshold)"
    elif utilization_pct >= 80.0:
        threshold_status = "WARNING"
        threshold_alert = f"WARNING: Approaching budget limit ({utilization_pct}% > 80% threshold)"
    else:
        threshold_status = "NORMAL"
        threshold_alert = "Normal utilization"

    return {
        "id": str(b.id),
        "name": b.name,
        "department_id": str(b.department_id) if b.department_id else None,
        "department_name": b.department_name or (b.department.name if b.department else "General"),
        "category": b.category,
        "fiscal_year": b.fiscal_year,
        "allocated_amount": allocated,
        "spent_amount": spent,
        "committed_amount": committed,
        "remaining_amount": remaining,
        "utilization_pct": utilization_pct,
        "currency": b.currency or "USD",
        "threshold_status": threshold_status,
        "threshold_alert": threshold_alert,
        "is_warning": utilization_pct >= 80.0,
        "is_critical": utilization_pct >= 90.0,
        "start_date": b.start_date.strftime("%Y-%m-%d") if b.start_date else None,
        "end_date": b.end_date.strftime("%Y-%m-%d") if b.end_date else None,
        "notes": b.notes,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/", summary="List all budgets")
async def list_budgets(
    department_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    fiscal_year: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """
    List all budgets with server-side calculated financial totals,
    remaining amounts, utilization percentages, and threshold alerts (>80% warning, >90% critical).
    """
    query = db.query(Budget).options(joinedload(Budget.department)).filter(Budget.is_deleted == False)

    if department_name and isinstance(department_name, str):
        query = query.filter(Budget.department_name.ilike(f"%{department_name}%"))
    if category and isinstance(category, str):
        query = query.filter(Budget.category.ilike(f"%{category}%"))
    if fiscal_year and isinstance(fiscal_year, str):
        query = query.filter(Budget.fiscal_year == fiscal_year)
    if search and isinstance(search, str):
        query = query.filter(
            (Budget.name.ilike(f"%{search}%")) |
            (Budget.category.ilike(f"%{search}%")) |
            (Budget.department_name.ilike(f"%{search}%"))
        )

    offset_val = skip if isinstance(skip, int) else 0
    limit_val = limit if isinstance(limit, int) else 100
    budgets = query.order_by(Budget.created_at.desc()).offset(offset_val).limit(limit_val).all()
    results = [_compute_budget_metrics(b) for b in budgets]

    if status and isinstance(status, str):
        status_upper = status.upper()
        results = [r for r in results if r["threshold_status"] == status_upper]

    return results


@router.get("/summary", summary="Executive budget portfolio summary")
async def get_budget_summary(
    fiscal_year: Optional[str] = Query("2026"),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """
    Executive Budget Overview for Dashboard Integration.
    Returns portfolio totals, overall utilization %, warning count (>80%), and critical count (>90%).
    """
    budgets = db.query(Budget).filter(Budget.is_deleted == False).all()

    if not budgets:
        return {
            "total_allocated": 0.0,
            "total_spent": 0.0,
            "total_remaining": 0.0,
            "overall_utilization_pct": 0.0,
            "warning_count_80": 0,
            "critical_count_90": 0,
            "exceeded_count_100": 0,
            "active_budgets_count": 0,
        }

    total_allocated = sum(b.allocated_amount or 0.0 for b in budgets)
    total_spent = sum(b.spent_amount or 0.0 for b in budgets)
    total_remaining = max(0.0, total_allocated - total_spent)
    overall_utilization = round((total_spent / total_allocated * 100.0), 1) if total_allocated > 0 else 0.0

    warning_count = 0
    critical_count = 0
    exceeded_count = 0

    for b in budgets:
        pct = (b.spent_amount / b.allocated_amount * 100.0) if b.allocated_amount > 0 else 0.0
        if pct > 100.0:
            exceeded_count += 1
        elif pct >= 90.0:
            critical_count += 1
        elif pct >= 80.0:
            warning_count += 1

    return {
        "total_allocated": round(total_allocated, 2),
        "total_spent": round(total_spent, 2),
        "total_remaining": round(total_remaining, 2),
        "overall_utilization_pct": overall_utilization,
        "warning_count_80": warning_count,
        "critical_count_90": critical_count,
        "exceeded_count_100": exceeded_count,
        "active_budgets_count": len(budgets),
    }


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Create a new budget")
async def create_budget(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "finance", "manager"))
):
    """
    Create a budget allocation for a department/category.
    Calculates remaining balance and threshold alerts server-side.
    """
    name = payload.get("name")
    category = payload.get("category")
    allocated = float(payload.get("allocated_amount") or 0.0)

    if not name or not category:
        raise HTTPException(status_code=400, detail="name and category are required.")
    if allocated <= 0:
        raise HTTPException(status_code=400, detail="allocated_amount must be greater than 0.")

    dept_name = payload.get("department_name") or "General"
    dept_id = None
    if payload.get("department_id"):
        try:
            dept_id = UUID(str(payload["department_id"]))
        except ValueError:
            pass

    spent = float(payload.get("spent_amount") or 0.0)

    dt_start = None
    if payload.get("start_date"):
        try:
            dt_start = datetime.strptime(str(payload["start_date"])[:10], "%Y-%m-%d")
        except ValueError:
            pass

    dt_end = None
    if payload.get("end_date"):
        try:
            dt_end = datetime.strptime(str(payload["end_date"])[:10], "%Y-%m-%d")
        except ValueError:
            pass

    budget = Budget(
        name=name.strip(),
        department_id=dept_id,
        department_name=dept_name,
        category=category.strip(),
        fiscal_year=str(payload.get("fiscal_year") or "2026"),
        allocated_amount=allocated,
        spent_amount=spent,
        currency=payload.get("currency") or "USD",
        start_date=dt_start,
        end_date=dt_end,
        notes=payload.get("notes")
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return _compute_budget_metrics(budget)


@router.get("/{budget_id}", summary="Get single budget details")
async def get_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """Get budget details with server-side calculated financial values and threshold alerts."""
    b = db.query(Budget).options(joinedload(Budget.department)).filter(
        Budget.id == budget_id, Budget.is_deleted == False
    ).first()

    if not b:
        raise HTTPException(status_code=404, detail="Budget not found.")

    return _compute_budget_metrics(b)


@router.put("/{budget_id}", summary="Edit budget allocation")
async def edit_budget(
    budget_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "finance", "manager"))
):
    """
    Edit budget allocation or spent amount.
    Server-side recalculates remaining balance, utilization %, and threshold status.
    """
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.is_deleted == False).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found.")

    if "name" in payload:
        b.name = str(payload["name"]).strip()
    if "department_name" in payload:
        b.department_name = str(payload["department_name"]).strip()
    if "category" in payload:
        b.category = str(payload["category"]).strip()
    if "fiscal_year" in payload:
        b.fiscal_year = str(payload["fiscal_year"]).strip()
    if "allocated_amount" in payload:
        alloc = float(payload["allocated_amount"])
        if alloc <= 0:
            raise HTTPException(status_code=400, detail="allocated_amount must be greater than 0.")
        b.allocated_amount = alloc
    if "spent_amount" in payload:
        b.spent_amount = float(payload["spent_amount"])
    if "notes" in payload:
        b.notes = payload["notes"]

    db.commit()
    db.refresh(b)

    return _compute_budget_metrics(b)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Soft delete budget")
async def delete_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "finance", "manager"))
):
    """Soft delete budget allocation."""
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.is_deleted == False).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found.")

    b.is_deleted = True
    db.commit()

