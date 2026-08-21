import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth, api } from "../../contexts/AuthContext";
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
  MdBalance,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp
} from "react-icons/md";

const NAV_ITEMS = [
  // Main
  { path: "/dashboard", label: "Dashboard", icon: <MdDashboard />, section: "MAIN" },
  // Procurement
  { path: "/suppliers", label: "Suppliers", icon: <MdBusiness />, section: "PROCUREMENT" },
  { path: "/purchase-requests", label: "Purchase Requests", icon: <MdShoppingCart /> },
  { path: "/purchase-orders", label: "Purchase Orders", icon: <MdLocalShipping /> },
  { path: "/rfqs", label: "RFQ Management", icon: <MdRequestQuote /> },
  { path: "/quotations", label: "Quotation Compare", icon: <MdCompare /> },
  // Finance
  { path: "/invoices", label: "Invoices", icon: <MdReceipt />, section: "FINANCE" },
  { path: "/matching", label: "3-Way Matching", icon: <MdBalance /> },
  { path: "/contracts", label: "Contracts", icon: <MdGavel /> },
  { path: "/inventory", label: "Inventory", icon: <MdInventory /> },
  // Intelligence
  { path: "/analytics", label: "Analytics", icon: <MdBarChart />, section: "INTELLIGENCE" },
  { path: "/analytics/spend-forecast", label: "Spend Forecast", icon: <MdAssessment /> },
  { path: "/ai-assistant", label: "AI Copilot", icon: <MdSmartToy /> },
  { path: "/reports", label: "Reports", icon: <MdAssessment /> },
  // Governance
  { path: "/compliance", label: "Compliance", icon: <MdNotifications />, section: "GOVERNANCE" },
  { path: "/budget", label: "Budget Control", icon: <MdBarChart /> }
];

const BOTTOM_ITEMS = [
  { path: "/settings", label: "Settings", icon: <MdSettings /> },
  { path: "/profile", label: "My Profile", icon: <MdPerson /> }
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, isSupplier } = useAuth();
  const [systemCollapsed, setSystemCollapsed] = useState(false);
  let currentSection = "";

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (isSupplier) {
      return ["/dashboard", "/rfqs", "/quotations", "/purchase-orders", "/invoices"].includes(item.path);
    }
    return true;
  });

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
        {visibleNavItems.map((item) => {
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
                title={item.label}
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
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Bottom Section: Collapsible System & Profile Dock */}
      <div className="sidebar-footer">
        {/* Section Header with Collapse/Expand Toggle */}
        {!collapsed && (
          <div
            onClick={() => setSystemCollapsed(!systemCollapsed)}
            title={systemCollapsed ? "Click to expand System & Account" : "Click to collapse System & Account"}
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: systemCollapsed ? "#94A3B8" : "#64748B",
              padding: "6px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              borderRadius: 6,
              userSelect: "none",
              marginBottom: systemCollapsed ? 2 : 6,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = systemCollapsed ? "#94A3B8" : "#64748B";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>SYSTEM & ACCOUNT</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  opacity: 0.85,
                  background: systemCollapsed ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.08)",
                  color: systemCollapsed ? "#A5B4FC" : "inherit",
                  padding: "1px 6px",
                  borderRadius: 4,
                  transition: "all 0.15s ease"
                }}
              >
                {systemCollapsed ? "COLLAPSED" : "PINNED"}
              </span>
              <span style={{ fontSize: 15, display: "flex", alignItems: "center" }}>
                {systemCollapsed ? <MdKeyboardArrowDown /> : <MdKeyboardArrowUp />}
              </span>
            </div>
          </div>
        )}

        {/* Collapsible Content Area */}
        <AnimatePresence initial={false}>
          {(!systemCollapsed || collapsed) && (
            <motion.div
              key="system-content"
              initial={!collapsed ? { opacity: 0, height: 0 } : false}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              {/* Bottom Nav Items */}
              {BOTTOM_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                  title={collapsed ? item.label : undefined}
                  style={{
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: "8px 10px",
                    marginBottom: 2
                  }}
                >
                  <span className="nav-icon" style={{ fontSize: 17 }}>{item.icon}</span>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ whiteSpace: "nowrap", fontSize: 13 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              ))}

              {/* User Profile Card (Compact & Highlighted) */}
              {!collapsed && user && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    marginTop: 6
                  }}
                >
                  <div
                    className="avatar"
                    style={{
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      fontSize: 12,
                      cursor: "default",
                      background: "linear-gradient(135deg, #3B82F6, #6366F1)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4)"
                    }}
                  >
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  <div style={{ overflow: "hidden", flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user.full_name || `${user.first_name} ${user.last_name}`}
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#818CF8", textTransform: "capitalize" }}>
                      {user.role?.replace("_", " ")}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar Main Width Collapse Toggle Button */}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
            width: "100%",
            padding: "7px 10px",
            background: "transparent",
            border: "none",
            borderRadius: 6,
            color: "#64748B",
            cursor: "pointer",
            marginTop: 4,
            fontSize: 18,
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FFFFFF";
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#64748B";
            e.currentTarget.style.background = "transparent";
          }}
        >
          {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
          {!collapsed && <span style={{ fontSize: 11.5, fontWeight: 600 }}>Collapse Sidebar</span>}
        </button>
      </div>
    </motion.aside>
  );
}
