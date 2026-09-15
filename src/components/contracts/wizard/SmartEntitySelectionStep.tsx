import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { TemplateRequirements, ManualFieldRequirement } from "@/utils/templatePlaceholderAnalyzer";
import {
  Building2,
  Building,
  User,
  Car,
  Check,
  AlertCircle,
  AlertTriangle,
  Calendar,
  FileEdit,
} from "lucide-react";

interface SmartEntitySelectionStepProps {
  requirements: TemplateRequirements;
  empresaId: string;
  onEmpresaChange: (id: string) => void;
  proprietarioId: string;
  onProprietarioChange: (id: string) => void;
  motoristaId: string;
  onMotoristaChange: (id: string) => void;
  veiculoId: string;
  onVeiculoChange: (id: string) => void;
  empresas: any[];
  proprietarios: any[];
  motoristas: any[];
  veiculos: any[];
  empresasLoading?: boolean;
  proprietariosLoading?: boolean;
  motoristasLoading?: boolean;
  veiculosLoading?: boolean;
  manualFieldValues: Record<string, string>;
  onManualFieldChange: (field: string, value: string) => void;
}

interface EntityConfig {
  id: "empresa" | "proprietario" | "motorista" | "veiculo";
  label: string;
  description: string;
  icon: typeof Building2;
  isRequired: boolean;
}

export function SmartEntitySelectionStep({
  requirements,
  empresaId,
  onEmpresaChange,
  proprietarioId,
  onProprietarioChange,
  motoristaId,
  onMotoristaChange,
  veiculoId,
  onVeiculoChange,
  empresas,
  proprietarios,
  motoristas,
  veiculos,
  empresasLoading,
  proprietariosLoading,
  motoristasLoading,
  veiculosLoading,
  manualFieldValues,
  onManualFieldChange,
}: SmartEntitySelectionStepProps) {
  const getProprietarioLabel = (p: any) => {
    return p.tipo === "empresa" ? p.nome_empresa : p.nome_completo;
  };

  const selectedEmpresa = useMemo(
    () => empresas.find((e) => e.id === empresaId),
    [empresas, empresaId]
  );

  const selectedProprietario = useMemo(
    () => proprietarios.find((p) => p.id === proprietarioId),
    [proprietarios, proprietarioId]
  );

  const selectedMotorista = useMemo(
    () => motoristas.find((m) => m.id === motoristaId),
    [motoristas, motoristaId]
  );

  const selectedVeiculo = useMemo(
    () => veiculos.find((v) => v.id === veiculoId),
    [veiculos, veiculoId]
  );

  // Build list of required entities based on template analysis
  const requiredEntities: EntityConfig[] = useMemo(() => {
    const entities: EntityConfig[] = [];

    if (requirements.needsEmpresa) {
      entities.push({
        id: "empresa",
        label: "Empresa",
        description: "Dados da empresa gestora TVDE",
        icon: Building2,
        isRequired: true,
      });
    }

    if (requirements.needsProprietario) {
      entities.push({
        id: "proprietario",
        label: "Proprietário",
        description: "Proprietário do veículo (Particular ou Empresa)",
        icon: Building,
        isRequired: true,
      });
    }

    if (requirements.needsMotorista) {
      entities.push({
        id: "motorista",
        label: "Motorista",
        description: "Condutor do veículo",
        icon: User,
        isRequired: true,
      });
    }

    if (requirements.needsVeiculo) {
      entities.push({
        id: "veiculo",
        label: "Veículo",
        description: "Veículo a ser contratado",
        icon: Car,
        isRequired: true,
      });
    }

    return entities;
  }, [requirements]);

  const getSelectedValue = (entityId: string): string => {
    switch (entityId) {
      case "empresa":
        return empresaId;
      case "proprietario":
        return proprietarioId;
      case "motorista":
        return motoristaId;
      case "veiculo":
        return veiculoId;
      default:
        return "";
    }
  };

  const getCompletionStatus = () => {
    const totalEntities = requiredEntities.length;
    let completedEntities = 0;
    
    if (requirements.needsEmpresa && empresaId) completedEntities++;
    if (requirements.needsProprietario && proprietarioId) completedEntities++;
    if (requirements.needsMotorista && motoristaId) completedEntities++;
    if (requirements.needsVeiculo && veiculoId) completedEntities++;

    const requiredManualFields = requirements.manualFields.filter(f => f.required);
    const completedManualFields = requiredManualFields.filter(
      (f) => {
        const raw = manualFieldValues[f.name];
        return typeof raw === "string" && raw.trim().length > 0;
      }
    ).length;

    return { 
      completedEntities, 
      totalEntities,
      completedManualFields,
      totalManualFields: requiredManualFields.length,
      total: totalEntities + requiredManualFields.length,
      completed: completedEntities + completedManualFields
    };
  };

  const status = getCompletionStatus();

  const renderManualField = (field: ManualFieldRequirement) => {
    const raw = manualFieldValues[field.name];
    const value = typeof raw === "string" ? raw : "";
    const isFilled = value.trim().length > 0;

    if (field.type === "select" && field.options) {
      return (
        <Select
          value={value}
          onValueChange={(val) => onManualFieldChange(field.name, val)}
        >
          <SelectTrigger className={cn(!isFilled && field.required && "border-yellow-500")}>
            <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "date") {
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onManualFieldChange(field.name, e.target.value)}
          className={cn(!isFilled && field.required && "border-yellow-500")}
        />
      );
    }

    return (
      <Input
        type="text"
        value={value}
        onChange={(e) => onManualFieldChange(field.name, e.target.value)}
        placeholder={`Digite ${field.label.toLowerCase()}`}
        className={cn(!isFilled && field.required && "border-yellow-500")}
      />
    );
  };

  if (requiredEntities.length === 0 && requirements.manualFields.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <p className="font-medium text-lg">Template sem campos detectados</p>
        <p className="text-muted-foreground">
          Este template não requer nenhum perfil para preenchimento automático.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Progresso</p>
          <Badge variant={status.completed === status.total ? "default" : "secondary"}>
            {status.completed}/{status.total} campos
          </Badge>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              status.completed === status.total ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${(status.completed / status.total) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Preencha todos os campos obrigatórios para continuar.
        </p>
      </div>

      <ScrollArea className="h-[450px] pr-4">
        <div className="space-y-6">
          {/* Profile Selection Section */}
          {requiredEntities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Perfis Necessários ({status.completedEntities}/{status.totalEntities})</span>
              </div>

              {requiredEntities.map((entity) => {
                const Icon = entity.icon;
                const selectedValue = getSelectedValue(entity.id);
                const isComplete = !!selectedValue;

                return (
                  <div
                    key={entity.id}
                    className={cn(
                      "border rounded-lg transition-all p-4",
                      isComplete
                        ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          isComplete
                            ? "bg-green-500 text-white"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {isComplete ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{entity.label}</h4>
                          <Badge variant="outline" className="text-xs">
                            Obrigatório
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entity.description}
                        </p>
                      </div>
                    </div>

                    {/* Entity Selection */}
                    <div className="space-y-2">
                      {entity.id === "empresa" && (
                        <>
                          {empresasLoading ? (
                            <Skeleton className="h-10 w-full" />
                          ) : (
                            <Select value={empresaId} onValueChange={onEmpresaChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma empresa" />
                              </SelectTrigger>
                              <SelectContent>
                                {empresas.map((e) => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {e.nome_empresa}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {empresaId && selectedEmpresa && (
                            <p className="text-xs text-muted-foreground">
                              NIF: {selectedEmpresa.nif || "Não informado"}
                              {selectedEmpresa.nome_gerente &&
                                ` • Gerente: ${selectedEmpresa.nome_gerente}`}
                            </p>
                          )}
                        </>
                      )}

                      {entity.id === "proprietario" && (
                        <>
                          {proprietariosLoading ? (
                            <Skeleton className="h-10 w-full" />
                          ) : (
                            <Select
                              value={proprietarioId}
                              onValueChange={onProprietarioChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um proprietário" />
                              </SelectTrigger>
                              <SelectContent>
                                {proprietarios.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    <div className="flex items-center gap-2">
                                      {getProprietarioLabel(p)}
                                      <Badge variant="outline" className="text-xs">
                                        {p.tipo === "empresa" ? "Empresa" : "Particular"}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {proprietarioId && selectedProprietario && (
                            <p className="text-xs text-muted-foreground">
                              NIF: {selectedProprietario.nif || "Não informado"} •
                              Tipo: {selectedProprietario.tipo === "empresa" ? "Empresa" : "Particular"}
                            </p>
                          )}
                        </>
                      )}

                      {entity.id === "motorista" && (
                        <>
                          {motoristasLoading ? (
                            <Skeleton className="h-10 w-full" />
                          ) : (
                            <Select
                              value={motoristaId}
                              onValueChange={onMotoristaChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um motorista" />
                              </SelectTrigger>
                              <SelectContent>
                                {motoristas.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.nome_completo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {motoristaId && selectedMotorista && (
                            <p className="text-xs text-muted-foreground">
                              NIF: {selectedMotorista.nif || "Não informado"}
                            </p>
                          )}
                        </>
                      )}

                      {entity.id === "veiculo" && (
                        <>
                          {veiculosLoading ? (
                            <Skeleton className="h-10 w-full" />
                          ) : (
                            <Select value={veiculoId} onValueChange={onVeiculoChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um veículo" />
                              </SelectTrigger>
                              <SelectContent>
                                {veiculos.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    <span className="font-mono">{v.matricula}</span>
                                    <span className="ml-2 text-muted-foreground">
                                      {v.marca} {v.modelo}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {veiculoId && selectedVeiculo && (
                            <p className="text-xs text-muted-foreground">
                              {selectedVeiculo.cor} • {selectedVeiculo.combustivel}
                            </p>
                          )}
                        </>
                      )}

                      {/* Validation warning */}
                      {!selectedValue && (
                        <div className="flex items-center gap-2 text-yellow-600 text-sm mt-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>Selecione um perfil para continuar</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Manual Fields Section */}
          {requirements.manualFields.length > 0 && (
            <>
              {requiredEntities.length > 0 && <Separator className="my-4" />}
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileEdit className="w-4 h-4" />
                  <span>Campos de Preenchimento Manual</span>
                </div>

                <div className="p-4 border rounded-lg bg-primary/5 space-y-4">
                  {requirements.manualFields.map((field) => {
                    const raw = manualFieldValues[field.name];
                    const value = typeof raw === "string" ? raw : "";
                    const isFilled = value.trim().length > 0;

                    return (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={field.id} className="text-sm font-medium">
                            {field.label}
                          </Label>
                          {field.required ? (
                            <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Opcional</Badge>
                          )}
                          {isFilled && (
                            <Check className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                        </div>
                        {renderManualField(field)}
                        {!isFilled && field.required && (
                          <p className="text-xs text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Campo obrigatório
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
