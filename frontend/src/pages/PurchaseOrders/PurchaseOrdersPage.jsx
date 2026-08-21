import { useAuth } from '../../contexts/AuthContext';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdAdd,
  MdSearch,
  MdSend,
  MdCheckCircle,
  MdCancel,
  MdVisibility,
  MdClose,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdFormatListBulleted,
  MdRemoveCircle
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function PurchaseOrdersPage() {
  const { canApprovePO, canCreateProcurement, isAuditor, isSupplier } = useAuth();

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPO, setEditPO] = useState(null);
  const [viewPO, setViewPO] = useState(null);
  const [deletePO, setDeletePO] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    supplier_id: "",
    delivery_address: "Main Office Warehouse, Gate 4",
    payment_terms: "Net 30",
    expected_delivery_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    notes: "",
    items: [
      { item_name: "", quantity_ordered: 1, unit_price: 1000, discount_rate: 0, tax_rate: 10 }
    ]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Purchase Orders from Real API ─────────────────────────────────────
  const { data: serverOrders, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["purchase-orders", search, statusFilter],
    queryFn: async () => {
      const res = await api.get("/purchase-orders/", {
        params: { search: search || undefined, status: statusFilter || undefined }
      });
      return res.data;
    },
    retry: false,
  });

  // ── Fetch Suppliers for Dropdown ───────────────────────────────────────────
  const { data: availableSuppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const res = await api.get("/suppliers/");
      return res.data;
    }
  });

  // ── Fetch RFQs for conversion ──────────────────────────────────────────────
  const { data: rfqsList } = useQuery({
    queryKey: ["rfqs-list"],
    queryFn: async () => {
      const res = await api.get("/rfqs/");
      return res.data;
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      supplier_id: availableSuppliers?.length ? availableSuppliers[0].id : "",
      delivery_address: "Main Office Warehouse, Gate 4",
      payment_terms: "Net 30",
      expected_delivery_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      notes: "",
      items: [
        { item_name: "", quantity_ordered: 1, unit_price: 1000, discount_rate: 0, tax_rate: 10 }
      ]
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_name: "", quantity_ordered: 1, unit_price: 1000, discount_rate: 0, tax_rate: 10 }
      ]
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;
    setFormData({ ...formData, items: updated });
  };

  // ── Create Purchase Order ──────────────────────────────────────────────────
  const handleCreatePO = async (e, asDraft = true) => {
    e?.preventDefault();
    if (!formData.title || formData.title.trim().length < 3) {
      toast.error("PO Title is required (min 3 chars)");
      return;
    }
    if (!formData.supplier_id) {
      toast.error("Please select a Supplier");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/purchase-orders/?as_draft=${asDraft}`, formData);
      toast.success(`Purchase Order ${res.data.po_number} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create Purchase Order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit Purchase Order ────────────────────────────────────────────────────
  const handleOpenEdit = async (po) => {
    try {
      const res = await api.get(`/purchase-orders/${po.id}`);
      const detail = res.data;
      setEditPO(detail);
      setFormData({
        title: detail.title || "",
        supplier_id: detail.supplier_id || "",
        delivery_address: detail.delivery_address || "",
        payment_terms: detail.payment_terms || "Net 30",
        expected_delivery_date: detail.expected_delivery_date || "",
        notes: detail.notes || "",
        items: detail.items?.length
          ? detail.items.map((it) => ({
              item_name: it.item_name,
              quantity_ordered: it.quantity_ordered,
              unit_price: it.unit_price,
              discount_rate: it.discount_rate || 0,
              tax_rate: it.tax_rate || 0
            }))
          : [{ item_name: detail.title, quantity_ordered: 1, unit_price: detail.total_amount, discount_rate: 0, tax_rate: 0 }]
      });
    } catch {
      setEditPO(po);
      setFormData({
        title: po.title || "",
        supplier_id: po.supplier_id || "",
        delivery_address: po.delivery_address || "",
        payment_terms: po.payment_terms || "Net 30",
        expected_delivery_date: po.expected_delivery_date || "",
        notes: po.notes || "",
        items: [{ item_name: po.title, quantity_ordered: 1, unit_price: po.total_amount, discount_rate: 0, tax_rate: 0 }]
      });
    }
  };

  const handleUpdatePO = async (e) => {
    e.preventDefault();
    if (!editPO) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/purchase-orders/${editPO.id}`, formData);
      toast.success(`Purchase Order ${editPO.po_number} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setEditPO(null);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update Purchase Order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Status Action Handlers ──────────────────────────────────────────────────
  const handleSubmitForApproval = async (po) => {
    try {
      await api.post(`/purchase-orders/${po.id}/submit`);
      toast.success(`PO ${po.po_number} submitted for approval!`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit PO");
    }
  };

  const handleApprovePO = async (po) => {
    try {
      await api.post(`/purchase-orders/${po.id}/approve`);
      toast.success(`PO ${po.po_number} approved!`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to approve PO");
    }
  };

  const handleRejectPO = async (po) => {
    try {
      await api.post(`/purchase-orders/${po.id}/reject`);
      toast.success(`PO ${po.po_number} rejected.`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reject PO");
    }
  };

  const handleSendPO = async (po) => {
    try {
      await api.post(`/purchase-orders/${po.id}/send`);
      toast.success(`PO ${po.po_number} issued and sent to supplier!`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (viewPO) setViewPO(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send PO");
    }
  };

  const handleCancelPO = async (po) => {
    try {
      await api.post(`/purchase-orders/${po.id}/cancel`);
      toast.success(`PO ${po.po_number} cancelled.`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (viewPO) setViewPO(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to cancel PO");
    }
  };

  const handleDeletePO = async () => {
    if (!deletePO) return;
    try {
      await api.delete(`/purchase-orders/${deletePO.id}`);
      toast.success(`PO ${deletePO.po_number} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setDeletePO(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete PO");
    }
  };

  const handleViewPO = async (po) => {
    try {
      const res = await api.get(`/purchase-orders/${po.id}`);
      setViewPO(res.data);
    } catch {
      setViewPO(po);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Purchase Orders (PO)</h1>
          <p className="page-subtitle">Create legally binding purchase orders, route for approval, issue to suppliers, and track fulfillment.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <MdRefresh fontSize={18} /> {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          {canCreateProcurement && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <MdAdd fontSize={18} /> Create New PO
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 16, alignItems: "center" }}>
        <div className="search-bar" style={{ width: 320, flex: 1 }}>
          <MdSearch style={{ color: "var(--text-muted)" }} />
          <input
            className="search-input"
            placeholder="Search PO number or title..."
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
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="issued">Issued / Sent</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 24, borderColor: "#ef4444" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Failed to load Purchase Orders</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {error?.response?.data?.detail || error?.message || "Database connection error"}
          </p>
          <button className="btn btn-primary" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Order Title</th>
                <th>Supplier</th>
                <th>Total Value</th>
                <th>Issued Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading purchase orders...</td></tr>
              ) : !serverOrders || serverOrders.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No purchase orders found. Click <strong>Create New PO</strong> to issue an order.</td></tr>
              ) : (
                serverOrders.map((po) => (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{po.po_number}</td>
                    <td style={{ fontWeight: 600 }}>{po.title}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{po.supplier_name || po.supplier?.company_name}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                      ${(po.total_amount || 0).toLocaleString()} {po.currency || "USD"}
                    </td>
                    <td>{po.issued_at ? new Date(po.issued_at).toLocaleDateString() : "Not Issued"}</td>
                    <td>
                      <span className={`badge badge-${
                        po.status === "issued" ? "success" :
                        po.status === "approved" ? "primary" :
                        po.status === "pending_approval" ? "warning" :
                        po.status === "rejected" || po.status === "cancelled" ? "danger" : "gray"
                      }`} style={{ textTransform: "capitalize" }}>
                        {po.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleViewPO(po)} title="View PO Details">
                          <MdVisibility fontSize={16} /> View
                        </button>

                        {po.status === "draft" && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => handleSubmitForApproval(po)} title="Submit for Approval">
                              Submit
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(po)} title="Edit Draft PO">
                              <MdEdit fontSize={16} />
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }} onClick={() => setDeletePO(po)} title="Delete Draft PO">
                              <MdDelete fontSize={16} />
                            </button>
                          </>
                        )}

                        {po.status === "pending_approval" && canApprovePO && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => handleApprovePO(po)} title="Approve PO">
                              Approve
                            </button>
                            <button className="btn btn-danger btn-sm" style={{ background: "#ef4444", color: "#fff", border: "none" }} onClick={() => handleRejectPO(po)} title="Reject PO">
                              Reject
                            </button>
                          </>
                        )}


                        {(po.status === "approved" || po.status === "draft") && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleSendPO(po)} title="Issue & Send PO to Supplier">
                            <MdSend /> Send PO
                          </button>
                        )}

                        {po.status === "issued" && (
                          <button className="btn btn-danger btn-sm" style={{ background: "#ef4444", color: "#fff", border: "none" }} onClick={() => handleCancelPO(po)} title="Cancel PO">
                            <MdCancel /> Cancel
                          </button>
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

      {/* ── Create Purchase Order Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 640, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Create Purchase Order (PO)</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">PO Title *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Enterprise Laptops & Server Equipment Purchase Order"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Supplier *</label>
                    <select
                      className="form-control"
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Supplier --</option>
                      {availableSuppliers?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.company_name} ({s.supplier_code})
                        </option>
                      ))}
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
                      <option value="2% 10 Net 30">2% 10 Net 30</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Delivery Address</label>
                    <input
                      className="form-control"
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Delivery Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Line Items Editor */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      <MdFormatListBulleted /> Line Items (Financial Totals Calculated Server-Side)
                    </label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddItem}>
                      <MdAdd /> Add Item
                    </button>
                  </div>

                  {formData.items.map((item, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 6, marginBottom: 8, alignItems: "center" }}>
                      <input
                        className="form-control"
                        placeholder="Item name"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, "item_name", e.target.value)}
                      />
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        placeholder="Qty"
                        value={item.quantity_ordered}
                        onChange={(e) => handleItemChange(idx, "quantity_ordered", Math.max(1, Number(e.target.value)))}
                      />
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Unit Price ($)"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, "unit_price", Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Disc %"
                        value={item.discount_rate}
                        onChange={(e) => handleItemChange(idx, "discount_rate", Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Tax %"
                        value={item.tax_rate}
                        onChange={(e) => handleItemChange(idx, "tax_rate", Number(e.target.value))}
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

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isSubmitting}
                    onClick={(e) => handleCreatePO(e, true)}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                    onClick={(e) => handleCreatePO(e, false)}
                  >
                    {isSubmitting ? "Creating..." : "Submit PO for Approval"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Purchase Order Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {editPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 620, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Purchase Order</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{editPO.po_number}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditPO(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleUpdatePO} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">PO Title *</label>
                  <input
                    className="form-control"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Delivery Address</label>
                    <input
                      className="form-control"
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <input
                      className="form-control"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditPO(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View PO Detail Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 560, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viewPO.po_number}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{viewPO.title}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewPO(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Supplier", viewPO.supplier_name || viewPO.supplier?.company_name],
                  ["Status", viewPO.status],
                  ["Subtotal", `$${(viewPO.subtotal || 0).toLocaleString()}`],
                  ["Discount Amount", `-$${(viewPO.discount_amount || 0).toLocaleString()}`],
                  ["Tax Amount", `+$${(viewPO.tax_amount || 0).toLocaleString()}`],
                  ["Total Amount (Server Calculated)", `$${(viewPO.total_amount || 0).toLocaleString()} ${viewPO.currency || "USD"}`],
                  ["Payment Terms", viewPO.payment_terms || "Net 30"],
                  ["Delivery Address", viewPO.delivery_address || "Default Warehouse"],
                  ["Issued Date", viewPO.issued_at ? new Date(viewPO.issued_at).toLocaleDateString() : "Not Issued"],
                  ["Expected Delivery", viewPO.expected_delivery_date || "N/A"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--bg-app)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 140 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Line items table */}
              {viewPO.items && viewPO.items.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Line Items Breakdown</h4>
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewPO.items.map((it, i) => (
                        <tr key={i}>
                          <td>{it.item_name}</td>
                          <td>{it.quantity_ordered}</td>
                          <td>${it.unit_price}</td>
                          <td style={{ fontWeight: 700 }}>${it.total_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setViewPO(null)}>Close</button>
                {viewPO.status === "approved" || viewPO.status === "draft" ? (
                  <button className="btn btn-primary" onClick={() => handleSendPO(viewPO)}>
                    <MdSend /> Issue & Send PO
                  </button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {deletePO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 440, padding: 24 }}>
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Purchase Order?</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                  Are you sure you want to delete draft <strong>{deletePO.po_number}</strong>?
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button className="btn btn-secondary" onClick={() => setDeletePO(null)}>Cancel</button>
                  <button className="btn btn-danger" style={{ background: "#ef4444", color: "#fff", border: "none" }} onClick={handleDeletePO}>
                    Delete PO
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
