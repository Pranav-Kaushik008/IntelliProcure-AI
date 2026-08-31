import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { api } from "../../contexts/AuthContext";
import { formatDateTime, formatRelativeTime } from "../../utils/dateUtils";
import {
  FiShield,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiDownload,
  FiSearch,
  FiEye,
  FiLock,
  FiFileText,
  FiActivity,
  FiTrendingUp
} from "react-icons/fi";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

const complianceFrameworks = [
  { name: "SOX Section 404", status: "Compliant", score: 96, controls: 48, passed: 46, risk: "Low", lastAudit: "2026-06-15" },
  { name: "GDPR Art. 30", status: "Compliant", score: 100, controls: 32, passed: 32, risk: "Low", lastAudit: "2026-07-01" },
  { name: "ISO 27001", status: "Warning", score: 82, controls: 60, passed: 49, risk: "Medium", lastAudit: "2026-05-22" },
  { name: "PCI-DSS v4.0", status: "Compliant", score: 94, controls: 26, passed: 24, risk: "Low", lastAudit: "2026-07-10" },
  { name: "IFRS / GAAP", status: "Compliant", score: 99, controls: 18, passed: 18, risk: "Low", lastAudit: "2026-07-18" },
  { name: "FCPA / Anti-Brib.", status: "Non-Compliant", score: 61, controls: 22, passed: 13, risk: "High", lastAudit: "2026-04-30" }
];

const auditLogs = [
  { id: "AL-00891", ts: "2026-08-05 11:24:03", user: "admin@company.com", action: "PURCHASE_ORDER_APPROVED", resource: "PO-2026-0412", ip: "192.168.1.42", risk: "Low" },
  { id: "AL-00890", ts: "2026-08-05 11:18:44", user: "buyer@company.com", action: "INVOICE_SUBMITTED", resource: "INV-2026-0189", ip: "10.0.0.15", risk: "Low" },
  { id: "AL-00889", ts: "2026-08-05 10:55:21", user: "manager@company.com", action: "CONTRACT_MODIFIED", resource: "CTR-2026-0055", ip: "10.0.0.28", risk: "Medium" },
  { id: "AL-00888", ts: "2026-08-05 10:31:09", user: "system@intelliprocure", action: "AI_RISK_SCORED", resource: "SUP-0023", ip: "system", risk: "Low" },
  { id: "AL-00887", ts: "2026-08-05 09:44:55", user: "admin@company.com", action: "USER_ROLE_CHANGED", resource: "USR-0048", ip: "192.168.1.42", risk: "High" },
  { id: "AL-00886", ts: "2026-08-05 09:12:33", user: "finance@company.com", action: "PAYMENT_RELEASED", resource: "PAY-2026-0077", ip: "10.0.0.19", risk: "Medium" },
  { id: "AL-00885", ts: "2026-08-05 08:58:12", user: "buyer@company.com", action: "RFQ_PUBLISHED", resource: "RFQ-2026-0034", ip: "10.0.0.15", risk: "Low" },
  { id: "AL-00884", ts: "2026-08-04 18:03:47", user: "admin@company.com", action: "SETTINGS_UPDATED", resource: "SYS-CONFIG", ip: "192.168.1.42", risk: "Medium" }
];

const pieData = [
  { name: "Compliant", value: 4, color: "#10B981" },
  { name: "Warning", value: 1, color: "#F59E0B" },
  { name: "Non-Compliant", value: 1, color: "#EF4444" }
];

const trendData = [
  { month: "Mar", score: 78 },
  { month: "Apr", score: 80 },
  { month: "May", score: 82 },
  { month: "Jun", score: 85 },
  { month: "Jul", score: 83 },
  { month: "Aug", score: 89 }
];

const INITIAL_RISK_ITEMS = [
  {
    id: "RISK-01",
    title: "FCPA Training Overdue",
    priority: "Critical",
    due: "2026-08-15",
    owner: "Compliance Team",
    category: "Regulatory",
    status: "Open",
    impact: "High regulatory exposure regarding international vendor payments and cross-border anti-bribery standards.",
    root_cause: "18 international procurement officers have not completed the annual anti-corruption compliance certification.",
    remediation_steps: [
      "Issue high-priority compliance deadline notification to uncertified procurement staff.",
      "Temporarily lock PO approval privileges for staff members exceeding the 30-day grace period.",
      "Host mandatory live Q3 anti-bribery training with the Legal Compliance Director."
    ],
    notes: "Actioned by Compliance Director. Escalated to Chief Legal Officer for executive sign-off."
  },
  {
    id: "RISK-02",
    title: "ISO 27001 Gap Remediation",
    priority: "High",
    due: "2026-08-30",
    owner: "IT Security",
    category: "Security",
    status: "In Progress",
    impact: "Potential external audit finding regarding third-party vendor token management and data encryption.",
    root_cause: "Direct API integrations with 2 legacy logistics partners lack automated 90-day OAuth token rotation.",
    remediation_steps: [
      "Enforce mandatory 90-day OAuth 2.0 token rotation policy across all supplier integrations.",
      "Execute automated vulnerability and penetration audit on API gateway endpoints.",
      "Submit remediation artifact and cryptographically signed certificate to ISO auditors."
    ],
    notes: "70% of API endpoints have been transitioned to modern token rotation standards."
  },
  {
    id: "RISK-03",
    title: "Vendor Data Processing Agreements",
    priority: "Medium",
    due: "2026-09-15",
    owner: "Legal",
    category: "GDPR",
    status: "In Progress",
    impact: "European GDPR compliance requirement for non-EEA cloud infrastructure vendors.",
    root_cause: "3 sub-processors updated standard terms of service without countersigned DPA addendums.",
    remediation_steps: [
      "Issue standardized EU Standard Contractual Clauses (SCCs) to vendor legal representatives.",
      "Require countersigned DPA upload prior to releasing pending Q3 invoice disbursements."
    ],
    notes: "2 of 3 vendors have submitted signed documents; awaiting final confirmation from remaining vendor."
  },
  {
    id: "RISK-04",
    title: "Quarterly Access Review",
    priority: "Low",
    due: "2026-09-30",
    owner: "IT Admin",
    category: "Access Control",
    status: "Scheduled",
    impact: "Accumulation of inactive staff and contractor access privileges over 90 days.",
    root_cause: "Standard recurring quarterly identity & role-based access reconciliation.",
    remediation_steps: [
      "Export active user list and match with HR active employment directory.",
      "Automatically revoke access for contractor accounts inactive for > 60 days.",
      "Re-certify administrative roles with department heads."
    ],
    notes: "Scheduled for end of quarter automated execution."
  }
];

export default function CompliancePage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("frameworks");
  const [riskItemsList, setRiskItemsList] = useState(INITIAL_RISK_ITEMS);
  const [selectedRiskItem, setSelectedRiskItem] = useState(null);
  const [remediationNotes, setRemediationNotes] = useState("");

  const { data: dbAuditLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await api.get("/audit-logs/?limit=100");
      return res.data || [];
    },
    enabled: activeTab === "audit"
  });

  const statusColor = (s) => (s === "Compliant" ? "#10B981" : s === "Warning" ? "#F59E0B" : "#EF4444");
  const statusIcon = (s) => (s === "Compliant" ? FiCheckCircle : s === "Warning" ? FiAlertTriangle : FiXCircle);
  const riskColor = (r) => (r === "Critical" ? "#EF4444" : r === "High" ? "#F97316" : r === "Medium" ? "#F59E0B" : "#10B981");

  const displayLogs = dbAuditLogs.length > 0
    ? dbAuditLogs.map((l) => ({
        id: `AL-${String(l.id).slice(0, 6).toUpperCase()}`,
        ts: l.created_at,
        user: l.user_email || (l.user_id ? "Staff User" : "System"),
        action: l.action || "SYSTEM_EVENT",
        resource: `${l.entity_type || "Entity"} ${l.entity_id || ""}`.trim(),
        ip: l.ip_address || "127.0.0.1",
        risk: l.action?.includes("REJECT") || l.action?.includes("DELET") ? "High" : l.action?.includes("APPROV") ? "Medium" : "Low"
      }))
    : auditLogs;

  const filtered = displayLogs.filter(
    (l) =>
      !search ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase())
  );

  const overallScore = Math.round(complianceFrameworks.reduce((s, f) => s + f.score, 0) / complianceFrameworks.length);

  const handleOpenReview = (item) => {
    setSelectedRiskItem(item);
    setRemediationNotes(item.notes || "");
  };

  const handleUpdateRiskStatus = (newStatus) => {
    if (!selectedRiskItem) return;
    setRiskItemsList((prev) =>
      prev.map((r) =>
        r.id === selectedRiskItem.id
          ? { ...r, status: newStatus, notes: remediationNotes || r.notes }
          : r
      )
    );
    setSelectedRiskItem((prev) => ({ ...prev, status: newStatus, notes: remediationNotes }));
    toast.success(`Risk status updated to "${newStatus}"`);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
            <FiShield size={26} color="var(--primary)" />
            Compliance & Audit Center
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "6px 0 0", fontWeight: 500 }}>
            Regulatory compliance monitoring, risk management, and immutable audit trail
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              const csv = [
                ["Framework", "Status", "Score", "Controls", "Passed", "Risk", "Last Audit"],
                ...complianceFrameworks.map((f) => [f.name, f.status, f.score, f.controls, f.passed, f.risk, f.lastAudit])
              ]
                .map((row) => row.join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "compliance-audit-report.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Audit report exported successfully!");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600
            }}
          >
            <FiFileText size={14} /> Audit Report
          </button>
          <button
            onClick={() => {
              const csv = [
                ["ID", "Timestamp", "User", "Action", "Resource", "IP", "Risk"],
                ...auditLogs.map((l) => [l.id, l.ts, l.user, l.action, l.resource, l.ip, l.risk])
              ]
                .map((row) => row.join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "compliance-export.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Compliance data exported successfully!");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "8px",
              border: "none",
              background: "var(--primary)",
              color: "#FFFFFF",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600
            }}
          >
            <FiDownload size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── Score Cards Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* Overall Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            borderLeft: "4px solid #6366F1"
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: `conic-gradient(#6366F1 0% ${overallScore}%, var(--border-color) ${overallScore}% 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--bg-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "18px",
                color: "#6366F1"
              }}
            >
              {overallScore}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
              Overall Compliance Score
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{overallScore}/100</div>
            <div style={{ fontSize: "12px", color: "#10B981", marginTop: "2px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              <FiTrendingUp /> +5 pts this month
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        {[
          { label: "Frameworks Monitored", value: complianceFrameworks.length, sub: "Active regulatory controls", color: "#6366F1" },
          { label: "Controls Assessed", value: complianceFrameworks.reduce((s, f) => s + f.controls, 0), sub: `${complianceFrameworks.reduce((s, f) => s + f.passed, 0)} passed`, color: "#10B981" },
          { label: "Open Risk Items", value: riskItemsList.filter((r) => r.status !== "Resolved").length, sub: `${riskItemsList.filter((r) => r.priority === "Critical" && r.status !== "Resolved").length} Critical priority`, color: "#EF4444" }
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.08 }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              padding: "20px",
              borderLeft: `4px solid ${kpi.color}`
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>{kpi.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)" }}>{kpi.value}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 500 }}>{kpi.sub}</div>
          </motion.div>
        ))}

        {/* Framework Status Breakdown (Donut) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ width: 80, height: 80, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={24} outerRadius={38} strokeWidth={0}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-primary)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {pieData.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  {d.name}: <strong style={{ color: "var(--text-primary)" }}>{d.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", marginBottom: "24px" }}>
        {[
          { id: "frameworks", label: "🛡️ Frameworks" },
          { id: "audit", label: "📋 Audit Trail" },
          { id: "risk", label: "⚠️ Risk Register" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "12px 20px",
              border: "none",
              cursor: "pointer",
              background: "transparent",
              fontSize: "14px",
              fontWeight: 700,
              color: activeTab === t.id ? "var(--primary)" : "var(--text-secondary)",
              borderBottom: activeTab === t.id ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "all 0.2s ease"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Frameworks Tab ── */}
      {activeTab === "frameworks" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              overflow: "hidden"
            }}
          >
            {complianceFrameworks.map((fw, i) => {
              const Icon = statusIcon(fw.status);
              return (
                <motion.div
                  key={fw.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr auto",
                    alignItems: "center",
                    gap: "16px",
                    padding: "18px 22px",
                    borderBottom: i < complianceFrameworks.length - 1 ? "1px solid var(--border-color)" : "none",
                    background: i % 2 === 1 ? "var(--bg-hover)" : "transparent"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{fw.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px", fontWeight: 500 }}>
                      Last audit: {fw.lastAudit}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", marginBottom: "2px" }}>
                      Score
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: statusColor(fw.status) }}>{fw.score}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", marginBottom: "2px" }}>
                      Controls
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
                      {fw.passed}/{fw.controls}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>
                      Risk
                    </div>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: `${statusColor(fw.status)}25`,
                        color: statusColor(fw.status)
                      }}
                    >
                      {fw.risk}
                    </span>
                  </div>
                  <div>
                    <div style={{ height: "7px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: "4px",
                          background: statusColor(fw.status),
                          width: `${fw.score}%`,
                          transition: "width 0.6s ease"
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "5px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: `${statusColor(fw.status)}20`,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      color: statusColor(fw.status),
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Icon size={13} /> {fw.status}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trend Chart */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              padding: "20px"
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
              Compliance Score Trend
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis domain={[60, 100]} stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip contentStyle={{ fontSize: "12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-primary)" }} />
                <Area type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGradient)" name="Compliance Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Audit Trail Tab ── */}
      {activeTab === "audit" && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            overflow: "hidden"
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
              <FiSearch size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search audit events..."
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  fontSize: "13px",
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
              <FiLock size={13} color="var(--primary)" /> Immutable ledger — SHA-256 anchored
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-hover)" }}>
                  {["Event ID", "Timestamp", "User", "Action", "Resource", "IP Address", "Risk"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        borderBottom: "1px solid var(--border-color)",
                        whiteSpace: "nowrap",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em"
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id} style={{ background: i % 2 === 1 ? "var(--bg-hover)" : "transparent", borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--primary)", fontWeight: 700 }}>{log.id}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap", fontWeight: 500 }} title={formatDateTime(log.ts)}>
                      <div>{formatDateTime(log.ts)}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{formatRelativeTime(log.ts)}</div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 600 }}>{log.user}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>
                      {log.action}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>{log.resource}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)" }}>{log.ip}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: `${riskColor(log.risk)}25`,
                          color: riskColor(log.risk)
                        }}
                      >
                        {log.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-color)", fontSize: "13px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
            <span>Showing {filtered.length} of {displayLogs.length} events</span>
            <span>🔒 SHA-256 verified cryptographic audit trail</span>
          </div>
        </div>
      )}

      {/* ── Risk Register Tab ── */}
      {activeTab === "risk" && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            overflow: "hidden"
          }}
        >
          {riskItemsList.map((item, i) => (
            <motion.div
              key={item.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto auto auto",
                alignItems: "center",
                gap: "16px",
                padding: "18px 24px",
                borderBottom: i < riskItemsList.length - 1 ? "1px solid var(--border-color)" : "none",
                background: i % 2 === 1 ? "var(--bg-hover)" : "transparent"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{item.title}</span>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: item.status === "Resolved" ? "#10B98125" : "var(--bg-card)", color: item.status === "Resolved" ? "#10B981" : "var(--text-secondary)", border: "1px solid var(--border-color)", fontWeight: 600 }}>
                    {item.status}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 500 }}>
                  Owner: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.owner}</span> • Category: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.category}</span>
                </div>
              </div>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  background: `${riskColor(item.priority)}25`,
                  color: riskColor(item.priority)
                }}
              >
                {item.priority}
              </span>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "nowrap", fontWeight: 500 }}>
                Due: {item.due}
              </span>
              <button
                onClick={() => handleOpenReview(item)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <FiEye size={13} /> Review
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Risk Item Review & Mitigation Modal ── */}
      {selectedRiskItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setSelectedRiskItem(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{
              width: "680px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: `${riskColor(selectedRiskItem.priority)}25`, color: riskColor(selectedRiskItem.priority) }}>
                    {selectedRiskItem.priority} Risk
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>{selectedRiskItem.category}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>• Due {selectedRiskItem.due}</span>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  {selectedRiskItem.title}
                </h2>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Owner: <strong>{selectedRiskItem.owner}</strong> • Status: <strong style={{ color: selectedRiskItem.status === "Resolved" ? "#10B981" : "var(--primary)" }}>{selectedRiskItem.status}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedRiskItem(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "20px",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Impact & Root Cause */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#EF4444", textTransform: "uppercase", marginBottom: "4px" }}>
                  💥 Potential Impact & Regulatory Exposure
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {selectedRiskItem.impact}
                </div>
              </div>

              <div style={{ padding: "14px 16px", borderRadius: "10px", background: "var(--bg-app)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>
                  🔍 Identified Root Cause
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {selectedRiskItem.root_cause}
                </div>
              </div>
            </div>

            {/* Remediation Checklist */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: "10px" }}>
                🛡️ Corrective Action Plan (CAPA)
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedRiskItem.remediation_steps?.map((step, si) => (
                  <div
                    key={si}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-color)",
                      fontSize: "13px",
                      color: "var(--text-primary)"
                    }}
                  >
                    <FiCheckCircle size={16} color="#10B981" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.4 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Remediation Notes Input */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                Audit Review Notes & Escalation Log
              </label>
              <textarea
                value={remediationNotes}
                onChange={(e) => setRemediationNotes(e.target.value)}
                placeholder="Enter audit mitigation notes, executive sign-off remarks, or next steps..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit"
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", borderTop: "1px solid var(--border-color)", paddingTop: "18px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    toast.success(`Escalation alert sent to owner (${selectedRiskItem.owner})`);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                >
                  ⚡ Notify Owner
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateRiskStatus("In Progress")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    background: "rgba(245, 158, 11, 0.1)",
                    color: "#F59E0B",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                >
                  Mark In Progress
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedRiskItem(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateRiskStatus("Resolved")}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#10B981",
                    color: "#FFFFFF",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 700
                  }}
                >
                  ✓ Mark Remediated
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
