import { useAuth } from '../../contexts/AuthContext';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdAdd,
  MdSearch,
  MdCheckCircle,
  MdCancel,
  MdSend,
  MdEdit,
  MdDelete,
  MdAutoAwesome,
  MdClose,
  MdVisibility,
  MdRefresh,
  MdInsertDriveFile,
  MdChevronLeft,
  MdChevronRight
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function PurchaseRequestsPage() {
  const { canApprovePR, canCreateProcurement, isAuditor, isSupplier } = useAuth();

  const queryClient = useQueryClient();

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editPR, setEditPR] = useState(null);
  const [viewPR, setViewPR] = useState(null);
  const [deletePR, setDeletePR] = useState(null);
  const [rejectPR, setRejectPR] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    justification: "",
    quantity: 1,
    estimated_amount: 1000,
    priority: "medium",
    category: "IT Hardware",
    department: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Purchase Requests (Real API, No Mock Fallback) ────────────────────
  const { data: requests, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["purchase-requests", search, statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await api.get("/purchase-requests/", {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          skip: 0,
          limit: 100,
        },
      });
      return res.data;
    },
    retry: false,
  });

  // Client-side pagination
  const allRequests = requests || [];
  const totalItems = allRequests.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRequests = allRequests.slice((page - 1) * pageSize, page * pageSize);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      justification: "",
      quantity: 1,
      estimated_amount: 1000,
      priority: "medium",
      category: "IT Hardware",
      department: "",
    });
  };

  // ── Create PR (Submit or Save Draft) ────────────────────────────────────────
  const handleSavePR = async (asDraft = false) => {
    if (!formData.title || formData.title.trim().length < 3) {
      toast.error("Please enter a valid request title (min 3 chars)");
      return;
    }
    if (!formData.estimated_amount || formData.estimated_amount <= 0) {
      toast.error("Estimated budget must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        justification: formData.justification,
        priority: formData.priority,
        category: formData.category,
        department: formData.department,
        estimated_amount: Number(formData.estimated_amount),
        currency: "USD",
        items: [
          {
            item_name: formData.title,
            description: formData.description,
            quantity: Number(formData.quantity) || 1,
            unit_price: Number(formData.estimated_amount) / (Number(formData.quantity) || 1),
            category: formData.category,
          },
        ],
      };

      await api.post(`/purchase-requests/?as_draft=${asDraft}`, payload);
      toast.success(asDraft ? "Draft saved successfully!" : "Purchase request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to process request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submit existing DRAFT ───────────────────────────────────────────────────
  const handleSubmitDraft = async (prId) => {
    try {
      await api.post(`/purchase-requests/${prId}/submit`);
      toast.success("Draft request submitted for approval!");
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit draft");
    }
  };

  // ── Edit DRAFT ──────────────────────────────────────────────────────────────
  const handleOpenEdit = (pr) => {
    setEditPR(pr);
    setFormData({
      title: pr.title || "",
      description: pr.description || "",
      justification: pr.justification || "",
      quantity: pr.items?.[0]?.quantity || 1,
      estimated_amount: pr.estimated_amount || 1000,
      priority: pr.priority || "medium",
      category: pr.category || "IT Hardware",
      department: pr.department || "",
    });
  };

  const handleUpdatePR = async (e) => {
    e.preventDefault();
    if (!editPR) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/purchase-requests/${editPR.id}`, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        estimated_amount: Number(formData.estimated_amount),
      });
      toast.success("Purchase request updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      setEditPR(null);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Approve PR ──────────────────────────────────────────────────────────────
  const handleApprovePR = async (prId) => {
    try {
      await api.post(`/purchase-requests/${prId}/approve`);
      toast.success("Purchase request approved!");
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to approve request");
    }
  };

  // ── Reject PR ───────────────────────────────────────────────────────────────
  const handleRejectPR = async () => {
    if (!rejectPR) return;
    try {
      await api.post(`/purchase-requests/${rejectPR.id}/reject?reason=${encodeURIComponent(rejectionReason || "Rejected by approver")}`);
      toast.success("Purchase request rejected.");
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      setRejectPR(null);
      setRejectionReason("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reject request");
    }
  };

  // ── Delete PR ───────────────────────────────────────────────────────────────
  const handleDeletePR = async () => {
    if (!deletePR) return;
    try {
      await api.delete(`/purchase-requests/${deletePR.id}`);
      toast.success("Purchase request deleted.");
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      setDeletePR(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete request");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Purchase Requests (PR)</h1>
          <p className="page-subtitle">Requisition initiation, budget checking, AI price benchmark, and approval workflow.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <MdRefresh fontSize={18} /> {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          {canCreateProcurement && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
              <MdAdd fontSize={18} /> Create Purchase Request
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className="search-bar" style={{ width: 280, flex: 1, minWidth: 200 }}>
          <MdSearch style={{ color: "var(--text-muted)" }} />
          <input
            className="search-input"
            placeholder="Search PR title or number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="form-control"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted / Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          className="form-control"
          style={{ width: 140 }}
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Error display */}
      {isError && (
        <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 24, borderColor: "#ef4444" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Failed to load purchase requests</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {error?.response?.data?.detail || error?.message || "Error fetching data"}
          </p>
          <button className="btn btn-primary" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>PR Number</th>
                <th>Title & Category</th>
                <th>Priority</th>
                <th>Est. Amount</th>
                <th>AI Benchmark</th>
                <th>Requester</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading purchase requests...</td></tr>
              ) : paginatedRequests.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No purchase requests found.</td></tr>
              ) : (
                paginatedRequests.map((pr) => (
                  <tr key={pr.id}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{pr.pr_number}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{pr.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{pr.category || "General"}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${pr.priority === "urgent" || pr.priority === "high" ? "danger" : pr.priority === "medium" ? "warning" : "info"}`} style={{ textTransform: "capitalize" }}>
                        {pr.priority}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>${(pr.estimated_amount || 0).toLocaleString()}</td>
                    <td>
                      <span className="ai-badge" style={{ fontSize: 11 }}>
                        <MdAutoAwesome /> ${(pr.ai_price_estimate || pr.estimated_amount * 0.95).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td>{pr.requester?.full_name || "System User"}</td>
                    <td>
                      <span className={`badge badge-${pr.status === "approved" ? "success" : pr.status === "rejected" ? "danger" : pr.status === "draft" ? "gray" : "warning"}`} style={{ textTransform: "capitalize" }}>
                        {pr.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewPR(pr)} title="View Details">
                          <MdVisibility fontSize={16} /> Details
                        </button>

                        {/* Workflow Action Buttons */}
                        {pr.status === "draft" && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSubmitDraft(pr.id)}
                              title="Submit Draft for Approval"
                            >
                              <MdSend fontSize={14} /> Submit
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenEdit(pr)}
                              title="Edit Draft"
                            >
                              <MdEdit fontSize={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#ef4444" }}
                              onClick={() => setDeletePR(pr)}
                              title="Delete Draft"
                            >
                              <MdDelete fontSize={16} />
                            </button>
                          </>
                        )}

                        {(pr.status === "submitted" || pr.status === "pending_approval") && canApprovePR && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApprovePR(pr.id)}
                              title="Approve Requisition"
                            >
                              <MdCheckCircle /> Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ background: "#ef4444", color: "#fff", border: "none" }}
                              onClick={() => { setRejectPR(pr); setRejectionReason(""); }}
                              title="Reject Requisition"
                            >
                              <MdCancel /> Reject
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
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderTop: "1px solid var(--border-color)",
            fontSize: 13
          }}>
            <div style={{ color: "var(--text-muted)" }}>
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalItems)} of {totalItems} requests
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

      {/* ── Create Modal (Submit or Save Draft) ──────────────────────────────── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 540, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Purchase Request</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsCreateModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Request Title *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. 50 High-Performance Laptops for Engineering Team"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      className="form-control"
                      placeholder="e.g. IT Hardware"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity Required *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, Number(e.target.value)) })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Estimated Budget ($) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.estimated_amount}
                      onChange={(e) => setFormData({ ...formData, estimated_amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-control"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Business Justification</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe why this procurement is required..."
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleSavePR(true)}
                    disabled={isSubmitting}
                  >
                    <MdInsertDriveFile /> Save as Draft
                  </button>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSavePR(false)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit DRAFT Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editPR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 540, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Draft Purchase Request</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{editPR.pr_number}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditPR(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleUpdatePR} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Request Title *</label>
                  <input
                    className="form-control"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Estimated Budget ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.estimated_amount}
                      onChange={(e) => setFormData({ ...formData, estimated_amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-control"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Scope</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditPR(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Draft Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {rejectPR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 460, padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Reject Purchase Request</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                Provide a reason for rejecting <strong>{rejectPR.pr_number}</strong>:
              </p>

              <textarea
                className="form-control"
                rows={3}
                placeholder="Enter rejection reason (required)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setRejectPR(null)}>Cancel</button>
                <button
                  className="btn btn-danger"
                  style={{ background: "#ef4444", color: "#fff", border: "none" }}
                  onClick={handleRejectPR}
                >
                  Reject Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Detail Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewPR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 540, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viewPR.pr_number}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{viewPR.title}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewPR(null)}><MdClose fontSize={20} /></button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Category", viewPR.category || "General"],
                  ["Priority", viewPR.priority],
                  ["Estimated Amount", `$${(viewPR.estimated_amount || 0).toLocaleString()}`],
                  ["AI Price Benchmark", `$${(viewPR.ai_price_estimate || viewPR.estimated_amount * 0.95)?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
                  ["Requested By", viewPR.requester?.full_name || "System User"],
                  ["Department", viewPR.department || "N/A"],
                  ["Status", viewPR.status],
                  ["Submitted Date", viewPR.submitted_at ? new Date(viewPR.submitted_at).toLocaleDateString() : "Draft"],
                  ["Business Justification", viewPR.justification || "N/A"],
                  ["Rejection Reason", viewPR.rejection_reason || "None"],
                  ["Approval Notes", viewPR.approval_notes || "None"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--bg-app)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 140 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setViewPR(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {deletePR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 440, padding: 24 }}>
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Purchase Request?</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                  Are you sure you want to delete draft <strong>{deletePR.pr_number}</strong>?
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button className="btn btn-secondary" onClick={() => setDeletePR(null)}>Cancel</button>
                  <button
                    className="btn btn-danger"
                    style={{ background: "#ef4444", color: "#fff", border: "none" }}
                    onClick={handleDeletePR}
                  >
                    Delete Draft
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
