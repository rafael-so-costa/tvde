import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Car, FileText, Receipt, CarFront, Wrench, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function MotoristaPortal() {
  const { user } = useAuth();

  // Fetch motorista profile linked to this user
  const { data: motorista, isLoading: motoristaLoading } = useQuery({
    queryKey: ["motorista-portal", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motoristas")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch assigned vehicle via active contract
  const { data: veiculo } = useQuery({
    queryKey: ["motorista-veiculo", motorista?.id],
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
        .select("*")
        .eq("id", contrato.veiculo_id)
        .single();
      return data;
    },
    enabled: !!motorista?.id,
  });

  // Fetch contracts
  const { data: contratos = [] } = useQuery({
    queryKey: ["motorista-contratos", motorista?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("*")
        .eq("motorista_id", motorista!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!motorista?.id,
  });

  // Fetch fines
  const { data: multas = [] } = useQuery({
    queryKey: ["motorista-multas", motorista?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("multas")
        .select("*, veiculos(matricula, marca, modelo)")
        .eq("motorista_id", motorista!.id)
        .order("data_multa", { ascending: false });
      return data || [];
    },
    enabled: !!motorista?.id,
  });

  // Fetch claims
  const { data: sinistros = [] } = useQuery({
    queryKey: ["motorista-sinistros", motorista?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sinistros")
        .select("*, veiculos(matricula, marca, modelo)")
        .eq("motorista_id", motorista!.id)
        .order("data_sinistro", { ascending: false });
      return data || [];
    },
    enabled: !!motorista?.id,
  });

  if (motoristaLoading) {
    return (
      <AppLayout title="Meu Portal" subtitle="Motorista">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!motorista) {
    return (
      <AppLayout title="Meu Portal" subtitle="Motorista">
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Perfil não encontrado</h2>
          <p className="text-muted-foreground">O seu perfil de motorista ainda não foi vinculado.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Meu Portal" subtitle={`Olá, ${motorista.nome_completo}`}>
      {/* Vehicle Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Meu Veículo
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

      {/* Tabs */}
      <Tabs defaultValue="contratos">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contratos">
            <FileText className="w-4 h-4 mr-2" />
            Contratos ({contratos.length})
          </TabsTrigger>
          <TabsTrigger value="multas">
            <Receipt className="w-4 h-4 mr-2" />
            Multas ({multas.length})
          </TabsTrigger>
          <TabsTrigger value="sinistros">
            <CarFront className="w-4 h-4 mr-2" />
            Sinistros ({sinistros.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="space-y-3 mt-4">
          {contratos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum contrato encontrado.</p>
          ) : (
            contratos.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">Contrato {c.tipo}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.data_inicio && format(new Date(c.data_inicio), "dd/MM/yyyy")}
                      {c.data_fim && ` - ${format(new Date(c.data_fim), "dd/MM/yyyy")}`}
                    </p>
                    {c.valor_semanal && (
                      <p className="text-sm">Valor semanal: {c.valor_semanal}€</p>
                    )}
                  </div>
                  <Badge variant={c.status === "assinado" ? "default" : "secondary"}>
                    {c.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="multas" className="space-y-3 mt-4">
          {multas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma multa encontrada.</p>
          ) : (
            multas.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{m.descricao || "Multa"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(m.data_multa), "dd/MM/yyyy")} • {m.veiculos?.matricula}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{m.valor}€</p>
                    <Badge variant={m.status === "paid" ? "default" : "destructive"}>
                      {m.status === "paid" ? "Paga" : "Pendente"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sinistros" className="space-y-3 mt-4">
          {sinistros.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum sinistro encontrado.</p>
          ) : (
            sinistros.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.descricao || "Sinistro"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(s.data_sinistro), "dd/MM/yyyy")} • {s.veiculos?.matricula}
                    </p>
                  </div>
                  <Badge variant={s.status === "closed" ? "default" : "secondary"}>
                    {s.status === "closed" ? "Fechado" : "Aberto"}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
