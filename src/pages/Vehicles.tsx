import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { VehicleDetailsDialog } from "@/components/vehicles/VehicleDetailsDialog";
import { VehicleFormDialog } from "@/components/vehicles/VehicleFormDialog";
import { useVeiculos, useDeleteVeiculo, useToggleVeiculoStatus, Veiculo } from "@/hooks/useVeiculos";
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

export default function Vehicles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const { data: vehicles = [], isLoading } = useVeiculos();
  const deleteMutation = useDeleteVeiculo();
  const toggleStatusMutation = useToggleVeiculoStatus();
  const { isAdmin, isSuperAdmin } = useAuth();
  const isGestor = isAdmin || isSuperAdmin;

  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Veiculo | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Veiculo | null>(null);

  // Handle view query param from URL (for notification navigation)
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === viewId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setIsDetailsOpen(true);
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, vehicles, setSearchParams]);

  // Filter vehicles based on active tab
  const activeVehicles = vehicles.filter((v) => v.ativo === true);
  const inactiveVehicles = vehicles.filter((v) => v.ativo === false);
  
  // Check for document alerts (expired or expiring soon)
  const today = new Date();
  const alertVehicles = vehicles.filter((v) => {
    if (!v.ativo) return false;
    
    const checkExpiry = (date: string | null) => {
      if (!date) return false;
      const expiryDate = new Date(date);
      return expiryDate <= today;
    };
    
    return checkExpiry(v.carta_verde_valid_until) || checkExpiry(v.inspecao_tvde_valid_until);
  });

  const displayVehicles =
    activeTab === "active"
      ? activeVehicles
      : activeTab === "alerts"
      ? alertVehicles
      : activeTab === "inactive"
      ? inactiveVehicles
      : vehicles.filter((v) => v.ativo !== false);

  const handleViewDetails = (vehicle: Veiculo) => {
    setSelectedVehicle(vehicle);
    setIsDetailsOpen(true);
  };

  const handleEdit = (vehicle: Veiculo) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    setIsFormOpen(true);
  };

  const handleToggleActive = (vehicle: Veiculo) => {
    toggleStatusMutation.mutate({
      id: vehicle.id,
      ativo: !vehicle.ativo,
    });
  };

  const handleDelete = (vehicle: Veiculo) => {
    setDeleteVehicle(vehicle);
  };

  const confirmDelete = () => {
    if (deleteVehicle) {
      deleteMutation.mutate(deleteVehicle.id);
      setDeleteVehicle(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Veículos" subtitle="Gerir frota de veículos TVDE">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Veículos" subtitle="Gerir frota de veículos TVDE">
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">
              Todos ({vehicles.filter((v) => v.ativo !== false).length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Ativos ({activeVehicles.length})
            </TabsTrigger>
            <TabsTrigger value="alerts">
              Alertas ({alertVehicles.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inativos ({inactiveVehicles.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isGestor && (
          <Button className="btn-accent" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Veículo
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {displayVehicles.map((vehicle, index) => (
          <div key={vehicle.id} style={{ animationDelay: `${index * 0.1}s` }}>
            <VehicleCard
              vehicle={vehicle}
              onViewDetails={handleViewDetails}
              onEdit={isGestor ? handleEdit : undefined}
              onToggleActive={isGestor ? handleToggleActive : undefined}
              onDelete={isGestor ? handleDelete : undefined}
            />
          </div>
        ))}
      </div>

      {displayVehicles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum veículo encontrado nesta categoria</p>
        </div>
      )}

      <VehicleDetailsDialog
        vehicle={selectedVehicle}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {isGestor && (
        <>
          <VehicleFormDialog
            vehicle={editingVehicle}
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            onSuccess={() => {}}
          />

          <AlertDialog open={!!deleteVehicle} onOpenChange={() => setDeleteVehicle(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o veículo {deleteVehicle?.matricula}? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AppLayout>
  );
}
