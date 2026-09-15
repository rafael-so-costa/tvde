import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2 } from "lucide-react";
import { OwnerCard } from "@/components/owners/OwnerCard";
import { OwnerDetailsDialog } from "@/components/owners/OwnerDetailsDialog";
import { OwnerFormDialog } from "@/components/owners/OwnerFormDialog";
import { 
  useProprietarios, 
  useDeleteProprietario, 
  useToggleProprietarioStatus,
  Proprietario 
} from "@/hooks/useProprietarios";
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

export default function Owners() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOwner, setSelectedOwner] = useState<Proprietario | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Proprietario | null>(null);
  const [deleteOwner, setDeleteOwner] = useState<Proprietario | null>(null);
  const [viewMode, setViewMode] = useViewMode("owners");

  const { data: owners = [], isLoading } = useProprietarios();
  const deleteMutation = useDeleteProprietario();
  const toggleStatusMutation = useToggleProprietarioStatus();

  // Handle view query param from URL (for notification navigation)
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId && owners.length > 0) {
      const owner = owners.find(o => o.id === viewId);
      if (owner) {
        setSelectedOwner(owner);
        setIsDetailsOpen(true);
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, owners, setSearchParams]);

  const companies = owners.filter((o) => o.tipo === "empresa");
  const individuals = owners.filter((o) => o.tipo === "pessoa_fisica");
  const inactive = owners.filter((o) => !o.ativo);
  const active = owners.filter((o) => o.ativo);

  const displayOwners =
    activeTab === "companies"
      ? companies.filter((o) => o.ativo)
      : activeTab === "individuals"
      ? individuals.filter((o) => o.ativo)
      : activeTab === "inactive"
      ? inactive
      : active;

  const handleView = (owner: Proprietario) => {
    setSelectedOwner(owner);
    setIsDetailsOpen(true);
  };

  const handleEdit = (owner: Proprietario) => {
    setEditingOwner(owner);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingOwner(null);
    setIsFormOpen(true);
  };

  const handleToggleActive = (owner: Proprietario) => {
    toggleStatusMutation.mutate({ id: owner.id, ativo: !owner.ativo });
  };

  const handleDelete = (owner: Proprietario) => {
    setDeleteOwner(owner);
  };

  const confirmDelete = () => {
    if (deleteOwner) {
      deleteMutation.mutate(deleteOwner.id, {
        onSuccess: () => setDeleteOwner(null),
      });
    }
  };

  const getOwnerName = (owner: Proprietario) => {
    return owner.tipo === "empresa" ? owner.nome_empresa : owner.nome_completo;
  };

  if (isLoading) {
    return (
      <AppLayout title="Proprietários" subtitle="Gerir empresas e pessoas físicas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Proprietários"
      subtitle="Gerir empresas e pessoas físicas"
    >
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">
              Todos ({active.length})
            </TabsTrigger>
            <TabsTrigger value="companies">
              Empresas ({companies.filter((o) => o.ativo).length})
            </TabsTrigger>
            <TabsTrigger value="individuals">
              Particulares ({individuals.filter((o) => o.ativo).length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inativos ({inactive.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button className="btn-accent" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Proprietário
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
        {displayOwners.map((owner, index) => (
          <div key={owner.id} style={{ animationDelay: `${index * 0.1}s` }}>
            <OwnerCard
              owner={owner}
              onView={handleView}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              viewMode={viewMode}
            />
          </div>
        ))}
      </div>

      {displayOwners.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum proprietário encontrado nesta categoria</p>
        </div>
      )}

      <OwnerDetailsDialog
        owner={selectedOwner}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      <OwnerFormDialog
        owner={editingOwner}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <AlertDialog open={!!deleteOwner} onOpenChange={() => setDeleteOwner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteOwner ? getOwnerName(deleteOwner) : ""}? Esta ação não pode ser desfeita.
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
    </AppLayout>
  );
}
