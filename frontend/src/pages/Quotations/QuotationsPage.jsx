import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdCompare,
  MdAutoAwesome,
  MdCheckCircle,
  MdGavel,
  MdFileDownload,
  MdAdd,
  MdClose,
  MdRefresh,
  MdStar,
  MdVisibility,
  MdPsychology,
  MdVerified,
  MdTrendingUp
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function QuotationsPage() {
  const queryClient = useQueryClient();

  const [selectedRfqId, setSelectedRfqId] = useState("");
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [viewQuote, setViewQuote] = useState(null);
  const [viewFactorsItem, setViewFactorsItem] = useState(null);

  // Form State for creating a supplier quotation
  const [formData, setFormData] = useState({
    rfq_id: "",
    supplier_id: "",
    payment_terms: "Net 30",
    delivery_days: "",
    warranty_months: "",
    notes: "",
    line_items: [
      { item_name: "Item 1", quantity: "", unit_price: "", discount_rate: "", tax_rate: "" }
    ],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch active RFQs for dropdown ──────────────────────────────────────────
  const { data: rfqs } = useQuery({
    queryKey: ["rfqs-list"],
    queryFn: async () => {
      const res = await api.get("/rfqs/");
      return res.data;
    },
  });

  // Set default selected RFQ ID once loaded
  if (rfqs && rfqs.length > 0 && !selectedRfqId) {
    setSelectedRfqId(rfqs[0].id);
  }

  // ── Fetch Suppliers for dropdown ────────────────────────────────────────────
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const res = await api.get("/suppliers/");
      return res.data;
    },
  });

  // ── Fetch AI Supplier Recommendation & Rankings (Module 8 Endpoint) ────────
  const { data: aiRecData, isLoading: isAiLoading } = useQuery({
    queryKey: ["ai-recommendation", selectedRfqId],
    queryFn: async () => {
      if (!selectedRfqId) return null;
      const res = await api.get(`/ai/recommend-supplier/${selectedRfqId}`);
      return res.data;
    },
    enabled: !!selectedRfqId,
  });

  // ── Fetch Quotations Comparison Matrix ──────────────────────────────────────
  const { data: matrixData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["quotations-matrix", selectedRfqId],
    queryFn: async () => {
      if (selectedRfqId) {
        const res = await api.get(`/quotations/compare/${selectedRfqId}`);
        return res.data;
      } else {
        const res = await api.get("/quotations/");
        return {
          rfq_number: "All RFQs",
          title: "All Vendor Bids & Quotations",
          quotations_count: res.data.length,
          comparison_matrix: res.data.map((q) => ({
            id: q.id,
            quotation_number: q.quotation_number,
            supplier: {
              id: q.supplier_id,
              name: q.supplier_name,
              code: q.supplier_code,
              overall_rating: 4.5,
              risk_level: "low",
              risk_score: 20,
            },
            total_amount: q.total_amount,
            currency: q.currency,
            delivery_days: q.delivery_days,
            payment_terms: q.payment_terms,
            warranty_months: q.warranty_months,
            line_items: q.line_items,
            status: q.status,
          })),
        };
      }
    },
    retry: false,
  });

  const topRec = aiRecData?.rankings?.[0];

  const handleAddItem = () => {
    setFormData({
      ...formData,
      line_items: [
        ...formData.line_items,
        { item_name: `Item ${formData.line_items.length + 1}`, quantity: 1, unit_price: 1000, discount_rate: 0, tax_rate: 10 }
      ],
    });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.line_items];
    updated[index][field] = value;
    setFormData({ ...formData, line_items: updated });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      line_items: formData.line_items.filter((_, i) => i !== index),
    });
  };

  // ── Create Quotation ────────────────────────────────────────────────────────
  const handleSubmitBid = async (e) => {
    e.preventDefault();
    if (!formData.rfq_id) {
      toast.error("Please select an RFQ");
      return;
    }
    if (!formData.supplier_id) {
      toast.error("Please select a Supplier");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/quotations/", formData);
      toast.success("Supplier Bid / Quotation created & submitted!");
      queryClient.invalidateQueries({ queryKey: ["quotations-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["ai-recommendation"] });
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      setIsBidModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const quotes = matrixData?.comparison_matrix || [];
    if (quotes.length === 0) {
      toast.error("No quotations available to export");
      return;
    }
    const csv = [
      ["Quote No.", "Supplier", "Total Amount", "Delivery (days)", "Payment Terms", "Warranty (months)", "Risk Level"],
      ...quotes.map((q) => [
        q.quotation_number,
        q.supplier?.name || "Supplier",
        q.total_amount,
        q.delivery_days,
        q.payment_terms,
        q.warranty_months,
        q.supplier?.risk_level || "low"
      ])
    ].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotation-comparison-${selectedRfqId || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Quotation comparison CSV exported!");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">AI Supplier Recommendation & Quotations</h1>
          <p className="page-subtitle">Reproducible, explainable AI scoring across price, quality, delivery, reliability, ratings & risk.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <MdRefresh fontSize={18} /> {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <MdFileDownload fontSize={18} /> Export Matrix
          </button>
          <button className="btn btn-primary" onClick={() => setIsBidModalOpen(true)}>
            <MdAdd fontSize={18} /> Add Supplier Bid
          </button>
        </div>
      </div>

      {/* RFQ Selector */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 16, alignItems: "center" }}>
        <label style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
          Select RFQ for AI Recommendation:
        </label>
        <select
          className="form-control"
          style={{ width: 360 }}
          value={selectedRfqId}
          onChange={(e) => setSelectedRfqId(e.target.value)}
        >
          <option value="">-- Select RFQ --</option>
          {rfqs?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.rfq_number} — {r.title}
            </option>
          ))}
        </select>
      </div>

      {/* ── AI RECOMMENDATION DISPLAY CARD (MODULE 8) ───────────────────────── */}
      {topRec ? (
        <div className="card" style={{
          padding: 24,
          marginBottom: 28,
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.09) 0%, rgba(99, 102, 241, 0.09) 100%)",
          border: "2px solid rgba(37, 99, 235, 0.3)",
          boxShadow: "0 8px 32px rgba(37, 99, 235, 0.15)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg, #2563EB, #6366F1)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                flexShrink: 0
              }}>
                <MdAutoAwesome />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge badge-success" style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                    <MdVerified /> RANK #{topRec.rank} RECOMMENDED SUPPLIER
                  </span>
                  <span className="badge badge-info" style={{ padding: "4px 10px", fontSize: 12 }}>
                    AI Confidence: {topRec.confidence}%
                  </span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 6, marginBottom: 0 }}>
                  {topRec.supplier.company_name} ({topRec.supplier.supplier_code || "Code N/A"})
                </h2>
              </div>
            </div>

            <div style={{ textAlign: "right", background: "var(--bg-app)", padding: "12px 20px", borderRadius: 12, border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>OVERALL AI SCORE</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--primary)" }}>
                {topRec.score} <span style={{ fontSize: 14, color: "var(--text-muted)" }}>/ 100</span>
              </div>
            </div>
          </div>

          {/* Explanation Text */}
          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16, background: "rgba(255,255,255,0.05)", padding: 14, borderRadius: 10 }}>
            <strong>AI Recommendation Explanation:</strong> {topRec.explanation}
          </div>

          {/* Data-Driven Reasons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                📌 Data-Driven Decision Reasons
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-primary)" }}>
                {topRec.reasons.map((r, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{r}</li>
                ))}
              </ul>
            </div>

            {/* Factor Breakdown Bars */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                📊 Multi-Factor Evaluation Breakdown
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                {[
                  ["Price Score (35%)", topRec.factors.price_score, "#10B981"],
                  ["Quality Score (20%)", topRec.factors.quality_score, "#3B82F6"],
                  ["Delivery Score (15%)", topRec.factors.delivery_score, "#8B5CF6"],
                  ["Historical Reliability (15%)", topRec.factors.reliability_score, "#F59E0B"],
                  ["Supplier Rating (10%)", topRec.factors.rating_score, "#EC4899"],
                  ["Risk Assessment (5%)", topRec.factors.risk_score, "#6366F1"],
                ].map(([label, score, color]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ minWidth: 160, color: "var(--text-muted)" }}>{label}</span>
                    <div style={{ flex: 1, height: 8, background: "rgba(0,0,0,0.1)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontWeight: 700, minWidth: 40, textAlign: "right" }}>{score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : isAiLoading ? (
        <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 24, color: "var(--text-muted)" }}>
          Calculating explainable AI supplier scoring matrix...
        </div>
      ) : null}

      {/* ── ALL SUPPLIER RANKINGS TABLE (MODULE 8) ─────────────────────────── */}
      {aiRecData?.rankings && aiRecData.rankings.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 8 }}>
            <MdTrendingUp fontSize={20} color="var(--primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Complete AI Supplier Rankings ({aiRecData.rankings.length} Evaluated)
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Supplier</th>
                  <th>Total Score</th>
                  <th>Confidence</th>
                  <th>Quoted Amount</th>
                  <th>Delivery</th>
                  <th>Risk Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {aiRecData.rankings.map((item) => (
                  <tr key={item.rank} style={item.rank === 1 ? { background: "rgba(37, 99, 235, 0.04)" } : {}}>
                    <td style={{ fontWeight: 800, fontSize: 16 }}>
                      {item.rank === 1 ? "🥇 #1" : item.rank === 2 ? "🥈 #2" : item.rank === 3 ? "🥉 #3" : `#${item.rank}`}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {item.supplier.company_name}
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.supplier.supplier_code}</div>
                    </td>
                    <td style={{ fontWeight: 800, color: item.rank === 1 ? "var(--success)" : "var(--primary)" }}>
                      {item.score} / 100
                    </td>
                    <td>
                      <span className="badge badge-info">{item.confidence}% Confidence</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {item.quote ? `$${item.quote.total_amount.toLocaleString()}` : "N/A"}
                    </td>
                    <td>{item.quote ? `${item.quote.delivery_days} Days` : "Standard"}</td>
                    <td>
                      <span className={`badge badge-${item.factors.risk_score >= 80 ? "success" : "warning"}`}>
                        {(100 - item.factors.risk_score)} Risk
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setViewFactorsItem(item)}
                        style={{ color: "var(--primary)", fontWeight: 600 }}
                      >
                        <MdVisibility /> View Factors
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Supplier Bid Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isBidModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 620, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Submit Supplier Quotation / Bid</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsBidModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitBid} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">RFQ *</label>
                    <select
                      className="form-control"
                      value={formData.rfq_id}
                      onChange={(e) => setFormData({ ...formData, rfq_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select RFQ --</option>
                      {rfqs?.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.rfq_number} — {r.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supplier *</label>
                    <select
                      className="form-control"
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Bidding Supplier --</option>
                      {suppliers?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.company_name} ({s.supplier_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Delivery (Days)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      placeholder="e.g. 14"
                      value={formData.delivery_days}
                      onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                    />
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

                  <div className="form-group">
                    <label className="form-label">Warranty (Months)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="e.g. 12"
                      value={formData.warranty_months}
                      onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                    />
                  </div>
                </div>

                {/* Line Item Pricing Input */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Line Items Pricing (Calculated Server-side)</label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddItem}>
                      + Add Item
                    </button>
                  </div>

                  {formData.line_items.map((item, idx) => (
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
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Unit Price ($)"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Disc %"
                        value={item.discount_rate}
                        onChange={(e) => handleItemChange(idx, "discount_rate", e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Tax %"
                        value={item.tax_rate}
                        onChange={(e) => handleItemChange(idx, "tax_rate", e.target.value)}
                      />
                      {formData.line_items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#ef4444", padding: 4 }}
                          onClick={() => handleRemoveItem(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsBidModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Quotation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Detail Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewQuote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 560, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viewQuote.quotation_number || viewQuote.id}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Bidding Details</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewQuote(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Total Quoted Amount", `$${(viewQuote.total_amount || 0).toLocaleString()}`],
                  ["Delivery Lead Time", `${viewQuote.delivery_days || 14} Days`],
                  ["Payment Terms", viewQuote.payment_terms || "Net 30"],
                  ["Warranty Period", `${viewQuote.warranty_months || 12} Months`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--bg-app)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setViewQuote(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View AI Decision Factors Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {viewFactorsItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card"
              style={{ width: 620, padding: 28, maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(99, 102, 241, 0.3)" }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid var(--border-color)", paddingBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                      {viewFactorsItem.supplier?.company_name || "Supplier Evaluation"}
                    </h3>
                    <span className="badge badge-primary">{viewFactorsItem.supplier?.supplier_code || "SUP-000"}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    AI Multi-Attribute Decision Model Breakdown (Category: {viewFactorsItem.supplier?.category || "General"})
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewFactorsItem(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              {/* Top Highlights Banner */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Overall AI Score</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--success)", marginTop: 2 }}>
                    {viewFactorsItem.score} <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>/ 100</span>
                  </div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Model Confidence</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--primary)", marginTop: 2 }}>
                    {viewFactorsItem.confidence}%
                  </div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Supplier Risk Level</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--warning)", marginTop: 5, textTransform: "capitalize" }}>
                    {viewFactorsItem.supplier?.risk_level || "Low"} ({viewFactorsItem.supplier?.risk_score || 12} Risk)
                  </div>
                </div>
              </div>

              {/* Evaluation Weights & Progress Bars */}
              <div style={{ marginBottom: 22 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 12 }}>
                  Weighted Scoring Factors
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Price Competitiveness", weight: "35%", score: viewFactorsItem.factors?.price_score || 85, color: "#3B82F6", icon: "💰" },
                    { label: "Quality & Product Compliance", weight: "25%", score: viewFactorsItem.factors?.quality_score || 90, color: "#10B981", icon: "⭐" },
                    { label: "Delivery SLA & Turnaround", weight: "15%", score: viewFactorsItem.factors?.delivery_score || 80, color: "#8B5CF6", icon: "🚚" },
                    { label: "Reliability & Historical Rating", weight: "15%", score: viewFactorsItem.factors?.reliability_score || 88, color: "#F59E0B", icon: "🛡️" },
                    { label: "Compliance & Safety Profile", weight: "10%", score: viewFactorsItem.factors?.risk_score || 88, color: "#06B6D4", icon: "🔒" },
                  ].map((f) => (
                    <div key={f.label} style={{ background: "var(--bg-app)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                          <span>{f.icon}</span>
                          <span>{f.label}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>({f.weight} weight)</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: f.color }}>{f.score} / 100</span>
                      </div>
                      <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, f.score)}%`, background: f.color, borderRadius: 3, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commercial Bid Summary */}
              {viewFactorsItem.quote ? (
                <div style={{ marginBottom: 20, padding: 14, borderRadius: 10, background: "var(--bg-app)", border: "1px solid var(--border-color)" }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 10 }}>
                    Submitted Commercial Terms
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                    <div><span style={{ color: "var(--text-muted)" }}>Total Quoted:</span> <strong>${viewFactorsItem.quote.total_amount?.toLocaleString()} {viewFactorsItem.quote.currency || "USD"}</strong></div>
                    <div><span style={{ color: "var(--text-muted)" }}>Delivery Lead Time:</span> <strong>{viewFactorsItem.quote.delivery_days} Days</strong></div>
                    <div><span style={{ color: "var(--text-muted)" }}>Payment Terms:</span> <strong>{viewFactorsItem.quote.payment_terms || "Net 30"}</strong></div>
                    <div><span style={{ color: "var(--text-muted)" }}>Warranty:</span> <strong>{viewFactorsItem.quote.warranty_months || 12} Months</strong></div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 8, background: "rgba(99, 102, 241, 0.08)", border: "1px dashed rgba(99, 102, 241, 0.3)", fontSize: 12.5, color: "var(--text-secondary)" }}>
                  ℹ️ Baseline scorecard evaluation based on verified historical vendor performance. Formal RFQ quote pending submission.
                </div>
              )}

              {/* AI Justification Notes */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 10 }}>
                  AI Recommendation Insights
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(viewFactorsItem.reasons || [
                    "Supplier matches core technical category criteria with high historical fulfillment rate.",
                    "Pricing benchmark adheres to target procurement thresholds.",
                    "Active compliance certifications verified."
                  ]).map((reason, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--primary)", marginTop: 2 }}>✓</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setViewFactorsItem(null)}>Close</button>
                {viewFactorsItem.quote && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const quote = viewFactorsItem.quote;
                      setViewFactorsItem(null);
                      setViewQuote(quote);
                    }}
                  >
                    View Full Quotation
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
