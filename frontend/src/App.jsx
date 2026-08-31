import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainLayout from "./components/layout/MainLayout";
import "./index.css";

const LoginPage            = lazy(() => import("./pages/Login/LoginPage"));
const DashboardPage        = lazy(() => import("./pages/Dashboard/DashboardPage"));
const SuppliersPage        = lazy(() => import("./pages/Suppliers/SuppliersPage"));
const VendorScorecardPage  = lazy(() => import("./pages/Suppliers/VendorScorecardPage"));
const PurchaseRequestsPage = lazy(() => import("./pages/PurchaseRequests/PurchaseRequestsPage"));
const PurchaseOrdersPage   = lazy(() => import("./pages/PurchaseOrders/PurchaseOrdersPage"));
const RFQPage              = lazy(() => import("./pages/RFQ/RFQPage"));
const QuotationsPage       = lazy(() => import("./pages/Quotations/QuotationsPage"));
const InventoryPage        = lazy(() => import("./pages/Inventory/InventoryPage"));
const InvoicesPage         = lazy(() => import("./pages/Invoices/InvoicesPage"));
const ThreeWayMatchingPage = lazy(() => import("./pages/ThreeWayMatching/ThreeWayMatchingPage"));
const ContractsPage        = lazy(() => import("./pages/Contracts/ContractsPage"));
const AnalyticsPage        = lazy(() => import("./pages/Analytics/AnalyticsPage"));
const SpendForecastPage    = lazy(() => import("./pages/Analytics/SpendForecastPage"));
const AIAssistantPage      = lazy(() => import("./pages/AI/AIAssistantPage"));
const ReportsPage          = lazy(() => import("./pages/Reports/ReportsPage"));
const CompliancePage       = lazy(() => import("./pages/Compliance/CompliancePage"));
const BudgetPage           = lazy(() => import("./pages/Budget/BudgetPage"));
const SettingsPage         = lazy(() => import("./pages/Settings/SettingsPage"));
const ProfilePage          = lazy(() => import("./pages/Profile/ProfilePage"));
const AuthCallbackPage     = lazy(() => import("./pages/Auth/AuthCallbackPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", minHeight: "400px", flexDirection: "column", gap: "16px"
    }}>
      <div style={{
        width: "36px", height: "36px",
        border: "3px solid var(--border-color)", borderTopColor: "var(--primary)",
        borderRadius: "50%", animation: "spin 0.8s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading...</p>
    </div>
  );
}

function AppLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "var(--bg-app)", flexDirection: "column", gap: "20px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <div style={{
          width: "48px", height: "48px", background: "var(--gradient-brand)",
          borderRadius: "14px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "24px", boxShadow: "0 4px 20px rgba(99,102,241,0.4)"
        }}>⚡</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "20px", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
            IntelliProcure AI
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Enterprise Platform</div>
        </div>
      </div>
      <div style={{
        width: "44px", height: "44px",
        border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "var(--primary)",
        borderRadius: "50%", animation: "spin 0.8s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Initializing platform...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "var(--bg-card)", color: "var(--text-primary)",
                  border: "1px solid var(--border-color)", borderRadius: "10px",
                  fontSize: "13.5px", boxShadow: "var(--shadow-lg)", fontFamily: "var(--font-sans)"
                },
                success: { iconTheme: { primary: "#10B981", secondary: "white" } },
                error:   { iconTheme: { primary: "#EF4444", secondary: "white" } },
              }}
            />

            <Routes>
              {/* Public */}
              <Route path="/login" element={<Suspense fallback={<AppLoader />}><LoginPage /></Suspense>} />
              <Route path="/auth/callback" element={<Suspense fallback={<AppLoader />}><AuthCallbackPage /></Suspense>} />

              {/* Protected – all wrapped in MainLayout */}
              <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard"                element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
                <Route path="suppliers"                element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
                <Route path="suppliers/:id/scorecard"  element={<Suspense fallback={<PageLoader />}><VendorScorecardPage /></Suspense>} />
                <Route path="purchase-requests"        element={<Suspense fallback={<PageLoader />}><PurchaseRequestsPage /></Suspense>} />
                <Route path="purchase-orders"          element={<Suspense fallback={<PageLoader />}><PurchaseOrdersPage /></Suspense>} />
                <Route path="rfqs"                     element={<Suspense fallback={<PageLoader />}><RFQPage /></Suspense>} />
                <Route path="quotations"               element={<Suspense fallback={<PageLoader />}><QuotationsPage /></Suspense>} />
                <Route path="inventory"                element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />
                <Route path="invoices"                 element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
                <Route path="matching"                 element={<Suspense fallback={<PageLoader />}><ThreeWayMatchingPage /></Suspense>} />
                <Route path="contracts"                element={<Suspense fallback={<PageLoader />}><ContractsPage /></Suspense>} />
                <Route path="analytics"                element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
                <Route path="analytics/spend-forecast" element={<Suspense fallback={<PageLoader />}><SpendForecastPage /></Suspense>} />
                <Route path="ai-assistant"             element={<Suspense fallback={<PageLoader />}><AIAssistantPage /></Suspense>} />
                <Route path="reports"                  element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
                <Route path="compliance"               element={<Suspense fallback={<PageLoader />}><CompliancePage /></Suspense>} />
                <Route path="budget"                   element={<Suspense fallback={<PageLoader />}><BudgetPage /></Suspense>} />
                <Route path="settings"                 element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
                <Route path="profile"                  element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
