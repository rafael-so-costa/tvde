import axios from "axios";
import type {
    ReactNode,
} from "react";
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    AlertCircle,
    ArrowLeft,
    Check,
    FileStack,
    LoaderCircle,
    Plus,
    Save,
    Trash2,
    Workflow,
} from "lucide-react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";
import api from "../lib/api";
import {
    useTenant,
} from "../contexts/TenantContext";
import {
    useContractType,
} from "../hooks/useContractTypes";
import {
    useCurrentPermissions,
} from "../hooks/useCurrentPermissions";
import type {
    ChecklistProcessTemplate,
    SignaturePlaceholder,
    TemplateContrato,
} from "../types/template";
import type {
    TipoContrato,
    TipoContratoCampoConfiguracao,
} from "../types/tipo-contrato";

type SignatureForm = {
    enabled: boolean;
    obrigatoria: boolean;
    presencial: boolean;
    remota: boolean;
};

interface FormState {
    nome: string;
    slug: string;
    codigo: string;
    descricao: string;

    template_id: string;
    checklist_process_template_id: string;

    entidades: {
        empresa: boolean;
        proprietario: boolean;
        motorista: boolean;
        veiculo: boolean;
    };

    campos_configuracao:
        TipoContratoCampoConfiguracao[];

    assinaturas:
        Record<
            SignaturePlaceholder,
            SignatureForm
        >;

    associar_motorista_veiculo:
        boolean;

    ativo: boolean;
    mostrar_menu: boolean;

    ordem: string;
}

const placeholders:
    SignaturePlaceholder[] = [
        "ASSINATURA_MOTORISTA",
        "ASSINATURA_PROPRIETARIO",
        "ASSINATURA_EMPRESA",
        "ASSINATURA_TESTEMUNHA",
        "ASSINATURA_TITULAR",
    ];

const signatureLabels:
    Record<
        SignaturePlaceholder,
        string
    > = {
        ASSINATURA_MOTORISTA:
            "Motorista",

        ASSINATURA_PROPRIETARIO:
            "Proprietário",

        ASSINATURA_EMPRESA:
            "Empresa",

        ASSINATURA_TESTEMUNHA:
            "Testemunha",
        ASSINATURA_TITULAR: "Titular dos dados",
    };

function blankSignatures():
    Record<
        SignaturePlaceholder,
        SignatureForm
    > {
    return {
        ASSINATURA_MOTORISTA: {
            enabled: false,
            obrigatoria: true,
            presencial: true,
            remota: true,
        },

        ASSINATURA_PROPRIETARIO: {
            enabled: false,
            obrigatoria: true,
            presencial: true,
            remota: true,
        },

        ASSINATURA_EMPRESA: {
            enabled: false,
            obrigatoria: true,
            presencial: true,
            remota: true,
        },

        ASSINATURA_TESTEMUNHA: {
            enabled: false,
            obrigatoria: true,
            presencial: true,
            remota: true,
        },
        ASSINATURA_TITULAR: {
            enabled: false,
            obrigatoria: true,
            presencial: true,
            remota: true,
        },
    };
}

function blankForm():
    FormState {
    return {
        nome: "",
        slug: "",
        codigo: "",
        descricao: "",

        template_id: "",
        checklist_process_template_id:
            "",

        entidades: {
            empresa: false,
            proprietario: false,
            motorista: false,
            veiculo: false,
        },

        campos_configuracao:
            [],

        assinaturas:
            blankSignatures(),

        associar_motorista_veiculo:
            false,

        ativo: true,
        mostrar_menu: true,

        ordem: "0",
    };
}

function errorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        axios.isAxiosError(error)
    ) {
        const errors =
            error.response?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                "object"
        ) {
            const first =
                Object.values(
                    errors,
                )
                    .flat()
                    .find(
                        (value) =>
                            typeof value ===
                            "string",
                    );

            if (
                typeof first ===
                "string"
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

export default function ContratoTipoPage() {
    const {
        tenant,
    } = useTenant();

    const {
        id,
    } =
        useParams<{
            id: string;
        }>();

    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const {
        can,
    } =
        useCurrentPermissions();

    const editing =
        Boolean(
            id &&
                id !==
                    "novo",
        );

    const canConfigure =
        can(
            "contratos",
            "configurar",
        );

    const [
        form,
        setForm,
    ] =
        useState<FormState>(
            blankForm(),
        );

    const [
        baseConfiguration,
        setBaseConfiguration,
    ] =
        useState<
            Record<
                string,
                unknown
            >
        >({});

    const [
        slugTouched,
        setSlugTouched,
    ] =
        useState(false);

    const [
        codeTouched,
        setCodeTouched,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    const [
        success,
        setSuccess,
    ] =
        useState<
            string | null
        >(null);

    const typeQuery =
        useContractType(
            editing
                ? id ?? null
                : null,
            editing,
        );

    const templatesQuery =
        useQuery({
            queryKey: [
                "tipo-contrato-templates",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id,
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/templates-contrato",
                        );

                    return response
                        .data
                        .data as TemplateContrato[];
                },
        });

    const workflowsQuery =
        useQuery({
            queryKey: [
                "tipo-contrato-workflows",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id,
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/checklist-process-templates",
                        );

                    return response
                        .data
                        .data as ChecklistProcessTemplate[];
                },
        });

    useEffect(() => {
        if (
            !editing
        ) {
            setForm(
                blankForm(),
            );

            setBaseConfiguration(
                {},
            );

            setSlugTouched(
                false,
            );

            setCodeTouched(
                false,
            );

            return;
        }

        const item =
            typeQuery.data;

        if (!item) {
            return;
        }

        const signatures =
            blankSignatures();

        for (
            const signature of
            item.assinaturas_configuracao
        ) {
            signatures[
                signature.placeholder
            ] = {
                enabled: true,

                obrigatoria:
                    signature.obrigatoria,

                presencial:
                    signature.modos.includes(
                        "presencial",
                    ),

                remota:
                    signature.modos.includes(
                        "remota",
                    ),
            };
        }

        setForm({
            nome:
                item.nome,

            slug:
                item.slug,

            codigo:
                item.codigo,

            descricao:
                item.descricao ??
                "",

            template_id:
                item.template_id ??
                "",

            checklist_process_template_id:
                item
                    .checklist_process_template_id ??
                "",

            entidades: {
                empresa:
                    Boolean(
                        item
                            .entidades
                            .empresa,
                    ),

                proprietario:
                    Boolean(
                        item
                            .entidades
                            .proprietario,
                    ),

                motorista:
                    Boolean(
                        item
                            .entidades
                            .motorista,
                    ),

                veiculo:
                    Boolean(
                        item
                            .entidades
                            .veiculo,
                    ),
            },

            campos_configuracao:
                (
                    item.campos_configuracao ??
                    []
                ).map(
                    (
                        field,
                    ) => ({
                        ...field,

                        opcoes:
                            Array.isArray(
                                field.opcoes,
                            )
                                ? field.opcoes
                                : [],
                    }),
                ),

            assinaturas:
                signatures,

            associar_motorista_veiculo:
                Boolean(
                    item
                        .configuracao
                        ?.associar_motorista_veiculo,
                ),

            ativo:
                item.ativo,

            mostrar_menu:
                item.mostrar_menu,

            ordem:
                String(
                    item.ordem ??
                        0,
                ),
        });

        setBaseConfiguration(
            item.configuracao ??
                {},
        );

        setSlugTouched(
            true,
        );

        setCodeTouched(
            true,
        );
    }, [
        editing,
        typeQuery.data,
    ]);

    const saveMutation =
        useMutation({
            mutationFn:
                async () => {
                    const validation =
                        validate();

                    if (validation) {
                        throw new Error(
                            validation,
                        );
                    }

                    const payload =
                        buildPayload();

                    if (
                        editing &&
                        id
                    ) {
                        const response =
                            await api.patch(
                                `/api/tipos-contrato/${id}`,
                                payload,
                            );

                        return response
                            .data
                            .data as TipoContrato;
                    }

                    const response =
                        await api.post(
                            "/api/tipos-contrato",
                            payload,
                        );

                    return response
                        .data
                        .data as TipoContrato;
                },

            onMutate:
                () => {
                    setError(
                        null,
                    );

                    setSuccess(
                        null,
                    );
                },

            onSuccess:
                async (
                    saved,
                ) => {
                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                "tipos-contrato",
                            ],
                        });

                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                "tipo-contrato",
                                tenant?.id,
                                saved.id,
                            ],
                        });

                    setSuccess(
                        "Tipo de contrato guardado com sucesso.",
                    );

                    if (
                        !editing
                    ) {
                        navigate(
                            `/contratos/configuracao/${saved.id}`,
                            {
                                replace:
                                    true,
                            },
                        );
                    }
                },

            onError:
                (
                    mutationError,
                ) => {
                    setError(
                        mutationError instanceof
                            Error &&
                            !axios.isAxiosError(
                                mutationError,
                            )
                            ? mutationError.message
                            : errorMessage(
                                  mutationError,
                                  "Não foi possível guardar o tipo de contrato.",
                              ),
                    );
                },
        });

    const activeTemplates =
        useMemo(
            () =>
                (
                    templatesQuery.data ??
                    []
                ).filter(
                    (item) =>
                        item.ativo !==
                        false,
                ),
            [
                templatesQuery.data,
            ],
        );

    const activeWorkflows =
        useMemo(
            () =>
                (
                    workflowsQuery.data ??
                    []
                ).filter(
                    (item) =>
                        item.ativo,
                ),
            [
                workflowsQuery.data,
            ],
        );

    if (!tenant) {
        return (
            <div className="mx-auto max-w-5xl">
                <div className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Escolha uma organização antes de configurar
                            tipos de contrato.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const loading =
        (
            editing &&
            typeQuery.isLoading
        ) ||
        templatesQuery.isLoading ||
        workflowsQuery.isLoading;

    const loadError =
        (
            editing &&
            typeQuery.isError
        ) ||
        templatesQuery.isError ||
        workflowsQuery.isError;

    if (loading) {
        return (
            <div className="flex min-h-96 items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="mx-auto max-w-5xl">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

                    <h1 className="mt-4 font-semibold text-red-900">
                        Não foi possível carregar a configuração
                    </h1>

                    <p className="mt-2 text-sm text-red-700">
                        Confirme as permissões de contratos e templates
                        e tente novamente.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/contratos/configuracao",
                            )
                        }
                        className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    function updateName(
        value: string,
    ) {
        setForm(
            (
                current,
            ) => ({
                ...current,

                nome:
                    value,

                slug:
                    slugTouched
                        ? current.slug
                        : slugify(
                              value,
                          ),

                codigo:
                    codeTouched
                        ? current.codigo
                        : codeify(
                              value,
                          ),
            }),
        );
    }

    function updateEntity(
        key:
            keyof FormState[
                "entidades"
            ],
        value: boolean,
    ) {
        setForm(
            (
                current,
            ) => ({
                ...current,

                entidades: {
                    ...current.entidades,
                    [key]:
                        value,
                },
            }),
        );
    }

    function addField() {
        setForm(
            (
                current,
            ) => ({
                ...current,

                campos_configuracao:
                    [
                        ...current.campos_configuracao,
                        {
                            campo:
                                "",

                            origem:
                                "manual",

                            fonte:
                                null,

                            tipo:
                                "text",

                            obrigatorio:
                                false,

                            opcoes:
                                [],
                        },
                    ],
            }),
        );
    }

    function updateField(
        index: number,
        values:
            Partial<
                TipoContratoCampoConfiguracao
            >,
    ) {
        setForm(
            (
                current,
            ) => ({
                ...current,

                campos_configuracao:
                    current.campos_configuracao.map(
                        (
                            field,
                            fieldIndex,
                        ) =>
                            fieldIndex ===
                            index
                                ? {
                                      ...field,
                                      ...values,
                                  }
                                : field,
                    ),
            }),
        );
    }

    function removeField(
        index: number,
    ) {
        setForm(
            (
                current,
            ) => ({
                ...current,

                campos_configuracao:
                    current.campos_configuracao.filter(
                        (
                            _,
                            fieldIndex,
                        ) =>
                            fieldIndex !==
                            index,
                    ),
            }),
        );
    }

    function updateSignature(
        placeholder:
            SignaturePlaceholder,
        values:
            Partial<SignatureForm>,
    ) {
        setForm(
            (
                current,
            ) => ({
                ...current,

                assinaturas: {
                    ...current.assinaturas,

                    [placeholder]: {
                        ...current
                            .assinaturas[
                            placeholder
                        ],

                        ...values,
                    },
                },
            }),
        );
    }

    function validate():
        string | null {
        if (
            !form.nome.trim()
        ) {
            return "Informe o nome do tipo de contrato.";
        }

        if (
            !form.slug.trim()
        ) {
            return "Informe o slug.";
        }

        if (
            !/^[a-z0-9-]+$/.test(
                form.slug.trim(),
            )
        ) {
            return "O slug pode conter apenas letras minúsculas, números e hífen.";
        }

        if (
            !form.codigo.trim()
        ) {
            return "Informe o código.";
        }

        if (
            !/^[a-z0-9_]+$/.test(
                form.codigo.trim(),
            )
        ) {
            return "O código pode conter apenas letras minúsculas, números e underscore.";
        }

        for (
            const [
                index,
                field,
            ] of
            form.campos_configuracao.entries()
        ) {
            if (
                !field.campo.trim()
            ) {
                return `Informe o nome do campo ${index + 1}.`;
            }

            if (
                field.origem ===
                    "automatico" &&
                !String(
                    field.fonte ??
                        "",
                ).trim()
            ) {
                return `Informe a fonte automática do campo ${field.campo}.`;
            }
        }

        for (
            const placeholder of
            placeholders
        ) {
            const signature =
                form.assinaturas[
                    placeholder
                ];

            if (
                signature.enabled &&
                !signature.presencial &&
                !signature.remota
            ) {
                return `Selecione pelo menos um modo para ${signatureLabels[placeholder]}.`;
            }
        }

        return null;
    }

    function buildPayload() {
        return {
            nome:
                form.nome.trim(),

            slug:
                form.slug
                    .trim()
                    .toLowerCase(),

            codigo:
                form.codigo
                    .trim()
                    .toLowerCase(),

            descricao:
                form.descricao
                    .trim() ||
                null,

            template_id:
                form.template_id ||
                null,

            checklist_process_template_id:
                form
                    .checklist_process_template_id ||
                null,

            entidades: {
                empresa:
                    form.entidades
                        .empresa,

                proprietario:
                    form.entidades
                        .proprietario,

                motorista:
                    form.entidades
                        .motorista,

                veiculo:
                    form.entidades
                        .veiculo,
            },

            campos_configuracao:
                form.campos_configuracao.map(
                    (
                        field,
                    ) => ({
                        campo:
                            field.campo
                                .trim(),

                        origem:
                            field.origem,

                        fonte:
                            field.origem ===
                            "automatico"
                                ? String(
                                      field.fonte ??
                                          "",
                                  ).trim() ||
                                  null
                                : null,

                        tipo:
                            field.tipo ??
                            "text",

                        obrigatorio:
                            Boolean(
                                field.obrigatorio,
                            ),

                        opcoes:
                            Array.isArray(
                                field.opcoes,
                            )
                                ? field.opcoes
                                : [],
                    }),
                ),

            assinaturas_configuracao:
                placeholders
                    .filter(
                        (
                            placeholder,
                        ) =>
                            form
                                .assinaturas[
                                placeholder
                            ]
                                .enabled,
                    )
                    .map(
                        (
                            placeholder,
                        ) => {
                            const signature =
                                form
                                    .assinaturas[
                                    placeholder
                                ];

                            const modos:
                                (
                                    | "presencial"
                                    | "remota"
                                )[] =
                                [];

                            if (
                                signature.presencial
                            ) {
                                modos.push(
                                    "presencial",
                                );
                            }

                            if (
                                signature.remota
                            ) {
                                modos.push(
                                    "remota",
                                );
                            }

                            return {
                                placeholder,

                                obrigatoria:
                                    signature.obrigatoria,

                                modos,
                            };
                        },
                    ),

            configuracao: {
                ...baseConfiguration,

                associar_motorista_veiculo:
                    form.associar_motorista_veiculo,
            },

            ativo:
                form.ativo,

            mostrar_menu:
                form.ativo &&
                form.mostrar_menu,

            ordem:
                Number(
                    form.ordem ||
                        0,
                ),
        };
    }

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/contratos/configuracao",
                            )
                        }
                        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />

                        Tipos de contrato
                    </button>

                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Configuração
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        {editing
                            ? form.nome ||
                              "Tipo de contrato"
                            : "Novo tipo de contrato"}
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Esta configuração define como novos contratos
                        deste tipo serão criados e processados.
                    </p>
                </div>

                <button
                    type="button"
                    disabled={
                        !canConfigure ||
                        saveMutation.isPending
                    }
                    onClick={() =>
                        saveMutation.mutate()
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                    {saveMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}

                    Guardar
                </button>
            </div>

            {!canConfigure && (
                <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />

                    A sua permissão permite consultar esta configuração,
                    mas não alterá-la.
                </div>
            )}

            {error && (
                <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0" />

                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <Check className="h-5 w-5 shrink-0" />

                    {success}
                </div>
            )}

            <div
                className={[
                    "space-y-6",
                    !canConfigure
                        ? "pointer-events-none opacity-75"
                        : "",
                ].join(
                    " ",
                )}
            >
                <Section
                    title="Identificação"
                    description="Nome e identificadores internos do tipo de contrato."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Nome *"
                            value={
                                form.nome
                            }
                            onChange={
                                updateName
                            }
                            placeholder="Contrato de aluguer"
                        />

                        <Input
                            label="Ordem"
                            value={
                                form.ordem
                            }
                            type="number"
                            onChange={(
                                value,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        ordem:
                                            value,
                                    }),
                                )
                            }
                        />

                        <Input
                            label="Slug *"
                            value={
                                form.slug
                            }
                            onChange={(
                                value,
                            ) => {
                                setSlugTouched(
                                    true,
                                );

                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        slug:
                                            value
                                                .toLowerCase()
                                                .replace(
                                                    /[^a-z0-9-]/g,
                                                    "-",
                                                )
                                                .replace(
                                                    /-+/g,
                                                    "-",
                                                ),
                                    }),
                                );
                            }}
                            placeholder="contrato-aluguer"
                        />

                        <Input
                            label="Código *"
                            value={
                                form.codigo
                            }
                            onChange={(
                                value,
                            ) => {
                                setCodeTouched(
                                    true,
                                );

                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        codigo:
                                            value
                                                .toLowerCase()
                                                .replace(
                                                    /[^a-z0-9_]/g,
                                                    "_",
                                                )
                                                .replace(
                                                    /_+/g,
                                                    "_",
                                                ),
                                    }),
                                );
                            }}
                            placeholder="contrato_aluguer"
                        />

                        <label className="md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Descrição
                            </span>

                            <textarea
                                value={
                                    form.descricao
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,

                                            descricao:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                rows={
                                    3
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                placeholder="Descreva quando este tipo de contrato deve ser utilizado."
                            />
                        </label>
                    </div>
                </Section>

                <Section
                    title="Documento e workflow"
                    description="O utilizador escolhe apenas o tipo de contrato; estas relações são aplicadas automaticamente."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            label="Template de documento"
                            value={
                                form.template_id
                            }
                            onChange={(
                                value,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        template_id:
                                            value,
                                    }),
                                )
                            }
                        >
                            <option value="">
                                Sem template
                            </option>

                            {activeTemplates.map(
                                (
                                    template,
                                ) => (
                                    <option
                                        key={
                                            template.id
                                        }
                                        value={
                                            template.id
                                        }
                                    >
                                        {
                                            template.nome
                                        }{" "}
                                        (
                                        {
                                            template.tipo_arquivo
                                        }
                                        )
                                    </option>
                                ),
                            )}
                        </Select>

                        <Select
                            label="Workflow"
                            value={
                                form
                                    .checklist_process_template_id
                            }
                            onChange={(
                                value,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        checklist_process_template_id:
                                            value,
                                    }),
                                )
                            }
                        >
                            <option value="">
                                Sem workflow
                            </option>

                            {activeWorkflows.map(
                                (
                                    workflow,
                                ) => (
                                    <option
                                        key={
                                            workflow.id
                                        }
                                        value={
                                            workflow.id
                                        }
                                    >
                                        {
                                            workflow.nome
                                        }{" "}
                                        — v
                                        {
                                            workflow.versao
                                        }
                                    </option>
                                ),
                            )}
                        </Select>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/templates",
                            )
                        }
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                        <FileStack className="h-4 w-4" />

                        Gerir templates e workflows
                    </button>
                </Section>

                <Section
                    title="Entidades"
                    description="Defina quais entidades são obrigatórias para criar este tipo de contrato."
                >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <EntityToggle
                            label="Empresa"
                            checked={
                                form.entidades
                                    .empresa
                            }
                            onChange={(
                                value,
                            ) =>
                                updateEntity(
                                    "empresa",
                                    value,
                                )
                            }
                        />

                        <EntityToggle
                            label="Proprietário"
                            checked={
                                form.entidades
                                    .proprietario
                            }
                            onChange={(
                                value,
                            ) =>
                                updateEntity(
                                    "proprietario",
                                    value,
                                )
                            }
                        />

                        <EntityToggle
                            label="Motorista"
                            checked={
                                form.entidades
                                    .motorista
                            }
                            onChange={(
                                value,
                            ) =>
                                updateEntity(
                                    "motorista",
                                    value,
                                )
                            }
                        />

                        <EntityToggle
                            label="Veículo"
                            checked={
                                form.entidades
                                    .veiculo
                            }
                            onChange={(
                                value,
                            ) =>
                                updateEntity(
                                    "veiculo",
                                    value,
                                )
                            }
                        />
                    </div>
                </Section>

                <Section
                    title="Campos"
                    description="Configure campos manuais ou preenchidos automaticamente pelo sistema."
                    action={
                        <button
                            type="button"
                            onClick={
                                addField
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-50 px-3 text-sm font-semibold text-indigo-700"
                        >
                            <Plus className="h-4 w-4" />

                            Adicionar campo
                        </button>
                    }
                >
                    {form
                        .campos_configuracao
                        .length ===
                    0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Nenhum campo adicional configurado.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {form.campos_configuracao.map(
                                (
                                    field,
                                    index,
                                ) => (
                                    <div
                                        key={
                                            index
                                        }
                                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr_160px_160px_1fr_auto] lg:items-end">
                                            <Input
                                                label="Campo *"
                                                value={
                                                    field.campo
                                                }
                                                onChange={(
                                                    value,
                                                ) =>
                                                    updateField(
                                                        index,
                                                        {
                                                            campo:
                                                                normalizeFieldName(
                                                                    value,
                                                                ),
                                                        },
                                                    )
                                                }
                                                placeholder="REFERENCIA_INTERNA"
                                            />

                                            <Select
                                                label="Origem"
                                                value={
                                                    field.origem
                                                }
                                                onChange={(
                                                    value,
                                                ) =>
                                                    updateField(
                                                        index,
                                                        {
                                                            origem:
                                                                value as
                                                                    | "manual"
                                                                    | "automatico",
                                                        },
                                                    )
                                                }
                                            >
                                                <option value="manual">
                                                    Manual
                                                </option>

                                                <option value="automatico">
                                                    Automático
                                                </option>
                                            </Select>

                                            <Select
                                                label="Tipo"
                                                value={
                                                    field.tipo ??
                                                    "text"
                                                }
                                                onChange={(
                                                    value,
                                                ) =>
                                                    updateField(
                                                        index,
                                                        {
                                                            tipo:
                                                                value,
                                                        },
                                                    )
                                                }
                                            >
                                                <option value="text">
                                                    Texto
                                                </option>

                                                <option value="number">
                                                    Número
                                                </option>

                                                <option value="date">
                                                    Data
                                                </option>

                                                <option value="email">
                                                    E-mail
                                                </option>

                                                <option value="tel">
                                                    Telefone
                                                </option>

                                                <option value="select">
                                                    Seleção
                                                </option>
                                            </Select>

                                            {field.origem ===
                                            "automatico" ? (
                                                <Input
                                                    label="Fonte automática *"
                                                    value={
                                                        String(
                                                            field.fonte ??
                                                                "",
                                                        )
                                                    }
                                                    onChange={(
                                                        value,
                                                    ) =>
                                                        updateField(
                                                            index,
                                                            {
                                                                fonte:
                                                                    value,
                                                            },
                                                        )
                                                    }
                                                    placeholder="motorista.nif"
                                                />
                                            ) : (
                                                <Input
                                                    label="Opções"
                                                    value={
                                                        Array.isArray(
                                                            field.opcoes,
                                                        )
                                                            ? field.opcoes
                                                                  .map(
                                                                      (
                                                                          option,
                                                                      ) =>
                                                                          String(
                                                                              option,
                                                                          ),
                                                                  )
                                                                  .join(
                                                                      ", ",
                                                                  )
                                                            : ""
                                                    }
                                                    onChange={(
                                                        value,
                                                    ) =>
                                                        updateField(
                                                            index,
                                                            {
                                                                opcoes:
                                                                    value
                                                                        .split(
                                                                            ",",
                                                                        )
                                                                        .map(
                                                                            (
                                                                                option,
                                                                            ) =>
                                                                                option.trim(),
                                                                        )
                                                                        .filter(
                                                                            Boolean,
                                                                        ),
                                                            },
                                                        )
                                                    }
                                                    placeholder="Opção A, Opção B"
                                                />
                                            )}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeField(
                                                        index,
                                                    )
                                                }
                                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    Boolean(
                                                        field.obrigatorio,
                                                    )
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        index,
                                                        {
                                                            obrigatorio:
                                                                event
                                                                    .target
                                                                    .checked,
                                                        },
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                            />

                                            Campo obrigatório
                                        </label>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </Section>

                <Section
                    title="Assinaturas"
                    description="Configure quem assina e quais modos de assinatura estão permitidos."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        {placeholders
                            .filter(
                                (placeholder) =>
                                    placeholder !== "ASSINATURA_TITULAR" ||
                                    [
                                        "rgpd",
                                        "rgpd_informacao_autorizacoes",
                                        "informacao_tratamento_dados_rgpd",
                                    ].includes(form.codigo.trim()),
                            )
                            .map(
                            (
                                placeholder,
                            ) => {
                                const signature =
                                    form
                                        .assinaturas[
                                        placeholder
                                    ];

                                return (
                                    <div
                                        key={
                                            placeholder
                                        }
                                        className={[
                                            "rounded-xl border p-4 transition",
                                            signature.enabled
                                                ? "border-indigo-200 bg-indigo-50/50"
                                                : "border-slate-200 bg-white",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    signature.enabled
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateSignature(
                                                        placeholder,
                                                        {
                                                            enabled:
                                                                event
                                                                    .target
                                                                    .checked,
                                                        },
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                            />

                                            <div>
                                                <div className="font-semibold text-slate-900">
                                                    {
                                                        signatureLabels[
                                                            placeholder
                                                        ]
                                                    }
                                                </div>

                                                <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                                                    {
                                                        placeholder
                                                    }
                                                </div>
                                            </div>
                                        </label>

                                        {signature.enabled && (
                                            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            signature.obrigatoria
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateSignature(
                                                                placeholder,
                                                                {
                                                                    obrigatoria:
                                                                        event
                                                                            .target
                                                                            .checked,
                                                                },
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                    />

                                                    Obrigatória
                                                </label>

                                                <div className="flex flex-wrap gap-4">
                                                    <label className="flex items-center gap-2 text-sm text-slate-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                signature.presencial
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateSignature(
                                                                    placeholder,
                                                                    {
                                                                        presencial:
                                                                            event
                                                                                .target
                                                                                .checked,
                                                                    },
                                                                )
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                        />

                                                        Presencial
                                                    </label>

                                                    <label className="flex items-center gap-2 text-sm text-slate-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                signature.remota
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateSignature(
                                                                    placeholder,
                                                                    {
                                                                        remota:
                                                                            event
                                                                                .target
                                                                                .checked,
                                                                    },
                                                                )
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                        />

                                                        Remota
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            },
                        )}
                    </div>
                </Section>

                <Section
                    title="Regras operacionais"
                    description="Comportamentos executados automaticamente pelo sistema."
                >
                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                        <input
                            type="checkbox"
                            checked={
                                form.associar_motorista_veiculo
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        associar_motorista_veiculo:
                                            event
                                                .target
                                                .checked,
                                    }),
                                )
                            }
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />

                        <div>
                            <div className="font-medium text-slate-900">
                                Associar motorista ao veículo após assinatura
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                                Quando o contrato ficar totalmente assinado,
                                o sistema cria ou atualiza a associação ativa
                                entre o motorista e o veículo.
                            </p>
                        </div>
                    </label>
                </Section>

                <Section
                    title="Disponibilidade"
                    description="Controle se o tipo pode ser utilizado em novos contratos e se aparece no menu."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <ToggleCard
                            title="Tipo ativo"
                            description="Permite criar novos contratos usando este tipo."
                            checked={
                                form.ativo
                            }
                            onChange={(
                                value,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        ativo:
                                            value,

                                        mostrar_menu:
                                            value
                                                ? current.mostrar_menu
                                                : false,
                                    }),
                                )
                            }
                        />

                        <ToggleCard
                            title="Mostrar no menu"
                            description="Disponibiliza este tipo nas áreas dinâmicas de contratos."
                            checked={
                                form.ativo &&
                                form.mostrar_menu
                            }
                            disabled={
                                !form.ativo
                            }
                            onChange={(
                                value,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        mostrar_menu:
                                            value,
                                    }),
                                )
                            }
                        />
                    </div>
                </Section>

                <div className="flex justify-end pb-10">
                    <button
                        type="button"
                        disabled={
                            !canConfigure ||
                            saveMutation.isPending
                        }
                        onClick={() =>
                            saveMutation.mutate()
                        }
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saveMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}

                        Guardar configuração
                    </button>
                </div>
            </div>
        </div>
    );
}

function Section({
    title,
    description,
    action,
    children,
}: {
    title: string;
    description: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                        {title}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        {description}
                    </p>
                </div>

                {action}
            </div>

            {children}
        </section>
    );
}

function Input({
    label,
    value,
    type = "text",
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    type?: string;
    placeholder?: string;
    onChange: (
        value: string,
    ) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </span>

            <input
                type={
                    type
                }
                value={
                    value
                }
                placeholder={
                    placeholder
                }
                min={
                    type ===
                    "number"
                        ? "0"
                        : undefined
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .value,
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
        </label>
    );
}

function Select({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (
        value: string,
    ) => void;
    children:
        ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </span>

            <select
                value={
                    value
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .value,
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
                {children}
            </select>
        </label>
    );
}

function EntityToggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (
        value: boolean,
    ) => void;
}) {
    return (
        <label
            className={[
                "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition",
                checked
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white",
            ].join(
                " ",
            )}
        >
            <input
                type="checkbox"
                checked={
                    checked
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .checked,
                    )
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />

            <span className="text-sm font-medium text-slate-700">
                {label}
            </span>
        </label>
    );
}

function ToggleCard({
    title,
    description,
    checked,
    disabled = false,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (
        value: boolean,
    ) => void;
}) {
    return (
        <label
            className={[
                "flex items-start gap-3 rounded-xl border p-4",
                disabled
                    ? "cursor-not-allowed bg-slate-50 opacity-60"
                    : "cursor-pointer bg-white",
            ].join(
                " ",
            )}
        >
            <input
                type="checkbox"
                checked={
                    checked
                }
                disabled={
                    disabled
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .checked,
                    )
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
            />

            <div>
                <div className="font-medium text-slate-900">
                    {title}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                    {description}
                </p>
            </div>
        </label>
    );
}

function slugify(
    value: string,
): string {
    return value
        .normalize(
            "NFD",
        )
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .trim()
        .replace(
            /[^a-z0-9]+/g,
            "-",
        )
        .replace(
            /^-+|-+$/g,
            "",
        );
}

function codeify(
    value: string,
): string {
    return slugify(
        value,
    ).replace(
        /-/g,
        "_",
    );
}

function normalizeFieldName(
    value: string,
): string {
    return value
        .normalize(
            "NFD",
        )
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toUpperCase()
        .replace(
            /[^A-Z0-9]+/g,
            "_",
        )
        .replace(
            /^_+|_+$/g,
            "",
        );
}
