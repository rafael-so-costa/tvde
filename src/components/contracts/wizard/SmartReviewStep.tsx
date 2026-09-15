import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateRequirements } from "@/utils/templatePlaceholderAnalyzer";
import type { ContractTemplate } from "@/types/contract";
import { createPlaceholderAliases, renderContractSegments, type ContractSegment } from "@/hooks/useContractFullData";
import { useResolvedSignatures } from "@/hooks/useResolvedSignatures";
import {
  combineFieldMappings,
  mapEmpresaFields,
  mapProprietarioFields,
  mapMotoristaFields,
  mapVeiculoFields,
} from "@/utils/contractFieldMappings";
import {
  FileText,
  Building2,
  Building,
  User,
  Car,
  Calendar,
  Check,
  Eye,
  AlertCircle,
} from "lucide-react";

interface SmartReviewStepProps {
  template: ContractTemplate | null;
  requirements: TemplateRequirements;
  empresa: any;
  proprietario: any;
  motorista: any;
  veiculo: any;
  manualFieldValues: Record<string, string>;
  signatures?: Record<string, string>;
}

export function SmartReviewStep({
  template,
  requirements,
  empresa,
  proprietario,
  motorista,
  veiculo,
  manualFieldValues,
  signatures,
}: SmartReviewStepProps) {
  // Build all field values from selected profiles
  const allFieldValues = useMemo(() => {
    let mappings: Record<string, string> = {};

    if (requirements.needsEmpresa && empresa) {
      mappings = { ...mappings, ...mapEmpresaFields(empresa) };
    }

    if (requirements.needsProprietario && proprietario) {
      mappings = { ...mappings, ...mapProprietarioFields(proprietario) };
    }

    if (requirements.needsMotorista && motorista) {
      mappings = { ...mappings, ...mapMotoristaFields(motorista) };
    }

    if (requirements.needsVeiculo && veiculo) {
      mappings = { ...mappings, ...mapVeiculoFields(veiculo) };
    }

    // Add manual field values with proper placeholder names
    for (const field of requirements.manualFields) {
      if (manualFieldValues[field.name]) {
        mappings[field.placeholder] = manualFieldValues[field.name];
        // Also add normalized version
        mappings[field.name.toUpperCase()] = manualFieldValues[field.name];
      }
    }

    return mappings;
  }, [requirements, empresa, proprietario, motorista, veiculo, manualFieldValues]);

  const resolvedSignatures = useResolvedSignatures(signatures || {});

  // Render the contract content with placeholders replaced — using the same
  // segment renderer used by the Assinaturas tab and the PDF export so that
  // every preview shows the exact final document (no raw HTML, no entities).
  const segments = useMemo<ContractSegment[]>(() => {
    if (!template?.conteudo_original) return [];
    const aliases = createPlaceholderAliases(allFieldValues);
    return renderContractSegments(template.conteudo_original, aliases, resolvedSignatures);
  }, [template, allFieldValues, resolvedSignatures]);

  const filledFieldsCount = Object.values(allFieldValues).filter((v) => {
    if (v === null || v === undefined) return false;
    const asString = typeof v === "string" ? v : String(v);
    return asString.trim().length > 0;
  }).length;

  // Get selected entities for summary display
  const getProprietarioLabel = () => {
    if (!proprietario) return "";
    return proprietario.tipo === "empresa"
      ? proprietario.nome_empresa
      : proprietario.nome_completo;
  };

  return (
    <div className="space-y-4">
      {/* Notice */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Eye className="w-5 h-5" />
          <span className="font-medium">Pré-visualização obrigatória do contrato</span>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
          Leia o contrato completo abaixo, exatamente como ficará no PDF. Só depois avance para a assinatura.
        </p>
      </div>

      {/* Full contract preview — primary focus */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" />
            {template?.nome || "Contrato"}
          </h4>
          <span className="text-xs text-muted-foreground">
            {filledFieldsCount} campos preenchidos
          </span>
        </div>
        <ScrollArea className="h-[60vh]">
          {segments.length > 0 ? (
            <article
              className="contract-final-document p-8 mx-auto max-w-[800px] text-black bg-white whitespace-pre-wrap break-words"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "11pt",
                lineHeight: 1.6,
              }}
            >
              {segments.map((seg, i) =>
                seg.type === "image" ? (
                  <img
                    key={i}
                    src={seg.src}
                    alt={seg.alt || "Assinatura"}
                    className="inline-block align-middle my-2"
                    style={{ maxHeight: 80 }}
                  />
                ) : (
                  <span key={i}>{seg.value}</span>
                ),
              )}
            </article>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Pré-visualização não disponível</p>
              <p className="text-sm">O template não possui conteúdo para visualização.</p>
            </div>
          )}
        </ScrollArea>
        <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500" />
            Campos preenchidos
          </span>
          <span className="mx-2">•</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500" />
            Campos não preenchidos
          </span>
        </div>
      </div>

      {/* Compact summary below the preview */}
      <details className="border rounded-lg bg-muted/20">
        <summary className="cursor-pointer px-4 py-3 font-medium text-sm">
          Resumo dos dados utilizados
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2">
            {requirements.needsEmpresa && empresa && (
              <div className="flex items-center gap-2 p-2 bg-background rounded">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{empresa.nome_empresa}</span>
                <Badge variant="outline" className="text-xs ml-auto">Empresa</Badge>
              </div>
            )}
            {requirements.needsProprietario && proprietario && (
              <div className="flex items-center gap-2 p-2 bg-background rounded">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{getProprietarioLabel()}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {proprietario.tipo === "empresa" ? "Proprietário Empresa" : "Proprietário Particular"}
                </Badge>
              </div>
            )}
            {requirements.needsMotorista && motorista && (
              <div className="flex items-center gap-2 p-2 bg-background rounded">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{motorista.nome_completo}</span>
                <Badge variant="outline" className="text-xs ml-auto">Motorista</Badge>
              </div>
            )}
            {requirements.needsVeiculo && veiculo && (
              <div className="flex items-center gap-2 p-2 bg-background rounded">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium font-mono">{veiculo.matricula}</span>
                <span className="text-sm text-muted-foreground">
                  {veiculo.marca} {veiculo.modelo}
                </span>
                <Badge variant="outline" className="text-xs ml-auto">Veículo</Badge>
              </div>
            )}
          </div>

          {requirements.manualFields.length > 0 && (
            <div className="pt-2 border-t">
              <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Campos Manuais
              </h5>
              <div className="space-y-1 text-sm">
                {requirements.manualFields.map((field) => {
                  const value = manualFieldValues[field.name];
                  return (
                    <div key={field.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{field.label}:</span>
                      {value ? (
                        <span className="font-medium">{value}</span>
                      ) : (
                        <span className="text-yellow-600 italic flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Não preenchido
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
