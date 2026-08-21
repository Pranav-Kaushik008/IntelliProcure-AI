"""
IntelliProcure AI – User Model
Stores user accounts, roles, and authentication credentials.
Supports RBAC with roles: admin, manager, buyer, viewer, supplier.
"""

from sqlalchemy import Column, String, Boolean, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.database.session import Base
from app.database.base import TimestampMixin, SoftDeleteMixin


class UserRole(str, enum.Enum):
    """Predefined enterprise roles for role-based access control."""
    ADMIN = "admin"
    PROCUREMENT_MANAGER = "procurement_manager"
    MANAGER = "manager"
    BUYER = "buyer"
    FINANCE = "finance"
    AUDITOR = "auditor"
    VIEWER = "viewer"
    SUPPLIER = "supplier"


class User(Base, TimestampMixin, SoftDeleteMixin):
    """
    User entity — stores authentication credentials and profile information.
    
    Relationships:
        - purchase_requests: PRs created by this user
        - purchase_orders: POs managed by this user
        - notifications: Notifications sent to this user
    """
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique user identifier"
    )
    # ─── Authentication ───────────────────────────────────────────────────────
    email = Column(String(255), unique=True, nullable=False, index=True, comment="User email (login)")
    hashed_password = Column(String(255), nullable=False, comment="Bcrypt hashed password")
    
    # ─── Profile ──────────────────────────────────────────────────────────────
    first_name = Column(String(100), nullable=False, comment="First name")
    last_name = Column(String(100), nullable=False, comment="Last name")
    phone = Column(String(20), nullable=True, comment="Phone number")
    avatar_url = Column(String(500), nullable=True, comment="Profile picture URL")
    job_title = Column(String(200), nullable=True, comment="Job title / designation")
    department = Column(String(200), nullable=True, comment="Department name")
    
    # ─── Authorization ────────────────────────────────────────────────────────
    role = Column(
        Enum(UserRole),
        default=UserRole.BUYER,
        nullable=False,
        comment="RBAC role"
    )
    is_active = Column(Boolean, default=True, nullable=False, comment="Account active status")
    is_verified = Column(Boolean, default=False, comment="Email verification status")
    
    # ─── Security ─────────────────────────────────────────────────────────────
    last_login = Column(DateTime(timezone=True), nullable=True, comment="Last login timestamp")
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    
    # ─── Preferences ──────────────────────────────────────────────────────────
    theme = Column(String(10), default="light", comment="UI theme preference")
    language = Column(String(10), default="en", comment="Language preference")
    timezone = Column(String(50), default="UTC", comment="Timezone preference")

    # ─── Relationships ────────────────────────────────────────────────────────
    notifications = relationship("Notification", back_populates="user", lazy="dynamic")
    purchase_requests = relationship("PurchaseRequest", foreign_keys="[PurchaseRequest.requester_id]", back_populates="requester", lazy="dynamic")
    purchase_orders = relationship("PurchaseOrder", foreign_keys="[PurchaseOrder.created_by]", back_populates="created_by_user", lazy="dynamic")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="dynamic")

    @property
    def full_name(self) -> str:
        """Returns the full name of the user."""
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.role}]>"
