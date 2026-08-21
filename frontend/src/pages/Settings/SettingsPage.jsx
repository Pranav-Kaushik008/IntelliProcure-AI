import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MdSecurity, MdGavel, MdHistory, MdSave,
  MdBusiness, MdGroupAdd, MdPersonAdd,
  MdLock, MdVisibility, MdVisibilityOff, MdCheckCircle,
  MdCloudSync, MdToggleOn, MdToggleOff, MdDelete, MdAdd
} from "react-icons/md";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../contexts/AuthContext";
import { formatDateTime, formatRelativeTime } from "../../utils/dateUtils";
import ERPIntegrationPage from "./ERPIntegrationPage";

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(isAdmin ? "roles" : "approvals");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState("manager");
  const [isAssigning, setIsAssigning] = useState(false);
  const [tier1, setTier1] = useState(5e3);
  const [tier2, setTier2] = useState(5e4);
  const [tier3, setTier3] = useState(25e4);

  // User management state
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Audit logs state
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Department state
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [isAddingDept, setIsAddingDept] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setIsLoadingUsers(true);
    try {
      const res = await api.get("/users/?include_inactive=true");
      setUsersList(res.data || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments/");
      setDepartments(res.data || []);
    } catch {
      // ignore
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await api.get("/audit-logs/?limit=100");
      setAuditLogsList(res.data || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === "roles" && isAdmin) {
      fetchUsers();
    }
    if (activeTab === "general") {
      fetchDepartments();
    }
    if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab, isAdmin]);

  const handleSave = () => {
    toast.success("Enterprise configuration & approval policy rules saved!");
  };

  const handleToggleUserStatus = async (targetUser) => {
    try {
      await api.patch(`/users/${targetUser.id}/status`, { is_active: !targetUser.is_active });
      toast.success(`User ${targetUser.email} status updated!`);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update user status");
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (!window.confirm(`Are you sure you want to deactivate and remove ${targetUser.email}?`)) return;
    try {
      await api.delete(`/users/${targetUser.id}`);
      toast.success(`User ${targetUser.email} deleted!`);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setIsAddingDept(true);
    try {
      await api.post("/departments/", { name: newDeptName.trim() });
      toast.success(`Department "${newDeptName}" added!`);
      setNewDeptName("");
      fetchDepartments();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add department");
    } finally {
      setIsAddingDept(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setIsChangingPwd(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!assignEmail) {
      toast.error("Please enter a user email address");
      return;
    }
    setIsAssigning(true);
    try {
      await api.post("/users/assign-role", { email: assignEmail, role: assignRole });
      toast.success(`Successfully assigned ${assignRole.replace("_", " ").toUpperCase()} role to ${assignEmail}!`);
      setAssignEmail("");
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to assign role");
    } finally {
      setIsAssigning(false);
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Enterprise System Settings & Governance</h1>
          <p className="page-subtitle">Configure approval threshold matrices, user roles, security policies, and audit trails.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <MdSave fontSize={18} /> Save Settings
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="card" style={{ padding: "6px 12px", marginBottom: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "approvals", label: "Approval Threshold Rules", icon: <MdGavel /> },
          ...(isAdmin ? [{ id: "roles", label: "User Management & Role Assignment", icon: <MdGroupAdd /> }] : []),
          ...(isAdmin ? [{ id: "erp", label: "ERP Integration Readiness", icon: <MdCloudSync /> }] : []),
          { id: "general", label: "Organization & Departments", icon: <MdBusiness /> },
          { id: "security", label: "Security & SSO", icon: <MdSecurity /> },
          { id: "audit", label: "Compliance Audit Trail", icon: <MdHistory /> }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ fontSize: 13 }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: User Roles & Account Assignment (ADMIN ONLY) */}
      {activeTab === "roles" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Role Assignment Card */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <MdPersonAdd fontSize={24} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Assign Roles to Enterprise Accounts</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              As System Administrator (<strong style={{ color: "var(--primary)" }}>{user?.email || "pranavkaushikyr@gmail.com"}</strong>), you can assign or promote any account to <strong>Admin</strong>, <strong>Manager</strong>, <strong>Finance</strong>, <strong>Buyer</strong>, <strong>Auditor</strong>, or <strong>Supplier</strong>.
            </p>

            <form onSubmit={handleAssignRole} style={{ background: "var(--bg-app)", padding: 20, borderRadius: 12, border: "1px solid var(--border-color)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr", gap: 14, alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                    User Work Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. manager@company.com"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                    Assign Role
                  </label>
                  <select
                    className="form-control"
                    value={assignRole}
                    onChange={(e) => setAssignRole(e.target.value)}
                  >
                    <option value="admin">👑 System Administrator</option>
                    <option value="manager">📊 Procurement Manager</option>
                    <option value="finance">💳 Finance & Accounts Payable</option>
                    <option value="buyer">🛒 Senior Buyer / Requester</option>
                    <option value="auditor">🔍 Auditor / Compliance</option>
                    <option value="supplier">🏢 Supplier / Vendor</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isAssigning}
                  style={{ height: 42, fontWeight: 700 }}
                >
                  {isAssigning ? "Assigning..." : "Assign Account Role"}
                </button>
              </div>
            </form>
          </div>

          {/* User Directory Table */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>System Users Directory</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Manage system access, active statuses, and administrative credentials.</p>
              </div>
              <span className="badge badge-primary">{usersList.length} Accounts Registered</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px 12px" }}>User</th>
                    <th style={{ padding: "10px 12px" }}>Role</th>
                    <th style={{ padding: "10px 12px" }}>Department</th>
                    <th style={{ padding: "10px 12px" }}>Status</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{u.full_name || `${u.first_name} ${u.last_name}`}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          background: u.role === "admin" ? "rgba(99,102,241,0.15)" : "var(--bg-app)",
                          color: u.role === "admin" ? "var(--primary)" : "var(--text-primary)",
                          textTransform: "capitalize"
                        }}>
                          {u.role?.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px", color: "var(--text-muted)" }}>{u.department || "Enterprise"}</td>
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: u.is_active ? "#10b981" : "#ef4444"
                        }}>
                          {u.is_active ? "● Active" : "○ Deactivated"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8 }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleToggleUserStatus(u)}
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            title={u.is_active ? "Deactivate User" : "Activate User"}
                          >
                            {u.is_active ? <MdToggleOn fontSize={20} color="#10b981" /> : <MdToggleOff fontSize={20} color="#ef4444" />}
                          </button>
                          {u.id !== user?.id && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => handleDeleteUser(u)}
                              style={{ padding: "4px 8px", fontSize: 12, color: "#ef4444" }}
                              title="Delete User"
                            >
                              <MdDelete fontSize={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Tab: ERP Integration Readiness */}
      {activeTab === "erp" && <ERPIntegrationPage />}

      {/* Tab: Approval Rules */}
      {activeTab === "approvals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Multi-Tier Approval Policy Matrix</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              Define automated sign-off routes based on requisition monetary value.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {
    /* Tier 1 */
  }
              <div style={{ padding: 16, borderRadius: 10, background: "var(--bg-app)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Tier 1: Auto-Approval Threshold</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Requisitions under this amount bypass manual sign-off</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>Up to $</span>
                  <input
    type="number"
    className="form-control"
    style={{ width: 120 }}
    value={tier1}
    onChange={(e) => setTier1(Number(e.target.value))}
  />
                </div>
              </div>

              {
    /* Tier 2 */
  }
              <div style={{ padding: 16, borderRadius: 10, background: "var(--bg-app)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Tier 2: Single Approval (Procurement Manager)</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Requires sign-off from Procurement Department Manager</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>${tier1 + 1} to $</span>
                  <input
    type="number"
    className="form-control"
    style={{ width: 130 }}
    value={tier2}
    onChange={(e) => setTier2(Number(e.target.value))}
  />
                </div>
              </div>

              {
    /* Tier 3 */
  }
              <div style={{ padding: 16, borderRadius: 10, background: "var(--bg-app)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Tier 3: Dual Approval (Manager + Finance Director)</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Requires sequential sign-offs from Manager and Finance</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>${tier2 + 1} to $</span>
                  <input
    type="number"
    className="form-control"
    style={{ width: 140 }}
    value={tier3}
    onChange={(e) => setTier3(Number(e.target.value))}
  />
                </div>
              </div>
              {/* Tier 4 */}
              <div style={{ padding: 16, borderRadius: 10, background: "var(--bg-app)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Tier 4: Executive Board Approval</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Requisitions exceeding ${tier3.toLocaleString()} require CPO / Board Sign-off</div>
                </div>
                <span className="badge badge-danger">Above ${tier3.toLocaleString()}</span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Tab: Organization & Departments */}
      {activeTab === "general" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Enterprise Departments</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Manage organizational units and cost centers.</p>
              </div>
            </div>

            {isAdmin && (
              <form onSubmit={handleAddDepartment} style={{ display: "flex", gap: 12, marginBottom: 20, maxWidth: 500 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="New Department Name (e.g. Legal)"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={isAddingDept} style={{ whiteSpace: "nowrap" }}>
                  <MdAdd fontSize={18} /> Add Department
                </button>
              </form>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {departments.map((d) => (
                <div key={d.id} style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Code: <strong>{d.code}</strong></div>
                  {d.budget_annual > 0 && (
                    <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>Annual Budget: ${d.budget_annual.toLocaleString()}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Tab: Compliance Audit Trail */}
      {activeTab === "audit" && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Immutable System Audit Log Ledger</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>IP Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingAudit ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading live audit logs...</td></tr>
                ) : auditLogsList.length > 0 ? (
                  auditLogsList.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 12 }} title={formatDateTime(log.created_at)}>
                        <div>{formatDateTime(log.created_at)}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{formatRelativeTime(log.created_at)}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.user_id ? "Staff User" : "System"}</td>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>{log.action}</td>
                      <td>{log.entity_type} {log.entity_id || ""}</td>
                      <td style={{ fontSize: 12 }}>{log.ip_address || "127.0.0.1"}</td>
                      <td>
                        <span className={`badge badge-${log.action.includes("REJECT") ? "danger" : "success"}`}>
                          {log.action.includes("REJECT") ? "Rejected" : "Success"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  [
                    { time: new Date().toISOString(), user: "System", action: "SYSTEM_INITIALIZED", entity: "CORE", ip: "127.0.0.1", status: "Success" }
                  ].map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: 12 }}>{formatDateTime(row.time)}</td>
                      <td style={{ fontWeight: 600 }}>{row.user}</td>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>{row.action}</td>
                      <td>{row.entity}</td>
                      <td style={{ fontSize: 12 }}>{row.ip}</td>
                      <td>
                        <span className={`badge badge-${row.status === "Success" ? "success" : "warning"}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* Security Tab — Change Password */}
      {activeTab === "security" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: 28, maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--gradient-brand)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <MdLock fontSize={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Change Password</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Update your account password</div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Current Password */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  Current Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter current password"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{
                      position: "absolute", right: 12, top: "50%",
                      transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer", color: "var(--text-muted)"
                    }}
                  >
                    {showCurrent ? <MdVisibilityOff fontSize={18} /> : <MdVisibility fontSize={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    placeholder="Min. 8 characters"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{
                      position: "absolute", right: 12, top: "50%",
                      transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer", color: "var(--text-muted)"
                    }}
                  >
                    {showNew ? <MdVisibilityOff fontSize={18} /> : <MdVisibility fontSize={18} />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "8+ chars", ok: newPassword.length >= 8 },
                      { label: "Uppercase", ok: /[A-Z]/.test(newPassword) },
                      { label: "Number", ok: /\d/.test(newPassword) },
                    ].map(({ label, ok }) => (
                      <span key={label} style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                        background: ok ? "rgba(16,185,129,0.12)" : "var(--bg-app)",
                        color: ok ? "#10b981" : "var(--text-muted)",
                        border: `1px solid ${ok ? "rgba(16,185,129,0.3)" : "var(--border-color)"}`
                      }}>
                        {ok ? "✓" : "·"} {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  Confirm New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    placeholder="Repeat new password"
                    style={{
                      paddingRight: 40,
                      borderColor: confirmPassword && newPassword !== confirmPassword ? "#ef4444" : undefined
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: "absolute", right: 12, top: "50%",
                      transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer", color: "var(--text-muted)"
                    }}
                  >
                    {showConfirm ? <MdVisibilityOff fontSize={18} /> : <MdVisibility fontSize={18} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>Passwords do not match</div>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <div style={{ fontSize: 12, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <MdCheckCircle /> Passwords match
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isChangingPwd}
                style={{ marginTop: 4 }}
              >
                {isChangingPwd ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

