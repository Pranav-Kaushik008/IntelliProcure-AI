"""
IntelliProcure AI – WebSocket Notifications Manager
Real-time push notifications for procurement events via WebSocket.
Canonical Endpoint: /api/v1/ws/notifications/{user_id}
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio
from datetime import datetime
import logging

logger = logging.getLogger("intelliprocure")

router = APIRouter(prefix="/ws", tags=["WebSocket"])


class ConnectionManager:
    """Manages active WebSocket connections per user ID."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"⚡ WebSocket connected: user={user_id} (active total: {self.get_connected_count()})")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"🔌 WebSocket disconnected: user={user_id} (active total: {self.get_connected_count()})")

    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to all active WebSocket connections of a specific user."""
        user_id_str = str(user_id)
        if user_id_str in self.active_connections:
            disconnected = []
            for ws in self.active_connections[user_id_str]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                self.disconnect(ws, user_id_str)

    async def broadcast(self, message: dict):
        """Broadcast a message to ALL connected users across the platform."""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)

    def get_connected_count(self) -> int:
        return sum(len(conns) for conns in self.active_connections.values())


# Global connection manager (singleton)
manager = ConnectionManager()


@router.websocket("/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    """
    Canonical WebSocket endpoint for real-time procurement notifications.
    Route: /api/v1/ws/notifications/{user_id}
    """
    await manager.connect(websocket, user_id)
    try:
        # 1. Connection established confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "Connected to IntelliProcure AI real-time notification engine",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
        }))

        # 2. Main socket loop listening for client messages (ping, pong, client actions)
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                if msg_type == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat(),
                        "connected_clients": manager.get_connected_count(),
                    }))
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.warning(f"WebSocket connection error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)


@router.get("/connections/status")
async def connection_status():
    """Returns status of active WebSocket connections for admin monitoring."""
    return {
        "active_connections": manager.get_connected_count(),
        "connected_users": list(manager.active_connections.keys()),
        "timestamp": datetime.utcnow().isoformat(),
    }


def push_user_notification(user_id: str, payload: dict):
    """Synchronous helper to push event notification to a user via WebSocket."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.send_to_user(str(user_id), payload))
    except RuntimeError:
        asyncio.run(manager.send_to_user(str(user_id), payload))


def push_broadcast_notification(payload: dict):
    """Synchronous helper to broadcast event notification to all active WebSocket users."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(payload))
    except RuntimeError:
        asyncio.run(manager.broadcast(payload))
