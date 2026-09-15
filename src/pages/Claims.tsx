import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { 
  AlertTriangle, CheckCircle, Clock, Car, User, Calendar, Shield, 
  ExternalLink, Plus, Search, Filter, X, FileText, Eye 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMotoristaProfile } from "@/hooks/useMotoristaProfile";
import { useProprietarioProfile } from "@/hooks/useProprietarioProfile";
import { toast } from "sonner";
import { DocumentUploadSection, UploadedDocument } from "@/components/common/DocumentUploadSection";
import { ClaimDetailsDialog } from "@/components/claims/ClaimDetailsDialog";
import { ClaimEditDialog } from "@/components/claims/ClaimEditDialog";
import { ActionMenu } from "@/components/common/ActionMenu";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { useDeleteClaim } from "@/hooks/useFinesAndClaims";

const statusConfig = {
  open: { label: "Aberto", class: "badge-warning", icon: Clock },
  in_progress: { label: "Em Andamento", class: "bg-info/20 text-info border-info/30", icon: AlertTriangle },
  closed: { label: "Encerrado", class: "badge-success", icon: CheckCircle },
};

const CLAIM_DOCUMENT_TYPES = [
  "Declaração Amigável",
  "Folha de Peritagem",
  "Fotos do Acidente",
];

export default function Claims() {
  const { tenant } = useTenant();
  const { activeRole } = useAuth();
  const { motoristaId, isMotorista } = useMotoristaProfile();
  const { proprietarioId, vehicleIds: propVehicleIds, isProprietario } = useProprietarioProfile();
  const isReadOnly = activeRole === "motorista" || activeRole === "proprietario";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteClaim = useDeleteClaim();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // New claim form
  const [newClaim, setNewClaim] = useState({
    veiculo_id: "",
    motorista_id: "",
    data_sinistro: "",
    data_peritagem: "",
    peritagem_realizada: false,
    seguradora: "",
    apolice: "",
    numero_processo: "",
    itens_danificados: [] as string[],
    descricao: "",
    status: "open",
    newDamagedItem: "",
    teve_testemunha: false,
    nome_testemunha: "",
    telemovel_testemunha: "",
  });
  const [claimDocuments, setClaimDocuments] = useState<UploadedDocument[]>([]);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["all-claims", tenant?.id, motoristaId, isMotorista, propVehicleIds, isProprietario],
    queryFn: async () => {
      if (!tenant?.id) return [];
      if (isMotorista && !motoristaId) return [];
      if (isProprietario && propVehicleIds.length === 0) return [];
      let query = supabase
        .from("sinistros")
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
      
      const { data, error } = await query.order("data_sinistro", { ascending: false });
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

  const createClaimMutation = useMutation({
    mutationFn: async (claimData: typeof newClaim) => {
      if (!tenant?.id) throw new Error("Tenant não encontrado");
      const { error } = await supabase.from("sinistros").insert({
        tenant_id: tenant.id,
        veiculo_id: claimData.veiculo_id,
        motorista_id: claimData.motorista_id || null,
        data_sinistro: claimData.data_sinistro,
        data_peritagem: claimData.data_peritagem || null,
        peritagem_realizada: claimData.peritagem_realizada,
        seguradora: claimData.seguradora || null,
        apolice: claimData.apolice || null,
        numero_processo: claimData.numero_processo || null,
        itens_danificados: claimData.itens_danificados,
        descricao: claimData.descricao || null,
        status: claimData.status as any,
        teve_testemunha: claimData.teve_testemunha,
        nome_testemunha: claimData.teve_testemunha ? claimData.nome_testemunha || null : null,
        telemovel_testemunha: claimData.teve_testemunha ? claimData.telemovel_testemunha || null : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-claims"] });
      toast.success("Sinistro registrado com sucesso!");
      setIsAddDialogOpen(false);
      setNewClaim({
        veiculo_id: "",
        motorista_id: "",
        data_sinistro: "",
        data_peritagem: "",
        peritagem_realizada: false,
        seguradora: "",
        apolice: "",
        numero_processo: "",
        itens_danificados: [],
        descricao: "",
        status: "open",
        newDamagedItem: "",
        teve_testemunha: false,
        nome_testemunha: "",
        telemovel_testemunha: "",
      });
      setClaimDocuments([]);
    },
    onError: (error) => {
      toast.error("Erro ao registrar sinistro: " + error.message);
    },
  });

  const handleAddDamagedItem = () => {
    if (newClaim.newDamagedItem.trim()) {
      setNewClaim({
        ...newClaim,
        itens_danificados: [...newClaim.itens_danificados, newClaim.newDamagedItem.trim()],
        newDamagedItem: "",
      });
    }
  };

  const handleRemoveDamagedItem = (index: number) => {
    setNewClaim({
      ...newClaim,
      itens_danificados: newClaim.itens_danificados.filter((_, i) => i !== index),
    });
  };

  const handleAddClaim = () => {
    if (!newClaim.veiculo_id || !newClaim.data_sinistro) {
      toast.error("Preencha os campos obrigatórios: Veículo e Data do Sinistro");
      return;
    }
    createClaimMutation.mutate(newClaim);
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
  };

  const isExpertisePending = (claim: any) => {
    if (claim.peritagem_realizada) return false;
    if (!claim.data_peritagem) return false;
    const expertiseDate = new Date(claim.data_peritagem);
    const today = new Date();
    return expertiseDate >= today;
  };

  const filteredClaims = claims.filter((claim: any) => {
    const matchesSearch = searchTerm === "" || 
      claim.numero_processo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.veiculo?.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.seguradora?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilters = searchTerm || statusFilter !== "all";

  return (
    <AppLayout title="Sinistros" subtitle="Gestão de sinistros e acidentes">
      {/* Header with filters and add button */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por processo, matrícula, motorista, seguradora..."
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
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="closed">Encerrado</SelectItem>
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
                  Novo Sinistro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Novo Sinistro</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  {/* Identification */}
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Identificação do Sinistro
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Veículo *</Label>
                        <Select
                          value={newClaim.veiculo_id}
                          onValueChange={(value) =>
                            setNewClaim({ ...newClaim, veiculo_id: value })
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
                        <Label>Data do Sinistro *</Label>
                        <Input
                          type="date"
                          value={newClaim.data_sinistro}
                          onChange={(e) =>
                            setNewClaim({ ...newClaim, data_sinistro: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Motorista</Label>
                        <Select
                          value={newClaim.motorista_id}
                          onValueChange={(value) =>
                            setNewClaim({ ...newClaim, motorista_id: value })
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
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                          value={newClaim.status}
                          onValueChange={(value) =>
                            setNewClaim({ ...newClaim, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                            <SelectItem value="closed">Encerrado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Expertise */}
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Peritagem
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data da Peritagem</Label>
                        <Input
                          type="date"
                          value={newClaim.data_peritagem}
                          onChange={(e) =>
                            setNewClaim({ ...newClaim, data_peritagem: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          id="expertiseDone"
                          checked={newClaim.peritagem_realizada}
                          onCheckedChange={(checked) =>
                            setNewClaim({ ...newClaim, peritagem_realizada: checked as boolean })
                          }
                        />
                        <Label htmlFor="expertiseDone" className="cursor-pointer">
                          Peritagem realizada
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Insurance Info */}
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Dados do Seguro
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Seguradora</Label>
                        <Input
                          value={newClaim.seguradora}
                          onChange={(e) =>
                            setNewClaim({ ...newClaim, seguradora: e.target.value })
                          }
                          placeholder="Ex: Fidelidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nº Apólice</Label>
                        <Input
                          value={newClaim.apolice}
                          onChange={(e) =>
                            setNewClaim({ ...newClaim, apolice: e.target.value })
                          }
                          placeholder="POL-XXXX-XXXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nº Processo</Label>
                        <Input
                          value={newClaim.numero_processo}
                          onChange={(e) =>
                            setNewClaim({ ...newClaim, numero_processo: e.target.value })
                          }
                          placeholder="PROC-XXXX-XXX"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Witness Information */}
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Testemunha
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hadWitness"
                        checked={newClaim.teve_testemunha}
                        onCheckedChange={(checked) =>
                          setNewClaim({ ...newClaim, teve_testemunha: checked as boolean })
                        }
                      />
                      <Label htmlFor="hadWitness" className="cursor-pointer">
                        Teve testemunha
                      </Label>
                    </div>
                    {newClaim.teve_testemunha && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome da Testemunha</Label>
                          <Input
                            value={newClaim.nome_testemunha}
                            onChange={(e) =>
                              setNewClaim({ ...newClaim, nome_testemunha: e.target.value })
                            }
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Telemóvel</Label>
                          <Input
                            value={newClaim.telemovel_testemunha}
                            onChange={(e) =>
                              setNewClaim({ ...newClaim, telemovel_testemunha: e.target.value })
                            }
                            placeholder="+351 9XX XXX XXX"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Damaged Items */}
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-semibold">Itens Danificados</h4>
                    <div className="flex gap-2">
                      <Input
                        value={newClaim.newDamagedItem}
                        onChange={(e) =>
                          setNewClaim({ ...newClaim, newDamagedItem: e.target.value })
                        }
                        placeholder="Ex: Para-choques dianteiro"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDamagedItem())}
                      />
                      <Button type="button" variant="outline" onClick={handleAddDamagedItem}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {newClaim.itens_danificados.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newClaim.itens_danificados.map((item, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {item}
                            <button onClick={() => handleRemoveDamagedItem(index)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={newClaim.descricao}
                      onChange={(e) =>
                        setNewClaim({ ...newClaim, descricao: e.target.value })
                      }
                      placeholder="Descreva o sinistro..."
                      rows={3}
                    />
                  </div>

                  {/* Documents */}
                  <DocumentUploadSection
                    title="Documentos do Sinistro"
                    predefinedTypes={CLAIM_DOCUMENT_TYPES}
                    documents={claimDocuments}
                    onDocumentsChange={setClaimDocuments}
                    bucket="documents"
                    folder="sinistros"
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
                      onClick={handleAddClaim}
                      disabled={createClaimMutation.isPending}
                    >
                      {createClaimMutation.isPending ? "Registrando..." : "Registrar Sinistro"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredClaims.length} sinistro{filteredClaims.length !== 1 ? "s" : ""} encontrado{filteredClaims.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg card-elevated">
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
      ) : filteredClaims.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground card-elevated rounded-lg">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{hasActiveFilters ? "Nenhum sinistro encontrado com os filtros aplicados" : "Nenhum sinistro registrado"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim: any) => {
            const status = statusConfig[claim.status as keyof typeof statusConfig] || statusConfig.open;
            const StatusIcon = status.icon;
            const hasPendingExpertise = isExpertisePending(claim);
            const damagedItems = (claim.itens_danificados as string[]) || [];

            return (
              <div
                key={claim.id}
                className="p-4 border rounded-lg card-elevated hover:bg-muted/50 transition-colors"
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
                  <div className="flex items-center gap-2">
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
                    {!isReadOnly && (
                      <ActionMenu
                        onView={() => {
                          setSelectedClaim(claim);
                          setIsDetailsOpen(true);
                        }}
                        onEdit={() => {
                          setSelectedClaim(claim);
                          setIsEditOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedClaim(claim);
                          setIsDeleteOpen(true);
                        }}
                        showToggle={false}
                      />
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
                  <p className="text-sm text-muted-foreground line-clamp-2">{claim.descricao}</p>
                )}

                {/* View Details Button */}
                <div className="mt-3 pt-3 border-t flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedClaim(claim);
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

      {/* Claim Details Dialog */}
      <ClaimDetailsDialog
        claim={selectedClaim}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        readOnly={isReadOnly}
      />

      {/* Claim Edit Dialog */}
      {!isReadOnly && (
        <ClaimEditDialog
          claim={selectedClaim}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={() => {
          if (selectedClaim) {
            deleteClaim.mutate(selectedClaim.id, {
              onSuccess: () => setIsDeleteOpen(false),
            });
          }
        }}
        title="Excluir Sinistro"
        description="Tem certeza que deseja excluir este sinistro? Esta ação não pode ser desfeita."
        isDeleting={deleteClaim.isPending}
      />
    </AppLayout>
  );
}
