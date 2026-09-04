import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import {
  MdTrendingUp, MdTrendingDown, MdAttachMoney, MdBusiness,
  MdAssignmentTurnedIn, MdWarning, MdAutoAwesome, MdArrowForward,
  MdRefresh, MdCheckCircle, MdAdd, MdFileDownload, MdErrorOutline,
  MdInventory, MdReceipt, MdShoppingCart, MdSpeed, MdFlashOn,
  MdArrowUpward, MdArrowDownward, MdOpenInNew, MdMoreVert,
  MdCircle, MdLocalShipping, MdAccountBalance, MdSchedule,
  MdVerified, MdPriorityHigh
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { formatDateTime, formatRelativeTime } from "../../utils/dateUtils";

/* ── Palette ─────────────────────────────────────────────────────── */
const GRAD = [
  ["#6366F1","#8B5CF6"],["#10B981","#059669"],
  ["#F59E0B","#EF4444"],["#EC4899","#8B5CF6"],
  ["#2563EB","#06B6D4"],["#14B8A6","#10B981"],
  ["#F97316","#F59E0B"],["#64748B","#475569"],
];
const PIE_COLORS = ["#6366F1","#10B981","#F59E0B","#EC4899","#2563EB","#14B8A6","#F97316"];

const ACTION_ROUTES = {
  "Consolidate Suppliers":"/suppliers","View Suppliers":"/suppliers",
  "Renew Contracts":"/contracts","View Contracts":"/contracts",
  "Claim Discount":"/invoices","View Invoices":"/invoices",
  "Review Forecasts":"/analytics","View Analytics":"/analytics",
  "Approve PRs":"/purchase-requests","View Requests":"/purchase-requests"
};

/* ── Animated Counter ─────────────────────────────────────────────── */
function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const target = parseFloat(value) || 0;
    const start = display;
    const duration = 900;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(start + (target - start) * eased);
      if (elapsed < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  const fmt = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <span>{prefix}{fmt}{suffix}</span>;
}

/* ── Inline sparkline ─────────────────────────────────────────────── */
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Status Ring ─────────────────────────────────────────────────── */
function StatusRing({ value, max, color, size = 52 }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>{Math.round(pct)}%</text>
    </svg>
  );
}

/* ── Custom Tooltip ──────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(15,15,25,0.95)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
      <p style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12, margin: "2px 0" }}>
          {p.name}: <strong>${Number(p.value).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState("year");
  const [activeInsight, setActiveInsight] = useState(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-kpis", timeframe],
    queryFn: async () => {
      const res = await api.get("/dashboard/kpis", { params: { period: timeframe } });
      return res.data;
    },
    retry: false
  });

  const kpis = data?.kpis;
  const monthlySpend = data?.monthly_spend || [];
  const departmentSpend = data?.spend_by_department || [];
  const aiInsights = data?.ai_insights || [];
  const recentActivities = data?.recent_activities || [];

  const safeNum = (val) => { const n = Number(val); return isFinite(n) ? n : 0; };
  const fmtM = (val) => { const n = safeNum(val); return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${n}`; };
  const fmtPct = (val) => `${safeNum(val)}%`;

  const sparkData = monthlySpend.slice(-6).map(m => safeNum(m.spend));

  const handleExportCSV = () => {
    if (!monthlySpend.length) { toast.error("No spend data available to export"); return; }
    const csv = [["Month","Spend","Savings"],...monthlySpend.map(m=>[m.month,m.spend,m.savings])].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="procurement-spend.csv"; a.click();
    URL.revokeObjectURL(url); toast.success("CSV exported!");
  };

  /* ── Loading ───────────────────────────────────────────────────── */
  if (isLoading) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",gap:20}}>
      <div style={{position:"relative",width:56,height:56}}>
        <div style={{width:56,height:56,border:"3px solid rgba(99,102,241,0.15)",borderTopColor:"#6366F1",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
        <div style={{position:"absolute",inset:8,border:"2px solid rgba(139,92,246,0.15)",borderTopColor:"#8B5CF6",borderRadius:"50%",animation:"spin 1.2s linear infinite reverse"}}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{color:"var(--text-muted)",fontSize:13,letterSpacing:"0.05em"}}>Fetching real-time intelligence...</p>
    </div>
  );

  if (isError) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16,textAlign:"center",padding:24}}>
      <div style={{width:64,height:64,borderRadius:16,background:"rgba(239,68,68,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>⚠️</div>
      <h2 style={{fontSize:20,fontWeight:700,color:"var(--text-primary)"}}>Failed to load dashboard</h2>
      <p style={{color:"var(--text-muted)",fontSize:13,maxWidth:400}}>{error?.response?.data?.detail || error?.message || "An unexpected error occurred."}</p>
      <button className="btn btn-primary" onClick={()=>refetch()}><MdRefresh fontSize={18}/> Retry</button>
    </div>
  );

  if (!kpis) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16,textAlign:"center",padding:24}}>
      <div style={{fontSize:48}}>📊</div>
      <h2 style={{fontSize:20,fontWeight:700,color:"var(--text-primary)"}}>No data yet</h2>
      <p style={{color:"var(--text-muted)",fontSize:13,maxWidth:400}}>Create purchase requests, suppliers, or purchase orders to see analytics.</p>
      <div style={{display:"flex",gap:10}}>
        <button className="btn btn-primary" onClick={()=>navigate("/purchase-requests")}><MdAdd fontSize={18}/> Create PR</button>
        <button className="btn btn-secondary" onClick={()=>navigate("/suppliers")}><MdBusiness fontSize={18}/> Add Supplier</button>
      </div>
    </div>
  );

  /* ── KPI rows ──────────────────────────────────────────────────── */
  const primaryKpis = [
    {
      label: "TOTAL PROCURED SPEND", icon: MdAttachMoney,
      value: fmtM(kpis.total_spend), rawValue: safeNum(kpis.total_spend) / 1e6,
      change: safeNum(kpis.total_spend_change), suffix: "M",
      sub: "vs previous period", grad: GRAD[0],
      spark: sparkData, sparkColor: "#a78bfa",
      route: "/purchase-orders",
    },
    {
      label: "REALIZED SAVINGS", icon: MdTrendingUp,
      value: fmtM(kpis.savings), rawValue: null,
      change: safeNum(kpis.savings_rate), suffix: "%",
      sub: "of total spend optimized", grad: GRAD[1],
      spark: sparkData.map(v => v * 0.12), sparkColor: "#34d399",
      route: "/analytics",
    },
    {
      label: "PENDING APPROVALS", icon: MdAssignmentTurnedIn,
      value: safeNum(kpis.pending_approvals), rawValue: null,
      change: null, suffix: "",
      sub: `${safeNum(kpis.open_pos)} open POs · ${safeNum(kpis.avg_po_cycle_time)}d avg cycle`, grad: GRAD[2],
      spark: null, sparkColor: null,
      ring: { value: safeNum(kpis.pending_approvals), max: safeNum(kpis.total_prs) || 1, color: "#F59E0B" },
      route: "/purchase-requests",
    },
    {
      label: "SUPPLIER RISK ALERTS", icon: MdWarning,
      value: `${safeNum(kpis.high_risk_suppliers)} High Risk`, rawValue: null,
      change: null, suffix: "",
      sub: `out of ${safeNum(kpis.active_suppliers)} active vendors`, grad: GRAD[3],
      spark: null, sparkColor: null,
      ring: { value: safeNum(kpis.high_risk_suppliers), max: safeNum(kpis.active_suppliers) || 1, color: "#EC4899" },
      route: "/suppliers",
    },
  ];

  const secondaryKpis = [
    { label: "INVOICES", icon: MdReceipt, value: safeNum(kpis.total_invoices), badge: `${safeNum(kpis.pending_invoices)} Pending`, badgeColor: "#F59E0B", sub: `${safeNum(kpis.flagged_invoices)} flagged`, route: "/invoices" },
    { label: "INVENTORY SKUs", icon: MdInventory, value: safeNum(kpis.total_inventory_items), badge: `${safeNum(kpis.low_stock_items)} Low Stock`, badgeColor: "#EF4444", sub: "items tracked", route: "/inventory" },
    { label: "PURCHASE REQUESTS", icon: MdShoppingCart, value: safeNum(kpis.total_prs), badge: `${safeNum(kpis.approved_prs)} Approved`, badgeColor: "#10B981", sub: "total requests", route: "/purchase-requests" },
    { label: "PURCHASE ORDERS", icon: MdLocalShipping, value: safeNum(kpis.total_pos), badge: `${safeNum(kpis.open_pos)} Open`, badgeColor: "#6366F1", sub: "total POs", route: "/purchase-orders" },
  ];

  /* ── Activity icons ─────────────────────────────────────────────── */
  const activityIcon = (msg = "") => {
    if (msg.toLowerCase().includes("invoice")) return { icon: MdReceipt, color: "#6366F1" };
    if (msg.toLowerCase().includes("po") || msg.toLowerCase().includes("order")) return { icon: MdLocalShipping, color: "#10B981" };
    if (msg.toLowerCase().includes("pr") || msg.toLowerCase().includes("request")) return { icon: MdShoppingCart, color: "#F59E0B" };
    if (msg.toLowerCase().includes("supplier") || msg.toLowerCase().includes("vendor")) return { icon: MdBusiness, color: "#EC4899" };
    if (msg.toLowerCase().includes("contract")) return { icon: MdAccountBalance, color: "#8B5CF6" };
    return { icon: MdCheckCircle, color: "#10B981" };
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .db-kpi-primary { background: linear-gradient(135deg, var(--g1) 0%, var(--g2) 100%); border: none; border-radius: 16px; padding: 22px 20px; cursor:pointer; transition: transform .2s, box-shadow .2s; position:relative; overflow:hidden; }
        .db-kpi-primary:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.3); }
        .db-kpi-primary::before { content:''; position:absolute; top:-40px; right:-40px; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,0.07); }
        .db-kpi-secondary { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; cursor:pointer; transition: transform .2s, border-color .2s, box-shadow .2s; }
        .db-kpi-secondary:hover { transform: translateY(-3px); border-color: rgba(99,102,241,0.4); box-shadow: 0 8px 24px rgba(99,102,241,0.12); }
        .db-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; overflow:hidden; }
        .live-dot { width:7px;height:7px;border-radius:50%;background:#10B981;animation:pulse-dot 1.5s infinite; }
        .insight-card { background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; cursor:pointer; transition: border-color .2s, transform .2s; }
        .insight-card:hover { border-color: rgba(99,102,241,0.4); transform: translateX(3px); }
      `}</style>

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700, letterSpacing: "0.08em" }}>LIVE ENTERPRISE DATA</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            {greeting}, {user?.first_name || "Admin"} 👋
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Your procurement intelligence hub — real-time P2P analytics from your database.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "8px 12px", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}
            value={timeframe} onChange={e => setTimeframe(e.target.value)}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching} style={{ gap: 6 }}>
            <MdRefresh fontSize={16} style={{ animation: isFetching ? "spin 0.8s linear infinite" : "none" }} />
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/purchase-requests")} style={{ gap: 6 }}>
            <MdAdd fontSize={16} /> New Request
          </button>
        </div>
      </div>

      {/* Supplier KYC Pending Banner */}
      {useAuth().isSupplier && useAuth().user?.is_verified === false && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(239,68,68,0.06) 100%)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 14,
            padding: "18px 22px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16
          }}
        >
          <div style={{ fontSize: 32 }}>⏳</div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14.5, color: "#F59E0B" }}>Vendor Authorization & KYC Verification Pending</strong>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Your supplier profile has been submitted and is awaiting approval by Enterprise Procurement. Once authorized, you will be cleared to submit quotation bids and fulfill Purchase Orders.
            </p>
          </div>
          <span className="badge badge-warning" style={{ fontSize: 12, padding: "6px 12px" }}>Under Review</span>
        </div>
      )}

      {/* ── Primary KPI Cards ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
        {primaryKpis.map((k, i) => (
          <motion.div key={k.label} className="db-kpi-primary"
            style={{ "--g1": k.grad[0], "--g2": k.grad[1] }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            onClick={() => navigate(k.route)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", marginBottom: 6 }}>{k.label}</p>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{k.value}</div>
              </div>
              {k.ring ? (
                <StatusRing value={k.ring.value} max={k.ring.max} color={k.ring.color} />
              ) : (
                <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                  <k.icon fontSize={22} />
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                {k.change !== null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, background: k.change >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)", color: k.change >= 0 ? "#34d399" : "#f87171", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
                      {k.change >= 0 ? <MdArrowUpward fontSize={11} /> : <MdArrowDownward fontSize={11} />}
                      {Math.abs(k.change)}%
                    </span>
                  </div>
                )}
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{k.sub}</p>
              </div>
              {k.spark && <Sparkline data={k.spark} color={k.sparkColor} />}
            </div>
            <div style={{ position: "absolute", bottom: 12, right: 14 }}>
              <MdOpenInNew fontSize={13} style={{ color: "rgba(255,255,255,0.4)" }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Secondary KPI Row ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {secondaryKpis.map((k, i) => (
          <motion.div key={k.label} className="db-kpi-secondary"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 + i * 0.05 }}
            onClick={() => navigate(k.route)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em" }}>{k.label}</span>
              <div style={{ padding: 6, borderRadius: 8, background: "rgba(99,102,241,0.12)", color: "#818cf8" }}><k.icon fontSize={16} /></div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              <AnimatedCounter value={k.value} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ background: `${k.badgeColor}20`, color: k.badgeColor, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{k.badge}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{k.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Charts Row ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Spend Trend */}
        <motion.div className="db-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Procurement Spend Trend</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Monthly spend from live purchase order data</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} disabled={!monthlySpend.length}>
              <MdFileDownload fontSize={15} /> Export CSV
            </button>
          </div>
          <div style={{ padding: "14px 8px 16px", height: 280 }}>
            {monthlySpend.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                <MdErrorOutline fontSize={32} color="var(--text-muted)" />
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No spend data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySpend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+"K" : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="spend" name="Spend" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#gSpend)" />
                  <Area type="monotone" dataKey="savings" name="Savings" stroke="#10B981" strokeWidth={2} strokeDasharray="4 3" fillOpacity={1} fill="url(#gSavings)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div className="db-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div style={{ padding: "18px 20px 0" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Spend by Department</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Category distribution breakdown</p>
          </div>
          <div style={{ padding: "12px 8px", height: 260, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {departmentSpend.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                <MdErrorOutline fontSize={32} color="var(--text-muted)" />
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No department data</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={departmentSpend} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="spend">
                      {departmentSpend.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={val => [`$${Number(val).toLocaleString()}`, ""]} contentStyle={{ background: "rgba(15,15,25,0.95)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 16px" }}>
                  {departmentSpend.slice(0, 4).map((dept, i) => (
                    <div key={dept.department} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: "var(--text-secondary)" }}>{dept.department}</span>
                      </div>
                      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{dept.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Row ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
        {/* AI Insights */}
        <motion.div className="db-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div style={{ padding: "18px 20px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ padding: "5px 8px", borderRadius: 8, background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))", display: "flex", alignItems: "center", gap: 5 }}>
              <MdAutoAwesome style={{ color: "#a78bfa", fontSize: 15 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.05em" }}>AI COPILOT INSIGHTS</span>
            </div>
            {aiInsights.length > 0 && (
              <span style={{ marginLeft: "auto", background: "rgba(99,102,241,0.15)", color: "#818cf8", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
                {aiInsights.length} recommendations
              </span>
            )}
          </div>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
            {aiInsights.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 32, gap: 8 }}>
                <MdAutoAwesome fontSize={36} color="var(--text-muted)" />
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No AI recommendations yet</p>
              </div>
            ) : aiInsights.map((insight, i) => (
              <div key={i} className="insight-card"
                style={{ borderLeft: `3px solid ${insight.impact === "high" ? "#EF4444" : insight.impact === "medium" ? "#F59E0B" : "#6366F1"}` }}
                onClick={() => {
                  const route = Object.entries(ACTION_ROUTES).find(([key]) => insight.action?.toLowerCase().includes(key.toLowerCase()))?.[1] || "/analytics";
                  navigate(route);
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>{insight.title}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{insight.description}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {insight.savings && (
                      <span style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
                        {insight.savings}
                      </span>
                    )}
                    <MdArrowForward style={{ color: "var(--text-muted)", fontSize: 14 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div className="db-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div style={{ padding: "18px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MdSchedule style={{ color: "var(--text-muted)", fontSize: 17 }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Recent Activity Feed</h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/compliance")} style={{ fontSize: 11 }}>
              View All <MdArrowForward fontSize={13} />
            </button>
          </div>
          <div style={{ padding: "8px 0", maxHeight: 320, overflowY: "auto" }}>
            {recentActivities.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 32, gap: 8 }}>
                <MdCheckCircle fontSize={36} color="var(--text-muted)" />
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No recent activity</p>
              </div>
            ) : recentActivities.map((act, i) => {
              const { icon: ActIcon, color } = activityIcon(act.message);
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 20px", borderBottom: i !== recentActivities.length - 1 ? "1px solid var(--border-subtle)" : "none", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ActIcon fontSize={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.4 }}>{act.message}</p>
                    <p style={{ fontSize: 10, color: "var(--text-muted)" }} title={formatDateTime(act.time)}>
                      {formatRelativeTime(act.time)} · {formatDateTime(act.time)}
                    </p>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 6, flexShrink: 0, opacity: 0.7 }} />
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
}
