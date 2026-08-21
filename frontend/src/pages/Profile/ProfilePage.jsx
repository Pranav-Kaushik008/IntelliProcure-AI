import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth, api } from "../../contexts/AuthContext";
import { MdLock, MdCheckCircle, MdSecurity, MdKey } from "react-icons/md";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password changed successfully! 🎉");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password. Verify your current password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h1 className="page-title">User Profile & Security</h1>
        <p className="page-subtitle">Manage personal information, role details, and security credentials.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, maxWidth: 1100 }}>
        {/* Profile Card */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
            <div className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>{user?.full_name}</h3>
              <p style={{ color: "var(--text-muted)" }}>{user?.email}</p>
              <span className="badge badge-primary" style={{ marginTop: 6, textTransform: "capitalize" }}>
                {user?.role?.replace("_", " ")}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Department:</span>
              <span style={{ fontWeight: 600 }}>{user?.department || "Procurement"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Job Title:</span>
              <span style={{ fontWeight: 600 }}>{user?.job_title || "Chief Procurement Officer"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Account Status:</span>
              <span className="badge badge-success">Active & Verified</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <MdSecurity style={{ fontSize: 24, color: "var(--primary)" }} />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Change Password</h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            Update your password securely. Minimum 8 characters required.
          </p>

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Current Password
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter new password (min. 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 8 }}
              disabled={isSubmitting}
            >
              <MdKey /> {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
