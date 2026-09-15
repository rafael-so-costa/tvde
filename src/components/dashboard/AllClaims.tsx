import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle, Clock, Car, User, Calendar, Shield, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const statusConfig = {
  open: { label: "Aberto", class: "badge-warning", icon: Clock },
  in_progress: { label: "Em Andamento", class: "bg-info/20 text-info border-info/30", icon: AlertTriangle },
  closed: { label: "Encerrado", class: "badge-success", icon: CheckCircle },
};

export function AllClaims() {
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["all-claims", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("sinistros")
        .select(`
          *,
          veiculo:veiculos(id, matricula, marca, modelo),
          motorista:motoristas(id, nome_completo)
        `)
        .eq("tenant_id", tenant.id)
        .order("data_sinistro", { ascending: false })
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

  const isExpertisePending = (claim: any) => {
    if (claim.peritagem_realizada) return false;
    if (!claim.data_peritagem) return false;
    const expertiseDate = new Date(claim.data_peritagem);
    const today = new Date();
    return expertiseDate >= today;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="grid grid-cols-4 gap-4 mb-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum sinistro registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim: any) => {
        const status = statusConfig[claim.status as keyof typeof statusConfig] || statusConfig.open;
        const StatusIcon = status.icon;
        const hasPendingExpertise = isExpertisePending(claim);
        const damagedItems = (claim.itens_danificados as string[]) || [];

        return (
          <div
            key={claim.id}
            className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-lg">
                  Processo: {claim.numero_processo || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {claim.seguradora || "Sem seguradora"} {claim.apolice && `• Apólice: ${claim.apolice}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", status.class)}>
                  <StatusIcon className="w-3 h-3 inline mr-1" />
                  {status.label}
                </span>
                {hasPendingExpertise && (
                  <span className="badge-warning text-xs">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Peritagem: {new Date(claim.data_peritagem).toLocaleDateString("pt-PT")}
                  </span>
                )}
                {claim.peritagem_realizada && (
                  <span className="badge-success text-xs">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Peritagem Concluída
                  </span>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div
                className={cn(
                  "flex items-center gap-2",
                  claim.veiculo?.id && "cursor-pointer hover:text-primary"
                )}
                onClick={() => claim.veiculo?.id && handleNavigateToVehicle(claim.veiculo.id)}
              >
                <Car className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-xs">Veículo</span>
                  <span className="font-medium font-mono">{claim.veiculo?.matricula || "-"}</span>
                </div>
                {claim.veiculo?.id && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
              </div>
              
              <div
                className={cn(
                  "flex items-center gap-2",
                  claim.motorista?.id && "cursor-pointer hover:text-primary"
                )}
                onClick={() => claim.motorista?.id && handleNavigateToDriver(claim.motorista.id)}
              >
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-xs">Motorista</span>
                  <span className="font-medium">{claim.motorista?.nome_completo || "-"}</span>
                </div>
                {claim.motorista?.id && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
              </div>
              
              <div>
                <span className="text-muted-foreground block text-xs">Data do Sinistro</span>
                <span className="font-medium">
                  {new Date(claim.data_sinistro).toLocaleDateString("pt-PT")}
                </span>
              </div>
              
              <div>
                <span className="text-muted-foreground block text-xs">Seguradora</span>
                <span className="font-medium">{claim.seguradora || "-"}</span>
              </div>
            </div>

            {/* Damaged Items */}
            {damagedItems.length > 0 && (
              <div className="mb-4">
                <span className="text-sm text-muted-foreground block mb-2">
                  Itens Danificados:
                </span>
                <div className="flex flex-wrap gap-2">
                  {damagedItems.map((item: string, index: number) => (
                    <Badge key={index} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {claim.descricao && (
              <p className="text-sm text-muted-foreground">{claim.descricao}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
