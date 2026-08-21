"""
IntelliProcure AI – ERP Integration Readiness API Routes
Provides status, connectivity check, entity synchronization (suppliers, POs, inventory, invoices),
and sync history audit logs for Oracle ERP Cloud, SAP S/4HANA, Microsoft Dynamics 365, and Mock Adapter.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.database.session import get_db
from app.core.security import get_current_active_user, require_internal_user, require_admin, require_roles
from app.services.erp.registry import ERPAdapterRegistry
from app.services.erp.base import SyncDirection

router = APIRouter()

# In-memory sync audit history log
_sync_history: List[Dict[str, Any]] = []


@router.get("/status")
async def get_erp_status(
    provider: Optional[str] = Query(None),
    current_user=Depends(require_internal_user)
):
    """
    Check current ERP integration status and connectivity.
    Reports provider details, connectivity status, latency, and whether Mock mode is active.
    """
    adapter = ERPAdapterRegistry.get_adapter(provider)
    health = adapter.health_check()

    return {
        "active_provider": provider or adapter.adapter_name,
        "is_mock": adapter.is_mock,
        "health": health,
        "supported_providers": ERPAdapterRegistry.list_providers(),
        "synchronized_entities": ["suppliers", "purchase_orders", "inventory", "invoices"]
    }


@router.post("/sync")
async def trigger_erp_sync(
    entity: str = Query("all", description="suppliers|purchase_orders|inventory|invoices|all"),
    direction: str = Query("pull", description="pull|push"),
    provider: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """
    Trigger manual entity synchronization with ERP system.
    Supports PULL (ERP -> IntelliProcure) and PUSH (IntelliProcure -> ERP).
    """
    adapter = ERPAdapterRegistry.get_adapter(provider)
    sync_dir = SyncDirection.PUSH if direction.lower() == "push" else SyncDirection.PULL

    valid_entities = ["suppliers", "purchase_orders", "inventory", "invoices", "all"]
    if entity.lower() not in valid_entities:
        raise HTTPException(status_code=400, detail=f"Invalid entity '{entity}'. Must be one of {valid_entities}")

    results = []
    if entity.lower() == "all":
        results = adapter.sync_all(direction=sync_dir, db=db)
    elif entity.lower() == "suppliers":
        results.append(adapter.sync_suppliers(direction=sync_dir, db=db))
    elif entity.lower() == "purchase_orders":
        results.append(adapter.sync_purchase_orders(direction=sync_dir, db=db))
    elif entity.lower() == "inventory":
        results.append(adapter.sync_inventory(direction=sync_dir, db=db))
    elif entity.lower() == "invoices":
        results.append(adapter.sync_invoices(direction=sync_dir, db=db))

    dict_results = [r.to_dict() for r in results]

    for res_dict in dict_results:
        res_dict["triggered_by"] = current_user.email
        _sync_history.insert(0, res_dict)

    # Keep last 50 logs
    if len(_sync_history) > 50:
        _sync_history[:] = _sync_history[:50]

    return {
        "message": f"Synchronization completed for {entity}",
        "adapter_name": adapter.adapter_name,
        "is_mock": adapter.is_mock,
        "results": dict_results
    }


@router.get("/logs")
async def get_sync_logs(
    limit: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_active_user)
):
    """Returns recent ERP sync history logs."""
    return _sync_history[:limit]
