import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

// Request Interceptor — attach JWT Access Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor — Handle 401 Expired Token & Refresh Token Flow
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginOrRegister = originalRequest?.url?.includes("/auth/login") || originalRequest?.url?.includes("/auth/register");

    if (error.response?.status === 401 && !isLoginOrRegister && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const refreshRes = await axios.post(`${API_BASE}/auth/refresh?refresh_token=${refreshToken}`);
        const newAccessToken = refreshRes.data.access_token;

        localStorage.setItem("access_token", newAccessToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { api };

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mount Effect — Verify active session via /auth/me
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        api.get("/auth/me")
          .then((res) => {
            setUser(res.data);
            localStorage.setItem("user", JSON.stringify(res.data));
          })
          .catch((err) => {
            if (err.response?.status === 401) {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("user");
              setUser(null);
            }
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.clear();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Login — Strict real FastAPI auth (POST /api/v1/auth/login)
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token, refresh_token, user: userData } = response.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      toast.success(`Welcome back, ${userData.first_name || 'User'}! 🎉`);
      return userData;
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || (err.response ? "Invalid credentials" : "Server connection failed");
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout — Strict backend + local cleanup (POST /api/v1/auth/logout)
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      setUser(null);
      toast.success("Logged out successfully");
    }
  };

  const updateUser = (updates) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
    }
  };

  // ── RBAC Permission Helpers ────────────────────────────────────────────────
  const _role = (user?.role || "").toLowerCase().trim();

  const hasRole = (...roles) => roles.map(r => r.toLowerCase()).includes(_role);

  const isAdmin    = _role === "admin";
  const isManager  = _role === "manager" || _role === "procurement_manager";
  const isBuyer    = _role === "buyer";
  const isFinance  = _role === "finance";
  const isAuditor  = _role === "auditor" || _role === "viewer";
  const isSupplier = _role === "supplier";

  /** Can initiate / create procurement records */
  const canCreateProcurement = isAdmin || isManager || isBuyer;

  /** Can approve Purchase Requests */
  const canApprovePR = isAdmin || isManager || isFinance;

  /** Can approve Purchase Orders */
  const canApprovePO = isAdmin || isManager || isFinance;

  /** Only Finance or Admin can approve / pay invoices (separation of duties) */
  const canApproveInvoice = isAdmin || isFinance;

  /** Can run 3-way match */
  const canRunMatch = isAdmin || isBuyer || isFinance || isManager;

  /** Can mutate data (not Auditor or Supplier) */
  const canMutate = !isAuditor && !isSupplier;

  /** Can manage budgets */
  const canManageBudget = isAdmin || isFinance || isManager;

  /** Can manage suppliers */
  const canManageSuppliers = isAdmin || isBuyer || isManager;

  /** Can manage contracts */
  const canManageContracts = isAdmin || isFinance || isManager;
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        // role helpers
        hasRole,
        isAdmin,
        isManager,
        isBuyer,
        isFinance,
        isAuditor,
        isSupplier,
        // action guards
        canCreateProcurement,
        canApprovePR,
        canApprovePO,
        canApproveInvoice,
        canRunMatch,
        canMutate,
        canManageBudget,
        canManageSuppliers,
        canManageContracts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
