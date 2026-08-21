"""
IntelliProcure AI – Purchase Order Item Model
Line items for a Purchase Order.
"""

from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.database.session import Base
from app.database.base import TimestampMixin


class PurchaseOrderItem(Base, TimestampMixin):
    """Line items within a Purchase Order."""
    __tablename__ = "purchase_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False)

    item_code = Column(String(100), nullable=True)
    item_name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    unit_of_measure = Column(String(50), nullable=True)
    quantity_ordered = Column(Float, nullable=False)
    quantity_received = Column(Float, default=0.0)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.0)
    discount_rate = Column(Float, default=0.0)
    specifications = Column(Text, nullable=True)
    inventory_item_id = Column(UUID(as_uuid=True), nullable=True, comment="Link to inventory")

    purchase_order = relationship("PurchaseOrder", back_populates="items")

    def __repr__(self) -> str:
        return f"<POItem {self.item_name} x{self.quantity_ordered}>"
