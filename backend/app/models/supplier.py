"""
IntelliProcure AI – Supplier Model
Manages vendor/supplier master data including classifications,
contact information, performance metrics, and risk scores.
"""

from sqlalchemy import Column, String, Float, Boolean, Text, Integer, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.database.session import Base
from app.database.base import TimestampMixin, SoftDeleteMixin


class SupplierStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLACKLISTED = "blacklisted"
    PENDING_APPROVAL = "pending_approval"
    UNDER_REVIEW = "under_review"


class SupplierCategory(str, enum.Enum):
    GOODS = "goods"
    SERVICES = "services"
    IT = "it"
    LOGISTICS = "logistics"
    CONSULTING = "consulting"
    MANUFACTURING = "manufacturing"
    RAW_MATERIALS = "raw_materials"
    MARKETING = "marketing"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Supplier(Base, TimestampMixin, SoftDeleteMixin):
    """
    Supplier/Vendor master data entity.
    
    Contains all vendor information including contact details,
    financial data, performance scores, and AI-generated risk assessments.
    """
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # ─── Identity ─────────────────────────────────────────────────────────────
    supplier_code = Column(String(50), unique=True, nullable=False, index=True, comment="Unique supplier code")
    company_name = Column(String(300), nullable=False, comment="Legal company name")
    trade_name = Column(String(300), nullable=True, comment="Trade / DBA name")
    tax_id = Column(String(100), nullable=True, comment="Tax identification number")
    registration_number = Column(String(100), nullable=True)
    
    # ─── Classification ───────────────────────────────────────────────────────
    category = Column(Enum(SupplierCategory), nullable=False, default=SupplierCategory.GOODS)
    status = Column(Enum(SupplierStatus), nullable=False, default=SupplierStatus.PENDING_APPROVAL)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    
    # ─── Contact ──────────────────────────────────────────────────────────────
    contact_person = Column(String(200), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    
    # ─── Address ──────────────────────────────────────────────────────────────
    address_line1 = Column(String(300), nullable=True)
    address_line2 = Column(String(300), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    
    # ─── Financial ────────────────────────────────────────────────────────────
    payment_terms = Column(String(100), nullable=True, comment="e.g. Net 30, Net 60")
    currency = Column(String(10), default="USD")
    credit_limit = Column(Float, nullable=True)
    bank_name = Column(String(200), nullable=True)
    bank_account = Column(String(100), nullable=True)
    
    # ─── Performance Metrics ──────────────────────────────────────────────────
    overall_rating = Column(Float, default=0.0, comment="Aggregate performance score 0-5")
    quality_score = Column(Float, default=0.0)
    delivery_score = Column(Float, default=0.0)
    price_score = Column(Float, default=0.0)
    total_orders = Column(Integer, default=0)
    total_spend = Column(Float, default=0.0, comment="Cumulative spend in USD")
    on_time_delivery_rate = Column(Float, default=0.0, comment="OTD rate 0-100%")
    
    # ─── AI Risk Assessment ───────────────────────────────────────────────────
    risk_score = Column(Float, default=0.0, comment="AI-computed risk score 0-100")
    risk_factors = Column(JSON, nullable=True, comment="JSON array of risk factors")
    last_risk_assessment = Column(String(500), nullable=True)
    
    # ─── Meta ─────────────────────────────────────────────────────────────────
    description = Column(Text, nullable=True)
    certifications = Column(JSON, nullable=True, comment="List of certifications")
    tags = Column(JSON, nullable=True)
    logo_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # ─── Relationships ────────────────────────────────────────────────────────
    rfqs = relationship("RFQ", back_populates="supplier", lazy="dynamic")
    quotations = relationship("Quotation", back_populates="supplier", lazy="dynamic")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier", lazy="dynamic")
    invoices = relationship("Invoice", back_populates="supplier", lazy="dynamic")
    contracts = relationship("Contract", back_populates="supplier", lazy="dynamic")
    ratings = relationship("SupplierRating", back_populates="supplier", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<Supplier {self.supplier_code}: {self.company_name}>"
