import { useState } from "react";
import { Car, Loader2, Plus, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useVeiculos } from "@/hooks/useVeiculos";
import {
  useAssignVehicleToDriver,
  useUnassignVehicleFromDriver,
  DriverLimitError,
} from "@/hooks/useDriverDetails";
import { useVehicleActiveDrivers, MAX_ACTIVE_DRIVERS_PER_VEHICLE } from "@/hooks/useVehicleDrivers";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface DriverVehicleAssignmentProps {
  driverId: string;
  currentVehicle: any | null;
  isLoadingVehicle: boolean;
  onNavigateToVehicle?: (vehicleId: string) => void;
}

export function DriverVehicleAssignment({
  driverId,
  currentVehicle,
  isLoadingVehicle,
  onNavigateToVehicle,
}: DriverVehicleAssignmentProps) {
  const { tenant } = useTenant();
  const { data: allVehicles = [], isLoading: loadingVehicles } = useVeiculos();
  const assignMutation = useAssignVehicleToDriver();
  const unassignMutation = useUnassignVehicleFromDriver();

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);

  // Estado para fluxo de substituição
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [replaceTargetDriverId, setReplaceTargetDriverId] = useState<string>("");

  const { data: activeDriversOnTarget = [] } = useVehicleActiveDrivers(
    showReplaceDialog ? selectedVehicleId : null
  );

  const availableVehicles = allVehicles.filter((v) => v.ativo);

  const performAssign = async (replaceDriverId?: string) => {
    if (!selectedVehicleId || !tenant?.id) return;
    try {
      await assignMutation.mutateAsync({
        driverId,
        vehicleId: selectedVehicleId,
        tenantId: tenant.id,
        replaceDriverId,
      });
      setShowAssignDialog(false);
      setShowReplaceDialog(false);
      setSelectedVehicleId("");
      setReplaceTargetDriverId("");
    } catch (error) {
      if (error instanceof DriverLimitError) {
        // Abrir diálogo de substituição
        setShowAssignDialog(false);
        setShowReplaceDialog(true);
      }
    }
  };

  const handleAssign = () => performAssign();

  const handleConfirmReplace = () => {
    if (!replaceTargetDriverId) {
      toast.error("Selecione um motorista para substituir");
      return;
    }
    performAssign(replaceTargetDriverId);
  };

  const handleUnassign = async () => {
    if (!currentVehicle?.id) return;
    try {
      await unassignMutation.mutateAsync(currentVehicle.id);
      setShowUnassignConfirm(false);
    } catch (error) {
      // tratado na mutação
    }
  };

  if (isLoadingVehicle) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentVehicle ? (
        <>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Veículo Atual</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnassignConfirm(true)}
              disabled={unassignMutation.isPending}
            >
              {unassignMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Remover Atribuição
            </Button>
          </div>

          <div
            className="p-4 bg-muted rounded-lg flex items-center gap-4 cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => currentVehicle.veiculos?.id && onNavigateToVehicle?.(currentVehicle.veiculos.id)}
          >
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-background flex items-center justify-center">
              {currentVehicle.veiculos?.foto_principal_url ? (
                <img
                  src={currentVehicle.veiculos.foto_principal_url}
                  alt={currentVehicle.veiculos.matricula}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Car className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">{currentVehicle.veiculos?.matricula}</p>
              <p className="text-muted-foreground">
                {currentVehicle.veiculos?.marca} {currentVehicle.veiculos?.modelo}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Desde: {new Date(currentVehicle.data_inicio).toLocaleDateString("pt-PT")}
              </p>
              <Badge variant="default" className="mt-2">Ativo</Badge>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">Nenhum veículo atribuído atualmente</p>
          <Button onClick={() => setShowAssignDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Atribuir Veículo
          </Button>
        </div>
      )}

      {/* Assign Vehicle Dialog */}
      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atribuir Veículo</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o veículo que será atribuído a este motorista. Cada veículo pode ter no máximo {MAX_ACTIVE_DRIVERS_PER_VEHICLE} motoristas ativos.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um veículo" />
              </SelectTrigger>
              <SelectContent>
                {loadingVehicles ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  </div>
                ) : availableVehicles.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhum veículo disponível
                  </div>
                ) : (
                  availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{vehicle.matricula}</span>
                        <span className="text-muted-foreground">
                          - {vehicle.marca} {vehicle.modelo}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssign}
              disabled={!selectedVehicleId || assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Atribuindo...
                </>
              ) : (
                "Atribuir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace Driver Dialog (limite atingido) */}
      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Limite de motoristas atingido
            </AlertDialogTitle>
            <AlertDialogDescription>
              ⚠️ Este veículo já possui {MAX_ACTIVE_DRIVERS_PER_VEHICLE} motoristas ativos. Para adicionar um novo, é necessário substituir um dos atuais.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <p className="text-sm font-medium mb-3">Selecione o motorista a remover:</p>
            <RadioGroup value={replaceTargetDriverId} onValueChange={setReplaceTargetDriverId}>
              <div className="space-y-2">
                {activeDriversOnTarget.map((d: any) => (
                  <Label
                    key={d.motorista_id}
                    htmlFor={d.motorista_id}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={d.motorista_id} id={d.motorista_id} />
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={d.motoristas?.foto_perfil_url || undefined} />
                      <AvatarFallback>
                        {d.motoristas?.nome_completo?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{d.motoristas?.nome_completo || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        Ativo desde {new Date(d.data_inicio).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setReplaceTargetDriverId("");
                setSelectedVehicleId("");
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReplace}
              disabled={!replaceTargetDriverId || assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Substituindo...
                </>
              ) : (
                "Substituir e atribuir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unassign Confirmation Dialog */}
      <AlertDialog open={showUnassignConfirm} onOpenChange={setShowUnassignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Atribuição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a atribuição deste veículo ao motorista?
              Esta ação irá finalizar o uso do veículo {currentVehicle?.veiculos?.matricula}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
