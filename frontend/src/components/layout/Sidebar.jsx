import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import {
  MdDashboard,
  MdShoppingCart,
  MdLocalShipping,
  MdRequestQuote,
  MdCompare,
  MdInventory,
  MdReceipt,
  MdGavel,
  MdBarChart,
  MdSmartToy,
  MdAssessment,
  MdSettings,
  MdPerson,
  MdChevronLeft,
  MdChevronRight,
  MdBusiness,
  MdNotifications,
  MdBalance
} from "react-icons/md";

const NAV_ITEMS = [
  // Main
  { path: "/dashboard", label: "Dashboard", icon: <MdDashboard />, section: "MAIN" },
  // Procurement
  { path: "/suppliers", label: "Suppliers", icon: <MdBusiness />, section: "PROCUREMENT" },
  { path: "/purchase-requests", label: "Purchase Requests", icon: <MdShoppingCart />, badge: 8 },
  { path: "/purchase-orders", label: "Purchase Orders", icon: <MdLocalShipping /> },
  { path: "/rfqs", label: "RFQ Management", icon: <MdRequestQuote /> },
  { path: "/quotations", label: "Quotation Compare", icon: <MdCompare /> },
  // Finance
  { path: "/invoices", label: "Invoices", icon: <MdReceipt />, section: "FINANCE", badge: 3 },
  { path: "/matching", label: "3-Way Matching", icon: <MdBalance /> },
  { path: "/contracts", label: "Contracts", icon: <MdGavel /> },
  { path: "/inventory", label: "Inventory", icon: <MdInventory /> },
  // Intelligence
  { path: "/analytics", label: "Analytics", icon: <MdBarChart />, section: "INTELLIGENCE" },
  { path: "/analytics/spend-forecast", label: "Spend Forecast", icon: <MdAssessment /> },
  { path: "/ai-assistant", label: "AI Copilot", icon: <MdSmartToy /> },
  { path: "/reports", label: "Reports", icon: <MdAssessment /> },
  // Governance
  { path: "/compliance", label: "Compliance", icon: <MdNotifications />, section: "GOVERNANCE", badge: 2 },
  { path: "/budget", label: "Budget Control", icon: <MdBarChart /> }
];

const BOTTOM_ITEMS = [
  { path: "/settings", label: "Settings", icon: <MdSettings /> },
  { path: "/profile", label: "My Profile", icon: <MdPerson /> }
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  let currentSection = "";

  return (
    <motion.aside
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="2" fill="#60A5FA"/>
          </svg>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="sidebar-logo-text"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="sidebar-logo-title">IntelliProcure</span>
              <span className="sidebar-logo-subtitle">Enterprise AI Platform</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const showSection = item.section && item.section !== currentSection;
          if (item.section) currentSection = item.section;
          return (
            <div key={item.path}>
              {showSection && !collapsed && (
                <div className="nav-section">
                  <div className="nav-section-label">{item.section}</div>
                </div>
              )}
              {showSection && collapsed && <div style={{ height: 16 }} />}

              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                data-tooltip={collapsed ? item.label : undefined}
                style={{ justifyContent: collapsed ? "center" : "flex-start" }}
              >
                <span className="nav-icon">{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ overflow: "hidden", whiteSpace: "nowrap" }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="sidebar-footer">
        {/* Bottom Nav Items */}
        {BOTTOM_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            data-tooltip={collapsed ? item.label : undefined}
            style={{ justifyContent: collapsed ? "center" : "flex-start" }}
          >
            <span className="nav-icon">{item.icon}</span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}

        {/* User Profile Mini */}
        {!collapsed && user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 10px 6px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              marginTop: 8
            }}
          >
            <div className="avatar" style={{ cursor: "default", background: "linear-gradient(135deg, #3B82F6, #6366F1)", color: "#FFFFFF", fontWeight: 700 }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "capitalize" }}>
                {user.role?.replace("_", " ")}
              </div>
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
            width: "100%",
            padding: "9px 10px",
            background: "transparent",
            border: "none",
            borderRadius: 8,
            color: "#94A3B8",
            cursor: "pointer",
            marginTop: 6,
            fontSize: 20,
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FFFFFF";
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94A3B8";
            e.currentTarget.style.background = "transparent";
          }}
          data-tooltip={collapsed ? "Expand Sidebar" : undefined}
        >
          {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
          {!collapsed && <span style={{ fontSize: 12, fontWeight: 600 }}>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
