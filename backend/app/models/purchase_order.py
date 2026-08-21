"""
IntelliProcure AI – Purchase Order Model
Represents a legally binding order to a supplier.
Tracks the entire PO lifecycle from creation to payment.
"""

from sqlalchemy import Column, String, Float, Text, Integer, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.database.session import Base
from app.database.base import TimestampMixin, SoftDeleteMixin


class POStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    ISSUED = "issued"
    ACKNOWLEDGED = "acknowledged"
    PARTIALLY_RECEIVED = "partially_received"
    FULLY_RECEIVED = "fully_received"
    INVOICED = "invoiced"
    PAID = "paid"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class PurchaseOrder(Base, TimestampMixin, SoftDeleteMixin):
    """
    Purchase Order (PO) entity.
    
    Created after PR approval. Sent to supplier and tracked through delivery/payment.
    """
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # ─── References ───────────────────────────────────────────────────────────
    purchase_request_id = Column(UUID(as_uuid=True), ForeignKey("purchase_requests.id"), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # ─── Details ──────────────────────────────────────────────────────────────
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    delivery_address = Column(Text, nullable=True)
    delivery_instructions = Column(Text, nullable=True)
    
    # ─── Status ───────────────────────────────────────────────────────────────
    status = Column(Enum(POStatus), default=POStatus.DRAFT, nullable=False)
    
    # ─── Financial ────────────────────────────────────────────────────────────
    subtotal = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), default="USD")
    payment_terms = Column(String(100), nullable=True)
    
    # ─── Dates ────────────────────────────────────────────────────────────────
    issued_at = Column(DateTime(timezone=True), nullable=True)
    expected_delivery_date = Column(DateTime(timezone=True), nullable=True)
    actual_delivery_date = Column(DateTime(timezone=True), nullable=True)
    
    # ─── Tracking ─────────────────────────────────────────────────────────────
    terms_and_conditions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)

    # ─── Relationships ────────────────────────────────────────────────────────
    supplier = relationship("Supplier", back_populates="purchase_orders")
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="purchase_order", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<PurchaseOrder {self.po_number}: {self.status}>"
