import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContratos } from "@/hooks/useContratos";
import { useMotoristas } from "@/hooks/useMotoristas";
import { useProprietarios } from "@/hooks/useProprietarios";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useTenant } from "@/contexts/TenantContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { WizardStepIndicator } from "./wizard/WizardStepIndicator";
import { SmartEntitySelectionStep } from "./wizard/SmartEntitySelectionStep";
import { SmartReviewStep } from "./wizard/SmartReviewStep";
import { SignaturesStep } from "./wizard/SignaturesStep";
import { TemplateSkeleton } from "./wizard/WizardSkeleton";
import {
  detectSignatureFields,
  SIGNATURE_FIELDS,
  type SignatureFieldDef,
} from "@/utils/contractSignatures";
import type { ContractTemplate } from "@/types/contract";
import {
  mapEmpresaFields,
  mapProprietarioFields,
  mapMotoristaFields,
  mapVeiculoFields,
} from "@/utils/contractFieldMappings";
import {
  groupTemplates,
  selectTemplateVariant,
  getOwnerType,
  type GroupedTemplate,
} from "@/utils/templateGrouping";
import {
  analyzeTemplateRequirements,
  hasAnyRequirements,
  type TemplateRequirements,
} from "@/utils/templatePlaceholderAnalyzer";
import {
  FileText,
  ClipboardList,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RemoteSignatureTarget } from "./wizard/SignaturesStep";

interface ContractWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ContractTemplate[];
  onSuccess?: (contrato?: any) => void;
  templatesLoading?: boolean;
  /** When true, do NOT navigate to /contracts after creation (used by embedded flows like Aluguer) */
  skipNavigateOnSuccess?: boolean;
  /** Force a specific contract type instead of the default "aluguer" */
  forcedTipo?: "aluguer" | "prestacao_servico";
}

type WizardStep = "template" | "entities" | "signatures" | "review";

type WizardStepDef = { id: WizardStep; label: string; icon: JSX.Element };

const normalizeEmail = (email?: string | null) => (email || "").trim().toLowerCase();

const baseStepConfig: WizardStepDef[] = [
  { id: "template", label: "Template", icon: <FileText className="w-4 h-4" /> },
  { id: "entities", label: "Identificação", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "review", label: "Revisão", icon: <Check className="w-4 h-4" /> },
];
const signatureStep: WizardStepDef = {
  id: "signatures",
  label: "Assinaturas",
  icon: <PenLine className="w-4 h-4" />,
};

export function ContractWizardDialog({
  open,
  onOpenChange,
  templates,
  onSuccess,
  templatesLoading,
  skipNavigateOnSuccess,
  forcedTipo,
}: ContractWizardDialogProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>("template");
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);
  const [selectedTemplateGroup, setSelectedTemplateGroup] = useState<GroupedTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [manualFieldValues, setManualFieldValues] = useState<Record<string, string>>({});
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [remoteRequested, setRemoteRequested] = useState<Record<string, boolean>>({});
  const [isSubmittingContract, setIsSubmittingContract] = useState(false);
  const [formData, setFormData] = useState({
    empresa_id: "",
    proprietario_id: "",
    motorista_id: "",
    veiculo_id: "",
  });

  const { tenant } = useTenant();
  const { user } = useAuth();
  const { createContrato } = useContratos();
  const { data: empresas = [], isLoading: empresasLoading } = useEmpresas();
  const { data: motoristas = [], isLoading: motoristasLoading } = useMotoristas();
  const { data: proprietarios = [], isLoading: proprietariosLoading } = useProprietarios();
  const { data: veiculos = [], isLoading: veiculosLoading } = useVeiculos();

  // Filter only active empresas
  const activeEmpresas = useMemo(
    () => empresas.filter((e) => e.ativo),
    [empresas]
  );

  // Get selected entities
  const selectedEmpresa = useMemo(
    () => empresas.find((e) => e.id === formData.empresa_id),
    [empresas, formData.empresa_id]
  );

  const selectedProprietario = useMemo(
    () => proprietarios.find((p) => p.id === formData.proprietario_id),
    [proprietarios, formData.proprietario_id]
  );

  const selectedMotorista = useMemo(
    () => motoristas.find((m) => m.id === formData.motorista_id),
    [motoristas, formData.motorista_id]
  );

  const selectedVeiculo = useMemo(
    () => veiculos.find((v) => v.id === formData.veiculo_id),
    [veiculos, formData.veiculo_id]
  );

  // Group templates for simplified display
  const groupedTemplates = useMemo(() => groupTemplates(templates), [templates]);

  // Analyze template requirements
  const templateRequirements = useMemo<TemplateRequirements>(() => {
    return analyzeTemplateRequirements(selectedTemplate);
  }, [selectedTemplate]);

  // Detect signature placeholders present in the selected template
  const requiredSignatures = useMemo<SignatureFieldDef[]>(() => {
    const byPlaceholder = new Map<string, SignatureFieldDef>();
    detectSignatureFields(selectedTemplate?.conteudo_original || "").forEach((field) => {
      byPlaceholder.set(field.placeholder, field);
    });

    const addRequiredProfileSignature = (placeholder: string) => {
      const field = SIGNATURE_FIELDS.find((item) => item.placeholder === placeholder);
      if (field) byPlaceholder.set(field.placeholder, field);
    };

    if (templateRequirements.needsEmpresa) addRequiredProfileSignature("ASSINATURA_EMPRESA");
    if (templateRequirements.needsProprietario) addRequiredProfileSignature("ASSINATURA_PROPRIETARIO");
    if (templateRequirements.needsMotorista) addRequiredProfileSignature("ASSINATURA_MOTORISTA");

    return SIGNATURE_FIELDS.filter((field) => byPlaceholder.has(field.placeholder));
  }, [selectedTemplate, templateRequirements]);

  // Map signature placeholder -> entidade alvo (nome+email)
  const remoteTargets = useMemo<Record<string, RemoteSignatureTarget | undefined>>(() => {
    const m: Record<string, RemoteSignatureTarget | undefined> = {};
    if (selectedMotorista) {
      m["ASSINATURA_MOTORISTA"] = {
        nome: selectedMotorista.nome_completo,
        email: normalizeEmail((selectedMotorista as any).email),
        signatario_user_id: (selectedMotorista as any).user_id || null,
        signatario_tipo: "motorista",
        signatario_id: selectedMotorista.id,
      };
    }
    if (selectedProprietario) {
      m["ASSINATURA_PROPRIETARIO"] = {
        nome:
          (selectedProprietario as any).nome_empresa ||
          (selectedProprietario as any).nome_completo ||
          "Proprietário",
        email: normalizeEmail((selectedProprietario as any).email),
        signatario_user_id: (selectedProprietario as any).user_id || null,
        signatario_tipo: "proprietario",
        signatario_id: selectedProprietario.id,
      };
    }
    if (selectedEmpresa) {
      m["ASSINATURA_EMPRESA"] = {
        nome: (selectedEmpresa as any).nome_empresa || "Empresa",
        email: normalizeEmail((selectedEmpresa as any).email),
        signatario_user_id: null,
        signatario_tipo: "empresa",
        signatario_id: selectedEmpresa.id,
      };
    }
    return m;
  }, [selectedMotorista, selectedProprietario, selectedEmpresa]);

  // Build a dynamic step list. Signatures, when required, MUST come AFTER review
  // so the user reads the fully rendered contract before signing.
  const stepConfig = useMemo(() => {
    if (requiredSignatures.length === 0) return baseStepConfig;
    return [...baseStepConfig, signatureStep];
  }, [requiredSignatures]);

  const isLastStep = currentStep === stepConfig[stepConfig.length - 1].id;

  // Auto-update selected template when owner type changes
  useEffect(() => {
    if (selectedTemplateGroup && selectedProprietario) {
      const ownerType = getOwnerType(selectedProprietario);
      const correctTemplate = selectTemplateVariant(selectedTemplateGroup, ownerType);
      if (correctTemplate.id !== selectedTemplate?.id) {
        setSelectedTemplate(correctTemplate);
      }
    }
  }, [selectedTemplateGroup, selectedProprietario, selectedTemplate?.id]);

  // Track unsaved changes
  const hasChanges = Boolean(
    selectedTemplate ||
    formData.empresa_id ||
    formData.proprietario_id ||
    formData.motorista_id ||
    formData.veiculo_id ||
    Object.values(manualFieldValues).some((v) => typeof v === "string" && v.trim().length > 0)
  );

  const { confirmNavigation, markSaved } = useUnsavedChanges(hasChanges);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      resetWizard();
    }
  }, [open]);

  const resetWizard = () => {
    setCurrentStep("template");
    setCompletedSteps([]);
    setSelectedTemplateGroup(null);
    setSelectedTemplate(null);
    setManualFieldValues({});
    setSignatures({});
    setRemoteRequested({});
    setIsSubmittingContract(false);
    setFormData({
      empresa_id: "",
      proprietario_id: "",
      motorista_id: "",
      veiculo_id: "",
    });
  };

  const handleClose = () => {
    if (hasChanges) {
      confirmNavigation(() => {
        onOpenChange(false);
      });
    } else {
      onOpenChange(false);
    }
  };

  const handleTemplateGroupSelect = (group: GroupedTemplate) => {
    setSelectedTemplateGroup(group);
    // Select the appropriate variant based on current owner type
    const ownerType = getOwnerType(selectedProprietario);
    const template = selectTemplateVariant(group, ownerType);
    setSelectedTemplate(template);
  };

  const handleManualFieldChange = (field: string, value: string) => {
    setManualFieldValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    const stepIndex = stepConfig.findIndex((s) => s.id === currentStep);

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }

    if (stepIndex < stepConfig.length - 1) {
      setCurrentStep(stepConfig[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    const stepIndex = stepConfig.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(stepConfig[stepIndex - 1].id);
    }
  };

  const handleSubmit = async (overrides?: {
    signatures?: Record<string, string>;
    remoteRequested?: Record<string, boolean>;
  }) => {
    const activeSignatures = overrides?.signatures ?? signatures;
    const activeRemoteRequested = overrides?.remoteRequested ?? remoteRequested;

    if (
      requiredSignatures.length > 0 &&
      !requiredSignatures.every((field) => activeSignatures[field.placeholder] || activeRemoteRequested[field.placeholder])
    ) {
      toast.error("Todas as assinaturas devem ser presenciais ou solicitadas remotamente.");
      return;
    }

    setIsSubmittingContract(true);
    try {
      // Build all field values
      let allFieldValues: Record<string, string> = {};

      if (templateRequirements.needsEmpresa && selectedEmpresa) {
        allFieldValues = { ...allFieldValues, ...mapEmpresaFields(selectedEmpresa) };
      }

      if (templateRequirements.needsProprietario && selectedProprietario) {
        allFieldValues = { ...allFieldValues, ...mapProprietarioFields(selectedProprietario) };
      }

      if (templateRequirements.needsMotorista && selectedMotorista) {
        allFieldValues = { ...allFieldValues, ...mapMotoristaFields(selectedMotorista) };
      }

      if (templateRequirements.needsVeiculo && selectedVeiculo) {
        allFieldValues = { ...allFieldValues, ...mapVeiculoFields(selectedVeiculo) };
      }

      // Add manual field values
      for (const field of templateRequirements.manualFields) {
        if (manualFieldValues[field.name]) {
          allFieldValues[field.placeholder] = manualFieldValues[field.name];
          allFieldValues[field.name.toUpperCase()] = manualFieldValues[field.name];
        }
      }

      // Persist signatures alongside other fields. Signature data URLs use
      // the placeholder keys so renderContractContent can swap them into <img>s.
      const fieldsWithSignatures: Record<string, string> = { ...allFieldValues };
      for (const [placeholder, dataUrl] of Object.entries(activeSignatures)) {
        if (dataUrl) fieldsWithSignatures[placeholder] = dataUrl;
      }

      const hasSignatures = requiredSignatures.length > 0;
      const hasRemoteRequests = Object.values(activeRemoteRequested).some(Boolean);
      const allPresencial = hasSignatures && !hasRemoteRequests &&
        requiredSignatures.every((f) => !!activeSignatures[f.placeholder]);

      const result = await createContrato.mutateAsync({
        template_id: selectedTemplate?.id,
        tipo: forcedTipo || "aluguer",
        proprietario_id: formData.proprietario_id || undefined,
        motorista_id: formData.motorista_id || undefined,
        veiculo_id: formData.veiculo_id || undefined,
        data_inicio: manualFieldValues.data_inicio_contrato || undefined,
        data_fim: manualFieldValues.data_fim_contrato || undefined,
        campos_preenchidos: fieldsWithSignatures,
        ...(hasSignatures
          ? allPresencial
            ? {
                status: "assinado" as const,
                data_assinatura: new Date().toISOString(),
                assinatura_motorista_url: activeSignatures["ASSINATURA_MOTORISTA"] || undefined,
                assinatura_proprietario_url: activeSignatures["ASSINATURA_PROPRIETARIO"] || undefined,
              }
            : { status: "enviado" as const }
          : {}),
      } as any);

      // Persist signature records (both presencial assinadas e remotas pendentes)
      if (result?.id && hasSignatures && tenant?.id) {
        const rows = requiredSignatures.map((field) => {
          const target = remoteTargets[field.placeholder];
          const isRemote = !!activeRemoteRequested[field.placeholder];
          const presencialDataUrl = activeSignatures[field.placeholder];
          return {
            contrato_id: result.id,
            tenant_id: tenant.id,
            signatario_tipo: target?.signatario_tipo || "motorista",
            signatario_id: target?.signatario_id || null,
            signatario_user_id: target?.signatario_user_id || null,
            signatario_nome: target?.nome || field.label,
            signatario_email: normalizeEmail(target?.email),
            placeholder: field.placeholder,
            status: isRemote ? "pendente" : "assinado",
            verificado: !isRemote && !!presencialDataUrl,
            assinatura_url: !isRemote ? presencialDataUrl || null : null,
            assinado_em: !isRemote && presencialDataUrl ? new Date().toISOString() : null,
            solicitado_por: isRemote ? user?.id ?? null : null,
            solicitado_em: isRemote ? new Date().toISOString() : null,
          };
        });
        const { error: sigErr } = await supabase.from("assinaturas_digitais").insert(rows);
        if (sigErr) throw sigErr;
      }

      markSaved();
      toast.success(
        hasRemoteRequests
          ? "Contrato criado e pedidos de assinatura enviados!"
          : "Contrato criado com sucesso!",
      );
      onOpenChange(false);
      onSuccess?.(result);

      if (result?.id && !skipNavigateOnSuccess) {
        navigate(`/contracts?view=${result.id}`);
      }
    } catch (error: any) {
      console.error("Error creating contract:", error);
      toast.error(error?.message || "Erro ao criar contrato. Tente novamente.");
    } finally {
      setIsSubmittingContract(false);
    }
  };

  const handleRequestRemoteAndSubmit = async (placeholders: string[]) => {
    if (placeholders.length === 0) return;
    const nextRemoteRequested = { ...remoteRequested };
    const nextSignatures = { ...signatures };

    placeholders.forEach((placeholder) => {
      nextRemoteRequested[placeholder] = true;
      delete nextSignatures[placeholder];
    });

    setRemoteRequested(nextRemoteRequested);
    setSignatures(nextSignatures);
    await handleSubmit({ signatures: nextSignatures, remoteRequested: nextRemoteRequested });
  };

  const canProceed = () => {
    switch (currentStep) {
      case "template":
        return !!selectedTemplate;
      case "entities":
        // All required entities must be selected
        if (templateRequirements.needsEmpresa && !formData.empresa_id) return false;
        if (templateRequirements.needsProprietario && !formData.proprietario_id) return false;
        if (templateRequirements.needsMotorista && !formData.motorista_id) return false;
        if (templateRequirements.needsVeiculo && !formData.veiculo_id) return false;
        // All required manual fields must be filled
        for (const field of templateRequirements.manualFields) {
          const raw = manualFieldValues[field.name];
          const value = typeof raw === "string" ? raw : "";
          if (field.required && !value.trim()) {
            return false;
          }
        }
        return true;
      case "review":
        // Preview step is informational; user must read before continuing
        return true;
      case "signatures":
        return requiredSignatures.every(
          (f) => !!signatures[f.placeholder] || !!remoteRequested[f.placeholder],
        );
      default:
        return false;
    }
  };

  const renderTemplateStep = () => (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Selecione o template que deseja utilizar para criar o contrato.
      </p>

      {templatesLoading ? (
        <TemplateSkeleton />
      ) : groupedTemplates.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum template disponível</p>
          <p className="text-sm text-muted-foreground">
            Importe um template primeiro para criar contratos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groupedTemplates.map((group) => {
            const isSelected = selectedTemplateGroup?.displayName === group.displayName;
            const requirements = analyzeTemplateRequirements(group.representativeTemplate);
            
            return (
              <button
                key={group.displayName}
                type="button"
                onClick={() => handleTemplateGroupSelect(group)}
                className={cn(
                  "p-4 border rounded-lg text-left transition-all hover:border-primary/50",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "bg-card"
                )}
                aria-pressed={isSelected}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10"
                    )}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{group.displayName}</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {requirements.needsEmpresa && (
                        <Badge variant="outline" className="text-xs">Empresa</Badge>
                      )}
                      {requirements.needsProprietario && (
                        <Badge variant="outline" className="text-xs">Proprietário</Badge>
                      )}
                      {requirements.needsMotorista && (
                        <Badge variant="outline" className="text-xs">Motorista</Badge>
                      )}
                      {requirements.needsVeiculo && (
                        <Badge variant="outline" className="text-xs">Veículo</Badge>
                      )}
                      {requirements.manualFields.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{requirements.manualFields.length} manual
                        </Badge>
                      )}
                    </div>
                    {group.isGrouped && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Particular / Empresa (auto-seleção)
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderEntitiesStep = () => (
    <SmartEntitySelectionStep
      requirements={templateRequirements}
      empresaId={formData.empresa_id}
      onEmpresaChange={(id) => setFormData((prev) => ({ ...prev, empresa_id: id }))}
      proprietarioId={formData.proprietario_id}
      onProprietarioChange={(id) => setFormData((prev) => ({ ...prev, proprietario_id: id }))}
      motoristaId={formData.motorista_id}
      onMotoristaChange={(id) => setFormData((prev) => ({ ...prev, motorista_id: id }))}
      veiculoId={formData.veiculo_id}
      onVeiculoChange={(id) => setFormData((prev) => ({ ...prev, veiculo_id: id }))}
      empresas={activeEmpresas}
      proprietarios={proprietarios}
      motoristas={motoristas}
      veiculos={veiculos}
      empresasLoading={empresasLoading}
      proprietariosLoading={proprietariosLoading}
      motoristasLoading={motoristasLoading}
      veiculosLoading={veiculosLoading}
      manualFieldValues={manualFieldValues}
      onManualFieldChange={handleManualFieldChange}
    />
  );

  const renderReviewStep = () => (
    <SmartReviewStep
      template={selectedTemplate}
      requirements={templateRequirements}
      empresa={selectedEmpresa}
      proprietario={selectedProprietario}
      motorista={selectedMotorista}
      veiculo={selectedVeiculo}
      manualFieldValues={manualFieldValues}
      signatures={signatures}
    />
  );

  const renderSignaturesStep = () => (
    <SignaturesStep
      requiredSignatures={requiredSignatures}
      signatures={signatures}
      onSignatureChange={(placeholder, dataUrl) =>
        setSignatures((prev) => {
          const next = { ...prev };
          if (dataUrl) next[placeholder] = dataUrl;
          else delete next[placeholder];
          return next;
        })
      }
      remoteTargets={remoteTargets}
      remoteRequested={remoteRequested}
      onRequestAllRemote={handleRequestRemoteAndSubmit}
      onRequestRemote={(p) => {
        setRemoteRequested((prev) => ({ ...prev, [p]: true }));
        setSignatures((prev) => {
          const n = { ...prev };
          delete n[p];
          return n;
        });
      }}
      onCancelRemote={(p) =>
        setRemoteRequested((prev) => {
          const n = { ...prev };
          delete n[p];
          return n;
        })
      }
      isSubmitting={createContrato.isPending || isSubmittingContract}
    />
  );


  const renderStepContent = () => {
    switch (currentStep) {
      case "template":
        return renderTemplateStep();
      case "entities":
        return renderEntitiesStep();
      case "signatures":
        return renderSignaturesStep();
      case "review":
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-4xl max-h-[95vh] flex flex-col p-0"
        aria-describedby="wizard-description"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Novo Contrato
          </DialogTitle>
          <p id="wizard-description" className="sr-only">
            Assistente de criação de contrato em {stepConfig.length} passos
          </p>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b shrink-0">
          <WizardStepIndicator
            steps={stepConfig}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {renderStepContent()}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-muted/30">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === "template"}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <Button
                onClick={() => handleSubmit()}
                disabled={createContrato.isPending || isSubmittingContract || !canProceed()}
                className="btn-accent gap-2"
              >
                {createContrato.isPending || isSubmittingContract ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Finalizar
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2"
              >
                <span className="hidden sm:inline">
                  {currentStep === "review" ? "Li e quero assinar" : "Continuar"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
