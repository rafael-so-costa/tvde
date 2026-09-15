import { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import { SignatureFlowDialog } from "./SignatureFlowDialog";
import { useContratos, useContratoSignatures } from "@/hooks/useContratos";
import {
  useContractFullData,
  generateContractFieldMappings,
  renderContractContent,
  renderContractSegments,
  type ContractSegment,
} from "@/hooks/useContractFullData";
import { useResolvedSignatures } from "@/hooks/useResolvedSignatures";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Contract, ContractVersion, DigitalSignature } from "@/types/contract";
import { exportProcessedContractHtmlToPdf, printProcessedContractHtml } from "@/utils/contractPdfExport";
import { analyzeTemplateRequirements, type ProfileKind } from "@/utils/templatePlaceholderAnalyzer";
import {
  CONTRACT_PROFILE_FIELD_KEYS,
  getFieldValue,
  getRenderableProfileOrder,
  shouldRenderContractProfileSection,
} from "@/utils/contractDetailsRenderModel";
import { getProfileSchema } from "@/utils/profileFieldsSchema";
import {
  FileText,
  Edit,
  History,
  PenTool,
  Download,
  Send,
  Lock,
  User,
  Car,
  Building2,
  Calendar,
  Euro,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  X,
  Building,
  ListChecks,
  Printer,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

interface ContractEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onUpdate?: () => void;
}

const statusConfig = {
  rascunho: { label: "Rascunho", icon: Edit, color: "bg-muted" },
  enviado: { label: "Aguardando Assinatura", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  assinado: { label: "Assinado", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", icon: X, color: "bg-red-100 text-red-800" },
  renovado: { label: "Renovado", icon: History, color: "bg-blue-100 text-blue-800" },
  expirado: { label: "Expirado", icon: AlertCircle, color: "bg-gray-100 text-gray-800" },
};

const SIGNER_TYPE_LABEL: Record<string, string> = {
  motorista: "Motorista",
  proprietario: "Proprietário",
  empresa: "Empresa",
};

const AUTO_FIELD_KEYS = new Set(Object.values(CONTRACT_PROFILE_FIELD_KEYS).flat());

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return format(new Date(value), "dd/MM/yyyy", { locale: pt });
  } catch {
    return value;
  }
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return `€${Number(value).toFixed(2)}`;
}

function buildAddress(entity: any): string {
  if (!entity) return "";
  const parts = [
    [entity.endereco_rua, entity.endereco_numero].filter(Boolean).join(", "),
    entity.endereco_complemento,
    [entity.endereco_cep, entity.endereco_cidade].filter(Boolean).join(" "),
  ].filter((p) => p && String(p).trim());
  return parts.join(" — ");
}

export function ContractEditorDialog({
  open,
  onOpenChange,
  contract,
  onUpdate,
}: ContractEditorDialogProps) {
  const [activeTab, setActiveTab] = useState("preview");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSignatureFlow, setShowSignatureFlow] = useState(false);
  const contractPreviewRef = useRef<HTMLDivElement>(null);
  const [signatureTarget, setSignatureTarget] = useState<{
    nome: string;
    email: string;
    tipo: "motorista" | "proprietario" | "empresa";
    id?: string;
  } | null>(null);

  const { updateContrato } = useContratos();
  const { assinaturas } = useContratoSignatures(contract?.id || null);

  const { data: fullData, isLoading: isLoadingFullData } = useContractFullData(
    open ? contract?.id || null : null
  );

  const fieldValues = useMemo<Record<string, string>>(() => {
    const normalize = (vals: Record<string, any> | null | undefined) => {
      const out: Record<string, string> = {};
      if (!vals) return out;
      Object.entries(vals).forEach(([k, v]) => {
        out[k] = v === null || v === undefined ? "" : String(v);
      });
      return out;
    };

    if (!fullData) {
      return normalize(generateContractFieldMappings({
        empresa: null,
        proprietario: contract?.proprietario,
        motorista: contract?.motorista,
        veiculo: contract?.veiculo,
        camposPreenchidos: contract?.campos_preenchidos as Record<string, any>,
      }) as any);
    }

    return normalize(generateContractFieldMappings({
      empresa: fullData.empresa,
      proprietario: fullData.proprietario,
      motorista: fullData.motorista,
      veiculo: fullData.veiculo,
      camposPreenchidos: fullData.contract?.campos_preenchidos as Record<string, any>,
    }) as any);
  }, [fullData, contract]);

  const rawSignatureValues = useMemo<Record<string, string>>(() => {
    return assinaturas.reduce((acc, signature) => {
      const key = `ASSINATURA_${signature.signatario_tipo?.toUpperCase()}`;
      if (signature.assinatura_url) acc[key] = signature.assinatura_url;
      return acc;
    }, {} as Record<string, string>);
  }, [assinaturas]);

  const signatureValues = useResolvedSignatures(rawSignatureValues);

  // Determine which profiles/manual fields the template actually uses
  // NOTE: All hooks must be called before any early return to keep hook order stable.
  const templateForAnalysis = fullData?.template || contract?.template || null;
  const requirements = useMemo(
    () => analyzeTemplateRequirements(templateForAnalysis as any),
    [templateForAnalysis]
  );

  const manualFieldLabels = useMemo(() => {
    const map: Record<string, string> = {};
    (requirements?.manualFields || []).forEach((f) => {
      map[f.placeholder.toUpperCase()] = f.label;
      map[f.name.toUpperCase()] = f.label;
    });
    return map;
  }, [requirements]);

  const previewSegments: ContractSegment[] = useMemo(() => {
    const templateContent =
      fullData?.template?.conteudo_original ||
      contract?.template?.conteudo_original ||
      "";
    if (!templateContent) return [];
    return renderContractSegments(templateContent, fieldValues, signatureValues);
  }, [fullData, contract, fieldValues, signatureValues]);

  if (!contract) return null;

  const isLocked = contract.bloqueado || contract.status === "assinado";
  const status = statusConfig[contract.status] || statusConfig.rascunho;

  const motoristaData = fullData?.motorista || contract.motorista;
  const proprietarioData = fullData?.proprietario || contract.proprietario;
  const veiculoData = fullData?.veiculo || contract.veiculo;
  const empresaData = fullData?.empresa;
  const displayContract = fullData?.contract || contract;
  const camposPreenchidos = (fullData?.contract?.campos_preenchidos ||
    contract.campos_preenchidos || {}) as Record<string, any>;

  const profileDataByKind: Record<ProfileKind, any> = {
    empresa: empresaData,
    proprietario: proprietarioData,
    motorista: motoristaData,
    veiculo: veiculoData,
  };

  const profileRequiredByKind: Record<ProfileKind, boolean> = {
    empresa: requirements.needsEmpresa,
    proprietario: requirements.needsProprietario,
    motorista: requirements.needsMotorista,
    veiculo: requirements.needsVeiculo,
  };

  const getDetailValue = (...keys: string[]) => getFieldValue(fieldValues, keys);

  const formatDetailValue = (label: string, value?: string | null) => {
    if (!value) return value;
    const normalizedLabel = label.toLowerCase();
    if ((normalizedLabel.includes("data") || normalizedLabel.includes("validade")) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatDate(value);
    }
    return value;
  };

  const buildProfileRows = (kind: ProfileKind): Array<[string, string | null | undefined]> => {
    const schemaRows = (getProfileSchema(kind)?.fields || []).map((field) => [
      field.label,
      formatDetailValue(field.label, getDetailValue(field.placeholder)),
    ] as [string, string | null | undefined]);

    if (kind === "proprietario") {
      return [
        ["Tipo", proprietarioData?.tipo === "empresa" ? "Empresa" : proprietarioData?.tipo ? "Particular" : null],
        ...schemaRows,
      ];
    }

    return schemaRows;
  };

  const renderDocumentPreview = () => {
    const templateContent =
      fullData?.template?.conteudo_original ||
      contract.template?.conteudo_original ||
      "";
    if (!templateContent) return "";
    return renderContractContent(templateContent, fieldValues, signatureValues, {
      cleanFinal: true,
    });
  };


  const handleSendForSignature = () => {
    if (contract.motorista) {
      setSignatureTarget({
        nome: contract.motorista.nome_completo,
        email: "",
        tipo: "motorista",
        id: contract.motorista.id,
      });
    } else if (contract.proprietario) {
      const nome =
        contract.proprietario.tipo === "empresa"
          ? contract.proprietario.nome_empresa
          : contract.proprietario.nome_completo;
      setSignatureTarget({
        nome: nome || "Proprietário",
        email: "",
        tipo: "proprietario",
        id: contract.proprietario.id,
      });
    }
    setShowSignatureFlow(true);
  };

  const handleRestoreVersion = async (version: ContractVersion) => {
    try {
      await updateContrato.mutateAsync({
        id: contract.id,
        campos_preenchidos: version.dados_campos,
      });
      toast.success(`Versão ${version.versao_numero} restaurada`);
      onUpdate?.();
    } catch (error) {
      console.error("Error restoring version:", error);
    }
  };

  const handleExportPDF = async () => {
    toast.info("Gerando PDF...");
    try {
      await exportProcessedContractHtmlToPdf({
        html: renderDocumentPreview(),
        title: contract.template?.nome || "Contrato",
      });
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handlePrint = () => {
    try {
      printProcessedContractHtml({
        html: renderDocumentPreview(),
        title: contract.template?.nome || "Contrato",
      });
    } catch (error) {
      console.error("Error printing contract:", error);
      toast.error("Erro ao preparar impressão. Tente novamente.");
    }
  };


  const manualEntries = Object.entries(camposPreenchidos)
    .filter(([k, v]) => {
      if (v === null || v === undefined) return false;
      const str = typeof v === "string" ? v : String(v);
      if (!str.trim()) return false;
      if (k.startsWith("ASSINATURA_")) return false;
      if (AUTO_FIELD_KEYS.has(k.toUpperCase())) return false;
      return true;
    })
    .map(([k, v]) => {
      const label = manualFieldLabels[k.toUpperCase()] || k.replace(/_/g, " ");
      let value = typeof v === "string" ? v : String(v);
      // Format ISO dates nicely
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        value = formatDate(value);
      }
      return { key: label, value };
    });


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl h-[95vh] p-0 flex flex-col overflow-hidden"
          aria-describedby="contract-editor-description"
        >
          <DialogHeader className="p-6 pb-2 shrink-0 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {contract.template?.nome || "Contrato"}
                {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
              </DialogTitle>
              <Badge className={status.color}>
                <status.icon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p id="contract-editor-description" className="sr-only">
              Visualize os detalhes do contrato
            </p>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 shrink-0">
              <TabsList className="w-full">
                <TabsTrigger value="preview" className="flex-1">
                  <Eye className="w-4 h-4 mr-2" />
                  Pré-visualização
                </TabsTrigger>
                <TabsTrigger value="details" className="flex-1">
                  <ListChecks className="w-4 h-4 mr-2" />
                  Detalhes
                </TabsTrigger>
                <TabsTrigger value="signatures" className="flex-1">
                  <PenTool className="w-4 h-4 mr-2" />
                  Assinaturas
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ===== TAB 1: PREVIEW ===== */}
            <TabsContent
              value="preview"
              className="flex-1 min-h-0 px-6 pb-4 mt-4 data-[state=inactive]:hidden flex flex-col"
              forceMount
            >
              {isLoadingFullData ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex justify-end gap-2 mb-3 shrink-0">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF}>
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg bg-white dark:bg-gray-950">
                    <div ref={contractPreviewRef} className="p-6">
                      {previewSegments.length > 0 ? (
                        <article
                          className="prose prose-sm max-w-none whitespace-pre-wrap break-words"
                          style={{
                            fontFamily: "Georgia, 'Times New Roman', serif",
                            fontSize: "11pt",
                            lineHeight: 1.6,
                          }}
                        >
                          {previewSegments.map((seg, i) =>
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
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Template do contrato indisponível</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ===== TAB 2: DETAILS ===== */}
            <TabsContent
              value="details"
              className="flex-1 min-h-0 px-6 pb-4 mt-4 data-[state=inactive]:hidden overflow-y-auto"
            >
              {isLoadingFullData ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : (
                <div className="space-y-4 pr-1">
                  {getRenderableProfileOrder(requirements, (profile) =>
                    shouldRenderContractProfileSection(
                      profile,
                      profileDataByKind[profile],
                      fieldValues,
                      profileRequiredByKind[profile],
                    ),
                  ).map((profile) => {
                    const iconByProfile: Record<ProfileKind, React.ReactNode> = {
                      empresa: <Building2 className="w-4 h-4" />,
                      proprietario: <Building className="w-4 h-4" />,
                      motorista: <User className="w-4 h-4" />,
                      veiculo: <Car className="w-4 h-4" />,
                    };
                    const titleByProfile: Record<ProfileKind, string> = {
                      empresa: "Empresa",
                      proprietario: "Proprietário",
                      motorista: "Motorista",
                      veiculo: "Veículo",
                    };

                    return (
                      <DetailSection
                        key={profile}
                        icon={iconByProfile[profile]}
                        title={titleByProfile[profile]}
                        rows={buildProfileRows(profile)}
                      />
                    );
                  })}


                  {(displayContract.data_inicio ||
                    displayContract.data_fim ||
                    displayContract.valor_semanal != null ||
                    displayContract.valor_diaria != null ||
                    displayContract.valor_caucao != null ||
                    displayContract.valor_total != null) && (
                    <DetailSection
                      icon={<Calendar className="w-4 h-4" />}
                      title="Datas e Valores"
                      rows={[
                        ["Data de Início", displayContract.data_inicio ? formatDate(displayContract.data_inicio) : null],
                        ["Data de Fim", displayContract.data_fim ? formatDate(displayContract.data_fim) : null],
                        ["Valor Semanal", displayContract.valor_semanal != null ? formatCurrency(displayContract.valor_semanal) : null],
                        ["Valor Diário", displayContract.valor_diaria != null ? formatCurrency(displayContract.valor_diaria) : null],
                        ["Valor da Caução", displayContract.valor_caucao != null ? formatCurrency(displayContract.valor_caucao) : null],
                        ["Valor Total", displayContract.valor_total != null ? formatCurrency(displayContract.valor_total) : null],
                      ]}
                    />
                  )}

                  {manualEntries.length > 0 && (
                    <DetailSection
                      icon={<Settings2 className="w-4 h-4" />}
                      title="Campos Preenchidos"
                      rows={manualEntries.map((e) => [e.key, e.value] as [string, string])}
                    />
                  )}
                </div>
              )}
            </TabsContent>

            {/* ===== TAB 3: SIGNATURES ===== */}
            <TabsContent
              value="signatures"
              className="flex-1 min-h-0 px-6 pb-4 mt-4 data-[state=inactive]:hidden overflow-y-auto"
            >
              <div className="space-y-4 pr-1">
                {assinaturas.length > 0 ? (
                  <div className="grid gap-4">
                    {assinaturas.map((sig) => (
                      <SignatureCard key={sig.id} signature={sig} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border rounded-lg">
                    <PenTool className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhuma assinatura registada</p>
                    <p className="text-sm">Solicite uma assinatura para começar</p>
                  </div>
                )}

                {!isLocked && (
                  <Button onClick={handleSendForSignature} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Solicitar Assinatura
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <VersionHistoryDialog
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
        contratoId={contract.id}
        currentVersion={contract.versao_atual}
        onRestoreVersion={handleRestoreVersion}
      />

      {signatureTarget && (
        <SignatureFlowDialog
          open={showSignatureFlow}
          onOpenChange={setShowSignatureFlow}
          contratoId={contract.id}
          signatarioNome={signatureTarget.nome}
          signatarioEmail={signatureTarget.email || "email@exemplo.com"}
          signatarioTipo={signatureTarget.tipo}
          signatarioId={signatureTarget.id}
          onComplete={() => {
            onUpdate?.();
            setShowSignatureFlow(false);
          }}
        />
      )}
    </>
  );
}

function DetailSection({
  icon,
  title,
  rows,
  emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<[string, string | null | undefined]>;
  emptyText?: string;
}) {
  const filled = rows.filter(([, v]) => v && String(v).trim() && String(v).trim() !== "-");
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {filled.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          {emptyText || "Sem dados disponíveis."}
        </p>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {filled.map(([label, value]) => (
            <div key={label} className="flex flex-col py-1">
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">{label}</dt>
              <dd className="text-sm font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function SignatureCard({ signature }: { signature: DigitalSignature }) {
  const typeLabel = SIGNER_TYPE_LABEL[signature.signatario_tipo] || signature.signatario_tipo;
  const signed = signature.verificado && !!signature.assinado_em;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{signature.signatario_nome || "Sem nome"}</p>
            <Badge variant="secondary">{typeLabel}</Badge>
          </div>
          {signature.signatario_email && (
            <p className="text-sm text-muted-foreground">{signature.signatario_email}</p>
          )}
        </div>
        <div className="text-right">
          {signed ? (
            <>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Assinado
              </Badge>
              {signature.assinado_em && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(signature.assinado_em), "dd/MM/yyyy HH:mm", { locale: pt })}
                </p>
              )}
            </>
          ) : (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <Clock className="w-3 h-3 mr-1" />
              Pendente
            </Badge>
          )}
        </div>
      </div>

      <div className="border rounded-md bg-muted/30 p-3 min-h-[110px] flex items-center justify-center">
        {signature.assinatura_url ? (
          <img
            src={signature.assinatura_url}
            alt={`Assinatura de ${signature.signatario_nome}`}
            className="max-h-24 object-contain"
          />
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Assinatura ainda não capturada
          </p>
        )}
      </div>
    </div>
  );
}
