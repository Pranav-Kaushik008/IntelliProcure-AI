import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  MdEmail, MdLock, MdVisibility, MdVisibilityOff,
  MdCheckCircle, MdPerson, MdBusiness, MdShield,
  MdClose, MdArrowBack, MdAdminPanelSettings,
  MdStorefront, MdManageAccounts, MdShoppingCart,
  MdStar, MdInfo, MdReceiptLong, MdAttachMoney,
  MdCategory, MdVpnKey, MdReceipt, MdAssessment
} from "react-icons/md";
import { FcGoogle } from "react-icons/fc";
import { SiOkta } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { useAuth, api } from "../../contexts/AuthContext";

/* ── Password Strength Calculator ───────────────────────────────── */
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pwd.length >= 8) score += 25;
  if (/[A-Z]/.test(pwd)) score += 25;
  if (/[0-9]/.test(pwd)) score += 25;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
  if (score <= 25) return { score, label: "Weak", color: "#EF4444" };
  if (score <= 50) return { score, label: "Fair", color: "#F59E0B" };
  if (score <= 75) return { score, label: "Good", color: "#3B82F6" };
  return { score, label: "Enterprise Grade", color: "#10B981" };
}

/* ── 6 Supported Platform Roles ─────────────────────────────────── */
const ROLES = [
  {
    id: "buyer",
    label: "Buyer",
    icon: MdShoppingCart,
    color: "#6366F1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.3)",
    desc: "Create purchase requisitions, issue POs & manage vendor invoices",
    dept: "Procurement",
    defaultTitle: "Procurement Specialist",
    fieldsHint: "Buyer Profile Details",
  },
  {
    id: "finance",
    label: "Finance Approver",
    icon: MdReceipt,
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.3)",
    desc: "3-Way matching validation, financial invoice approval & payment authorization",
    dept: "Finance & Accounts",
    defaultTitle: "Financial Controller",
    fieldsHint: "Financial Credentials",
  },
  {
    id: "auditor",
    label: "Compliance Auditor",
    icon: MdAssessment,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.3)",
    desc: "Read-only access to all procurement transaction ledgers and compliance logs",
    dept: "Internal Audit & Compliance",
    defaultTitle: "Compliance Auditor",
    fieldsHint: "Auditor Verification",
  },
  {
    id: "supplier",
    label: "Supplier / Vendor",
    icon: MdStorefront,
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    desc: "Submit RFQ bids, track purchase orders & submit digital invoices",
    dept: "External Vendor Network",
    defaultTitle: "Account Executive",
    fieldsHint: "Company & Tax Identification",
  },
  {
    id: "procurement_manager",
    label: "Manager",
    icon: MdManageAccounts,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    desc: "Approve high-value requisitions, oversee budgets & vendor performance",
    dept: "Supply Chain Operations",
    defaultTitle: "Procurement Manager",
    requiresApproval: true,
    fieldsHint: "Department & Approval Authority",
  },
  {
    id: "admin",
    label: "Admin",
    icon: MdAdminPanelSettings,
    color: "#EC4899",
    bg: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.3)",
    desc: "Master system configuration, user approvals & platform security",
    dept: "Executive Board",
    defaultTitle: "System Administrator",
    requiresSecurityCode: true,
    fieldsHint: "System Security & Master Admin Verification",
  },
];

/* ── Form Input Layout Styles ───────────────────────────────────── */
const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "11px 14px 11px 42px",
  color: "#fff",
  fontSize: 13.5,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .2s",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
  color: "#fff",
};

const iconStyle = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "rgba(255,255,255,0.38)",
  fontSize: 18,
  pointerEvents: "none",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithUserObj, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState("signin");
  const [registerStep, setRegisterStep] = useState("role"); // "role" | "form"
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // SSO Modal State
  const [ssoModal, setSsoModal] = useState(null); // null | 'google' | 'okta'
  const [ssoTargetRole, setSsoTargetRole] = useState("buyer");
  const [ssoEmail, setSsoEmail] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);

  const signInForm = useForm();
  const signUpForm = useForm();
  const strength = getPasswordStrength(passwordInput);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /* ── Sign In Handler ───────────────────────────────────────────── */
  const onSignInSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Role-Specific Registration Handler ────────────────────────── */
  const onRegisterSubmit = async (data) => {
    if (data.password !== data.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (!data.agree_terms) {
      toast.error("Please accept the Terms of Service");
      return;
    }

    const roleObj = selectedRole || ROLES[0];
    const isPending = roleObj.requiresApproval;
    const isMasterAdminEmail = data.email.toLowerCase().trim() === "pranavkaushikyr@gmail.com";

    // Validate Admin passcode if registering Admin role (or bypass if master admin email)
    if (roleObj.id === "admin" && !isMasterAdminEmail && data.security_code !== "ADMIN-2024" && data.security_code !== "MASTER") {
      toast.error("Invalid Admin Security Code. Use 'ADMIN-2024' or contact master admin.");
      return;
    }

    setIsLoading(true);

    const userPayload = {
      id: `usr-${roleObj.id}-${Date.now()}`,
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: `${data.first_name} ${data.last_name}`,
      role: isMasterAdminEmail ? "admin" : roleObj.id,
      department: data.department || data.category || roleObj.dept,
      job_title: data.job_title || roleObj.defaultTitle,
      company_name: data.company_name || "",
      tax_id: data.tax_id || "",
      approval_limit: data.approval_limit || "$50,000",
      theme: "dark",
      is_active: isMasterAdminEmail ? true : !isPending,
    };

    try {
      await api.post("/auth/register", {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        role: isMasterAdminEmail ? "admin" : roleObj.id,
        department: data.department || data.category || roleObj.dept,
        job_title: data.job_title || roleObj.defaultTitle,
      });

      if (isPending && !isMasterAdminEmail) {
        toast.success("Manager registration submitted! Pending master admin approval.", { duration: 6000 });
        setActiveTab("signin");
        setRegisterStep("role");
        setSelectedRole(null);
      } else {
        toast.success(`Account created as ${roleObj.label}! Logging you in…`);
        await login(data.email, data.password);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed. Email may already be in use.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── SSO Handler (Google / Okta) ────────────────────────────────── */
  const handleSSO = (provider, targetRole = "buyer") => {
    setSsoTargetRole(targetRole);

    const state = encodeURIComponent(btoa(JSON.stringify({ provider, role: targetRole, nonce: Math.random().toString(36) })));
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);

    if (provider === "okta") {
      const oktaDomain = import.meta.env.VITE_OKTA_DOMAIN;
      const clientId = import.meta.env.VITE_OKTA_CLIENT_ID;
      if (oktaDomain && clientId) {
        const params = new URLSearchParams({
          client_id: clientId, response_type: "code", response_mode: "query",
          redirect_uri: decodeURIComponent(redirectUri), scope: "openid profile email", state,
        });
        window.location.href = `https://${oktaDomain}/oauth2/v1/authorize?${params}`;
        return;
      }
    } else if (provider === "google") {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (clientId) {
        const params = new URLSearchParams({
          client_id: clientId, redirect_uri: decodeURIComponent(redirectUri),
          response_type: "code", scope: "openid email profile",
          access_type: "offline", prompt: "select_account", state,
          hd: import.meta.env.VITE_GOOGLE_HOSTED_DOMAIN || "",
        });
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
        return;
      }
    }

    // Opens SSO modal with target role attached
    setSsoEmail("");
    setSsoModal(provider);
  };

  const handleSSOModalSubmit = async (e) => {
    e.preventDefault();
    if (!ssoEmail) { toast.error("Please enter your work email"); return; }
    setSsoLoading(true);

    const roleObj = ROLES.find(r => r.id === ssoTargetRole) || ROLES[0];
    const isMasterAdmin = ssoEmail.toLowerCase().trim() === "pranavkaushikyr@gmail.com";
    const namePart = ssoEmail.split("@")[0];
    const firstName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const ssoUser = {
      id: `usr-sso-${Date.now()}`,
      email: ssoEmail,
      first_name: isMasterAdmin ? "Pranav" : firstName,
      last_name: isMasterAdmin ? "Kaushik" : "User",
      full_name: isMasterAdmin ? "Pranav Kaushik" : `${firstName} User`,
      role: isMasterAdmin ? "admin" : roleObj.id,
      department: isMasterAdmin ? "Executive Board" : roleObj.dept,
      job_title: isMasterAdmin ? "Chief Procurement Officer & Master Admin" : roleObj.defaultTitle,
      theme: "dark",
      is_active: true,
    };

    try {
      const response = await api.post(`/auth/sso/${ssoModal}/callback`, {
        code: `sso-code-${Date.now()}`,
        email: ssoEmail,
        role: ssoTargetRole,
      });

      const { access_token, refresh_token, user: userData } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("user", JSON.stringify(userData));

      toast.success(`Welcome, ${userData.first_name || 'User'}! Signed in via ${ssoModal.toUpperCase()} 🎉`);
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err?.response?.data?.detail || "SSO authentication failed");
    } finally {
      setSsoLoading(false);
      setSsoModal(null);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error("Please enter your work email"); return; }
    toast.success(`Password reset link sent to ${forgotEmail}`);
    setIsForgotModalOpen(false);
    setForgotEmail("");
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", background: "#0B0F18",
      overflow: "hidden", position: "relative", fontFamily: "var(--font-sans)",
    }}>
      {/* Radial Background Glows */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 15% 40%, rgba(37,99,235,0.18) 0%, transparent 60%), radial-gradient(ellipse at 85% 20%, rgba(99,102,241,0.12) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* Grid Pattern Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "40px 40px", pointerEvents: "none",
      }} />

      {/* ── Left Branding Panel ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "60px", position: "relative", zIndex: 1,
        }}
      >
        {/* Brand Header */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, background: "linear-gradient(135deg, #2563EB 0%, #6366F1 100%)",
            borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(37,99,235,0.4)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="2.2" fill="#93C5FD"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>IntelliProcure AI</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Enterprise Procurement Intelligence</div>
          </div>
        </div>

        {/* Hero Copy */}
        <div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ fontSize: 42, fontWeight: 800, color: "white", lineHeight: 1.15, marginBottom: 20 }}>
            Next-Gen<br />
            <span style={{ background: "linear-gradient(135deg, #6366F1, #2563EB)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Procurement & Spend
            </span><br />Intelligence
          </motion.h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14.5, lineHeight: 1.7, maxWidth: 420 }}>
            Role-tailored portals for Buyers, Suppliers, Managers and Admins with automated 3-way invoice matching and real-time AI insights.
          </p>

          {/* Key Metrics */}
          <div style={{ display: "flex", gap: 32, marginTop: 36 }}>
            {[["$2.4B+", "Spend Processed"], ["98.7%", "3-Way Match Rate"], ["40%", "Cycle Reduction"]].map(([val, lbl]) => (
              <div key={lbl}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{val}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Cards Showcase */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.id} style={{
                background: "rgba(255,255,255,0.04)", border: `1px solid ${r.border}`,
                borderRadius: 10, padding: "10px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Icon style={{ color: r.color, fontSize: 16 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{r.label}</span>
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Right Auth Panel ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        style={{
          width: 500, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px 44px", position: "relative", zIndex: 1,
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 480 }}>

          {/* ── Tabs (Sign In vs Create Account) ──────────────────── */}
          <div style={{
            display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10,
            padding: 4, marginBottom: 24, gap: 2,
          }}>
            {["signin", "register"].map((tab) => (
              <button key={tab}
                onClick={() => { setActiveTab(tab); setRegisterStep("role"); setSelectedRole(null); }}
                style={{
                  flex: 1, padding: "9px 0", border: "none", borderRadius: 8, cursor: "pointer",
                  fontSize: 13, fontWeight: 600, transition: "all .2s",
                  background: activeTab === tab ? "rgba(99,102,241,0.9)" : "transparent",
                  color: activeTab === tab ? "white" : "rgba(255,255,255,0.45)",
                }}
              >
                {tab === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ══════════════════════════════════════════
                SIGN IN TAB
            ══════════════════════════════════════════ */}
            {activeTab === "signin" && (
              <motion.div key="signin"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              >
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 6 }}>Welcome Back</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
                  Sign in with your enterprise credentials or Single Sign-On
                </p>

                {/* Google & Okta SSO Buttons */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <button onClick={() => handleSSO("google", "buyer")}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "10px 0", background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                      color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      transition: "background .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                  >
                    <FcGoogle size={18} /> Google SSO
                  </button>
                  <button onClick={() => handleSSO("okta", "buyer")}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "10px 0", background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                      color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      transition: "background .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                  >
                    <SiOkta size={16} color="#007DC1" /> Okta SSO
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>or sign in with email</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                </div>

                <form onSubmit={signInForm.handleSubmit(onSignInSubmit)}>
                  {/* Email */}
                  <div style={{ position: "relative", marginBottom: 14 }}>
                    <MdEmail style={iconStyle} />
                    <input
                      type="email" placeholder="Work email address"
                      {...signInForm.register("email", { required: true })}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    />
                  </div>

                  {/* Password */}
                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <MdLock style={iconStyle} />
                    <input
                      type={showPassword ? "text" : "password"} placeholder="Password"
                      {...signInForm.register("password", { required: true })}
                      style={{ ...inputStyle, paddingRight: 44 }}
                      onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.35)", fontSize: 18,
                      }}>
                      {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>

                  <div style={{ textAlign: "right", marginBottom: 20 }}>
                    <button type="button" onClick={() => setIsForgotModalOpen(true)}
                      style={{ background: "none", border: "none", color: "#6366F1", fontSize: 12, cursor: "pointer" }}>
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" disabled={isLoading}
                    style={{
                      width: "100%", padding: "12px 0",
                      background: isLoading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #2563EB, #6366F1)",
                      border: "none", borderRadius: 10, color: "white",
                      fontSize: 14, fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                    }}>
                    {isLoading ? "Signing in…" : "Sign In →"}
                  </button>
                </form>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                  Need an account?{" "}
                  <button onClick={() => setActiveTab("register")}
                    style={{ background: "none", border: "none", color: "#6366F1", fontWeight: 600, cursor: "pointer" }}>
                    Register for access
                  </button>
                </p>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════
                CREATE ACCOUNT — Step 1: Select Role
            ══════════════════════════════════════════ */}
            {activeTab === "register" && registerStep === "role" && (
              <motion.div key="role-picker"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              >
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 6 }}>Create Account</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
                  Select your platform role to customize your setup
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    return (
                      <motion.div key={role.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        style={{
                          background: role.bg, border: `1px solid ${role.border}`,
                          borderRadius: 12, padding: "14px 16px",
                        }}
                      >
                        <div
                          onClick={() => { setSelectedRole(role); setRegisterStep("form"); }}
                          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
                        >
                          <div style={{
                            width: 42, height: 42, borderRadius: 10,
                            background: `${role.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Icon style={{ color: role.color, fontSize: 22 }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{role.label}</span>
                              {role.requiresApproval && (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: "2px 7px",
                                  background: "rgba(245,158,11,0.2)", color: "#F59E0B", borderRadius: 20,
                                }}>Admin Approval Needed</span>
                              )}
                              {role.requiresSecurityCode && (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: "2px 7px",
                                  background: "rgba(236,72,153,0.2)", color: "#EC4899", borderRadius: 20,
                                }}>Admin Key Required</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>{role.desc}</div>
                          </div>
                        </div>

                        {/* Quick SSO Signup Row per Role */}
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 10,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>Fast SSO Signup:</span>
                          <button type="button" onClick={() => handleSSO("google", role.id)}
                            style={{
                              padding: "4px 10px", background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
                              color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                            }}>
                            <FcGoogle size={14} /> Google
                          </button>
                          <button type="button" onClick={() => handleSSO("okta", role.id)}
                            style={{
                              padding: "4px 10px", background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
                              color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                            }}>
                            <SiOkta size={12} color="#007DC1" /> Okta
                          </button>
                          <button type="button" onClick={() => { setSelectedRole(role); setRegisterStep("form"); }}
                            style={{
                              marginLeft: "auto", padding: "4px 12px", background: role.color,
                              border: "none", borderRadius: 6, color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer",
                            }}>
                            Fill Form →
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                  Already registered?{" "}
                  <button onClick={() => setActiveTab("signin")}
                    style={{ background: "none", border: "none", color: "#6366F1", fontWeight: 600, cursor: "pointer" }}>
                    Sign in here
                  </button>
                </p>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════
                CREATE ACCOUNT — Step 2: Custom Role Form
            ══════════════════════════════════════════ */}
            {activeTab === "register" && registerStep === "form" && selectedRole && (
              <motion.div key="register-form"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                {/* Back + Selected Role Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <button onClick={() => { setRegisterStep("role"); setSelectedRole(null); }}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 20, padding: 0, display: "flex", alignItems: "center" }}>
                    <MdArrowBack />
                  </button>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                    background: selectedRole.bg, border: `1px solid ${selectedRole.border}`, borderRadius: 20,
                  }}>
                    <selectedRole.icon style={{ color: selectedRole.color, fontSize: 14 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: selectedRole.color }}>{selectedRole.label} Registration</span>
                  </div>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 4 }}>
                  {selectedRole.label} Account Details
                </h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
                  {selectedRole.fieldsHint}
                </p>

                {/* Role-Specific SSO Buttons */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button type="button" onClick={() => handleSSO("google", selectedRole.id)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px 0", background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                      color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                    <FcGoogle size={16} /> Register with Google
                  </button>
                  <button type="button" onClick={() => handleSSO("okta", selectedRole.id)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px 0", background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                      color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                    <SiOkta size={14} color="#007DC1" /> Register with Okta
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)" }}>or enter registration form</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                </div>

                <form onSubmit={signUpForm.handleSubmit(onRegisterSubmit, (errors) => {
                  console.error("Form validation errors:", errors);
                  const firstErr = Object.values(errors)[0]?.message || "Please fill in all required fields";
                  toast.error(firstErr);
                })}>
                  {/* Name Row */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <MdPerson style={iconStyle} />
                      <input placeholder="First name" {...signUpForm.register("first_name", { required: true })}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                    </div>
                    <div style={{ position: "relative", flex: 1 }}>
                      <MdPerson style={iconStyle} />
                      <input placeholder="Last name" {...signUpForm.register("last_name", { required: true })}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ position: "relative", marginBottom: 12 }}>
                    <MdEmail style={iconStyle} />
                    <input type="email" placeholder="Work email address"
                      {...signUpForm.register("email", { required: true })}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                  </div>

                  {/* ROLE SPECIFIC FIELDS */}

                  {/* BUYER FIELDS */}
                  {selectedRole.id === "buyer" && (
                    <>
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <MdCategory style={iconStyle} />
                        <select {...signUpForm.register("department")} style={selectStyle}>
                          <option value="IT Hardware & Software" style={{ background: "#141824" }}>Category: IT Hardware & Software</option>
                          <option value="Direct Manufacturing Materials" style={{ background: "#141824" }}>Category: Direct Manufacturing Materials</option>
                          <option value="Office Equipment & Services" style={{ background: "#141824" }}>Category: Office Equipment & Services</option>
                          <option value="Logistics & Warehousing" style={{ background: "#141824" }}>Category: Logistics & Warehousing</option>
                        </select>
                      </div>
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <MdStar style={iconStyle} />
                        <input placeholder="Job Title (e.g. Senior Procurement Buyer)"
                          {...signUpForm.register("job_title")}
                          style={inputStyle}
                          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                      </div>
                    </>
                  )}

                  {/* SUPPLIER FIELDS */}
                  {selectedRole.id === "supplier" && (
                    <>
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <MdBusiness style={iconStyle} />
                        <input placeholder="Company / Vendor Name (e.g. TechCore Industries)"
                          {...signUpForm.register("company_name", { required: true })}
                          style={inputStyle}
                          onFocus={e => e.target.style.borderColor = "rgba(16,185,129,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                      </div>
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <MdReceiptLong style={iconStyle} />
                        <input placeholder="Tax ID / Registration Number (e.g. US-8849102)"
                          {...signUpForm.register("tax_id")}
                          style={inputStyle}
                          onFocus={e => e.target.style.borderColor = "rgba(16,185,129,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                      </div>
                    </>
                  )}

                  {/* MANAGER FIELDS */}
                  {selectedRole.id === "procurement_manager" && (
                    <>
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <MdCategory style={iconStyle} />
                        <input placeholder="Department (e.g. Global Supply Chain)"
                          {...signUpForm.register("department", { required: true })}
                          style={inputStyle}
                          onFocus={e => e.target.style.borderColor = "rgba(245,158,11,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                      </div>
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <MdAttachMoney style={iconStyle} />
                        <select {...signUpForm.register("approval_limit")} style={selectStyle}>
                          <option value="$10,000" style={{ background: "#141824" }}>Approval Limit: Up to $10,000</option>
                          <option value="$50,000" style={{ background: "#141824" }}>Approval Limit: Up to $50,000</option>
                          <option value="$100,000" style={{ background: "#141824" }}>Approval Limit: Up to $100,000</option>
                          <option value="Unlimited" style={{ background: "#141824" }}>Approval Limit: Executive / Unlimited</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* ADMIN FIELDS */}
                  {selectedRole.id === "admin" && (
                    <>
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <MdVpnKey style={iconStyle} />
                        <input placeholder="Security Key / Admin Passcode (Default: ADMIN-2024)"
                          {...signUpForm.register("security_code")}
                          style={inputStyle}
                          onFocus={e => e.target.style.borderColor = "rgba(236,72,153,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                      </div>
                    </>
                  )}

                  {/* Password */}
                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <MdLock style={iconStyle} />
                    <input type={showPassword ? "text" : "password"} placeholder="Create Password"
                      {...signUpForm.register("password", {
                        required: "Password is required",
                        onChange: (e) => setPasswordInput(e.target.value),
                      })}
                      style={{ ...inputStyle, paddingRight: 44 }}
                      onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 18 }}>
                      {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {passwordInput && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${strength.score}%`, background: strength.color, transition: "all .3s" }} />
                      </div>
                      <span style={{ fontSize: 10, color: strength.color, marginTop: 3, display: "block" }}>{strength.label}</span>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <div style={{ position: "relative", marginBottom: 14 }}>
                    <MdLock style={iconStyle} />
                    <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password"
                      {...signUpForm.register("confirm_password", { required: true })}
                      style={{ ...inputStyle, paddingRight: 44 }}
                      onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 18 }}>
                      {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>

                  {/* Terms Checkbox */}
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, cursor: "pointer" }}>
                    <input type="checkbox" {...signUpForm.register("agree_terms")}
                      style={{ marginTop: 2, accentColor: "#6366F1", width: 14, height: 14, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                      I agree to the <span style={{ color: "#6366F1" }}>Terms of Service</span> and <span style={{ color: "#6366F1" }}>Privacy Policy</span>
                    </span>
                  </label>


                  <button type="submit" disabled={isLoading}
                    style={{
                      width: "100%", padding: "12px 0",
                      background: isLoading ? "rgba(99,102,241,0.5)"
                        : selectedRole.id === "admin" ? "linear-gradient(135deg, #EC4899, #8B5CF6)"
                        : selectedRole.requiresApproval ? "linear-gradient(135deg, #D97706, #F59E0B)"
                        : "linear-gradient(135deg, #2563EB, #6366F1)",
                      border: "none", borderRadius: 10, color: "white",
                      fontSize: 14, fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                    }}>
                    {isLoading ? "Creating account…" : `Create ${selectedRole.label} Account →`}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── SSO Modal for Google & Okta ──────────────────────────── */}
      <AnimatePresence>
        {ssoModal && (
          <motion.div key="sso-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setSsoModal(null)}
          >
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "linear-gradient(145deg, #141824, #0f1520)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20, padding: 36, width: 400, position: "relative",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              }}
            >
              <button onClick={() => setSsoModal(null)}
                style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 20 }}>
                <MdClose />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14,
                  background: ssoModal === "google" ? "rgba(255,255,255,0.08)" : "rgba(0,125,193,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: ssoModal === "google" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,125,193,0.3)",
                }}>
                  {ssoModal === "google" ? <FcGoogle size={28} /> : <SiOkta size={24} color="#007DC1" />}
                </div>
                <div>
                  <h3 style={{ color: "white", fontSize: 17, fontWeight: 700, margin: 0 }}>
                    {ssoModal === "google" ? "Google Workspace" : "Okta Enterprise"} SSO
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "3px 0 0" }}>
                    {activeTab === "register"
                      ? <>Registering platform role as <strong style={{ color: "#6366F1" }}>{ssoTargetRole.toUpperCase()}</strong></>
                      : "Enter your work email to authenticate via Enterprise SSO"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSSOModalSubmit}>
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <MdEmail style={iconStyle} />
                  <input
                    type="email"
                    placeholder={ssoModal === "google" ? "user@company.com" : "user@oktaidentity.com"}
                    value={ssoEmail}
                    onChange={e => setSsoEmail(e.target.value)}
                    autoFocus
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                </div>

                <button type="submit" disabled={ssoLoading}
                  style={{
                    width: "100%", padding: "12px 0",
                    background: ssoLoading ? "rgba(99,102,241,0.4)"
                      : ssoModal === "google"
                        ? "linear-gradient(135deg, #4285F4, #34A853)"
                        : "linear-gradient(135deg, #007DC1, #00AAFF)",
                    border: "none", borderRadius: 10, color: "white",
                    fontSize: 14, fontWeight: 700, cursor: ssoLoading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                  {ssoLoading ? "Connecting…" : (
                    <>{ssoModal === "google" ? <FcGoogle size={16} /> : <SiOkta size={14} color="white" />}
                      {activeTab === "register" ? `Authorize ${ssoTargetRole.toUpperCase()} Account` : "Authorize Single Sign-On"}</>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Forgot Password Modal ───────────────────────────────── */}
      <AnimatePresence>
        {isForgotModalOpen && (
          <motion.div key="forgot"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
            }}
            onClick={() => setIsForgotModalOpen(false)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#141824", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16, padding: 32, width: 380, position: "relative",
              }}>
              <button onClick={() => setIsForgotModalOpen(false)}
                style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 20 }}>
                <MdClose />
              </button>
              <MdShield style={{ fontSize: 32, color: "#6366F1", marginBottom: 12 }} />
              <h3 style={{ color: "white", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Reset Password</h3>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 20 }}>
                Enter your work email and we'll send a secure reset link.
              </p>
              <form onSubmit={handleForgotPassword}>
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <MdEmail style={iconStyle} />
                  <input type="email" placeholder="your@company.com" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                </div>
                <button type="submit"
                  style={{
                    width: "100%", padding: "11px 0",
                    background: "linear-gradient(135deg, #2563EB, #6366F1)",
                    border: "none", borderRadius: 10, color: "white",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}>
                  Send Reset Link
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
