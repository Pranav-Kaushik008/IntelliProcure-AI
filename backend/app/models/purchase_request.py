"""
IntelliProcure AI – Purchase Request Model
Handles the first step of the Procure-to-Pay cycle.
Tracks approval workflow from requester through manager to procurement.
"""

from sqlalchemy import Column, String, Float, Text, Integer, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.database.session import Base
from app.database.base import TimestampMixin, SoftDeleteMixin


class PRStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    PO_CREATED = "po_created"
    CANCELLED = "cancelled"


class PRPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class PurchaseRequest(Base, TimestampMixin, SoftDeleteMixin):
    """
    Purchase Request (PR) entity — initiates the procurement workflow.
    
    Flow: Draft → Submitted → Pending Approval → Approved → PO Created
    """
    __tablename__ = "purchase_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pr_number = Column(String(50), unique=True, nullable=False, index=True, comment="Auto-generated PR number")
    
    # ─── Request Details ──────────────────────────────────────────────────────
    title = Column(String(500), nullable=False, comment="Brief description of the request")
    description = Column(Text, nullable=True)
    justification = Column(Text, nullable=True, comment="Business justification")
    
    # ─── Classification ───────────────────────────────────────────────────────
    status = Column(Enum(PRStatus), default=PRStatus.DRAFT, nullable=False)
    priority = Column(Enum(PRPriority), default=PRPriority.MEDIUM)
    category = Column(String(200), nullable=True, comment="Procurement category")
    department = Column(String(200), nullable=True)
    cost_center = Column(String(100), nullable=True)
    project_code = Column(String(100), nullable=True)
    
    # ─── Financial ────────────────────────────────────────────────────────────
    estimated_amount = Column(Float, nullable=False, comment="Total estimated value")
    currency = Column(String(10), default="USD")
    budget_code = Column(String(100), nullable=True)
    
    # ─── Dates ────────────────────────────────────────────────────────────────
    required_by_date = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    
    # ─── Ownership & Approval ─────────────────────────────────────────────────
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    approval_notes = Column(Text, nullable=True)
    
    # ─── AI ───────────────────────────────────────────────────────────────────
    ai_suggested_suppliers = Column(JSON, nullable=True, comment="AI recommended supplier IDs")
    ai_price_estimate = Column(Float, nullable=True, comment="AI-predicted fair market price")
    ai_risk_flag = Column(String(50), nullable=True, comment="AI risk classification")

    # ─── Relationships ────────────────────────────────────────────────────────
    requester = relationship("User", foreign_keys=[requester_id], back_populates="purchase_requests")
    approver = relationship("User", foreign_keys=[approver_id])
    items = relationship("PurchaseRequestItem", back_populates="purchase_request", cascade="all, delete-orphan")
    rfqs = relationship("RFQ", back_populates="purchase_request", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<PurchaseRequest {self.pr_number}: {self.status}>"
