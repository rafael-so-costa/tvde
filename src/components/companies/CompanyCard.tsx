import { Building2, Mail, Phone, MapPin, FileText, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/common/ActionMenu";
import { Empresa } from "@/hooks/useEmpresas";
import { cn } from "@/lib/utils";

interface CompanyCardProps {
  company: Empresa;
  onView: (company: Empresa) => void;
  onEdit: (company: Empresa) => void;
  onToggleActive: (company: Empresa) => void;
  onDelete: (company: Empresa) => void;
  viewMode?: "grid" | "list" | "icons";
}

export function CompanyCard({ 
  company, 
  onView, 
  onEdit, 
  onToggleActive, 
  onDelete,
  viewMode = "grid"
}: CompanyCardProps) {
  const isActive = company.ativo;

  const getStatusBadge = () => {
    if (!isActive) return "badge-destructive";
    if (company.status_cadastro === "incompleto") return "badge-warning";
    return "badge-success";
  };

  const getStatusLabel = () => {
    if (!isActive) return "Inativo";
    if (company.status_cadastro === "incompleto") return "Incompleto";
    return "Ativo";
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getFullAddress = () => {
    const parts = [
      company.endereco_rua,
      company.endereco_numero,
      company.endereco_complemento,
      company.endereco_cep,
      company.endereco_cidade,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  // Icons view - compact
  if (viewMode === "icons") {
    return (
      <div 
        className="card-elevated p-4 text-center cursor-pointer hover:shadow-lg transition-all"
        onClick={() => onView(company)}
      >
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 overflow-hidden bg-primary/10">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.nome_empresa} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-8 h-8 text-primary" />
          )}
        </div>
        <p className="font-medium text-sm truncate">{company.nome_empresa}</p>
        <span className={cn("text-xs", getStatusBadge())}>{getStatusLabel()}</span>
      </div>
    );
  }

  // List view - horizontal
  if (viewMode === "list") {
    return (
      <div className="card-elevated p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-primary/10">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.nome_empresa} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{company.nome_empresa}</h3>
            <span className={getStatusBadge()}>{getStatusLabel()}</span>
          </div>
          <p className="text-sm text-muted-foreground">NIF: {company.nif} • {company.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(company)}>
            Ver Detalhes
          </Button>
          <ActionMenu
            onView={() => onView(company)}
            onEdit={() => onEdit(company)}
            onToggleActive={() => onToggleActive(company)}
            onDelete={() => onDelete(company)}
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
          <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden bg-primary/10">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.nome_empresa} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-7 h-7 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{company.nome_empresa}</h3>
            <p className="text-sm text-muted-foreground">NIF: {company.nif}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={getStatusBadge()}>{getStatusLabel()}</span>
          <ActionMenu
            onView={() => onView(company)}
            onEdit={() => onEdit(company)}
            onToggleActive={() => onToggleActive(company)}
            onDelete={() => onDelete(company)}
            isActive={isActive}
          />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {company.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{company.email}</span>
          </div>
        )}
        {company.telemovel && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{company.telemovel}</span>
          </div>
        )}
        {getFullAddress() && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{getFullAddress()}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-4 mt-4 space-y-2">
        {company.nome_gerente && (
          <p className="text-sm">
            <span className="text-muted-foreground">Gerente:</span>{" "}
            <span className="font-medium">{company.nome_gerente}</span>
          </p>
        )}
        {company.capital_social && (
          <p className="text-sm flex items-center gap-1">
            <Banknote className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Capital Social:</span>{" "}
            <span className="font-medium">{formatCurrency(Number(company.capital_social))}</span>
          </p>
        )}
        {company.certificado_tvde && (
          <p className="text-sm flex items-center gap-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Licença TVDE:</span>{" "}
            <span className="font-medium">{company.certificado_tvde}</span>
          </p>
        )}
      </div>

      <div className="flex items-center justify-end mt-4 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={() => onView(company)}>
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
}
