import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Car, FileText, Receipt, CarFront, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProprietarioDashboard() {
  const { user } = useAuth();

  const { data: proprietario, isLoading } = useQuery({
    queryKey: ["proprietario-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proprietarios")
        .select("id, nome_completo, nome_empresa, tipo, foto_perfil_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const displayName = proprietario?.tipo === "empresa"
    ? proprietario?.nome_empresa
    : proprietario?.nome_completo;

  const { data: veiculosCount = 0 } = useQuery({
    queryKey: ["prop-dash-veiculos", proprietario?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("veiculos")
        .select("id", { count: "exact", head: true })
        .eq("proprietario_id", proprietario!.id);
      return count || 0;
    },
    enabled: !!proprietario?.id,
  });

  const { data: contratosCount = 0 } = useQuery({
    queryKey: ["prop-dash-contratos", proprietario?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("contratos")
        .select("id", { count: "exact", head: true })
        .eq("proprietario_id", proprietario!.id);
      return count || 0;
    },
    enabled: !!proprietario?.id,
  });

  const { data: vehicleIds = [] } = useQuery({
    queryKey: ["prop-dash-vids", proprietario?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("veiculos")
        .select("id")
        .eq("proprietario_id", proprietario!.id);
      return (data || []).map(v => v.id);
    },
    enabled: !!proprietario?.id,
  });

  const { data: multasCount = 0 } = useQuery({
    queryKey: ["prop-dash-multas", vehicleIds],
    queryFn: async () => {
      if (vehicleIds.length === 0) return 0;
      const { count } = await supabase
        .from("multas")
        .select("id", { count: "exact", head: true })
        .in("veiculo_id", vehicleIds);
      return count || 0;
    },
    enabled: vehicleIds.length > 0,
  });

  const { data: sinistrosCount = 0 } = useQuery({
    queryKey: ["prop-dash-sinistros", vehicleIds],
    queryFn: async () => {
      if (vehicleIds.length === 0) return 0;
      const { count } = await supabase
        .from("sinistros")
        .select("id", { count: "exact", head: true })
        .in("veiculo_id", vehicleIds);
      return count || 0;
    },
    enabled: vehicleIds.length > 0,
  });

  if (isLoading) {
    return (
      <AppLayout title="Dashboard" subtitle="Proprietário">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!proprietario) {
    return (
      <AppLayout title="Dashboard" subtitle="Proprietário">
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Perfil não encontrado</h2>
          <p className="text-muted-foreground">O seu perfil de proprietário ainda não foi vinculado.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle={`Olá, ${displayName}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Veículos</p>
              <p className="font-semibold text-2xl">{veiculosCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contratos</p>
              <p className="font-semibold text-2xl">{contratosCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Multas</p>
              <p className="font-semibold text-2xl">{multasCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <CarFront className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sinistros</p>
              <p className="font-semibold text-2xl">{sinistrosCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
