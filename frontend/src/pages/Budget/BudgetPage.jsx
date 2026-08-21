import { useAuth } from '../../contexts/AuthContext';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from "recharts";
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiPlus,
  FiEdit,
  FiDownload,
  FiTarget,
  FiPieChart,
  FiRefreshCw,
  FiX
} from "react-icons/fi";
import { api } from "../../contexts/AuthContext";

export default function BudgetPage() {
  const { canManageBudget, isAuditor, isSupplier } = useAuth();

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    department_name: "Information Technology",
    category: "IT Hardware",
    fiscal_year: "2026",
    allocated_amount: 250000,
    spent_amount: 0,
    currency: "USD",
    notes: ""
  });

  // ── Fetch Budgets List from API ─────────────────────────────────────────────
  const { data: budgets, isLoading, isError, refetch } = useQuery({
    queryKey: ["budgets-list", search, deptFilter, categoryFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get("/budget/", {
        params: {
          search: search || undefined,
          department_name: deptFilter || undefined,
          category: categoryFilter || undefined,
          status: statusFilter || undefined
        }
      });
      return res.data;
    }
  });

  // ── Fetch Executive Summary ──────────────────────────────────────────────────
  const { data: summary } = useQuery({
    queryKey: ["budget-summary"],
    queryFn: async () => {
      const res = await api.get("/budget/summary");
      return res.data;
    }
  });

  // ── Create Budget Handler ───────────────────────────────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/budget/", formData);
      toast.success("New budget allocation created successfully!");
      setIsCreateModalOpen(false);
      refetch();
      queryClient.invalidateQueries(["budget-summary"]);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create budget");
    }
  };

  // ── Edit Budget Handler ─────────────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBudget) return;
    try {
      await api.put(`/budget/${editingBudget.id}`, {
        name: editingBudget.name,
        department_name: editingBudget.department_name,
        category: editingBudget.category,
        allocated_amount: editingBudget.allocated_amount,
        spent_amount: editingBudget.spent_amount,
        notes: editingBudget.notes
      });
      toast.success("Budget allocation updated successfully!");
      setEditingBudget(null);
      refetch();
      queryClient.invalidateQueries(["budget-summary"]);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update budget");
    }
  };

  const fmt = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${(v / 1e3).toFixed(0)}K`);

  const getStatusBadge = (status, pct) => {
    if (status === "CRITICAL" || status === "EXCEEDED" || pct >= 90) {
      return <span className="badge badge-danger">🚨 CRITICAL ({pct}%)</span>;
    }
    if (status === "WARNING" || pct >= 80) {
      return <span className="badge badge-warning">⚠️ WARNING ({pct}%)</span>;
    }
    return <span className="badge badge-success">✓ NORMAL ({pct}%)</span>;
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
            <FiPieChart size={26} color="var(--primary)" />
            Budget Management & Threshold Alerts
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "4px 0 0" }}>
            Server-calculated spend utilization, remaining balances, and automated &gt;80% Warning and &gt;90% Critical alerts.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => refetch()}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px",
              borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)",
              color: "var(--text-primary)", cursor: "pointer", fontSize: "13px"
            }}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
          {canManageBudget && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px",
                borderRadius: "8px", border: "none", background: "var(--gradient-brand)",
                color: "white", cursor: "pointer", fontSize: "13px", fontWeight: 600
              }}
            >
              <FiPlus size={14} /> Create Budget
            </button>
          )}
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Allocated Budget", value: fmt(summary?.total_allocated || 0), delta: "FY 2026", color: "#6366F1", icon: FiTarget },
          { label: "Total Spent", value: fmt(summary?.total_spent || 0), delta: `${summary?.overall_utilization_pct || 0}% Utilized`, color: "#F59E0B", icon: FiDollarSign },
          { label: "Remaining Balance", value: fmt(summary?.total_remaining || 0), delta: "Available Funds", color: "#10B981", icon: FiTrendingDown },
          { label: "> 80% Warning Threshold", value: `${summary?.warning_count_80 || 0} Budgets`, delta: "Approaching Limit", color: "#F59E0B", icon: FiAlertTriangle },
          { label: "> 90% Critical Threshold", value: `${summary?.critical_count_90 || 0} Budgets`, delta: "High Overrun Risk", color: "#EF4444", icon: FiAlertTriangle }
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "18px 20px",
              borderLeft: `4px solid ${kpi.color}`
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{kpi.label}</span>
              <kpi.icon size={16} color={kpi.color} />
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>{kpi.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{kpi.delta}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="form-control"
          style={{ width: "240px" }}
          placeholder="Search budgets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="form-control"
          style={{ width: "180px" }}
          placeholder="Filter by Department..."
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        />
        <select className="form-control" style={{ width: "160px" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Thresholds</option>
          <option value="normal">Normal (&lt;80%)</option>
          <option value="warning">Warning (&gt;80%)</option>
          <option value="critical">Critical (&gt;90%)</option>
        </select>
      </div>

      {/* ── Budget Data Table ── */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Budget Name</th>
                <th>Department</th>
                <th>Category</th>
                <th>Allocated</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Utilization & Progress</th>
                <th>Threshold Alert</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading budgets...</td></tr>
              ) : !budgets || budgets.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No budget allocations found. Click Allocate New Budget to create.</td></tr>
              ) : (
                budgets.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{b.name}</td>
                    <td style={{ fontWeight: 600 }}>{b.department_name}</td>
                    <td><span className="badge badge-secondary">{b.category}</span></td>
                    <td style={{ fontWeight: 700 }}>${b.allocated_amount.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: b.is_critical ? "var(--danger)" : "var(--text-primary)" }}>
                      ${b.spent_amount.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, color: "#10B981" }}>${b.remaining_amount.toLocaleString()}</td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span>{b.utilization_pct}%</span>
                      </div>
                      <div style={{ width: "100%", height: 8, background: "var(--bg-app)", borderRadius: 4, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(b.utilization_pct, 100)}%`,
                            height: "100%",
                            borderRadius: 4,
                            background: b.utilization_pct >= 90 ? "#EF4444" : (b.utilization_pct >= 80 ? "#F59E0B" : "#10B981")
                          }}
                        />
                      </div>
                    </td>
                    <td>{getStatusBadge(b.threshold_status, b.utilization_pct)}</td>
                    <td style={{ textAlign: "right" }}>
                      {canManageBudget && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingBudget(b)}>
                          <FiEdit size={14} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Budget Modal ── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 500, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Allocate New Department Budget</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsCreateModalOpen(false)}><FiX size={18} /></button>
              </div>

              <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Budget Name *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. IT Cloud & Hardware FY26"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <input
                      className="form-control"
                      value={formData.department_name}
                      onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <input
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Allocated Amount ($) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 100000"
                      value={formData.allocated_amount}
                      onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Spent Amount ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 0"
                      value={formData.spent_amount}
                      onChange={(e) => setFormData({ ...formData, spent_amount: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Allocation</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Budget Modal ── */}
      <AnimatePresence>
        {editingBudget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 500, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Edit Budget Allocation</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingBudget(null)}><FiX size={18} /></button>
              </div>

              <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Budget Name</label>
                  <input
                    className="form-control"
                    value={editingBudget.name}
                    onChange={(e) => setEditingBudget({ ...editingBudget, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input
                      className="form-control"
                      value={editingBudget.department_name}
                      onChange={(e) => setEditingBudget({ ...editingBudget, department_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      className="form-control"
                      value={editingBudget.category}
                      onChange={(e) => setEditingBudget({ ...editingBudget, category: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Allocated Amount ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 100000"
                      value={editingBudget.allocated_amount}
                      onChange={(e) => setEditingBudget({ ...editingBudget, allocated_amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Spent Amount ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 0"
                      value={editingBudget.spent_amount}
                      onChange={(e) => setEditingBudget({ ...editingBudget, spent_amount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingBudget(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Allocation</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
