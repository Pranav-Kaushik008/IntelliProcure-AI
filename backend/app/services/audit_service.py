"""
IntelliProcure AI – Audit Trail Service
Records immutable audit logs for compliance & security governance.
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from uuid import UUID

from app.models.audit_log import AuditLog


class AuditService:
    """Central audit trail recording service."""

    @staticmethod
    def log_event(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Record a new compliance audit event in the database.
        """
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
