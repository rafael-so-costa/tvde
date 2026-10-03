import axios from "axios";
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Database,
    DatabaseZap,
    Eye,
    LoaderCircle,
    Search,
    UserPlus,
    X,
} from "lucide-react";
import {
    useDeferredValue,
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
} from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeTvdeNifEnrichmentSummary,
    BackofficeTvdeOperator,
    BackofficeTvdeOperatorListResponse,
    BackofficeTvdeSource,
} from "../types/backofficeCrm";

import type {
    BackofficeCrmProspectCreationResponse,
    BackofficeNifBatchMutationResponse,
} from "../types/backofficeCrmCommercial";

export default function BackofficeTvdeOperatorsPage() {
    const queryClient =
        useQueryClient();

    const navigate =
        useNavigate();

    const [search, setSearch] =
        useState("");

    const [source, setSource] =
        useState("");

    const [status, setStatus] =
        useState("active");

    const [customer, setCustomer] =
        useState("");

    const [
        enrichment,
        setEnrichment,
    ] = useState("");

    const [
        district,
        setDistrict,
    ] = useState("");

    const [
        municipality,
        setMunicipality,
    ] = useState("");

    const [page, setPage] =
        useState(1);

    const [
        selectedIds,
        setSelectedIds,
    ] = useState<
        Set<string>
    >(new Set());

    const deferredSearch =
        useDeferredValue(
            search,
        );

    const deferredDistrict =
        useDeferredValue(
            district,
        );

    const deferredMunicipality =
        useDeferredValue(
            municipality,
        );

    const operatorsQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "operadores",
                deferredSearch,
                source,
                status,
                customer,
                enrichment,
                deferredDistrict,
                deferredMunicipality,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/operadores",
                        {
                            params: {
                                search:
                                    deferredSearch ||
                                    undefined,

                                source:
                                    source ||
                                    undefined,

                                status:
                                    status ||
                                    undefined,

                                customer:
                                    customer ||
                                    undefined,

                                enrichment:
                                    enrichment ||
                                    undefined,

                                district:
                                    deferredDistrict ||
                                    undefined,

                                municipality:
                                    deferredMunicipality ||
                                    undefined,

                                page,

                                per_page: 20,
                            },
                        },
                    );

                return response
                    .data as BackofficeTvdeOperatorListResponse;
            },
        });

    const createLeadsMutation =
        useMutation({
            mutationFn:
                async () => {
                    const response =
                        await api.post(
                            "/api/backoffice/crm/prospects/operadores",
                            {
                                operator_ids:
                                    Array.from(
                                        selectedIds,
                                    ),

                                priority:
                                    "normal",
                            },
                        );

                    return response
                        .data as BackofficeCrmProspectCreationResponse;
                },

            onSuccess:
                async () => {
                    await queryClient.invalidateQueries({
                        queryKey: [
                            "backoffice",
                            "crm",
                            "dashboard",
                        ],
                    });

                    await queryClient.invalidateQueries({
                        queryKey: [
                            "backoffice",
                            "crm",
                            "leads",
                        ],
                    });

                    await queryClient.invalidateQueries({
                        queryKey: [
                            "backoffice",
                            "crm",
                            "pipeline",
                        ],
                    });
                },
        });

    const batchMutation =
        useMutation({
            mutationFn:
                async () => {
                    const response =
                        await api.post(
                            "/api/backoffice/crm/enriquecimento/lotes",
                            {
                                operator_ids:
                                    Array.from(
                                        selectedIds,
                                    ),

                                force_refresh:
                                    false,
                            },
                        );

                    return response
                        .data as BackofficeNifBatchMutationResponse;
                },

            onSuccess:
                (
                    response,
                ) => {
                    void queryClient.invalidateQueries({
                        queryKey: [
                            "backoffice",
                            "crm",
                            "nif-batches",
                        ],
                    });

                    navigate(
                        `/backoffice/crm/enriquecimento/lotes/${response.data.id}`,
                    );
                },
        });

    const operators =
        operatorsQuery
            .data
            ?.data ?? [];

    const meta =
        operatorsQuery
            .data
            ?.meta;

    const pageIds =
        operators.map(
            (
                operator,
            ) => operator.id,
        );

    const allPageSelected =
        pageIds.length >
            0 &&
        pageIds.every(
            (
                id,
            ) =>
                selectedIds.has(
                    id,
                ),
        );

    function resetPage(): void {
        setPage(1);
    }

    function toggleOperator(
        id: string,
    ): void {
        setSelectedIds(
            (
                current,
            ) => {
                const next =
                    new Set(
                        current,
                    );

                if (
                    next.has(
                        id,
                    )
                ) {
                    next.delete(
                        id,
                    );
                } else {
                    if (
                        next.size >=
                        100
                    ) {
                        return current;
                    }

                    next.add(
                        id,
                    );
                }

                return next;
            },
        );
    }

    function toggleCurrentPage(): void {
        setSelectedIds(
            (
                current,
            ) => {
                const next =
                    new Set(
                        current,
                    );

                if (
                    allPageSelected
                ) {
                    pageIds.forEach(
                        (
                            id,
                        ) =>
                            next.delete(
                                id,
                            ),
                    );
                } else {
                    pageIds.forEach(
                        (
                            id,
                        ) => {
                            if (
                                next.size <
                                100
                            ) {
                                next.add(
                                    id,
                                );
                            }
                        },
                    );
                }

                return next;
            },
        );
    }

    const selectedCount =
        selectedIds.size;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · Base oficial TVDE
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Operadores TVDE
                        </h1>

                        <p className="mt-2 text-slate-500">
                            Entidades identificadas nas listas oficiais IMT e RAM.
                        </p>
                    </div>

                    {meta && (
                        <div className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-900">
                                {formatNumber(
                                    meta.total,
                                )}
                            </span>{" "}
                            operadores
                        </div>
                    )}
                </div>
            </section>

            {selectedCount >
                0 && (
                <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div>
                            <div className="font-semibold text-indigo-950">
                                {selectedCount} operador(es) selecionado(s)
                            </div>

                            <div className="mt-1 text-sm text-indigo-700">
                                A seleção pode ser mantida ao navegar entre páginas. Máximo: 100 operadores.
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={
                                    createLeadsMutation.isPending
                                }
                                onClick={() =>
                                    createLeadsMutation.mutate()
                                }
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {createLeadsMutation.isPending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <UserPlus className="h-4 w-4" />
                                )}

                                Criar leads
                            </button>

                            <button
                                type="button"
                                disabled={
                                    batchMutation.isPending
                                }
                                onClick={() =>
                                    batchMutation.mutate()
                                }
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {batchMutation.isPending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <DatabaseZap className="h-4 w-4" />
                                )}

                                Enriquecer NIF.PT
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedIds(
                                        new Set(),
                                    )
                                }
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700"
                            >
                                <X className="h-4 w-4" />
                                Limpar
                            </button>
                        </div>
                    </div>

                    {createLeadsMutation.isSuccess && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {
                                createLeadsMutation
                                    .data
                                    .message
                            }

                            {" "}
                            Criados:{" "}
                            {
                                createLeadsMutation
                                    .data
                                    .data
                                    .counts
                                    .created
                            }
                            . Existentes:{" "}
                            {
                                createLeadsMutation
                                    .data
                                    .data
                                    .counts
                                    .existing
                            }
                            . Clientes:{" "}
                            {
                                createLeadsMutation
                                    .data
                                    .data
                                    .counts
                                    .customers
                            }
                            .
                        </div>
                    )}

                    {createLeadsMutation.isError && (
                        <ErrorBox
                            error={
                                createLeadsMutation.error
                            }
                        />
                    )}

                    {batchMutation.isError && (
                        <ErrorBox
                            error={
                                batchMutation.error
                            }
                        />
                    )}
                </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 xl:grid-cols-[1.5fr_160px_160px_170px]">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event,
                            ) => {
                                setSearch(
                                    event
                                        .target
                                        .value,
                                );

                                resetPage();
                            }}
                            placeholder="Pesquisar empresa ou NIF..."
                            className={inputClass}
                        />
                    </div>

                    <select
                        value={
                            source
                        }
                        onChange={(
                            event,
                        ) => {
                            setSource(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={selectClass}
                    >
                        <option value="">
                            Todas as fontes
                        </option>

                        <option value="imt_continental">
                            IMT
                        </option>

                        <option value="ram">
                            RAM
                        </option>
                    </select>

                    <select
                        value={
                            status
                        }
                        onChange={(
                            event,
                        ) => {
                            setStatus(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={selectClass}
                    >
                        <option value="">
                            Todos
                        </option>

                        <option value="active">
                            Ativos
                        </option>

                        <option value="inactive">
                            Removidos
                        </option>
                    </select>

                    <select
                        value={
                            customer
                        }
                        onChange={(
                            event,
                        ) => {
                            setCustomer(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={selectClass}
                    >
                        <option value="">
                            Todos
                        </option>

                        <option value="no">
                            Prospects
                        </option>

                        <option value="yes">
                            Clientes FrotaPRO
                        </option>
                    </select>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <select
                        value={
                            enrichment
                        }
                        onChange={(
                            event,
                        ) => {
                            setEnrichment(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={selectClass}
                    >
                        <option value="">
                            Todos NIF.PT
                        </option>

                        <option value="not_queried">
                            Não consultados
                        </option>

                        <option value="success">
                            Enriquecidos
                        </option>

                        <option value="not_found">
                            Sem resultado
                        </option>

                        <option value="invalid">
                            NIF inválido
                        </option>

                        <option value="error">
                            Erro
                        </option>

                        <option value="expired">
                            Cache expirado
                        </option>
                    </select>

                    <input
                        value={
                            district
                        }
                        onChange={(
                            event,
                        ) => {
                            setDistrict(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        placeholder="Distrito, ex.: Lisboa"
                        className={plainInputClass}
                    />

                    <input
                        value={
                            municipality
                        }
                        onChange={(
                            event,
                        ) => {
                            setMunicipality(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        placeholder="Concelho, ex.: Sintra"
                        className={plainInputClass}
                    />
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {operatorsQuery.isLoading ? (
                    <div className="flex min-h-72 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : operatorsQuery.isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar a base TVDE.
                    </div>
                ) : operators.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <Database className="mx-auto h-10 w-10 text-slate-300" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            Nenhum operador encontrado
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Ajuste os filtros ou a pesquisa.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="w-12 px-5 py-3.5">
                                        <input
                                            type="checkbox"
                                            checked={
                                                allPageSelected
                                            }
                                            onChange={
                                                toggleCurrentPage
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>

                                    <th className={thClass}>
                                        Operador
                                    </th>

                                    <th className={thClass}>
                                        Fonte
                                    </th>

                                    <th className={thClass}>
                                        Localização
                                    </th>

                                    <th className={thClass}>
                                        NIF.PT
                                    </th>

                                    <th className={thClass}>
                                        CRM
                                    </th>

                                    <th className={thClass}>
                                        Estado
                                    </th>

                                    <th className={`${thClass} text-right`}>
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {operators.map(
                                    (
                                        operator,
                                    ) => (
                                        <OperatorRow
                                            key={
                                                operator.id
                                            }
                                            operator={
                                                operator
                                            }
                                            selected={
                                                selectedIds.has(
                                                    operator.id,
                                                )
                                            }
                                            onToggle={() =>
                                                toggleOperator(
                                                    operator.id,
                                                )
                                            }
                                        />
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta &&
                    meta.last_page >
                        1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                            <div className="text-sm text-slate-500">
                                {meta.from}–
                                {meta.to} de{" "}
                                {formatNumber(
                                    meta.total,
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={
                                        meta.current_page <=
                                        1
                                    }
                                    onClick={() =>
                                        setPage(
                                            (
                                                current,
                                            ) =>
                                                current -
                                                1,
                                        )
                                    }
                                    className={paginationButtonClass}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        meta.current_page >=
                                        meta.last_page
                                    }
                                    onClick={() =>
                                        setPage(
                                            (
                                                current,
                                            ) =>
                                                current +
                                                1,
                                        )
                                    }
                                    className={paginationButtonClass}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
            </section>
        </div>
    );
}

function OperatorRow({
    operator,
    selected,
    onToggle,
}: {
    operator: BackofficeTvdeOperator;
    selected: boolean;
    onToggle: () => void;
}) {
    const locations =
        operator.registrations
            .filter(
                (
                    registration,
                ) =>
                    registration.active,
            )
            .map(
                (
                    registration,
                ) =>
                    [
                        registration.district,
                        registration.municipality,
                    ]
                        .filter(
                            Boolean,
                        )
                        .join(
                            " · ",
                        ),
            )
            .filter(
                Boolean,
            );

    const uniqueLocations = [
        ...new Set(
            locations,
        ),
    ];

    return (
        <tr
            className={[
                "transition",
                selected
                    ? "bg-indigo-50/60"
                    : "hover:bg-slate-50/70",
            ].join(
                " ",
            )}
        >
            <td className="px-5 py-4">
                <input
                    type="checkbox"
                    checked={
                        selected
                    }
                    onChange={
                        onToggle
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
            </td>

            <td className="px-5 py-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Building2 className="h-5 w-5" />
                    </div>

                    <div>
                        <div className="font-semibold text-slate-900">
                            {
                                operator.display_name
                            }
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                            NIF{" "}
                            {
                                operator.nif
                            }
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                    {operator.sources.map(
                        (
                            item,
                        ) => (
                            <SourceBadge
                                key={
                                    item
                                }
                                source={
                                    item
                                }
                            />
                        ),
                    )}
                </div>
            </td>

            <td className="px-5 py-4 text-sm text-slate-600">
                {uniqueLocations.length >
                0
                    ? uniqueLocations.join(
                          " / ",
                      )
                    : "—"}
            </td>

            <td className="px-5 py-4">
                <NifStatusBadge
                    enrichment={
                        operator.nif_enrichment
                    }
                />
            </td>

            <td className="px-5 py-4">
                {operator.is_customer ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Cliente
                    </span>
                ) : (
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        Prospect
                    </span>
                )}
            </td>

            <td className="px-5 py-4">
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        operator.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700",
                    ].join(
                        " ",
                    )}
                >
                    {operator.active
                        ? "Ativo"
                        : "Removido"}
                </span>
            </td>

            <td className="px-5 py-4">
                <div className="flex justify-end">
                    <Link
                        to={`/backoffice/crm/operadores/${operator.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                        <Eye className="h-4 w-4" />
                        Ver
                    </Link>
                </div>
            </td>
        </tr>
    );
}

function ErrorBox({
    error,
}: {
    error: unknown;
}) {
    return (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage(
                error,
            )}
        </div>
    );
}

function errorMessage(
    error: unknown,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const message =
            error.response?.data
                ?.message;

        if (
            typeof message ===
            "string"
        ) {
            return message;
        }

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
                )[0];

            if (
                Array.isArray(
                    first,
                )
            ) {
                return String(
                    first[0],
                );
            }
        }
    }

    return "Não foi possível concluir a operação.";
}

function NifStatusBadge({
    enrichment,
}: {
    enrichment:
        | BackofficeTvdeNifEnrichmentSummary
        | null;
}) {
    if (
        !enrichment
    ) {
        return (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Não consultado
            </span>
        );
    }

    if (
        enrichment.lookup_status ===
            "success" &&
        !enrichment.cache_is_fresh
    ) {
        return (
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                Cache expirado
            </span>
        );
    }

    const config = {
        success: [
            "Enriquecido",
            "bg-emerald-50 text-emerald-700",
        ],

        not_found: [
            "Sem resultado",
            "bg-slate-100 text-slate-600",
        ],

        invalid: [
            "NIF inválido",
            "bg-red-50 text-red-700",
        ],

        error: [
            "Erro",
            "bg-red-50 text-red-700",
        ],

        pending: [
            "Pendente",
            "bg-amber-50 text-amber-700",
        ],
    }[
        enrichment.lookup_status
    ];

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config[1]}`}
        >
            {
                config[0]
            }
        </span>
    );
}

function SourceBadge({
    source,
}: {
    source: BackofficeTvdeSource;
}) {
    const ram =
        source ===
        "ram";

    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                ram
                    ? "bg-violet-50 text-violet-700"
                    : "bg-indigo-50 text-indigo-700",
            ].join(
                " ",
            )}
        >
            {ram
                ? "RAM"
                : "IMT"}
        </span>
    );
}

function formatNumber(
    value: number,
): string {
    return new Intl.NumberFormat(
        "pt-PT",
    ).format(
        value,
    );
}

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const plainInputClass =
    "h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const selectClass =
    "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500";

const paginationButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40";

const thClass =
    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";
