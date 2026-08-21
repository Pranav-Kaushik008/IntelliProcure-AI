"""IntelliProcure AI – Suppliers API Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import random
import string

from app.database.session import get_db
from app.core.security import get_current_active_user, require_roles, require_internal_user
from app.models.supplier import Supplier
from app.schemas.schemas import SupplierCreate, SupplierUpdate, SupplierResponse

router = APIRouter()


def generate_supplier_code() -> str:
    """Auto-generate a unique supplier code like SUP-2024-001."""
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"SUP-{suffix}"


@router.get("/", response_model=List[SupplierResponse])
async def list_suppliers(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """List all suppliers with filtering, search, sorting, and pagination."""
    query = db.query(Supplier).filter(Supplier.is_deleted == False)

    if search:
        query = query.filter(
            Supplier.company_name.ilike(f"%{search}%") |
            Supplier.supplier_code.ilike(f"%{search}%") |
            Supplier.email.ilike(f"%{search}%") |
            Supplier.contact_person.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(Supplier.status == status)
    if category:
        query = query.filter(Supplier.category == category)
    if risk_level:
        query = query.filter(Supplier.risk_level == risk_level)

    # Sorting logic
    sort_col = getattr(Supplier, sort_by, Supplier.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    return query.offset(skip).limit(limit).all()


from app.models.supplier import Supplier, SupplierCategory

def _coerce_supplier_category(cat_str: str) -> SupplierCategory:
    if not cat_str:
        return SupplierCategory.GOODS
    val = str(cat_str).upper().strip()
    if "IT" in val:
        return SupplierCategory.IT
    elif "SERVICE" in val:
        return SupplierCategory.SERVICES
    elif "LOGISTIC" in val:
        return SupplierCategory.LOGISTICS
    elif "CONSULT" in val:
        return SupplierCategory.CONSULTING
    elif "MANUFACTUR" in val:
        return SupplierCategory.MANUFACTURING
    elif "RAW" in val:
        return SupplierCategory.RAW_MATERIALS
    else:
        return SupplierCategory.GOODS

@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Create a new supplier record."""
    payload = data.model_dump()
    if "category" in payload:
        payload["category"] = _coerce_supplier_category(payload["category"])

    supplier = Supplier(
        **payload,
        supplier_code=generate_supplier_code()
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """Get a single supplier by ID."""
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_deleted == False
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
@router.patch("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "buyer", "manager"))
):
    """Update supplier information (PUT or PATCH)."""
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_deleted == False
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(supplier, field, value)

    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "manager"))
):
    """Soft-delete a supplier."""
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_deleted == False
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier.is_deleted = True
    db.commit()


@router.get("/stats/summary")
async def supplier_stats(
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """Get supplier aggregate statistics."""
    total = db.query(Supplier).filter(Supplier.is_deleted == False).count()
    active = db.query(Supplier).filter(
        Supplier.is_deleted == False,
        Supplier.status == "active"
    ).count()
    high_risk = db.query(Supplier).filter(
        Supplier.is_deleted == False,
        Supplier.risk_level.in_(["high", "critical"])
    ).count()

    return {
        "total": total,
        "active": active,
        "inactive": total - active,
        "high_risk": high_risk,
    }

