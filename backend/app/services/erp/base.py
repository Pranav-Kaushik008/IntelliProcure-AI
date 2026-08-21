"""
IntelliProcure AI – ERP Integration Adapter Base Interface
Abstract base class that all ERP adapters must implement.
Entities: suppliers, purchase_orders, inventory, invoices
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class SyncDirection(str, Enum):
    PULL = "pull"   # ERP → IntelliProcure
    PUSH = "push"   # IntelliProcure → ERP


class SyncStatus(str, Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    SKIPPED = "skipped"
    NOT_CONFIGURED = "not_configured"


@dataclass
class SyncResult:
    entity: str
    direction: SyncDirection
    status: SyncStatus
    records_synced: int = 0
    records_failed: int = 0
    errors: List[str] = field(default_factory=list)
    synced_at: datetime = field(default_factory=datetime.utcnow)
    adapter_name: str = "unknown"
    is_mock: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity": self.entity,
            "direction": self.direction.value,
            "status": self.status.value,
            "records_synced": self.records_synced,
            "records_failed": self.records_failed,
            "errors": self.errors,
            "synced_at": self.synced_at.isoformat(),
            "adapter_name": self.adapter_name,
            "is_mock": self.is_mock
        }


class ERPAdapter(ABC):
    """
    Abstract base class for ERP integration adapters.

    All concrete adapters (Oracle ERP Cloud, SAP, Microsoft Dynamics 365, Mock)
    must implement these methods. This ensures the provider can be swapped
    without changing any business logic in the application.
    """

    @property
    @abstractmethod
    def adapter_name(self) -> str:
        """Human-readable name of this ERP adapter."""
        ...

    @property
    @abstractmethod
    def is_mock(self) -> bool:
        """True if this is a development mock adapter (no real ERP connection)."""
        ...

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """
        Test connectivity to the ERP system.
        Returns dict with keys: connected (bool), latency_ms (int), message (str).
        Must NOT raise exceptions — return connected=False on failure.
        """
        ...

    @abstractmethod
    def sync_suppliers(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> SyncResult:
        """
        Synchronize supplier master data.
        PULL: fetch from ERP → upsert into IntelliProcure DB.
        PUSH: read from IntelliProcure DB → push to ERP.
        """
        ...

    @abstractmethod
    def sync_purchase_orders(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> SyncResult:
        """Synchronize purchase orders with the ERP system."""
        ...

    @abstractmethod
    def sync_inventory(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> SyncResult:
        """Synchronize inventory / stock items with the ERP system."""
        ...

    @abstractmethod
    def sync_invoices(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> SyncResult:
        """Synchronize AP invoices with the ERP system."""
        ...

    def sync_all(self, direction: SyncDirection = SyncDirection.PULL, db=None) -> List[SyncResult]:
        """Sync all supported entities. Calls entity methods sequentially."""
        results = []
        for fn in [self.sync_suppliers, self.sync_purchase_orders, self.sync_inventory, self.sync_invoices]:
            try:
                results.append(fn(direction=direction, db=db))
            except Exception as exc:
                entity = fn.__name__.replace("sync_", "")
                results.append(SyncResult(
                    entity=entity,
                    direction=direction,
                    status=SyncStatus.FAILED,
                    errors=[str(exc)],
                    adapter_name=self.adapter_name,
                    is_mock=self.is_mock
                ))
        return results
