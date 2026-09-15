import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2 } from "lucide-react";
import { DriverCard } from "@/components/drivers/DriverCard";
import { DriverDetailsDialog } from "@/components/drivers/DriverDetailsDialog";
import { DriverFormDialog } from "@/components/drivers/DriverFormDialog";
import { 
  useMotoristas, 
  useDeleteMotorista, 
  useToggleMotoristaStatus,
  Motorista 
} from "@/hooks/useMotoristas";
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

export default function Drivers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState<Motorista | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Motorista | null>(null);
  const [deleteDriver, setDeleteDriver] = useState<Motorista | null>(null);
  const [viewMode, setViewMode] = useViewMode("drivers");

  const { data: drivers = [], isLoading } = useMotoristas();
  const deleteMutation = useDeleteMotorista();
  const toggleStatusMutation = useToggleMotoristaStatus();

  // Handle view query param from URL (for notification navigation)
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId && drivers.length > 0) {
      const driver = drivers.find(d => d.id === viewId);
      if (driver) {
        setSelectedDriver(driver);
        setIsDetailsOpen(true);
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, drivers, setSearchParams]);

  const activeDrivers = drivers.filter((d) => d.ativo && d.status_cadastro === "ativo");
  const pendingDrivers = drivers.filter((d) => d.status_cadastro === "pendente");
  const inactiveDrivers = drivers.filter((d) => !d.ativo);
  const allActive = drivers.filter((d) => d.ativo);

  const displayDrivers =
    activeTab === "active"
      ? activeDrivers
      : activeTab === "pending"
      ? pendingDrivers
      : activeTab === "inactive"
      ? inactiveDrivers
      : allActive;

  const handleView = (driver: Motorista) => {
    setSelectedDriver(driver);
    setIsDetailsOpen(true);
  };

  const handleEdit = (driver: Motorista) => {
    setEditingDriver(driver);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingDriver(null);
    setIsFormOpen(true);
  };

  const handleToggleActive = (driver: Motorista) => {
    toggleStatusMutation.mutate({ id: driver.id, ativo: !driver.ativo });
  };

  const handleDelete = (driver: Motorista) => {
    setDeleteDriver(driver);
  };

  const confirmDelete = () => {
    if (deleteDriver) {
      deleteMutation.mutate(deleteDriver.id, {
        onSuccess: () => setDeleteDriver(null),
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Motoristas" subtitle="Gerir motoristas TVDE">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Motoristas" subtitle="Gerir motoristas TVDE">
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">
              Todos ({allActive.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Ativos ({activeDrivers.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes ({pendingDrivers.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inativos ({inactiveDrivers.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button className="btn-accent" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Motorista
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
        {displayDrivers.map((driver, index) => (
          <div key={driver.id} style={{ animationDelay: `${index * 0.1}s` }}>
            <DriverCard
              driver={driver}
              onView={handleView}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              viewMode={viewMode}
            />
          </div>
        ))}
      </div>

      {displayDrivers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum motorista encontrado nesta categoria</p>
        </div>
      )}

      <DriverDetailsDialog
        driver={selectedDriver}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      <DriverFormDialog
        driver={editingDriver}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <AlertDialog open={!!deleteDriver} onOpenChange={() => setDeleteDriver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteDriver?.nome_completo}? Esta ação não pode ser desfeita.
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
