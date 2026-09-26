import {
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    AlertTriangle,
    Bell,
    Check,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    Clock3,
    ExternalLink,
    LoaderCircle,
    Search,
    ShieldCheck,
} from "lucide-react";

import {
    Link,
} from "react-router-dom";

import {
    acknowledgeAlert,
    alertKeys,
    fetchAlerts,
    fetchAlertSummary,
    markAlertRead,
    markAllAlertsRead,
    resolveAlert,
    snoozeAlert,
} from "../lib/alerts";

import {
    useTenant,
} from "../contexts/TenantContext";

import NotificationPreferencesPanel
    from "../components/alerts/NotificationPreferencesPanel";

import type {
    AlertFilters,
    AlertItem,
    AlertSeverity,
} from "../types/alerts";

const CATEGORY_LABELS:
    Record<string,string> = {
        document:"Documentos",
        contract:"Contratos",
        rental:"Alugueres",
        claim:"Sinistros",
        maintenance:"Manutenção",
        diagnostic:"Diagnósticos",
        inventory:"Estoque",
        purchase:"Compras",
    };

export default function AlertsPage() {
    const { tenant }=useTenant();

    const queryClient=
        useQueryClient();

    const [filters,setFilters]=
        useState<AlertFilters>({
            status:"open",
            severity:"",
            category:"",
            unread:"",
            acknowledged:"",
            include_snoozed:false,
            search:"",
            page:1,
            per_page:20,
        });

    const summaryQuery=useQuery({
        queryKey:
            alertKeys.summary(
                tenant?.id,
            ),

        enabled:Boolean(tenant),

        queryFn:
            fetchAlertSummary,

        refetchInterval:
            60_000,
    });

    const listQuery=useQuery({
        queryKey:
            alertKeys.list(
                tenant?.id,
                filters,
            ),

        enabled:Boolean(tenant),

        queryFn:()=>
            fetchAlerts(
                filters,
            ),
    });

    function invalidate() {
        queryClient
            .invalidateQueries({
                queryKey:
                    alertKeys.root,
            });
    }

    const markReadMutation=
        useMutation({
            mutationFn:
                markAlertRead,

            onSuccess:
                invalidate,
        });

    const acknowledgeMutation=
        useMutation({
            mutationFn:
                acknowledgeAlert,

            onSuccess:
                invalidate,
        });

    const snoozeMutation=
        useMutation({
            mutationFn:
                ({
                    id,
                    until,
                }: {
                    id:string;
                    until:string;
                })=>
                    snoozeAlert(
                        id,
                        until,
                    ),

            onSuccess:
                invalidate,
        });

    const resolveMutation=
        useMutation({
            mutationFn:
                resolveAlert,

            onSuccess:
                invalidate,
        });

    const markAllMutation=
        useMutation({
            mutationFn:
                markAllAlertsRead,

            onSuccess:
                invalidate,
        });

    if(!tenant){
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    Selecione uma organização para consultar os alertas.
                </div>
            </div>
        );
    }

    const summary=
        summaryQuery.data;

    const list=
        listQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Central operacional
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Alertas
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Ocorrências persistentes, destinatários e notificações numa única fonte de verdade.
                    </p>
                </div>

                <button
                    type="button"
                    disabled={
                        markAllMutation
                            .isPending ||
                        !summary?.unread
                    }
                    onClick={()=>
                        markAllMutation
                            .mutate()
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
                >
                    <CheckCheck className="h-4 w-4" />
                    Marcar todos como lidos
                </button>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                    label="Ativos"
                    value={summary?.total}
                    icon={Bell}
                />

                <SummaryCard
                    label="Não lidos"
                    value={summary?.unread}
                    icon={Bell}
                />

                <SummaryCard
                    label="Críticos"
                    value={summary?.critical}
                    icon={AlertTriangle}
                    emphasis="critical"
                />

                <SummaryCard
                    label="Alta prioridade"
                    value={summary?.high}
                    icon={AlertTriangle}
                    emphasis="high"
                />

                <SummaryCard
                    label="Adiados"
                    value={summary?.snoozed}
                    icon={Clock3}
                />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <div className="xl:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Pesquisa
                        </label>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                                value={
                                    filters.search ??
                                    ""
                                }
                                onChange={event=>
                                    setFilters(
                                        current=>({
                                            ...current,
                                            search:
                                                event.target.value,
                                            page:1,
                                        }),
                                    )
                                }
                                placeholder="Título, mensagem ou regra..."
                                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <FilterSelect
                        label="Estado"
                        value={
                            filters.status ??
                            "open"
                        }
                        options={[
                            ["open","Ativos"],
                            ["resolved","Resolvidos"],
                            ["all","Todos"],
                        ]}
                        onChange={value=>
                            setFilters(
                                current=>({
                                    ...current,
                                    status:
                                        value as AlertFilters[
                                            "status"
                                        ],
                                    page:1,
                                }),
                            )
                        }
                    />

                    <FilterSelect
                        label="Severidade"
                        value={
                            filters.severity ??
                            ""
                        }
                        options={[
                            ["","Todas"],
                            ["critical","Crítica"],
                            ["high","Alta"],
                            ["medium","Média"],
                            ["low","Baixa"],
                        ]}
                        onChange={value=>
                            setFilters(
                                current=>({
                                    ...current,
                                    severity:
                                        value as AlertFilters[
                                            "severity"
                                        ],
                                    page:1,
                                }),
                            )
                        }
                    />

                    <FilterSelect
                        label="Categoria"
                        value={
                            filters.category ??
                            ""
                        }
                        options={[
                            ["","Todas"],
                            ...Object.entries(
                                CATEGORY_LABELS,
                            ),
                        ]}
                        onChange={value=>
                            setFilters(
                                current=>({
                                    ...current,
                                    category:value,
                                    page:1,
                                }),
                            )
                        }
                    />

                    <FilterSelect
                        label="Leitura"
                        value={
                            filters.unread ??
                            ""
                        }
                        options={[
                            ["","Todos"],
                            ["1","Não lidos"],
                            ["0","Lidos"],
                        ]}
                        onChange={value=>
                            setFilters(
                                current=>({
                                    ...current,
                                    unread:
                                        value as AlertFilters[
                                            "unread"
                                        ],
                                    page:1,
                                }),
                            )
                        }
                    />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={
                                Boolean(
                                    filters
                                        .include_snoozed,
                                )
                            }
                            onChange={event=>
                                setFilters(
                                    current=>({
                                        ...current,
                                        include_snoozed:
                                            event
                                                .target
                                                .checked,
                                        page:1,
                                    }),
                                )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />

                        Incluir adiados
                    </label>

                    <FilterSelect
                        label=""
                        value={
                            filters
                                .acknowledged ??
                            ""
                        }
                        options={[
                            ["","Reconhecimento: todos"],
                            ["1","Reconhecidos"],
                            ["0","Não reconhecidos"],
                        ]}
                        onChange={value=>
                            setFilters(
                                current=>({
                                    ...current,
                                    acknowledged:
                                        value as AlertFilters[
                                            "acknowledged"
                                        ],
                                    page:1,
                                }),
                            )
                        }
                    />
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Ocorrências
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-400">
                            {list?.meta.total ?? 0} resultado
                            {(list?.meta.total ?? 0)===1
                                ? ""
                                : "s"}
                        </p>
                    </div>

                    {listQuery.isFetching && (
                        <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" />
                    )}
                </div>

                {listQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-400">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        A carregar alertas...
                    </div>
                ) : listQuery.isError ? (
                    <div className="px-5 py-12 text-center text-sm text-red-600">
                        Não foi possível carregar os alertas.
                    </div>
                ) : !list ||
                    list.data.length===0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-400">
                        Nenhum alerta corresponde aos filtros.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {list.data.map(
                            item=>(
                                <AlertRow
                                    key={item.id}
                                    item={item}
                                    canResolve={
                                        summary
                                            ?.can_resolve ??
                                        false
                                    }
                                    onRead={()=>
                                        markReadMutation
                                            .mutate(
                                                item.id,
                                            )
                                    }
                                    onAcknowledge={()=>
                                        acknowledgeMutation
                                            .mutate(
                                                item.id,
                                            )
                                    }
                                    onSnooze={()=>
                                        snoozeMutation
                                            .mutate({
                                                id:item.id,
                                                until:
                                                    new Date(
                                                        Date.now()+
                                                        24*
                                                        60*
                                                        60*
                                                        1000,
                                                    )
                                                        .toISOString(),
                                            })
                                    }
                                    onResolve={()=>
                                        resolveMutation
                                            .mutate(
                                                item.id,
                                            )
                                    }
                                />
                            ),
                        )}
                    </div>
                )}

                {list &&
                    list.meta.last_page>1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                        <button
                            type="button"
                            disabled={
                                list.meta
                                    .current_page<=1
                            }
                            onClick={()=>
                                setFilters(
                                    current=>({
                                        ...current,
                                        page:
                                            Math.max(
                                                1,
                                                (
                                                    current
                                                        .page ??
                                                    1
                                                )-1,
                                            ),
                                    }),
                                )
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </button>

                        <span className="text-xs text-slate-400">
                            Página{" "}
                            {
                                list.meta
                                    .current_page
                            }{" "}
                            de{" "}
                            {
                                list.meta
                                    .last_page
                            }
                        </span>

                        <button
                            type="button"
                            disabled={
                                list.meta
                                    .current_page>=
                                list.meta
                                    .last_page
                            }
                            onClick={()=>
                                setFilters(
                                    current=>({
                                        ...current,
                                        page:
                                            (
                                                current
                                                    .page ??
                                                1
                                            )+1,
                                    }),
                                )
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            Seguinte
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </section>

            <NotificationPreferencesPanel />
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon:Icon,
    emphasis,
}: {
    label:string;
    value:number | undefined;
    icon:typeof Bell;
    emphasis?:
        | "critical"
        | "high";
}) {
    const iconClasses=
        emphasis==="critical"
            ? "bg-red-50 text-red-600"
            : emphasis==="high"
              ? "bg-orange-50 text-orange-600"
              : "bg-indigo-50 text-indigo-600";

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClasses}`}
            >
                <Icon className="h-5 w-5" />
            </div>

            <div className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {value ?? "—"}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
                {label}
            </div>
        </div>
    );
}

function FilterSelect({
    label,
    value,
    options,
    onChange,
}: {
    label:string;
    value:string;
    options:[string,string][];
    onChange:(value:string)=>void;
}) {
    return (
        <div>
            {label && (
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                </label>
            )}

            <select
                value={value}
                onChange={event=>
                    onChange(
                        event.target.value,
                    )
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
            >
                {options.map(
                    ([optionValue,label])=>(
                        <option
                            key={
                                optionValue ||
                                label
                            }
                            value={
                                optionValue
                            }
                        >
                            {label}
                        </option>
                    ),
                )}
            </select>
        </div>
    );
}

function AlertRow({
    item,
    canResolve,
    onRead,
    onAcknowledge,
    onSnooze,
    onResolve,
}: {
    item:AlertItem;
    canResolve:boolean;
    onRead:()=>void;
    onAcknowledge:()=>void;
    onSnooze:()=>void;
    onResolve:()=>void;
}) {
    const managementUrl=
        typeof item.metadata
            ?.management_url===
            "string"
            ? item.metadata
                .management_url
            : null;

    const destination=
        managementUrl ??
        (
            item.action_url &&
            item.action_url!==
                "/alertas"
                ? item.action_url
                : null
        );

    return (
        <article
            className={`px-5 py-5 ${item.recipient?.read_at ? "" : "bg-indigo-50/25"}`}
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge
                            severity={
                                item.severity
                            }
                        />

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {CATEGORY_LABELS[
                                item.category
                            ] ??
                                item.category}
                        </span>

                        {!item
                            .recipient
                            ?.read_at && (
                            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                Novo
                            </span>
                        )}

                        {item
                            .recipient
                            ?.acknowledged_at && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Reconhecido
                            </span>
                        )}
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-slate-900">
                        {item.title}
                    </h3>

                    {item.message && (
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                            {item.message}
                        </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                        {item.due_at && (
                            <span>
                                Referência:{" "}
                                {formatDateTime(
                                    item.due_at,
                                )}
                            </span>
                        )}

                        {item.triggered_at && (
                            <span>
                                Gerado:{" "}
                                {formatDateTime(
                                    item.triggered_at,
                                )}
                            </span>
                        )}

                        {item.recipient
                            ?.snoozed_until && (
                            <span>
                                Adiado até:{" "}
                                {formatDateTime(
                                    item
                                        .recipient
                                        .snoozed_until,
                                )}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    {!item
                        .recipient
                        ?.read_at && (
                        <ActionButton
                            onClick={onRead}
                            icon={Check}
                            label="Lido"
                        />
                    )}

                    {!item
                        .recipient
                        ?.acknowledged_at &&
                        item.status===
                            "open" && (
                        <ActionButton
                            onClick={
                                onAcknowledge
                            }
                            icon={ShieldCheck}
                            label="Reconhecer"
                        />
                    )}

                    {item.status===
                        "open" && (
                        <ActionButton
                            onClick={
                                onSnooze
                            }
                            icon={Clock3}
                            label="Adiar 24h"
                        />
                    )}

                    {canResolve &&
                        item.status===
                            "open" && (
                        <ActionButton
                            onClick={
                                onResolve
                            }
                            icon={CheckCheck}
                            label="Resolver"
                        />
                    )}

                    {destination && (
                        <Link
                            to={destination}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir origem
                        </Link>
                    )}
                </div>
            </div>
        </article>
    );
}

function ActionButton({
    onClick,
    icon:Icon,
    label,
}: {
    onClick:()=>void;
    icon:typeof Check;
    label:string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );
}

function SeverityBadge({
    severity,
}: {
    severity:AlertSeverity;
}) {
    const classes={
        critical:
            "bg-red-50 text-red-700",
        high:
            "bg-orange-50 text-orange-700",
        medium:
            "bg-amber-50 text-amber-700",
        low:
            "bg-blue-50 text-blue-700",
    }[severity];

    const labels={
        critical:"Crítico",
        high:"Alta",
        medium:"Média",
        low:"Baixa",
    }[severity];

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
        >
            {labels}
        </span>
    );
}

function formatDateTime(
    value:string,
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:"short",
            timeStyle:"short",
        },
    ).format(
        new Date(value),
    );
}
