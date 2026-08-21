"""
IntelliProcure AI – Pydantic Schemas
Request/Response models for all API endpoints.
Uses Pydantic v2 with strict validation.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


# ─── Shared ───────────────────────────────────────────────────────────────────
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    total_pages: int


# ─── Auth Schemas ─────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ─── User Schemas ─────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    role: str = "buyer"
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    full_name: str
    role: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    theme: str
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Supplier Schemas ─────────────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    company_name: str = Field(min_length=2, max_length=300)
    trade_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    category: str = "goods"
    contact_person: Optional[str] = None
    website: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    payment_terms: Optional[str] = None
    currency: str = "USD"
    description: Optional[str] = None
    tax_id: Optional[str] = None


class SupplierUpdate(BaseModel):
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    contact_person: Optional[str] = None
    risk_level: Optional[str] = None
    payment_terms: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class SupplierResponse(BaseModel):
    id: UUID
    supplier_code: str
    company_name: str
    trade_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    category: str
    status: str
    risk_level: str
    contact_person: Optional[str] = None
    website: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    overall_rating: float
    quality_score: float
    delivery_score: float
    price_score: float
    total_orders: int
    total_spend: float
    on_time_delivery_rate: float
    risk_score: float
    payment_terms: Optional[str] = None
    currency: str
    description: Optional[str] = None
    certifications: Optional[List[str]] = None
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Purchase Request Schemas ─────────────────────────────────────────────────
class PRItemCreate(BaseModel):
    item_name: str
    description: Optional[str] = None
    unit_of_measure: Optional[str] = None
    quantity: float
    unit_price: Optional[float] = None
    specifications: Optional[str] = None
    preferred_supplier: Optional[str] = None
    category: Optional[str] = None


class PRItemResponse(BaseModel):
    id: UUID
    item_name: str
    description: Optional[str] = None
    quantity: float
    unit_of_measure: Optional[str] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    ai_predicted_price: Optional[float] = None

    model_config = {"from_attributes": True}


class PurchaseRequestCreate(BaseModel):
    title: str = Field(min_length=5)
    description: Optional[str] = None
    justification: Optional[str] = None
    priority: str = "medium"
    category: Optional[str] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    estimated_amount: float
    currency: str = "USD"
    required_by_date: Optional[datetime] = None
    items: List[PRItemCreate] = []


class PurchaseRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    estimated_amount: Optional[float] = None
    required_by_date: Optional[datetime] = None


class PurchaseRequestResponse(BaseModel):
    id: UUID
    pr_number: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    category: Optional[str] = None
    department: Optional[str] = None
    estimated_amount: float
    currency: str
    required_by_date: Optional[datetime] = None
    requester: Optional[UserResponse] = None
    items: List[PRItemResponse] = []
    ai_price_estimate: Optional[float] = None
    ai_risk_flag: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Purchase Order Schemas ───────────────────────────────────────────────────
class POItemCreate(BaseModel):
    item_name: str
    description: Optional[str] = None
    unit_of_measure: Optional[str] = None
    quantity_ordered: float
    unit_price: float
    tax_rate: float = 0.0
    discount_rate: float = 0.0
    specifications: Optional[str] = None


class POItemResponse(BaseModel):
    id: UUID
    item_name: str
    quantity_ordered: float
    quantity_received: float
    unit_price: float
    total_price: float
    unit_of_measure: Optional[str] = None

    model_config = {"from_attributes": True}


class PurchaseOrderCreate(BaseModel):
    title: str
    supplier_id: UUID
    purchase_request_id: Optional[UUID] = None
    quotation_id: Optional[UUID] = None
    description: Optional[str] = None
    delivery_address: Optional[str] = None
    payment_terms: Optional[str] = None
    currency: str = "USD"
    tax_rate: float = 0.0
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[POItemCreate] = []


class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = None
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    actual_delivery_date: Optional[datetime] = None


class PurchaseOrderResponse(BaseModel):
    id: UUID
    po_number: str
    title: str
    status: str
    supplier: Optional[SupplierResponse] = None
    total_amount: float
    subtotal: float
    tax_amount: float
    currency: str
    payment_terms: Optional[str] = None
    issued_at: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    items: List[POItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── RFQ Schemas ─────────────────────────────────────────────────────────────
class RFQCreate(BaseModel):
    title: str
    purchase_request_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    deadline: Optional[datetime] = None
    estimated_value: Optional[float] = None
    currency: str = "USD"
    items: Optional[List[dict]] = None


class RFQUpdate(BaseModel):
    status: Optional[str] = None
    deadline: Optional[datetime] = None
    requirements: Optional[str] = None


class RFQResponse(BaseModel):
    id: UUID
    rfq_number: str
    title: str
    status: str
    supplier: Optional[SupplierResponse] = None
    deadline: Optional[datetime] = None
    estimated_value: Optional[float] = None
    currency: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Quotation Schemas ────────────────────────────────────────────────────────
class QuotationCreate(BaseModel):
    rfq_id: UUID
    supplier_id: UUID
    total_amount: float
    currency: str = "USD"
    payment_terms: Optional[str] = None
    delivery_days: Optional[int] = None
    warranty_months: Optional[int] = None
    line_items: Optional[List[dict]] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None


class QuotationResponse(BaseModel):
    id: UUID
    quotation_number: str
    status: str
    supplier: Optional[SupplierResponse] = None
    total_amount: float
    currency: str
    delivery_days: Optional[int] = None
    ai_score: Optional[float] = None
    ai_recommendation: Optional[str] = None
    price_competitiveness: Optional[float] = None
    received_date: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Invoice Schemas ──────────────────────────────────────────────────────────
class InvoiceCreate(BaseModel):
    invoice_number: str
    supplier_id: UUID
    purchase_order_id: Optional[UUID] = None
    invoice_date: datetime
    due_date: Optional[datetime] = None
    subtotal: float
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    total_amount: float
    currency: str = "USD"
    line_items: Optional[List[dict]] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    paid_date: Optional[datetime] = None
    paid_amount: Optional[float] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    status: str
    supplier: Optional[SupplierResponse] = None
    total_amount: float
    paid_amount: float
    currency: str
    invoice_date: datetime
    due_date: Optional[datetime] = None
    fraud_risk_score: Optional[float] = None
    is_duplicate: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Contract Schemas ─────────────────────────────────────────────────────────
class ContractCreate(BaseModel):
    title: str
    supplier_id: UUID
    contract_type: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    contract_value: Optional[float] = None
    currency: str = "USD"
    auto_renew: bool = False
    notice_period_days: int = 30
    terms_url: Optional[str] = None


class ContractUpdate(BaseModel):
    status: Optional[str] = None
    end_date: Optional[datetime] = None
    renewal_date: Optional[datetime] = None
    notes: Optional[str] = None


class ContractResponse(BaseModel):
    id: UUID
    contract_number: str
    title: str
    status: str
    contract_type: str
    supplier: Optional[SupplierResponse] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    contract_value: Optional[float] = None
    currency: str
    auto_renew: bool
    ai_risk_score: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Inventory Schemas ────────────────────────────────────────────────────────
class InventoryCreate(BaseModel):
    item_name: str
    item_code: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None
    quantity_on_hand: float = 0.0
    reorder_point: Optional[float] = None
    reorder_quantity: Optional[float] = None
    unit_cost: Optional[float] = None
    warehouse_location: Optional[str] = None


class InventoryUpdate(BaseModel):
    quantity_on_hand: Optional[float] = None
    unit_cost: Optional[float] = None
    reorder_point: Optional[float] = None
    warehouse_location: Optional[str] = None
    status: Optional[str] = None


class InventoryResponse(BaseModel):
    id: UUID
    item_code: str
    item_name: str
    category: Optional[str] = None
    status: str
    quantity_on_hand: float
    quantity_reserved: float
    quantity_on_order: float
    reorder_point: Optional[float] = None
    unit_of_measure: Optional[str] = None
    unit_cost: Optional[float] = None
    total_value: Optional[float] = None
    warehouse_location: Optional[str] = None
    ai_demand_forecast: Optional[float] = None
    ai_reorder_suggestion: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Dashboard Schema ─────────────────────────────────────────────────────────
class DashboardKPIs(BaseModel):
    total_spend: float
    total_spend_change: float  # % change vs last period
    active_suppliers: int
    active_suppliers_change: float
    pending_approvals: int
    open_purchase_orders: int
    total_savings: float
    savings_rate: float  # percentage
    avg_po_cycle_time: float  # days
    supplier_risk_count: int  # high/critical risk suppliers
    monthly_spend: List[dict]
    department_spend: List[dict]
    top_suppliers: List[dict]
    recent_activities: List[dict]
    ai_insights: List[dict]


# ─── Notification Schemas ─────────────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: UUID
    title: str
    message: str
    notification_type: str
    is_read: bool
    read_at: Optional[datetime] = None
    action_url: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── AI Chat Schemas ──────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    suggestions: List[str] = []
    data: Optional[dict] = None
