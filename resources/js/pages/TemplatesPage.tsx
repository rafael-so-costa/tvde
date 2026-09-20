import axios from 'axios';
import {
    useMemo,
    useState,
} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    FileStack,
    FileText,
    GitBranch,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import api from '../lib/api';
import {
    useTenant,
} from '../contexts/TenantContext';
import type {
    ChecklistProcessItemPayload,
    ChecklistProcessItemType,
    ChecklistProcessTemplate,
    ChecklistProcessTemplatePayload,
    PerfilTemplate,
    SignaturePlaceholder,
    TemplateContrato,
} from '../types/template';

type Tab =
    | 'documentos'
    | 'processos';

const itemTypeLabels:
    Record<
        ChecklistProcessItemType,
        string
    > = {
        tarefa: 'Tarefa',
        preenchimento:
            'Preenchimento',
        assinatura:
            'Assinatura',
        upload:
            'Upload',
        aprovacao:
            'Aprovação',
        gerar_documento:
            'Gerar documento',
        checklist_veiculo:
            'Checklist do veículo',
        validacao:
            'Validação',
    };

const signatureLabels:
    Record<
        SignaturePlaceholder,
        string
    > = {
        ASSINATURA_MOTORISTA:
            'Motorista',
        ASSINATURA_PROPRIETARIO:
            'Proprietário',
        ASSINATURA_EMPRESA:
            'Empresa',
        ASSINATURA_TESTEMUNHA:
            'Testemunha',
    };

function errorMessage(
    error: unknown,
    fallback: string
): string {
    if (
        axios.isAxiosError(
            error
        )
    ) {
        const errors =
            error.response?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                'object'
        ) {
            const first =
                Object.values(
                    errors
                )
                    .flat()
                    .find(
                        (
                            value
                        ) =>
                            typeof value ===
                            'string'
                    );

            if (
                typeof first ===
                'string'
            ) {
                return first;
            }
        }

        return (
            error.response?.data
                ?.message ??
            fallback
        );
    }

    return fallback;
}

function emptyItem(
    order: number
): ChecklistProcessItemPayload {
    return {
        codigo: '',
        ordem: order,
        titulo: '',
        descricao: null,
        tipo: 'tarefa',
        obrigatorio: true,
        configuracao: {},
    };
}

export default function TemplatesPage() {
    const {
        tenant,
    } = useTenant();

    const queryClient =
        useQueryClient();

    const [
        tab,
        setTab,
    ] = useState<Tab>(
        'documentos'
    );

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        processForm,
        setProcessForm,
    ] =
        useState<ChecklistProcessTemplate | null | undefined>(
            undefined
        );

    const [
        importOpen,
        setImportOpen,
    ] = useState(false);

    const profilesQuery =
        useQuery({
            queryKey: [
                'template-profiles',
                tenant?.id,
            ],
            enabled:
                Boolean(
                    tenant?.id
                ),
            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/perfis-template'
                        );

                    return response
                        .data
                        .data as PerfilTemplate[];
                },
        });

    const templatesQuery =
        useQuery({
            queryKey: [
                'templates',
                tenant?.id,
            ],
            enabled:
                Boolean(
                    tenant?.id
                ),
            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/templates-contrato'
                        );

                    return response
                        .data
                        .data as TemplateContrato[];
                },
        });

    const processesQuery =
        useQuery({
            queryKey: [
                'process-templates',
                tenant?.id,
            ],
            enabled:
                Boolean(
                    tenant?.id
                ),
            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/checklist-process-templates'
                        );

                    return response
                        .data
                        .data as ChecklistProcessTemplate[];
                },
        });

    const deleteProcessMutation =
        useMutation({
            mutationFn:
                async (
                    id: string
                ) => {
                    await api.delete(
                        `/api/checklist-process-templates/${id}`
                    );
                },

            onSuccess:
                async () => {
                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                'process-templates',
                                tenant?.id,
                            ],
                        });
                },
        });

    const deleteTemplateMutation =
        useMutation({
            mutationFn:
                async (
                    id: string
                ) => {
                    await api.delete(
                        `/api/templates-contrato/${id}`
                    );
                },

            onSuccess:
                async () => {
                    await Promise.all([
                        queryClient
                            .invalidateQueries({
                                queryKey: [
                                    'templates',
                                    tenant?.id,
                                ],
                            }),

                        queryClient
                            .invalidateQueries({
                                queryKey: [
                                    'template-profiles',
                                    tenant?.id,
                                ],
                            }),
                    ]);
                },
        });

    const assignProcessMutation =
        useMutation({
            mutationFn:
                async ({
                    templateId,
                    processId,
                }: {
                    templateId: string;
                    processId:
                        string | null;
                }) => {
                    const response =
                        await api.patch(
                            `/api/templates-contrato/${templateId}`,
                            {
                                checklist_process_template_id:
                                    processId,
                            }
                        );

                    return response
                        .data
                        .data as TemplateContrato;
                },

            onSuccess:
                async () => {
                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                'templates',
                                tenant?.id,
                            ],
                        });
                },
        });

    const templates =
        useMemo(() => {
            const data =
                templatesQuery
                    .data ??
                [];

            const term =
                search
                    .trim()
                    .toLocaleLowerCase(
                        'pt-PT'
                    );

            if (!term) {
                return data;
            }

            return data.filter(
                (item) =>
                    [
                        item.nome,
                        item
                            .tipo_arquivo,
                        item.perfil
                            ?.nome,
                        item
                            .checklist_process_template
                            ?.nome,
                    ]
                        .filter(
                            Boolean
                        )
                        .some(
                            (
                                value
                            ) =>
                                String(
                                    value
                                )
                                    .toLocaleLowerCase(
                                        'pt-PT'
                                    )
                                    .includes(
                                        term
                                    )
                        )
            );
        }, [
            templatesQuery.data,
            search,
        ]);

    const processes =
        useMemo(() => {
            const data =
                processesQuery
                    .data ??
                [];

            const term =
                search
                    .trim()
                    .toLocaleLowerCase(
                        'pt-PT'
                    );

            if (!term) {
                return data;
            }

            return data.filter(
                (item) =>
                    [
                        item.nome,
                        item.codigo,
                        item.descricao,
                    ]
                        .filter(
                            Boolean
                        )
                        .some(
                            (
                                value
                            ) =>
                                String(
                                    value
                                )
                                    .toLocaleLowerCase(
                                        'pt-PT'
                                    )
                                    .includes(
                                        term
                                    )
                        )
            );
        }, [
            processesQuery.data,
            search,
        ]);

    if (!tenant) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Escolha uma organização antes de gerir templates.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const loading =
        templatesQuery.isLoading ||
        processesQuery.isLoading ||
        profilesQuery.isLoading;

    const hasError =
        templatesQuery.isError ||
        processesQuery.isError ||
        profilesQuery.isError;

    async function refresh() {
        await Promise.all([
            templatesQuery.refetch(),
            processesQuery.refetch(),
            profilesQuery.refetch(),
        ]);
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        Configuração
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Templates
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Documentos e fluxos operacionais de{' '}
                        <span className="font-medium text-slate-700">
                            {tenant.nome}
                        </span>
                        .
                    </p>
                </div>

                <div className="flex gap-2">
                    {tab ===
                    'documentos' ? (
                        <button
                            type="button"
                            onClick={() =>
                                setImportOpen(
                                    true
                                )
                            }
                            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
                        >
                            <Upload className="w-5 h-5" />
                            Importar template
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                setProcessForm(
                                    null
                                )
                            }
                            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Novo checklist
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    label="Templates"
                    value={
                        templatesQuery
                            .data
                            ?.length ??
                        0
                    }
                />

                <Stat
                    label="Checklists"
                    value={
                        processesQuery
                            .data
                            ?.length ??
                        0
                    }
                />

                <Stat
                    label="Checklists ativos"
                    value={
                        processesQuery
                            .data
                            ?.filter(
                                (
                                    item
                                ) =>
                                    item.ativo
                            )
                            .length ??
                        0
                    }
                />

                <Stat
                    label="Templates vinculados"
                    value={
                        templatesQuery
                            .data
                            ?.filter(
                                (
                                    item
                                ) =>
                                    Boolean(
                                        item.checklist_process_template_id
                                    )
                            )
                            .length ??
                        0
                    }
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-4 sm:px-5 pt-4">
                    <div className="flex gap-6">
                        <TabButton
                            active={
                                tab ===
                                'documentos'
                            }
                            onClick={() =>
                                setTab(
                                    'documentos'
                                )
                            }
                            icon={
                                FileText
                            }
                        >
                            Templates de documentos
                        </TabButton>

                        <TabButton
                            active={
                                tab ===
                                'processos'
                            }
                            onClick={() =>
                                setTab(
                                    'processos'
                                )
                            }
                            icon={
                                GitBranch
                            }
                        >
                            Checklists de processo
                        </TabButton>
                    </div>
                </div>

                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder={
                                tab ===
                                'documentos'
                                    ? 'Pesquisar template...'
                                    : 'Pesquisar checklist...'
                            }
                            className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={
                            refresh
                        }
                        className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Atualizar
                    </button>
                </div>

                {loading ? (
                    <Loading />
                ) : hasError ? (
                    <ErrorState
                        onRetry={
                            refresh
                        }
                    />
                ) : tab ===
                  'documentos' ? (
                    <DocumentTemplates
                        templates={
                            templates
                        }
                        processes={
                            processesQuery
                                .data ??
                            []
                        }
                        assigning={
                            assignProcessMutation
                                .isPending
                        }
                        onAssign={(
                            templateId,
                            processId
                        ) =>
                            assignProcessMutation
                                .mutateAsync({
                                    templateId,
                                    processId,
                                })
                        }
                        onDelete={async (
                            item
                        ) => {
                            if (
                                !window.confirm(
                                    `Eliminar o template "${item.nome}"?`
                                )
                            ) {
                                return;
                            }

                            await deleteTemplateMutation
                                .mutateAsync(
                                    item.id
                                );
                        }}
                        onImport={() =>
                            setImportOpen(
                                true
                            )
                        }
                    />
                ) : (
                    <ProcessTemplates
                        processes={
                            processes
                        }
                        onEdit={(
                            process
                        ) =>
                            setProcessForm(
                                process
                            )
                        }
                        onCreate={() =>
                            setProcessForm(
                                null
                            )
                        }
                        onDelete={async (
                            process
                        ) => {
                            if (
                                !window.confirm(
                                    `Eliminar o checklist "${process.nome}"?`
                                )
                            ) {
                                return;
                            }

                            try {
                                await deleteProcessMutation
                                    .mutateAsync(
                                        process.id
                                    );
                            } catch (
                                error
                            ) {
                                window.alert(
                                    errorMessage(
                                        error,
                                        'Não foi possível eliminar o checklist.'
                                    )
                                );
                            }
                        }}
                    />
                )}
            </div>

            {processForm !==
                undefined && (
                <ProcessFormModal
                    record={
                        processForm
                    }
                    onClose={() =>
                        setProcessForm(
                            undefined
                        )
                    }
                    onSaved={
                        async () => {
                            setProcessForm(
                                undefined
                            );

                            await Promise.all([
                                queryClient
                                    .invalidateQueries({
                                        queryKey: [
                                            'process-templates',
                                            tenant.id,
                                        ],
                                    }),

                                queryClient
                                    .invalidateQueries({
                                        queryKey: [
                                            'templates',
                                            tenant.id,
                                        ],
                                    }),
                            ]);
                        }
                    }
                />
            )}

            {importOpen && (
                <ImportModal
                    profiles={
                        profilesQuery
                            .data ??
                        []
                    }
                    onClose={() =>
                        setImportOpen(
                            false
                        )
                    }
                    onSaved={
                        async () => {
                            setImportOpen(
                                false
                            );

                            await Promise.all([
                                queryClient
                                    .invalidateQueries({
                                        queryKey: [
                                            'templates',
                                            tenant.id,
                                        ],
                                    }),

                                queryClient
                                    .invalidateQueries({
                                        queryKey: [
                                            'template-profiles',
                                            tenant.id,
                                        ],
                                    }),
                            ]);
                        }
                    }
                />
            )}
        </div>
    );
}

function Stat({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
                {value}
            </p>
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
            onClick={
                onClick
            }
            className={[
                'pb-4 border-b-2 text-sm font-semibold flex items-center gap-2 transition',
                active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800',
            ].join(' ')}
        >
            <Icon className="w-4 h-4" />
            {children}
        </button>
    );
}

function Loading() {
    return (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm">
                A carregar...
            </p>
        </div>
    );
}

function ErrorState({
    onRetry,
}: {
    onRetry: () => void;
}) {
    return (
        <div className="py-16 px-6 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />

            <h3 className="font-semibold text-slate-900">
                Não foi possível carregar os templates
            </h3>

            <button
                type="button"
                onClick={
                    onRetry
                }
                className="mt-5 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium"
            >
                Tentar novamente
            </button>
        </div>
    );
}

function DocumentTemplates({
    templates,
    processes,
    assigning,
    onAssign,
    onDelete,
    onImport,
}: {
    templates: TemplateContrato[];
    processes: ChecklistProcessTemplate[];
    assigning: boolean;
    onAssign: (
        templateId: string,
        processId: string | null
    ) => Promise<unknown>;
    onDelete: (
        item: TemplateContrato
    ) => Promise<void>;
    onImport: () => void;
}) {
    if (
        templates.length ===
        0
    ) {
        return (
            <div className="py-20 px-6 text-center">
                <FileStack className="w-12 h-12 mx-auto text-slate-300" />

                <h3 className="mt-4 font-semibold text-slate-900">
                    Ainda não existem templates
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                    Importe um PDF, DOCX ou TXT para começar.
                </p>

                <button
                    type="button"
                    onClick={
                        onImport
                    }
                    className="mt-5 h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
                >
                    Importar template
                </button>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <Th>
                            Template
                        </Th>
                        <Th>
                            Perfil
                        </Th>
                        <Th>
                            Checklist de processo
                        </Th>
                        <Th>
                            Campos
                        </Th>
                        <Th>
                            Ações
                        </Th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {templates.map(
                        (
                            item
                        ) => (
                            <tr
                                key={
                                    item.id
                                }
                                className="hover:bg-slate-50"
                            >
                                <td className="px-5 py-4">
                                    <div className="font-semibold text-sm text-slate-900">
                                        {
                                            item.nome
                                        }
                                    </div>

                                    <div className="mt-1 text-xs uppercase text-slate-400">
                                        {
                                            item.tipo_arquivo
                                        }
                                    </div>
                                </td>

                                <td className="px-5 py-4 text-sm text-slate-600">
                                    {item
                                        .perfil
                                        ?.nome ??
                                        'Sem perfil'}
                                </td>

                                <td className="px-5 py-4 min-w-[280px]">
                                    <div className="relative">
                                        <select
                                            value={
                                                item.checklist_process_template_id ??
                                                ''
                                            }
                                            disabled={
                                                assigning
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                onAssign(
                                                    item.id,
                                                    event
                                                        .target
                                                        .value ||
                                                        null
                                                )
                                            }
                                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                        >
                                            <option value="">
                                                Sem checklist
                                            </option>

                                            {processes
                                                .filter(
                                                    (
                                                        process
                                                    ) =>
                                                        process.ativo
                                                )
                                                .map(
                                                    (
                                                        process
                                                    ) => (
                                                        <option
                                                            key={
                                                                process.id
                                                            }
                                                            value={
                                                                process.id
                                                            }
                                                        >
                                                            {
                                                                process.nome
                                                            }{' '}
                                                            · v
                                                            {
                                                                process.versao
                                                            }
                                                        </option>
                                                    )
                                                )}
                                        </select>

                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    </div>
                                </td>

                                <td className="px-5 py-4 text-sm text-slate-600">
                                    {
                                        item.campos_detectados
                                            ?.length ??
                                        0
                                    }
                                </td>

                                <td className="px-5 py-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onDelete(
                                                item
                                            )
                                        }
                                        className="w-9 h-9 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
}

function ProcessTemplates({
    processes,
    onEdit,
    onCreate,
    onDelete,
}: {
    processes: ChecklistProcessTemplate[];
    onEdit: (
        process: ChecklistProcessTemplate
    ) => void;
    onCreate: () => void;
    onDelete: (
        process: ChecklistProcessTemplate
    ) => Promise<void>;
}) {
    if (
        processes.length ===
        0
    ) {
        return (
            <div className="py-20 px-6 text-center">
                <GitBranch className="w-12 h-12 mx-auto text-slate-300" />

                <h3 className="mt-4 font-semibold text-slate-900">
                    Ainda não existem checklists de processo
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                    Crie o fluxo que cada contrato precisa executar.
                </p>

                <button
                    type="button"
                    onClick={
                        onCreate
                    }
                    className="mt-5 h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
                >
                    Criar checklist
                </button>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-2 gap-4 p-5">
            {processes.map(
                (
                    process
                ) => (
                    <div
                        key={
                            process.id
                        }
                        className="rounded-2xl border border-slate-200 p-5"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-900">
                                        {
                                            process.nome
                                        }
                                    </h3>

                                    <span
                                        className={[
                                            'px-2 py-0.5 rounded-full text-xs font-medium',
                                            process.ativo
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500',
                                        ].join(
                                            ' '
                                        )}
                                    >
                                        {process.ativo
                                            ? 'Ativo'
                                            : 'Inativo'}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs font-mono text-slate-400">
                                    {
                                        process.codigo
                                    }{' '}
                                    · v
                                    {
                                        process.versao
                                    }
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onEdit(
                                            process
                                        )
                                    }
                                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 flex items-center justify-center"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onDelete(
                                            process
                                        )
                                    }
                                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 flex items-center justify-center"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {process.descricao && (
                            <p className="mt-3 text-sm text-slate-500">
                                {
                                    process.descricao
                                }
                            </p>
                        )}

                        <div className="mt-4 space-y-2">
                            {process.items.map(
                                (
                                    item
                                ) => (
                                    <div
                                        key={
                                            item.id
                                        }
                                        className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-center gap-3"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500">
                                            {
                                                item.ordem
                                            }
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-slate-800">
                                                {
                                                    item.titulo
                                                }
                                            </div>

                                            <div className="text-xs text-slate-400">
                                                {
                                                    itemTypeLabels[
                                                        item.tipo
                                                    ]
                                                }
                                                {item.obrigatorio
                                                    ? ' · obrigatório'
                                                    : ' · opcional'}
                                            </div>
                                        </div>

                                        {item.tipo ===
                                            'assinatura' &&
                                            item
                                                .configuracao
                                                .placeholder && (
                                                <span className="text-xs text-indigo-600">
                                                    {
                                                        signatureLabels[
                                                            item
                                                                .configuracao
                                                                .placeholder
                                                        ]
                                                    }
                                                </span>
                                            )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}

function ProcessFormModal({
    record,
    onClose,
    onSaved,
}: {
    record: ChecklistProcessTemplate | null;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [
        name,
        setName,
    ] = useState(
        record?.nome ??
            ''
    );

    const [
        code,
        setCode,
    ] = useState(
        record?.codigo ??
            ''
    );

    const [
        description,
        setDescription,
    ] = useState(
        record?.descricao ??
            ''
    );

    const [
        active,
        setActive,
    ] = useState(
        record?.ativo ??
            true
    );

    const [
        items,
        setItems,
    ] =
        useState<ChecklistProcessItemPayload[]>(
            record?.items.map(
                (
                    item
                ) => ({
                    codigo:
                        item.codigo,
                    ordem:
                        item.ordem,
                    titulo:
                        item.titulo,
                    descricao:
                        item.descricao,
                    tipo:
                        item.tipo,
                    obrigatorio:
                        item.obrigatorio,
                    configuracao:
                        item.configuracao,
                })
            ) ?? [
                emptyItem(
                    1
                ),
            ]
        );

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    function patchItem(
        index: number,
        patch: Partial<ChecklistProcessItemPayload>
    ) {
        setItems(
            (
                current
            ) =>
                current.map(
                    (
                        item,
                        currentIndex
                    ) =>
                        currentIndex ===
                        index
                            ? {
                                  ...item,
                                  ...patch,
                              }
                            : item
                )
        );
    }

    function addItem() {
        setItems(
            (
                current
            ) => [
                ...current,
                emptyItem(
                    current.length +
                        1
                ),
            ]
        );
    }

    function removeItem(
        index: number
    ) {
        setItems(
            (
                current
            ) =>
                current
                    .filter(
                        (
                            _,
                            currentIndex
                        ) =>
                            currentIndex !==
                            index
                    )
                    .map(
                        (
                            item,
                            currentIndex
                        ) => ({
                            ...item,
                            ordem:
                                currentIndex +
                                1,
                        })
                    )
        );
    }

    async function submit() {
        setError(null);

        if (
            !name.trim() ||
            !code.trim()
        ) {
            setError(
                'Preencha o nome e o código.'
            );

            return;
        }

        if (
            items.length ===
            0
        ) {
            setError(
                'Adicione pelo menos uma etapa.'
            );

            return;
        }

        setSaving(true);

        const payload:
            ChecklistProcessTemplatePayload =
            {
                codigo:
                    code.trim(),
                nome:
                    name.trim(),
                descricao:
                    description.trim() ||
                    null,
                ativo:
                    active,
                items:
                    items.map(
                        (
                            item,
                            index
                        ) => ({
                            ...item,
                            ordem:
                                index +
                                1,
                            codigo:
                                item.codigo.trim(),
                            titulo:
                                item.titulo.trim(),
                            descricao:
                                item.descricao
                                    ?.trim() ||
                                null,
                            configuracao:
                                item.tipo ===
                                    'assinatura'
                                    ? item.configuracao
                                    : {},
                        })
                    ),
            };

        try {
            if (record) {
                await api.patch(
                    `/api/checklist-process-templates/${record.id}`,
                    payload
                );
            } else {
                await api.post(
                    '/api/checklist-process-templates',
                    payload
                );
            }

            await onSaved();
        } catch (
            requestError
        ) {
            setError(
                errorMessage(
                    requestError,
                    'Não foi possível guardar o checklist.'
                )
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            title={
                record
                    ? 'Editar checklist de processo'
                    : 'Novo checklist de processo'
            }
            onClose={
                onClose
            }
            size="max-w-4xl"
        >
            <div className="p-6 space-y-6">
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                        label="Nome"
                        value={
                            name
                        }
                        onChange={
                            setName
                        }
                        placeholder="Contrato de aluguer"
                    />

                    <Field
                        label="Código"
                        value={
                            code
                        }
                        onChange={(
                            value
                        ) =>
                            setCode(
                                value
                                    .toLowerCase()
                                    .replace(
                                        /[^a-z0-9_]/g,
                                        '_'
                                    )
                            )
                        }
                        placeholder="contrato_aluguer"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Descrição
                    </label>

                    <textarea
                        value={
                            description
                        }
                        onChange={(
                            event
                        ) =>
                            setDescription(
                                event
                                    .target
                                    .value
                            )
                        }
                        rows={
                            2
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                </div>

                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={
                            active
                        }
                        onChange={(
                            event
                        ) =>
                            setActive(
                                event
                                    .target
                                    .checked
                            )
                        }
                    />

                    <span className="text-sm font-medium text-slate-700">
                        Checklist ativo
                    </span>
                </label>

                <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                            <h3 className="font-semibold text-slate-900">
                                Etapas
                            </h3>

                            <p className="text-sm text-slate-500">
                                A ordem abaixo será copiada para cada contrato.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                addItem
                            }
                            className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Etapa
                        </button>
                    </div>

                    <div className="space-y-3">
                        {items.map(
                            (
                                item,
                                index
                            ) => (
                                <div
                                    key={
                                        index
                                    }
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-500">
                                            {index +
                                                1}
                                        </div>

                                        <div className="flex-1 grid sm:grid-cols-2 gap-3">
                                            <Field
                                                label="Título"
                                                value={
                                                    item.titulo
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    patchItem(
                                                        index,
                                                        {
                                                            titulo:
                                                                value,
                                                        }
                                                    )
                                                }
                                                placeholder="Validar dados"
                                            />

                                            <Field
                                                label="Código"
                                                value={
                                                    item.codigo
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    patchItem(
                                                        index,
                                                        {
                                                            codigo:
                                                                value
                                                                    .toLowerCase()
                                                                    .replace(
                                                                        /[^a-z0-9_]/g,
                                                                        '_'
                                                                    ),
                                                        }
                                                    )
                                                }
                                                placeholder="validar_dados"
                                            />

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    Tipo
                                                </label>

                                                <select
                                                    value={
                                                        item.tipo
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        patchItem(
                                                            index,
                                                            {
                                                                tipo:
                                                                    event
                                                                        .target
                                                                        .value as ChecklistProcessItemType,

                                                                configuracao:
                                                                    {},
                                                            }
                                                        )
                                                    }
                                                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                                >
                                                    {Object.entries(
                                                        itemTypeLabels
                                                    ).map(
                                                        ([
                                                            value,
                                                            label,
                                                        ]) => (
                                                            <option
                                                                key={
                                                                    value
                                                                }
                                                                value={
                                                                    value
                                                                }
                                                            >
                                                                {
                                                                    label
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>

                                            {item.tipo ===
                                                'assinatura' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                                        Signatário
                                                    </label>

                                                    <select
                                                        value={
                                                            item
                                                                .configuracao
                                                                .placeholder ??
                                                            ''
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            patchItem(
                                                                index,
                                                                {
                                                                    configuracao:
                                                                        {
                                                                            placeholder:
                                                                                event
                                                                                    .target
                                                                                    .value as SignaturePlaceholder,
                                                                        },
                                                                }
                                                            )
                                                        }
                                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                                    >
                                                        <option value="">
                                                            Selecionar...
                                                        </option>

                                                        {Object.entries(
                                                            signatureLabels
                                                        ).map(
                                                            ([
                                                                value,
                                                                label,
                                                            ]) => (
                                                                <option
                                                                    key={
                                                                        value
                                                                    }
                                                                    value={
                                                                        value
                                                                    }
                                                                >
                                                                    {
                                                                        label
                                                                    }
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeItem(
                                                    index
                                                )
                                            }
                                            disabled={
                                                items.length ===
                                                1
                                            }
                                            className="w-9 h-9 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-600 disabled:opacity-30 flex items-center justify-center"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="mt-3 pl-11 flex items-center gap-3">
                                        <label className="flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    item.obrigatorio
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    patchItem(
                                                        index,
                                                        {
                                                            obrigatorio:
                                                                event
                                                                    .target
                                                                    .checked,
                                                        }
                                                    )
                                                }
                                            />
                                            Obrigatória
                                        </label>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={
                        onClose
                    }
                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    onClick={
                        submit
                    }
                    disabled={
                        saving
                    }
                    className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                    {saving && (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                    )}

                    Guardar
                </button>
            </div>
        </Modal>
    );
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
    const [
        name,
        setName,
    ] = useState('');

    const [
        profileId,
        setProfileId,
    ] = useState('');

    const [
        file,
        setFile,
    ] =
        useState<File | null>(
            null
        );

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    async function submit() {
        if (
            !name.trim() ||
            !file
        ) {
            setError(
                'Informe o nome e selecione o arquivo.'
            );

            return;
        }

        setSaving(true);
        setError(null);

        const form =
            new FormData();

        form.append(
            'nome',
            name.trim()
        );

        form.append(
            'arquivo',
            file
        );

        if (profileId) {
            form.append(
                'perfil_id',
                profileId
            );
        }

        try {
            await api.post(
                '/api/templates-contrato/importar',
                form,
                {
                    headers: {
                        'Content-Type':
                            'multipart/form-data',
                    },
                }
            );

            await onSaved();
        } catch (
            requestError
        ) {
            setError(
                errorMessage(
                    requestError,
                    'Não foi possível importar o template.'
                )
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            title="Importar template"
            onClose={
                onClose
            }
            size="max-w-lg"
        >
            <div className="p-6 space-y-4">
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <Field
                    label="Nome"
                    value={
                        name
                    }
                    onChange={
                        setName
                    }
                    placeholder="Contrato de aluguer"
                />

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Perfil
                    </label>

                    <select
                        value={
                            profileId
                        }
                        onChange={(
                            event
                        ) =>
                            setProfileId(
                                event
                                    .target
                                    .value
                            )
                        }
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                        <option value="">
                            Sem perfil
                        </option>

                        {profiles.map(
                            (
                                profile
                            ) => (
                                <option
                                    key={
                                        profile.id
                                    }
                                    value={
                                        profile.id
                                    }
                                >
                                    {
                                        profile.nome
                                    }
                                </option>
                            )
                        )}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Arquivo
                    </label>

                    <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(
                            event
                        ) =>
                            setFile(
                                event
                                    .target
                                    .files?.[
                                    0
                                ] ??
                                    null
                            )
                        }
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                        PDF, DOCX ou TXT. Máximo 10 MB.
                    </p>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={
                        onClose
                    }
                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    onClick={
                        submit
                    }
                    disabled={
                        saving
                    }
                    className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                    {saving && (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                    )}

                    Importar
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
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                onClick={
                    onClose
                }
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div
                className={[
                    'relative w-full max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl',
                    size,
                ].join(' ')}
            >
                <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-950">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                    >
                        <X className="w-5 h-5" />
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
    onChange: (
        value: string
    ) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}
            </label>

            <input
                value={
                    value
                }
                onChange={(
                    event
                ) =>
                    onChange(
                        event
                            .target
                            .value
                    )
                }
                placeholder={
                    placeholder
                }
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
        </div>
    );
}

function Th({
    children,
}: {
    children: string;
}) {
    return (
        <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
