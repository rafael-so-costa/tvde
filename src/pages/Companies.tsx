import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Building2 } from "lucide-react";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { CompanyDetailsDialog } from "@/components/companies/CompanyDetailsDialog";
import { CompanyFormDialogNew } from "@/components/companies/CompanyFormDialogNew";
import { 
  useEmpresas, 
  useDeleteEmpresa, 
  useToggleEmpresaStatus,
  Empresa 
} from "@/hooks/useEmpresas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ViewToggle } from "@/components/common/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";

export default function Companies() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<Empresa | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Empresa | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<Empresa | null>(null);
  const [viewMode, setViewMode] = useViewMode("companies");

  const { data: companies = [], isLoading } = useEmpresas();
  const deleteMutation = useDeleteEmpresa();
  const toggleStatusMutation = useToggleEmpresaStatus();

  const inactive = companies.filter((c) => !c.ativo);
  const active = companies.filter((c) => c.ativo);

  const displayCompanies =
    activeTab === "inactive" ? inactive : active;

  const handleView = (company: Empresa) => {
    setSelectedCompany(company);
    setIsDetailsOpen(true);
  };

  const handleEdit = (company: Empresa) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setIsFormOpen(true);
  };

  const handleToggleActive = (company: Empresa) => {
    toggleStatusMutation.mutate({ id: company.id, ativo: !company.ativo });
  };

  const handleDelete = (company: Empresa) => {
    setDeleteCompany(company);
  };

  const confirmDelete = () => {
    if (deleteCompany) {
      deleteMutation.mutate(deleteCompany.id, {
        onSuccess: () => setDeleteCompany(null),
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Empresas" subtitle="Gerir perfis de empresas para contratos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Empresas"
      subtitle="Gerir perfis de empresas para contratos"
    >
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">
              Ativas ({active.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inativas ({inactive.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button className="btn-accent" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      <div className={
        viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          : viewMode === "list"
          ? "flex flex-col gap-4"
          : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
      }>
        {displayCompanies.map((company, index) => (
          <div key={company.id} style={{ animationDelay: `${index * 0.1}s` }}>
            <CompanyCard
              company={company}
              onView={handleView}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              viewMode={viewMode}
            />
          </div>
        ))}
      </div>

      {displayCompanies.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Nenhuma empresa encontrada</p>
          <p className="text-sm mb-4">Crie uma nova empresa para começar</p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      )}

      <CompanyDetailsDialog
        company={selectedCompany}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      <CompanyFormDialogNew
        company={editingCompany}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <AlertDialog open={!!deleteCompany} onOpenChange={() => setDeleteCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteCompany?.nome_empresa}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Notice */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg border">
        <p className="text-sm text-muted-foreground">
          <strong>Nota:</strong> Estes perfis de empresa são utilizados para a "Identificação de Empresa" 
          nos contratos. São independentes dos Proprietários (empresas) registados na aba Proprietários.
        </p>
      </div>
    </AppLayout>
  );
}
