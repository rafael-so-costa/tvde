import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useContratos } from "@/hooks/useContratos";
import { useAuth } from "@/contexts/AuthContext";
import { useTemplatesContrato } from "@/hooks/useTemplatesContrato";
import { ContractEditorDialog } from "@/components/contracts/ContractEditorDialog";
import { ContractWizardDialog } from "@/components/contracts/ContractWizardDialogNew";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Contract } from "@/types/contract";
import {
  Plus, FileText, Eye, Pencil, MoreVertical, Calendar, User, Car, Building2,
  Search, Lock, Trash2, RefreshCw, Download, FileStack, CheckCircle2, Printer,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { exportContractPdf, printContract } from "@/utils/contractPdfExport";
import { useTenant } from "@/contexts/TenantContext";

const statusConfig = {
  rascunho: { label: "Rascunho", class: "bg-muted text-muted-foreground" },
  enviado: { label: "Pendente", class: "badge-warning" },
  assinado: { label: "Ativo", class: "badge-success" },
  cancelado: { label: "Cancelado", class: "bg-muted text-muted-foreground" },
  renovado: { label: "Renovado", class: "bg-blue-100 text-blue-800" },
  expirado: { label: "Expirado", class: "badge-destructive" },
  encerrado: { label: "Encerrado", class: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
};

function ContractCard({ contract, onView, onEdit, onUpdate, onDelete, onClose, readOnly }: {
  contract: Contract; onView: () => void; onEdit: () => void; onUpdate: () => void; onDelete: () => void; onClose: () => void; readOnly?: boolean;
}) {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [isExporting, setIsExporting] = useState(false);
  const status = statusConfig[contract.status] || statusConfig.rascunho;
  const isClosed = contract.status === "encerrado";
  const isActive = contract.status === "assinado";
  const getOwnerName = () => contract.proprietario?.tipo === "empresa" ? contract.proprietario.nome_empresa : contract.proprietario?.nome_completo || "Sem proprietário";

  const handlePrint = async () => {
    if (!tenant?.id) {
      toast.error("Tenant não disponível.");
      return;
    }
    try {
      await printContract({ contractId: contract.id, tenantId: tenant.id });
    } catch (err) {
      console.error("[Contracts] Failed to print contract", err);
      toast.error("Erro ao preparar impressão. Tente novamente.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!tenant?.id) {
      toast.error("Tenant não disponível.");
      return;
    }
    if (isExporting) return;
    setIsExporting(true);
    toast.info("Gerando PDF...");
    try {
      await exportContractPdf({ contractId: contract.id, tenantId: tenant.id });
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error("[Contracts] Failed to export PDF", err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{contract.template?.nome || "Contrato"}</h3>
            <p className="text-sm text-muted-foreground">v{contract.versao_atual} · {format(new Date(contract.created_at), "dd/MM/yyyy", { locale: pt })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", status.class)}>{status.label}</Badge>
          {(contract.bloqueado || isClosed) && <Lock className="w-4 h-4 text-muted-foreground" />}
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onView} className="gap-2"><Eye className="h-4 w-4" />Ver detalhes</DropdownMenuItem>
                {isClosed && (
                  <>
                    <DropdownMenuItem onClick={handleDownloadPdf} className="gap-2"><Download className="h-4 w-4" />Download PDF</DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" />Imprimir</DropdownMenuItem>
                  </>
                )}
                {!isClosed && !contract.bloqueado && contract.status === "rascunho" && (
                  <DropdownMenuItem onClick={onEdit} className="gap-2"><Pencil className="h-4 w-4" />Editar</DropdownMenuItem>
                )}
                {!isClosed && <DropdownMenuItem onClick={onUpdate} className="gap-2"><RefreshCw className="h-4 w-4" />Atualizar</DropdownMenuItem>}
                {isActive && (
                  <DropdownMenuItem onClick={onClose} className="gap-2 text-primary focus:text-primary">
                    <CheckCircle2 className="h-4 w-4" />Encerrar contrato
                  </DropdownMenuItem>
                )}
                {!isClosed && <DropdownMenuSeparator />}
                {!isClosed && (
                  <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="space-y-2 mb-4 text-sm">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
          onClick={(e) => {
            if (contract.proprietario?.id) {
              e.stopPropagation();
              navigate(`/owners?view=${contract.proprietario.id}`);
            }
          }}
        >
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className={cn("font-medium", contract.proprietario?.id && "hover:underline")}>{getOwnerName()}</span>
        </div>
        {contract.motorista && (
          <div 
            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/drivers?view=${contract.motorista!.id}`);
            }}
          >
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="hover:underline">{contract.motorista.nome_completo}</span>
          </div>
        )}
        {contract.veiculo && (
          <div 
            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/vehicles?view=${contract.veiculo!.id}`);
            }}
          >
            <Car className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono hover:underline">{contract.veiculo.matricula}</span>
          </div>
        )}
        {isClosed && (
          <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-dashed">
            <Calendar className="w-4 h-4" />
            <span>
              {contract.data_inicio && format(new Date(contract.data_inicio), "dd/MM/yyyy", { locale: pt })}
              {" → "}
              {contract.data_fim ? format(new Date(contract.data_fim), "dd/MM/yyyy", { locale: pt }) : "—"}
            </span>
          </div>
        )}
      </div>
      {contract.valor_semanal && !isClosed && (
        <div className="flex items-center justify-between py-3 border-t mb-4">
          <span className="text-muted-foreground">Valor Semanal</span>
          <span className="text-xl font-bold text-primary">€{contract.valor_semanal.toFixed(2)}</span>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onView}><Eye className="w-4 h-4 mr-1" />Ver</Button>
        {(contract.status === "assinado" || isClosed) && (
          <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadPdf} disabled={isExporting}><Download className="w-4 h-4 mr-1" />{isExporting ? "..." : "PDF"}</Button>
        )}
        {isClosed && (
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4" /></Button>
        )}
      </div>
    </div>
  );
}

export default function Contracts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { activeRole } = useAuth();
  const isReadOnly = activeRole === "motorista" || activeRole === "proprietario";
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showNewContract, setShowNewContract] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { contratos, isLoading, deleteContrato, updateContrato } = useContratos();
  const { templates, isLoading: templatesLoading } = useTemplatesContrato();

  // Handle URL parameter to open contract after creation
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId && contratos.length > 0) {
      const contract = contratos.find((c) => c.id === viewId);
      if (contract) {
        setSelectedContract(contract);
        setShowEditor(true);
        // Clear the URL parameter
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, contratos, setSearchParams]);

  const handleWizardSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["contratos"] });
  };

  const filteredContracts = contratos.filter((contract) => {
    if (activeTab === "active" && contract.status !== "assinado") return false;
    if (activeTab === "pending" && contract.status !== "enviado") return false;
    if (activeTab === "cancelled" && contract.status !== "cancelado" && contract.status !== "expirado") return false;
    if (activeTab === "closed" && contract.status !== "encerrado") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!contract.template?.nome?.toLowerCase().includes(q) && 
          !contract.proprietario?.nome_completo?.toLowerCase().includes(q) &&
          !contract.veiculo?.matricula?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: contratos.length,
    active: contratos.filter(c => c.status === "assinado").length,
    pending: contratos.filter(c => c.status === "enviado").length,
    cancelled: contratos.filter(c => c.status === "cancelado" || c.status === "expirado").length,
    closed: contratos.filter(c => c.status === "encerrado").length,
  };

  const handleCloseContract = async (contract: Contract) => {
    if (!window.confirm(`Encerrar o contrato "${contract.template?.nome || "Contrato"}"?\n\nEsta ação marca o contrato como concluído e impede edições futuras.`)) return;
    try {
      await updateContrato.mutateAsync({
        id: contract.id,
        status: "encerrado",
        bloqueado: true,
        data_fim: contract.data_fim || new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      // toast já tratado no hook
    }
  };

  return (
    <AppLayout title="Contratos" subtitle="Sistema inteligente de automação de contratos">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar contratos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/templates")}><FileStack className="w-4 h-4 mr-2" />Templates</Button>
            <Button className="btn-accent" onClick={() => setShowNewContract(true)}><Plus className="w-4 h-4 mr-2" />Novo Contrato</Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
          <TabsTrigger value="active">Ativos ({stats.active})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({stats.pending})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelados ({stats.cancelled})</TabsTrigger>
          <TabsTrigger value="closed">Encerrados ({stats.closed})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum contrato encontrado</h3>
          {!isReadOnly && activeTab !== "closed" && (
            <Button onClick={() => setShowNewContract(true)}><Plus className="w-4 h-4 mr-2" />Novo Contrato</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContracts.map(contract => (
            <ContractCard
              key={contract.id}
              contract={contract}
              readOnly={isReadOnly}
              onView={() => { setSelectedContract(contract); setShowEditor(true); }}
              onEdit={() => { setSelectedContract(contract); setShowEditor(true); }}
              onUpdate={() => { setSelectedContract(contract); setShowEditor(true); }}
              onDelete={() => setDeleteTarget({ id: contract.id, name: contract.template?.nome || "Contrato" })}
              onClose={() => handleCloseContract(contract)}
            />
          ))}
        </div>
      )}

      <ContractEditorDialog open={showEditor} onOpenChange={setShowEditor} contract={selectedContract} onUpdate={() => {}} />
      <ContractWizardDialog open={showNewContract} onOpenChange={setShowNewContract} templates={templates} templatesLoading={templatesLoading} onSuccess={handleWizardSuccess} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteContrato.mutateAsync(deleteTarget.id).then(() => setDeleteTarget(null))}
        title="Excluir Contrato"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
      />
    </AppLayout>
  );
}
