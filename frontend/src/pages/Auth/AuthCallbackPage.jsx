import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState("exchanging");
  const [errorMsg, setErrorMsg] = useState("");
  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      let provider = "Enterprise SSO";
      try {
        const decoded = JSON.parse(atob(decodeURIComponent(state || "")));
        if (decoded.provider) provider = decoded.provider;
      } catch {
      }
      if (error || !code) {
        setStatus("error");
        setErrorMsg("SSO authorization was cancelled or failed. Please try again.");
        toast.error("SSO authorization failed");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }
      try {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const response = await api.post(`/auth/sso/${provider}/callback`, {
          code,
          redirect_uri: redirectUri,
          state
        });
        const { access_token, user } = response.data;
        sessionStorage.setItem("access_token", access_token);
        sessionStorage.setItem("user", JSON.stringify(user));
        setStatus("success");
        toast.success(`Welcome, ${user.first_name}! Signed in via ${provider}`);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1200);
      } catch (err) {
        setStatus("error");
        const msg = err?.response?.data?.detail || "Authentication rejected. Unregistered account.";
        setErrorMsg(msg);
        toast.error(msg);
        setTimeout(() => {
          window.location.href = "/login";
        }, 2500);
      }
    }
    handleCallback();
  }, []);
  return <div style={{
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0B0F18",
    fontFamily: "var(--font-sans)"
  }}>
      <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    style={{
      textAlign: "center",
      padding: "48px 40px",
      background: "rgba(17, 24, 39, 0.9)",
      backdropFilter: "blur(20px)",
      borderRadius: "20px",
      border: "1px solid rgba(255,255,255,0.1)",
      width: 380,
      boxShadow: "0 25px 50px rgba(0,0,0,0.6)"
    }}
  >
        {
    /* Logo */
  }
        <div style={{
    width: 56,
    height: 56,
    background: "linear-gradient(135deg, #2563EB, #6366F1)",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    boxShadow: "0 8px 24px rgba(37,99,235,0.4)"
  }}>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="2.2" fill="#93C5FD"/>
    </svg>
  </div>

        {
    /* Status: Exchanging */
  }
        {status === "exchanging" && <>
            {
    /* Spinner */
  }
            <div style={{
    width: 48,
    height: 48,
    border: "3px solid rgba(99,102,241,0.2)",
    borderTopColor: "#6366F1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 20px"
  }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "white", margin: "0 0 8px" }}>
              Authenticating...
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
              Verifying your identity with the SSO provider.<br />Please wait a moment.
            </p>
          </>}

        {
    /* Status: Success */
  }
        {status === "success" && <>
            <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 300 }}
    style={{
      width: 52,
      height: 52,
      background: "rgba(16,185,129,0.15)",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 20px",
      fontSize: 26
    }}
  >✅</motion.div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#10B981", margin: "0 0 8px" }}>
              Authentication Successful
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
              Redirecting you to your dashboard...
            </p>
          </>}

        {
    /* Status: Error */
  }
        {status === "error" && <>
            <div style={{
    width: 52,
    height: 52,
    background: "rgba(239,68,68,0.15)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    fontSize: 26
  }}>❌</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#EF4444", margin: "0 0 8px" }}>
              Authentication Failed
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 20px", lineHeight: 1.6 }}>
              {errorMsg}
            </p>
            <button
    onClick={() => navigate("/login")}
    style={{
      padding: "10px 24px",
      background: "linear-gradient(135deg, #2563EB, #4F46E5)",
      border: "none",
      borderRadius: 8,
      color: "white",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }}
  >
              Back to Login
            </button>
          </>}
      </motion.div>
    </div>;
}
