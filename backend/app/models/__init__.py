"""
IntelliProcure AI – Data Models Package
Imports all SQLAlchemy models to register them in the registry.
"""

from app.models.user import User, UserRole
from app.models.supplier import Supplier
from app.models.purchase_request import PurchaseRequest
from app.models.purchase_request_item import PurchaseRequestItem
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.rfq import (
    RFQ, RFQStatus,
    Quotation, QuotationStatus,
    Invoice, InvoiceStatus,
    GoodsReceipt, GoodsReceiptStatus,
    Contract, ContractStatus,
    Inventory,
    Notification, NotificationType,
    AuditLog,
    AIRecommendation,
    SupplierRating,
    Department,
)

from app.models.budget import Budget, BudgetStatus

__all__ = [
    "User",
    "UserRole",
    "Supplier",
    "PurchaseRequest",
    "PurchaseRequestItem",
    "PurchaseOrder",
    "PurchaseOrderItem",
    "RFQ",
    "RFQStatus",
    "Quotation",
    "QuotationStatus",
    "Invoice",
    "InvoiceStatus",
    "Contract",
    "ContractStatus",
    "Inventory",
    "Notification",
    "NotificationType",
    "AuditLog",
    "AIRecommendation",
    "SupplierRating",
    "Department",
    "GoodsReceipt",
    "GoodsReceiptStatus",
    "Budget",
    "BudgetStatus",
]
