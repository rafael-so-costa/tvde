import { Mail, Phone, MapPin, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/common/ActionMenu";
import { Motorista } from "@/hooks/useMotoristas";
import { cn } from "@/lib/utils";

const documentTypeLabels: Record<string, string> = {
  passaporte: "Passaporte",
  titulo_residencia: "Título de Residência",
  cartao_cidadao: "Cartão de Cidadão",
};

interface DriverCardProps {
  driver: Motorista;
  onView: (driver: Motorista) => void;
  onEdit: (driver: Motorista) => void;
  onToggleActive: (driver: Motorista) => void;
  onDelete: (driver: Motorista) => void;
  viewMode?: "grid" | "list" | "icons";
}

export function DriverCard({ 
  driver, 
  onView, 
  onEdit, 
  onToggleActive, 
  onDelete,
  viewMode = "grid"
}: DriverCardProps) {
  const isActive = driver.ativo;
  const isDocumentExpiringSoon = driver.documento_valid_until 
    ? new Date(driver.documento_valid_until) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    : false;

  const getStatusBadge = () => {
    if (!isActive) return "badge-destructive";
    if (driver.status_cadastro === "pendente") return "badge-warning";
    return "badge-success";
  };

  const getStatusLabel = () => {
    if (!isActive) return "Inativo";
    if (driver.status_cadastro === "pendente") return "Pendente";
    return "Ativo";
  };

  const getInitials = () => {
    return driver.nome_completo
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Icons view
  if (viewMode === "icons") {
    return (
      <div 
        className="card-elevated p-4 text-center cursor-pointer hover:shadow-lg transition-all"
        onClick={() => onView(driver)}
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-bold text-lg mb-2 overflow-hidden">
          {driver.foto_perfil_url ? (
            <img src={driver.foto_perfil_url} alt={driver.nome_completo} className="w-full h-full object-cover" />
          ) : (
            getInitials()
          )}
        </div>
        <p className="font-medium text-sm truncate">{driver.nome_completo}</p>
        <span className={cn("text-xs", getStatusBadge())}>{getStatusLabel()}</span>
      </div>
    );
  }

  // List view
  if (viewMode === "list") {
    return (
      <div className="card-elevated p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-accent flex-shrink-0 flex items-center justify-center text-accent-foreground font-bold overflow-hidden">
          {driver.foto_perfil_url ? (
            <img src={driver.foto_perfil_url} alt={driver.nome_completo} className="w-full h-full object-cover" />
          ) : (
            getInitials()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{driver.nome_completo}</h3>
            <span className={getStatusBadge()}>{getStatusLabel()}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {driver.tipo_documento ? documentTypeLabels[driver.tipo_documento] : "Sem documento"} • {driver.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(driver)}>
            Ver Perfil
          </Button>
          <ActionMenu
            onView={() => onView(driver)}
            onEdit={() => onEdit(driver)}
            onToggleActive={() => onToggleActive(driver)}
            onDelete={() => onDelete(driver)}
            isActive={isActive}
          />
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-bold text-lg overflow-hidden">
            {driver.foto_perfil_url ? (
              <img src={driver.foto_perfil_url} alt={driver.nome_completo} className="w-full h-full object-cover" />
            ) : (
              getInitials()
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{driver.nome_completo}</h3>
            <p className="text-sm text-muted-foreground">
              {driver.tipo_documento ? documentTypeLabels[driver.tipo_documento] : "Sem documento"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={getStatusBadge()}>{getStatusLabel()}</span>
          <ActionMenu
            onView={() => onView(driver)}
            onEdit={() => onEdit(driver)}
            onToggleActive={() => onToggleActive(driver)}
            onDelete={() => onDelete(driver)}
            isActive={isActive}
          />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {driver.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{driver.email}</span>
          </div>
        )}
        {driver.telemovel && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{driver.telemovel}</span>
          </div>
        )}
        {driver.endereco && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{driver.endereco}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">NIF</p>
          <p className="font-medium">{driver.nif || "-"}</p>
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          isDocumentExpiringSoon ? "bg-warning/10" : "bg-muted"
        )}>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Validade Doc.
          </p>
          <p className={cn(
            "font-medium",
            isDocumentExpiringSoon && "text-warning"
          )}>
            {driver.documento_valid_until 
              ? new Date(driver.documento_valid_until).toLocaleDateString("pt-PT")
              : "-"
            }
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Contratos:</span>
          <span className="font-bold">0</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => onView(driver)}>
          Ver Perfil
        </Button>
      </div>
    </div>
  );
}
