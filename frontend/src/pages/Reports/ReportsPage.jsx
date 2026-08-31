import { useState } from "react";
import { motion } from "framer-motion";
import {
  MdFileDownload,
  MdFilterList,
  MdDescription,
  MdTableChart,
  MdPictureAsPdf,
  MdGridOn,
  MdRefresh
} from "react-icons/md";
import toast from "react-hot-toast";
import { api } from "../../contexts/AuthContext";

const REPORT_TYPES = [
  { id: "spend",     label: "Spend & PO Report",              category: "Finance",     icon: "💰", description: "All purchase orders with amounts, discounts, net totals, and supplier breakdown." },
  { id: "supplier",  label: "Supplier Performance & Risk",    category: "Suppliers",   icon: "🏭", description: "Vendor ratings, delivery SLA scores, risk levels, and total spend per supplier." },
  { id: "purchase",  label: "Purchase Requests Report",       category: "Procurement", icon: "📋", description: "All PRs with department, priority, status, and estimated amounts." },
  { id: "rfq",       label: "RFQ Activity Report",            category: "Sourcing",    icon: "📨", description: "Active and closed RFQs with budgets, deadlines, and quotation activity." },
  { id: "po",        label: "Purchase Orders Report",         category: "Finance",     icon: "📦", description: "Full PO listing with supplier, status, amounts, and date range breakdown." },
  { id: "invoice",   label: "Invoice Audit Report",           category: "Finance",     icon: "🧾", description: "Invoice status, 3-way match outcomes, tax amounts, and AI risk scores." },
  { id: "inventory", label: "Inventory Valuation Report",     category: "Inventory",   icon: "🏪", description: "Stock levels, reorder alerts, per-item valuations, and warehouse locations." },
  { id: "risk",      label: "AI Fraud & Risk Report",         category: "Compliance",  icon: "🛡️", description: "All invoices scored by AI across 5 fraud signals with risk levels and reasons." },
  { id: "budget",    label: "Budget Utilization Report",      category: "Finance",     icon: "📊", description: "Department budgets with allocated, spent, remaining amounts, and threshold alerts." },
];

const FORMAT_OPTIONS = [
  { value: "csv",   label: "CSV",          icon: <MdGridOn />,         mime: "text/csv" },
  { value: "excel", label: "Excel (.xlsx)", icon: <MdTableChart />,    mime: "application/xlsx" },
  { value: "pdf",   label: "PDF",          icon: <MdPictureAsPdf />,   mime: "application/pdf" },
];

const CATEGORY_COLORS = {
  Finance: "#2563EB",
  Suppliers: "#10B981",
  Procurement: "#F59E0B",
  Sourcing: "#8B5CF6",
  Inventory: "#06B6D4",
  Compliance: "#EF4444",
};

export default function ReportsPage() {
  const [format, setFormat] = useState("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(null);

  const handleExport = async (reportType) => {
    setGenerating(reportType);
    try {
      const params = new URLSearchParams({
        report_type: reportType,
        format,
        ...(startDate   && { start_date: startDate }),
        ...(endDate     && { end_date: endDate }),
        ...(department  && { department }),
        ...(category    && { category }),
        ...(status      && { status }),
      });

      const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
      const response = await fetch(`/api/v1/reports/generate?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${reportType}_report.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${REPORT_TYPES.find(r => r.id === reportType)?.label} exported as ${format.toUpperCase()}!`);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Procurement Reports & Audit Builder</h1>
          <p className="page-subtitle">Generate real database-backed reports. All exported values match the current filters and underlying database records.</p>
        </div>

        {/* Format Selector */}
        <div style={{ display: "flex", gap: 6, background: "var(--bg-hover)", borderRadius: 10, padding: 4 }}>
          {FORMAT_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: format === f.value ? "var(--bg-card)" : "transparent",
                color: format === f.value ? "var(--primary)" : "var(--text-muted)",
                fontWeight: format === f.value ? 700 : 500,
                cursor: "pointer", fontSize: 13,
                boxShadow: format === f.value ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s"
              }}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Filter Toolbar ── */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "var(--primary)" }}>
            <MdFilterList fontSize={18} /> Report Filters:
          </div>
          <input type="date" className="form-control" style={{ width: 145, fontSize: 12 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>to</span>
          <input type="date" className="form-control" style={{ width: 145, fontSize: 12 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          <input className="form-control" style={{ width: 140, fontSize: 12 }} placeholder="Department..." value={department} onChange={e => setDepartment(e.target.value)} />
          <input className="form-control" style={{ width: 140, fontSize: 12 }} placeholder="Category..." value={category} onChange={e => setCategory(e.target.value)} />
          <input className="form-control" style={{ width: 130, fontSize: 12 }} placeholder="Status..." value={status} onChange={e => setStatus(e.target.value)} />
          {(startDate || endDate || department || category || status) && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
              onClick={() => { setStartDate(""); setEndDate(""); setDepartment(""); setCategory(""); setStatus(""); }}>
              <MdRefresh fontSize={14} /> Reset
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {(startDate || endDate || department || category || status) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {startDate && <span className="badge badge-primary">From: {startDate}</span>}
            {endDate && <span className="badge badge-primary">To: {endDate}</span>}
            {department && <span className="badge badge-secondary">Dept: {department}</span>}
            {category && <span className="badge badge-secondary">Cat: {category}</span>}
            {status && <span className="badge badge-secondary">Status: {status}</span>}
          </div>
        )}
      </div>

      {/* ── Report Cards Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20 }}>
        {REPORT_TYPES.map((rpt) => {
          const catColor = CATEGORY_COLORS[rpt.category] || "var(--primary)";
          const isLoading = generating === rpt.id;

          return (
            <motion.div
              key={rpt.id}
              whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
              className="card"
              style={{
                padding: 24,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                borderTop: `3px solid ${catColor}`,
                transition: "all 0.2s"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{rpt.icon}</span>
                    <span className="badge" style={{ background: `${catColor}18`, color: catColor, border: "none", fontWeight: 700 }}>{rpt.category}</span>
                  </div>
                  <MdDescription color={catColor} fontSize={22} style={{ opacity: 0.4 }} />
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{rpt.label}</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{rpt.description}</p>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Format: <strong style={{ color: "var(--text-primary)" }}>{format.toUpperCase()}</strong>
                  {(startDate || endDate || department || category || status) && (
                    <span style={{ color: "var(--primary)", marginLeft: 6 }}>● Filtered</span>
                  )}
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={isLoading}
                  onClick={() => handleExport(rpt.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {isLoading ? (
                    <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Generating...</>
                  ) : (
                    <><MdFileDownload fontSize={16} /> Export {format.toUpperCase()}</>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Export All Section ── */}
      <div className="card" style={{ marginTop: 24, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Export All Reports in Bulk</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Download all 9 report types at once using the selected format and active filters.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {REPORT_TYPES.map(rpt => (
            <button
              key={rpt.id}
              className="btn btn-secondary btn-sm"
              disabled={generating !== null}
              onClick={() => handleExport(rpt.id)}
              title={rpt.label}
              style={{ fontSize: 12 }}
            >
              {rpt.icon}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
