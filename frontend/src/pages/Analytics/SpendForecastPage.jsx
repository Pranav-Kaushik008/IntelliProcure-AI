import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { FiTrendingUp, FiDollarSign, FiZap, FiTarget, FiDownload, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import { api } from "../../contexts/AuthContext";

export default function SpendForecastPage() {
  const [activeScenario, setActiveScenario] = useState(0);
  const [viewMode, setViewMode] = useState("monthly");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["spend-forecast-data"],
    queryFn: async () => {
      const res = await api.get("/analytics/spend-forecast-data");
      return res.data;
    }
  });

  const forecastData = data?.forecast_data || [];
  const categoryForecast = data?.category_forecast || [];
  const scenarios = data?.scenarios || [];
  const aiInsights = data?.ai_insights || [];
  const kpis = data?.kpi_metrics || {
    total_forecast: 0,
    total_actual: 0,
    total_budget: 0,
    saving_opportunity: 0
  };

  const fmt = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${(v / 1e3).toFixed(0)}K`);
  const riskColor = (r) => (r === "High" ? "#EF4444" : r === "Medium" ? "#F59E0B" : "#10B981");

  const monthlyBudget = forecastData[0]?.budget || 100000;

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            AI Spend Forecasting & Scenario Modeling
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "4px 0 0" }}>
            Real DB aggregated 12-month procurement spend predictions, variance boundaries, and scenario modeling
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              refetch();
              toast.success("Forecast metrics updated from latest DB records!");
            }}
            disabled={isRefetching || isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600
            }}
          >
            <FiRefreshCw size={14} className={isRefetching ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => {
              const csv = [
                ["Month", "Actual ($)", "AI Forecast ($)", "Upper Bound ($)", "Lower Bound ($)", "Monthly Budget ($)"],
                ...forecastData.map((d) => [d.month, d.actual ?? "", d.forecast, d.upperBound, d.lowerBound, d.budget])
              ].map((row) => row.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "spend-forecast-report.csv";
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
      </div>

      {/* ── KPI Banner ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {[
          { label: "Projected Annual Spend", value: fmt(kpis.total_forecast), sub: "AI predicted 12-month trajectory", icon: FiDollarSign, color: "#6366F1" },
          { label: "Actual YTD Spend", value: fmt(kpis.total_actual), sub: "Recorded in verified purchase orders", icon: FiTrendingUp, color: "#10B981" },
          { label: "Total Annual Budget", value: fmt(kpis.total_budget), sub: "Aggregated departmental allocations", icon: FiTarget, color: "#F59E0B" },
          { label: "Identified Savings Opportunity", value: fmt(kpis.saving_opportunity), sub: "Discounts & vendor consolidations", icon: FiZap, color: "#8B5CF6" }
        ].map((kpi, i) => (
          <motion.div
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
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>
              {isLoading ? "..." : kpi.value}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Forecast Chart ── */}
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
            {["monthly", "category"].map((v) => (
              <button
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
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 360, color: "var(--text-muted)" }}>
            Computing statistical projections from purchase order records...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <YAxis tickFormatter={(v) => `$${(v / 1e3).toFixed(0)}K`} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip
                formatter={(v) => (v != null ? [`$${(Number(v) / 1e3).toFixed(1)}K`, ""] : ["N/A", ""])}
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <ReferenceLine y={monthlyBudget} stroke="#EF4444" strokeDasharray="6 3" label={{ value: "Budget Limit", fill: "#EF4444", fontSize: 11 }} />
              <Area type="monotone" dataKey="upperBound" fill="rgba(99,102,241,0.08)" stroke="none" name="Upper Bound" legendType="none" />
              <Area type="monotone" dataKey="lowerBound" fill="var(--bg-app)" stroke="none" name="Lower Bound" legendType="none" />
              <Bar dataKey="actual" name="Actual Spend" fill="#6366F1" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="forecast" name="AI Forecast" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3, fill: "#F59E0B" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", marginBottom: "24px" }}>
        {/* ── Category Breakdown ── */}
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
                  {["Category", "Q1", "Q2", "Q3", "Q4", "Annual", "Risk"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        borderBottom: "1px solid var(--border-color)",
                        background: "var(--bg-hover)"
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoryForecast.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg-hover)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary)" }}>{row.category}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>${row.q1}K</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>${row.q2}K</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>${row.q3}K</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>${row.q4}K</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-primary)" }}>${row.annual}K</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: `${riskColor(row.risk)}20`,
                          color: riskColor(row.risk)
                        }}
                      >
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Scenario Modeling ── */}
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
            {scenarios.map((s, i) => (
              <motion.button
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
                  Trajectory: {s.growth}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Insights ── */}
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
          {aiInsights.map((ins, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-hover)",
                borderRadius: "10px",
                padding: "16px",
                borderLeft: `3px solid ${ins.urgency === "high" ? "#EF4444" : ins.urgency === "medium" ? "#F59E0B" : "#10B981"}`,
                display: "flex",
                gap: "12px",
                alignItems: "flex-start"
              }}
            >
              <span style={{ fontSize: "20px", lineHeight: 1 }}>{ins.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", marginBottom: "4px" }}>
                  {ins.title}
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
