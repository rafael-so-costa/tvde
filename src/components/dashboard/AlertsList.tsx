import { AlertTriangle, Calendar, FileWarning, CreditCard, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlertas, useAlertasAdmin } from "@/hooks/useAlertas";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";

function getPriority(daysRemaining: number): "critical" | "high" | "medium" | "low" {
  if (daysRemaining <= 0) return "critical";
  if (daysRemaining <= 7) return "high";
  if (daysRemaining <= 15) return "medium";
  return "low";
}

const priorityStyles = {
  critical: "border-l-destructive bg-destructive/5",
  high: "border-l-warning bg-warning/5",
  medium: "border-l-info bg-info/5",
  low: "border-l-muted bg-muted/50",
};

export function AlertsList() {
  const { roles } = useAuth();
  const { data: alertas = [], isLoading } = useAlertas();
  const { data: adminAlertas, isLoading: adminLoading } = useAlertasAdmin();
  const navigate = useNavigate();

  const isAdmin = roles.includes("super_admin") || roles.includes("admin_empresa");

  // Build unified alert list from same source as NotificationBell
  const allAlerts: Array<{
    id: string;
    title: string;
    subtitle: string;
    days: number;
    priority: "critical" | "high" | "medium" | "low";
    entityType?: string;
    entityId?: string;
  }> = [];

  if (isAdmin && adminAlertas) {
    adminAlertas.veiculos.forEach((a: any) => {
      allAlerts.push({
        id: a.id, title: a.documentName,
        subtitle: `${a.entityName} - ${a.entitySubtitle || ""}`,
        days: a.daysRemaining, priority: a.priority,
        entityType: "vehicle", entityId: a.entityId,
      });
    });
    adminAlertas.motoristas.forEach((a: any) => {
      allAlerts.push({
        id: a.id, title: a.documentName, subtitle: a.entityName,
        days: a.daysRemaining, priority: a.priority,
        entityType: "driver", entityId: a.entityId,
      });
    });
    adminAlertas.proprietarios.forEach((a: any) => {
      allAlerts.push({
        id: a.id, title: a.documentName, subtitle: a.entityName,
        days: a.daysRemaining, priority: a.priority,
        entityType: "owner", entityId: a.entityId,
      });
    });
    adminAlertas.contratos.forEach((a: any) => {
      allAlerts.push({
        id: a.id, title: "Contrato a expirar",
        subtitle: `${a.motorista || "N/A"} - ${a.veiculo || "N/A"}`,
        days: a.daysRemaining, priority: a.priority,
        entityType: "contract", entityId: a.entityId,
      });
    });
  } else {
    alertas.filter(a => !a.lido).forEach((alert) => {
      const days = alert.data_vencimento
        ? differenceInDays(new Date(alert.data_vencimento), new Date())
        : 0;
      allAlerts.push({
        id: alert.id, title: alert.titulo,
        subtitle: alert.mensagem || (alert.data_vencimento
          ? `Vence em ${format(new Date(alert.data_vencimento), "dd/MM/yyyy", { locale: pt })}`
          : ""),
        days, priority: getPriority(days),
      });
    });
  }

  // Sort by priority (critical first) then by days remaining
  allAlerts.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] - order[b.priority]) || (a.days - b.days);
  });

  const displayAlerts = allAlerts.slice(0, 15);
  const loading = isLoading || (isAdmin && adminLoading);

  const handleClick = (alert: typeof displayAlerts[0]) => {
    if (!alert.entityType || !alert.entityId) return;
    const routes: Record<string, string> = {
      vehicle: "/vehicles", driver: "/drivers",
      owner: "/owners", contract: "/contracts",
    };
    navigate(`${routes[alert.entityType]}?view=${alert.entityId}`);
  };

  if (loading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">🔔 Alertas Recentes</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (displayAlerts.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">🔔 Alertas Recentes</h3>
          <span className="badge-success flex items-center gap-1">
            <Check className="w-3 h-3" />
            Tudo em dia
          </span>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Nenhum alerta recente</p>
          <p className="text-sm">Todos os documentos estão em dia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">🔔 Alertas Recentes</h3>
        <span className="badge-destructive">{allAlerts.length} alertas</span>
      </div>
      <div className="space-y-3">
        {displayAlerts.map((alert, index) => {
          const Icon = alert.priority === "critical" || alert.priority === "high"
            ? AlertTriangle : FileWarning;

          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border-l-4 transition-all hover:shadow-md animate-slide-up",
                priorityStyles[alert.priority],
                alert.entityType && "cursor-pointer"
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleClick(alert)}
              role={alert.entityType ? "button" : undefined}
              tabIndex={alert.entityType ? 0 : undefined}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  alert.priority === "critical" && "bg-destructive/10 text-destructive",
                  alert.priority === "high" && "bg-warning/10 text-warning",
                  alert.priority === "medium" && "bg-info/10 text-info",
                  alert.priority === "low" && "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{alert.title}</p>
                <p className="text-sm text-muted-foreground truncate">{alert.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap",
                    alert.priority === "critical" && "bg-destructive/10 text-destructive",
                    alert.priority === "high" && "bg-warning/10 text-warning",
                    alert.priority === "medium" && "bg-info/10 text-info",
                    alert.priority === "low" && "bg-muted text-muted-foreground"
                  )}
                >
                  {alert.days <= 0 ? `${Math.abs(alert.days)}d atraso` : `${alert.days}d`}
                </span>
                {alert.entityType && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          );
        })}
      </div>
      {allAlerts.length > 15 && (
        <div className="mt-4 text-center">
          <Link to="/alerts" className="text-sm text-primary hover:underline">
            Ver todos os {allAlerts.length} alertas →
          </Link>
        </div>
      )}
    </div>
  );
}
