import { useAuth } from '../../contexts/AuthContext';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdAdd,
  MdSearch,
  MdSend,
  MdEdit,
  MdDelete,
  MdCancel,
  MdClose,
  MdVisibility,
  MdRefresh,
  MdBusiness,
  MdFormatListBulleted,
  MdRemoveCircle
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function RFQPage() {
  const { canCreateProcurement, isAuditor, isSupplier } = useAuth();

  const queryClient = useQueryClient();

  // Filters & State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRFQ, setEditRFQ] = useState(null);
  const [viewRFQ, setViewRFQ] = useState(null);
  const [deleteRFQ, setDeleteRFQ] = useState(null);

  // Form State for Create/Edit RFQ
  const [formData, setFormData] = useState({
    title: "",
    category: "IT Hardware",
    description: "",
    requirements: "",
    estimated_value: 50000,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    items: [{ name: "", qty: 1, specs: "" }],
    selected_suppliers: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Suppliers for Selection Drawer ────────────────────────────────────
  const { data: availableSuppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const res = await api.get("/suppliers/?limit=100");
      return res.data;
    },
  });

  // ── Fetch Approved PRs for link option ──────────────────────────────────────
  const { data: approvedPRs } = useQuery({
    queryKey: ["approved-prs"],
    queryFn: async () => {
      const res = await api.get("/purchase-requests/?status=approved");
      return res.data;
    },
  });

  // ── Fetch RFQs from Real API (No Mock Data) ─────────────────────────────────
  const { data: rfqs, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["rfqs", search, statusFilter],
    queryFn: async () => {
      const res = await api.get("/rfqs/", {
        params: { search: search || undefined, status: statusFilter || undefined },
      });
      return res.data;
    },
    retry: false,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      category: "IT Hardware",
      description: "",
      requirements: "",
      estimated_value: 50000,
      deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      items: [{ name: "", qty: 1, specs: "" }],
      selected_suppliers: [],
    });
  };

  // Item row operations
  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: "", qty: 1, specs: "" }],
    });
  };

  const handleRemoveItem = (index) => {
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;
    setFormData({ ...formData, items: updated });
  };

  // Supplier selection operations
  const handleToggleSupplier = (supplierId) => {
    const current = formData.selected_suppliers || [];
    if (current.includes(supplierId)) {
      setFormData({ ...formData, selected_suppliers: current.filter((id) => id !== supplierId) });
    } else {
      setFormData({ ...formData, selected_suppliers: [...current, supplierId] });
    }
  };

  // ── Create RFQ ─────────────────────────────────────────────────────────────
  const handleCreateRFQ = async (e) => {
    e.preventDefault();
    if (!formData.title || formData.title.trim().length < 3) {
      toast.error("RFQ Title is required (min 3 chars)");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/rfqs/", formData);
      toast.success("RFQ created successfully in DRAFT status!");
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create RFQ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit RFQ ───────────────────────────────────────────────────────────────
  const handleOpenEdit = async (rfq) => {
    try {
      const res = await api.get(`/rfqs/${rfq.id}`);
      const detailed = res.data;
      setEditRFQ(detailed);
      setFormData({
        title: detailed.title || "",
        category: detailed.category || "IT Hardware",
        description: detailed.description || "",
        requirements: detailed.requirements || "",
        estimated_value: detailed.estimated_value || 50000,
        deadline: detailed.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        items: detailed.items?.length ? detailed.items : [{ name: "", qty: 1, specs: "" }],
        selected_suppliers: detailed.selected_suppliers?.map((s) => s.id) || [],
      });
    } catch {
      setEditRFQ(rfq);
      setFormData({
        title: rfq.title || "",
        category: rfq.category || "IT Hardware",
        description: rfq.description || "",
        requirements: rfq.requirements || "",
        estimated_value: rfq.estimated_value || 50000,
        deadline: rfq.deadline || "",
        items: [{ name: rfq.title, qty: 1, specs: "" }],
        selected_suppliers: [],
      });
    }
  };

  const handleUpdateRFQ = async (e) => {
    e.preventDefault();
    if (!editRFQ) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/rfqs/${editRFQ.id}`, formData);
      toast.success(`RFQ ${editRFQ.rfq_number} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      setEditRFQ(null);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update RFQ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Send RFQ to Vendors ─────────────────────────────────────────────────────
  const handleSendRFQ = async (rfqId, rfqNumber) => {
    try {
      await api.post(`/rfqs/${rfqId}/send`);
      toast.success(`RFQ ${rfqNumber} published and sent to suppliers!`);
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send RFQ");
    }
  };

  // ── Cancel RFQ ─────────────────────────────────────────────────────────────
  const handleCancelRFQ = async (rfqId, rfqNumber) => {
    try {
      await api.post(`/rfqs/${rfqId}/cancel`);
      toast.success(`RFQ ${rfqNumber} cancelled.`);
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to cancel RFQ");
    }
  };

  // ── Delete RFQ ─────────────────────────────────────────────────────────────
  const handleDeleteRFQ = async () => {
    if (!deleteRFQ) return;
    try {
      await api.delete(`/rfqs/${deleteRFQ.id}`);
      toast.success(`RFQ ${deleteRFQ.rfq_number} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      setDeleteRFQ(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete RFQ");
    }
  };

  // ── View RFQ Details ───────────────────────────────────────────────────────
  const handleViewRFQ = async (rfq) => {
    try {
      const res = await api.get(`/rfqs/${rfq.id}`);
      setViewRFQ(res.data);
    } catch {
      setViewRFQ(rfq);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">RFQ Management & Sourcing</h1>
          <p className="page-subtitle">Create competitive requests for quotation, select suppliers, add items, and track responses.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <MdRefresh fontSize={18} /> {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          {canCreateProcurement && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <MdAdd fontSize={18} /> Launch New RFQ
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 16, alignItems: "center" }}>
        <div className="search-bar" style={{ width: 320, flex: 1 }}>
          <MdSearch style={{ color: "var(--text-muted)" }} />
          <input
            className="search-input"
            placeholder="Search RFQs by number or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent to Vendors</option>
          <option value="responses_received">Responses Received</option>
          <option value="awarded">Awarded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Error Card */}
      {isError && (
        <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 24, borderColor: "#ef4444" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Failed to load RFQs</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {error?.response?.data?.detail || error?.message || "Database connection error"}
          </p>
          <button className="btn btn-primary" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* RFQ Table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>RFQ Number</th>
                <th>Title</th>
                <th>Est. Value</th>
                <th>Quotations</th>
                <th>Deadline</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading RFQ database...</td></tr>
              ) : rfqs?.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No RFQs found.</td></tr>
              ) : (
                rfqs?.map((rfq) => (
                  <tr key={rfq.id}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{rfq.rfq_number}</td>
                    <td style={{ fontWeight: 600 }}>{rfq.title}</td>
                    <td style={{ fontWeight: 700 }}>${(rfq.estimated_value || 0).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-primary">{rfq.response_count || 0} Bids Received</span>
                    </td>
                    <td>{rfq.deadline || "Open"}</td>
                    <td>
                      <span className={`badge badge-${rfq.status === "responses_received" ? "success" : rfq.status === "sent" ? "info" : rfq.status === "cancelled" ? "danger" : "gray"}`} style={{ textTransform: "capitalize" }}>
                        {rfq.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleViewRFQ(rfq)} title="View Details">
                          <MdVisibility fontSize={16} /> Details
                        </button>

                        {rfq.status === "draft" && canCreateProcurement && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleSendRFQ(rfq.id, rfq.rfq_number)}
                              title="Send RFQ to Suppliers"
                            >
                              <MdSend /> Send
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenEdit(rfq)}
                              title="Edit RFQ"
                            >
                              <MdEdit fontSize={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#ef4444" }}
                              onClick={() => setDeleteRFQ(rfq)}
                              title="Delete RFQ"
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
      </div>

      {/* ── Launch / Create RFQ Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 620, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Launch New RFQ</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleCreateRFQ} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* PR Link option */}
                {approvedPRs && approvedPRs.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Link Approved Purchase Request (Optional)</label>
                    <select
                      className="form-control"
                      onChange={(e) => {
                        const selectedPR = approvedPRs.find((p) => p.id === e.target.value);
                        if (selectedPR) {
                          setFormData({
                            ...formData,
                            purchase_request_id: selectedPR.id,
                            title: `RFQ for ${selectedPR.title}`,
                            estimated_value: selectedPR.estimated_amount,
                            category: selectedPR.category || "IT Hardware",
                          });
                        }
                      }}
                    >
                      <option value="">-- Standalone RFQ (No PR Link) --</option>
                      {approvedPRs.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.pr_number} — {pr.title} (${pr.estimated_amount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">RFQ Title *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Q4 Server & Network Hardware Sourcing"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Est. Budget ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Submission Deadline</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                {/* Scope & Requirements */}
                <div className="form-group">
                  <label className="form-label">Requirements / Scope of Work</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Provide technical specs, delivery timeline, or compliance rules..."
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  />
                </div>

                {/* RFQ Line Items */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      <MdFormatListBulleted /> Line Items
                    </label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddItem}>
                      <MdAdd /> Add Line Item
                    </button>
                  </div>

                  {formData.items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <input
                        className="form-control"
                        placeholder="Item name / spec"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                        style={{ flex: 2 }}
                      />
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, "qty", Math.max(1, Number(e.target.value)))}
                        style={{ width: 80 }}
                      />
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#ef4444", padding: 4 }}
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <MdRemoveCircle fontSize={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Supplier Selection */}
                {availableSuppliers && availableSuppliers.length > 0 && (
                  <div>
                    <label className="form-label" style={{ marginBottom: 6 }}>
                      <MdBusiness /> Select Suppliers to Invite ({formData.selected_suppliers.length} selected)
                    </label>
                    <div style={{ maxHeight: 120, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: 8, padding: 8 }}>
                      {availableSuppliers.map((s) => (
                        <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", fontSize: 13, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={formData.selected_suppliers.includes(s.id)}
                            onChange={() => handleToggleSupplier(s.id)}
                          />
                          <span style={{ fontWeight: 600 }}>{s.company_name}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({s.category} | {s.email})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create RFQ Draft"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit RFQ Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editRFQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 620, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit RFQ</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{editRFQ.rfq_number}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditRFQ(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateRFQ} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">RFQ Title *</label>
                  <input
                    className="form-control"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Est. Budget ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Submission Deadline</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Requirements / Scope</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditRFQ(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Detail Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewRFQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 540, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viewRFQ.rfq_number}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{viewRFQ.title}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewRFQ(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Status", viewRFQ.status],
                  ["Estimated Budget", `$${(viewRFQ.estimated_value || 0).toLocaleString()}`],
                  ["Deadline", viewRFQ.deadline || "Open"],
                  ["Bids Received", `${viewRFQ.response_count || 0} Bid(s)`],
                  ["Issue Date", viewRFQ.issue_date ? new Date(viewRFQ.issue_date).toLocaleDateString() : "Not Issued"],
                  ["Requirements", viewRFQ.requirements || "Standard Specification"],
                  ["Invited Suppliers", viewRFQ.selected_suppliers?.map((s) => s.company_name).join(", ") || "None Selected"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--bg-app)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 140 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setViewRFQ(null)}>Close</button>
                {viewRFQ.status === "draft" && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      handleSendRFQ(viewRFQ.id, viewRFQ.rfq_number);
                      setViewRFQ(null);
                    }}
                  >
                    <MdSend /> Publish & Send RFQ
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteRFQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 440, padding: 24 }}>
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete RFQ?</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                  Are you sure you want to delete draft <strong>{deleteRFQ.rfq_number}</strong>?
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button className="btn btn-secondary" onClick={() => setDeleteRFQ(null)}>Cancel</button>
                  <button
                    className="btn btn-danger"
                    style={{ background: "#ef4444", color: "#fff", border: "none" }}
                    onClick={handleDeleteRFQ}
                  >
                    Delete RFQ
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
