"""
IntelliProcure AI – Notifications REST API Routes
Handles notification listing, unread count, mark read, mark all read, and clear actions.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
import uuid

from app.database.session import get_db
from app.core.security import get_current_active_user
from app.models.rfq import Notification, NotificationType

router = APIRouter()


@router.get("/")
async def list_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """List recent notifications for current authenticated user."""
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()

    return [
        {
            "id": str(n.id),
            "title": n.title,
            "body": n.message,
            "level": n.notification_type.value if hasattr(n.notification_type, "value") else str(n.notification_type),
            "read": n.is_read,
            "action_url": n.action_url,
            "reference_id": n.reference_id,
            "reference_type": n.reference_type,
            "timestamp": n.created_at.isoformat() if n.created_at else datetime.utcnow().isoformat()
        }
        for n in notifications
    ]


@router.get("/unread-count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Return count of unread notifications for current user."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Mark a single notification as read."""
    try:
        notif_uuid = uuid.UUID(notification_id)
        notif = db.query(Notification).filter(
            Notification.id == notif_uuid,
            Notification.user_id == current_user.id
        ).first()
        if notif:
            notif.is_read = True
            notif.read_at = datetime.utcnow()
            db.commit()
    except (ValueError, AttributeError):
        pass

    return {"message": "Notification marked as read", "id": notification_id}


@router.post("/mark-all-read")
async def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Mark all unread notifications for current user as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update(
        {"is_read": True, "read_at": datetime.utcnow()},
        synchronize_session=False
    )
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/clear")
async def clear_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Clear all notifications for current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Notifications cleared"}
