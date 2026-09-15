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

export default function ProprietarioPortal() {
  const { user } = useAuth();

  // Fetch proprietario profile linked to this user
  const { data: proprietario, isLoading } = useQuery({
    queryKey: ["proprietario-portal", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proprietarios")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch vehicles owned
  const { data: veiculos = [] } = useQuery({
    queryKey: ["proprietario-veiculos", proprietario?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("veiculos")
        .select("*")
        .eq("proprietario_id", proprietario!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!proprietario?.id,
  });

  // Fetch contracts for owner's vehicles
  const { data: contratos = [] } = useQuery({
    queryKey: ["proprietario-contratos", proprietario?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("*, veiculos(matricula, marca, modelo), motoristas(nome_completo)")
        .eq("proprietario_id", proprietario!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!proprietario?.id,
  });

  // Fetch fines for owner's vehicles
  const vehicleIds = veiculos.map(v => v.id);
  const { data: multas = [] } = useQuery({
    queryKey: ["proprietario-multas", vehicleIds],
    queryFn: async () => {
      if (vehicleIds.length === 0) return [];
      const { data } = await supabase
        .from("multas")
        .select("*, veiculos(matricula, marca, modelo)")
        .in("veiculo_id", vehicleIds)
        .order("data_multa", { ascending: false });
      return data || [];
    },
    enabled: vehicleIds.length > 0,
  });

  // Fetch claims for owner's vehicles
  const { data: sinistros = [] } = useQuery({
    queryKey: ["proprietario-sinistros", vehicleIds],
    queryFn: async () => {
      if (vehicleIds.length === 0) return [];
      const { data } = await supabase
        .from("sinistros")
        .select("*, veiculos(matricula, marca, modelo)")
        .in("veiculo_id", vehicleIds)
        .order("data_sinistro", { ascending: false });
      return data || [];
    },
    enabled: vehicleIds.length > 0,
  });

  // Fetch maintenance for owner's vehicles
  const { data: manutencoes = [] } = useQuery({
    queryKey: ["proprietario-manutencoes", vehicleIds],
    queryFn: async () => {
      if (vehicleIds.length === 0) return [];
      const { data } = await supabase
        .from("manutencoes")
        .select("*, veiculos(matricula, marca, modelo)")
        .in("veiculo_id", vehicleIds)
        .order("data_servico", { ascending: false });
      return data || [];
    },
    enabled: vehicleIds.length > 0,
  });

  if (isLoading) {
    return (
      <AppLayout title="Meu Portal" subtitle="Proprietário">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!proprietario) {
    return (
      <AppLayout title="Meu Portal" subtitle="Proprietário">
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Perfil não encontrado</h2>
          <p className="text-muted-foreground">O seu perfil de proprietário ainda não foi vinculado.</p>
        </div>
      </AppLayout>
    );
  }

  const displayName = proprietario.tipo === "empresa" 
    ? proprietario.nome_empresa 
    : proprietario.nome_completo;

  return (
    <AppLayout title="Meu Portal" subtitle={`Olá, ${displayName}`}>
      {/* Vehicles Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Car className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{veiculos.length}</p>
              <p className="text-sm text-muted-foreground">Veículos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{contratos.length}</p>
              <p className="text-sm text-muted-foreground">Contratos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{multas.length}</p>
              <p className="text-sm text-muted-foreground">Multas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="veiculos">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="veiculos">Veículos</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="multas">Multas</TabsTrigger>
          <TabsTrigger value="sinistros">Sinistros</TabsTrigger>
        </TabsList>

        <TabsContent value="veiculos" className="space-y-3 mt-4">
          {veiculos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum veículo registado.</p>
          ) : (
            veiculos.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  {v.foto_principal_url && (
                    <img src={v.foto_principal_url} alt="Veículo" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{v.marca} {v.modelo}</p>
                    <p className="text-muted-foreground">{v.matricula}</p>
                    <p className="text-sm text-muted-foreground">{v.cor} • {v.combustivel}</p>
                  </div>
                  <Badge variant={v.ativo ? "default" : "secondary"}>
                    {v.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="contratos" className="space-y-3 mt-4">
          {contratos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum contrato encontrado.</p>
          ) : (
            contratos.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{c.veiculos?.matricula} - {c.motoristas?.nome_completo || "Sem motorista"}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.data_inicio && format(new Date(c.data_inicio), "dd/MM/yyyy")}
                      {c.data_fim && ` - ${format(new Date(c.data_fim), "dd/MM/yyyy")}`}
                    </p>
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
