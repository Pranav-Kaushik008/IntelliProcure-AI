"""
IntelliProcure AI – Base Model Mixin
Shared fields and behaviors for all SQLAlchemy models.
Includes audit timestamps, soft delete, and UUID primary keys.
"""

from sqlalchemy import Column, DateTime, Boolean, String, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime


class TimestampMixin:
    """Adds created_at and updated_at audit timestamps to any model."""
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=datetime.utcnow,
        nullable=False,
        comment="Record creation timestamp"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        default=datetime.utcnow,
        nullable=False,
        comment="Last update timestamp"
    )


class SoftDeleteMixin:
    """Adds soft delete capability — records are marked deleted, not removed."""
    
    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="Soft delete flag"
    )
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Soft delete timestamp"
    )


class UUIDMixin:
    """Adds UUID primary key to any model."""
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier"
    )
