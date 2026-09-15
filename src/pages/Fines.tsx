import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, AlertTriangle, CheckCircle, Clock, Car, User, ExternalLink, Plus, Search, Filter, X, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMotoristaProfile } from "@/hooks/useMotoristaProfile";
import { useProprietarioProfile } from "@/hooks/useProprietarioProfile";
import { toast } from "sonner";
import { DocumentUploadSection, UploadedDocument } from "@/components/common/DocumentUploadSection";
import { FineDetailsDialog } from "@/components/fines/FineDetailsDialog";
import { FineEditDialog } from "@/components/fines/FineEditDialog";
import { ActionMenu } from "@/components/common/ActionMenu";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { useDeleteFine } from "@/hooks/useFinesAndClaims";

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

const FINE_DOCUMENT_TYPES = [
  "Comprovativo de Transferência para o Motorista",
  "Folha da Multa",
  "Comprovativo de Envio pelo Correio",
];

export default function Fines() {
  const { tenant } = useTenant();
  const { activeRole } = useAuth();
  const { motoristaId, isMotorista } = useMotoristaProfile();
  const { proprietarioId, vehicleIds: propVehicleIds, isProprietario } = useProprietarioProfile();
  const isReadOnly = activeRole === "motorista" || activeRole === "proprietario";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteFine = useDeleteFine();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // New fine form
  const [newFine, setNewFine] = useState({
    veiculo_id: "",
    motorista_id: "",
    data_multa: "",
    localizacao: "",
    descricao: "",
    valor: "",
    tipo: "other",
    numero_notificacao: "",
    status: "pending",
  });
  const [fineDocuments, setFineDocuments] = useState<UploadedDocument[]>([]);

  const { data: fines = [], isLoading } = useQuery({
    queryKey: ["all-fines", tenant?.id, motoristaId, isMotorista, propVehicleIds, isProprietario],
    queryFn: async () => {
      if (!tenant?.id) return [];
      if (isMotorista && !motoristaId) return [];
      if (isProprietario && propVehicleIds.length === 0) return [];
      let query = supabase
        .from("multas")
        .select(`
          *,
          veiculo:veiculos(id, matricula, marca, modelo),
          motorista:motoristas(id, nome_completo)
        `)
        .eq("tenant_id", tenant.id);
      
      if (isMotorista && motoristaId) {
        query = query.eq("motorista_id", motoristaId);
      }
      if (isProprietario && propVehicleIds.length > 0) {
        query = query.in("veiculo_id", propVehicleIds);
      }
      
      const { data, error } = await query.order("data_multa", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("veiculos")
        .select("id, matricula, marca, modelo")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, nome_completo")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  const createFineMutation = useMutation({
    mutationFn: async (fineData: typeof newFine) => {
      if (!tenant?.id) throw new Error("Tenant não encontrado");
      const { error } = await supabase.from("multas").insert({
        tenant_id: tenant.id,
        veiculo_id: fineData.veiculo_id,
        motorista_id: fineData.motorista_id || null,
        data_multa: fineData.data_multa,
        localizacao: fineData.localizacao || null,
        descricao: fineData.descricao || null,
        valor: parseFloat(fineData.valor),
        tipo: fineData.tipo as any,
        numero_notificacao: fineData.numero_notificacao || null,
        status: fineData.status as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-fines"] });
      toast.success("Multa registrada com sucesso!");
      setIsAddDialogOpen(false);
      setNewFine({
        veiculo_id: "",
        motorista_id: "",
        data_multa: "",
        localizacao: "",
        descricao: "",
        valor: "",
        tipo: "other",
        numero_notificacao: "",
        status: "pending",
      });
      setFineDocuments([]);
    },
    onError: (error) => {
      toast.error("Erro ao registrar multa: " + error.message);
    },
  });

  const handleAddFine = () => {
    if (!newFine.veiculo_id || !newFine.data_multa || !newFine.valor) {
      toast.error("Preencha os campos obrigatórios: Veículo, Data e Valor");
      return;
    }
    createFineMutation.mutate(newFine);
  };

  const handleNavigateToVehicle = (vehicleId: string) => {
    navigate(`/vehicles?view=${vehicleId}`);
  };

  const handleNavigateToDriver = (driverId: string) => {
    navigate(`/drivers?view=${driverId}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const filteredFines = fines.filter((fine: any) => {
    const matchesSearch = searchTerm === "" || 
      fine.numero_notificacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.veiculo?.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.localizacao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || fine.status === statusFilter;
    const matchesType = typeFilter === "all" || fine.tipo === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const hasActiveFilters = searchTerm || statusFilter !== "all" || typeFilter !== "all";

  return (
    <AppLayout title="Multas" subtitle="Gestão de multas e infrações">
      {/* Header with filters and add button */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por notificação, matrícula, motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Estados</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="contested">Contestado</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="speeding">Excesso de Velocidade</SelectItem>
                <SelectItem value="parking">Estacionamento</SelectItem>
                <SelectItem value="red_light">Avanço de Sinal</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          
          {/* Add Button */}
          {!isReadOnly && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-accent">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Multa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Nova Multa</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  {/* Identification */}
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Identificação da Multa
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="notificationNumber">Nº Notificação</Label>
                        <Input
                          id="notificationNumber"
                          value={newFine.numero_notificacao}
                          onChange={(e) =>
                            setNewFine({ ...newFine, numero_notificacao: e.target.value })
                          }
                          placeholder="NOT-2024-XXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fineDate">Data da Infração *</Label>
                        <Input
                          id="fineDate"
                          type="date"
                          value={newFine.data_multa}
                          onChange={(e) =>
                            setNewFine({ ...newFine, data_multa: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Veículo *</Label>
                        <Select
                          value={newFine.veiculo_id}
                          onValueChange={(value) =>
                            setNewFine({ ...newFine, veiculo_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar veículo" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((v: any) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.matricula} - {v.marca} {v.modelo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Motorista</Label>
                        <Select
                          value={newFine.motorista_id}
                          onValueChange={(value) =>
                            setNewFine({ ...newFine, motorista_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar motorista" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.nome_completo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Fine Details */}
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Detalhes da Infração
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Infração</Label>
                        <Select
                          value={newFine.tipo}
                          onValueChange={(value) =>
                            setNewFine({ ...newFine, tipo: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="speeding">Excesso de Velocidade</SelectItem>
                            <SelectItem value="parking">Estacionamento</SelectItem>
                            <SelectItem value="red_light">Avanço de Sinal</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Valor (€) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={newFine.valor}
                          onChange={(e) =>
                            setNewFine({ ...newFine, valor: e.target.value })
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                          value={newFine.status}
                          onValueChange={(value) =>
                            setNewFine({ ...newFine, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="paid">Pago</SelectItem>
                            <SelectItem value="contested">Contestado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Local da Infração</Label>
                      <Input
                        id="location"
                        value={newFine.localizacao}
                        onChange={(e) =>
                          setNewFine({ ...newFine, localizacao: e.target.value })
                        }
                        placeholder="Ex: A1, km 45"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newFine.descricao}
                        onChange={(e) =>
                          setNewFine({ ...newFine, descricao: e.target.value })
                        }
                        placeholder="Detalhes da infração..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Documents */}
                  <DocumentUploadSection
                    title="Documentos da Multa"
                    predefinedTypes={FINE_DOCUMENT_TYPES}
                    documents={fineDocuments}
                    onDocumentsChange={setFineDocuments}
                    bucket="documents"
                    folder="multas"
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1 btn-primary" 
                      onClick={handleAddFine}
                      disabled={createFineMutation.isPending}
                    >
                      {createFineMutation.isPending ? "Registrando..." : "Registrar Multa"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredFines.length} multa{filteredFines.length !== 1 ? "s" : ""} encontrada{filteredFines.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg card-elevated">
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
      ) : filteredFines.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground card-elevated rounded-lg">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{hasActiveFilters ? "Nenhuma multa encontrada com os filtros aplicados" : "Nenhuma multa registrada"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFines.map((fine: any) => {
            const status = statusConfig[fine.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;
            
            return (
              <div
                key={fine.id}
                className="p-4 border rounded-lg card-elevated hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{fineTypeLabels[fine.tipo] || fine.tipo}</p>
                    <p className="text-sm text-muted-foreground">
                      {fine.numero_notificacao || "Sem número"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={status.class}>
                      <StatusIcon className="w-3 h-3 inline mr-1" />
                      {status.label}
                    </span>
                    {!isReadOnly && (
                      <ActionMenu
                        onView={() => {
                          setSelectedFine(fine);
                          setIsDetailsOpen(true);
                        }}
                        onEdit={() => {
                          setSelectedFine(fine);
                          setIsEditOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedFine(fine);
                          setIsDeleteOpen(true);
                        }}
                        showToggle={false}
                      />
                    )}
                  </div>
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
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{fine.descricao}</p>
                )}
                
                {/* View Details Button */}
                <div className="mt-3 pt-3 border-t flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFine(fine);
                      setIsDetailsOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fine Details Dialog */}
      <FineDetailsDialog
        fine={selectedFine}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        readOnly={isReadOnly}
      />

      {/* Fine Edit Dialog */}
      {!isReadOnly && (
        <FineEditDialog
          fine={selectedFine}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={() => {
          if (selectedFine) {
            deleteFine.mutate(selectedFine.id, {
              onSuccess: () => setIsDeleteOpen(false),
            });
          }
        }}
        title="Excluir Multa"
        description="Tem certeza que deseja excluir esta multa? Esta ação não pode ser desfeita."
        isDeleting={deleteFine.isPending}
      />
    </AppLayout>
  );
}
