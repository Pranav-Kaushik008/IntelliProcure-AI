import { useAuth } from '../../contexts/AuthContext';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdSearch,
  MdAdd,
  MdStar,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdClose,
  MdRefresh,
  MdFilterList,
  MdSort,
  MdChevronLeft,
  MdChevronRight,
  MdVerified
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function SuppliersPage() {
  const { canManageSuppliers, isAuditor, isSupplier } = useAuth();

  const queryClient = useQueryClient();

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone: "",
    category: "goods",
    contact_person: "",
    city: "",
    country: "",
    payment_terms: "Net 30",
    description: "",
    status: "active",
    risk_level: "low",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Suppliers from real API (NO MOCK FALLBACK) ────────────────────────
  const { data: suppliers, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["suppliers", search, categoryFilter, riskFilter, statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get("/suppliers/", {
        params: {
          search: search || undefined,
          category: categoryFilter || undefined,
          risk_level: riskFilter || undefined,
          status: statusFilter || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          skip: 0,
          limit: 100,
        },
      });
      return res.data;
    },
    retry: false,
  });

  // Client-side pagination slice
  const allSuppliers = suppliers || [];
  const totalItems = allSuppliers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedSuppliers = allSuppliers.slice((page - 1) * pageSize, page * pageSize);

  // Reset form
  const resetForm = () => {
    setFormData({
      company_name: "",
      email: "",
      phone: "",
      category: "goods",
      contact_person: "",
      city: "",
      country: "",
      payment_terms: "Net 30",
      description: "",
      status: "active",
      risk_level: "low",
    });
  };

  // ── Create Supplier ────────────────────────────────────────────────────────
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!formData.company_name || formData.company_name.trim().length < 2) {
      toast.error("Company Name is required (min 2 chars)");
      return;
    }
    if (!formData.email || !formData.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/suppliers/", formData);
      toast.success(`Supplier "${formData.company_name}" registered successfully!`);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to register supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit / Update Supplier ──────────────────────────────────────────────────
  const handleOpenEdit = (sup) => {
    setEditSupplier(sup);
    setFormData({
      company_name: sup.company_name || "",
      email: sup.email || "",
      phone: sup.phone || "",
      category: sup.category || "goods",
      contact_person: sup.contact_person || "",
      city: sup.city || "",
      country: sup.country || "",
      payment_terms: sup.payment_terms || "Net 30",
      description: sup.description || "",
      status: sup.status || "active",
      risk_level: sup.risk_level || "low",
    });
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!editSupplier) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/suppliers/${editSupplier.id}`, formData);
      toast.success(`Supplier "${formData.company_name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setEditSupplier(null);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete Supplier ─────────────────────────────────────────────────────────
  const handleDeleteSupplier = async () => {
    if (!deleteSupplier) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/suppliers/${deleteSupplier.id}`);
      toast.success(`Supplier "${deleteSupplier.company_name}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteSupplier(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Authorize & Verify Supplier ─────────────────────────────────────────────
  const handleVerifySupplier = async (supplier) => {
    if (!window.confirm(`Authorize and verify "${supplier.company_name}" for enterprise RFQ bidding and procurement fulfillment?`)) return;
    try {
      await api.patch(`/suppliers/${supplier.id}/verify`);
      toast.success(`Supplier "${supplier.company_name}" successfully verified & authorized! 🎉`);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to verify supplier");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Supplier Master Management</h1>
          <p className="page-subtitle">Real-time enterprise vendor directory, ratings, performance, and risk management.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <MdRefresh fontSize={18} /> {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          {canManageSuppliers && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
              <MdAdd fontSize={18} /> Add New Supplier
            </button>
          )}
        </div>
      </div>

      {/* Search, Filters & Sorting Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div className="search-bar" style={{ width: 280, flex: 1, minWidth: 200 }}>
          <MdSearch style={{ color: "var(--text-muted)" }} />
          <input
            className="search-input"
            placeholder="Search company, code, contact or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Category Filter */}
        <select
          className="form-control"
          style={{ width: 150 }}
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          <option value="goods">Goods</option>
          <option value="services">Services</option>
          <option value="it">IT Hardware/Software</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="logistics">Logistics</option>
          <option value="marketing">Marketing</option>
        </select>

        {/* Risk Level Filter */}
        <select
          className="form-control"
          style={{ width: 140 }}
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Risk Levels</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
          <option value="critical">Critical Risk</option>
        </select>

        {/* Status Filter */}
        <select
          className="form-control"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Certified</option>
          <option value="pending_approval">⏳ Pending KYC Review</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Sort By */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MdSort style={{ color: "var(--text-muted)" }} />
          <select
            className="form-control"
            style={{ width: 150 }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at">Sort: Date Created</option>
            <option value="company_name">Sort: Company Name</option>
            <option value="overall_rating">Sort: Rating</option>
            <option value="total_spend">Sort: Spend</option>
            <option value="risk_score">Sort: Risk Score</option>
          </select>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title="Toggle sort direction"
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 24, borderColor: "#ef4444" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Failed to load suppliers</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {error?.response?.data?.detail || error?.message || "Could not connect to database."}
          </p>
          <button className="btn btn-primary" onClick={() => refetch()}>
            <MdRefresh fontSize={18} /> Retry
          </button>
        </div>
      )}

      {/* Suppliers Data Table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier Info</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Performance & Spend</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                    Loading supplier database...
                  </td>
                </tr>
              ) : paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                    No suppliers found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{s.company_name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.supplier_code}</div>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>
                      <span className="badge badge-info" style={{ textTransform: "capitalize" }}>{s.category}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.contact_person || "N/A"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.email}</div>
                    </td>
                    <td>{s.city ? `${s.city}, ${s.country}` : s.country || "Global"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                        <MdStar color="#F59E0B" /> {(s.overall_rating || 0).toFixed(1)} / 5.0
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        ${((s.total_spend || 0) / 1e3).toLocaleString()}k historical spend
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${s.risk_level === "high" || s.risk_level === "critical" ? "danger" : s.risk_level === "medium" ? "warning" : "success"}`}>
                        {s.risk_score || 0}/100 ({s.risk_level || "low"})
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${s.status === "active" ? "success" : s.status === "pending_approval" || s.status === "pending" ? "warning" : "gray"}`}>
                        {s.status === "pending_approval" || s.status === "pending" ? "⏳ Pending KYC" : s.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                        {canManageSuppliers && (s.status === "pending_approval" || s.status === "pending" || s.status === "inactive") && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleVerifySupplier(s)}
                            style={{ background: "#10b981", borderColor: "#10b981", color: "#fff", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, padding: "4px 8px", fontSize: 11 }}
                            title="Authorize & Verify Supplier for Bidding"
                          >
                            <MdVerified fontSize={14} /> Authorize
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setViewSupplier(s)}
                          title="View Details"
                        >
                          <MdVisibility fontSize={16} /> Details
                        </button>
                        {canManageSuppliers && (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenEdit(s)}
                              title="Edit Supplier"
                            >
                              <MdEdit fontSize={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#ef4444" }}
                              onClick={() => setDeleteSupplier(s)}
                              title="Delete Supplier"
                            >
                              <MdDelete fontSize={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div style={{
            display: "flex",
            justify: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderTop: "1px solid var(--border-color)",
            fontSize: 13
          }}>
            <div style={{ color: "var(--text-muted)" }}>
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalItems)} of {totalItems} suppliers
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <MdChevronLeft fontSize={18} /> Previous
              </button>

              <span style={{ fontWeight: 600, color: "var(--text-primary)", padding: "0 4px" }}>
                Page {page} of {totalPages}
              </span>

              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <MdChevronRight fontSize={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Supplier Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card"
              style={{ width: 540, padding: 24, maxHeight: "90vh", overflowY: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Register New Supplier</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsAddModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleCreateSupplier} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Acme Corporation"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="orders@acme.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      className="form-control"
                      placeholder="+1-555-0199"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="goods">Goods</option>
                      <option value="services">Services</option>
                      <option value="it">IT Hardware/Software</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="logistics">Logistics</option>
                      <option value="marketing">Marketing</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      className="form-control"
                      placeholder="John Doe"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      className="form-control"
                      placeholder="San Francisco"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input
                      className="form-control"
                      placeholder="USA"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Terms</label>
                  <select
                    className="form-control"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Registering..." : "Register Vendor"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Supplier Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {editSupplier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card"
              style={{ width: 540, padding: 24, maxHeight: "90vh", overflowY: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Supplier</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{editSupplier.supplier_code}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditSupplier(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateSupplier} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    className="form-control"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      className="form-control"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Risk Level</label>
                    <select
                      className="form-control"
                      value={formData.risk_level}
                      onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <select
                      className="form-control"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    >
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      className="form-control"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input
                      className="form-control"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditSupplier(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Supplier Detail Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {viewSupplier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card"
              style={{ width: 540, padding: 28, maxHeight: "90vh", overflowY: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viewSupplier.company_name}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Supplier Code: {viewSupplier.supplier_code}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewSupplier(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Company Name", viewSupplier.company_name],
                  ["Supplier Code", viewSupplier.supplier_code],
                  ["Contact Person", viewSupplier.contact_person || "N/A"],
                  ["Email", viewSupplier.email],
                  ["Phone", viewSupplier.phone || "N/A"],
                  ["Category", viewSupplier.category],
                  ["Location", viewSupplier.city ? `${viewSupplier.city}, ${viewSupplier.country}` : viewSupplier.country || "Global"],
                  ["Payment Terms", viewSupplier.payment_terms || "Net 30"],
                  ["Overall Rating", `${(viewSupplier.overall_rating || 0).toFixed(1)} / 5.0`],
                  ["Quality Score", `${(viewSupplier.quality_score || 0).toFixed(1)} / 5.0`],
                  ["Delivery Score", `${(viewSupplier.delivery_score || 0).toFixed(1)} / 5.0`],
                  ["Price Score", `${(viewSupplier.price_score || 0).toFixed(1)} / 5.0`],
                  ["Historical Spend", `$${((viewSupplier.total_spend || 0) / 1e3).toLocaleString()}k`],
                  ["Total Orders", viewSupplier.total_orders || 0],
                  ["On-Time Delivery", `${viewSupplier.on_time_delivery_rate || 90}%`],
                  ["Risk Score", `${viewSupplier.risk_score || 0}/100 (${viewSupplier.risk_level || "low"})`],
                  ["Status", viewSupplier.status],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--bg-app)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setViewSupplier(null)}>Close</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenEdit(viewSupplier);
                    setViewSupplier(null);
                  }}
                >
                  Edit Supplier
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteSupplier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card"
              style={{ width: 440, padding: 24 }}
            >
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Supplier?</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                  Are you sure you want to delete <strong>{deleteSupplier.company_name}</strong> ({deleteSupplier.supplier_code})?
                  This record will be removed from your active vendor list.
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button className="btn btn-secondary" onClick={() => setDeleteSupplier(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ background: "#ef4444", color: "#fff", border: "none" }}
                    onClick={handleDeleteSupplier}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Deleting..." : "Delete Vendor"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
