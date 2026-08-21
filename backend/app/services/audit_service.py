from datetime import datetime
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from uuid import UUID
import logging

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


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
        user_agent: Optional[str] = None,
        autocommit: bool = True
    ) -> Optional[AuditLog]:
        """
        Record a new compliance audit event in the database with exact UTC timestamp.
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id else None,
                changes=changes,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(log_entry)
            if autocommit:
                db.commit()
                db.refresh(log_entry)
            return log_entry
        except Exception as e:
            logger.error(f"Failed to log audit event {action}: {e}")
            return None
