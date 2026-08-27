import { useAuth } from '../../contexts/AuthContext';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdSearch,
  MdCheckCircle,
  MdWarning,
  MdAutoAwesome,
  MdClose,
  MdVisibility,
  MdErrorOutline,
  MdCloudUpload,
  MdRefresh,
  MdAdd,
  MdDelete,
  MdRemoveCircle
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function InvoicesPage() {
  const { canApproveInvoice, canCreateProcurement, isAuditor, isSupplier } = useAuth();

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [auditInvoice, setAuditInvoice] = useState(null);
  const [deleteInvoice, setDeleteInvoice] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fraudRiskData, setFraudRiskData] = useState(null);
  const [isLoadingFraudRisk, setIsLoadingFraudRisk] = useState(false);

  const handleDeleteInvoice = async (invoiceId) => {
    setIsDeleting(true);
    try {
      await api.delete(`/invoices/${invoiceId}`);
      toast.success("Invoice deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
      setDeleteInvoice(null);
      if (viewInvoice?.id === invoiceId) setViewInvoice(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenFraudAudit = async (inv) => {
    setAuditInvoice(inv);
    setIsLoadingFraudRisk(true);
    setFraudRiskData(null);
    try {
      const res = await api.get(`/invoices/${inv.id}/fraud-risk`);
      setFraudRiskData(res.data);
    } catch (err) {
      toast.error("Failed to fetch detailed AI Fraud Risk analysis");
    } finally {
      setIsLoadingFraudRisk(false);
    }
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [ocrError, setOcrError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Manual Create Invoice Form State
  const [formData, setFormData] = useState({
    invoice_number: "",
    supplier_id: "",
    purchase_order_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    subtotal: "",
    tax_amount: "",
    discount_amount: "",
    notes: "",
    line_items: [
      { item_name: "", quantity: "", unit_price: "" }
    ],
  });

  const handlePOChange = (poId) => {
    const selectedPO = purchaseOrders?.find((po) => po.id === poId);
    if (selectedPO) {
      const items = (selectedPO.items && selectedPO.items.length > 0)
        ? selectedPO.items.map((it) => ({
            item_name: it.item_name || "",
            quantity: it.quantity_ordered || 1,
            unit_price: it.unit_price || 0
          }))
        : [{ item_name: selectedPO.title || "PO Item", quantity: 1, unit_price: selectedPO.subtotal || selectedPO.total_amount }];

      const subtotalCalc = items.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unit_price)), 0);

      setFormData(f => ({
        ...f,
        purchase_order_id: poId,
        supplier_id: selectedPO.supplier_id || f.supplier_id,
        subtotal: subtotalCalc || selectedPO.subtotal || selectedPO.total_amount,
        tax_amount: selectedPO.tax_amount || 0,
        discount_amount: selectedPO.discount_amount || 0,
        line_items: items
      }));
    } else {
      setFormData(f => ({
        ...f,
        purchase_order_id: poId
      }));
    }
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...formData.line_items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    const newSubtotal = newItems.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0);
    setFormData(f => ({
      ...f,
      line_items: newItems,
      subtotal: newSubtotal > 0 ? newSubtotal : f.subtotal
    }));
  };

  const handleAddItem = () => {
    setFormData(f => ({
      ...f,
      line_items: [...f.line_items, { item_name: "", quantity: "", unit_price: "" }]
    }));
  };

  const handleRemoveItem = (idx) => {
    const newItems = formData.line_items.filter((_, i) => i !== idx);
    const newSubtotal = newItems.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0);
    setFormData(f => ({
      ...f,
      line_items: newItems.length > 0 ? newItems : [{ item_name: "", quantity: "", unit_price: "" }],
      subtotal: newSubtotal > 0 ? newSubtotal : ""
    }));
  };

  // ── Fetch Invoices from Backend API ─────────────────────────────────────────
  const { data: invoices, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["invoices-list", search, statusFilter],
    queryFn: async () => {
      const res = await api.get("/invoices/", {
        params: { search: search || undefined, status: statusFilter || undefined }
      });
      return res.data;
    },
    retry: false,
  });

  // ── Fetch Suppliers for Dropdown ───────────────────────────────────────────
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const res = await api.get("/suppliers/");
      return res.data;
    }
  });

  // ── Fetch Purchase Orders for Matching ─────────────────────────────────────
  const { data: purchaseOrders } = useQuery({
    queryKey: ["purchase-orders-list"],
    queryFn: async () => {
      const res = await api.get("/purchase-orders/");
      return res.data;
    }
  });

  // ── Upload File to OCR Endpoint ────────────────────────────────────────────
  const handleFileUploadOCR = async (fileToUpload) => {
    if (!fileToUpload) return;
    setOcrError("");
    setIsUploading(true);

    const data = new FormData();
    data.append("file", fileToUpload);

    try {
      const res = await api.post("/invoices/upload-ocr", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("OCR Extraction Completed!");
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
      setIsScanModalOpen(false);
    } catch (err) {
      const detail = err?.response?.data?.detail || "OCR Upload failed.";
      setOcrError(detail);
      toast.error(detail);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Create Invoice ─────────────────────────────────────────────────────────
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!formData.invoice_number) {
      toast.error("Invoice number is required");
      return;
    }
    if (!formData.supplier_id) {
      toast.error("Supplier selection is required");
      return;
    }
    if (!formData.subtotal || Number(formData.subtotal) <= 0) {
      toast.error("Subtotal must be greater than $0");
      return;
    }

    try {
      const res = await api.post("/invoices/", formData);
      toast.success(`Invoice ${res.data.invoice_number} created and 3-way matched!`);
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
      setIsCreateModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create invoice");
    }
  };

  // ── Approve Invoice ────────────────────────────────────────────────────────
  const handleApproveInvoice = async (invoiceId) => {
    try {
      await api.post(`/invoices/${invoiceId}/approve`);
      toast.success("Invoice approved for payment!");
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
      if (auditInvoice) setAuditInvoice(null);
      if (viewInvoice) setViewInvoice(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to approve invoice");
    }
  };

  // ── Pay Invoice ────────────────────────────────────────────────────────────
  const handlePayInvoice = async (invoiceId) => {
    try {
      await api.post(`/invoices/${invoiceId}/pay`);
      toast.success("Invoice marked as PAID!");
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
      if (viewInvoice) setViewInvoice(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to process payment");
    }
  };

  const flaggedInvoice = invoices?.find((inv) => inv.fraud_risk_score > 30 || inv.matching_status === "Discrepancy");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Invoice Verification </h1>
          <p className="page-subtitle">Automated PO matching, goods receipt audit, secure OCR upload, and fraud risk verification.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <MdRefresh fontSize={18} /> {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn btn-secondary" onClick={() => setIsCreateModalOpen(true)}>
            <MdAdd fontSize={18} /> Create Invoice
          </button>
          <button className="btn btn-primary" onClick={() => { setOcrError(""); setIsScanModalOpen(true); }}>
            <MdAutoAwesome fontSize={18} /> Scan Invoice (AI OCR)
          </button>
        </div>
      </div>

      {/* Fraud Alert Panel */}
      {flaggedInvoice && (
        <div className="card" style={{
          padding: 20,
          marginBottom: 24,
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--danger-light)",
              color: "var(--danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22
            }}>
              <MdWarning />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                High Risk Invoice Discrepancy Flagged
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Invoice <strong>{flaggedInvoice.invoice_number}</strong> ({flaggedInvoice.po_number}) flagged with risk score {flaggedInvoice.fraud_risk_score}%.
              </div>
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => setAuditInvoice(flaggedInvoice)}>
            Audit Flagged Invoice
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 16, alignItems: "center" }}>
        <div className="search-bar" style={{ width: 320, flex: 1 }}>
          <MdSearch style={{ color: "var(--text-muted)" }} />
          <input
            className="search-input"
            placeholder="Search invoice number, PO, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-control"
          style={{ width: 170 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="matched">Matched</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 24, borderColor: "#ef4444" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Failed to load Invoices</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {error?.response?.data?.detail || error?.message || "Database connection error"}
          </p>
          <button className="btn btn-primary" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Invoices Table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>PO Reference</th>
                <th>Supplier</th>
                <th>Invoice Date</th>
                <th>Total Amount</th>
                <th>Fraud Risk</th>
                <th>3-Way Match</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading invoices...</td></tr>
              ) : !invoices || invoices.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No invoices found. Click <strong>Create Invoice</strong> or <strong>Scan Invoice</strong> to add records.</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{inv.invoice_number}</td>
                    <td style={{ fontWeight: 600 }}>{inv.po_number}</td>
                    <td>{inv.supplier_name}</td>
                    <td>{inv.invoice_date}</td>
                    <td style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                      ${(inv.total_amount || 0).toLocaleString()} {inv.currency || "USD"}
                    </td>
                    <td>
                      <span className={`badge badge-${inv.fraud_risk_score > 30 ? "danger" : "success"}`}>
                        {inv.fraud_risk_score}% Risk
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${inv.matching_status === "3-Way Matched" ? "success" : "warning"}`}>
                        {inv.matching_status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenFraudAudit(inv)} title="Run AI Fraud Audit">
                          🛡️ Audit Risk
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewInvoice(inv)} title="View Invoice">
                          <MdVisibility fontSize={16} /> View
                        </button>
                        {canApproveInvoice && (
                          inv.status === "approved" ? (
                            <button className="btn btn-success btn-sm" onClick={() => handlePayInvoice(inv.id)} title="Process Payment">
                              Pay
                            </button>
                          ) : inv.status !== "paid" ? (
                            <button className="btn btn-primary btn-sm" onClick={() => handleApproveInvoice(inv.id)} title="Approve Payment">
                              Approve
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>PAID ✓</span>
                          )
                        )}
                        {canApproveInvoice && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444" }}
                            onClick={() => setDeleteInvoice(inv)}
                            title="Delete Invoice"
                          >
                            <MdDelete fontSize={16} />
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

      {/* ── AI OCR Scan & File Upload Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {isScanModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 500, padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>AI OCR Invoice Scanner</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsScanModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <div
                style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: 12,
                  padding: 30,
                  textAlign: "center",
                  background: "var(--bg-app)",
                  marginBottom: 16,
                }}
              >
                <MdCloudUpload fontSize={48} style={{ color: "var(--primary)", marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                  Upload Invoice Document
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  Allowed types: PDF, PNG, JPG, JPEG, TIFF (Max 10 MB)
                </div>

                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{ fontSize: 13 }}
                />
              </div>

              {ocrError && (
                <div style={{ padding: 12, borderRadius: 8, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: 12, marginBottom: 16, lineHeight: 1.4 }}>
                  ⚠️ <strong>OCR Configuration Error:</strong> {ocrError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => setIsScanModalOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  disabled={!selectedFile || isUploading}
                  onClick={() => handleFileUploadOCR(selectedFile)}
                >
                  <MdAutoAwesome /> {isUploading ? "Processing OCR..." : "Start OCR Extraction"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manual Create Invoice Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 660, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Create Invoice (3-Way PO Matching)</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsCreateModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Invoice Number *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. INV-2026-9901"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Link Purchase Order (PO)</label>
                    <select
                      className="form-control"
                      style={{ color: "#f1f5f9", background: "#1e293b" }}
                      value={formData.purchase_order_id}
                      onChange={(e) => handlePOChange(e.target.value)}
                    >
                      <option value="">-- Standalone Invoice --</option>
                      {purchaseOrders?.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.po_number} — ${po.total_amount.toLocaleString()} ({po.supplier_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supplier *</label>
                    <select
                      className="form-control"
                      style={{ color: "#f1f5f9", background: "#1e293b" }}
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.company_name} ({s.supplier_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Billed Line Items Section ── */}
                <div className="form-group" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Billed Line Items
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--primary)", fontSize: 12, fontWeight: 600 }}
                      onClick={handleAddItem}
                    >
                      <MdAdd fontSize={16} /> Add Item
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {formData.line_items.map((item, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 40px", gap: 8, alignItems: "center" }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Item description / name"
                          value={item.item_name}
                          onChange={(e) => handleItemChange(idx, "item_name", e.target.value)}
                        />
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="Unit Price ($)"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                        />
                        {formData.line_items.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444", padding: 4 }}
                            onClick={() => handleRemoveItem(idx)}
                            title="Remove item"
                          >
                            <MdRemoveCircle fontSize={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Subtotal ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="e.g. 12000.00"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tax Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="e.g. 0.00"
                      value={formData.tax_amount}
                      onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Total Preview */}
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13
                }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Total Billed Amount:</span>
                  <strong style={{ fontSize: 15, color: "var(--primary)" }}>
                    ${(Number(formData.subtotal || 0) + Number(formData.tax_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    Create & Match Invoice
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Invoice Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 500, padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viewInvoice.invoice_number}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewInvoice(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["PO Reference", viewInvoice.po_number],
                  ["Supplier", viewInvoice.supplier_name],
                  ["Invoice Date", viewInvoice.invoice_date],
                  ["Due Date", viewInvoice.due_date],
                  ["Total Amount", `$${(viewInvoice.total_amount || 0).toLocaleString()} ${viewInvoice.currency || "USD"}`],
                  ["3-Way Match Status", viewInvoice.matching_status],
                  ["AI Fraud Risk Score", `${viewInvoice.fraud_risk_score}%`]
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--bg-app)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setViewInvoice(null)}>Close</button>
                {canApproveInvoice && (
                  viewInvoice.status === "approved" ? (
                    <button className="btn btn-success" onClick={() => handlePayInvoice(viewInvoice.id)}>
                      Pay Invoice
                    </button>
                  ) : viewInvoice.status !== "paid" ? (
                    <button className="btn btn-primary" onClick={() => handleApproveInvoice(viewInvoice.id)}>
                      <MdCheckCircle /> Approve Payment
                    </button>
                  ) : null
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Audit Flagged Invoice Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {auditInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
            onClick={() => { setAuditInvoice(null); setFraudRiskData(null); }}
          >
            <motion.div
              className="card"
              style={{ width: 680, maxWidth: "95vw", padding: 28, maxHeight: "90vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    🛡️ AI Fraud & Risk Audit Review
                  </h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    Invoice: <strong>{auditInvoice.invoice_number}</strong> • Supplier: <strong>{auditInvoice.supplier_name}</strong>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setAuditInvoice(null); setFraudRiskData(null); }}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              {isLoadingFraudRisk ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
                  <div>Computing real-time AI Fraud & Risk metrics from DB history...</div>
                </div>
              ) : (
                <>
                  {/* Risk Score & Level Banner */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: 16, borderRadius: 12, marginBottom: 20,
                    background: (fraudRiskData?.risk_level === "CRITICAL" || fraudRiskData?.risk_level === "HIGH") ? "rgba(239,68,68,0.1)" : (fraudRiskData?.risk_level === "MEDIUM" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)"),
                    border: `1px solid ${(fraudRiskData?.risk_level === "CRITICAL" || fraudRiskData?.risk_level === "HIGH") ? "rgba(239,68,68,0.3)" : (fraudRiskData?.risk_level === "MEDIUM" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)")}`
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>AI FRAUD RISK LEVEL</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: (fraudRiskData?.risk_level === "CRITICAL" || fraudRiskData?.risk_level === "HIGH") ? "#ef4444" : (fraudRiskData?.risk_level === "MEDIUM" ? "#f59e0b" : "#10b981") }}>
                        {fraudRiskData?.risk_level || (auditInvoice.fraud_risk_score > 40 ? "HIGH" : "LOW")} RISK
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: (fraudRiskData?.risk_score || auditInvoice.fraud_risk_score) > 40 ? "#ef4444" : "#10b981" }}>
                        {fraudRiskData?.risk_score ?? auditInvoice.fraud_risk_score}%
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Calculated Risk Score</div>
                    </div>
                  </div>

                  {/* Detectable Risk Reasons */}
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10, textTransform: "uppercase" }}>
                      Detected Risk Signals ({fraudRiskData?.reasons?.length || auditInvoice.fraud_flags?.length || 0})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(fraudRiskData?.reasons || auditInvoice.fraud_flags || []).map((reason, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 8,
                          background: "var(--bg-app)", border: "1px solid var(--border-color)", fontSize: 13
                        }}>
                          <MdErrorOutline style={{ color: reason.toLowerCase().includes("critical") ? "#ef4444" : "#f59e0b", flexShrink: 0, marginTop: 2, fontSize: 16 }} />
                          <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Measurable Supporting Data */}
                  {fraudRiskData?.supporting_data && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10, textTransform: "uppercase" }}>
                        Measurable Supporting Data & History
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                        <div style={{ padding: 12, background: "var(--bg-app)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-muted)" }}>Statistical Z-Score:</span>{" "}
                          <strong style={{ color: fraudRiskData.supporting_data.z_score >= 2.0 ? "#ef4444" : "var(--text-primary)" }}>
                            Z = {fraudRiskData.supporting_data.z_score}
                          </strong>
                        </div>
                        <div style={{ padding: 12, background: "var(--bg-app)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-muted)" }}>Supplier Mean Spend ($\mu$):</span>{" "}
                          <strong>${fraudRiskData.supporting_data.historical_mean?.toLocaleString()}</strong>
                        </div>
                        <div style={{ padding: 12, background: "var(--bg-app)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-muted)" }}>30-Day Duplicate Amounts:</span>{" "}
                          <strong style={{ color: fraudRiskData.supporting_data.same_amount_within_30days_count > 0 ? "#ef4444" : "var(--text-primary)" }}>
                            {fraudRiskData.supporting_data.same_amount_within_30days_count} match(es)
                          </strong>
                        </div>
                        <div style={{ padding: 12, background: "var(--bg-app)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-muted)" }}>7-Day Submission Spike:</span>{" "}
                          <strong>
                            {fraudRiskData.supporting_data.invoices_last_7days} inv ({fraudRiskData.supporting_data.frequency_ratio}x weekly rate)
                          </strong>
                        </div>
                        <div style={{ padding: 12, background: "var(--bg-app)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-muted)" }}>Split Invoice Flags:</span>{" "}
                          <strong style={{ color: fraudRiskData.supporting_data.split_invoice_count > 1 ? "#ef4444" : "var(--text-primary)" }}>
                            {fraudRiskData.supporting_data.split_invoice_count} in $8k-$25k range
                          </strong>
                        </div>
                        <div style={{ padding: 12, background: "var(--bg-app)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-muted)" }}>Max Line Price Variance:</span>{" "}
                          <strong>+{fraudRiskData.supporting_data.max_price_dev_pct}%</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button className="btn btn-secondary" onClick={() => { setAuditInvoice(null); setFraudRiskData(null); }}>Close Review</button>
                    <button className="btn btn-warning" onClick={() => { handleApproveInvoice(auditInvoice.id); setAuditInvoice(null); setFraudRiskData(null); }}>
                      Override & Approve
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {deleteInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 440, padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>
                Delete Invoice?
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>
                Are you sure you want to delete invoice <strong style={{ color: "var(--text-primary)" }}>{deleteInvoice.invoice_number}</strong> (${(deleteInvoice.total_amount || 0).toLocaleString()} USD)? This action will remove it from 3-way matching and reports.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" disabled={isDeleting} onClick={() => setDeleteInvoice(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  style={{ background: "#ef4444", color: "#fff" }}
                  disabled={isDeleting}
                  onClick={() => handleDeleteInvoice(deleteInvoice.id)}
                >
                  {isDeleting ? "Deleting..." : "Delete Invoice"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

