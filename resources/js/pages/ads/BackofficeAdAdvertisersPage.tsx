import axios from "axios";
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    ExternalLink,
    LoaderCircle,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    useMemo,
    useState,
} from "react";

import api from "../../lib/api";

import type {
    AdAdvertiser,
} from "../../types/backofficeAds";

interface AdvertisersResponse {
    data: AdAdvertiser[];
}

interface ValidationResponse {
    message?: string;

    errors?: Record<
        string,
        string[]
    >;
}

type AdvertiserType =
    | "saas"
    | "tenant"
    | "external";

const inputClass =
    "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const defaultForm = {
    name: "",
    type: "external" as AdvertiserType,
    legal_name: "",
    nif: "",
    email: "",
    phone: "",
    website: "",
};

export default function BackofficeAdAdvertisersPage() {
    const queryClient =
        useQueryClient();

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        form,
        setForm,
    ] = useState(
        defaultForm,
    );

    const [
        successMessage,
        setSuccessMessage,
    ] = useState<
        string | null
    >(null);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<
        string | null
    >(null);

    const [
        fieldErrors,
        setFieldErrors,
    ] = useState<
        Record<
            string,
            string[]
        >
    >({});

    const query =
        useQuery({
            queryKey: [
                "backoffice",
                "ads",
                "advertisers",
                search,
            ],

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/backoffice/ads/advertisers",
                            {
                                params: {
                                    search:
                                        search.trim() ||
                                        undefined,
                                },
                            },
                        );

                    const payload =
                        response.data as AdvertisersResponse;

                    if (
                        !Array.isArray(
                            payload?.data,
                        )
                    ) {
                        throw new Error(
                            "A API de anunciantes devolveu uma resposta inesperada.",
                        );
                    }

                    return payload;
                },

            retry: 1,
        });

    const createMutation =
        useMutation({
            mutationFn:
                async () =>
                    api.post(
                        "/api/backoffice/ads/advertisers",
                        {
                            tenant_id:
                                null,

                            type:
                                form.type,

                            name:
                                form.name.trim(),

                            legal_name:
                                form.legal_name.trim() ||
                                null,

                            nif:
                                form.nif.trim() ||
                                null,

                            email:
                                form.email.trim() ||
                                null,

                            phone:
                                form.phone.trim() ||
                                null,

                            website:
                                form.website.trim() ||
                                null,

                            status:
                                "active",

                            metadata:
                                null,
                        },
                    ),

            onMutate:
                () => {
                    setSuccessMessage(
                        null,
                    );

                    setErrorMessage(
                        null,
                    );

                    setFieldErrors(
                        {},
                    );
                },

            onSuccess:
                async (
                    response,
                ) => {
                    setForm(
                        defaultForm,
                    );

                    setSuccessMessage(
                        response.data
                            ?.message ??
                            "Anunciante criado com sucesso.",
                    );

                    await queryClient.invalidateQueries(
                        {
                            queryKey:
                                [
                                    "backoffice",
                                    "ads",
                                    "advertisers",
                                ],
                        },
                    );
                },

            onError:
                (
                    error: unknown,
                ) => {
                    const parsed =
                        parseApiError(
                            error,
                        );

                    setErrorMessage(
                        parsed.message,
                    );

                    setFieldErrors(
                        parsed.errors,
                    );
                },
        });

    const advertisers =
        useMemo(
            () =>
                Array.isArray(
                    query.data
                        ?.data,
                )
                    ? query.data
                          .data
                    : [],
            [
                query.data,
            ],
        );

    const fieldError =
        (
            field: string,
        ) =>
            fieldErrors[
                field
            ]?.[0];

    function submit() {
        setSuccessMessage(
            null,
        );

        setErrorMessage(
            null,
        );

        setFieldErrors(
            {},
        );

        if (
            !form.name.trim()
        ) {
            setErrorMessage(
                "Existem informações obrigatórias que precisam ser preenchidas.",
            );

            setFieldErrors({
                name: [
                    "Preencha o nome do anunciante.",
                ],
            });

            return;
        }

        createMutation.mutate();
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-7">
            <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Anunciantes
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Gerencie empresas,
                        gestores de frota,
                        parceiros comerciais
                        e anunciantes próprios
                        do FrotaPro.
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <span className="font-bold text-slate-900">
                        {advertisers.length.toLocaleString(
                            "pt-PT",
                        )}
                    </span>{" "}
                    <span className="text-slate-500">
                        {advertisers.length ===
                        1
                            ? "anunciante"
                            : "anunciantes"}
                    </span>
                </div>
            </header>

            {successMessage && (
                <div
                    role="status"
                    className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-emerald-900">
                            Operação concluída
                        </div>

                        <p className="mt-1 text-sm text-emerald-700">
                            {successMessage}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setSuccessMessage(
                                null,
                            )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-100"
                        aria-label="Fechar mensagem"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-red-900">
                                Não foi possível guardar o anunciante
                            </div>

                            <p className="mt-1 text-sm leading-6 text-red-700">
                                {errorMessage}
                            </p>

                            {Object.keys(
                                fieldErrors,
                            ).length >
                                0 && (
                                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
                                    {Object.entries(
                                        fieldErrors,
                                    ).flatMap(
                                        ([
                                            field,
                                            messages,
                                        ]) =>
                                            messages.map(
                                                (
                                                    message,
                                                    index,
                                                ) => (
                                                    <li
                                                        key={`${field}-${index}`}
                                                    >
                                                        {
                                                            message
                                                        }
                                                    </li>
                                                ),
                                            ),
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Plus className="h-5 w-5" />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-950">
                                Novo anunciante
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Cadastre os dados
                                básicos da empresa ou
                                parceiro que poderá
                                criar campanhas no
                                FrotaPro Ads.
                            </p>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={(
                        event,
                    ) => {
                        event.preventDefault();

                        submit();
                    }}
                    className="p-6 sm:p-7"
                >
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-12">
                        <div className="xl:col-span-6">
                            <Field
                                label="Nome do anunciante"
                                hint="Nome utilizado no backoffice e na identificação das campanhas."
                                error={fieldError(
                                    "name",
                                )}
                                required
                            >
                                <input
                                    value={
                                        form.name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,

                                            name: event
                                                .target
                                                .value,
                                        })
                                    }
                                    placeholder="Ex.: Oficina XPTO"
                                    className={
                                        inputClass
                                    }
                                />
                            </Field>
                        </div>

                        <div className="xl:col-span-6">
                            <Field
                                label="Tipo de anunciante"
                                hint="Indica a origem e relação do anunciante com o FrotaPro."
                                error={fieldError(
                                    "type",
                                )}
                                required
                            >
                                <select
                                    value={
                                        form.type
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,

                                            type: event
                                                .target
                                                .value as AdvertiserType,
                                        })
                                    }
                                    className={
                                        inputClass
                                    }
                                >
                                    <option value="external">
                                        Parceiro externo
                                    </option>

                                    <option value="tenant">
                                        Gestor de frota
                                    </option>

                                    <option value="saas">
                                        FrotaPro / SaaS
                                    </option>
                                </select>
                            </Field>
                        </div>

                        <div className="xl:col-span-6">
                            <Field
                                label="Nome legal"
                                hint="Denominação jurídica da empresa, quando aplicável."
                                error={fieldError(
                                    "legal_name",
                                )}
                            >
                                <input
                                    value={
                                        form.legal_name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,

                                            legal_name:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="Ex.: Oficina XPTO, Lda."
                                    className={
                                        inputClass
                                    }
                                />
                            </Field>
                        </div>

                        <div className="xl:col-span-6">
                            <Field
                                label="NIF"
                                hint="Número de identificação fiscal do anunciante."
                                error={fieldError(
                                    "nif",
                                )}
                            >
                                <input
                                    value={
                                        form.nif
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,

                                            nif: event
                                                .target
                                                .value,
                                        })
                                    }
                                    placeholder="Ex.: 509000000"
                                    className={
                                        inputClass
                                    }
                                />
                            </Field>
                        </div>

                        <div className="xl:col-span-4">
                            <Field
                                label="E-mail"
                                hint="Contacto comercial ou administrativo."
                                error={fieldError(
                                    "email",
                                )}
                            >
                                <input
                                    type="email"
                                    value={
                                        form.email
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,

                                            email: event
                                                .target
                                                .value,
                                        })
                                    }
                                    placeholder="comercial@empresa.pt"
                                    className={
                                        inputClass
                                    }
                                />
                            </Field>
                        </div>

                        <div className="xl:col-span-4">
                            <Field
                                label="Telefone"
                                hint="Contacto do anunciante."
                                error={fieldError(
                                    "phone",
                                )}
                            >
                                <input
                                    value={
                                        form.phone
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,

                                            phone: event
                                                .target
                                                .value,
                                        })
                                    }
                                    placeholder="351912345678"
                                    className={
                                        inputClass
                                    }
                                />
                            </Field>
                        </div>

                        <div className="xl:col-span-4">
                            <Field
                                label="Website"
                                hint="Utilize o endereço completo com https://."
                                error={fieldError(
                                    "website",
                                )}
                            >
                                <input
                                    value={
                                        form.website
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,

                                            website:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="https://www.empresa.pt"
                                    className={
                                        inputClass
                                    }
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="mt-7 flex justify-end border-t border-slate-200 pt-6">
                        <button
                            type="submit"
                            disabled={
                                createMutation.isPending
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {createMutation.isPending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}

                            {createMutation.isPending
                                ? "A guardar..."
                                : "Adicionar anunciante"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div>
                            <h2 className="text-lg font-bold text-slate-950">
                                Anunciantes cadastrados
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Consulte os anunciantes
                                disponíveis para criação
                                de campanhas.
                            </p>
                        </div>

                        <div className="relative w-full lg:max-w-sm">
                            <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />

                            <input
                                value={
                                    search
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event.target
                                            .value,
                                    )
                                }
                                placeholder="Pesquisar nome, empresa ou NIF..."
                                className={`${inputClass} pl-11`}
                            />
                        </div>
                    </div>
                </div>

                {query.isLoading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <div className="text-center">
                            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-indigo-600" />

                            <p className="mt-3 text-sm text-slate-500">
                                A carregar anunciantes...
                            </p>
                        </div>
                    </div>
                ) : query.isError ? (
                    <div className="flex min-h-64 items-center justify-center p-8">
                        <div className="max-w-lg text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <AlertTriangle className="h-6 w-6" />
                            </div>

                            <h3 className="mt-4 font-bold text-slate-900">
                                Não foi possível carregar os anunciantes
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {getQueryErrorMessage(
                                    query.error,
                                )}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    query.refetch()
                                }
                                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                <RefreshCw className="h-4 w-4" />

                                Tentar novamente
                            </button>
                        </div>
                    </div>
                ) : advertisers.length ===
                  0 ? (
                    <div className="flex min-h-64 items-center justify-center p-8">
                        <div className="max-w-md text-center">
                            <Building2 className="mx-auto h-10 w-10 text-slate-300" />

                            <h3 className="mt-4 font-semibold text-slate-900">
                                Nenhum anunciante encontrado
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {search
                                    ? "Não existem anunciantes que correspondam à pesquisa."
                                    : "Cadastre o primeiro anunciante utilizando o formulário acima."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {advertisers.map(
                            (
                                advertiser,
                            ) => (
                                <AdvertiserRow
                                    key={
                                        advertiser.id
                                    }
                                    advertiser={
                                        advertiser
                                    }
                                />
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

function AdvertiserRow({
    advertiser,
}: {
    advertiser: AdAdvertiser;
}) {
    const type =
        advertiserType(
            advertiser.type,
        );

    return (
        <article className="grid gap-4 px-6 py-5 transition hover:bg-slate-50/80 lg:grid-cols-[minmax(0,1fr)_180px_150px] lg:items-center">
            <div className="flex min-w-0 items-start gap-4">
                <div
                    className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        type.className,
                    ].join(
                        " ",
                    )}
                >
                    {advertiser.type ===
                    "saas" ? (
                        <ShieldCheck className="h-5 w-5" />
                    ) : advertiser.type ===
                      "tenant" ? (
                        <UserRound className="h-5 w-5" />
                    ) : (
                        <Building2 className="h-5 w-5" />
                    )}
                </div>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900">
                            {advertiser.name}
                        </h3>

                        <span
                            className={[
                                "rounded-full px-2.5 py-1 text-xs font-semibold",
                                type.badge,
                            ].join(
                                " ",
                            )}
                        >
                            {type.label}
                        </span>

                        <StatusBadge
                            status={
                                advertiser.status
                            }
                        />
                    </div>

                    {advertiser.legal_name && (
                        <div className="mt-1 text-sm text-slate-500">
                            {advertiser.legal_name}
                        </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        {advertiser.nif && (
                            <span>
                                NIF:{" "}
                                {advertiser.nif}
                            </span>
                        )}

                        {advertiser.email && (
                            <span>
                                {advertiser.email}
                            </span>
                        )}

                        {advertiser.phone && (
                            <span>
                                {advertiser.phone}
                            </span>
                        )}

                        {advertiser.website && (
                            <a
                                href={
                                    advertiser.website
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700"
                            >
                                Website

                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Campanhas
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-800">
                    {Number(
                        advertiser.campaigns_count ??
                            0,
                    ).toLocaleString(
                        "pt-PT",
                    )}
                </div>
            </div>

            <div className="lg:text-right">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Estado
                </div>

                <div className="mt-1 text-sm font-medium text-slate-700">
                    {statusLabel(
                        advertiser.status,
                    )}
                </div>
            </div>
        </article>
    );
}

function Field({
    label,
    hint,
    error,
    required = false,
    children,
}: {
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
                {label}

                {required && (
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                )}
            </span>

            {children}

            {error ? (
                <span className="mt-2 flex items-start gap-1.5 text-xs font-medium leading-5 text-red-600">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                    {error}
                </span>
            ) : hint ? (
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {hint}
                </span>
            ) : null}
        </label>
    );
}

function StatusBadge({
    status,
}: {
    status: AdAdvertiser["status"];
}) {
    const classes =
        status ===
        "active"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : status ===
                "pending"
              ? "bg-amber-50 text-amber-700 ring-amber-200"
              : "bg-red-50 text-red-700 ring-red-200";

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${classes}`}
        >
            {statusLabel(
                status,
            )}
        </span>
    );
}

function advertiserType(
    type: AdAdvertiser["type"],
) {
    if (
        type === "saas"
    ) {
        return {
            label:
                "FrotaPro",

            className:
                "bg-indigo-50 text-indigo-600",

            badge:
                "bg-indigo-50 text-indigo-700",
        };
    }

    if (
        type === "tenant"
    ) {
        return {
            label:
                "Gestor de frota",

            className:
                "bg-sky-50 text-sky-600",

            badge:
                "bg-sky-50 text-sky-700",
        };
    }

    return {
        label:
            "Parceiro externo",

        className:
            "bg-violet-50 text-violet-600",

        badge:
            "bg-violet-50 text-violet-700",
    };
}

function statusLabel(
    status: AdAdvertiser["status"],
): string {
    const labels = {
        active:
            "Ativo",

        pending:
            "Pendente",

        suspended:
            "Suspenso",
    };

    return labels[
        status
    ];
}

function parseApiError(
    error: unknown,
): {
    message: string;

    errors: Record<
        string,
        string[]
    >;
} {
    if (
        axios.isAxiosError<ValidationResponse>(
            error,
        )
    ) {
        const status =
            error.response
                ?.status;

        const data =
            error.response
                ?.data;

        if (
            status === 422
        ) {
            return {
                message:
                    "Existem informações obrigatórias ou inválidas. Corrija os campos indicados e tente novamente.",

                errors:
                    data?.errors ??
                    {},
            };
        }

        if (
            status === 401
        ) {
            return {
                message:
                    "A sua sessão expirou. Entre novamente no sistema.",

                errors: {},
            };
        }

        if (
            status === 403
        ) {
            return {
                message:
                    "Não tem permissão para gerir anunciantes.",

                errors: {},
            };
        }

        if (
            data?.message
        ) {
            return {
                message:
                    data.message,

                errors:
                    data.errors ??
                    {},
            };
        }

        if (
            status &&
            status >= 500
        ) {
            return {
                message:
                    "O servidor encontrou um erro ao guardar o anunciante. Tente novamente e consulte os logs se o problema continuar.",

                errors: {},
            };
        }
    }

    return {
        message:
            "Não foi possível comunicar com o servidor. Verifique a ligação e tente novamente.",

        errors: {},
    };
}

function getQueryErrorMessage(
    error: unknown,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const status =
            error.response
                ?.status;

        const message =
            error.response
                ?.data
                ?.message;

        if (
            status === 401
        ) {
            return "A sua sessão expirou. Entre novamente no sistema.";
        }

        if (
            status === 403
        ) {
            return "Não tem permissão para consultar os anunciantes.";
        }

        if (
            status &&
            status >= 500
        ) {
            return "O servidor encontrou um erro ao carregar os anunciantes.";
        }

        if (
            typeof message ===
            "string"
        ) {
            return message;
        }
    }

    if (
        error instanceof
            Error &&
        error.message
    ) {
        return error.message;
    }

    return "Ocorreu um erro inesperado ao carregar os anunciantes.";
}
