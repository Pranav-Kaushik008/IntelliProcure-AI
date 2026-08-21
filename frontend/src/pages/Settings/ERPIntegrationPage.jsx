import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  MdCloudSync,
  MdCheckCircle,
  MdWarning,
  MdRefresh,
  MdSync,
  MdLayers,
  MdStorage,
  MdAccountBalance,
  MdCheck,
  MdErrorOutline
} from "react-icons/md";
import toast from "react-hot-toast";
import { api } from "../../contexts/AuthContext";

export default function ERPIntegrationPage() {
  const [selectedProvider, setSelectedProvider] = useState("MOCK");
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch current ERP Status
  const { data: erpStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["erp-status", selectedProvider],
    queryFn: async () => {
      const res = await api.get("/erp/status", { params: { provider: selectedProvider } });
      return res.data;
    }
  });

  // Fetch ERP Sync Logs
  const { data: syncLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["erp-logs"],
    queryFn: async () => {
      const res = await api.get("/erp/logs");
      return res.data;
    }
  });

  const handleManualSync = async (entity = "all", direction = "pull") => {
    setIsSyncing(true);
    try {
      const res = await api.post("/erp/sync", null, {
        params: { entity, direction, provider: selectedProvider }
      });
      toast.success(res.data.message || `Synchronized ${entity}!`);
      refetchLogs();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const health = erpStatus?.health || {};

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MdCloudSync color="var(--primary)" /> ERP Integration Readiness Dashboard
          </h1>
          <p className="page-subtitle">Clean adapter architecture supporting Oracle ERP Cloud, SAP S/4HANA, Microsoft Dynamics 365, and Mock Development Sandbox.</p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => refetchStatus()}>
            <MdRefresh fontSize={18} /> Test Connection
          </button>
          <button
            className="btn btn-primary"
            disabled={isSyncing}
            onClick={() => handleManualSync("all", "pull")}
          >
            <MdSync fontSize={18} /> {isSyncing ? "Syncing..." : "Sync All Entities (PULL)"}
          </button>
        </div>
      </div>

      {/* ── MOCK / LIVE STATUS BANNER ── */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 24,
          background: health?.is_mock ? "rgba(245, 158, 11, 0.08)" : "rgba(16, 185, 129, 0.08)",
          border: `1.5px solid ${health?.is_mock ? "var(--warning)" : "var(--success)"}`
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {health?.is_mock ? (
              <MdWarning fontSize={32} color="var(--warning)" />
            ) : (
              <MdCheckCircle fontSize={32} color="var(--success)" />
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: health?.is_mock ? "#D97706" : "#059669" }}>
                {health?.is_mock ? "MOCK DEVELOPMENT ADAPTER ACTIVE" : "LIVE ERP CONNECTION ACTIVE"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                {health?.message || "Operational readiness adapter interface active."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 600 }}>
            <div>Provider: <strong style={{ color: "var(--text-primary)" }}>{health?.provider || "MOCK"}</strong></div>
            <div>Latency: <strong style={{ color: "var(--text-primary)" }}>{health?.latency_ms || 0} ms</strong></div>
            <div>Mode: <span className={`badge badge-${health?.is_mock ? "warning" : "success"}`}>{health?.is_mock ? "Sandbox Mock" : "Production Live"}</span></div>
          </div>
        </div>
      </div>

      {/* ── Provider Selector Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { id: "MOCK", label: "Mock Development Adapter", desc: "Sandbox environment. Safe for offline development.", icon: "⚙️" },
          { id: "ORACLE_CLOUD", label: "Oracle ERP Cloud", desc: "Fusion Cloud Procurement & Financials REST APIs.", icon: "🔴" },
          { id: "SAP_S4HANA", label: "SAP S/4HANA", desc: "NetWeaver OData & Business Partner Services.", icon: "🔷" },
          { id: "DYNAMICS_365", label: "Microsoft Dynamics 365", desc: "Finance & Operations Web API / OData v4.", icon: "🟦" }
        ].map((prov) => (
          <div
            key={prov.id}
            onClick={() => setSelectedProvider(prov.id)}
            className="card"
            style={{
              padding: 18,
              cursor: "pointer",
              border: `2px solid ${selectedProvider === prov.id ? "var(--primary)" : "var(--border-color)"}`,
              background: selectedProvider === prov.id ? "rgba(37, 99, 235, 0.04)" : "var(--bg-card)",
              transition: "all 0.2s"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{prov.icon}</span>
              {selectedProvider === prov.id && <span className="badge badge-primary">Selected</span>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{prov.label}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{prov.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Synchronized Entities Grid ── */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <MdLayers style={{ color: "var(--primary)" }} /> Synchronized Business Entities
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { key: "suppliers", label: "Suppliers Master Data", icon: "🏭", desc: "Vendor details, contacts, ratings, risk scores" },
            { key: "purchase_orders", label: "Purchase Orders", icon: "📦", desc: "PO headers, line items, fulfillment status" },
            { key: "inventory", label: "Inventory & Stock Items", icon: "🏪", desc: "Quantity on hand, reorder points, cost valuations" },
            { key: "invoices", label: "Payables Invoices", icon: "🧾", desc: "Invoice totals, matching status, payment logs" }
          ].map((ent) => (
            <div
              key={ent.key}
              style={{
                padding: 16,
                background: "var(--bg-app)",
                borderRadius: 12,
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, marginBottom: 6 }}>
                  <span>{ent.icon}</span>
                  <strong style={{ fontSize: 14 }}>{ent.label}</strong>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{ent.desc}</p>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: 11 }}
                  disabled={isSyncing}
                  onClick={() => handleManualSync(ent.key, "pull")}
                >
                  Pull (ERP → App)
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1, fontSize: 11 }}
                  disabled={isSyncing}
                  onClick={() => handleManualSync(ent.key, "push")}
                >
                  Push (App → ERP)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Sync History Log Table ── */}
      <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>ERP Sync Audit Trail Logs</h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{syncLogs?.length || 0} Recent Operations</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Synced At</th>
                <th>Entity</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Synced Count</th>
                <th>Failed Count</th>
                <th>Adapter</th>
                <th>Triggered By</th>
              </tr>
            </thead>
            <tbody>
              {!syncLogs || syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                    No sync operations logged yet. Click "Sync All Entities" above to trigger a synchronization.
                  </td>
                </tr>
              ) : (
                syncLogs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{new Date(log.synced_at).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, textTransform: "capitalize" }}>{log.entity.replace("_", " ")}</td>
                    <td>
                      <span className={`badge badge-${log.direction === "pull" ? "primary" : "secondary"}`}>
                        {log.direction.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${log.status === "success" ? "success" : "danger"}`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#10B981" }}>{log.records_synced}</td>
                    <td style={{ color: log.records_failed > 0 ? "#EF4444" : "var(--text-muted)" }}>{log.records_failed}</td>
                    <td style={{ fontSize: 12 }}>
                      {log.adapter_name} {log.is_mock && <span style={{ color: "#D97706" }}>(Mock)</span>}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{log.triggered_by || "system"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
