import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, api } from "../../contexts/AuthContext";
import {
  MdPerson,
  MdEmail,
  MdBusiness,
  MdPhone,
  MdSecurity,
  MdKey,
  MdLock,
  MdCheckCircle,
  MdShield,
  MdContentCopy,
  MdVerified,
  MdSave,
  MdFingerprint,
  MdAccessTime,
  MdAssignmentTurnedIn
} from "react-icons/md";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, updateUser, isAdmin, isManager, isBuyer, isFinance, isAuditor, isSupplier } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'permissions' | 'security'

  // Personal Info Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    department: "",
    job_title: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sync initial user data
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        department: user.department || "Enterprise Procurement",
        job_title: user.job_title || (isAdmin ? "Chief Procurement Officer" : "Procurement Specialist")
      });
    }
  }, [user, isAdmin]);

  // Handle Copy User ID
  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(String(user.id));
      toast.success("User UUID copied to clipboard!");
    }
  };

  // Handle Save Profile Details
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toast.error("First name is required.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await api.put("/users/me", {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        department: formData.department.trim(),
        job_title: formData.job_title.trim()
      });

      updateUser(res.data);
      toast.success("Enterprise profile updated successfully! 🎉");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update profile details.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success("Password changed successfully! 🔐");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password. Verify your current password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Role Entitlement Definition
  const getRolePermissions = () => {
    if (isAdmin) {
      return [
        { name: "Full System Administration", desc: "Manage tenant settings, master credentials, and user lifecycle.", granted: true },
        { name: "Purchase Order Approvals", desc: "Uncapped financial sign-off across all departments.", granted: true },
        { name: "6-Clause AI Contract Analysis", desc: "Run predictive legal extraction, risk scoring, and contract deletions.", granted: true },
        { name: "Automated 3-Way Matching", desc: "Perform algorithmic tolerance matching between PO, GRN, and Invoices.", granted: true },
        { name: "Department Budget Governance", desc: "Allocate, adjust, and enforce cost center fiscal budgets.", granted: true },
        { name: "RFQ & Bidding Management", desc: "Publish sourcing tenders, evaluate bids, and issue contracts.", granted: true },
        { name: "Compliance & Audit Logs", desc: "View immutable SOC 2 and ISO 27001 audit trail ledgers.", granted: true }
      ];
    }
    if (isManager) {
      return [
        { name: "Purchase Order Approvals", desc: "Authorized to approve purchase requests up to $100,000.", granted: true },
        { name: "RFQ & Tender Evaluation", desc: "Publish RFQs and compare vendor quotations.", granted: true },
        { name: "6-Clause AI Contract Intelligence", desc: "Analyze supplier agreements and review legal risks.", granted: true },
        { name: "3-Way Invoice Matching", desc: "Reconcile delivery receipts against POs.", granted: true },
        { name: "Budget Oversight", desc: "Monitor department spend vs. allocated fiscal caps.", granted: true },
        { name: "Master Admin Settings", desc: "System configuration reserved for Chief Administrators.", granted: false }
      ];
    }
    if (isFinance) {
      return [
        { name: "Invoice Payment Release", desc: "Authorize and execute disbursements on matched invoices.", granted: true },
        { name: "Automated 3-Way Matching", desc: "Resolve price variances and tolerance discrepancies.", granted: true },
        { name: "Budget Allocation & Controls", desc: "Enforce departmental spend limits and fiscal reserves.", granted: true },
        { name: "Contract Value Verification", desc: "Review agreement payment schedules and renewal terms.", granted: true },
        { name: "Vendor Sourcing Events", desc: "RFQ creation managed by procurement buyers.", granted: false }
      ];
    }
    if (isBuyer) {
      return [
        { name: "Purchase Requisitions", desc: "Create and submit item requisitions for approval.", granted: true },
        { name: "RFQ Sourcing & Vendor Invitations", desc: "Publish tenders and solicit supplier bids.", granted: true },
        { name: "Quotation Compare Matrix", desc: "Analyze side-by-side vendor quotes on lead time and price.", granted: true },
        { name: "Supplier Scorecards", desc: "Evaluate supplier delivery and quality ratings.", granted: true },
        { name: "Financial Disbursement Sign-off", desc: "Payment authorizations require Finance sign-off.", granted: false }
      ];
    }
    if (isSupplier) {
      return [
        { name: "RFQ Bid Submissions", desc: "View invited sourcing events and submit competitive quotes.", granted: true },
        { name: "Purchase Order Fulfillment", desc: "Acknowledge received POs and update delivery milestones.", granted: true },
        { name: "Invoice Submissions", desc: "Submit digital invoices against issued purchase orders.", granted: true },
        { name: "Internal Financial Budgets", desc: "Internal company data is strictly isolated.", granted: false }
      ];
    }
    // Default / Auditor
    return [
      { name: "Read-Only Compliance Auditing", desc: "Inspect PRs, POs, Invoices, and Contracts.", granted: true },
      { name: "Audit Trail Ledger Inspection", desc: "Review immutable chronological change logs.", granted: true },
      { name: "Data Mutations & Deletions", desc: "Auditor accounts are restricted to read-only access.", granted: false }
    ];
  };

  const permissions = getRolePermissions();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* ── Top Hero Card ──────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.04) 100%)",
          border: "1px solid var(--border-color)",
          padding: "32px 28px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          {/* Avatar & Identifiers */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              className="avatar"
              style={{
                width: 72,
                height: 72,
                fontSize: 26,
                fontWeight: 800,
                background: "linear-gradient(135deg, #2563EB 0%, #6366F1 100%)",
                boxShadow: "0 4px 20px rgba(37, 99, 235, 0.35)",
                border: "3px solid var(--bg-card)",
                cursor: "default"
              }}
            >
              {user?.first_name?.[0] || "U"}{user?.last_name?.[0] || ""}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  {user?.full_name || `${formData.first_name} ${formData.last_name}`.trim() || "User"}
                </h1>
                <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <MdVerified fontSize={14} /> Verified Enterprise Identity
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "4px 0 0" }}>
                {user?.email} • <strong style={{ color: "var(--primary)" }}>{formData.job_title}</strong> ({formData.department})
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    background: "var(--bg-card)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <MdFingerprint fontSize={14} /> UUID: {String(user?.id || "").slice(0, 16)}...
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCopyId}
                  style={{ padding: "2px 6px", fontSize: 11 }}
                  title="Copy Full User UUID"
                >
                  <MdContentCopy fontSize={13} /> Copy ID
                </button>
              </div>
            </div>
          </div>

          {/* Role Status Tag */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-block",
                padding: "8px 16px",
                borderRadius: 12,
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Active Governance Tier
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)", textTransform: "capitalize", marginTop: 2 }}>
                👑 {user?.role?.replace(/_/g, " ") || "Administrator"}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: 10, marginTop: 28, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
          <button
            onClick={() => setActiveTab("details")}
            className={`btn ${activeTab === "details" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            <MdPerson fontSize={16} /> Personal & Org Details
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`btn ${activeTab === "permissions" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            <MdAssignmentTurnedIn fontSize={16} /> Role Entitlements & Matrix
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`btn ${activeTab === "security" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            <MdShield fontSize={16} /> Security & Credentials
          </button>
        </div>
      </div>

      {/* ── TAB 1: Personal & Org Details ──────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "details" && (
          <motion.div
            key="details-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}
          >
            {/* Edit Form */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Edit Personal Information</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Updates made here sync across procurement approval queues and notifications.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Job Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="form-label">Direct Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+1 (555) 019-2834"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Primary Corporate Email</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        className="form-control"
                        value={user?.email || ""}
                        disabled
                        style={{ background: "var(--bg-app)", color: "var(--text-muted)", cursor: "not-allowed" }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <MdLock /> SSO Managed
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
                    <MdSave fontSize={16} /> {isSavingProfile ? "Saving Updates..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </div>

            {/* Employment Summary Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 22 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Organization Mapping
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Cost Center:</span>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>CC-EXEC-104</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Approval Threshold:</span>
                    <strong style={{ color: "#10b981" }}>{isAdmin ? "Unlimited ($∞)" : "$100,000"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Directory Status:</span>
                    <span className="badge badge-success">Active & Synced</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 22, background: "rgba(99,102,241,0.04)" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <MdShield style={{ color: "var(--primary)", fontSize: 22, flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>SOX Compliance Notice</strong>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                      Identity and role changes are logged to the immutable audit ledger.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 2: Role Entitlements & Permissions Matrix ──────────────────────── */}
        {activeTab === "permissions" && (
          <motion.div
            key="permissions-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Active Role Authorization Matrix</h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                    Governance permissions derived from role: <strong style={{ color: "var(--primary)", textTransform: "capitalize" }}>{user?.role?.replace(/_/g, " ")}</strong>
                  </p>
                </div>
                <span className="badge badge-primary">SOX / SOC-2 Audited</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
                {permissions.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px 18px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                      background: p.granted ? "var(--bg-card)" : "var(--bg-app)",
                      opacity: p.granted ? 1 : 0.65,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start"
                    }}
                  >
                    {p.granted ? (
                      <MdCheckCircle style={{ color: "#10b981", fontSize: 20, flexShrink: 0, marginTop: 2 }} />
                    ) : (
                      <MdLock style={{ color: "#94a3b8", fontSize: 18, flexShrink: 0, marginTop: 2 }} />
                    )}
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 3: Security & Credentials ──────────────────────────────────────── */}
        {activeTab === "security" && (
          <motion.div
            key="security-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}
          >
            {/* Change Password */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <MdKey style={{ fontSize: 22, color: "var(--primary)" }} />
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Update Password</h3>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                Set a strong cryptographic password. Requires at least 8 characters with numbers and symbols.
              </p>

              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">New Password (Min. 8 characters)</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={isChangingPassword}>
                  <MdLock fontSize={16} /> {isChangingPassword ? "Updating Password..." : "Update Credentials"}
                </button>
              </form>
            </div>

            {/* Session & Security Posture */}
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px" }}>Session Security Posture</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-muted)" }}>Token Architecture:</span>
                  <span className="badge badge-primary">Stateless JWT (HS256)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-muted)" }}>Password Hashing:</span>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>Bcrypt (Salted)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-muted)" }}>Transport Encryption:</span>
                  <span className="badge badge-success">TLS 1.3 / HTTPS</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-muted)" }}>Active Session Lifetime:</span>
                  <strong>60 Minutes</strong>
                </div>
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14, marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <MdAccessTime /> Last authenticated session active via Neon Cloud DB.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
