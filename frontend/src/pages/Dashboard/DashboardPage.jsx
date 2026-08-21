import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  MdTrendingUp, MdAttachMoney, MdBusiness, MdAssignmentTurnedIn,
  MdWarning, MdAutoAwesome, MdArrowForward, MdRefresh, MdCheckCircle,
  MdAdd, MdFileDownload, MdErrorOutline, MdInventory
} from "react-icons/md";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { formatDateTime, formatRelativeTime } from "../../utils/dateUtils";

const COLORS = ["#2563EB","#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#64748B"];
const ACTION_ROUTES = {
  "Consolidate Suppliers":"/suppliers","View Suppliers":"/suppliers",
  "Renew Contracts":"/contracts","View Contracts":"/contracts",
  "Claim Discount":"/invoices","View Invoices":"/invoices",
  "Review Forecasts":"/analytics","View Analytics":"/analytics",
  "Approve PRs":"/purchase-requests","View Requests":"/purchase-requests"
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState("year");
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
  const fmtMillions = (val) => { const n = safeNum(val); return n === 0 ? "$0.00M" : `$${(n/1e6).toFixed(2)}M`; };
  const fmtPct = (val) => `${safeNum(val)}%`;

  if (isLoading) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16}}>
      <div style={{width:40,height:40,border:"3px solid var(--border-color)",borderTopColor:"var(--primary)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{color:"var(--text-muted)",fontSize:13}}>Loading dashboard data...</p>
    </div>
  );

  if (isError) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16,textAlign:"center",padding:24}}>
      <div style={{fontSize:48}}>⚠️</div>
      <h2 style={{fontSize:20,fontWeight:700,color:"var(--text-primary)"}}>Failed to load dashboard data</h2>
      <p style={{color:"var(--text-muted)",fontSize:13,maxWidth:400}}>
        {error?.response?.data?.detail || error?.message || "An unexpected error occurred."}
      </p>
      <button className="btn btn-primary" onClick={()=>refetch()}><MdRefresh fontSize={18}/> Retry</button>
    </div>
  );

  if (!kpis) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16,textAlign:"center",padding:24}}>
      <div style={{fontSize:48}}>📊</div>
      <h2 style={{fontSize:20,fontWeight:700,color:"var(--text-primary)"}}>No dashboard data available</h2>
      <p style={{color:"var(--text-muted)",fontSize:13,maxWidth:400}}>Create purchase requests, suppliers, or purchase orders to see analytics here.</p>
      <div style={{display:"flex",gap:10}}>
        <button className="btn btn-primary" onClick={()=>navigate("/purchase-requests")}><MdAdd fontSize={18}/> Create Purchase Request</button>
        <button className="btn btn-secondary" onClick={()=>navigate("/suppliers")}><MdBusiness fontSize={18}/> Add Supplier</button>
      </div>
    </div>
  );

  const handleExportCSV = () => {
    if (monthlySpend.length === 0) { toast.error("No spend data available to export"); return; }
    const csv = [["Month","Spend","Savings"],...monthlySpend.map(m=>[m.month,m.spend,m.savings])].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="procurement-spend-trend.csv"; a.click();
    URL.revokeObjectURL(url); toast.success("Spend trend CSV exported successfully!");
  };

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>

      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <h1 className="page-title">Procurement Intelligence Dashboard</h1>
          <p className="page-subtitle">Real-time enterprise procure-to-pay analytics from your database.</p>
        </div>
        <div style={{display:"flex",gap:12}}>
          <select className="form-control" style={{width:140,cursor:"pointer"}} value={timeframe} onChange={e=>setTimeframe(e.target.value)}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="btn btn-secondary" onClick={()=>refetch()} disabled={isFetching}>
            <MdRefresh fontSize={18}/> {isFetching?"Refreshing...":"Refresh"}
          </button>
          <button className="btn btn-primary" onClick={()=>navigate("/purchase-requests")}>
            <MdAdd fontSize={18}/> New Request
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <motion.div className="kpi-card primary" whileHover={{y:-3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>TOTAL PROCURED SPEND</span>
            <div style={{padding:8,borderRadius:8,background:"var(--primary-100)",color:"var(--primary)"}}><MdAttachMoney fontSize={20}/></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:"var(--text-primary)"}}>{fmtMillions(kpis.total_spend)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:12}}>
            <span className={`badge ${safeNum(kpis.total_spend_change)>=0?"badge-success":"badge-danger"}`} style={{display:"inline-flex",alignItems:"center"}}>
              <MdTrendingUp/> {safeNum(kpis.total_spend_change)>=0?"+":""}{safeNum(kpis.total_spend_change)}%
            </span>
            <span style={{color:"var(--text-muted)"}}>vs previous period</span>
          </div>
        </motion.div>

        <motion.div className="kpi-card success" whileHover={{y:-3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>REALIZED SAVINGS</span>
            <div style={{padding:8,borderRadius:8,background:"var(--success-light)",color:"#065F46"}}><MdTrendingUp fontSize={20}/></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:"var(--text-primary)"}}>{fmtMillions(kpis.savings)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:12}}>
            <span className="badge badge-success">{fmtPct(kpis.savings_rate)}</span>
            <span style={{color:"var(--text-muted)"}}>of total spend</span>
          </div>
        </motion.div>

        <motion.div className="kpi-card warning" whileHover={{y:-3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>PENDING APPROVALS</span>
            <div style={{padding:8,borderRadius:8,background:"var(--warning-light)",color:"#92400E"}}><MdAssignmentTurnedIn fontSize={20}/></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:"var(--text-primary)"}}>{safeNum(kpis.pending_approvals)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:12}}>
            <span className="badge badge-warning">{safeNum(kpis.open_pos)} Open POs</span>
            <span style={{color:"var(--text-muted)"}}>Avg cycle {safeNum(kpis.avg_po_cycle_time)} days</span>
          </div>
        </motion.div>

        <motion.div className="kpi-card danger" whileHover={{y:-3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>SUPPLIER RISK ALERTS</span>
            <div style={{padding:8,borderRadius:8,background:"var(--danger-light)",color:"#991B1B"}}><MdWarning fontSize={20}/></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:"var(--text-primary)"}}>{safeNum(kpis.high_risk_suppliers)} High Risk</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:12}}>
            <span className="badge badge-danger">Action Required</span>
            <span style={{color:"var(--text-muted)"}}>out of {safeNum(kpis.active_suppliers)} active</span>
          </div>
        </motion.div>
      </div>

      <div className="kpi-grid" style={{marginTop:16}}>
        <motion.div className="kpi-card" whileHover={{y:-3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>INVOICES</span>
            <div style={{padding:8,borderRadius:8,background:"var(--primary-100)",color:"var(--primary)"}}><MdFileDownload fontSize={20}/></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:"var(--text-primary)"}}>{safeNum(kpis.total_invoices)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:12}}>
            <span className="badge badge-warning">{safeNum(kpis.pending_invoices)} Pending</span>
            <span style={{color:"var(--text-muted)"}}>{safeNum(kpis.flagged_invoices)} flagged by AI</span>
          </div>
        </motion.div>

        <motion.div className="kpi-card" whileHover={{y:-3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>INVENTORY</span>
            <div style={{padding:8,borderRadius:8,background:"var(--success-light)",color:"#065F46"}}><MdInventory fontSize={20}/></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:"var(--text-primary)"}}>{safeNum(kpis.total_inventory_items)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:12}}>
            <span className="badge badge-danger">{safeNum(kpis.low_stock_items)} Low Stock</span>
            <span style={{color:"var(--text-muted)"}}>items tracked</span>
          </div>
        </motion.div>

        <motion.div className="kpi-card" whileHover={{y:-3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>PURCHASE REQUESTS</span>
            <div style={{padding:8,borderRadius:8,background:"var(--warning-light)",color:"#92400E"}}><MdAssignmentTurnedIn fontSize={20}/></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:"var(--text-primary)"}}>{safeNum(kpis.total_prs)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:12}}>
            <span className="badge badge-success">{safeNum(kpis.approved_prs)} Approved</span>
            <span style={{color:"var(--text-muted)"}}>total requests</span>
          </div>
        </motion.div>

        <motion.div className="kpi-card" whileHover={{y:-3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>PURCHASE ORDERS</span>
            <div style={{padding:8,borderRadius:8,background:"var(--primary-100)",color:"var(--primary)"}}><MdBusiness fontSize={20}/></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:"var(--text-primary)"}}>{safeNum(kpis.total_pos)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:12}}>
            <span className="badge badge-info">{safeNum(kpis.open_pos)} Open</span>
            <span style={{color:"var(--text-muted)"}}>total POs</span>
          </div>
        </motion.div>
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{fontSize:16,fontWeight:700}}>Procurement Spend Trend</h3>
              <p style={{fontSize:12,color:"var(--text-muted)"}}>Monthly spend from real purchase order data</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} disabled={monthlySpend.length===0}>
              <MdFileDownload/> Export CSV
            </button>
          </div>
          <div className="card-body" style={{height:320}}>
            {monthlySpend.length===0 ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:8}}>
                <MdErrorOutline fontSize={32} color="var(--text-muted)"/>
                <p style={{color:"var(--text-muted)",fontSize:13}}>No spend data available for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySpend} margin={{top:10,right:30,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)"/>
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12}/>
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={v=>`$${v/1e3}k`}/>
                  <Tooltip formatter={value=>[`$${Number(value).toLocaleString()}`,""]} contentStyle={{background:"var(--bg-card)",border:"1px solid var(--border-color)",borderRadius:8}}/>
                  <Area type="monotone" dataKey="spend" name="Actual Spend" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)"/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 style={{fontSize:16,fontWeight:700}}>Spend by Department</h3></div>
          <div className="card-body" style={{height:320,display:"flex",flexDirection:"column",justifyContent:"center"}}>
            {departmentSpend.length===0 ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:8}}>
                <MdErrorOutline fontSize={32} color="var(--text-muted)"/>
                <p style={{color:"var(--text-muted)",fontSize:13}}>No department spend data available</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={departmentSpend} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="spend">
                      {departmentSpend.map((_,index)=><Cell key={`cell-${index}`} fill={COLORS[index%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={val=>`$${Number(val).toLocaleString()}`}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginTop:10}}>
                  {departmentSpend.map((dept,i)=>(
                    <div key={dept.department} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:COLORS[i%COLORS.length]}}/>
                      <span style={{color:"var(--text-secondary)"}}>{dept.department} ({dept.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="card">
          <div className="card-header">
            <span className="ai-badge"><MdAutoAwesome/> AI Copilot Insights</span>
          </div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:16}}>
            {aiInsights.length===0 ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:8}}>
                <MdAutoAwesome fontSize={32} color="var(--text-muted)"/>
                <p style={{color:"var(--text-muted)",fontSize:13}}>No AI recommendations available yet</p>
              </div>
            ) : aiInsights.map((insight,i)=>(
              <div key={i} style={{padding:16,borderRadius:12,background:"var(--bg-app)",border:"1px solid var(--border-color)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--text-primary)",marginBottom:4}}>{insight.title}</div>
                  <div style={{fontSize:12,color:"var(--text-secondary)"}}>{insight.description}</div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{flexShrink:0}} onClick={()=>{
                  const route=Object.entries(ACTION_ROUTES).find(([key])=>insight.action?.toLowerCase().includes(key.toLowerCase()))?.[1]||"/analytics";
                  navigate(route);
                }}>
                  {insight.action} <MdArrowForward/>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 style={{fontSize:16,fontWeight:700}}>Recent Activity Audit</h3></div>
          <div className="card-body" style={{padding:"12px 24px"}}>
            {recentActivities.length===0 ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:8}}>
                <MdCheckCircle fontSize={32} color="var(--text-muted)"/>
                <p style={{color:"var(--text-muted)",fontSize:13}}>No recent activity recorded</p>
              </div>
            ) : recentActivities.map((act,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i!==recentActivities.length-1?"1px solid var(--border-subtle)":"none"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"var(--primary-100)",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                  <MdCheckCircle/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{act.message}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:6}} title={formatDateTime(act.time)}>
                    <span>{formatRelativeTime(act.time)}</span>
                    <span style={{opacity:0.6}}>•</span>
                    <span style={{opacity:0.8}}>{formatDateTime(act.time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </motion.div>
  );
}
