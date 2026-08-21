"""
IntelliProcure AI – Notification Service
Handles persistent DB storage of notifications and real-time WebSocket push broadcasting.
Supported notification event types:
- pr_approved: Purchase Request approved
- rfq_received: RFQ or Quotation received / created
- po_approved: Purchase Order approved / issued
- invoice_mismatch: 3-Way Match mismatch or partial match detected
- low_inventory: Stock quantity below reorder point
- contract_expiry: Contract expiry approaching
- risk_alert: AI Fraud / Supplier risk alert
"""

import uuid
from datetime import datetime
from sqlalchemy.orm import Session
import logging

from app.models.rfq import Notification, NotificationType
from app.api.v1.websocket_notifications import push_user_notification, push_broadcast_notification

logger = logging.getLogger("intelliprocure")


def create_notification(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
    action_url: str = None,
    reference_id: str = None,
    reference_type: str = None
) -> dict:
    """Create a persistent Notification row in DB and push to the user via WebSocket."""
    try:
        notif_enum = NotificationType.INFO
        if notification_type in [e.value for e in NotificationType]:
            notif_enum = NotificationType(notification_type)

        notif = Notification(
            id=uuid.uuid4(),
            user_id=uuid.UUID(str(user_id)),
            title=title,
            message=message,
            notification_type=notif_enum,
            is_read=False,
            action_url=action_url,
            reference_id=reference_id,
            reference_type=reference_type,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        payload = {
            "id": str(notif.id),
            "type": notification_type,
            "title": title,
            "body": message,
            "level": notification_type if notification_type in ["success", "warning", "error", "info"] else "info",
            "action_url": action_url,
            "reference_id": reference_id,
            "reference_type": reference_type,
            "read": False,
            "timestamp": notif.created_at.isoformat()
        }

        # Live push over WebSocket
        push_user_notification(str(user_id), payload)
        return payload
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create/send notification: {e}")
        return None


def broadcast_notification(
    db: Session,
    title: str,
    message: str,
    notification_type: str = "info",
    action_url: str = None,
    reference_id: str = None,
    reference_type: str = None
) -> dict:
    """Broadcast a live WebSocket event to ALL connected users and store in DB for all active users."""
    try:
        from app.models.user import User
        active_users = db.query(User).filter(User.is_deleted == False).all()
        
        for u in active_users:
            try:
                notif = Notification(
                    id=uuid.uuid4(),
                    user_id=u.id,
                    title=title,
                    message=message,
                    notification_type=NotificationType.INFO if notification_type not in [e.value for e in NotificationType] else NotificationType(notification_type),
                    is_read=False,
                    action_url=action_url,
                    reference_id=reference_id,
                    reference_type=reference_type,
                    created_at=datetime.utcnow()
                )
                db.add(notif)
            except Exception:
                pass
        db.commit()

        payload = {
            "id": f"notif-bcast-{uuid.uuid4()}",
            "type": notification_type,
            "title": title,
            "body": message,
            "level": notification_type if notification_type in ["success", "warning", "error", "info"] else "info",
            "action_url": action_url,
            "reference_id": reference_id,
            "reference_type": reference_type,
            "read": False,
            "timestamp": datetime.utcnow().isoformat()
        }
        push_broadcast_notification(payload)
        return payload
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to broadcast notification: {e}")
        return None
