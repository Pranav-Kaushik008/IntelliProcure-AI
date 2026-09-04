import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  MdSearch,
  MdNotifications,
  MdDarkMode,
  MdLightMode,
  MdPerson,
  MdSettings,
  MdLogout,
  MdKeyboardArrowDown
} from "react-icons/md";
import { useWebSocketNotifications } from "../../hooks/useWebSocketNotifications";
const ROUTE_LABELS = {
  dashboard: "Dashboard",
  suppliers: "Suppliers",
  "purchase-requests": "Purchase Requests",
  "purchase-orders": "Purchase Orders",
  rfqs: "RFQ Management",
  quotations: "Quotation Comparison",
  inventory: "Inventory",
  invoices: "Invoices",
  matching: "3-Way Matching",
  contracts: "Contracts",
  analytics: "Analytics",
  "ai-assistant": "AI Copilot",
  reports: "Reports",
  settings: "Settings",
  profile: "My Profile"
};
export default function TopNav({ collapsed }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllRead, markRead } = useWebSocketNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const profileRef = useRef(null);
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const searchInputRef = useRef(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" && searchValue.trim()) {
      const q = searchValue.toLowerCase();
      if (q.includes("sup") || q.includes("vendor")) navigate("/suppliers");
      else if (q.includes("po") || q.includes("order")) navigate("/purchase-orders");
      else if (q.includes("pr") || q.includes("request")) navigate("/purchase-requests");
      else if (q.includes("rfq") || q.includes("quote")) navigate("/rfqs");
      else if (q.includes("inv") || q.includes("bill")) navigate("/invoices");
      else if (q.includes("match") || q.includes("3-way")) navigate("/matching");
      else if (q.includes("contract")) navigate("/contracts");
      else if (q.includes("inventory") || q.includes("stock")) navigate("/inventory");
      else if (q.includes("ai") || q.includes("copilot")) navigate("/ai-assistant");
      else if (q.includes("report")) navigate("/reports");
      else if (q.includes("budget")) navigate("/budget");
      else if (q.includes("compliance") || q.includes("audit")) navigate("/compliance");
      else navigate(`/suppliers?search=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue("");
    }
  };
  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentPage = ROUTE_LABELS[pathParts[0]] || "Dashboard";
  return <header className={`topnav ${collapsed ? "collapsed" : ""}`}>
      {
    /* Left — Breadcrumb */
  }
      <div className="topnav-left">
        <nav className="breadcrumb">
          <span className="breadcrumb-item" style={{ cursor: "pointer" }} onClick={() => navigate("/dashboard")}>Home</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-item active">{currentPage}</span>
        </nav>

        {
    /* Global Search */
  }
        <div className="search-bar">
          <MdSearch style={{ color: "var(--text-muted)", fontSize: 18, flexShrink: 0 }} />
          <input
    ref={searchInputRef}
    className="search-input"
    type="text"
    placeholder="Search suppliers, POs, invoices... (Press Enter)"
    value={searchValue}
    onChange={(e) => setSearchValue(e.target.value)}
    onKeyDown={handleSearchSubmit}
  />
          <kbd style={{
    fontSize: 10,
    fontWeight: 700,
    background: "var(--border-subtle)",
    border: "1px solid var(--border-color)",
    borderRadius: 5,
    padding: "2px 6px",
    color: "var(--text-muted)",
    flexShrink: 0
  }}>Ctrl+K</kbd>
        </div>
      </div>

      {
    /* Right — Actions */
  }
      <div className="topnav-right">
        {
    /* Theme Toggle */
  }
        <button
    className="icon-btn"
    onClick={toggleTheme}
    data-tooltip={theme === "light" ? "Dark Mode" : "Light Mode"}
    style={{ fontSize: 18 }}
  >
          {theme === "light" ? <MdDarkMode /> : <MdLightMode />}
        </button>

        {
    /* Notifications */
  }
        <div style={{ position: "relative" }}>
          <button
    className="icon-btn"
    data-tooltip="Live Notifications"
    style={{ fontSize: 20, position: "relative" }}
    onClick={() => setNotifOpen(!notifOpen)}
  >
            <MdNotifications />
            {unreadCount > 0 && <span className="notification-dot" style={{ background: "#EF4444" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>}
          </button>

          <AnimatePresence>
            {notifOpen && <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.95 }}
    style={{
      position: "absolute",
      right: 0,
      top: "120%",
      width: 360,
      background: "var(--bg-card)",
      border: "1px solid var(--border-color)",
      borderRadius: "12px",
      boxShadow: "var(--shadow-xl)",
      zIndex: 1e3,
      overflow: "hidden"
    }}
  >
                <div style={{
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                    Notifications {unreadCount > 0 && `(${unreadCount} new)`}
                  </div>
                  {unreadCount > 0 && <button
    onClick={markAllRead}
    style={{
      background: "none",
      border: "none",
      color: "var(--primary)",
      fontSize: 12,
      cursor: "pointer",
      fontWeight: 600
    }}
  >
                      Mark all read
                    </button>}
                </div>

                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.length === 0 ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      No notifications right now.
                    </div> : notifications.map((n) => <div
    key={n.id}
    onClick={() => markRead(n.id)}
    style={{
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-color)",
      background: n.read ? "transparent" : "rgba(99,102,241,0.06)",
      cursor: "pointer"
    }}
  >
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                          {n.body}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>)}
                </div>
              </motion.div>}
          </AnimatePresence>
        </div>

        {
    /* Profile Menu */
  }
        <div className="dropdown" ref={profileRef}>
          <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      padding: "6px 10px",
      borderRadius: "var(--radius-sm)",
      transition: "background var(--transition-fast)"
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--border-subtle)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    onClick={() => setProfileOpen(!profileOpen)}
  >
            <div className="avatar">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
                {user?.first_name} {user?.last_name}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>
                {user?.role?.replace("_", " ")}
              </span>
            </div>
            <MdKeyboardArrowDown
    style={{
      color: "var(--text-muted)",
      fontSize: 18,
      transform: profileOpen ? "rotate(180deg)" : "rotate(0)",
      transition: "transform 0.2s"
    }}
  />
          </div>

          <AnimatePresence>
            {profileOpen && <motion.div
    className="dropdown-menu"
    initial={{ opacity: 0, y: -8, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8, scale: 0.97 }}
    transition={{ duration: 0.15 }}
  >
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-color)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                    {user?.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{user?.email}</div>
                </div>

                <div
    className="dropdown-item"
    onClick={() => {
      navigate("/profile");
      setProfileOpen(false);
    }}
  >
                  <MdPerson fontSize={18} /> My Profile
                </div>
                <div
    className="dropdown-item"
    onClick={() => {
      navigate("/settings");
      setProfileOpen(false);
    }}
  >
                  <MdSettings fontSize={18} /> Settings
                </div>

                <div className="dropdown-divider" />

                <div
    className="dropdown-item"
    style={{ color: "var(--danger)" }}
    onClick={() => {
      logout();
      setProfileOpen(false);
    }}
  >
                  <MdLogout fontSize={18} /> Sign Out
                </div>
              </motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </header>;
}
