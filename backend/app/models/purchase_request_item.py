"""
IntelliProcure AI – Purchase Request Item Model
Line-item details for each purchase request.
"""

from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.database.session import Base
from app.database.base import TimestampMixin


class PurchaseRequestItem(Base, TimestampMixin):
    """Line items within a Purchase Request."""
    __tablename__ = "purchase_request_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_request_id = Column(UUID(as_uuid=True), ForeignKey("purchase_requests.id"), nullable=False)
    
    item_code = Column(String(100), nullable=True, comment="Internal item/SKU code")
    item_name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(200), nullable=True)
    unit_of_measure = Column(String(50), nullable=True, comment="UOM: each, kg, liter, etc.")
    quantity = Column(Float, nullable=False, comment="Requested quantity")
    unit_price = Column(Float, nullable=True, comment="Estimated unit price")
    total_price = Column(Float, nullable=True, comment="quantity * unit_price")
    preferred_supplier = Column(String(300), nullable=True)
    specifications = Column(Text, nullable=True)
    
    # AI price prediction
    ai_predicted_price = Column(Float, nullable=True)

    # Relationships
    purchase_request = relationship("PurchaseRequest", back_populates="items")

    def __repr__(self) -> str:
        return f"<PRItem {self.item_name} x{self.quantity}>"
