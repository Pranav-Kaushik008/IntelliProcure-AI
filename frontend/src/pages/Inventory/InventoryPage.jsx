import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdClose,
  MdVisibility,
  MdRefresh,
  MdInput,
  MdOutput,
  MdWarning,
  MdHistory
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [receiveItem, setReceiveItem] = useState(null);
  const [issueItem, setIssueItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    item_name: "",
    category: "IT Hardware",
    description: "",
    quantity_on_hand: 50,
    unit_cost: 250,
    reorder_point: 15,
    reorder_quantity: 50,
    unit_of_measure: "units",
    warehouse_location: "WH-MAIN",
  });

  // Transaction Movement Form State (Receive / Issue)
  const [movementForm, setMovementForm] = useState({
    quantity: 10,
    unit_cost: 0,
    reference_number: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Master Warehouses ────────────────────────────────────────────────
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-list"],
    queryFn: async () => {
      const res = await api.get("/inventory/warehouses");
      return res.data;
    },
  });

  // ── Fetch Real Inventory Data ──────────────────────────────────────────────
  const { data: inventoryItems, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["inventory-list", search, statusFilter, categoryFilter],
    queryFn: async () => {
      const res = await api.get("/inventory/", {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        },
      });
      return res.data;
    },
    retry: false,
  });

  const resetForm = () => {
    setFormData({
      item_name: "",
      category: "IT Hardware",
      description: "",
      quantity_on_hand: 50,
      unit_cost: 250,
      reorder_point: 15,
      reorder_quantity: 50,
      unit_of_measure: "units",
      warehouse_location: warehouses?.length ? warehouses[0].code : "WH-MAIN",
    });
  };

  // ── Create Product Item ────────────────────────────────────────────────────
  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!formData.item_name || formData.item_name.trim().length < 2) {
      toast.error("Product name is required (min 2 chars)");
      return;
    }
    if (formData.quantity_on_hand < 0) {
      toast.error("Initial stock quantity cannot be negative");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/inventory/", formData);
      toast.success(`Inventory item ${res.data.item_code} added successfully!`);
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit Product Item ──────────────────────────────────────────────────────
  const handleOpenEdit = (item) => {
    setEditItem(item);
    setFormData({
      item_name: item.item_name || "",
      category: item.category || "IT Hardware",
      description: item.description || "",
      quantity_on_hand: item.quantity_on_hand || 0,
      unit_cost: item.unit_cost || 0,
      reorder_point: item.reorder_point || 10,
      reorder_quantity: item.reorder_quantity || 50,
      unit_of_measure: item.unit_of_measure || "units",
      warehouse_location: item.warehouse_location || "WH-MAIN",
    });
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/inventory/${editItem.id}`, formData);
      toast.success(`Inventory item ${editItem.item_code} updated!`);
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      setEditItem(null);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Receive Stock (Goods Receipt / Stock-In) ───────────────────────────────
  const handleReceiveStock = async (e) => {
    e.preventDefault();
    if (!receiveItem) return;
    if (movementForm.quantity <= 0) {
      toast.error("Receive quantity must be greater than zero");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/inventory/${receiveItem.id}/receive`, {
        quantity: movementForm.quantity,
        unit_cost: movementForm.unit_cost || receiveItem.unit_cost,
        reference_number: movementForm.reference_number || "GRN-RCV",
        notes: movementForm.notes,
      });
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      setReceiveItem(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to receive stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Issue Stock (Stock-Out / Usage) ────────────────────────────────────────
  const handleIssueStock = async (e) => {
    e.preventDefault();
    if (!issueItem) return;
    if (movementForm.quantity <= 0) {
      toast.error("Issue quantity must be greater than zero");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/inventory/${issueItem.id}/issue`, {
        quantity: movementForm.quantity,
        reference_number: movementForm.reference_number || "ISSUE-OUT",
        notes: movementForm.notes,
      });
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      setIssueItem(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Negative stock prevention check failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── View Details & History ─────────────────────────────────────────────────
  const handleViewDetails = async (item) => {
    try {
      const res = await api.get(`/inventory/${item.id}`);
      const fcRes = await api.get(`/inventory/${item.id}/forecast`);
      setViewItem({ ...res.data, forecast: fcRes.data });
    } catch {
      setViewItem(item);
    }
  };

  // ── Delete Item ────────────────────────────────────────────────────────────
  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    try {
      await api.delete(`/inventory/${deleteItem.id}`);
      toast.success(`Inventory item ${deleteItem.item_code} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      setDeleteItem(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete item");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Inventory Tracking & Stock Management</h1>
          <p className="page-subtitle">Real-time stock levels, transactional goods receipt, stock issues, negative stock prevention & low-stock alerts.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <MdRefresh fontSize={18} /> {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
            <MdAdd fontSize={18} /> Add Product / SKU
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 16, alignItems: "center" }}>
        <div className="search-bar" style={{ width: 320, flex: 1 }}>
          <MdSearch style={{ color: "var(--text-muted)" }} />
          <input
            className="search-input"
            placeholder="Search by SKU code, product name, category..."
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
          <option value="">All Stock Statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock Alerts</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 24, borderColor: "#ef4444" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Failed to load inventory</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {error?.response?.data?.detail || error?.message || "Database connection error"}
          </p>
          <button className="btn btn-primary" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Inventory Items Table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Item Description</th>
                <th>Category</th>
                <th>Stock on Hand</th>
                <th>Reorder Level</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading inventory database...</td></tr>
              ) : !inventoryItems || inventoryItems.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No inventory items found. Click <strong>Add Product / SKU</strong> to track stock.</td></tr>
              ) : (
                inventoryItems.map((item) => (
                  <tr key={item.id} style={item.is_low_stock ? { background: "rgba(245, 158, 11, 0.05)" } : {}}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{item.item_code}</td>
                    <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                    <td>{item.category}</td>
                    <td style={{ fontWeight: 800, color: item.quantity_on_hand <= 0 ? "#ef4444" : "var(--text-primary)" }}>
                      {item.quantity_on_hand} {item.unit_of_measure}
                    </td>
                    <td>{item.reorder_point} {item.unit_of_measure}</td>
                    <td>${(item.unit_cost || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>${(item.total_value || 0).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-info">{item.warehouse_location}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${item.status === "in_stock" ? "success" : item.status === "low_stock" ? "warning" : "danger"}`} style={{ textTransform: "capitalize" }}>
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => {
                            setReceiveItem(item);
                            setMovementForm({ quantity: 10, unit_cost: item.unit_cost, reference_number: "GRN-RCV", notes: "" });
                          }}
                          title="Receive Stock (Stock-In)"
                        >
                          <MdInput /> Receive
                        </button>
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => {
                            setIssueItem(item);
                            setMovementForm({ quantity: 5, unit_cost: item.unit_cost, reference_number: "ISSUE-OUT", notes: "" });
                          }}
                          title="Issue Stock (Stock-Out)"
                        >
                          <MdOutput /> Issue
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleViewDetails(item)} title="View Details & History">
                          <MdVisibility fontSize={16} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(item)} title="Edit Item">
                          <MdEdit fontSize={16} />
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }} onClick={() => setDeleteItem(item)} title="Delete Item">
                          <MdDelete fontSize={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Product / Stock Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 620, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Add Product / SKU to Inventory</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsAddModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleCreateItem} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Cisco Catalyst 9300 48-Port Switch"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Warehouse Location</label>
                    <select
                      className="form-control"
                      value={formData.warehouse_location}
                      onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                    >
                      {warehouses?.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} — {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Initial Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={formData.quantity_on_hand}
                      onChange={(e) => setFormData({ ...formData, quantity_on_hand: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit Cost ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reorder Level (Alert)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={formData.reorder_point}
                      onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Specifications</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Add Product"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Receive Stock Modal (Stock-In) ─────────────────────────────────── */}
      <AnimatePresence>
        {receiveItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 500, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>Receive Stock (Goods Receipt)</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>SKU: {receiveItem.item_code} — {receiveItem.item_name}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setReceiveItem(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleReceiveStock} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Quantity Received *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={movementForm.quantity}
                      onChange={(e) => setMovementForm({ ...movementForm, quantity: Math.max(1, Number(e.target.value)) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={movementForm.unit_cost}
                      onChange={(e) => setMovementForm({ ...movementForm, unit_cost: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">PO / Reference Number</label>
                  <input
                    className="form-control"
                    placeholder="e.g. PO-2026-12345 or GRN-998"
                    value={movementForm.reference_number}
                    onChange={(e) => setMovementForm({ ...movementForm, reference_number: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setReceiveItem(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                    <MdInput /> {isSubmitting ? "Receiving..." : "Confirm Goods Receipt"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Issue Stock Modal (Stock-Out) ──────────────────────────────────── */}
      <AnimatePresence>
        {issueItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 500, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#F59E0B" }}>Issue Stock (Stock-Out)</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Current Available: <strong>{issueItem.quantity_on_hand} units</strong></div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setIssueItem(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleIssueStock} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Quantity to Issue *</label>
                  <input
                    type="number"
                    min="1"
                    max={issueItem.quantity_on_hand}
                    className="form-control"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: Math.max(1, Number(e.target.value)) })}
                    required
                  />
                  {movementForm.quantity > issueItem.quantity_on_hand && (
                    <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                      ⚠️ Error: Issue quantity exceeds available stock on hand ({issueItem.quantity_on_hand} units).
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Work Order / Reference Number</label>
                  <input
                    className="form-control"
                    placeholder="e.g. WO-8821 or ISSUE-DEPT"
                    value={movementForm.reference_number}
                    onChange={(e) => setMovementForm({ ...movementForm, reference_number: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIssueItem(null)}>Cancel</button>
                  <button
                    type="submit"
                    className="btn btn-warning"
                    disabled={isSubmitting || movementForm.quantity > issueItem.quantity_on_hand}
                  >
                    <MdOutput /> {isSubmitting ? "Processing..." : "Confirm Stock Issue"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Detail & Stock Movement History Modal ────────────────────── */}
      <AnimatePresence>
        {viewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 600, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viewItem.item_code} — {viewItem.item_name}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Location: {viewItem.warehouse_location}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewItem(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {[
                  ["Status", viewItem.status],
                  ["Quantity on Hand", `${viewItem.quantity_on_hand} ${viewItem.unit_of_measure || "units"}`],
                  ["Reorder Point Level", `${viewItem.reorder_point} ${viewItem.unit_of_measure || "units"}`],
                  ["Unit Cost", `$${(viewItem.unit_cost || 0).toLocaleString()}`],
                  ["Total Stock Value", `$${(viewItem.total_value || 0).toLocaleString()}`],
                  ["Category", viewItem.category || "General"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--bg-app)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* ── AI Demand Forecast Section ───────────────────────────────────── */}
              {viewItem.forecast && (
                <div style={{
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 20,
                  background: viewItem.forecast.status === "data_insufficient"
                    ? "rgba(107, 114, 128, 0.08)"
                    : "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)",
                  border: viewItem.forecast.status === "data_insufficient"
                    ? "1px solid var(--border-color)"
                    : "1px solid rgba(37, 99, 235, 0.3)"
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    🤖 Baseline AI Demand Forecast ({viewItem.forecast.forecast_horizon_days || 30} Days Horizon)
                  </div>

                  {viewItem.forecast.status === "data_insufficient" ? (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                      ⚠️ <strong>Insufficient Historical Data:</strong> {viewItem.forecast.message}
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, marginBottom: 10 }}>
                        <div style={{ background: "var(--bg-app)", padding: 8, borderRadius: 8 }}>
                          <span style={{ color: "var(--text-muted)" }}>Predicted Demand:</span>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>
                            {viewItem.forecast.predicted_demand} {viewItem.unit_of_measure || "units"}
                          </div>
                        </div>

                        <div style={{ background: "var(--bg-app)", padding: 8, borderRadius: 8 }}>
                          <span style={{ color: "var(--text-muted)" }}>Confidence Score:</span>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--success)" }}>
                            {viewItem.forecast.metrics?.confidence}% Confidence
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        📌 <strong>Reorder Recommendation:</strong>{" "}
                        {viewItem.forecast.reorder_recommendation?.reorder_needed ? (
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>
                            Reorder Needed! Recommended Qty: {viewItem.forecast.reorder_recommendation.recommended_reorder_qty} units (Urgency: {viewItem.forecast.reorder_recommendation.urgency})
                          </span>
                        ) : (
                          <span style={{ color: "#10B981", fontWeight: 700 }}>
                            Stock level adequate. No immediate reorder required.
                          </span>
                        )}
                      </div>

                      {viewItem.forecast.metrics && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                          Metrics: MAE={viewItem.forecast.metrics.mae} | RMSE={viewItem.forecast.metrics.rmse} | MAPE={viewItem.forecast.metrics.mape_pct}% ({viewItem.forecast.metrics.historical_data_points} data points)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stock Movement Audit Log */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <MdHistory /> Stock Movement Audit History ({viewItem.movements?.length || 0} Movements)
                </h4>
                {viewItem.movements && viewItem.movements.length > 0 ? (
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Reference</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewItem.movements.map((m, i) => (
                        <tr key={i}>
                          <td>
                            <span className={`badge badge-${m.movement_type === "stock_in" || m.movement_type === "goods_receipt" ? "success" : "warning"}`} style={{ textTransform: "uppercase" }}>
                              {m.movement_type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{m.quantity}</td>
                          <td>{m.reference_number || "N/A"}</td>
                          <td>{m.timestamp ? new Date(m.timestamp).toLocaleString() : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 12, background: "var(--bg-app)", borderRadius: 8 }}>
                    No stock movements logged yet.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
