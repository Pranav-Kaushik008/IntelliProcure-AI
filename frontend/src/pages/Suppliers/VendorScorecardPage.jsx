import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiStar,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiPackage,
  FiClock,
  FiDollarSign,
  FiShield,
  FiDownload,
  FiMail,
  FiActivity
} from "react-icons/fi";
const radarData = [
  { metric: "Quality", score: 88, benchmark: 75 },
  { metric: "Delivery", score: 79, benchmark: 80 },
  { metric: "Pricing", score: 92, benchmark: 70 },
  { metric: "Support", score: 84, benchmark: 72 },
  { metric: "Compliance", score: 95, benchmark: 85 },
  { metric: "Innovation", score: 71, benchmark: 65 }
];
const trendData = [
  { month: "Feb", score: 74, deliveryRate: 91 },
  { month: "Mar", score: 78, deliveryRate: 88 },
  { month: "Apr", score: 80, deliveryRate: 94 },
  { month: "May", score: 82, deliveryRate: 96 },
  { month: "Jun", score: 79, deliveryRate: 90 },
  { month: "Jul", score: 86, deliveryRate: 97 },
  { month: "Aug", score: 88, deliveryRate: 98 }
];
const orderHistoryData = [
  { month: "Mar", onTime: 18, late: 2, cancelled: 0 },
  { month: "Apr", onTime: 22, late: 1, cancelled: 1 },
  { month: "May", onTime: 25, late: 3, cancelled: 0 },
  { month: "Jun", onTime: 19, late: 2, cancelled: 0 },
  { month: "Jul", onTime: 28, late: 1, cancelled: 0 },
  { month: "Aug", onTime: 31, late: 0, cancelled: 0 }
];
const kpis = [
  { label: "Overall Score", value: "88/100", delta: "+6 pts", positive: true, icon: FiStar, color: "#F59E0B" },
  { label: "On-Time Delivery", value: "97.2%", delta: "+3.1%", positive: true, icon: FiClock, color: "#10B981" },
  { label: "Quality Rate", value: "99.1%", delta: "+0.4%", positive: true, icon: FiCheckCircle, color: "#6366F1" },
  { label: "Price Competitiveness", value: "A+", delta: "Top 5%", positive: true, icon: FiDollarSign, color: "#8B5CF6" },
  { label: "Defect Rate", value: "0.9%", delta: "-0.2%", positive: true, icon: FiPackage, color: "#EF4444" },
  { label: "Risk Level", value: "Low", delta: "Stable", positive: true, icon: FiShield, color: "#06B6D4" }
];
const incidents = [
  { date: "2026-07-12", type: "Delay", severity: "Low", desc: "Shipment delayed by 1 day due to carrier issue", resolved: true },
  { date: "2026-06-03", type: "Quality", severity: "Medium", desc: "3 units returned \u2013 minor packaging defect", resolved: true },
  { date: "2026-04-18", type: "Pricing", severity: "Low", desc: "Invoice discrepancy of $48 \u2013 corrected", resolved: true }
];
const certifications = [
  { name: "ISO 9001:2015", expiry: "2027-03-15", status: "Valid" },
  { name: "ISO 14001:2015", expiry: "2026-11-20", status: "Valid" },
  { name: "SOC 2 Type II", expiry: "2026-09-01", status: "Expiring Soon" },
  { name: "GDPR Compliance", expiry: "2027-06-30", status: "Valid" }
];
export default function VendorScorecardPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const vendor = {
    name: "Acme Technologies Ltd.",
    id: id || "SUP-001",
    category: "IT Hardware & Software",
    since: "January 2019",
    contact: "James Walker",
    email: "j.walker@acmetech.com",
    country: "United States",
    tier: "Preferred"
  };
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance Trends" },
    { id: "orders", label: "Order History" },
    { id: "compliance", label: "Compliance & Certs" }
  ];
  const severityColor = (s) => s === "High" ? "#EF4444" : s === "Medium" ? "#F59E0B" : "#10B981";
  const certStatusColor = (s) => s === "Expiring Soon" ? "#F59E0B" : "#10B981";
  return <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>

      {
    /* ── Back + Header ── */
  }
      <div style={{ marginBottom: "24px" }}>
        <Link to="/suppliers" style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: "var(--text-muted)",
    fontSize: "13px",
    textDecoration: "none",
    marginBottom: "16px"
  }}>
          <FiArrowLeft size={14} /> Back to Suppliers
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    style={{
      width: "64px",
      height: "64px",
      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "26px",
      boxShadow: "0 4px 20px rgba(99,102,241,0.35)"
    }}
  >🏭</motion.div>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                {vendor.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{vendor.id}</span>
                <span style={{
    padding: "2px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700,
    background: "rgba(99,102,241,0.15)",
    color: "var(--primary)"
  }}>{vendor.tier}</span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>• Partner since {vendor.since}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
    onClick={() => toast.success(`Opening contact channel for ${vendor.name} (${vendor.email})...`)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 16px",
      borderRadius: "8px",
      border: "1px solid var(--border-color)",
      background: "var(--bg-card)",
      color: "var(--text-primary)",
      cursor: "pointer",
      fontSize: "13px"
    }}
  >
              <FiMail size={14} /> Contact
            </button>
            <button
    onClick={() => {
      const csv = [
        ["Metric", "Score", "Benchmark"],
        ...radarData.map((r) => [r.metric, r.score, r.benchmark])
      ].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendor-scorecard-${vendor.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Vendor scorecard report exported successfully!");
    }}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 16px",
      borderRadius: "8px",
      border: "none",
      background: "var(--gradient-brand)",
      color: "white",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: 600
    }}
  >
              <FiDownload size={14} /> Export Report
            </button>
          </div>
        </div>
      </div>

      {
    /* ── AI Risk Banner ── */
  }
      <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.1) 100%)",
      border: "1px solid rgba(16,185,129,0.3)",
      borderRadius: "12px",
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "24px"
    }}
  >
        <FiActivity size={18} color="#10B981" />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, color: "#10B981", fontSize: "13px" }}>AI Risk Assessment: LOW RISK  </span>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            AI analysis across 47 data points shows strong performance trajectory. Recommend contract renewal with 5% volume increase bonus tier.
          </span>
        </div>
        <span style={{
    background: "rgba(16,185,129,0.2)",
    color: "#10B981",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700
  }}>Score: 88/100</span>
      </motion.div>

      {
    /* ── KPI Cards ── */
  }
      <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  }}>
        {kpis.map((kpi, i) => <motion.div
    key={kpi.label}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.06 }}
    style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-color)",
      borderRadius: "12px",
      padding: "16px 20px"
    }}
  >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{kpi.label}</span>
              <div style={{
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: `${kpi.color}20`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
                <kpi.icon size={16} color={kpi.color} />
              </div>
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>
              {kpi.value}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
              {kpi.positive ? <FiTrendingUp size={12} color="#10B981" /> : <FiTrendingDown size={12} color="#EF4444" />}
              <span style={{ color: kpi.positive ? "#10B981" : "#EF4444", fontWeight: 600 }}>{kpi.delta}</span>
              <span style={{ color: "var(--text-muted)" }}>vs last quarter</span>
            </div>
          </motion.div>)}
      </div>

      {
    /* ── Tabs ── */
  }
      <div style={{
    display: "flex",
    gap: "4px",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "24px",
    overflowX: "auto"
  }}>
        {tabs.map((tab) => <button
    key={tab.id}
    onClick={() => setActiveTab(tab.id)}
    style={{
      padding: "10px 20px",
      border: "none",
      cursor: "pointer",
      background: "transparent",
      fontSize: "13px",
      fontWeight: 600,
      color: activeTab === tab.id ? "var(--primary)" : "var(--text-muted)",
      borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
      transition: "all 0.2s",
      whiteSpace: "nowrap"
    }}
  >
            {tab.label}
          </button>)}
      </div>

      {
    /* ── Tab Content ── */
  }
      {activeTab === "overview" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {
    /* Radar Chart */
  }
          <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px"
  }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
              Performance Radar
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <Radar name="Score" dataKey="score" stroke="#6366F1" fill="#6366F1" fillOpacity={0.25} strokeWidth={2} />
                <Radar name="Benchmark" dataKey="benchmark" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {
    /* Vendor Info + Incidents */
  }
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px"
  }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                Vendor Information
              </h3>
              {[
    { label: "Category", value: vendor.category },
    { label: "Country", value: vendor.country },
    { label: "Primary Contact", value: vendor.contact },
    { label: "Email", value: vendor.email },
    { label: "Partner Since", value: vendor.since }
  ].map((row) => <div key={row.label} style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid var(--border-color)"
  }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{row.value}</span>
                </div>)}
            </div>

            <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    flex: 1
  }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                Recent Incidents
              </h3>
              {incidents.map((inc, i) => <div key={i} style={{
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "10px 0",
    borderBottom: i < incidents.length - 1 ? "1px solid var(--border-color)" : "none"
  }}>
                  <div style={{
    marginTop: "2px",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: severityColor(inc.severity),
    flexShrink: 0
  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{inc.type}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{inc.date}</span>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>{inc.desc}</p>
                  </div>
                  {inc.resolved && <FiCheckCircle size={14} color="#10B981" style={{ marginTop: "2px", flexShrink: 0 }} />}
                </div>)}
            </div>
          </div>
        </div>}

      {activeTab === "performance" && <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px"
  }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
              Overall Score & Delivery Rate Trend (7 months)
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="score" name="Overall Score" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="deliveryRate" name="Delivery Rate %" stroke="#10B981" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>}

      {activeTab === "orders" && <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px"
  }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            Order Fulfillment Breakdown (Last 6 Months)
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={orderHistoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="onTime" name="On-Time" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name="Late" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>}

      {activeTab === "compliance" && <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px"
  }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
              Certifications & Compliance Status
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
              {certifications.map((cert, i) => <div key={i} style={{
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "14px"
  }}>
                  <div style={{
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: `${certStatusColor(cert.status)}20`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
                    {cert.status === "Expiring Soon" ? <FiAlertTriangle size={18} color={certStatusColor(cert.status)} /> : <FiCheckCircle size={18} color={certStatusColor(cert.status)} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{cert.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Expires: {cert.expiry}</div>
                    <span style={{
    fontSize: "11px",
    fontWeight: 700,
    padding: "1px 8px",
    borderRadius: "20px",
    marginTop: "4px",
    display: "inline-block",
    background: `${certStatusColor(cert.status)}20`,
    color: certStatusColor(cert.status)
  }}>{cert.status}</span>
                  </div>
                </div>)}
            </div>
          </div>
        </div>}
    </div>;
}
