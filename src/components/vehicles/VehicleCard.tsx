import { Button } from "@/components/ui/button";
import { Car, AlertTriangle, CheckCircle, Fuel, Settings, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Veiculo } from "@/hooks/useVeiculos";
import { ActionMenu } from "@/components/common/ActionMenu";

interface VehicleCardProps {
  vehicle: Veiculo & { proprietario?: { id: string; nome_completo: string | null; nome_empresa: string | null; tipo: string } | null };
  onViewDetails: (vehicle: any) => void;
  onEdit?: (vehicle: any) => void;
  onToggleActive?: (vehicle: any) => void;
  onDelete?: (vehicle: any) => void;
}

export function VehicleCard({ 
  vehicle, 
  onViewDetails, 
  onEdit, 
  onToggleActive, 
  onDelete 
}: VehicleCardProps) {
  const isActive = vehicle.ativo === true;
  const today = new Date();
  
  // Check document validity
  const isCartaVerdeValid = vehicle.carta_verde_valid_until 
    ? new Date(vehicle.carta_verde_valid_until) > today 
    : false;
  const isInspecaoValid = vehicle.inspecao_tvde_valid_until 
    ? new Date(vehicle.inspecao_tvde_valid_until) > today 
    : false;

  const hasDocumentIssues = !isCartaVerdeValid || !isInspecaoValid;

  const getStatusConfig = () => {
    if (!isActive) {
      return { label: "Inativo", class: "badge-destructive", icon: AlertTriangle };
    }
    if (hasDocumentIssues) {
      return { label: "Atenção", class: "badge-warning", icon: Settings };
    }
    return { label: "Ativo", class: "badge-success", icon: CheckCircle };
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  const gallery = (vehicle.fotos_galeria as string[]) || [];
  const ownerName = vehicle.proprietario 
    ? (vehicle.proprietario.tipo === "empresa" ? vehicle.proprietario.nome_empresa : vehicle.proprietario.nome_completo)
    : "Sem proprietário";

  return (
    <div className="card-elevated overflow-hidden animate-slide-up">
      {/* Header with vehicle image placeholder */}
      <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
        {vehicle.foto_principal_url ? (
          <img 
            src={vehicle.foto_principal_url} 
            alt={`${vehicle.marca} ${vehicle.modelo}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <Car className="w-16 h-16 text-primary/40" />
        )}
        <div className="absolute top-3 right-3">
          <span className={status.class}>
            <StatusIcon className="w-3 h-3 inline mr-1" />
            {status.label}
          </span>
        </div>
        {hasDocumentIssues && isActive && (
          <div className="absolute top-3 left-3">
            <span className="badge-destructive">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Documentos
            </span>
          </div>
        )}
        {gallery.length > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {gallery.length}
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Plate and Model */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-mono text-2xl font-bold text-primary">
              {vehicle.matricula}
            </p>
            <p className="text-muted-foreground">
              {vehicle.marca} {vehicle.modelo}
            </p>
          </div>
          <ActionMenu
            onView={() => onViewDetails(vehicle)}
            onEdit={onEdit ? () => onEdit(vehicle) : undefined}
            onToggleActive={onToggleActive ? () => onToggleActive(vehicle) : undefined}
            onDelete={onDelete ? () => onDelete(vehicle) : undefined}
            isActive={isActive}
            showEdit={!!onEdit}
            showToggle={!!onToggleActive}
            showDelete={!!onDelete}
          />
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Cor</p>
            <p className="font-medium text-sm">{vehicle.cor || "-"}</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <Fuel className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="font-medium text-sm">{vehicle.combustivel || "-"}</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Lugares</p>
            <p className="font-medium text-sm">{vehicle.lugares || "-"}</p>
          </div>
        </div>

        {/* Documents Status */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Carta Verde</span>
            <span
              className={cn(
                "font-medium",
                isCartaVerdeValid ? "text-success" : "text-destructive"
              )}
            >
              {isCartaVerdeValid ? "Válida" : "Expirada/Não definida"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Inspeção TVDE</span>
            <span
              className={cn(
                "font-medium",
                isInspecaoValid ? "text-success" : "text-destructive"
              )}
            >
              {isInspecaoValid ? "Válida" : "Expirada/Não definida"}
            </span>
          </div>
        </div>

        {/* Owner */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">Proprietário</p>
          <p className="font-medium">{ownerName}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {onEdit && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(vehicle)}>
              Editar
            </Button>
          )}
          <Button 
            size="sm" 
            className="flex-1 btn-primary"
            onClick={() => onViewDetails(vehicle)}
          >
            Ver Detalhes
          </Button>
        </div>
      </div>
    </div>
  );
}
