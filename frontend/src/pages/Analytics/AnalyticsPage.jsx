import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter
} from "recharts";
import {
  MdFileDownload,
  MdShield,
  MdFilterList,
  MdRefresh,
  MdPieChart,
  MdTrendingUp,
  MdAccountBalance,
  MdLocalShipping
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";

export default function AnalyticsPage() {
  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filterParams = {
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    department: department || undefined,
    category: category || undefined,
    supplier_id: supplierId || undefined,
    status: statusFilter || undefined
  };

  // 1. Overview KPIs Query
  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["analytics-overview", filterParams],
    queryFn: async () => {
      const res = await api.get("/analytics/overview", { params: filterParams });
      return res.data;
    }
  });

  // 2. Spend Analytics Query (Category, Department, Monthly Trend)
  const { data: spendData, isLoading: isSpendLoading } = useQuery({
    queryKey: ["analytics-spend", filterParams],
    queryFn: async () => {
      const res = await api.get("/analytics/spend", { params: filterParams });
      return res.data;
    }
  });

  // 3. Supplier Analytics Query (Risk Scatter Matrix)
  const { data: supplierMatrix, isLoading: isSupplierLoading } = useQuery({
    queryKey: ["analytics-supplier", category],
    queryFn: async () => {
      const res = await api.get("/analytics/supplier", { params: { category: category || undefined } });
      return res.data;
    }
  });

  // 4. PO Analytics Query
  const { data: poAnalytics } = useQuery({
    queryKey: ["analytics-po"],
    queryFn: async () => {
      const res = await api.get("/analytics/po");
      return res.data;
    }
  });

  // 5. Budget Analytics Query
  const { data: budgetAnalytics } = useQuery({
    queryKey: ["analytics-budget"],
    queryFn: async () => {
      const res = await api.get("/analytics/budget");
      return res.data;
    }
  });

  // 6. AI Fraud Risk Portfolio Query
  const { data: fraudPortfolio, isLoading: isFraudLoading } = useQuery({
    queryKey: ["fraud-risk-portfolio"],
    queryFn: async () => {
      const res = await api.get("/analytics/fraud-risk-portfolio");
      return res.data;
    }
  });

  const fmtCurrency = (val) =>
    val >= 1e6 ? `$${(val / 1e6).toFixed(2)}M` : `$${(val / 1e3).toFixed(0)}K`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Executive Procurement Analytics & Intelligence</h1>
          <p className="page-subtitle">Real DB aggregated analytics: spend breakdown, realized savings, supplier risk matrix, PO cycle times, and AI fraud audit.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetchOverview()}>
            <MdRefresh fontSize={18} /> Refresh Data
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const csv = [
                ["Category", "Total Spend", "Realized Savings"],
                ...(spendData?.by_category || []).map((c) => [c.category, c.spend, c.savings])
              ].map((row) => row.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "procurement-analytics-report.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Executive analytics report exported successfully!");
            }}
          >
            <MdFileDownload fontSize={18} /> Export Analytics Report
          </button>
        </div>
      </div>

      {/* ── Interactive Filters Toolbar ── */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 24, background: "var(--bg-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "var(--primary)" }}>
            <MdFilterList fontSize={18} /> Filters:
          </div>

          <input
            type="date"
            className="form-control"
            style={{ width: 140, fontSize: 12 }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <input
            type="date"
            className="form-control"
            style={{ width: 140, fontSize: 12 }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />

          <input
            className="form-control"
            style={{ width: 150, fontSize: 12 }}
            placeholder="Department..."
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />

          <input
            className="form-control"
            style={{ width: 150, fontSize: 12 }}
            placeholder="Category..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          {(startDate || endDate || department || category || statusFilter) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12 }}
              onClick={() => {
                setStartDate(""); setEndDate(""); setDepartment(""); setCategory(""); setStatusFilter("");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Summary KPI Grid (Server-side SQL aggregated) ── */}
      <div className="kpi-grid">
        <div className="kpi-card primary">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>TOTAL ADDRESSABLE SPEND</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
            {isOverviewLoading ? "..." : `$${(overview?.total_spend || 0).toLocaleString()}`}
          </div>
          <div style={{ fontSize: 12, color: "var(--success)", marginTop: 4 }}>
            {overview?.total_pos || 0} Purchase Orders Executed
          </div>
        </div>

        <div className="kpi-card success">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>REALIZED SAVINGS</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#10B981", marginTop: 4 }}>
            {isOverviewLoading ? "..." : `$${(overview?.total_savings || 0).toLocaleString()}`}
          </div>
          <div style={{ fontSize: 12, color: "var(--success)", marginTop: 4 }}>
            {overview?.savings_rate || 0}% Realized ROI
          </div>
        </div>

        <div className="kpi-card warning">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>SPEND AT FRAUD RISK</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--danger)", marginTop: 4 }}>
            {isOverviewLoading ? "..." : `$${(overview?.spend_at_risk || 0).toLocaleString()}`}
          </div>
          <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>
            Flagged by AI Risk Engine
          </div>
        </div>

        <div className="kpi-card danger">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>AVG PORTFOLIO RISK SCORE</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
            {overview?.avg_risk_score || 0}%
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {overview?.total_invoices || 0} Total Invoices Scanned
          </div>
        </div>
      </div>

      {/* ── MODULE 14: AI FRAUD AND RISK PORTFOLIO DETECTOR ── */}
      <div className="card" style={{ marginTop: 24, marginBottom: 24 }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <MdShield style={{ color: "var(--primary)" }} /> AI Fraud & Risk Detection Portfolio Audit
            </h3>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Automated 5-signal risk analysis: Duplicates, Z-score amount anomalies, abnormal pricing, 7-day frequency spikes, behavioral split invoices.
            </div>
          </div>
        </div>
        <div className="card-body">
          {/* Signal Breakdown Pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Duplicate Invoices", count: fraudPortfolio?.signal_breakdown?.duplicate_invoices || 0, icon: "📄" },
              { label: "Unusual Amounts (Z-Score)", count: fraudPortfolio?.signal_breakdown?.unusual_amounts || 0, icon: "📈" },
              { label: "Abnormal Unit Pricing", count: fraudPortfolio?.signal_breakdown?.abnormal_pricing || 0, icon: "💲" },
              { label: "7-Day Frequency Spikes", count: fraudPortfolio?.signal_breakdown?.frequency_spikes || 0, icon: "⚡" },
              { label: "Behavioral Split Invoices", count: fraudPortfolio?.signal_breakdown?.behavioral_anomalies || 0, icon: "🔍" },
            ].map((sig, i) => (
              <div key={i} style={{
                padding: "12px 14px", background: "var(--bg-app)", borderRadius: 10, border: "1px solid var(--border-color)",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{sig.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: sig.count > 0 ? "var(--danger)" : "var(--success)" }}>
                    {sig.count} Flagged
                  </div>
                </div>
                <span style={{ fontSize: 20 }}>{sig.icon}</span>
              </div>
            ))}
          </div>

          {/* Top Flagged Invoices Table */}
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Supplier</th>
                  <th>PO Reference</th>
                  <th>Total Amount</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Primary Risk Reason</th>
                </tr>
              </thead>
              <tbody>
                {isFraudLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Scanning database records...</td></tr>
                ) : !fraudPortfolio?.top_flagged_invoices || fraudPortfolio.top_flagged_invoices.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>No high-risk transactions detected across active invoices.</td></tr>
                ) : (
                  fraudPortfolio.top_flagged_invoices.map((inv) => (
                    <tr key={inv.invoice_id}>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>{inv.invoice_number}</td>
                      <td>{inv.supplier_name}</td>
                      <td style={{ fontWeight: 600 }}>{inv.po_number}</td>
                      <td style={{ fontWeight: 800 }}>${(inv.total_amount || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 800, color: inv.risk_score > 40 ? "#ef4444" : "#10b981" }}>
                        {inv.risk_score}%
                      </td>
                      <td>
                        <span className={`badge badge-${inv.risk_level === "CRITICAL" || inv.risk_level === "HIGH" ? "danger" : (inv.risk_level === "MEDIUM" ? "warning" : "success")}`}>
                          {inv.risk_level}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {inv.reasons?.[0] || "Standard transaction pattern"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Real Charts Grid ── */}
      <div className="chart-grid">
        {/* Real Category Spend & Realized Savings Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Spend & Realized Savings by Category ($)</h3>
          </div>
          <div className="card-body" style={{ height: 320 }}>
            {isSpendLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>Loading DB spend data...</div>
            ) : !spendData?.by_category || spendData.by_category.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>No category spend records match filter.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendData.by_category} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `$${v / 1e3}k`} />
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="spend" name="Total Spend" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="savings" name="Realized Savings" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Real Supplier Risk vs Spend Matrix Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Supplier Risk vs Spend Matrix</h3>
          </div>
          <div className="card-body" style={{ height: 320, padding: 12 }}>
            {isSupplierLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>Loading supplier matrix...</div>
            ) : !supplierMatrix || supplierMatrix.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>No supplier records available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis type="number" dataKey="spend" name="Spend ($)" unit="$" stroke="var(--text-muted)" fontSize={10} tickFormatter={(v) => `$${v / 1e3}k`} />
                  <YAxis type="number" dataKey="risk" name="AI Risk Score" domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(val) => typeof val === "number" ? `$${val.toLocaleString()}` : val} />
                  <Scatter name="Suppliers" data={supplierMatrix} fill="#EF4444" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Real PO & Budget Analytics Section ── */}
      <div className="chart-grid" style={{ marginTop: 24 }}>
        {/* Department Budget Allocation vs Spend */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Department Budget Utilization & Threshold Alerts</h3>
          </div>
          <div className="card-body">
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Category</th>
                    <th>Allocated</th>
                    <th>Spent</th>
                    <th>Remaining</th>
                    <th>Utilization</th>
                    <th>Alert Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!budgetAnalytics || budgetAnalytics.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>No budget records found.</td></tr>
                  ) : (
                    budgetAnalytics.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700 }}>{b.department}</td>
                        <td><span className="badge badge-secondary">{b.category}</span></td>
                        <td>${b.allocated.toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: b.utilization_pct >= 90 ? "var(--danger)" : "var(--text-primary)" }}>${b.spent.toLocaleString()}</td>
                        <td style={{ color: "#10B981", fontWeight: 700 }}>${b.remaining.toLocaleString()}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "var(--bg-app)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(b.utilization_pct, 100)}%`, height: "100%", background: b.utilization_pct >= 90 ? "#EF4444" : b.utilization_pct >= 80 ? "#F59E0B" : "#10B981" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{b.utilization_pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${b.utilization_pct >= 90 ? "danger" : b.utilization_pct >= 80 ? "warning" : "success"}`}>
                            {b.utilization_pct >= 90 ? "🚨 CRITICAL" : b.utilization_pct >= 80 ? "⚠️ WARNING" : "✓ NORMAL"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PO Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Purchase Order Fulfillment & Status Breakdown</h3>
          </div>
          <div className="card-body">
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO Status</th>
                    <th>Count</th>
                    <th>Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {!poAnalytics?.status_distribution || poAnalytics.status_distribution.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>No purchase orders recorded.</td></tr>
                  ) : (
                    poAnalytics.status_distribution.map((po, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, textTransform: "capitalize" }}>{po.status.replace("_", " ")}</td>
                        <td style={{ fontWeight: 700 }}>{po.count}</td>
                        <td style={{ fontWeight: 700, color: "var(--primary)" }}>${po.total_amount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
