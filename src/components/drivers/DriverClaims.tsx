import { useState } from "react";
import { Car, AlertTriangle, CheckCircle, Clock, Calendar, ExternalLink, Eye, Search, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

interface DriverClaimsProps {
  driverId: string;
  onViewClaim?: (claim: any) => void;
}

const statusConfig = {
  open: { label: "Aberto", class: "badge-warning", icon: Clock },
  in_progress: { label: "Em Andamento", class: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: AlertTriangle },
  closed: { label: "Encerrado", class: "badge-success", icon: CheckCircle },
};

export function DriverClaims({ driverId, onViewClaim }: DriverClaimsProps) {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["driver-claims", driverId, tenant?.id],
    queryFn: async () => {
      if (!tenant?.id || !driverId) return [];
      const { data, error } = await supabase
        .from("sinistros")
        .select(`
          *,
          veiculo:veiculos(id, matricula, marca, modelo)
        `)
        .eq("tenant_id", tenant.id)
        .eq("motorista_id", driverId)
        .order("data_sinistro", { ascending: false });
      
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

  const filteredClaims = claims.filter((claim: any) => {
    const matchesSearch = searchTerm === "" || 
      claim.numero_processo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.veiculo?.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.seguradora?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    
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
      {claims.length > 0 && (
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
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="closed">Encerrado</SelectItem>
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
        Sinistros ({filteredClaims.length}{hasActiveFilters ? ` de ${claims.length}` : ""})
      </h4>

      {claims.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum sinistro registrado para este motorista</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum sinistro encontrado com os filtros aplicados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim: any) => {
            const status = statusConfig[claim.status as keyof typeof statusConfig] || statusConfig.open;
            const StatusIcon = status.icon;
            const damagedItems = (claim.itens_danificados as string[]) || [];

            return (
              <div
                key={claim.id}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold">
                      Processo: {claim.numero_processo || "Sem número"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {claim.seguradora || "-"} • Apólice: {claim.apolice || "-"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", status.class)}>
                      <StatusIcon className="w-3 h-3 inline mr-1" />
                      {status.label}
                    </span>
                    {claim.data_peritagem && !claim.peritagem_realizada && (
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

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      claim.veiculo?.id && "cursor-pointer hover:text-primary"
                    )}
                    onClick={() => claim.veiculo?.id && handleNavigateToVehicle(claim.veiculo.id)}
                  >
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground block text-xs">Veículo</span>
                      <span className="font-medium font-mono">
                        {claim.veiculo?.matricula || "-"}
                      </span>
                    </div>
                    {claim.veiculo?.id && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Data do Sinistro</span>
                    <span className="font-medium">
                      {new Date(claim.data_sinistro).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                </div>

                {damagedItems.length > 0 && (
                  <div className="mb-4">
                    <span className="text-sm text-muted-foreground block mb-2">
                      Itens Danificados:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {damagedItems.map((item, index) => (
                        <Badge key={index} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {claim.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{claim.descricao}</p>
                )}

                {onViewClaim && (
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => onViewClaim(claim)}>
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
