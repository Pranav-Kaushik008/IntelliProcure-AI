"""IntelliProcure AI – Audit Trail API Routes"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database.session import get_db
from app.core.security import require_internal_user
from app.models.audit_log import AuditLog

router = APIRouter()


from sqlalchemy.orm import joinedload

@router.get("/")
async def list_audit_logs(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """Retrieve immutable system audit trail with filtering and pagination. Internal staff only."""
    query = db.query(AuditLog).options(joinedload(AuditLog.user))

    if action and isinstance(action, str):
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type and isinstance(entity_type, str):
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        try:
            u_uuid = UUID(str(user_id))
            query = query.filter(AuditLog.user_id == u_uuid)
        except ValueError:
            pass

    offset_val = skip if isinstance(skip, int) else 0
    limit_val = limit if isinstance(limit, int) else 100
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset_val).limit(limit_val).all()

    return [
        {
            "id": str(log.id),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_email": log.user.email if log.user else "system@intelliprocure.ai",
            "ip_address": log.ip_address or "127.0.0.1",
            "changes": log.changes,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]

