import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth, api } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000/api/v1";
const MAX_NOTIFICATIONS = 50;
const RECONNECT_DELAY_MS = 5000;

export function useWebSocketNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnect = useRef(true);

  // Fetch initial notifications from REST API
  const fetchInitialNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const res = await api.get("/notifications/");
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch {
      // Ignore initial load errors if network isn't ready
    }
  }, [isAuthenticated, user?.id]);

  const connect = useCallback(() => {
    if (!isAuthenticated || !user?.id) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Use REAL database user ID (e.g. UUID)
    const userId = String(user.id);
    const wsUrl = `${WS_BASE}/ws/notifications/${userId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "connection_established" || msg.type === "pong") return;

        const notif = {
          id: msg.id || `notif-${Date.now()}`,
          type: msg.type,
          title: msg.title,
          body: msg.body || msg.message,
          level: msg.level || "info",
          action_url: msg.action_url,
          timestamp: msg.timestamp || new Date().toISOString(),
          read: false
        };

        const toastFn =
          notif.level === "success"
            ? toast.success
            : notif.level === "warning"
            ? toast
            : notif.level === "error"
            ? toast.error
            : toast;

        toastFn(`${notif.title}: ${notif.body}`, { duration: 5000 });
        setNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
      } catch {
        // Handle json parse errors
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (shouldReconnect.current) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    shouldReconnect.current = true;
    fetchInitialNotifications();
    connect();

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      shouldReconnect.current = false;
      clearInterval(pingInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [isAuthenticated, user?.id, connect, fetchInitialNotifications]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await api.post(`/notifications/${id}/read`);
    } catch {
      // Ignore background sync errors
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.post("/notifications/mark-all-read");
    } catch {
      // Ignore background sync errors
    }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    try {
      await api.delete("/notifications/clear");
    } catch {
      // Ignore background sync errors
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    markAllRead,
    markRead,
    clearAll
  };
}
