import {
    Activity,
    ArrowRight,
    Building2,
    CalendarClock,
    CheckCircle2,
    Database,
    DatabaseZap,
    LoaderCircle,
    Target,
    TrendingUp,
    UsersRound,
} from "lucide-react";
import {
    useQuery,
} from "@tanstack/react-query";
import {
    Link,
} from "react-router-dom";

import CrmStageBadge from "../components/CrmStageBadge";
import api from "../lib/api";

import type {
    BackofficeCrmDashboardData,
} from "../types/backofficeCrm";

export default function BackofficeCrmDashboardPage() {
    const dashboardQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "dashboard",
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/dashboard",
                    );

                return response
                    .data
                    .data as BackofficeCrmDashboardData;
            },
        });

    if (
        dashboardQuery.isLoading
    ) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (
        dashboardQuery.isError ||
        !dashboardQuery.data
    ) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Não foi possível carregar o dashboard CRM.
            </div>
        );
    }

    const {
        metrics,
        commercial,
        enrichment,
        pipeline,
        recent_activities,
        latest_sources,
    } = dashboardQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · FrotaPRO
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Dashboard CRM
                        </h1>

                        <p className="mt-2 max-w-2xl text-slate-500">
                            Operadores TVDE, prospeção, pipeline, atividades e conversão comercial numa única visão.
                        </p>
                    </div>

                    <Link
                        to="/backoffice/crm/leads"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        Ver leads
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                    label="Leads"
                    value={
                        commercial.leads_total
                    }
                    icon={
                        UsersRound
                    }
                />

                <MetricCard
                    label="Pipeline aberto"
                    value={
                        commercial.open_leads
                    }
                    icon={
                        Target
                    }
                />

                <MetricCard
                    label="Convertidos"
                    value={
                        commercial.won_leads
                    }
                    icon={
                        CheckCircle2
                    }
                />

                <MetricCard
                    label="Conversão"
                    value={`${commercial.conversion_rate.toLocaleString(
                        "pt-PT",
                        {
                            maximumFractionDigits:
                                2,
                        },
                    )}%`}
                    icon={
                        TrendingUp
                    }
                />

                <MetricCard
                    label="Follow-ups atrasados"
                    value={
                        commercial.overdue_follow_ups
                    }
                    icon={
                        CalendarClock
                    }
                />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Pipeline comercial
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Distribuição atual dos leads.
                            </p>
                        </div>

                        <Link
                            to="/backoffice/crm/pipeline"
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                            Abrir pipeline
                        </Link>
                    </div>

                    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                        {pipeline.map(
                            (
                                stage,
                            ) => (
                                <div
                                    key={
                                        stage.id
                                    }
                                    className="rounded-xl border border-slate-200 p-4"
                                >
                                    <CrmStageBadge
                                        stage={
                                            stage
                                        }
                                    />

                                    <div className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                                        {formatNumber(
                                            stage.leads_count,
                                        )}
                                    </div>

                                    <div className="mt-1 text-xs text-slate-400">
                                        lead(s)
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">
                            Atividades
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Agenda comercial.
                        </p>
                    </div>

                    <div className="grid gap-3 p-5">
                        <SmallMetric
                            label="Planeadas hoje"
                            value={
                                commercial.planned_activities_today
                            }
                            icon={
                                CalendarClock
                            }
                        />

                        <SmallMetric
                            label="Atividades atrasadas"
                            value={
                                commercial.overdue_activities
                            }
                            icon={
                                Activity
                            }
                        />

                        <SmallMetric
                            label="Novos leads / 30 dias"
                            value={
                                commercial.new_leads_30d
                            }
                            icon={
                                UsersRound
                            }
                        />

                        <SmallMetric
                            label="Convertidos / 30 dias"
                            value={
                                commercial.converted_30d
                            }
                            icon={
                                CheckCircle2
                            }
                        />
                    </div>
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-3">
                <MetricCard
                    label="Operadores TVDE ativos"
                    value={
                        metrics.operators_active
                    }
                    icon={
                        Building2
                    }
                />

                <MetricCard
                    label="Prospects TVDE"
                    value={
                        metrics.prospects
                    }
                    icon={
                        Database
                    }
                />

                <MetricCard
                    label="Clientes FrotaPRO na base"
                    value={
                        metrics.customers
                    }
                    icon={
                        CheckCircle2
                    }
                />
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Enriquecimento NIF.PT
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Estado da base enriquecida.
                            </p>
                        </div>

                        <DatabaseZap className="h-5 w-5 text-indigo-600" />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                        <Info
                            label="Enriquecidos"
                            value={
                                formatNumber(
                                    enrichment.successful,
                                )
                            }
                        />

                        <Info
                            label="Não consultados"
                            value={
                                formatNumber(
                                    enrichment.not_queried,
                                )
                            }
                        />

                        <Info
                            label="Erros"
                            value={
                                formatNumber(
                                    enrichment.errors,
                                )
                            }
                        />

                        <Info
                            label="Lotes ativos"
                            value={
                                formatNumber(
                                    enrichment.active_batches,
                                )
                            }
                        />
                    </div>

                    <Link
                        to="/backoffice/crm/enriquecimento/lotes"
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                    >
                        Ver lotes NIF.PT
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="font-semibold text-slate-900">
                        Fontes oficiais
                    </h2>

                    <div className="mt-5 space-y-4">
                        <SourceLine
                            label="IMT"
                            date={
                                latest_sources.imt
                                    ?.reference_date ??
                                null
                            }
                            records={
                                latest_sources.imt
                                    ?.total_records ??
                                null
                            }
                        />

                        <SourceLine
                            label="RAM"
                            date={
                                latest_sources.ram
                                    ?.reference_date ??
                                null
                            }
                            records={
                                latest_sources.ram
                                    ?.total_records ??
                                null
                            }
                        />
                    </div>

                    <Link
                        to="/backoffice/crm/importacoes"
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                    >
                        Ver importações
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Atividade recente
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Últimas interações comerciais registadas.
                        </p>
                    </div>

                    <Link
                        to="/backoffice/crm/atividades"
                        className="text-sm font-semibold text-indigo-600"
                    >
                        Ver todas
                    </Link>
                </div>

                {recent_activities.length ===
                0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-400">
                        Nenhuma atividade registada.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {recent_activities.map(
                            (
                                activity,
                            ) => (
                                <div
                                    key={
                                        activity.id
                                    }
                                    className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
                                >
                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            {
                                                activity.subject
                                            }
                                        </div>

                                        <div className="mt-1 text-sm text-slate-500">
                                            {activity.lead
                                                ?.company_name ??
                                                "Lead indisponível"}
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-400">
                                        {formatDateTime(
                                            activity.created_at,
                                        )}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value:
        | number
        | string;
    icon: typeof Building2;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
            </div>

            <div className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {typeof value ===
                "number"
                    ? formatNumber(
                          value,
                      )
                    : value}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
                {label}
            </div>
        </div>
    );
}

function SmallMetric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Activity;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon className="h-4 w-4" />
            </div>

            <div>
                <div className="font-bold text-slate-900">
                    {formatNumber(
                        value,
                    )}
                </div>

                <div className="text-xs text-slate-500">
                    {label}
                </div>
            </div>
        </div>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-xl font-bold text-slate-900">
                {value}
            </div>
        </div>
    );
}

function SourceLine({
    label,
    date,
    records,
}: {
    label: string;
    date: string | null;
    records: number | null;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
            <div>
                <div className="font-semibold text-slate-900">
                    {label}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                    {date
                        ? formatDate(
                              date,
                          )
                        : "Sem importação"}
                </div>
            </div>

            <div className="text-right">
                <div className="font-bold text-slate-900">
                    {records ===
                    null
                        ? "—"
                        : formatNumber(
                              records,
                          )}
                </div>

                <div className="text-xs text-slate-400">
                    registos
                </div>
            </div>
        </div>
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

function formatDate(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:
                "short",
        },
    ).format(
        new Date(
            value,
        ),
    );
}

function formatDateTime(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:
                "short",
            timeStyle:
                "short",
        },
    ).format(
        new Date(
            value,
        ),
    );
}
