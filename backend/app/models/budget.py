"""
IntelliProcure AI – Budget Data Model
Tracks department/category budget allocations, spent amounts, remaining balances, and threshold alerts.
"""

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Text, Boolean, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime

from app.database.session import Base
from app.database.base import TimestampMixin, SoftDeleteMixin


class BudgetStatus(str, enum.Enum):
    NORMAL = "normal"
    WARNING = "warning"      # >80% utilization
    CRITICAL = "critical"    # >90% utilization
    EXCEEDED = "exceeded"    # >100% utilization


class Budget(Base, TimestampMixin, SoftDeleteMixin):
    """Department and category budget allocation."""
    __tablename__ = "budgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    department_name = Column(String(200), nullable=True)
    category = Column(String(200), nullable=False, index=True)
    fiscal_year = Column(String(20), nullable=False, default="2026")

    allocated_amount = Column(Float, nullable=False, default=0.0)
    spent_amount = Column(Float, nullable=False, default=0.0)
    committed_amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), default="USD")

    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    department = relationship("Department")
