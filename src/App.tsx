import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { FloatingChatProvider } from "@/contexts/FloatingChatContext";
import { FloatingChatManager } from "@/components/chat/FloatingChatManager";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import { useNavigationLogger, useRenderLogger } from "@/hooks/useNavigationLogger";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Unauthorized from "./pages/Unauthorized";
import Owners from "./pages/Owners";
import Companies from "./pages/Companies";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Contracts from "./pages/Contracts";
import Alugueres from "./pages/Alugueres";
import Templates from "./pages/Templates";
import Fines from "./pages/Fines";
import Claims from "./pages/Claims";
import Alerts from "./pages/Alerts";
// Payments removed
import Settings from "./pages/Settings";
import MotoristaProfile from "./pages/MotoristaProfile";
import ProprietarioProfile from "./pages/ProprietarioProfile";
import Employees from "./pages/Employees";
import Messages from "./pages/Messages";
import Tenants from "./pages/Tenants";
import Maintenance from "./pages/Maintenance";
import ChecklistPage from "./pages/ChecklistPage";
import PortalChecklistPage from "./pages/PortalChecklistPage";
import SystemSummary from "./pages/SystemSummary";
import Chat from "./pages/Chat";
import Assinaturas from "./pages/Assinaturas";
import MotoristaRegistoCriminal from "./pages/MotoristaRegistoCriminal";
import RegistosCriminais from "./pages/RegistosCriminais";
import MotoristaExpediente from "./pages/MotoristaExpediente";
import RegistoExpedientePublico from "./pages/RegistoExpedientePublico";
import GestaoExpediente from "./pages/GestaoExpediente";
import MotoristaRecibosVerdes from "./pages/MotoristaRecibosVerdes";
import GestaoRecibosVerdes from "./pages/GestaoRecibosVerdes";
import { SaasAdminRoute } from "./components/auth/SaasAdminRoute";
import SaasDashboard from "./pages/saas/SaasDashboard";
import SaasClientes from "./pages/saas/SaasClientes";
import SaasPlanos from "./pages/saas/SaasPlanos";
import SaasFaturas from "./pages/saas/SaasFaturas";
import SaasPagamentos from "./pages/saas/SaasPagamentos";
import SaasEquipa from "./pages/saas/SaasEquipa";
import SaasConfiguracoes from "./pages/saas/SaasConfiguracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min – avoid hammering the backend on every navigation
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false, // do not refetch on tab focus (was causing flashes)
      refetchOnReconnect: true,
      retry: 1, // avoid retry storms when the network is flaky
    },
  },
});

// Global unhandled rejection handler to prevent white screen crashes
function useGlobalErrorHandler() {
  useEffect(() => {
    // Suppress duplicate toasts within a short window to avoid spamming the UI
    // (e.g. when many parallel requests fail with a network error).
    let lastToastAt = 0;
    const maybeToast = (message: string) => {
      const now = Date.now();
      if (now - lastToastAt < 5000) return;
      lastToastAt = now;
      toast.error(message);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      const msg = String(event.reason?.message || event.reason || "");
      // Don't toast for transient network errors — they would create a flash loop.
      if (!/NetworkError|Failed to fetch|TypeError: Load failed/i.test(msg)) {
        maybeToast("Ocorreu um erro inesperado. Tente novamente.");
      }
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      const msg = String(event.error?.message || event.message || "");
      if (!/NetworkError|Failed to fetch|ResizeObserver/i.test(msg)) {
        maybeToast("Ocorreu um erro inesperado. Tente novamente.");
      }
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);
}

function ProfileRouter() {
  const { activeRole } = useAuth();
  if (activeRole === "proprietario") return <ProprietarioProfile />;
  return <MotoristaProfile />;
}

function RouteLoggerMount() {
  useNavigationLogger();
  return null;
}

function AppContent() {
  useGlobalErrorHandler();
  useRenderLogger("AppContent");
  
  return (
    <BrowserRouter>
      <RouteLoggerMount />
      <Routes>

        {/* Public routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <Companies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owners"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <Owners />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["motorista", "proprietario"]}>
              {/* Rendered conditionally inside */}
              <ProfileRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa", "proprietario", "motorista"]}>
              <Vehicles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drivers"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <Drivers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa", "motorista", "proprietario"]}>
              <Contracts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alugueres"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <Alugueres />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <Templates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fines"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa", "motorista", "proprietario"]}>
              <Fines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/claims"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa", "motorista", "proprietario"]}>
              <Claims />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <Alerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Tenants />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa", "proprietario"]}>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checklist"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <ChecklistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal-checklist"
          element={
            <ProtectedRoute allowedRoles={["motorista", "proprietario"]}>
              <PortalChecklistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system-summary"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <SystemSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assinaturas"
          element={
            <ProtectedRoute>
              <Assinaturas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registo-criminal"
          element={
            <ProtectedRoute allowedRoles={["motorista"]}>
              <MotoristaRegistoCriminal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registos-criminais"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <RegistosCriminais />
            </ProtectedRoute>
          }
        />
        <Route path="/registo-expediente-publico" element={<RegistoExpedientePublico />} />
        <Route
          path="/registo-expediente"
          element={
            <ProtectedRoute allowedRoles={["motorista"]}>
              <MotoristaExpediente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recibos-verdes"
          element={
            <ProtectedRoute allowedRoles={["motorista"]}>
              <MotoristaRecibosVerdes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao-expediente"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <GestaoExpediente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao-recibos-verdes"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin_empresa"]}>
              <GestaoRecibosVerdes />
            </ProtectedRoute>
          }
        />
        <Route path="/gestao-interna-9f4c" element={<SaasAdminRoute><SaasDashboard /></SaasAdminRoute>} />
        <Route path="/gestao-interna-9f4c/clientes" element={<SaasAdminRoute><SaasClientes /></SaasAdminRoute>} />
        <Route path="/gestao-interna-9f4c/planos" element={<SaasAdminRoute><SaasPlanos /></SaasAdminRoute>} />
        <Route path="/gestao-interna-9f4c/faturas" element={<SaasAdminRoute><SaasFaturas /></SaasAdminRoute>} />
        <Route path="/gestao-interna-9f4c/pagamentos" element={<SaasAdminRoute><SaasPagamentos /></SaasAdminRoute>} />
        <Route path="/gestao-interna-9f4c/equipa" element={<SaasAdminRoute><SaasEquipa /></SaasAdminRoute>} />
        <Route path="/gestao-interna-9f4c/configuracoes" element={<SaasAdminRoute><SaasConfiguracoes /></SaasAdminRoute>} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TenantProvider>
          <FloatingChatProvider>
            <Toaster />
            <Sonner />
            <AppContent />
            <FloatingChatManager />
          </FloatingChatProvider>
        </TenantProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;