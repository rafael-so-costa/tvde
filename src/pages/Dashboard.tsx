import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { RecentContracts } from "@/components/dashboard/RecentContracts";
import { AllFines } from "@/components/dashboard/AllFines";
import { AllClaims } from "@/components/dashboard/AllClaims";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Car, Users, FileText, AlertTriangle, Receipt } from "lucide-react";
import { useProprietarios } from "@/hooks/useProprietarios";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useMotoristas } from "@/hooks/useMotoristas";
import { useContratos } from "@/hooks/useContratos";
import { useAlertas } from "@/hooks/useAlertas";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("contracts");
  
  const { data: proprietarios = [], isLoading: proprietariosLoading } = useProprietarios();
  const { data: veiculos = [], isLoading: veiculosLoading } = useVeiculos();
  const { data: motoristas = [], isLoading: motoristasLoading } = useMotoristas();
  const { contratos = [], isLoading: contratosLoading } = useContratos();
  const { data: alertas = [], isLoading: alertasLoading } = useAlertas();
  
  // Calculate real stats from database
  const stats = useMemo(() => {
    const activeProprietarios = proprietarios.filter(p => p.ativo !== false);
    const activeVeiculos = veiculos.filter(v => v.ativo !== false);
    const activeMotoristas = motoristas.filter(m => m.ativo !== false);
    const activeContratos = contratos.filter(c => c.status === "assinado");
    const pendingAlertas = alertas.filter(a => !a.lido);
    const urgentAlertas = alertas.filter(a => !a.lido && a.tipo === "vencimento_documento");
    
    return {
      proprietarios: activeProprietarios.length,
      veiculos: activeVeiculos.length,
      motoristas: activeMotoristas.length,
      motoristasInativos: motoristas.filter(m => m.ativo === false).length,
      contratos: activeContratos.length,
      alertasPendentes: pendingAlertas.length,
      alertasUrgentes: urgentAlertas.length,
    };
  }, [proprietarios, veiculos, motoristas, contratos, alertas]);

  const isLoading = proprietariosLoading || veiculosLoading || motoristasLoading || contratosLoading || alertasLoading;

  return (
    <AppLayout title="Dashboard" subtitle="Bem-vindo ao TVDE Pro">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
          </>
        ) : (
          <>
            <StatCard
              title="Proprietários"
              value={stats.proprietarios}
              change={stats.proprietarios > 0 ? "Ativos" : "Nenhum cadastrado"}
              changeType={stats.proprietarios > 0 ? "positive" : "neutral"}
              icon={Building2}
              iconColor="bg-primary/10 text-primary"
            />
            <StatCard
              title="Veículos Ativos"
              value={stats.veiculos}
              change={stats.veiculos > 0 ? "Ativos" : "Nenhum cadastrado"}
              changeType={stats.veiculos > 0 ? "positive" : "neutral"}
              icon={Car}
              iconColor="bg-success/10 text-success"
            />
            <StatCard
              title="Motoristas"
              value={stats.motoristas}
              change={stats.motoristasInativos > 0 ? `${stats.motoristasInativos} inativos` : "Todos ativos"}
              changeType="neutral"
              icon={Users}
              iconColor="bg-info/10 text-info"
            />
            <StatCard
              title="Contratos Ativos"
              value={stats.contratos}
              change={stats.contratos > 0 ? "Assinados" : "Nenhum ativo"}
              changeType={stats.contratos > 0 ? "positive" : "neutral"}
              icon={FileText}
              iconColor="bg-accent/10 text-accent"
            />
          </>
        )}
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
          </>
        ) : (
          <>
            <StatCard
              title="Alertas Pendentes"
              value={stats.alertasPendentes}
              change={stats.alertasUrgentes > 0 ? `${stats.alertasUrgentes} urgentes` : "Sem alertas urgentes"}
              changeType={stats.alertasUrgentes > 0 ? "negative" : "neutral"}
              icon={AlertTriangle}
              iconColor="bg-destructive/10 text-destructive"
            />
            <StatCard
              title="Total de Registros"
              value={proprietarios.length + veiculos.length + motoristas.length}
              change="Todos os cadastros do sistema"
              changeType="neutral"
              icon={Receipt}
              iconColor="bg-accent/10 text-accent"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="card-elevated p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="contracts" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Contratos
                </TabsTrigger>
                <TabsTrigger value="fines" className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Multas
                </TabsTrigger>
                <TabsTrigger value="claims" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Sinistros
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="contracts" className="m-0">
                <RecentContracts hideCard />
              </TabsContent>
              
              <TabsContent value="fines" className="m-0">
                <AllFines />
              </TabsContent>
              
              <TabsContent value="claims" className="m-0">
                <AllClaims />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div>
          <AlertsList />
        </div>
      </div>
    </AppLayout>
  );
}