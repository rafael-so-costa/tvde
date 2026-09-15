import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Car, FileText, Receipt, CarFront, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function MotoristaDashboard() {
  const { user } = useAuth();

  const { data: motorista, isLoading } = useQuery({
    queryKey: ["motorista-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, nome_completo, foto_perfil_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: veiculo } = useQuery({
    queryKey: ["motorista-dash-veiculo", motorista?.id],
    queryFn: async () => {
      const { data: contrato } = await supabase
        .from("contratos")
        .select("veiculo_id")
        .eq("motorista_id", motorista!.id)
        .in("status", ["assinado", "enviado"])
        .maybeSingle();
      if (!contrato?.veiculo_id) return null;
      const { data } = await supabase
        .from("veiculos")
        .select("marca, modelo, matricula, cor, combustivel, foto_principal_url")
        .eq("id", contrato.veiculo_id)
        .single();
      return data;
    },
    enabled: !!motorista?.id,
  });

  const { data: contratoAtivo } = useQuery({
    queryKey: ["motorista-dash-contrato", motorista?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("id, tipo, status, data_inicio, data_fim, valor_semanal")
        .eq("motorista_id", motorista!.id)
        .in("status", ["assinado", "enviado"])
        .maybeSingle();
      return data;
    },
    enabled: !!motorista?.id,
  });

  const { data: multasCount = 0 } = useQuery({
    queryKey: ["motorista-dash-multas", motorista?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("multas")
        .select("id", { count: "exact", head: true })
        .eq("motorista_id", motorista!.id);
      return count || 0;
    },
    enabled: !!motorista?.id,
  });

  const { data: sinistrosCount = 0 } = useQuery({
    queryKey: ["motorista-dash-sinistros", motorista?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("sinistros")
        .select("id", { count: "exact", head: true })
        .eq("motorista_id", motorista!.id);
      return count || 0;
    },
    enabled: !!motorista?.id,
  });

  if (isLoading) {
    return (
      <AppLayout title="Dashboard" subtitle="Motorista">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!motorista) {
    return (
      <AppLayout title="Dashboard" subtitle="Motorista">
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Perfil não encontrado</h2>
          <p className="text-muted-foreground">O seu perfil de motorista ainda não foi vinculado.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle={`Olá, ${motorista.nome_completo}`}>
      {/* Vehicle Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="w-5 h-5 text-primary" />
            Veículo Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {veiculo ? (
            <div className="flex items-center gap-4">
              {veiculo.foto_principal_url && (
                <img src={veiculo.foto_principal_url} alt="Veículo" className="w-20 h-20 rounded-lg object-cover" />
              )}
              <div>
                <p className="font-semibold">{veiculo.marca} {veiculo.modelo}</p>
                <p className="text-muted-foreground">{veiculo.matricula}</p>
                <p className="text-sm text-muted-foreground">{veiculo.cor} • {veiculo.combustivel}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum veículo atribuído no momento.</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contrato Ativo</p>
              {contratoAtivo ? (
                <>
                  <p className="font-semibold">{contratoAtivo.tipo}</p>
                  {contratoAtivo.valor_semanal && (
                    <p className="text-xs text-muted-foreground">{contratoAtivo.valor_semanal}€/semana</p>
                  )}
                </>
              ) : (
                <p className="font-semibold text-muted-foreground">Nenhum</p>
              )}
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

      {/* Active Contract Details */}
      {contratoAtivo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-primary" />
              Detalhes do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{contratoAtivo.tipo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="default">{contratoAtivo.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Início</p>
                <p className="font-medium">
                  {contratoAtivo.data_inicio ? new Date(contratoAtivo.data_inicio).toLocaleDateString("pt-PT") : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fim</p>
                <p className="font-medium">
                  {contratoAtivo.data_fim ? new Date(contratoAtivo.data_fim).toLocaleDateString("pt-PT") : "Indeterminado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
