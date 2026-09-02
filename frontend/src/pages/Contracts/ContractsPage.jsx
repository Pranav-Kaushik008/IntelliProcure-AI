import { useAuth } from '../../contexts/AuthContext';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdAdd,
  MdAutoAwesome,
  MdTimer,
  MdCloudUpload,
  MdDownload,
  MdClose,
  MdGavel,
  MdWarning,
  MdCheckCircle,
  MdHistory,
  MdRefresh,
  MdVisibility
} from "react-icons/md";
import toast from "react-hot-toast";
import { api } from "../../contexts/AuthContext";

export default function ContractsPage() {
  const { canManageContracts, isAuditor, isSupplier } = useAuth();

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiringFilter, setExpiringFilter] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Upload Contract Form State
  const [uploadForm, setUploadForm] = useState({
    title: "",
    supplier_id: "",
    contract_type: "master_service",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    contract_value: "",
    currency: "USD",
    auto_renew: true,
    notice_period_days: "",
    notes: "",
    file: null
  });

  // Renewal Form State
  const [renewForm, setRenewForm] = useState({
    new_end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    contract_value: ""
  });

  // New Version Form State
  const [versionForm, setVersionForm] = useState({
    file: null,
    notes: ""
  });

  // ── Fetch Contracts ──────────────────────────────────────────────────────────
  const { data: contracts, isLoading, isError, refetch } = useQuery({
    queryKey: ["contracts-list", search, typeFilter, statusFilter, expiringFilter],
    queryFn: async () => {
      const res = await api.get("/contracts/", {
        params: {
          search: search || undefined,
          contract_type: typeFilter || undefined,
          status: statusFilter || undefined,
          expiring_soon: expiringFilter || undefined
        }
      });
      return res.data;
    }
  });

  // ── Fetch Suppliers for Dropdown ───────────────────────────────────────────
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const res = await api.get("/suppliers/");
      return res.data;
    }
  });

  // ── Fetch Single Contract AI Details ────────────────────────────────────────
  const handleViewDetails = async (contract) => {
    try {
      const res = await api.get(`/contracts/${contract.id}`);
      setSelectedContract(res.data);
    } catch (err) {
      toast.error("Failed to load contract details");
    }
  };

  // ── Handle Upload Contract Submit ──────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.title?.trim()) {
      toast.error("Please enter a contract title");
      return;
    }
    if (!uploadForm.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", uploadForm.title.trim());
    formData.append("supplier_id", uploadForm.supplier_id);
    formData.append("contract_type", uploadForm.contract_type || "master_service");
    if (uploadForm.start_date) formData.append("start_date", uploadForm.start_date);
    if (uploadForm.end_date) formData.append("end_date", uploadForm.end_date);
    formData.append("contract_value", String(uploadForm.contract_value || "0"));
    formData.append("currency", uploadForm.currency || "USD");
    formData.append("auto_renew", uploadForm.auto_renew ? "true" : "false");
    formData.append("notice_period_days", String(uploadForm.notice_period_days || "30"));
    if (uploadForm.notes) formData.append("notes", uploadForm.notes);
    if (uploadForm.file) formData.append("file", uploadForm.file);

    try {
      await api.post("/contracts/upload", formData);
      toast.success("Contract registered & AI analyzed successfully! 📜");
      setIsUploadModalOpen(false);
      setUploadForm({
        title: "", supplier_id: "", contract_type: "master_service",
        start_date: "", end_date: "", contract_value: "", currency: "USD",
        auto_renew: false, notice_period_days: 30, notes: "", file: null
      });
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Contract upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handle Secure Download ──────────────────────────────────────────────────
  const handleSecureDownload = async (contractId, version) => {
    try {
      const res = await api.get(`/contracts/${contractId}/download`, {
        params: { version: version || undefined },
        responseType: "blob"
      });
      // Extract filename from Content-Disposition header
      const disposition = res.headers["content-disposition"] || "";
      const filenameMatch = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/);
      const fileName = filenameMatch ? filenameMatch[1] : `Contract_${contractId.slice(0, 8)}.txt`;

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Secure contract document downloaded");
    } catch (err) {
      toast.error("Document download failed or file not found");
    }
  };

  // ── Handle Renew Contract ───────────────────────────────────────────────────
  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContract) return;

    try {
      await api.post(`/contracts/${selectedContract.id}/renew`, renewForm);
      toast.success("Contract renewed successfully!");
      setIsRenewModalOpen(false);
      handleViewDetails(selectedContract);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Contract renewal failed");
    }
  };

  // ── Handle New Version Upload ───────────────────────────────────────────────
  const handleVersionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContract || !versionForm.file) {
      toast.error("Please select a document file");
      return;
    }

    const formData = new FormData();
    formData.append("file", versionForm.file);
    if (versionForm.notes) formData.append("notes", versionForm.notes);

    try {
      await api.post(`/contracts/${selectedContract.id}/versions`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("New contract version uploaded!");
      setIsVersionModalOpen(false);
      handleViewDetails(selectedContract);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Version upload failed");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Contract Lifecycle & AI Legal Analysis</h1>
          <p className="page-subtitle">Central repository, version control, secure download, and 6-clause AI extraction engine.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetch()}>
            <MdRefresh fontSize={18} /> Refresh
          </button>
          {canManageContracts && (
            <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)}>
              <MdCloudUpload fontSize={18} /> Upload Contract & Analyze
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="form-control"
          style={{ width: 240 }}
          placeholder="Search contracts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-control" style={{ width: 170 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Contract Types</option>
          <option value="master_service">Master Service</option>
          <option value="purchase">Purchase</option>
          <option value="framework">Framework</option>
          <option value="nda">NDA</option>
          <option value="sla">SLA</option>
        </select>
        <select className="form-control" style={{ width: 150 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="expired">Expired</option>
          <option value="renewed">Renewed</option>
        </select>
        <button
          className={`btn ${expiringFilter ? "btn-warning" : "btn-secondary"}`}
          onClick={() => setExpiringFilter(!expiringFilter)}
        >
          <MdTimer fontSize={16} /> Expiring Soon Only
        </button>
      </div>

      {/* Contracts Table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract No.</th>
                <th>Title</th>
                <th>Supplier</th>
                <th>Type</th>
                <th>Value</th>
                <th>Expiry Date</th>
                <th>Version</th>
                <th>AI Risk</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading contracts...</td></tr>
              ) : !contracts || contracts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "48px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 36 }}>📜</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>No Contracts Registered Yet</div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420, margin: 0 }}>
                        Click below to register an enterprise agreement and trigger automated 6-clause AI risk extraction.
                      </p>
                      <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)} style={{ marginTop: 8 }}>
                        <MdCloudUpload fontSize={16} /> Upload & Analyze Contract
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{c.contract_number}</td>
                    <td style={{ fontWeight: 600 }}>{c.title}</td>
                    <td>{c.supplier_name}</td>
                    <td style={{ textTransform: "capitalize" }}>{c.contract_type?.replace(/_/g, " ")}</td>
                    <td style={{ fontWeight: 700 }}>${(c.contract_value || 0).toLocaleString()} {c.currency}</td>
                    <td>
                      <div>{c.end_date || "N/A"}</div>
                      {c.days_to_expiry != null && c.days_to_expiry <= 60 && c.days_to_expiry > 0 && (
                        <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>⏱ In {c.days_to_expiry} days</span>
                      )}
                    </td>
                    <td><span className="badge badge-secondary">v{c.current_version}</span></td>
                    <td>
                      <span className={`badge badge-${(c.ai_risk_score || 0) > 40 ? "danger" : "success"}`}>
                        {c.ai_risk_score ?? 15}% Risk
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${c.status === "active" ? "success" : (c.status === "expired" ? "danger" : "warning")}`}>
                        {c.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleViewDetails(c)}>
                          <MdAutoAwesome fontSize={15} /> AI Analysis
                        </button>
                        {c.has_document && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleSecureDownload(c.id)} title="Secure Download">
                            <MdDownload fontSize={16} />
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

      {/* ── Upload Contract Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 620, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Upload Contract & Trigger AI Extraction</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsUploadModalOpen(false)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Contract Title *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Master Cloud Services & SLA Agreement"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Associated Supplier *</label>
                    <select
                      className="form-control"
                      value={uploadForm.supplier_id}
                      onChange={(e) => setUploadForm({ ...uploadForm, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers?.map((s) => (
                        <option key={s.id} value={s.id}>{s.company_name} ({s.supplier_code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contract Type</label>
                    <select
                      className="form-control"
                      value={uploadForm.contract_type}
                      onChange={(e) => setUploadForm({ ...uploadForm, contract_type: e.target.value })}
                    >
                      <option value="master_service">Master Service Agreement</option>
                      <option value="purchase">Purchase Agreement</option>
                      <option value="framework">Framework Agreement</option>
                      <option value="nda">Non-Disclosure Agreement (NDA)</option>
                      <option value="sla">Service Level Agreement (SLA)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Effective Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={uploadForm.start_date}
                      onChange={(e) => setUploadForm({ ...uploadForm, start_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expiry / End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={uploadForm.end_date}
                      onChange={(e) => setUploadForm({ ...uploadForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Contract Total Value ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 150000"
                      value={uploadForm.contract_value}
                      onChange={(e) => setUploadForm({ ...uploadForm, contract_value: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Auto-Renewal Notice Window (Days)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 30"
                      value={uploadForm.notice_period_days}
                      onChange={(e) => setUploadForm({ ...uploadForm, notice_period_days: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="auto_renew_check"
                    checked={uploadForm.auto_renew}
                    onChange={(e) => setUploadForm({ ...uploadForm, auto_renew: e.target.checked })}
                  />
                  <label htmlFor="auto_renew_check" style={{ fontSize: 13, color: "var(--text-primary)" }}>
                    Enable Auto-Renewal Clause Tracking
                  </label>
                </div>

                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">Contract Document File (PDF / DOCX)</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsUploadModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Processing AI Analysis..." : "Upload & Run AI Clause Extraction"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contract AI Details & 6-Clause Analysis Modal ─────────────────────── */}
      <AnimatePresence>
        {selectedContract && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
            onClick={() => setSelectedContract(null)}
          >
            <motion.div
              className="card"
              style={{ width: 850, maxWidth: "95vw", padding: 28, maxHeight: "90vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="badge badge-primary">{selectedContract.contract_number}</span>
                    <span className="badge badge-secondary">Version {selectedContract.current_version}</span>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: "var(--text-primary)" }}>
                    {selectedContract.title}
                  </h2>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    Supplier: <strong>{selectedContract.supplier_name}</strong> • Value: <strong>${(selectedContract.contract_value || 0).toLocaleString()} {selectedContract.currency}</strong>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedContract(null)}>
                  <MdClose fontSize={20} />
                </button>
              </div>

              {/* AI Summary Banner */}
              <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-app)", border: "1px solid var(--border-color)", marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--primary)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MdAutoAwesome /> AI CONTRACT SUMMARY
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {selectedContract.ai_summary || "Automated Legal Summary: Standard agreement between enterprise and supplier."}
                </div>
              </div>

              {/* 6 Key Clauses Grid */}
              <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", marginBottom: 12, color: "var(--text-primary)" }}>
                Extracted Important Clauses (6 Key Categories)
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {Object.entries(selectedContract.extracted_clauses || {}).map(([key, clause]) => {
                  if (!clause || typeof clause !== "object") return null;
                  const keyTerms = Array.isArray(clause.key_terms) ? clause.key_terms : [];
                  return (
                    <div key={key} style={{ padding: 14, borderRadius: 10, background: "var(--bg-app)", border: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{clause.title || key.toUpperCase()}</div>
                        <span className={`badge badge-${clause.risk_flag === "High" ? "danger" : (clause.risk_flag === "Medium" ? "warning" : "success")}`} style={{ fontSize: 10 }}>
                          {clause.risk_flag || "Low"} Risk
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.4 }}>
                        {clause.summary || "Standard agreement clause."}
                      </div>
                      {keyTerms.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {keyTerms.map((term, ti) => (
                            <span key={ti} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                              {term}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Identified Risks & Renewal Terms */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {/* Risks */}
                <div style={{ padding: 16, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <MdWarning /> IDENTIFIED AI LEGAL RISKS ({Array.isArray(selectedContract.identified_risks) ? selectedContract.identified_risks.length : (selectedContract.identified_risks ? 1 : 0)})
                  </div>
                  {Array.isArray(selectedContract.identified_risks) && selectedContract.identified_risks.length > 0 ? (
                    selectedContract.identified_risks.map((risk, ri) => (
                      <div key={ri} style={{ marginBottom: 10, fontSize: 12 }}>
                        {typeof risk === "object" ? (
                          <>
                            <strong style={{ color: risk.severity === "CRITICAL" ? "#ef4444" : "#f59e0b" }}>
                              [{risk.severity || "FLAG"}] {risk.title || "Legal Note"}
                            </strong>
                            <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>{risk.description || risk.recommendation}</div>
                          </>
                        ) : (
                          <div style={{ color: "var(--text-secondary)" }}>{String(risk)}</div>
                        )}
                      </div>
                    ))
                  ) : typeof selectedContract.identified_risks === "string" && selectedContract.identified_risks ? (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{selectedContract.identified_risks}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No abnormal risk signals detected.</div>
                  )}
                </div>

                {/* Expiry Terms */}
                <div style={{ padding: 16, borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <MdTimer /> RENEWAL & EXPIRY TERMS
                  </div>
                  <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div>Days to Expiry: <strong>{selectedContract.expiry_terms?.days_remaining ?? selectedContract.days_to_expiry} days</strong></div>
                    <div>Auto-Renew: <strong>{selectedContract.auto_renew ? "Yes (Active)" : "No"}</strong></div>
                    <div>Notice Window: <strong>{selectedContract.notice_period_days} days prior</strong></div>
                    <div>Action Required: <strong style={{ color: "var(--primary)" }}>{selectedContract.expiry_terms?.action_required || "Standard Monitoring"}</strong></div>
                  </div>
                </div>
              </div>

              {/* Version History Table */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", color: "var(--text-primary)" }}>
                    Document Version History ({selectedContract.versions_history?.length || 1})
                  </h4>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsVersionModalOpen(true)}>
                    <MdCloudUpload fontSize={14} /> Upload New Version
                  </button>
                </div>
                <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, overflow: "hidden" }}>
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Document File</th>
                        <th>Uploaded Date</th>
                        <th>Uploaded By</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedContract.versions_history || []).map((v, idx) => (
                        <tr key={idx}>
                          <td><strong>v{v.version}</strong></td>
                          <td>{v.file_name}</td>
                          <td>{v.uploaded_at?.slice(0, 10)}</td>
                          <td>{v.uploaded_by}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleSecureDownload(selectedContract.id, v.version)}>
                              <MdDownload fontSize={14} /> Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => setSelectedContract(null)}>Close</button>
                <button className="btn btn-warning" onClick={() => { setRenewForm({ new_end_date: selectedContract.end_date || "", contract_value: selectedContract.contract_value || 0 }); setIsRenewModalOpen(true); }}>
                  Renew Contract
                </button>
                {selectedContract.has_document && (
                  <button className="btn btn-primary" onClick={() => handleSecureDownload(selectedContract.id)}>
                    <MdDownload /> Secure Download Document
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Renew Contract Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isRenewModalOpen && selectedContract && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 440, padding: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Renew Contract {selectedContract.contract_number}</h3>
              <form onSubmit={handleRenewSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">New Expiry End Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={renewForm.new_end_date}
                    onChange={(e) => setRenewForm({ ...renewForm, new_end_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Updated Contract Value ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={renewForm.contract_value}
                    onChange={(e) => setRenewForm({ ...renewForm, contract_value: Number(e.target.value) })}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsRenewModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Confirm Renewal</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload New Version Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {isVersionModalOpen && selectedContract && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div className="card" style={{ width: 440, padding: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Upload New Version (v{(selectedContract.current_version || 1) + 1})</h3>
              <form onSubmit={handleVersionSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Document File *</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => setVersionForm({ ...versionForm, file: e.target.files[0] })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Version Notes</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Added SLA amendment for 2026"
                    value={versionForm.notes}
                    onChange={(e) => setVersionForm({ ...versionForm, notes: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsVersionModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Upload Version</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
