"""
IntelliProcure AI – RFQ, Quotation, Invoice, Contract, Inventory,
                     Notification, AuditLog, AIRecommendation, SupplierRating Models
All remaining database entities for the procurement platform.
"""

# ───────────────── RFQ Model ─────────────────
from sqlalchemy import Column, String, Float, Text, Integer, Enum, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.database.session import Base
from app.database.base import TimestampMixin, SoftDeleteMixin


# ─── RFQ ──────────────────────────────────────────────────────────────────────
class RFQStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    RESPONSES_RECEIVED = "responses_received"
    AWARDED = "awarded"
    CANCELLED = "cancelled"


class RFQ(Base, TimestampMixin, SoftDeleteMixin):
    """Request for Quotation — solicits bids from suppliers."""
    __tablename__ = "rfqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_number = Column(String(50), unique=True, nullable=False, index=True)
    purchase_request_id = Column(UUID(as_uuid=True), ForeignKey("purchase_requests.id"), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    terms_and_conditions = Column(Text, nullable=True)
    
    status = Column(Enum(RFQStatus), default=RFQStatus.DRAFT)
    issue_date = Column(DateTime(timezone=True), nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    
    estimated_value = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    
    items = Column(JSON, nullable=True, comment="List of items/specs being quoted")
    attachments = Column(JSON, nullable=True)
    evaluation_criteria = Column(JSON, nullable=True)

    purchase_request = relationship("PurchaseRequest", back_populates="rfqs")
    supplier = relationship("Supplier", back_populates="rfqs")
    quotations = relationship("Quotation", back_populates="rfq", lazy="dynamic")


# ─── Quotation ────────────────────────────────────────────────────────────────
class QuotationStatus(str, enum.Enum):
    RECEIVED = "received"
    UNDER_EVALUATION = "under_evaluation"
    SHORTLISTED = "shortlisted"
    AWARDED = "awarded"
    REJECTED = "rejected"


class Quotation(Base, TimestampMixin, SoftDeleteMixin):
    """Supplier quotation in response to an RFQ."""
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_number = Column(String(50), unique=True, nullable=False, index=True)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    
    status = Column(Enum(QuotationStatus), default=QuotationStatus.RECEIVED)
    received_date = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    payment_terms = Column(String(200), nullable=True)
    delivery_days = Column(Integer, nullable=True)
    warranty_months = Column(Integer, nullable=True)
    
    # AI scoring
    ai_score = Column(Float, nullable=True, comment="AI evaluation score 0-100")
    ai_recommendation = Column(Text, nullable=True)
    price_competitiveness = Column(Float, nullable=True, comment="0-100 vs market price")
    
    line_items = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)

    rfq = relationship("RFQ", back_populates="quotations")
    supplier = relationship("Supplier", back_populates="quotations")
    purchase_orders = relationship("PurchaseOrder", back_populates=None, foreign_keys="PurchaseOrder.quotation_id")


# ─── Goods Receipt ────────────────────────────────────────────────────────────
class GoodsReceiptStatus(str, enum.Enum):
    DRAFT = "draft"
    POSTED = "posted"
    CANCELLED = "cancelled"


class GoodsReceipt(Base, TimestampMixin, SoftDeleteMixin):
    """Goods Receipt Note (GRN) — third leg of 3-way matching."""
    __tablename__ = "goods_receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_number = Column(String(100), unique=True, nullable=False, index=True)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    received_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    status = Column(Enum(GoodsReceiptStatus), default=GoodsReceiptStatus.POSTED)
    receipt_date = Column(DateTime(timezone=True), nullable=False)
    delivery_note_number = Column(String(100), nullable=True)
    warehouse_location = Column(String(200), nullable=True)

    # Received line items: [{item_name, item_code, quantity_ordered, quantity_received, unit_price, condition}]
    line_items = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    discrepancy_notes = Column(Text, nullable=True)

    purchase_order = relationship("PurchaseOrder")
    supplier = relationship("Supplier")


# ─── Invoice ──────────────────────────────────────────────────────────────────
class InvoiceStatus(str, enum.Enum):
    RECEIVED = "received"
    UNDER_REVIEW = "under_review"
    MATCHED = "matched"
    PARTIALLY_MATCHED = "partially_matched"
    MISMATCHED = "mismatched"
    APPROVED = "approved"
    DISPUTED = "disputed"
    PAID = "paid"
    CANCELLED = "cancelled"


class Invoice(Base, TimestampMixin, SoftDeleteMixin):
    """Supplier invoice linked to a Purchase Order."""
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String(100), nullable=False, index=True)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=True)
    goods_receipt_id = Column(UUID(as_uuid=True), ForeignKey("goods_receipts.id"), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)

    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.RECEIVED)

    invoice_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    paid_date = Column(DateTime(timezone=True), nullable=True)

    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    currency = Column(String(10), default="USD")

    # 3-Way Matching result
    match_status = Column(String(30), nullable=True, comment="MATCHED | PARTIALLY_MATCHED | MISMATCHED")
    match_result = Column(JSON, nullable=True, comment="Detailed per-field match result")
    match_performed_at = Column(DateTime(timezone=True), nullable=True)

    # AI fraud detection
    fraud_risk_score = Column(Float, nullable=True, comment="AI fraud score 0-100")
    fraud_flags = Column(JSON, nullable=True)
    is_duplicate = Column(Boolean, default=False)
    ocr_extracted = Column(Boolean, default=False, comment="Was data extracted via OCR")

    line_items = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    attachment_url = Column(String(500), nullable=True)

    purchase_order = relationship("PurchaseOrder", back_populates="invoices")
    goods_receipt = relationship("GoodsReceipt")
    supplier = relationship("Supplier", back_populates="invoices")


# ─── Contract ─────────────────────────────────────────────────────────────────
class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    UNDER_NEGOTIATION = "under_negotiation"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    RENEWED = "renewed"


class ContractType(str, enum.Enum):
    MASTER_SERVICE = "master_service"
    PURCHASE = "purchase"
    FRAMEWORK = "framework"
    NDA = "nda"
    SLA = "sla"


class Contract(Base, TimestampMixin, SoftDeleteMixin):
    """Legal contract with a supplier."""
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_number = Column(String(100), unique=True, nullable=False, index=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    contract_type = Column(Enum(ContractType), nullable=False)
    status = Column(Enum(ContractStatus), default=ContractStatus.DRAFT)
    
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    renewal_date = Column(DateTime(timezone=True), nullable=True)
    
    contract_value = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    payment_schedule = Column(JSON, nullable=True)
    
    auto_renew = Column(Boolean, default=False)
    notice_period_days = Column(Integer, default=30)

    # Document & Versioning
    document_file_path = Column(String(500), nullable=True)
    current_version = Column(Integer, default=1)
    versions_history = Column(JSON, nullable=True)

    # AI analysis
    ai_summary = Column(Text, nullable=True)
    ai_risk_score = Column(Float, nullable=True)
    ai_key_clauses = Column(JSON, nullable=True, comment="AI-extracted key clauses: payment, termination, renewal, penalties, liability, delivery")
    ai_obligations = Column(JSON, nullable=True)
    ai_risk_assessment = Column(JSON, nullable=True, comment="Extracted contract risks")
    ai_expiry_terms = Column(JSON, nullable=True, comment="Renewal and expiry analysis")

    terms_url = Column(String(500), nullable=True)
    signed_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    supplier = relationship("Supplier", back_populates="contracts")


# ─── Inventory ────────────────────────────────────────────────────────────────
class InventoryStatus(str, enum.Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"


class Inventory(Base, TimestampMixin, SoftDeleteMixin):
    """Inventory item tracking."""
    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_code = Column(String(100), unique=True, nullable=False, index=True)
    item_name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(200), nullable=True)
    
    status = Column(Enum(InventoryStatus), default=InventoryStatus.IN_STOCK)
    
    quantity_on_hand = Column(Float, default=0.0, nullable=False)
    quantity_reserved = Column(Float, default=0.0)
    quantity_on_order = Column(Float, default=0.0)
    reorder_point = Column(Float, nullable=True)
    reorder_quantity = Column(Float, nullable=True)
    
    unit_of_measure = Column(String(50), nullable=True)
    unit_cost = Column(Float, nullable=True)
    total_value = Column(Float, nullable=True)
    
    warehouse_location = Column(String(200), nullable=True)
    bin_location = Column(String(100), nullable=True)
    
    # AI forecasting
    ai_demand_forecast = Column(Float, nullable=True, comment="AI forecasted demand for next 30 days")
    ai_reorder_suggestion = Column(Boolean, default=False)
    
    preferred_supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    last_purchase_date = Column(DateTime(timezone=True), nullable=True)
    last_purchase_price = Column(Float, nullable=True)


# ─── Warehouse & Stock Movement ────────────────────────────────────────────────
class StockMovementType(str, enum.Enum):
    STOCK_IN = "stock_in"
    STOCK_OUT = "stock_out"
    GOODS_RECEIPT = "goods_receipt"
    ADJUSTMENT = "adjustment"


class Warehouse(Base, TimestampMixin):
    """Warehouse facility master data."""
    __tablename__ = "warehouses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    location = Column(String(300), nullable=True)
    is_active = Column(Boolean, default=True)


class StockMovement(Base, TimestampMixin):
    """Audit log of stock movements (stock-in, stock-out, goods receipt)."""
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_id = Column(UUID(as_uuid=True), ForeignKey("inventory.id"), nullable=False)
    movement_type = Column(Enum(StockMovementType), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=True)
    reference_number = Column(String(100), nullable=True)
    warehouse_code = Column(String(100), nullable=True)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)

    inventory = relationship("Inventory", backref="movements")



# ─── Notification ─────────────────────────────────────────────────────────────
class NotificationType(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    APPROVAL_REQUEST = "approval_request"
    SYSTEM = "system"


class Notification(Base, TimestampMixin):
    """In-app notifications for users."""
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), default=NotificationType.INFO)
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    action_url = Column(String(500), nullable=True, comment="Frontend route to navigate to")
    reference_id = Column(String(100), nullable=True, comment="ID of related entity")
    reference_type = Column(String(100), nullable=True, comment="Type of related entity")

    user = relationship("User", back_populates="notifications")


# ─── Audit Log ────────────────────────────────────────────────────────────────
class AuditLog(Base, TimestampMixin):
    """Immutable audit trail for all important actions."""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    action = Column(String(200), nullable=False, comment="Action performed (e.g., 'PO_APPROVED')")
    entity_type = Column(String(100), nullable=False, comment="Table/entity affected")
    entity_id = Column(String(100), nullable=True)
    
    changes = Column(JSON, nullable=True, comment="Before/after state diff")
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    user = relationship("User", back_populates="audit_logs")


# ─── AI Recommendation ────────────────────────────────────────────────────────
class AIRecommendation(Base, TimestampMixin):
    """AI-generated recommendations for procurement decisions."""
    __tablename__ = "ai_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recommendation_type = Column(String(100), nullable=False, comment="supplier, price, risk, etc.")
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=True)
    
    is_actioned = Column(Boolean, default=False)
    actioned_at = Column(DateTime(timezone=True), nullable=True)
    
    metadata_ = Column("metadata", JSON, nullable=True)


# ─── Supplier Rating ──────────────────────────────────────────────────────────
class SupplierRating(Base, TimestampMixin):
    """Individual performance rating for a supplier."""
    __tablename__ = "supplier_ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    rated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    purchase_order_id = Column(UUID(as_uuid=True), nullable=True)
    
    quality_rating = Column(Float, nullable=False, comment="1-5 stars")
    delivery_rating = Column(Float, nullable=False, comment="1-5 stars")
    price_rating = Column(Float, nullable=False, comment="1-5 stars")
    communication_rating = Column(Float, nullable=True)
    overall_rating = Column(Float, nullable=False)
    
    comments = Column(Text, nullable=True)

    supplier = relationship("Supplier", back_populates="ratings")


# ─── Department ───────────────────────────────────────────────────────────────
class Department(Base, TimestampMixin):
    """Organization department master data."""
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    budget_annual = Column(Float, nullable=True)
    budget_used = Column(Float, default=0.0)
    head_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    parent_department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
