"""
IntelliProcure AI – Mock ERP Integration Adapter
Development & Testing adapter when external ERP credentials are not configured.
Clearly labelled as MOCK adapter to ensure no false claims of real ERP connectivity.
"""

from typing import Dict, Any, List
from datetime import datetime
from app.services.erp.base import ERPAdapter, SyncResult, SyncDirection, SyncStatus


class MockERPAdapter(ERPAdapter):
    """
    Mock adapter for development/testing environments.
    Simulates sync operations for suppliers, purchase orders, inventory, and invoices
    with realistic DB counts without attempting real external HTTP calls.
    """

    @property
    def adapter_name(self) -> str:
        return "Mock Development ERP Adapter (No Live Connection)"

    @property
    def is_mock(self) -> bool:
        return True

    def health_check(self) -> Dict[str, Any]:
        return {
            "connected": True,
            "latency_ms": 12,
            "message": "Mock ERP sandbox operational (Development Mode — No credentials configured)",
            "provider": "MOCK",
            "is_mock": True
        }

    def sync_suppliers(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> SyncResult:
        count = 0
        if db:
            from app.models.supplier import Supplier
            count = db.query(Supplier).filter(Supplier.is_deleted == False).count()
        return SyncResult(
            entity="suppliers",
            direction=direction,
            status=SyncStatus.SUCCESS,
            records_synced=count or 15,
            records_failed=0,
            errors=[],
            synced_at=datetime.utcnow(),
            adapter_name=self.adapter_name,
            is_mock=True
        )

    def sync_purchase_orders(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> SyncResult:
        count = 0
        if db:
            from app.models.purchase_order import PurchaseOrder
            count = db.query(PurchaseOrder).filter(PurchaseOrder.is_deleted == False).count()
        return SyncResult(
            entity="purchase_orders",
            direction=direction,
            status=SyncStatus.SUCCESS,
            records_synced=count or 8,
            records_failed=0,
            errors=[],
            synced_at=datetime.utcnow(),
            adapter_name=self.adapter_name,
            is_mock=True
        )

    def sync_inventory(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> SyncResult:
        count = 0
        if db:
            from app.models.rfq import Inventory
            count = db.query(Inventory).filter(Inventory.is_deleted == False).count()
        return SyncResult(
            entity="inventory",
            direction=direction,
            status=SyncStatus.SUCCESS,
            records_synced=count or 24,
            records_failed=0,
            errors=[],
            synced_at=datetime.utcnow(),
            adapter_name=self.adapter_name,
            is_mock=True
        )

    def sync_invoices(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> SyncResult:
        count = 0
        if db:
            from app.models.rfq import Invoice
            count = db.query(Invoice).filter(Invoice.is_deleted == False).count()
        return SyncResult(
            entity="invoices",
            direction=direction,
            status=SyncStatus.SUCCESS,
            records_synced=count or 12,
            records_failed=0,
            errors=[],
            synced_at=datetime.utcnow(),
            adapter_name=self.adapter_name,
            is_mock=True
        )
