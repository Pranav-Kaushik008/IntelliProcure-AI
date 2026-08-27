import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  MdBalance, MdRefresh, MdCheckCircle, MdWarning, MdError,
  MdReceipt, MdLocalShipping, MdInventory, MdSearch,
  MdFilterList, MdClose, MdArrowForward, MdInfo, MdAdd,
  MdContentCopy, MdBlock
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import { formatDateTime } from "../../utils/dateUtils";

const STATUS_CONFIG = {
  MATCHED:           { color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: <MdCheckCircle />, label: "Matched" },
  PARTIALLY_MATCHED: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <MdWarning />,     label: "Partially Matched" },
  MISMATCHED:        { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: <MdError />,       label: "Mismatched" },
  NOT_RUN:           { color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: <MdInfo />,       label: "Not Run" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.NOT_RUN;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700,
      border: `1px solid ${cfg.color}33`
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function MatchCheckRow({ check }) {
  const isMatch = check.status === "MATCH";
  const isWarn  = check.status === "WARNING";
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "180px 1fr 1fr 1fr 140px",
      gap: 12, padding: "10px 16px", alignItems: "center",
      borderBottom: "1px solid var(--border-color)",
      background: isMatch ? "transparent" : (isWarn ? "rgba(245,158,11,0.04)" : "rgba(239,68,68,0.04)")
    }}>
      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{check.field}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{check.po_value}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{check.grn_value}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{check.invoice_value}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <StatusBadge status={check.status === "MATCH" ? "MATCHED" : (check.status === "WARNING" ? "PARTIALLY_MATCHED" : "MISMATCHED")} />
        {!isMatch && <span style={{ fontSize: 10, color: isWarn ? "#f59e0b" : "#ef4444" }}>{check.reason}</span>}
      </div>
    </div>
  );
}

function MatchModal({ result, invoice, onClose, onGRNCreate }) {
  if (!result) return null;
  const cfg = STATUS_CONFIG[result.match_status] || STATUS_CONFIG.NOT_RUN;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{
          background: "var(--bg-card)", borderRadius: 20, width: "100%", maxWidth: 900,
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
          border: "1px solid var(--border-color)"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "24px 28px", borderBottom: "1px solid var(--border-color)",
          display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between",
          background: `linear-gradient(135deg, ${cfg.color}15, transparent)`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: cfg.bg, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 24, color: cfg.color
            }}>
              <MdBalance />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                3-Way Match Result
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Invoice: <strong>{invoice?.invoice_number}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusBadge status={result.match_status} />
            <button onClick={onClose} style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 22, display: "flex"
            }}><MdClose /></button>
          </div>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Recommendation Banner */}
          <div style={{
            padding: "14px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.color}33`,
            display: "flex", alignItems: "center", gap: 10
          }}>
            {result.match_status === "MISMATCHED" ? <MdBlock /> : (result.match_status === "MATCHED" ? <MdCheckCircle /> : <MdWarning />)}
            {result.recommendation}
          </div>

          {/* 3 Documents Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[
              { label: "Purchase Order", icon: <MdLocalShipping />, color: "#6366f1", data: result.po },
              { label: "Goods Receipt Note", icon: <MdInventory />, color: "#10b981", data: result.grn },
              { label: "Invoice", icon: <MdReceipt />, color: "#f59e0b", data: result.invoice },
            ].map(({ label, icon, color, data }) => (
              <div key={label} style={{
                background: "var(--bg-surface)", borderRadius: 14, padding: 16,
                border: `1px solid var(--border-color)`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ color, fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                </div>
                {data?.id === null ? (
                  <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
                    ⚠ NOT FOUND
                    {label === "Goods Receipt Note" && (
                      <button
                        onClick={onGRNCreate}
                        style={{
                          display: "block", marginTop: 8, fontSize: 11, cursor: "pointer",
                          background: "rgba(16,185,129,0.15)", color: "#10b981",
                          border: "1px solid #10b98133", borderRadius: 8, padding: "4px 10px",
                        }}
                      ><MdAdd style={{ verticalAlign: "middle" }} /> Create GRN
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {data.po_number || data.grn_number || data.invoice_number || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Status: <strong>{data.status}</strong>
                    </div>
                    {data.total_amount !== undefined && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Total: <strong>${data.total_amount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}
                    {data.supplier && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Supplier: {data.supplier}</div>}
                    {data.receipt_date && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Received: {data.receipt_date}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "Critical Issues", value: result.summary?.critical_issues, color: result.summary?.critical_issues > 0 ? "#ef4444" : "#10b981" },
              { label: "Warnings", value: result.summary?.warnings, color: result.summary?.warnings > 0 ? "#f59e0b" : "#10b981" },
              { label: "Total Checks", value: result.summary?.total_checks, color: "#6366f1" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--bg-surface)", borderRadius: 12, padding: "14px 18px",
                border: "1px solid var(--border-color)", textAlign: "center"
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Field Checks Table */}
          {result.field_checks?.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                Field-Level Checks
              </h3>
              <div style={{ border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "180px 1fr 1fr 1fr 140px",
                  gap: 12, padding: "8px 16px",
                  background: "var(--bg-surface)", borderBottom: "1px solid var(--border-color)"
                }}>
                  {["Field", "PO Value", "GRN Value", "Invoice Value", "Status"].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {result.field_checks.map((c, i) => <MatchCheckRow key={i} check={c} />)}
              </div>
            </div>
          )}

          {/* Line Item Checks */}
          {result.item_checks?.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                Line Item Comparison
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface)" }}>
                      {["Item", "PO Qty", "PO Price", "GRN Qty", "Inv Qty", "Inv Price", "Status"].map(h => (
                        <th key={h} style={{
                          padding: "8px 12px", textAlign: "left", fontSize: 11,
                          fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase",
                          borderBottom: "1px solid var(--border-color)"
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.item_checks.map((item, i) => (
                      <tr key={i} style={{ background: item.status === "MISMATCH" ? "rgba(239,68,68,0.04)" : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)" }}>
                          {item.item_name}
                          {item.item_code !== "—" && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.item_code}</div>}
                        </td>
                        {[item.po_qty, `$${(item.po_price || 0).toFixed(2)}`, item.grn_qty ?? "—", item.inv_qty ?? "—",
                          item.inv_price != null ? `$${item.inv_price.toFixed(2)}` : "—"].map((v, j) => (
                          <td key={j} style={{ padding: "10px 12px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12, borderBottom: "1px solid var(--border-color)" }}>{v}</td>
                        ))}
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-color)" }}>
                          <StatusBadge status={item.status === "MATCH" ? "MATCHED" : "MISMATCHED"} />
                          {item.issues?.map((iss, ii) => (
                            <div key={ii} style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>{iss}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Issues & Warnings */}
          {(result.issues?.length > 0 || result.warnings?.length > 0) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Issues & Warnings
              </h3>
              {result.issues?.map((iss, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, alignItems: "flex-start",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)"
                }}>
                  <MdError style={{ color: "#ef4444", fontSize: 16, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>{iss.field}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{iss.reason}</div>
                  </div>
                </div>
              ))}
              {result.warnings?.map((w, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, alignItems: "flex-start",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)"
                }}>
                  <MdWarning style={{ color: "#f59e0b", fontSize: 16, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{w.field}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{w.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tolerances */}
          <div style={{
            padding: "12px 16px", borderRadius: 12, fontSize: 12, color: "var(--text-muted)",
            background: "var(--bg-surface)", border: "1px solid var(--border-color)"
          }}>
            <strong>Matching Tolerances:</strong>{" "}
            Price ±{result.tolerances?.price_tolerance_pct}% •{" "}
            Quantity exact •{" "}
            Tax ±${result.tolerances?.tax_tolerance_abs} •{" "}
            Total ±{result.tolerances?.total_tolerance_pct}% •{" "}
            Performed: {formatDateTime(result.performed_at)}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function GRNModal({ poOptions, onClose, onSubmit }) {
  const [form, setForm] = useState({
    purchase_order_id: poOptions[0]?.id || "",
    receipt_date: new Date().toISOString().slice(0, 10),
    delivery_note_number: "",
    warehouse_location: "",
    notes: "",
    line_items: [],
  });
  const [newItem, setNewItem] = useState({ item_name: "", quantity_received: "", unit_price: "" });

  useEffect(() => {
    if (poOptions.length > 0 && !form.purchase_order_id) {
      const firstPO = poOptions[0];
      setForm(f => ({ ...f, purchase_order_id: firstPO.id }));
      if (firstPO.items && firstPO.items.length > 0) {
        const item = firstPO.items[0];
        setNewItem({
          item_name: item.item_name || "",
          quantity_received: item.quantity_ordered || "",
          unit_price: item.unit_price || ""
        });
      }
    }
  }, [poOptions, form.purchase_order_id]);

  const handlePOSelect = (poId) => {
    setForm(f => ({ ...f, purchase_order_id: poId }));
    const selectedPO = poOptions.find(p => p.id === poId);
    if (selectedPO && selectedPO.items && selectedPO.items.length > 0) {
      const item = selectedPO.items[0];
      setNewItem({
        item_name: item.item_name || "",
        quantity_received: item.quantity_ordered || "",
        unit_price: item.unit_price || ""
      });
    }
  };

  const addItem = () => {
    if (!newItem.item_name || !newItem.quantity_received) return;
    setForm(f => ({
      ...f,
      line_items: [
        ...f.line_items,
        {
          item_name: newItem.item_name,
          quantity_received: parseFloat(newItem.quantity_received),
          unit_price: parseFloat(newItem.unit_price) || 0
        }
      ]
    }));
    setNewItem({ item_name: "", quantity_received: "", unit_price: "" });
  };

  const handlePost = () => {
    if (!form.purchase_order_id) {
      toast.error("Please select a Purchase Order.");
      return;
    }
    let items = [...form.line_items];
    if (newItem.item_name && newItem.quantity_received) {
      items.push({
        item_name: newItem.item_name,
        quantity_received: parseFloat(newItem.quantity_received),
        unit_price: parseFloat(newItem.unit_price) || 0
      });
    }
    onSubmit({ ...form, line_items: items });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1010,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "var(--bg-card)", borderRadius: 20, width: "100%", maxWidth: 640,
          maxHeight: "90vh", overflowY: "auto", padding: 28,
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)", border: "1px solid var(--border-color)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Create Goods Receipt Note
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 22 }}><MdClose /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Purchase Order *</label>
              <select
                value={form.purchase_order_id}
                onChange={e => handlePOSelect(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "#1e293b", color: "#f1f5f9", fontSize: 13 }}
              >
                <option value="">-- Select Purchase Order --</option>
                {poOptions.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} {po.supplier_name ? `(${po.supplier_name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Receipt Date *</label>
              <input type="date" value={form.receipt_date} onChange={e => setForm(f => ({ ...f, receipt_date: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Delivery Note #</label>
              <input type="text" value={form.delivery_note_number} onChange={e => setForm(f => ({ ...f, delivery_note_number: e.target.value }))}
                placeholder="DN-12345"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Warehouse Location</label>
              <input type="text" value={form.warehouse_location} onChange={e => setForm(f => ({ ...f, warehouse_location: e.target.value }))}
                placeholder="Warehouse A, Bay 3"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13 }} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Received Items</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px auto", gap: 8, marginBottom: 8 }}>
              <input type="text" value={newItem.item_name} onChange={e => setNewItem(n => ({ ...n, item_name: e.target.value }))}
                placeholder="Item name" style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 12 }} />
              <input type="number" value={newItem.quantity_received} onChange={e => setNewItem(n => ({ ...n, quantity_received: e.target.value }))}
                placeholder="Qty" style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 12 }} />
              <input type="number" value={newItem.unit_price} onChange={e => setNewItem(n => ({ ...n, unit_price: e.target.value }))}
                placeholder="Price" style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 12 }} />
              <button onClick={addItem} style={{
                padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 600
              }}>Add</button>
            </div>
            {form.line_items.map((it, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-muted)", padding: "4px 8px", borderRadius: 6, background: "var(--bg-surface)", marginBottom: 4 }}>
                {it.item_name} — Qty: {it.quantity_received}, Price: ${it.unit_price}
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              Cancel
            </button>
            <button onClick={handlePost} style={{
              padding: "9px 22px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--gradient-brand)", color: "#fff", fontWeight: 700, fontSize: 13
            }}>
              Post GRN
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ThreeWayMatchingPage() {
  const { canRunMatch, isAuditor, isSupplier } = useAuth();
  const [matchResults, setMatchResults] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [runningMatch, setRunningMatch] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [matchRes, invRes, poRes] = await Promise.all([
        api.get("/matching/"),
        api.get("/invoices/"),
        api.get("/purchase-orders/"),
      ]);
      setMatchResults(matchRes.data || []);
      setInvoices(invRes.data || []);
      setPurchaseOrders(poRes.data || []);
    } catch (err) {
      toast.error("Failed to load matching data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runMatch = async (invoice) => {
    setRunningMatch(invoice.id);
    try {
      const res = await api.post(`/matching/match/${invoice.id}`, {});
      const result = res.data;
      setSelectedResult(result);
      setSelectedInvoice(invoice);
      toast.success(`Match complete: ${result.match_status.replace("_", " ")}`);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Match execution failed.");
    } finally {
      setRunningMatch(null);
    }
  };

  const viewLastMatch = async (invoice) => {
    try {
      const res = await api.get(`/matching/match/${invoice.id}`);
      setSelectedResult(res.data);
      setSelectedInvoice(invoice);
    } catch {
      toast.error("No prior match result. Click Run Match first.");
    }
  };

  const createGRN = async (form) => {
    try {
      const res = await api.post("/matching/goods-receipts/", form);
      const data = res.data;
      toast.success(`${data.grn_number} posted!`);
      setShowGRNModal(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "GRN creation error.");
    }
  };

  // Status summary for header stats
  const matched = matchResults.filter(r => r.match_status === "MATCHED").length;
  const partial = matchResults.filter(r => r.match_status === "PARTIALLY_MATCHED").length;
  const mismatched = matchResults.filter(r => r.match_status === "MISMATCHED").length;
  const unmatchedInvoices = invoices.filter(inv => !matchResults.find(r => r.id === inv.id));

  // Filtered invoices list
  const allForTable = [
    ...matchResults.map(r => ({ ...r, hasResult: true })),
    ...unmatchedInvoices.map(inv => ({ ...inv, match_status: "NOT_RUN", hasResult: false }))
  ];
  const filtered = allForTable.filter(r => {
    const matchesStatus = filterStatus === "ALL" || r.match_status === filterStatus;
    const matchesSearch = !search ||
      r.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.po_number?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff"
            }}><MdBalance /></div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>
              3-Way Matching
            </h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Compare Purchase Orders · Goods Receipts · Invoices with field-level validation
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowGRNModal(true)} style={{
            padding: "9px 18px", borderRadius: 10, border: "1px solid var(--border-color)",
            background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer",
            fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6
          }}><MdAdd /> New GRN</button>
          <button onClick={fetchData} style={{
            padding: "9px 18px", borderRadius: 10, border: "none",
            background: "var(--gradient-brand)", color: "#fff", cursor: "pointer",
            fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6
          }}><MdRefresh /> Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Fully Matched", value: matched, color: "#10b981", icon: <MdCheckCircle /> },
          { label: "Partially Matched", value: partial, color: "#f59e0b", icon: <MdWarning /> },
          { label: "Mismatched", value: mismatched, color: "#ef4444", icon: <MdError /> },
          { label: "Pending Match", value: unmatchedInvoices.length, color: "#6366f1", icon: <MdBalance /> },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ y: -2 }} style={{
            background: "var(--bg-card)", borderRadius: 16, padding: "16px 20px",
            border: `1px solid var(--border-color)`, display: "flex", alignItems: "center", gap: 14
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: `${s.color}18`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: s.color
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <MdSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice, supplier, PO..."
            style={{
              width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              borderRadius: 10, border: "1px solid var(--border-color)",
              background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13
            }}
          />
        </div>
        {["ALL", "MATCHED", "PARTIALLY_MATCHED", "MISMATCHED", "NOT_RUN"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 12,
            background: filterStatus === s ? "var(--primary)" : "var(--bg-surface)",
            color: filterStatus === s ? "#fff" : "var(--text-muted)"
          }}>
            {s === "ALL" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div style={{
        background: "var(--bg-card)", borderRadius: 18, border: "1px solid var(--border-color)", overflow: "hidden"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.2fr 1.2fr 140px 100px 140px 120px 120px",
          gap: 12, padding: "12px 20px",
          background: "var(--bg-surface)", borderBottom: "1px solid var(--border-color)"
        }}>
          {["Invoice", "Supplier", "PO Number", "Invoice Total", "PO Total", "Match Status", "Issues", "Actions"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <MdBalance style={{ fontSize: 48, color: "var(--text-muted)", marginBottom: 12 }} />
            <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No results found.</div>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((row, i) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.2fr 1.2fr 140px 100px 140px 120px 120px",
                  gap: 12, padding: "14px 20px", alignItems: "center",
                  borderBottom: "1px solid var(--border-color)",
                  transition: "background 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-surface)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{row.invoice_number}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {row.invoice_status || row.status}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{row.supplier_name || "—"}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace" }}>{row.po_number || "—"}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  ${(row.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {row.po_total ? `$${row.po_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                </div>
                <StatusBadge status={row.match_status} />
                <div>
                  {row.critical_count > 0 && (
                    <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
                      {row.critical_count} critical
                    </span>
                  )}
                  {row.warning_count > 0 && (
                    <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, display: "block" }}>
                      {row.warning_count} warnings
                    </span>
                  )}
                  {row.critical_count === 0 && row.warning_count === 0 && row.match_status === "MATCHED" && (
                    <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>Clean ✓</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    id={`run-match-${row.id}`}
                    onClick={() => {
                      const inv = invoices.find(i => i.id === row.id) || row;
                      runMatch(inv);
                    }}
                    disabled={runningMatch === row.id}
                    style={{
                      padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: runningMatch === row.id ? "var(--bg-surface)" : "var(--primary)",
                      color: runningMatch === row.id ? "var(--text-muted)" : "#fff",
                      fontWeight: 600, fontSize: 11
                    }}
                  >
                    {runningMatch === row.id ? "…" : "Run"}
                  </button>
                  {row.hasResult && (
                    <button
                      id={`view-match-${row.id}`}
                      onClick={() => {
                        const inv = invoices.find(i => i.id === row.id) || row;
                        viewLastMatch(inv);
                      }}
                      style={{
                        padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border-color)",
                        background: "transparent", color: "var(--text-primary)", cursor: "pointer",
                        fontWeight: 600, fontSize: 11
                      }}
                    >View</button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Match Result Modal */}
      <AnimatePresence>
        {selectedResult && (
          <MatchModal
            result={selectedResult}
            invoice={selectedInvoice}
            onClose={() => { setSelectedResult(null); setSelectedInvoice(null); }}
            onGRNCreate={() => setShowGRNModal(true)}
          />
        )}
      </AnimatePresence>

      {/* GRN Modal */}
      <AnimatePresence>
        {showGRNModal && (
          <GRNModal
            poOptions={purchaseOrders}
            onClose={() => setShowGRNModal(false)}
            onSubmit={createGRN}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
