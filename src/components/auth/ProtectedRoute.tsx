import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useLoadingLogger, useRenderLogger } from "@/hooks/useNavigationLogger";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireTenant?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireTenant = false,
}: ProtectedRouteProps) {
  const { user, loading, activeRole, needsRoleSelection, profile } = useAuth();
  const location = useLocation();
  useRenderLogger(`ProtectedRoute:${location.pathname}`);
  useLoadingLogger("auth", loading);

  // Only show the full-screen loader on the very first auth check
  // (no user yet). Once authenticated, never re-render the loader
  // on route changes / token refreshes — that caused the "Carregando..."
  // flash between every navigation.
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // After login the auth user can be available before profile/roles finish loading.
  // Do not redirect to /auth while that role data is still resolving, otherwise
  // the app bounces between / and /auth and the screen keeps blinking.
  if (loading && user) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Redirect to auth if user needs to select a role
  if (needsRoleSelection || !activeRole) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user has required roles based on active role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.includes(activeRole);
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check if tenant is required and user has one
  if (requireTenant && !profile?.tenant_id) {
    return <Navigate to="/setup-tenant" replace />;
  }

  return <>{children}</>;
}
