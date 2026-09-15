import { useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TemplateRequirements, ManualFieldRequirement } from "@/utils/templatePlaceholderAnalyzer";
import type { ContractTemplate } from "@/types/contract";
import {
  combineFieldMappings,
  type EntitySelection,
  type ManualFieldValues,
} from "@/utils/contractFieldMappings";
import {
  Building2,
  Building,
  User,
  Car,
  Calendar,
  Percent,
  Edit,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

interface SmartFieldsStepProps {
  template: ContractTemplate | null;
  requirements: TemplateRequirements;
  empresa: any;
  proprietario: any;
  motorista: any;
  veiculo: any;
  manualFieldValues: Record<string, string>;
  onManualFieldChange: (field: string, value: string) => void;
}

interface FieldGroupProps {
  title: string;
  icon: React.ReactNode;
  fields: Array<{ label: string; value: string; key: string }>;
  defaultExpanded?: boolean;
}

function FieldGroup({ title, icon, fields, defaultExpanded = false }: FieldGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const filledCount = fields.filter((f) => f.value).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          <Badge 
            variant={filledCount === fields.length ? "default" : "secondary"} 
            className="text-xs"
          >
            {filledCount}/{fields.length}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="p-3 space-y-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className={cn(
                "p-2 rounded border text-sm",
                field.value
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  {field.label}
                </span>
                {field.value ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <p className="truncate">
                {field.value || (
                  <span className="text-muted-foreground italic">
                    Não preenchido no perfil
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SmartFieldsStep({
  template,
  requirements,
  empresa,
  proprietario,
  motorista,
  veiculo,
  manualFieldValues,
  onManualFieldChange,
}: SmartFieldsStepProps) {
  // Build profile field groups for display (read-only from profiles)
  const empresaFields = useMemo(() => {
    if (!requirements.needsEmpresa || !empresa) return [];
    return [
      { label: "Nome da Empresa", value: empresa.nome_empresa || "", key: "NOME_EMPRESA" },
      { label: "Morada da Empresa", value: buildAddressDisplay(empresa), key: "MORADA_EMPRESA" },
      { label: "NIF da Empresa", value: empresa.nif || "", key: "NIF_EMPRESA" },
      { label: "Nome do Gerente", value: empresa.nome_gerente || "", key: "NOME_GERENTE_EMPRESA" },
      { label: "Capital Social", value: empresa.capital_social ? `€${Number(empresa.capital_social).toFixed(2)}` : "", key: "CAPITAL_SOCIAL_EMPRESA" },
      { label: "Licença TVDE", value: empresa.certificado_tvde || "", key: "LICENCA_TVDE_EMPRESA" },
    ];
  }, [requirements.needsEmpresa, empresa]);

  const proprietarioFields = useMemo(() => {
    if (!requirements.needsProprietario || !proprietario) return [];

    if (proprietario.tipo === "empresa") {
      return [
        { label: "Nome do Proprietário", value: proprietario.nome_empresa || "", key: "NOME_PROPRIETARIO" },
        { label: "NIF do Proprietário", value: proprietario.nif || "", key: "NIF_PROPRIETARIO" },
        { label: "Nome do Gerente", value: proprietario.nome_gerente || "", key: "NOME_GERENTE_PROPRIETARIO" },
        { label: "Morada do Proprietário", value: buildAddressDisplay(proprietario), key: "MORADA_PROPRIETARIO" },
        { label: "Capital Social", value: proprietario.capital_social ? `€${Number(proprietario.capital_social).toFixed(2)}` : "", key: "CAPITAL_SOCIAL_PROPRIETARIO" },
      ];
    } else {
      return [
        { label: "Nome do Proprietário", value: proprietario.nome_completo || "", key: "NOME_PROPRIETARIO" },
        { label: "Tipo de Documento", value: getDocLabel(proprietario.tipo_documento), key: "DOCUMENTO_IDENTIFICACAO_PROPRIETARIO" },
        { label: "Número do Documento", value: proprietario.numero_documento || "", key: "NUMERO_DOCUMENTO_PROPRIETARIO" },
        { label: "Validade do Documento", value: proprietario.documento_valid_until || "", key: "VALIDADE_DOCUMENTO_PROPRIETARIO" },
        { label: "NIF do Proprietário", value: proprietario.nif || "", key: "NIF_PROPRIETARIO" },
        { label: "Morada do Proprietário", value: buildAddressDisplay(proprietario), key: "MORADA_PROPRIETARIO" },
      ];
    }
  }, [requirements.needsProprietario, proprietario]);

  const motoristaFields = useMemo(() => {
    if (!requirements.needsMotorista || !motorista) return [];
    return [
      { label: "Nome do Motorista", value: motorista.nome_completo || "", key: "NOME_MOTORISTA" },
      { label: "NIF do Motorista", value: motorista.nif || "", key: "NIF_MOTORISTA" },
      { label: "Email do Motorista", value: motorista.email || "", key: "EMAIL_MOTORISTA" },
      { label: "Morada do Motorista", value: buildAddressDisplay(motorista), key: "MORADA_MOTORISTA" },
      { label: "Tipo de Documento", value: getDocLabel(motorista.tipo_documento), key: "DOCUMENTO_IDENTIFICACAO_MOTORISTA" },
      { label: "Número do Documento", value: motorista.numero_documento || "", key: "NUMERO_DOCUMENTO_MOTORISTA" },
      { label: "Validade do Documento", value: motorista.documento_valid_until || "", key: "VALIDADE_DOCUMENTO_MOTORISTA" },
      { label: "Licença TVDE", value: motorista.certificado_tvde || "", key: "LICENCA_TVDE_MOTORISTA" },
    ];
  }, [requirements.needsMotorista, motorista]);

  const veiculoFields = useMemo(() => {
    if (!requirements.needsVeiculo || !veiculo) return [];
    return [
      { label: "Matrícula", value: veiculo.matricula || "", key: "MATRICULA" },
      { label: "Marca", value: veiculo.marca || "", key: "MARCA" },
      { label: "Modelo", value: veiculo.modelo || "", key: "MODELO" },
      { label: "Data da Matrícula", value: veiculo.data_matricula || "", key: "DATA_MATRICULA" },
      { label: "Chassi", value: veiculo.chassi || "", key: "CHASSI" },
      { label: "Cilindrada", value: veiculo.cilindrada || "", key: "CILINDRADA" },
      { label: "Potência", value: veiculo.potencia || "", key: "POTENCIA" },
      { label: "Combustível", value: veiculo.combustivel || "", key: "COMBUSTIVEL" },
      { label: "Cor", value: veiculo.cor || "", key: "COR" },
      { label: "Caução do Veículo", value: veiculo.valor_caucao ? `€${Number(veiculo.valor_caucao).toFixed(2)}` : "", key: "CAUCAO_VEICULO" },
      { label: "Aluguel do Veículo", value: veiculo.valor_aluguel ? `€${Number(veiculo.valor_aluguel).toFixed(2)}` : "", key: "ALUGUEL_VEICULO" },
    ];
  }, [requirements.needsVeiculo, veiculo]);

  const hasProfileFields =
    empresaFields.length > 0 ||
    proprietarioFields.length > 0 ||
    motoristaFields.length > 0 ||
    veiculoFields.length > 0;

  const hasManualFields = requirements.manualFields.length > 0;

  // Count filled manual fields
  const filledManualCount = requirements.manualFields.filter(
    (f) => manualFieldValues[f.name]?.trim()
  ).length;

  if (!hasProfileFields && !hasManualFields) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
        <p className="font-medium">Nenhum campo adicional necessário</p>
        <p className="text-sm">Este template não requer campos de preenchimento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Fields Section */}
      {hasProfileFields && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Dados dos Perfis Selecionados
            </h3>
            <Badge variant="outline" className="text-xs">
              Preenchimento automático
            </Badge>
          </div>

          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {empresaFields.length > 0 && (
                <FieldGroup
                  title="Empresa"
                  icon={<Building2 className="w-4 h-4" />}
                  fields={empresaFields}
                />
              )}

              {proprietarioFields.length > 0 && (
                <FieldGroup
                  title={`Proprietário (${proprietario?.tipo === "empresa" ? "Empresa" : "Particular"})`}
                  icon={<Building className="w-4 h-4" />}
                  fields={proprietarioFields}
                />
              )}

              {motoristaFields.length > 0 && (
                <FieldGroup
                  title="Motorista"
                  icon={<User className="w-4 h-4" />}
                  fields={motoristaFields}
                />
              )}

              {veiculoFields.length > 0 && (
                <FieldGroup
                  title="Veículo"
                  icon={<Car className="w-4 h-4" />}
                  fields={veiculoFields}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Manual Fields Section */}
      {hasManualFields && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Campos de Preenchimento Manual
            </h3>
            <Badge 
              variant={filledManualCount === requirements.manualFields.length ? "default" : "secondary"}
            >
              {filledManualCount}/{requirements.manualFields.length} preenchidos
            </Badge>
          </div>

          <div className="border rounded-lg p-4 bg-primary/5 space-y-4">
            {requirements.manualFields.map((field) => (
              <ManualFieldInput
                key={field.id}
                field={field}
                value={manualFieldValues[field.name] || ""}
                onChange={(value) => onManualFieldChange(field.name, value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ManualFieldInputProps {
  field: ManualFieldRequirement;
  value: string;
  onChange: (value: string) => void;
}

function ManualFieldInput({ field, value, onChange }: ManualFieldInputProps) {
  const getIcon = () => {
    if (field.type === "select" && field.options?.some(o => o.includes("%"))) {
      return <Percent className="w-4 h-4" />;
    }
    if (field.type === "date") {
      return <Calendar className="w-4 h-4" />;
    }
    return <Edit className="w-4 h-4" />;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.id} className="flex items-center gap-2">
        {getIcon()}
        {field.label}
        {field.required && (
          <span className="text-destructive" aria-label="obrigatório">*</span>
        )}
      </Label>

      {field.type === "select" && field.options ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={field.id}>
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "date" ? (
        <Input
          id={field.id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={field.id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Digite ${field.label.toLowerCase()}`}
        />
      )}
    </div>
  );
}

// Helper functions
function buildAddressDisplay(entity: any): string {
  const parts = [
    entity.endereco_rua,
    entity.endereco_numero,
    entity.endereco_complemento,
    entity.endereco_cep,
    entity.endereco_cidade,
  ].filter(Boolean);
  return parts.join(", ") || entity.endereco || "";
}

function getDocLabel(tipo: string | null): string {
  switch (tipo) {
    case "passport":
      return "Passaporte";
    case "residencia":
      return "Título de Residência";
    case "cartao_cidadao":
      return "Cartão de Cidadão";
    default:
      return tipo || "";
  }
}
