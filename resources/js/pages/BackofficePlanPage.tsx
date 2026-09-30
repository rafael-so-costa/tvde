import axios from "axios";
import {
    ArrowLeft,
    Building2,
    Car,
    Check,
    FileChartColumnIncreasing,
    LoaderCircle,
    Plug,
    Save,
    UsersRound,
} from "lucide-react";
import {
    useEffect,
    useState,
} from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficePlan,
} from "../types/backoffice";

interface PlanForm {
    codigo: string;
    nome: string;
    descricao: string;
    ativo: boolean;
    ordem: string;

    limits: {
        empresas: string;
        veiculos: string;
        motoristas: string;
        utilizadores: string;
    };

    features: {
        multi_company: boolean;
        integracoes: boolean;
        relatorios_avancados: boolean;
    };
}

const emptyForm: PlanForm = {
    codigo: "",
    nome: "",
    descricao: "",
    ativo: true,
    ordem: "10",

    limits: {
        empresas: "",
        veiculos: "",
        motoristas: "",
        utilizadores: "",
    },

    features: {
        multi_company: false,
        integracoes: false,
        relatorios_avancados: false,
    },
};

export default function BackofficePlanPage() {
    const { id } =
        useParams<{
            id: string;
        }>();

    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const isNew =
        !id;

    const [
        form,
        setForm,
    ] = useState<PlanForm>(
        emptyForm,
    );

    const [
        successMessage,
        setSuccessMessage,
    ] = useState<
        string | null
    >(null);

    const planQuery = useQuery({
        queryKey: [
            "backoffice",
            "planos",
            id,
        ],

        enabled:
            !isNew &&
            Boolean(id),

        queryFn: async () => {
            const response =
                await api.get(
                    `/api/backoffice/planos/${id}`,
                );

            return response
                .data
                .data as BackofficePlan;
        },
    });

    useEffect(() => {
        if (!planQuery.data) {
            return;
        }

        const plan =
            planQuery.data;

        setForm({
            codigo:
                plan.codigo,

            nome:
                plan.nome,

            descricao:
                plan.descricao ??
                "",

            ativo:
                plan.ativo,

            ordem:
                String(
                    plan.ordem,
                ),

            limits: {
                empresas:
                    limitToString(
                        plan
                            .limits
                            .empresas,
                    ),

                veiculos:
                    limitToString(
                        plan
                            .limits
                            .veiculos,
                    ),

                motoristas:
                    limitToString(
                        plan
                            .limits
                            .motoristas,
                    ),

                utilizadores:
                    limitToString(
                        plan
                            .limits
                            .utilizadores,
                    ),
            },

            features: {
                multi_company:
                    plan
                        .features
                        .multi_company,

                integracoes:
                    plan
                        .features
                        .integracoes,

                relatorios_avancados:
                    plan
                        .features
                        .relatorios_avancados,
            },
        });
    }, [
        planQuery.data,
    ]);

    const saveMutation =
        useMutation({
            mutationFn:
                async () => {
                    const payload = {
                        codigo:
                            form.codigo,

                        nome:
                            form.nome,

                        descricao:
                            form.descricao.trim() ||
                            null,

                        ativo:
                            form.ativo,

                        ordem:
                            Number(
                                form.ordem,
                            ),

                        limits: {
                            empresas:
                                parseLimit(
                                    form
                                        .limits
                                        .empresas,
                                ),

                            veiculos:
                                parseLimit(
                                    form
                                        .limits
                                        .veiculos,
                                ),

                            motoristas:
                                parseLimit(
                                    form
                                        .limits
                                        .motoristas,
                                ),

                            utilizadores:
                                parseLimit(
                                    form
                                        .limits
                                        .utilizadores,
                                ),
                        },

                        features: {
                            ...form.features,
                        },
                    };

                    if (isNew) {
                        return api.post(
                            "/api/backoffice/planos",
                            payload,
                        );
                    }

                    return api.patch(
                        `/api/backoffice/planos/${id}`,
                        payload,
                    );
                },

            onSuccess:
                async (
                    response,
                ) => {
                    const plan =
                        response
                            .data
                            .data as BackofficePlan;

                    await queryClient.invalidateQueries({
                        queryKey: [
                            "backoffice",
                            "planos",
                        ],
                    });

                    if (isNew) {
                        navigate(
                            `/backoffice/planos/${plan.id}`,
                            {
                                replace:
                                    true,
                            },
                        );

                        return;
                    }

                    queryClient.setQueryData(
                        [
                            "backoffice",
                            "planos",
                            id,
                        ],
                        plan,
                    );

                    setSuccessMessage(
                        response
                            .data
                            .message,
                    );
                },
        });

    if (
        !isNew &&
        planQuery.isLoading
    ) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (
        !isNew &&
        (
            planQuery.isError ||
            !planQuery.data
        )
    ) {
        return (
            <div className="mx-auto max-w-6xl">
                <Link
                    to="/backoffice/planos"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />

                    Voltar aos planos
                </Link>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Não foi possível carregar este plano.
                </div>
            </div>
        );
    }

    const starter =
        !isNew &&
        planQuery
            .data
            ?.codigo ===
            "starter";

    function submit(
        event: React.FormEvent,
    ): void {
        event.preventDefault();

        setSuccessMessage(
            null,
        );

        saveMutation.mutate();
    }

    function changeLimit(
        field:
            | "empresas"
            | "veiculos"
            | "motoristas"
            | "utilizadores",
        value: string,
    ): void {
        setForm(
            (current) => ({
                ...current,

                limits: {
                    ...current.limits,

                    [field]:
                        value,
                },
            }),
        );
    }

    function changeFeature(
        field:
            | "multi_company"
            | "integracoes"
            | "relatorios_avancados",
    ): void {
        setForm(
            (current) => ({
                ...current,

                features: {
                    ...current.features,

                    [field]:
                        !current
                            .features[
                            field
                        ],
                },
            }),
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-7">
            <section>
                <Link
                    to="/backoffice/planos"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />

                    Planos
                </Link>

                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Gestão SaaS
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        {isNew
                            ? "Novo plano"
                            : `Editar ${planQuery.data?.nome ?? "plano"}`}
                    </h1>

                    <p className="mt-2 text-slate-500">
                        {isNew
                            ? "Defina os limites e funcionalidades do novo plano."
                            : "Altere a configuração comercial e técnica deste plano."}
                    </p>
                </div>
            </section>

            <form
                onSubmit={
                    submit
                }
                className="space-y-6"
            >
                <section className="rounded-2xl border border-slate-200 bg-white">
                    <SectionHeader
                        title="Dados gerais"
                        description="Identificação e disponibilidade do plano."
                    />

                    <div className="grid gap-5 p-5 sm:grid-cols-2">
                        <Field
                            label="Nome"
                            error={validationError(
                                saveMutation.error,
                                "nome",
                            )}
                        >
                            <input
                                value={
                                    form.nome
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            nome: event
                                                .target
                                                .value,
                                        }),
                                    )
                                }
                                className={inputClass}
                                placeholder="Pro"
                            />
                        </Field>

                        <Field
                            label="Código"
                            hint={
                                starter
                                    ? "O código Starter é protegido."
                                    : "Use letras minúsculas, números, hífen ou underscore."
                            }
                            error={validationError(
                                saveMutation.error,
                                "codigo",
                            )}
                        >
                            <input
                                value={
                                    form.codigo
                                }
                                disabled={
                                    starter
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            codigo: event
                                                .target
                                                .value,
                                        }),
                                    )
                                }
                                className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                                placeholder="pro"
                            />
                        </Field>

                        <Field
                            label="Ordem"
                            hint="Controla a posição do plano nas listagens."
                            error={validationError(
                                saveMutation.error,
                                "ordem",
                            )}
                        >
                            <input
                                type="number"
                                min="0"
                                max="65535"
                                value={
                                    form.ordem
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            ordem: event
                                                .target
                                                .value,
                                        }),
                                    )
                                }
                                className={inputClass}
                            />
                        </Field>

                        <div>
                            <p className="mb-2 text-sm font-semibold text-slate-700">
                                Estado
                            </p>

                            <button
                                type="button"
                                disabled={
                                    starter
                                }
                                onClick={() =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            ativo: !current.ativo,
                                        }),
                                    )
                                }
                                className={[
                                    "flex h-11 w-full items-center justify-between rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                                    form.ativo
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-slate-50 text-slate-600",
                                ].join(
                                    " ",
                                )}
                            >
                                <span>
                                    {form.ativo
                                        ? "Plano ativo"
                                        : "Plano inativo"}
                                </span>

                                <span
                                    className={[
                                        "relative h-5 w-9 rounded-full transition",
                                        form.ativo
                                            ? "bg-emerald-500"
                                            : "bg-slate-300",
                                    ].join(
                                        " ",
                                    )}
                                >
                                    <span
                                        className={[
                                            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
                                            form.ativo
                                                ? "left-[18px]"
                                                : "left-0.5",
                                        ].join(
                                            " ",
                                        )}
                                    />
                                </span>
                            </button>

                            {validationError(
                                saveMutation.error,
                                "ativo",
                            ) && (
                                <p className="mt-1 text-xs text-red-600">
                                    {validationError(
                                        saveMutation.error,
                                        "ativo",
                                    )}
                                </p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <Field
                                label="Descrição"
                                error={validationError(
                                    saveMutation.error,
                                    "descricao",
                                )}
                            >
                                <textarea
                                    rows={
                                        4
                                    }
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
                                    className={`${inputClass} min-h-28 py-3`}
                                    placeholder="Descrição do plano..."
                                />
                            </Field>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white">
                    <SectionHeader
                        title="Limites"
                        description="Deixe o campo vazio para permitir utilização ilimitada."
                    />

                    <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                        <LimitField
                            label="Empresas"
                            icon={
                                Building2
                            }
                            value={
                                form
                                    .limits
                                    .empresas
                            }
                            error={validationError(
                                saveMutation.error,
                                "limits.empresas",
                            )}
                            onChange={(
                                value,
                            ) =>
                                changeLimit(
                                    "empresas",
                                    value,
                                )
                            }
                        />

                        <LimitField
                            label="Veículos"
                            icon={Car}
                            value={
                                form
                                    .limits
                                    .veiculos
                            }
                            error={validationError(
                                saveMutation.error,
                                "limits.veiculos",
                            )}
                            onChange={(
                                value,
                            ) =>
                                changeLimit(
                                    "veiculos",
                                    value,
                                )
                            }
                        />

                        <LimitField
                            label="Motoristas"
                            icon={
                                UsersRound
                            }
                            value={
                                form
                                    .limits
                                    .motoristas
                            }
                            error={validationError(
                                saveMutation.error,
                                "limits.motoristas",
                            )}
                            onChange={(
                                value,
                            ) =>
                                changeLimit(
                                    "motoristas",
                                    value,
                                )
                            }
                        />

                        <LimitField
                            label="Utilizadores"
                            icon={
                                UsersRound
                            }
                            value={
                                form
                                    .limits
                                    .utilizadores
                            }
                            error={validationError(
                                saveMutation.error,
                                "limits.utilizadores",
                            )}
                            onChange={(
                                value,
                            ) =>
                                changeLimit(
                                    "utilizadores",
                                    value,
                                )
                            }
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white">
                    <SectionHeader
                        title="Funcionalidades"
                        description="Defina os recursos incluídos neste plano."
                    />

                    <div className="grid gap-4 p-5 md:grid-cols-3">
                        <FeatureToggle
                            title="Multiempresa"
                            description="Permite gerir várias empresas na mesma organização."
                            icon={
                                Building2
                            }
                            enabled={
                                form
                                    .features
                                    .multi_company
                            }
                            onClick={() =>
                                changeFeature(
                                    "multi_company",
                                )
                            }
                        />

                        <FeatureToggle
                            title="Integrações"
                            description="Permite utilizar integrações externas da plataforma."
                            icon={Plug}
                            enabled={
                                form
                                    .features
                                    .integracoes
                            }
                            onClick={() =>
                                changeFeature(
                                    "integracoes",
                                )
                            }
                        />

                        <FeatureToggle
                            title="Relatórios avançados"
                            description="Liberta relatórios e análises avançadas."
                            icon={
                                FileChartColumnIncreasing
                            }
                            enabled={
                                form
                                    .features
                                    .relatorios_avancados
                            }
                            onClick={() =>
                                changeFeature(
                                    "relatorios_avancados",
                                )
                            }
                        />
                    </div>
                </section>

                {saveMutation.isError &&
                    !axios.isAxiosError(
                        saveMutation.error,
                    ) && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Não foi possível guardar o plano.
                        </div>
                    )}

                {axios.isAxiosError(
                    saveMutation.error,
                ) &&
                    !saveMutation
                        .error
                        .response
                        ?.data
                        ?.errors && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {saveMutation
                                .error
                                .response
                                ?.data
                                ?.message ??
                                "Não foi possível guardar o plano."}
                        </div>
                    )}

                {successMessage && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {
                            successMessage
                        }
                    </div>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Link
                        to="/backoffice/planos"
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancelar
                    </Link>

                    <button
                        type="submit"
                        disabled={
                            saveMutation.isPending
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {saveMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}

                        {isNew
                            ? "Criar plano"
                            : "Guardar alterações"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function SectionHeader({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
                {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
                {description}
            </p>
        </div>
    );
}

function Field({
    label,
    hint,
    error,
    children,
}: {
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-700">
                {label}
            </span>

            {hint && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                    {hint}
                </span>
            )}

            <div className="mt-2">
                {children}
            </div>

            {error && (
                <p className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </label>
    );
}

function LimitField({
    label,
    value,
    error,
    icon: Icon,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    icon: typeof Building2;
    onChange: (
        value: string,
    ) => void;
}) {
    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Icon className="h-4 w-4 text-indigo-500" />

                {label}
            </div>

            <input
                type="number"
                min="0"
                value={value}
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .value,
                    )
                }
                placeholder="Ilimitado"
                className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />

            <p className="mt-2 text-xs text-slate-400">
                {value === ""
                    ? "Sem limite"
                    : `Máximo: ${value}`}
            </p>

            {error && (
                <p className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

function FeatureToggle({
    title,
    description,
    enabled,
    icon: Icon,
    onClick,
}: {
    title: string;
    description: string;
    enabled: boolean;
    icon: typeof Building2;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "rounded-xl border p-4 text-left transition",
                enabled
                    ? "border-indigo-200 bg-indigo-50/60"
                    : "border-slate-200 bg-white hover:border-slate-300",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-4">
                <div
                    className={[
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        enabled
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                >
                    <Icon className="h-5 w-5" />
                </div>

                <div
                    className={[
                        "flex h-6 w-6 items-center justify-center rounded-full border",
                        enabled
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 text-transparent",
                    ].join(" ")}
                >
                    <Check className="h-3.5 w-3.5" />
                </div>
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
                {title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
            </p>

            <p
                className={[
                    "mt-3 text-xs font-semibold",
                    enabled
                        ? "text-indigo-600"
                        : "text-slate-400",
                ].join(" ")}
            >
                {enabled
                    ? "Incluído no plano"
                    : "Não incluído"}
            </p>
        </button>
    );
}

function parseLimit(
    value: string,
): number | null {
    if (
        value.trim() === ""
    ) {
        return null;
    }

    return Number(
        value,
    );
}

function limitToString(
    value: number | null,
): string {
    if (value === null) {
        return "";
    }

    return String(
        value,
    );
}

function validationError(
    error: unknown,
    field: string,
): string | undefined {
    if (
        !axios.isAxiosError(
            error,
        )
    ) {
        return undefined;
    }

    const errors =
        error.response
            ?.data
            ?.errors as
            | Record<
                  string,
                  string[]
              >
            | undefined;

    return errors?.[
        field
    ]?.[0];
}

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
