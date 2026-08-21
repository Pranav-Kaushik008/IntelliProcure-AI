import { useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from "recharts";
import { motion } from "framer-motion";
import { FiTrendingUp, FiDollarSign, FiZap, FiTarget, FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";
const generateForecastData = () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((month, i) => ({
    month,
    actual: i < 8 ? Math.round(82e4 + Math.sin(i * 0.8) * 12e4 + i * 15e3) : null,
    forecast: Math.round(86e4 + Math.sin(i * 0.8) * 11e4 + i * 18e3),
    upperBound: Math.round(92e4 + Math.sin(i * 0.8) * 11e4 + i * 22e3),
    lowerBound: Math.round(8e5 + Math.sin(i * 0.8) * 9e4 + i * 14e3),
    budget: 1e6
  }));
};
const categoryForecast = [
  { category: "IT Hardware", q1: 320, q2: 345, q3: 290, q4: 410, risk: "Low" },
  { category: "Software Licenses", q1: 180, q2: 190, q3: 200, q4: 195, risk: "Low" },
  { category: "Professional Svc", q1: 240, q2: 260, q3: 280, q4: 300, risk: "Medium" },
  { category: "Office Supplies", q1: 45, q2: 48, q3: 42, q4: 55, risk: "Low" },
  { category: "Marketing", q1: 150, q2: 175, q3: 160, q4: 220, risk: "High" },
  { category: "Logistics", q1: 90, q2: 95, q3: 105, q4: 115, risk: "Medium" }
];
const scenarios = [
  { label: "Base Case", growth: "+8.2%", saving: "$124K", color: "#6366F1", description: "Current trajectory maintained" },
  { label: "Optimistic", growth: "+5.1%", saving: "$218K", color: "#10B981", description: "Full vendor consolidation realized" },
  { label: "Conservative", growth: "+12.4%", saving: "$67K", color: "#F59E0B", description: "Inflationary pressure scenario" },
  { label: "Cost-Cut Target", growth: "+1.9%", saving: "$340K", color: "#8B5CF6", description: "15% procurement cost reduction goal" }
];
const aiInsights = [
  { icon: "\u26A1", title: "Seasonal Spike Alert", desc: "IT Hardware spend predicted to spike 28% in Q4. Pre-order strategy can save $42K.", urgency: "high" },
  { icon: "\u{1F4C9}", title: "Vendor Consolidation Opportunity", desc: "Merging 3 logistics vendors can yield $89K annual savings per AI analysis.", urgency: "medium" },
  { icon: "\u{1F4CA}", title: "Budget Variance Risk", desc: "Marketing category tracking 18% above forecast. Early intervention recommended.", urgency: "high" },
  { icon: "\u2705", title: "Software Renewal Timing", desc: "Renewing 4 licenses in Q1 vs Q2 saves $23K due to vendor discount windows.", urgency: "low" }
];
const forecastData = generateForecastData();
export default function SpendForecastPage() {
  const [activeScenario, setActiveScenario] = useState(0);
  const [viewMode, setViewMode] = useState("monthly");
  const totalForecast = forecastData.reduce((s, d) => s + (d.forecast || 0), 0);
  const totalActual = forecastData.filter((d) => d.actual).reduce((s, d) => s + (d.actual || 0), 0);
  const totalBudget = 12e6;
  const savingOpp = 124e3;
  const fmt = (v) => v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${(v / 1e3).toFixed(0)}K`;
  const riskColor = (r) => r === "High" ? "#EF4444" : r === "Medium" ? "#F59E0B" : "#10B981";
  return <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>

      {
    /* ── Header ── */
  }
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            AI Spend Forecasting
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "4px 0 0" }}>
            Machine learning–powered 12-month procurement spend predictions and scenario modeling
          </p>
        </div>
        <button
    onClick={() => {
      const csv = [
        ["Month", "Actual", "Forecast", "Upper Bound", "Lower Bound", "Budget"],
        ...forecastData.map((d) => [d.month, d.actual ?? "", d.forecast, d.upperBound, d.lowerBound, d.budget])
      ].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spend-forecast.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Spend forecast exported successfully!");
    }}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "10px 20px",
      borderRadius: "8px",
      border: "none",
      background: "var(--gradient-brand)",
      color: "white",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: 600
    }}
  >
          <FiDownload size={14} /> Export Forecast
        </button>
      </div>

      {
    /* ── KPI Banner ── */
  }
      <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  }}>
        {[
    { label: "Projected Annual Spend", value: fmt(totalForecast), sub: "+8.2% vs last year", icon: FiDollarSign, color: "#6366F1" },
    { label: "Actual YTD Spend", value: fmt(totalActual), sub: "67% of annual budget", icon: FiTrendingUp, color: "#10B981" },
    { label: "Annual Budget", value: fmt(totalBudget), sub: "FY 2026 allocation", icon: FiTarget, color: "#F59E0B" },
    { label: "Savings Opportunity", value: fmt(savingOpp), sub: "AI-identified potential", icon: FiZap, color: "#8B5CF6" }
  ].map((kpi, i) => <motion.div
    key={kpi.label}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.08 }}
    style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-color)",
      borderRadius: "12px",
      padding: "18px 20px",
      borderTop: `3px solid ${kpi.color}`
    }}
  >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>{kpi.label}</span>
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
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{kpi.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{kpi.sub}</div>
          </motion.div>)}
      </div>

      {
    /* ── Main Forecast Chart ── */
  }
      <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "24px"
  }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
              12-Month Spend Forecast with Confidence Interval
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              Shaded area = 85% prediction confidence band • Dashed = monthly budget ceiling
            </p>
          </div>
          <div style={{ display: "flex", gap: "4px", background: "var(--bg-hover)", borderRadius: "8px", padding: "3px" }}>
            {["monthly", "category"].map((v) => <button
    key={v}
    onClick={() => setViewMode(v)}
    style={{
      padding: "6px 14px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: 600,
      background: viewMode === v ? "var(--bg-card)" : "transparent",
      color: viewMode === v ? "var(--text-primary)" : "var(--text-muted)",
      boxShadow: viewMode === v ? "var(--shadow-sm)" : "none",
      transition: "all 0.2s"
    }}
  >
                {v === "monthly" ? "Monthly" : "By Category"}
              </button>)}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
            <YAxis tickFormatter={(v) => `$${(v / 1e3).toFixed(0)}K`} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <Tooltip
    formatter={(v) => v != null ? [`$${(Number(v) / 1e3).toFixed(1)}K`, ""] : ["N/A", ""]}
    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px" }}
  />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <ReferenceLine y={1e6} stroke="#EF4444" strokeDasharray="6 3" label={{ value: "Budget", fill: "#EF4444", fontSize: 11 }} />
            <Area type="monotone" dataKey="upperBound" fill="rgba(99,102,241,0.08)" stroke="none" name="Upper Bound" legendType="none" />
            <Area type="monotone" dataKey="lowerBound" fill="var(--bg-app)" stroke="none" name="Lower Bound" legendType="none" />
            <Bar dataKey="actual" name="Actual Spend" fill="#6366F1" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="forecast" name="AI Forecast" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3, fill: "#F59E0B" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", marginBottom: "24px" }}>
        {
    /* ── Category Breakdown ── */
  }
        <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px"
  }}>
          <h3 style={{ margin: "0 0 18px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            Category Spend Forecast ($K) by Quarter
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Category", "Q1", "Q2", "Q3", "Q4", "Annual", "Risk"].map((h) => <th key={h} style={{
    padding: "8px 12px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-muted)",
    borderBottom: "1px solid var(--border-color)",
    background: "var(--bg-hover)"
  }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {categoryForecast.map((row, i) => {
    const annual = row.q1 + row.q2 + row.q3 + row.q4;
    return <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg-hover)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary)" }}>{row.category}</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>${row.q1}K</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>${row.q2}K</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>${row.q3}K</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>${row.q4}K</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-primary)" }}>${annual}K</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
      padding: "2px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: 700,
      background: `${riskColor(row.risk)}20`,
      color: riskColor(row.risk)
    }}>{row.risk}</span>
                      </td>
                    </tr>;
  })}
              </tbody>
            </table>
          </div>
        </div>

        {
    /* ── Scenario Modeling ── */
  }
        <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px"
  }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            Scenario Modeling
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {scenarios.map((s, i) => <motion.button
    key={i}
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    onClick={() => setActiveScenario(i)}
    style={{
      border: `2px solid ${activeScenario === i ? s.color : "var(--border-color)"}`,
      borderRadius: "10px",
      padding: "12px 14px",
      cursor: "pointer",
      background: activeScenario === i ? `${s.color}10` : "transparent",
      textAlign: "left",
      transition: "all 0.2s"
    }}
  >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: activeScenario === i ? s.color : "var(--text-primary)" }}>
                    {s.label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: s.color }}>{s.saving}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{s.description}</div>
                <div style={{ fontSize: "11px", color: s.color, marginTop: "2px", fontWeight: 600 }}>
                  Growth: {s.growth}
                </div>
              </motion.button>)}
          </div>
        </div>
      </div>

      {
    /* ── AI Insights ── */
  }
      <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px"
  }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <div style={{
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px"
  }}>🤖</div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            AI Procurement Intelligence Insights
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
          {aiInsights.map((ins, i) => <div key={i} style={{
    background: "var(--bg-hover)",
    borderRadius: "10px",
    padding: "16px",
    borderLeft: `3px solid ${ins.urgency === "high" ? "#EF4444" : ins.urgency === "medium" ? "#F59E0B" : "#10B981"}`,
    display: "flex",
    gap: "12px",
    alignItems: "flex-start"
  }}>
              <span style={{ fontSize: "20px", lineHeight: 1 }}>{ins.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", marginBottom: "4px" }}>
                  {ins.title}
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>{ins.desc}</p>
              </div>
            </div>)}
        </div>
      </div>
    </div>;
}
