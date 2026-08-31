"""IntelliProcure AI – Inventory & Stock Management API Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import random

from app.database.session import get_db
from app.core.security import get_current_active_user
from app.models.rfq import Inventory, InventoryStatus, Warehouse, StockMovement, StockMovementType
from app.models.supplier import Supplier

router = APIRouter()


def generate_item_code() -> str:
    return f"SKU-{datetime.now().year}-{random.randint(10000, 99999)}"


def update_item_status(item: Inventory):
    """Auto-detect low-stock and out-of-stock thresholds."""
    if item.quantity_on_hand <= 0:
        item.status = InventoryStatus.OUT_OF_STOCK
        item.quantity_on_hand = 0.0
    elif item.reorder_point is not None and item.quantity_on_hand <= item.reorder_point:
        item.status = InventoryStatus.LOW_STOCK
    else:
        item.status = InventoryStatus.IN_STOCK

    item.total_value = round((item.quantity_on_hand or 0.0) * (item.unit_cost or 0.0), 2)


@router.get("/warehouses")
async def list_warehouses(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """List master warehouses."""
    warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()
    if not warehouses:
        # Seed default warehouses if empty
        default_whs = [
            Warehouse(code="WH-MAIN", name="Central Distribution Warehouse", location="Building A, Industrial Zone"),
            Warehouse(code="WH-EAST", name="APAC Logistics Hub", location="Singapore East Port"),
            Warehouse(code="WH-WEST", name="North America Depot", location="Chicago, IL Warehouse")
        ]
        db.add_all(default_whs)
        db.commit()
        warehouses = default_whs

    return [
        {
            "id": str(w.id),
            "code": w.code,
            "name": w.name,
            "location": w.location
        }
        for w in warehouses
    ]


@router.post("/warehouses", status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Add a new warehouse facility."""
    code = payload.get("code")
    name = payload.get("name")
    if not code or not name:
        raise HTTPException(status_code=400, detail="Warehouse code and name are required.")

    existing = db.query(Warehouse).filter(Warehouse.code == code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Warehouse code '{code}' already exists.")

    wh = Warehouse(
        code=code.strip().upper(),
        name=name.strip(),
        location=payload.get("location")
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)

    return {"id": str(wh.id), "code": wh.code, "name": wh.name, "location": wh.location}


@router.get("/")
async def list_inventory(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """List inventory items with search, category, and low-stock filters."""
    query = db.query(Inventory).filter(Inventory.is_deleted == False)

    if status_filter and isinstance(status_filter, (InventoryStatus, str)):
        query = query.filter(Inventory.status == status_filter)
    if category and isinstance(category, str):
        query = query.filter(Inventory.category.ilike(f"%{category}%"))
    if search and isinstance(search, str):
        query = query.filter(
            Inventory.item_name.ilike(f"%{search}%") |
            Inventory.item_code.ilike(f"%{search}%") |
            Inventory.category.ilike(f"%{search}%")
        )

    offset_val = skip if isinstance(skip, int) else 0
    limit_val = limit if isinstance(limit, int) else 100
    items = query.order_by(Inventory.created_at.desc()).offset(offset_val).limit(limit_val).all()

    result = []
    for item in items:
        update_item_status(item)
        result.append({
            "id": str(item.id),
            "item_code": item.item_code,
            "item_name": item.item_name,
            "description": item.description,
            "category": item.category or "General",
            "status": item.status,
            "quantity_on_hand": item.quantity_on_hand,
            "quantity_reserved": item.quantity_reserved or 0.0,
            "quantity_on_order": item.quantity_on_order or 0.0,
            "reorder_point": item.reorder_point or 10.0,
            "reorder_quantity": item.reorder_quantity or 50.0,
            "unit_of_measure": item.unit_of_measure or "units",
            "unit_cost": item.unit_cost or 0.0,
            "total_value": item.total_value or 0.0,
            "warehouse_location": item.warehouse_location or "WH-MAIN",
            "bin_location": item.bin_location,
            "is_low_stock": item.quantity_on_hand <= (item.reorder_point or 10.0),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        })

    db.commit()
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Add a new product / inventory item."""
    name = payload.get("item_name")
    if not name or len(name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Product item_name is required (min 2 chars).")

    qty = float(payload.get("quantity_on_hand") or 0.0)
    cost = float(payload.get("unit_cost") or 0.0)
    reorder_pt = float(payload.get("reorder_point") or 10.0)

    if qty < 0:
        raise HTTPException(status_code=400, detail="Initial stock quantity cannot be negative.")
    if cost < 0:
        raise HTTPException(status_code=400, detail="Unit cost cannot be negative.")

    item = Inventory(
        item_code=generate_item_code(),
        item_name=name.strip(),
        description=payload.get("description"),
        category=payload.get("category") or "General",
        quantity_on_hand=qty,
        quantity_reserved=float(payload.get("quantity_reserved") or 0.0),
        reorder_point=reorder_pt,
        reorder_quantity=float(payload.get("reorder_quantity") or 50.0),
        unit_of_measure=payload.get("unit_of_measure") or "units",
        unit_cost=cost,
        warehouse_location=payload.get("warehouse_location") or "WH-MAIN",
        bin_location=payload.get("bin_location"),
    )

    update_item_status(item)
    db.add(item)
    db.commit()
    db.refresh(item)

    # Record initial stock movement log if qty > 0
    if qty > 0:
        movement = StockMovement(
            inventory_id=item.id,
            movement_type=StockMovementType.STOCK_IN,
            quantity=qty,
            unit_cost=cost,
            reference_number="INITIAL_STOCK",
            warehouse_code=item.warehouse_location,
            performed_by=current_user.id,
            notes="Initial stock initialization"
        )
        db.add(movement)
        db.commit()

    return {
        "id": str(item.id),
        "item_code": item.item_code,
        "item_name": item.item_name,
        "quantity_on_hand": item.quantity_on_hand,
        "status": item.status,
        "total_value": item.total_value,
        "message": f"Inventory item {item.item_code} created."
    }


@router.get("/{item_id}")
async def get_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get single product details with stock movement log."""
    item = db.query(Inventory).filter(Inventory.id == item_id, Inventory.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_item_status(item)
    db.commit()

    movements = db.query(StockMovement).filter(StockMovement.inventory_id == item.id).order_by(StockMovement.created_at.desc()).limit(50).all()

    return {
        "id": str(item.id),
        "item_code": item.item_code,
        "item_name": item.item_name,
        "description": item.description,
        "category": item.category or "General",
        "status": item.status,
        "quantity_on_hand": item.quantity_on_hand,
        "quantity_reserved": item.quantity_reserved or 0.0,
        "reorder_point": item.reorder_point or 10.0,
        "reorder_quantity": item.reorder_quantity or 50.0,
        "unit_of_measure": item.unit_of_measure or "units",
        "unit_cost": item.unit_cost or 0.0,
        "total_value": item.total_value or 0.0,
        "warehouse_location": item.warehouse_location or "WH-MAIN",
        "bin_location": item.bin_location,
        "movements": [
            {
                "id": str(m.id),
                "movement_type": m.movement_type,
                "quantity": m.quantity,
                "unit_cost": m.unit_cost,
                "reference_number": m.reference_number,
                "warehouse_code": m.warehouse_code,
                "timestamp": m.created_at.isoformat() if m.created_at else None,
                "notes": m.notes
            }
            for m in movements
        ]
    }


@router.put("/{item_id}")
@router.patch("/{item_id}")
async def update_inventory_item(
    item_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Edit product metadata and reorder rules."""
    item = db.query(Inventory).filter(Inventory.id == item_id, Inventory.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if "item_name" in payload and payload["item_name"]:
        item.item_name = payload["item_name"].strip()
    if "description" in payload:
        item.description = payload["description"]
    if "category" in payload:
        item.category = payload["category"]
    if "unit_cost" in payload and payload["unit_cost"] is not None:
        cost = float(payload["unit_cost"])
        if cost < 0:
            raise HTTPException(status_code=400, detail="Unit cost cannot be negative.")
        item.unit_cost = cost
    if "reorder_point" in payload and payload["reorder_point"] is not None:
        item.reorder_point = float(payload["reorder_point"])
    if "reorder_quantity" in payload and payload["reorder_quantity"] is not None:
        item.reorder_quantity = float(payload["reorder_quantity"])
    if "warehouse_location" in payload:
        item.warehouse_location = payload["warehouse_location"]

    update_item_status(item)
    db.commit()
    db.refresh(item)
    return {"message": f"Inventory item {item.item_code} updated.", "id": str(item.id)}


@router.post("/{item_id}/receive")
async def receive_stock(
    item_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Transactional Goods Receipt / Stock-In.
    Validates quantity > 0 and atomically increments stock on hand.
    """
    qty = float(payload.get("quantity") or 0.0)
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Invalid quantity. Quantity received must be greater than zero.")

    item = db.query(Inventory).filter(Inventory.id == item_id, Inventory.is_deleted == False).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    unit_cost = float(payload.get("unit_cost") or item.unit_cost or 0.0)
    ref_num = payload.get("reference_number") or payload.get("po_number") or "GRN-RCV"
    wh_code = payload.get("warehouse_code") or item.warehouse_location or "WH-MAIN"

    # Transactional stock update
    item.quantity_on_hand += qty
    if unit_cost > 0:
        item.unit_cost = unit_cost
        item.last_purchase_price = unit_cost
        item.last_purchase_date = datetime.utcnow()

    update_item_status(item)

    # Record movement log
    movement = StockMovement(
        inventory_id=item.id,
        movement_type=StockMovementType.GOODS_RECEIPT,
        quantity=qty,
        unit_cost=unit_cost,
        reference_number=ref_num,
        warehouse_code=wh_code,
        performed_by=current_user.id,
        notes=payload.get("notes") or f"Received {qty} {item.unit_of_measure or 'units'}"
    )
    db.add(movement)
    db.commit()
    db.refresh(item)

    return {
        "message": f"Successfully received {qty} units into stock for {item.item_code}.",
        "item_code": item.item_code,
        "quantity_on_hand": item.quantity_on_hand,
        "status": item.status,
        "total_value": item.total_value
    }


@router.post("/{item_id}/issue")
async def issue_stock(
    item_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Transactional Stock-Out / Issue Stock.
    Enforces negative stock prevention and atomically decrements stock.
    """
    qty = float(payload.get("quantity") or 0.0)
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Invalid quantity. Quantity issued must be greater than zero.")

    item = db.query(Inventory).filter(Inventory.id == item_id, Inventory.is_deleted == False).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    # Negative stock prevention check
    if item.quantity_on_hand - qty < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock on hand! Requested issue quantity ({qty}) exceeds current stock ({item.quantity_on_hand} {item.unit_of_measure or 'units'}). Negative stock is forbidden."
        )

    ref_num = payload.get("reference_number") or "ISSUE-OUT"
    wh_code = payload.get("warehouse_code") or item.warehouse_location or "WH-MAIN"

    # Transactional stock decrement
    item.quantity_on_hand -= qty
    update_item_status(item)

    # Record movement log
    movement = StockMovement(
        inventory_id=item.id,
        movement_type=StockMovementType.STOCK_OUT,
        quantity=qty,
        unit_cost=item.unit_cost,
        reference_number=ref_num,
        warehouse_code=wh_code,
        performed_by=current_user.id,
        notes=payload.get("notes") or f"Issued {qty} {item.unit_of_measure or 'units'}"
    )
    db.add(movement)
    db.commit()
    db.refresh(item)

    # Trigger real-time low inventory notification if stock below reorder point
    if item.quantity_on_hand <= (item.reorder_point or 10.0):
        from app.services.notification_service import broadcast_notification
        broadcast_notification(
            db=db,
            title="Low Inventory Alert 📦",
            message=f"Stock for '{item.item_name}' ({item.item_code}) is LOW: {item.quantity_on_hand} remaining (reorder point: {item.reorder_point or 10}).",
            notification_type="warning",
            action_url="/inventory",
            reference_id=str(item.id),
            reference_type="inventory"
        )

    return {
        "message": f"Successfully issued {qty} units from stock for {item.item_code}.",
        "item_code": item.item_code,
        "quantity_on_hand": item.quantity_on_hand,
        "status": item.status,
        "total_value": item.total_value
    }


@router.get("/{item_id}/movements")
async def get_stock_movements(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get stock movement history audit trail."""
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    movements = db.query(StockMovement).filter(StockMovement.inventory_id == item_id).order_by(StockMovement.created_at.desc()).all()
    return [
        {
            "id": str(m.id),
            "movement_type": m.movement_type,
            "quantity": m.quantity,
            "unit_cost": m.unit_cost,
            "reference_number": m.reference_number,
            "warehouse_code": m.warehouse_code,
            "timestamp": m.created_at.isoformat() if m.created_at else None,
            "notes": m.notes
        }
        for m in movements
    ]


@router.get("/{item_id}/forecast")
async def forecast_item_demand(
    item_id: UUID,
    horizon_days: int = Query(30, ge=7, le=180),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    AI Demand Forecasting for a single inventory item based on actual historical StockMovements.
    If <3 historical data points exist, returns a clear 'data_insufficient' state without fabricating data.
    """
    from app.services.ai_service import AIPredictiveEngine

    item = db.query(Inventory).filter(Inventory.id == item_id, Inventory.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Fetch actual historical stock movements for this item
    movements = db.query(StockMovement).filter(
        StockMovement.inventory_id == item.id
    ).order_by(StockMovement.created_at.asc()).all()

    historical_usage = [m.quantity for m in movements]

    forecast_result = AIPredictiveEngine.forecast_item_demand(
        historical_usage=historical_usage,
        current_stock=item.quantity_on_hand,
        reorder_point=item.reorder_point or 10.0,
        reorder_quantity=item.reorder_quantity or 50.0,
        horizon_days=horizon_days
    )

    forecast_result["item"] = {
        "id": str(item.id),
        "item_code": item.item_code,
        "item_name": item.item_name,
        "category": item.category,
        "current_stock": item.quantity_on_hand,
        "unit_of_measure": item.unit_of_measure or "units"
    }

    return forecast_result


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Soft-delete an inventory item."""
    item = db.query(Inventory).filter(Inventory.id == item_id, Inventory.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    item.is_deleted = True
    db.commit()

