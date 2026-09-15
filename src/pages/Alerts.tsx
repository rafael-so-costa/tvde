import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  AlertTriangle,
  FileWarning,
  Calendar,
  Settings,
  CheckCircle,
  Bell,
  Car,
  User,
  Building2,
  FileText,
  Gavel,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAlertasUnificados,
  useMarkAlertAsRead,
  type AlertaUnificado,
} from "@/hooks/useAlertas";

const typeIcons = {
  document: FileWarning,
  contract: FileText,
  maintenance: Settings,
  peritagem: Gavel,
  sinistro: ShieldAlert,
} as const;

const entityIcons = {
  vehicle: Car,
  driver: User,
  owner: Building2,
  contract: FileText,
  claim: ShieldAlert,
} as const;

const priorityConfig = {
  critical: {
    bg: "bg-destructive/10",
    border: "border-l-destructive",
    text: "text-destructive",
    badge: "bg-destructive text-destructive-foreground",
  },
  high: {
    bg: "bg-warning/10",
    border: "border-l-warning",
    text: "text-warning",
    badge: "bg-warning text-warning-foreground",
  },
  medium: {
    bg: "bg-info/10",
    border: "border-l-info",
    text: "text-info",
    badge: "bg-info text-info-foreground",
  },
  low: {
    bg: "bg-muted",
    border: "border-l-muted-foreground",
    text: "text-muted-foreground",
    badge: "bg-muted-foreground text-muted",
  },
} as const;

type Filtro = "all" | "critical" | "documents" | "contracts" | "peritagens";

function AlertCard({
  alert,
  onResolver,
  onVerDetalhes,
}: {
  alert: AlertaUnificado;
  onResolver: (alert: AlertaUnificado) => void;
  onVerDetalhes: (alert: AlertaUnificado) => void;
}) {
  const TypeIcon = typeIcons[alert.tipo];
  const EntityIcon = entityIcons[alert.entidadeTipo];
  const priority = priorityConfig[alert.prioridade];

  return (
    <div
      className={cn(
        "card-flat p-5 border-l-4 transition-all hover:shadow-md animate-slide-up",
        priority.border,
        priority.bg,
        !alert.lido && "ring-1 ring-primary/20",
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", priority.bg)}>
          <TypeIcon className={cn("w-6 h-6", priority.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-foreground">{alert.titulo}</p>
              {alert.descricao && (
                <p className="text-sm text-muted-foreground">{alert.descricao}</p>
              )}
            </div>
            {alert.diasRestantes !== null && (
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                  priority.badge,
                )}
              >
                {alert.diasRestantes < 0
                  ? `${Math.abs(alert.diasRestantes)}d atraso`
                  : `${alert.diasRestantes}d`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <EntityIcon className="w-4 h-4" />
              <span>{alert.entidadeNome}</span>
            </div>
            <span className="text-xs px-2 py-0.5 bg-muted rounded">{alert.categoria}</span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {alert.dataReferencia ? (
                <>
                  {alert.diasRestantes !== null && alert.diasRestantes < 0
                    ? "Data limite:"
                    : "Data:"}{" "}
                  <span className="font-medium text-foreground">
                    {new Date(alert.dataReferencia).toLocaleDateString("pt-PT")}
                  </span>
                </>
              ) : (
                "Sem data definida"
              )}
            </p>
            <div className="flex gap-2">
              {alert.origem === "sistema" && !alert.lido && (
                <Button variant="ghost" size="sm" onClick={() => onResolver(alert)}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Marcar como lido
                </Button>
              )}
              {alert.link && (
                <Button variant="outline" size="sm" onClick={() => onVerDetalhes(alert)}>
                  Ver Detalhes
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Alerts() {
  const { data: alertas = [], isLoading } = useAlertasUnificados();
  const marcarLido = useMarkAlertAsRead();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const [filtro, setFiltro] = useState<Filtro>("all");

  const criticos = alertas.filter((a) => a.prioridade === "critical");
  const naoLidos = alertas.filter((a) => !a.lido);
  const documentos = alertas.filter((a) => a.tipo === "document");
  const peritagens = alertas.filter((a) => a.tipo === "peritagem" || a.tipo === "sinistro");

  const lista = useMemo(() => {
    const ordem = { critical: 0, high: 1, medium: 2, low: 3 };
    const filtrados = alertas.filter((a) => {
      switch (filtro) {
        case "critical":
          return a.prioridade === "critical";
        case "documents":
          return a.tipo === "document";
        case "contracts":
          return a.tipo === "contract";
        case "peritagens":
          return a.tipo === "peritagem" || a.tipo === "sinistro";
        default:
          return true;
      }
    });
    return [...filtrados].sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);
  }, [alertas, filtro]);

  const marcarTodos = async () => {
    if (!tenant?.id) return;
    const { error } = await supabase
      .from("alertas_sistema")
      .update({ lido: true })
      .eq("tenant_id", tenant.id)
      .eq("lido", false);
    if (error) {
      toast.error("Não foi possível marcar os alertas: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["alertas-unificados"] });
    queryClient.invalidateQueries({ queryKey: ["alertas"] });
    toast.success("Alertas marcados como lidos.");
  };

  return (
    <AppLayout title="Alertas" subtitle="Notificações e avisos importantes">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card border-l-4 border-l-destructive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Críticos</p>
              <p className="text-2xl font-bold text-destructive">{criticos.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-destructive/30" />
          </div>
        </div>
        <div className="stat-card border-l-4 border-l-warning">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Não Lidos</p>
              <p className="text-2xl font-bold text-warning">{naoLidos.length}</p>
            </div>
            <Bell className="w-8 h-8 text-warning/30" />
          </div>
        </div>
        <div className="stat-card border-l-4 border-l-info">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Documentos</p>
              <p className="text-2xl font-bold text-info">{documentos.length}</p>
            </div>
            <FileWarning className="w-8 h-8 text-info/30" />
          </div>
        </div>
        <div className="stat-card border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Peritagens e sinistros</p>
              <p className="text-2xl font-bold text-primary">{peritagens.length}</p>
            </div>
            <Gavel className="w-8 h-8 text-primary/30" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="critical">Críticos</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="peritagens">Peritagens</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={marcarTodos} disabled={naoLidos.length === 0}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Marcar todos como lidos
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : lista.length === 0 ? (
          <div className="card-flat p-10 text-center">
            <CheckCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Sem alertas neste momento</p>
            <p className="text-sm text-muted-foreground">
              Documentos, peritagens e contratos estão em dia.
            </p>
          </div>
        ) : (
          lista.map((alert, index) => (
            <div key={alert.id} style={{ animationDelay: `${index * 0.05}s` }}>
              <AlertCard
                alert={alert}
                onResolver={(a) => marcarLido.mutate(a.id)}
                onVerDetalhes={(a) => a.link && navigate(a.link)}
              />
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
