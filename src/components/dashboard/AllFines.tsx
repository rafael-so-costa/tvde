import { useNavigate } from "react-router-dom";
import { Receipt, AlertTriangle, CheckCircle, Clock, Car, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fineTypeLabels: Record<string, string> = {
  speeding: "Excesso de Velocidade",
  parking: "Estacionamento",
  red_light: "Avanço de Sinal",
  other: "Outro",
};

const statusConfig = {
  pending: { label: "Pendente", class: "badge-warning", icon: Clock },
  paid: { label: "Pago", class: "badge-success", icon: CheckCircle },
  contested: { label: "Contestado", class: "badge-destructive", icon: AlertTriangle },
};

export function AllFines() {
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const { data: fines = [], isLoading } = useQuery({
    queryKey: ["all-fines", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("multas")
        .select(`
          *,
          veiculo:veiculos(id, matricula, marca, modelo),
          motorista:motoristas(id, nome_completo)
        `)
        .eq("tenant_id", tenant.id)
        .order("data_multa", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  const handleNavigateToVehicle = (vehicleId: string) => {
    navigate(`/vehicles?view=${vehicleId}`);
  };

  const handleNavigateToDriver = (driverId: string) => {
    navigate(`/drivers?view=${driverId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (fines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma multa registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fines.map((fine: any) => {
        const status = statusConfig[fine.status as keyof typeof statusConfig] || statusConfig.pending;
        const StatusIcon = status.icon;
        
        return (
          <div
            key={fine.id}
            className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium">{fineTypeLabels[fine.tipo] || fine.tipo}</p>
                <p className="text-sm text-muted-foreground">
                  {fine.numero_notificacao || "Sem número"}
                </p>
              </div>
              <span className={status.class}>
                <StatusIcon className="w-3 h-3 inline mr-1" />
                {status.label}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
              <div 
                className={cn(
                  "flex items-center gap-2",
                  fine.veiculo?.id && "cursor-pointer hover:text-primary"
                )}
                onClick={() => fine.veiculo?.id && handleNavigateToVehicle(fine.veiculo.id)}
              >
                <Car className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground block text-xs">Veículo</span>
                  <span className="font-medium font-mono">
                    {fine.veiculo?.matricula || "-"}
                  </span>
                </div>
                {fine.veiculo?.id && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
              </div>
              
              <div
                className={cn(
                  "flex items-center gap-2",
                  fine.motorista?.id && "cursor-pointer hover:text-primary"
                )}
                onClick={() => fine.motorista?.id && handleNavigateToDriver(fine.motorista.id)}
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground block text-xs">Motorista</span>
                  <span className="font-medium">
                    {fine.motorista?.nome_completo || "-"}
                  </span>
                </div>
                {fine.motorista?.id && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
              </div>
              
              <div>
                <span className="text-muted-foreground block text-xs">Data</span>
                <span className="font-medium">
                  {new Date(fine.data_multa).toLocaleDateString("pt-PT")}
                </span>
              </div>
              
              <div>
                <span className="text-muted-foreground block text-xs">Valor</span>
                <span className="font-medium text-destructive">
                  €{Number(fine.valor).toFixed(2)}
                </span>
              </div>
            </div>
            
            {fine.localizacao && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Local:</span> {fine.localizacao}
              </p>
            )}
            {fine.descricao && (
              <p className="text-sm text-muted-foreground mt-1">{fine.descricao}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
