import ContratosSubnav from "../components/contratos/ContratosSubnav";
import axios from "axios";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle,
    ArrowLeft,
    ArrowUpCircle,
    ClipboardPaste,
    FileStack,
    FileText,
    GitBranch,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Sparkles,
    Trash2,
    Upload,
    Workflow,
    X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useTenant } from "../contexts/TenantContext";
import { useContractTypes } from "../hooks/useContractTypes";
import type {
    ChecklistProcessItemPayload,
    ChecklistProcessItemType,
    ChecklistProcessTemplate,
    ChecklistProcessTemplatePayload,
    ChecklistSystemAction,
    ChecklistVehicleType,
    PerfilTemplate,
    SignaturePlaceholder,
    TemplateContrato,
} from "../types/template";

import TemplateTextModal from "../components/contratos/templates/TemplateTextModal";
import RecommendedTemplatesPanel from "../components/contratos/templates/RecommendedTemplatesPanel";
import RecommendedTemplateUpdateModal from "../components/contratos/templates/RecommendedTemplateUpdateModal";
import RecommendedWorkflowPresetsPanel from "../components/contratos/templates/RecommendedWorkflowPresetsPanel";

type Tab = "documentos" | "workflows";
type DocumentTab = "meus" | "recomendados";
type WorkflowTab = "meus" | "recomendados";

const itemTypeLabels: Record<ChecklistProcessItemType, string> = {
    tarefa: "Tarefa",

    preenchimento: "Preenchimento",

    assinatura: "Assinatura",

    upload: "Upload",

    aprovacao: "Aprovação",

    gerar_documento: "Gerar documento",

    contrato_relacionado: "Contrato relacionado",

    checklist_veiculo: "Checklist do veículo",

    validacao: "Validação",

    acao_sistema: "Ação do sistema",
};

const signatureLabels: Record<SignaturePlaceholder, string> = {
    ASSINATURA_MOTORISTA: "Motorista",

    ASSINATURA_PROPRIETARIO: "Proprietário",

    ASSINATURA_EMPRESA: "Empresa",

    ASSINATURA_TESTEMUNHA: "Testemunha",
    ASSINATURA_TITULAR: "Titular dos dados",
};

const systemActionLabels: Record<ChecklistSystemAction, string> = {
    motorista_acesso: "Criar/validar acesso do motorista",
};

const vehicleChecklistLabels: Record<ChecklistVehicleType, string> = {
    entrega: "Entrega do veículo",

    recolha: "Recolha do veículo",
};

function errorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;

        if (errors && typeof errors === "object") {
            const first = Object.values(errors)
                .flat()
                .find((value) => typeof value === "string");

            if (typeof first === "string") {
                return first;
            }
        }

        return error.response?.data?.message ?? fallback;
    }

    return fallback;
}

function emptyItem(order: number): ChecklistProcessItemPayload {
    return {
        codigo: "",

        ordem: order,

        titulo: "",

        descricao: null,

        tipo: "tarefa",

        obrigatorio: true,

        configuracao: {},
    };
}

export default function TemplatesPage() {
    const { tenant } = useTenant();

    const navigate = useNavigate();

    const queryClient = useQueryClient();

    const [tab, setTab] = useState<Tab>("documentos");

    const [documentTab, setDocumentTab] = useState<DocumentTab>("meus");

    const [workflowTab, setWorkflowTab] = useState<WorkflowTab>("meus");

    const [search, setSearch] = useState("");

    const [processForm, setProcessForm] = useState<
        ChecklistProcessTemplate | null | undefined
    >(undefined);

    const [importOpen, setImportOpen] = useState(false);

    const [textOpen, setTextOpen] = useState(false);

    const [updateTemplate, setUpdateTemplate] =
        useState<TemplateContrato | null>(null);

    const [actionError, setActionError] = useState<string | null>(null);

    const profilesQuery = useQuery({
        queryKey: ["template-profiles", tenant?.id],

        enabled: Boolean(tenant?.id),

        queryFn: async () => {
            const response = await api.get("/api/perfis-template");

            return response.data.data as PerfilTemplate[];
        },
    });

    const templatesQuery = useQuery({
        queryKey: ["templates", tenant?.id],

        enabled: Boolean(tenant?.id),

        queryFn: async () => {
            const response = await api.get("/api/templates-contrato");

            return response.data.data as TemplateContrato[];
        },
    });

    const workflowsQuery = useQuery({
        queryKey: ["process-templates", tenant?.id],

        enabled: Boolean(tenant?.id),

        queryFn: async () => {
            const response = await api.get("/api/checklist-process-templates");

            return response.data.data as ChecklistProcessTemplate[];
        },
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/templates-contrato/${id}`);
        },

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["templates", tenant?.id],
                }),

                queryClient.invalidateQueries({
                    queryKey: ["template-profiles", tenant?.id],
                }),
            ]);
        },
    });

    const deleteWorkflowMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/checklist-process-templates/${id}`);
        },

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["process-templates", tenant?.id],
            });
        },
    });

    const templates = useMemo(() => {
        const data = templatesQuery.data ?? [];

        const term = search.trim().toLocaleLowerCase("pt-PT");

        if (!term) {
            return data;
        }

        return data.filter((item) =>
            [item.nome, item.tipo_arquivo, item.perfil?.nome]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase("pt-PT").includes(term),
                ),
        );
    }, [templatesQuery.data, search]);

    const workflows = useMemo(() => {
        const data = workflowsQuery.data ?? [];

        const term = search.trim().toLocaleLowerCase("pt-PT");

        if (!term) {
            return data;
        }

        return data.filter((item) =>
            [item.nome, item.codigo, item.descricao]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase("pt-PT").includes(term),
                ),
        );
    }, [workflowsQuery.data, search]);

    if (!tenant) {
        return (
            <div className="mx-auto max-w-7xl">
            <ContratosSubnav />
                <div className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Escolha uma organização antes de gerir os recursos
                            dos contratos.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const loading =
        templatesQuery.isLoading ||
        workflowsQuery.isLoading ||
        profilesQuery.isLoading;

    const hasError =
        templatesQuery.isError ||
        workflowsQuery.isError ||
        profilesQuery.isError;

    const activeTemplates = (templatesQuery.data ?? []).filter(
        (item) => item.ativo,
    ).length;

    const activeWorkflows = (workflowsQuery.data ?? []).filter(
        (item) => item.ativo,
    ).length;

    async function refresh() {
        setActionError(null);

        await Promise.all([
            templatesQuery.refetch(),
            workflowsQuery.refetch(),
            profilesQuery.refetch(),
        ]);
    }

    async function deleteTemplate(item: TemplateContrato) {
        const confirmed = window.confirm(
            `Eliminar o modelo "${item.nome}"?\n\nSe ele estiver associado a um tipo de contrato, a operação poderá ser recusada.`,
        );

        if (!confirmed) {
            return;
        }

        setActionError(null);

        try {
            await deleteTemplateMutation.mutateAsync(item.id);
        } catch (error) {
            setActionError(
                errorMessage(
                    error,
                    "Não foi possível eliminar o modelo de documento.",
                ),
            );
        }
    }

    async function deleteWorkflow(item: ChecklistProcessTemplate) {
        const confirmed = window.confirm(
            `Eliminar o workflow "${item.nome}"?\n\nWorkflows já utilizados ou vinculados podem não ser eliminados.`,
        );

        if (!confirmed) {
            return;
        }

        setActionError(null);

        try {
            await deleteWorkflowMutation.mutateAsync(item.id);
        } catch (error) {
            setActionError(
                errorMessage(error, "Não foi possível eliminar o workflow."),
            );
        }
    }

    return (
        <div className="mx-auto max-w-7xl">
            <ContratosSubnav />
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate("/contratos/configuracao")}
                        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Configuração de contratos
                    </button>

                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Contratos
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Recursos de contratos
                    </h1>

                    <p className="mt-2 max-w-3xl text-slate-500">
                        Gerencie os modelos de documento e workflows disponíveis
                        para os tipos de contrato de{" "}
                        <span className="font-medium text-slate-700">
                            {tenant.nome}
                        </span>
                        .
                    </p>
                </div>

                {tab === "documentos" ? (
                    documentTab === "meus" ? (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setImportOpen(true)}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                <Upload className="h-5 w-5" />
                                Importar arquivo
                            </button>

                            <button
                                type="button"
                                onClick={() => setTextOpen(true)}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                            >
                                <ClipboardPaste className="h-5 w-5" />
                                Colar texto
                            </button>
                        </div>
                    ) : null
                ) : workflowTab === "meus" ? (
                    <button
                        type="button"
                        onClick={() => setProcessForm(null)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        <Plus className="h-5 w-5" />
                        Novo workflow
                    </button>
                ) : null}
            </div>

            <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <div className="flex gap-3">
                    <Workflow className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                    <div>
                        <h2 className="font-semibold text-indigo-950">
                            Recursos independentes
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-indigo-800">
                            Modelos de documento e workflows são recursos
                            reutilizáveis. A combinação correta entre eles é
                            definida no <strong>Tipo de Contrato</strong>, e não
                            mais diretamente nesta tela.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat
                    label="Modelos"
                    value={templatesQuery.data?.length ?? 0}
                />

                <Stat label="Modelos ativos" value={activeTemplates} />

                <Stat
                    label="Workflows"
                    value={workflowsQuery.data?.length ?? 0}
                />

                <Stat label="Workflows ativos" value={activeWorkflows} />
            </div>

            {actionError && (
                <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0" />

                    {actionError}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 pt-4 sm:px-5">
                    <div className="flex gap-6">
                        <TabButton
                            active={tab === "documentos"}
                            onClick={() => {
                                setTab("documentos");

                                setSearch("");
                            }}
                            icon={FileText}
                        >
                            Modelos de documento
                        </TabButton>

                        <TabButton
                            active={tab === "workflows"}
                            onClick={() => {
                                setTab("workflows");

                                setSearch("");
                            }}
                            icon={GitBranch}
                        >
                            Workflows
                        </TabButton>
                    </div>
                </div>

                {tab === "documentos" && (
                    <div className="border-b border-slate-200 bg-slate-50/60 px-5">
                        <div className="flex gap-2 py-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setDocumentTab("meus");
                                    setSearch("");
                                }}
                                className={[
                                    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
                                    documentTab === "meus"
                                        ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                                        : "text-slate-500 hover:text-slate-900",
                                ].join(" ")}
                            >
                                <FileText className="h-4 w-4" />
                                Meus modelos
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setDocumentTab("recomendados");
                                    setSearch("");
                                }}
                                className={[
                                    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
                                    documentTab === "recomendados"
                                        ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                                        : "text-slate-500 hover:text-slate-900",
                                ].join(" ")}
                            >
                                <Sparkles className="h-4 w-4" />
                                Modelos recomendados
                            </button>
                        </div>
                    </div>
                )}

                {tab === "workflows" && (
                    <div className="border-b border-slate-200 bg-slate-50/60 px-5">
                        <div className="flex gap-2 py-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setWorkflowTab("meus");
                                    setSearch("");
                                }}
                                className={[
                                    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
                                    workflowTab === "meus"
                                        ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                                        : "text-slate-500 hover:text-slate-900",
                                ].join(" ")}
                            >
                                <GitBranch className="h-4 w-4" />
                                Meus workflows
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setWorkflowTab("recomendados");
                                    setSearch("");
                                }}
                                className={[
                                    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
                                    workflowTab === "recomendados"
                                        ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                                        : "text-slate-500 hover:text-slate-900",
                                ].join(" ")}
                            >
                                <Sparkles className="h-4 w-4" />
                                Recomendados
                            </button>
                        </div>
                    </div>
                )}

                {!(
                    (tab === "documentos" &&
                        documentTab === "recomendados") ||
                    (tab === "workflows" &&
                        workflowTab === "recomendados")
                ) && (
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="relative w-full sm:max-w-md">
                            <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder={
                                    tab === "documentos"
                                        ? "Pesquisar modelo..."
                                        : "Pesquisar workflow..."
                                }
                                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={refresh}
                            disabled={
                                templatesQuery.isFetching ||
                                workflowsQuery.isFetching
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                className={[
                                    "h-4 w-4",

                                    templatesQuery.isFetching ||
                                    workflowsQuery.isFetching
                                        ? "animate-spin"
                                        : "",
                                ].join(" ")}
                            />
                            Atualizar
                        </button>
                    </div>
                )}
                {loading ? (
                    <Loading />
                ) : hasError ? (
                    <ErrorState onRetry={refresh} />
                ) : tab === "documentos" ? (
                    documentTab === "recomendados" ? (
                        <RecommendedTemplatesPanel
                            profiles={profilesQuery.data ?? []}
                            onUsed={async () => {
                                setDocumentTab("meus");

                                await Promise.all([
                                    queryClient.invalidateQueries({
                                        queryKey: ["templates", tenant.id],
                                    }),

                                    queryClient.invalidateQueries({
                                        queryKey: [
                                            "template-profiles",
                                            tenant.id,
                                        ],
                                    }),
                                ]);
                            }}
                        />
                    ) : (
                        <DocumentTemplates
                            templates={templates}
                            deleting={deleteTemplateMutation.isPending}
                            onDelete={deleteTemplate}
                            onImport={() => setImportOpen(true)}
                            onPaste={() => setTextOpen(true)}
                            onCompare={(template) =>
                                setUpdateTemplate(template)
                            }
                        />
                    )
                ) : workflowTab === "recomendados" ? (
                    <RecommendedWorkflowPresetsPanel
                        onUsed={async () => {
                            setWorkflowTab("meus");

                            await queryClient.invalidateQueries({
                                queryKey: [
                                    "process-templates",
                                    tenant.id,
                                ],
                            });
                        }}
                    />
                ) : (
                    <WorkflowTemplates
                        workflows={workflows}
                        deleting={deleteWorkflowMutation.isPending}
                        onCreate={() => setProcessForm(null)}
                        onEdit={(workflow) => setProcessForm(workflow)}
                        onDelete={deleteWorkflow}
                    />
                )}
            </div>

            {updateTemplate && (
                <RecommendedTemplateUpdateModal
                    template={updateTemplate}
                    onClose={() =>
                        setUpdateTemplate(null)
                    }
                    onUpdated={async () => {
                        setUpdateTemplate(null);

                        await queryClient.invalidateQueries({
                            queryKey: [
                                "templates",
                                tenant.id,
                            ],
                        });
                    }}
                />
            )}

            {processForm !== undefined && (
                <WorkflowFormModal
                    record={processForm}
                    onClose={() => setProcessForm(undefined)}
                    onSaved={async () => {
                        setProcessForm(undefined);

                        await queryClient.invalidateQueries({
                            queryKey: ["process-templates", tenant.id],
                        });
                    }}
                />
            )}

            {textOpen && (
                <TemplateTextModal
                    profiles={profilesQuery.data ?? []}
                    onClose={() => setTextOpen(false)}
                    onSaved={async () => {
                        setTextOpen(false);

                        await queryClient.invalidateQueries({
                            queryKey: ["templates", tenant.id],
                        });
                    }}
                />
            )}
            {importOpen && (
                <ImportModal
                    profiles={profilesQuery.data ?? []}
                    onClose={() => setImportOpen(false)}
                    onSaved={async () => {
                        setImportOpen(false);

                        await Promise.all([
                            queryClient.invalidateQueries({
                                queryKey: ["templates", tenant.id],
                            }),

                            queryClient.invalidateQueries({
                                queryKey: ["template-profiles", tenant.id],
                            }),
                        ]);
                    }}
                />
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>

            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    icon: Icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: typeof FileText;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "flex items-center gap-2 border-b-2 pb-4 text-sm font-semibold transition",

                active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800",
            ].join(" ")}
        >
            <Icon className="h-4 w-4" />

            {children}
        </button>
    );
}

function Loading() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-indigo-600" />

            <p className="text-sm">A carregar...</p>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="px-6 py-16 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />

            <h3 className="font-semibold text-slate-900">
                Não foi possível carregar os recursos
            </h3>

            <p className="mt-2 text-sm text-slate-500">
                Confirme as permissões de templates e tente novamente.
            </p>

            <button
                type="button"
                onClick={onRetry}
                className="mt-5 h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white"
            >
                Tentar novamente
            </button>
        </div>
    );
}

function recommendedTemplateHasUpdate(
    item: TemplateContrato,
): boolean {
    const master =
        item.modelo_documento_saas;

    return Boolean(
        item.ativo &&
            master &&
            master.ativo &&
            master.status === "publicado" &&
            master.versao_publicada &&
            item.modelo_documento_saas_versao &&
            master.versao_publicada !==
                item.modelo_documento_saas_versao,
    );
}
function DocumentTemplates({
    templates,
    deleting,
    onDelete,
    onImport,
    onPaste,
    onCompare,
}: {
    templates: TemplateContrato[];

    deleting: boolean;

    onDelete: (item: TemplateContrato) => Promise<void>;

    onImport: () => void;

    onPaste: () => void;

    onCompare: (item: TemplateContrato) => void;
}) {
    if (templates.length === 0) {
        return (
            <div className="px-6 py-20 text-center">
                <FileStack className="mx-auto h-12 w-12 text-slate-300" />

                <h3 className="mt-4 font-semibold text-slate-900">
                    Ainda não existem modelos de documento
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                    Cole o texto de um documento para o FrotaPro reconhecer os
                    campos automaticamente ou importe um arquivo existente.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={onImport}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
                    >
                        <Upload className="h-4 w-4" />
                        Importar arquivo
                    </button>

                    <button
                        type="button"
                        onClick={onPaste}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                    >
                        <ClipboardPaste className="h-4 w-4" />
                        Colar texto
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                        <Th>Modelo</Th>

                        <Th>Perfil</Th>

                        <Th>Campos</Th>

                        <Th>Origem</Th>

                        <Th>Estado</Th>

                        <Th>Ações</Th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {templates.map((item) => (
                        <tr
                            key={item.id}
                            className="transition hover:bg-slate-50"
                        >
                            <td className="px-5 py-4">
                                <div className="font-semibold text-slate-900">
                                    {item.nome}
                                </div>

                                <div className="mt-1 text-xs uppercase text-slate-400">
                                    {item.tipo_arquivo}
                                </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                                {item.perfil?.nome ?? "Sem perfil"}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                                {item.campos_detectados?.length ?? 0}
                            </td>

                            <td className="px-5 py-4">
                                {item.modelo_documento_saas_id ? (
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            FrotaPro
                                        </span>

                                        {item.modelo_documento_saas_versao && (
                                            <div className="mt-1 text-xs text-slate-400">
                                                v
                                                {
                                                    item.modelo_documento_saas_versao
                                                }
                                            </div>
                                        )}

                                        {recommendedTemplateHasUpdate(item) && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onCompare(item)
                                                }
                                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                            >
                                                <ArrowUpCircle className="h-3.5 w-3.5" />

                                                Nova versão v
                                                {
                                                    item.modelo_documento_saas
                                                        ?.versao_publicada
                                                }
                                            </button>
                                        )}
                                    </div>
                                ) : item.arquivo_url ? (
                                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                        Arquivo próprio
                                    </span>
                                ) : (
                                    <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                        Texto próprio
                                    </span>
                                )}
                            </td>

                            <td className="px-5 py-4">
                                {item.ativo ? (
                                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                        Ativo
                                    </span>
                                ) : (
                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                        Arquivado
                                    </span>
                                )}
                            </td>

                            <td className="px-5 py-4">
                                <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={() => onDelete(item)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:text-red-600 disabled:opacity-40"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function WorkflowTemplates({
    workflows,
    deleting,
    onCreate,
    onEdit,
    onDelete,
}: {
    workflows: ChecklistProcessTemplate[];

    deleting: boolean;

    onCreate: () => void;

    onEdit: (workflow: ChecklistProcessTemplate) => void;

    onDelete: (workflow: ChecklistProcessTemplate) => Promise<void>;
}) {
    if (workflows.length === 0) {
        return (
            <div className="px-6 py-20 text-center">
                <GitBranch className="mx-auto h-12 w-12 text-slate-300" />

                <h3 className="mt-4 font-semibold text-slate-900">
                    Ainda não existem workflows
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                    Crie um fluxo operacional para depois vinculá-lo a um tipo
                    de contrato.
                </p>

                <button
                    type="button"
                    onClick={onCreate}
                    className="mt-5 h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                >
                    Criar workflow
                </button>
            </div>
        );
    }

    return (
        <div className="grid gap-4 p-5 lg:grid-cols-2">
            {workflows.map((workflow) => (
                <div
                    key={workflow.id}
                    className="rounded-2xl border border-slate-200 p-5"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-slate-900">
                                    {workflow.nome}
                                </h3>

                                <span
                                    className={[
                                        "rounded-full px-2 py-0.5 text-xs font-medium",

                                        workflow.ativo
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-100 text-slate-500",
                                    ].join(" ")}
                                >
                                    {workflow.ativo ? "Ativo" : "Inativo"}
                                </span>

                                {workflow.preset_codigo && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                        <Sparkles className="h-3 w-3" />
                                        FrotaPro
                                        {workflow.preset_versao
                                            ? ` v${workflow.preset_versao}`
                                            : ""}
                                    </span>
                                )}
                            </div>

                            <p className="mt-1 font-mono text-xs text-slate-400">
                                {workflow.codigo} · v{workflow.versao}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onEdit(workflow)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:text-indigo-600"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>

                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => onDelete(workflow)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:text-red-600 disabled:opacity-40"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {workflow.descricao && (
                        <p className="mt-3 text-sm text-slate-500">
                            {workflow.descricao}
                        </p>
                    )}

                    <div className="mt-4 space-y-2">
                        {workflow.items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                            >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-500">
                                    {item.ordem}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-slate-800">
                                        {item.titulo}
                                    </div>

                                    <div className="text-xs text-slate-400">
                                        {itemTypeLabels[item.tipo]}

                                        {item.obrigatorio
                                            ? " · obrigatório"
                                            : " · opcional"}
                                    </div>
                                </div>

                                <WorkflowItemMeta item={item} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function WorkflowItemMeta({
    item,
}: {
    item: ChecklistProcessTemplate["items"][number];
}) {
    if (item.tipo === "assinatura" && item.configuracao.placeholder) {
        return (
            <span className="text-xs font-medium text-indigo-600">
                {signatureLabels[item.configuracao.placeholder]}
            </span>
        );
    }

    if (item.tipo === "acao_sistema" && item.configuracao.action) {
        return (
            <span className="text-right text-xs font-medium text-blue-600">
                {systemActionLabels[item.configuracao.action]}
            </span>
        );
    }

    if (item.tipo === "checklist_veiculo" && item.configuracao.checklist_tipo) {
        return (
            <span className="text-xs font-medium text-amber-700">
                {vehicleChecklistLabels[item.configuracao.checklist_tipo]}
            </span>
        );
    }

    if (
        item.tipo === "contrato_relacionado" &&
        item.configuracao.tipo_contrato_codigo
    ) {
        return (
            <span className="text-right text-xs font-medium text-violet-600">
                {item.configuracao.tipo_contrato_codigo}
            </span>
        );
    }

    return null;
}

function WorkflowFormModal({
    record,
    onClose,
    onSaved,
}: {
    record: ChecklistProcessTemplate | null;

    onClose: () => void;

    onSaved: () => Promise<void>;
}) {
    const contractTypesQuery =
        useContractTypes({
            enabled: true,
        });

    const contractTypes =
        contractTypesQuery.data ??
        [];

    const [name, setName] = useState(record?.nome ?? "");

    const [code, setCode] = useState(record?.codigo ?? "");

    const [description, setDescription] = useState(record?.descricao ?? "");

    const [active, setActive] = useState(record?.ativo ?? true);

    const [items, setItems] = useState<ChecklistProcessItemPayload[]>(
        record?.items.map((item) => ({
            codigo: item.codigo,

            ordem: item.ordem,

            titulo: item.titulo,

            descricao: item.descricao,

            tipo: item.tipo,

            obrigatorio: item.obrigatorio,

            configuracao: {
                ...item.configuracao,
            },
        })) ?? [emptyItem(1)],
    );

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState<string | null>(null);

    function patchItem(
        index: number,
        patch: Partial<ChecklistProcessItemPayload>,
    ) {
        setItems((current) =>
            current.map((item, currentIndex) =>
                currentIndex === index
                    ? {
                          ...item,
                          ...patch,
                      }
                    : item,
            ),
        );
    }

    function addItem() {
        setItems((current) => [...current, emptyItem(current.length + 1)]);
    }

    function removeItem(index: number) {
        setItems((current) =>
            current
                .filter((_, currentIndex) => currentIndex !== index)
                .map((item, currentIndex) => ({
                    ...item,

                    ordem: currentIndex + 1,
                })),
        );
    }

    function changeItemType(index: number, type: ChecklistProcessItemType) {
        const configuracao: ChecklistProcessItemPayload["configuracao"] = {};

        if (type === "assinatura") {
            configuracao.placeholder = "ASSINATURA_MOTORISTA";
        }

        if (type === "acao_sistema") {
            configuracao.action = "motorista_acesso";
        }

        if (type === "checklist_veiculo") {
            configuracao.checklist_tipo = "entrega";
        }

        if (type === "contrato_relacionado") {
            const defaultType =
                contractTypes[0];

            configuracao.tipo_contrato_id =
                defaultType?.id;

            configuracao.tipo_contrato_codigo =
                defaultType?.codigo;

            configuracao.status_conclusao =
                "assinado";
        }

        patchItem(index, {
            tipo: type,

            configuracao,
        });
    }

    function validate(): string | null {
        if (!name.trim() || !code.trim()) {
            return "Preencha o nome e o código.";
        }

        if (!/^[a-z0-9_]+$/.test(code.trim())) {
            return "O código do workflow pode conter apenas letras minúsculas, números e underscore.";
        }

        if (items.length === 0) {
            return "Adicione pelo menos uma etapa.";
        }

        for (const [index, item] of items.entries()) {
            if (!item.titulo.trim()) {
                return `Informe o título da etapa ${index + 1}.`;
            }

            if (!item.codigo.trim()) {
                return `Informe o código da etapa ${index + 1}.`;
            }

            if (item.tipo === "assinatura" && !item.configuracao.placeholder) {
                return `Selecione o signatário da etapa ${index + 1}.`;
            }

            if (item.tipo === "acao_sistema" && !item.configuracao.action) {
                return `Selecione a ação do sistema da etapa ${index + 1}.`;
            }

            if (
                item.tipo === "checklist_veiculo" &&
                !item.configuracao.checklist_tipo
            ) {
                return `Selecione o tipo de checklist do veículo da etapa ${index + 1}.`;
            }

            if (
                item.tipo ===
                    "contrato_relacionado" &&
                !item.configuracao
                    .tipo_contrato_id
            ) {
                return `Selecione o tipo de contrato relacionado da etapa ${index + 1}.`;
            }
        }

        return null;
    }

    async function submit() {
        setError(null);

        const validation = validate();

        if (validation) {
            setError(validation);

            return;
        }

        setSaving(true);

        const payload: ChecklistProcessTemplatePayload = {
            codigo: code.trim(),

            nome: name.trim(),

            descricao: description.trim() || null,

            ativo: active,

            items: items.map((item, index) => ({
                codigo: item.codigo.trim(),

                ordem: index + 1,

                titulo: item.titulo.trim(),

                descricao: item.descricao?.trim() || null,

                tipo: item.tipo,

                obrigatorio: item.obrigatorio,

                configuracao: normalizeItemConfiguration(item),
            })),
        };

        try {
            if (record) {
                await api.patch(
                    `/api/checklist-process-templates/${record.id}`,
                    payload,
                );
            } else {
                await api.post("/api/checklist-process-templates", payload);
            }

            await onSaved();
        } catch (requestError) {
            setError(
                errorMessage(
                    requestError,
                    "Não foi possível guardar o workflow.",
                ),
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            title={record ? "Editar workflow" : "Novo workflow"}
            onClose={onClose}
            size="max-w-5xl"
        >
            <div className="space-y-6 p-6">
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Nome"
                        value={name}
                        onChange={setName}
                        placeholder="Fluxo de aluguer"
                    />

                    <Field
                        label="Código"
                        value={code}
                        onChange={(value) =>
                            setCode(
                                value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9_]/g, "_")
                                    .replace(/_+/g, "_"),
                            )
                        }
                        placeholder="fluxo_aluguer"
                    />
                </div>

                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                        Descrição
                    </span>

                    <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                </label>

                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(event) => setActive(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />

                    <span className="text-sm font-medium text-slate-700">
                        Workflow ativo
                    </span>
                </label>

                <div>
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-slate-900">
                                Etapas
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Estas etapas serão copiadas como snapshot quando
                                o processo do contrato for iniciado.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={addItem}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            Etapa
                        </button>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-500">
                                        {index + 1}
                                    </div>

                                    <div className="grid flex-1 gap-4 md:grid-cols-2">
                                        <Field
                                            label="Título"
                                            value={item.titulo}
                                            onChange={(value) =>
                                                patchItem(index, {
                                                    titulo: value,
                                                })
                                            }
                                            placeholder="Assinar contrato"
                                        />

                                        <Field
                                            label="Código"
                                            value={item.codigo}
                                            onChange={(value) =>
                                                patchItem(index, {
                                                    codigo: value
                                                        .toLowerCase()
                                                        .replace(
                                                            /[^a-z0-9_]/g,
                                                            "_",
                                                        )
                                                        .replace(/_+/g, "_"),
                                                })
                                            }
                                            placeholder="assinar_contrato"
                                        />

                                        <SelectField
                                            label="Tipo"
                                            value={item.tipo}
                                            onChange={(value) =>
                                                changeItemType(
                                                    index,
                                                    value as ChecklistProcessItemType,
                                                )
                                            }
                                        >
                                            {Object.entries(itemTypeLabels).map(
                                                ([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ),
                                            )}
                                        </SelectField>

                                        {item.tipo === "assinatura" && (
                                            <SelectField
                                                label="Signatário"
                                                value={
                                                    item.configuracao
                                                        .placeholder ?? ""
                                                }
                                                onChange={(value) =>
                                                    patchItem(index, {
                                                        configuracao: {
                                                            ...item.configuracao,

                                                            placeholder:
                                                                value as SignaturePlaceholder,
                                                        },
                                                    })
                                                }
                                            >
                                                {Object.entries(
                                                    signatureLabels,
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </SelectField>
                                        )}

                                        {item.tipo === "acao_sistema" && (
                                            <SelectField
                                                label="Ação do sistema"
                                                value={
                                                    item.configuracao.action ??
                                                    ""
                                                }
                                                onChange={(value) =>
                                                    patchItem(index, {
                                                        configuracao: {
                                                            ...item.configuracao,

                                                            action: value as ChecklistSystemAction,
                                                        },
                                                    })
                                                }
                                            >
                                                {Object.entries(
                                                    systemActionLabels,
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </SelectField>
                                        )}

                                        {item.tipo === "checklist_veiculo" && (
                                            <SelectField
                                                label="Checklist"
                                                value={
                                                    item.configuracao
                                                        .checklist_tipo ?? ""
                                                }
                                                onChange={(value) =>
                                                    patchItem(index, {
                                                        configuracao: {
                                                            ...item.configuracao,

                                                            checklist_tipo:
                                                                value as ChecklistVehicleType,
                                                        },
                                                    })
                                                }
                                            >
                                                {Object.entries(
                                                    vehicleChecklistLabels,
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </SelectField>
                                        )}

                                        {item.tipo ===
                                            "contrato_relacionado" && (
                                            <>
                                                <SelectField
                                                    label="Tipo de contrato"
                                                    value={
                                                        item.configuracao
                                                            .tipo_contrato_id ??
                                                        ""
                                                    }
                                                    onChange={(value) => {
                                                        const selected =
                                                            contractTypes.find(
                                                                (type) =>
                                                                    type.id ===
                                                                    value,
                                                            );

                                                        patchItem(index, {
                                                            configuracao: {
                                                                ...item.configuracao,

                                                                tipo_contrato_id:
                                                                    selected?.id,

                                                                tipo_contrato_codigo:
                                                                    selected?.codigo,
                                                            },
                                                        });
                                                    }}
                                                >
                                                    <option value="">
                                                        Selecionar tipo de contrato
                                                    </option>

                                                    {contractTypes.map(
                                                        (type) => (
                                                            <option
                                                                key={
                                                                    type.id
                                                                }
                                                                value={
                                                                    type.id
                                                                }
                                                            >
                                                                {
                                                                    type.nome
                                                                }{" "}
                                                                ({type.codigo})
                                                            </option>
                                                        ),
                                                    )}
                                                </SelectField>

                                                <SelectField
                                                    label="Concluir quando"
                                                    value={
                                                        String(
                                                            item.configuracao
                                                                .status_conclusao ??
                                                                "assinado",
                                                        )
                                                    }
                                                    onChange={(value) =>
                                                        patchItem(index, {
                                                            configuracao: {
                                                                ...item.configuracao,

                                                                status_conclusao:
                                                                    value as "criado" | "assinado" | "encerrado",
                                                            },
                                                        })
                                                    }
                                                >
                                                    <option value="criado">
                                                        Contrato criado
                                                    </option>

                                                    <option value="assinado">
                                                        Contrato assinado
                                                    </option>

                                                    <option value="encerrado">
                                                        Contrato encerrado
                                                    </option>
                                                </SelectField>
                                            </>
                                        )}

                                        <label className="md:col-span-2">
                                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                                Descrição
                                            </span>

                                            <textarea
                                                value={item.descricao ?? ""}
                                                onChange={(event) =>
                                                    patchItem(index, {
                                                        descricao:
                                                            event.target.value,
                                                    })
                                                }
                                                rows={2}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                                            />
                                        </label>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        disabled={items.length === 1}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:text-red-600 disabled:opacity-30"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="mt-4 pl-11">
                                    <label className="flex items-center gap-2 text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={item.obrigatorio}
                                            onChange={(event) =>
                                                patchItem(index, {
                                                    obrigatorio:
                                                        event.target.checked,
                                                })
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                        />
                                        Etapa obrigatória
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    onClick={submit}
                    disabled={saving}
                    className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {saving && (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    Guardar workflow
                </button>
            </div>
        </Modal>
    );
}

function normalizeItemConfiguration(
    item: ChecklistProcessItemPayload,
): ChecklistProcessItemPayload["configuracao"] {
    if (item.tipo === "assinatura") {
        return {
            placeholder: item.configuracao.placeholder,
        };
    }

    if (item.tipo === "acao_sistema") {
        return {
            action: item.configuracao.action,
        };
    }

    if (item.tipo === "checklist_veiculo") {
        return {
            checklist_tipo: item.configuracao.checklist_tipo,
        };
    }

    if (item.tipo === "contrato_relacionado") {
        return {
            tipo_contrato_id:
                item.configuracao.tipo_contrato_id,

            tipo_contrato_codigo:
                item.configuracao.tipo_contrato_codigo,

            status_conclusao:
                item.configuracao.status_conclusao ??
                "assinado",
        };
    }

    return {};
}

function ImportModal({
    profiles,
    onClose,
    onSaved,
}: {
    profiles: PerfilTemplate[];

    onClose: () => void;

    onSaved: () => Promise<void>;
}) {
    const [name, setName] = useState("");

    const [profileId, setProfileId] = useState("");

    const [file, setFile] = useState<File | null>(null);

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState<string | null>(null);

    async function submit() {
        if (!name.trim() || !file) {
            setError("Informe o nome e selecione o arquivo.");

            return;
        }

        setSaving(true);

        setError(null);

        const form = new FormData();

        form.append("nome", name.trim());

        form.append("arquivo", file);

        if (profileId) {
            form.append("perfil_id", profileId);
        }

        try {
            await api.post("/api/templates-contrato/importar", form, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            await onSaved();
        } catch (requestError) {
            setError(
                errorMessage(
                    requestError,
                    "Não foi possível importar o modelo.",
                ),
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            title="Importar modelo de documento"
            onClose={onClose}
            size="max-w-lg"
        >
            <div className="space-y-4 p-6">
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <Field
                    label="Nome"
                    value={name}
                    onChange={setName}
                    placeholder="Contrato de aluguer"
                />

                <SelectField
                    label="Perfil"
                    value={profileId}
                    onChange={setProfileId}
                >
                    <option value="">Sem perfil</option>

                    {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                            {profile.nome}
                        </option>
                    ))}
                </SelectField>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Arquivo
                    </label>

                    <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(event) =>
                            setFile(event.target.files?.[0] ?? null)
                        }
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                        PDF, DOCX ou TXT. Máximo 10 MB.
                    </p>
                </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    onClick={submit}
                    disabled={saving}
                    className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {saving && (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    Importar modelo
                </button>
            </div>
        </Modal>
    );
}

function Modal({
    title,
    onClose,
    size,
    children,
}: {
    title: string;
    onClose: () => void;
    size: string;
    children: ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div
                className={[
                    "relative max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl",
                    size,
                ].join(" ")}
            >
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <h2 className="text-lg font-semibold text-slate-950">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {children}
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;

    onChange: (value: string) => void;

    placeholder?: string;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </span>

            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
        </label>
    );
}

function SelectField({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;

    onChange: (value: string) => void;

    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </span>

            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
                {children}
            </select>
        </label>
    );
}

function Th({ children }: { children: string }) {
    return (
        <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
