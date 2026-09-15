import { useState } from "react";
import { Receipt, AlertTriangle, CheckCircle, Clock, Car, ExternalLink, Eye, Search, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DriverFinesProps {
  driverId: string;
  onViewFine?: (fine: any) => void;
}

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

export function DriverFines({ driverId, onViewFine }: DriverFinesProps) {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: fines = [], isLoading } = useQuery({
    queryKey: ["driver-fines", driverId, tenant?.id],
    queryFn: async () => {
      if (!tenant?.id || !driverId) return [];
      const { data, error } = await supabase
        .from("multas")
        .select(`
          *,
          veiculo:veiculos(id, matricula, marca, modelo)
        `)
        .eq("tenant_id", tenant.id)
        .eq("motorista_id", driverId)
        .order("data_multa", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id && !!driverId,
  });

  const handleNavigateToVehicle = (vehicleId: string) => {
    navigate(`/vehicles?view=${vehicleId}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const filteredFines = fines.filter((fine: any) => {
    const matchesSearch = searchTerm === "" || 
      fine.numero_notificacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.veiculo?.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.localizacao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || fine.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilters = searchTerm || statusFilter !== "all";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {fines.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="contested">Contestado</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      <h4 className="font-semibold">
        Multas ({filteredFines.length}{hasActiveFilters ? ` de ${fines.length}` : ""})
      </h4>

      {fines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma multa registrada para este motorista</p>
        </div>
      ) : filteredFines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma multa encontrada com os filtros aplicados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFines.map((fine: any) => {
            const status = statusConfig[fine.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <div
                key={fine.id}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
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
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
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
                  {fine.localizacao && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Local</span>
                      <span className="font-medium">{fine.localizacao}</span>
                    </div>
                  )}
                </div>
                
                {fine.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{fine.descricao}</p>
                )}

                {onViewFine && (
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => onViewFine(fine)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
