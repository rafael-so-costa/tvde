import { useState } from "react";
import { Bell, FileWarning, Calendar, CreditCard, AlertTriangle, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlertas, useAlertasAdmin } from "@/hooks/useAlertas";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const typeIcons = {
  documento_vencendo: FileWarning,
  tarefa_pendente: Calendar,
  aniversario: Calendar,
  system: AlertTriangle,
  peritagem: AlertTriangle,
};

const priorityStyles = {
  critical: "border-l-destructive bg-destructive/5",
  high: "border-l-warning bg-warning/5",
  medium: "border-l-info bg-info/5",
  low: "border-l-muted bg-muted/50",
};

export type EntityType = "vehicle" | "driver" | "owner" | "contract";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { roles } = useAuth();
  const navigate = useNavigate();
  const { data: alertas, isLoading } = useAlertas();
  const { data: adminAlertas } = useAlertasAdmin();

  const isAdmin = roles.includes("super_admin") || roles.includes("admin_empresa");
  const isMotorista = roles.includes("motorista");
  const isProprietario = roles.includes("proprietario");

  // Calcular total de alertas
  const getTotalAlerts = () => {
    if (isAdmin && adminAlertas) {
      const total = 
        adminAlertas.motoristas.length + 
        adminAlertas.proprietarios.length + 
        adminAlertas.veiculos.length + 
        adminAlertas.contratos.length;
      return total;
    }
    return alertas?.filter(a => !a.lido).length || 0;
  };

  const totalAlerts = getTotalAlerts();
  const criticalCount = isAdmin && adminAlertas
    ? [...adminAlertas.motoristas, ...adminAlertas.proprietarios, ...adminAlertas.veiculos, ...adminAlertas.contratos]
        .filter(a => a.priority === "critical").length
    : alertas?.filter(a => a.data_vencimento && new Date(a.data_vencimento) < new Date()).length || 0;

  const getPriorityFromDays = (days: number) => {
    if (days <= 0) return "critical";
    if (days <= 7) return "high";
    if (days <= 15) return "medium";
    return "low";
  };

  const handleAlertClick = (entityType: EntityType, entityId: string) => {
    setOpen(false);
    switch (entityType) {
      case "vehicle":
        navigate(`/vehicles?view=${entityId}`);
        break;
      case "driver":
        navigate(`/drivers?view=${entityId}`);
        break;
      case "owner":
        navigate(`/owners?view=${entityId}`);
        break;
      case "contract":
        navigate(`/contracts?view=${entityId}`);
        break;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {totalAlerts > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 min-w-5 h-5 px-1 text-xs rounded-full flex items-center justify-center",
              criticalCount > 0 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-warning text-warning-foreground"
            )}>
              {totalAlerts > 99 ? "99+" : totalAlerts}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            {totalAlerts > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalAlerts} {totalAlerts === 1 ? "alerta" : "alertas"}
              </span>
            )}
          </div>
          {isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">
              Documentos e contratos a expirar nos próximos 30 dias
            </p>
          )}
          {isMotorista && (
            <p className="text-xs text-muted-foreground mt-1">
              Alertas sobre seus documentos pessoais
            </p>
          )}
          {isProprietario && (
            <p className="text-xs text-muted-foreground mt-1">
              Alertas sobre seus veículos e documentos
            </p>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : totalAlerts === 0 ? (
            <div className="p-8 text-center">
              <Check className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="font-medium">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground">
                Não há alertas pendentes no momento
              </p>
            </div>
          ) : (
            <div className="p-2">
              {/* Admin view - grouped by category */}
              {isAdmin && adminAlertas && (
                <>
                  {/* Veiculos */}
                  {adminAlertas.veiculos.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                        VEÍCULOS ({adminAlertas.veiculos.length})
                      </p>
                      {adminAlertas.veiculos.slice(0, 3).map((alert) => (
                        <AlertItem
                          key={alert.id}
                          title={alert.documentName}
                          subtitle={`${alert.entityName} - ${alert.entitySubtitle || ""}`}
                          days={alert.daysRemaining}
                          priority={alert.priority}
                          icon={FileWarning}
                          onClick={() => handleAlertClick("vehicle", alert.entityId)}
                        />
                      ))}
                      {adminAlertas.veiculos.length > 3 && (
                        <Link 
                          to="/alerts?tab=vehicles" 
                          className="flex items-center justify-center gap-1 text-xs text-primary py-2 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          Ver mais {adminAlertas.veiculos.length - 3} alertas
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Motoristas */}
                  {adminAlertas.motoristas.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                        MOTORISTAS ({adminAlertas.motoristas.length})
                      </p>
                      {adminAlertas.motoristas.slice(0, 3).map((alert) => (
                        <AlertItem
                          key={alert.id}
                          title={alert.documentName}
                          subtitle={alert.entityName}
                          days={alert.daysRemaining}
                          priority={alert.priority}
                          icon={FileWarning}
                          onClick={() => handleAlertClick("driver", alert.entityId)}
                        />
                      ))}
                      {adminAlertas.motoristas.length > 3 && (
                        <Link 
                          to="/alerts?tab=drivers" 
                          className="flex items-center justify-center gap-1 text-xs text-primary py-2 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          Ver mais {adminAlertas.motoristas.length - 3} alertas
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Proprietários */}
                  {adminAlertas.proprietarios.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                        PROPRIETÁRIOS ({adminAlertas.proprietarios.length})
                      </p>
                      {adminAlertas.proprietarios.slice(0, 3).map((alert) => (
                        <AlertItem
                          key={alert.id}
                          title={alert.documentName}
                          subtitle={alert.entityName}
                          days={alert.daysRemaining}
                          priority={alert.priority}
                          icon={FileWarning}
                          onClick={() => handleAlertClick("owner", alert.entityId)}
                        />
                      ))}
                      {adminAlertas.proprietarios.length > 3 && (
                        <Link 
                          to="/alerts?tab=owners" 
                          className="flex items-center justify-center gap-1 text-xs text-primary py-2 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          Ver mais {adminAlertas.proprietarios.length - 3} alertas
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Contratos */}
                  {adminAlertas.contratos.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                        CONTRATOS ({adminAlertas.contratos.length})
                      </p>
                      {adminAlertas.contratos.slice(0, 3).map((alert) => (
                        <AlertItem
                          key={alert.id}
                          title="Contrato a expirar"
                          subtitle={`${alert.motorista || "N/A"} - ${alert.veiculo || "N/A"}`}
                          days={alert.daysRemaining}
                          priority={alert.priority}
                          icon={Calendar}
                          onClick={() => handleAlertClick("contract", alert.entityId)}
                        />
                      ))}
                      {adminAlertas.contratos.length > 3 && (
                        <Link 
                          to="/alerts?tab=contracts" 
                          className="flex items-center justify-center gap-1 text-xs text-primary py-2 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          Ver mais {adminAlertas.contratos.length - 3} alertas
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Non-admin view - flat list */}
              {!isAdmin && alertas && alertas.map((alert) => {
                const Icon = typeIcons[alert.tipo as keyof typeof typeIcons] || AlertTriangle;
                const days = alert.data_vencimento 
                  ? Math.ceil((new Date(alert.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                
                return (
                  <AlertItem
                    key={alert.id}
                    title={alert.titulo}
                    subtitle={alert.mensagem || ""}
                    days={days}
                    priority={days !== null ? getPriorityFromDays(days) : "low"}
                    icon={Icon}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>

        {totalAlerts > 0 && (
          <div className="p-3 border-t">
            <Link to="/alerts" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">
                Ver todos os alertas
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface AlertItemProps {
  title: string;
  subtitle: string;
  days: number | null;
  priority: "critical" | "high" | "medium" | "low";
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

function AlertItem({ title, subtitle, days, priority, icon: Icon, onClick }: AlertItemProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-l-4 mb-2 transition-colors hover:bg-muted/50",
        priorityStyles[priority],
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        priority === "critical" && "bg-destructive/10 text-destructive",
        priority === "high" && "bg-warning/10 text-warning",
        priority === "medium" && "bg-info/10 text-info",
        priority === "low" && "bg-muted text-muted-foreground"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {days !== null && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap",
            priority === "critical" && "bg-destructive/10 text-destructive",
            priority === "high" && "bg-warning/10 text-warning",
            priority === "medium" && "bg-info/10 text-info",
            priority === "low" && "bg-muted text-muted-foreground"
          )}>
            {days <= 0 ? `${Math.abs(days)}d atraso` : `${days}d`}
          </span>
        )}
        {onClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>
    </div>
  );
}
