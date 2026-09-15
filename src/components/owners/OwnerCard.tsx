import { Building2, User, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/common/ActionMenu";
import { Proprietario } from "@/hooks/useProprietarios";
import { cn } from "@/lib/utils";

interface OwnerCardProps {
  owner: Proprietario;
  onView: (owner: Proprietario) => void;
  onEdit: (owner: Proprietario) => void;
  onToggleActive: (owner: Proprietario) => void;
  onDelete: (owner: Proprietario) => void;
  viewMode?: "grid" | "list" | "icons";
}

export function OwnerCard({ 
  owner, 
  onView, 
  onEdit, 
  onToggleActive, 
  onDelete,
  viewMode = "grid"
}: OwnerCardProps) {
  const isCompany = owner.tipo === "empresa";
  const isActive = owner.ativo;
  const name = isCompany ? owner.nome_empresa : owner.nome_completo;

  const getStatusBadge = () => {
    if (!isActive) return "badge-destructive";
    if (owner.status_cadastro === "pendente") return "badge-warning";
    return "badge-success";
  };

  const getStatusLabel = () => {
    if (!isActive) return "Inativo";
    if (owner.status_cadastro === "pendente") return "Pendente";
    return "Ativo";
  };

  // Icons view - compact
  if (viewMode === "icons") {
    return (
      <div 
        className="card-elevated p-4 text-center cursor-pointer hover:shadow-lg transition-all"
        onClick={() => onView(owner)}
      >
        <div className={cn(
          "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 overflow-hidden",
          isCompany ? "bg-primary/10" : "bg-accent/10"
        )}>
          {owner.foto_perfil_url ? (
            <img src={owner.foto_perfil_url} alt={name || ""} className="w-full h-full object-cover" />
          ) : isCompany ? (
            <Building2 className="w-8 h-8 text-primary" />
          ) : (
            <User className="w-8 h-8 text-accent" />
          )}
        </div>
        <p className="font-medium text-sm truncate">{name}</p>
        <span className={cn("text-xs", getStatusBadge())}>{getStatusLabel()}</span>
      </div>
    );
  }

  // List view - horizontal
  if (viewMode === "list") {
    return (
      <div className="card-elevated p-4 flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden",
          isCompany ? "bg-primary/10" : "bg-accent/10"
        )}>
          {owner.foto_perfil_url ? (
            <img src={owner.foto_perfil_url} alt={name || ""} className="w-full h-full object-cover" />
          ) : isCompany ? (
            <Building2 className="w-6 h-6 text-primary" />
          ) : (
            <User className="w-6 h-6 text-accent" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{name}</h3>
            <span className={getStatusBadge()}>{getStatusLabel()}</span>
          </div>
          <p className="text-sm text-muted-foreground">NIF: {owner.nif} • {owner.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(owner)}>
            Ver Detalhes
          </Button>
          <ActionMenu
            onView={() => onView(owner)}
            onEdit={() => onEdit(owner)}
            onToggleActive={() => onToggleActive(owner)}
            onDelete={() => onDelete(owner)}
            isActive={isActive}
          />
        </div>
      </div>
    );
  }

  // Grid view - default
  return (
    <div className="card-elevated p-6 hover:shadow-lg transition-all animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden",
              isCompany ? "bg-primary/10" : "bg-accent/10"
            )}
          >
            {owner.foto_perfil_url ? (
              <img src={owner.foto_perfil_url} alt={name || ""} className="w-full h-full object-cover" />
            ) : isCompany ? (
              <Building2 className="w-7 h-7 text-primary" />
            ) : (
              <User className="w-7 h-7 text-accent" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm text-muted-foreground">NIF: {owner.nif}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={getStatusBadge()}>{getStatusLabel()}</span>
          <ActionMenu
            onView={() => onView(owner)}
            onEdit={() => onEdit(owner)}
            onToggleActive={() => onToggleActive(owner)}
            onDelete={() => onDelete(owner)}
            isActive={isActive}
          />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {owner.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{owner.email}</span>
          </div>
        )}
        {owner.telemovel && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{owner.telemovel}</span>
          </div>
        )}
        {owner.endereco && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{owner.endereco}</span>
          </div>
        )}
      </div>

      {isCompany && owner.nome_gerente && (
        <div className="border-t pt-4 mt-4">
          <p className="text-sm">
            <span className="text-muted-foreground">Gerente:</span>{" "}
            <span className="font-medium">{owner.nome_gerente}</span>
          </p>
          {owner.capital_social && (
            <p className="text-sm">
              <span className="text-muted-foreground">Capital Social:</span>{" "}
              <span className="font-medium">{owner.capital_social}€</span>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-end mt-4 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={() => onView(owner)}>
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
}
