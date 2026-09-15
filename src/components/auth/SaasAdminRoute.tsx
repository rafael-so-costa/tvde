import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSaasAcesso } from "@/hooks/useSaas";

export function SaasAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { loading, isSaasAdmin } = useSaasAcesso();

  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (loading) return null;
  if (!isSaasAdmin) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}
