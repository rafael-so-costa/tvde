import {
    Activity,
    ArrowRight,
    Building2,
    Database,
    Layers3,
    LoaderCircle,
    UsersRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeCrmDashboardData,
    BackofficeTvdeImportSummary,
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

    if (dashboardQuery.isLoading) {
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
        latest_sources,
        recent_imports,
    } = dashboardQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · Base oficial TVDE
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Dashboard CRM
                        </h1>

                        <p className="mt-2 max-w-2xl text-slate-500">
                            Visão consolidada dos operadores TVDE provenientes das fontes oficiais IMT e RAM.
                        </p>
                    </div>

                    <Link
                        to="/backoffice/crm/operadores"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        Ver operadores

                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Operadores ativos"
                    value={
                        metrics.operators_active
                    }
                    icon={Building2}
                />

                <MetricCard
                    label="Prospects"
                    value={
                        metrics.prospects
                    }
                    icon={UsersRound}
                />

                <MetricCard
                    label="Clientes FrotaPRO"
                    value={
                        metrics.customers
                    }
                    icon={Activity}
                />

                <MetricCard
                    label="Registos ativos"
                    value={
                        metrics.registrations_active
                    }
                    icon={Database}
                />

                <MetricCard
                    label="IMT ativos"
                    value={
                        metrics.imt_active
                    }
                    icon={Layers3}
                />

                <MetricCard
                    label="RAM ativos"
                    value={
                        metrics.ram_active
                    }
                    icon={Layers3}
                />

                <MetricCard
                    label="IMT + RAM"
                    value={
                        metrics.both_sources
                    }
                    icon={Database}
                />

                <MetricCard
                    label="Histórico total"
                    value={
                        metrics.operators_historical
                    }
                    icon={Building2}
                />
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
                <SourceCard
                    title="IMT"
                    description="Lista oficial de operadores TVDE."
                    importData={
                        latest_sources.imt
                    }
                />

                <SourceCard
                    title="RAM"
                    description="Lista oficial da Região Autónoma da Madeira."
                    importData={
                        latest_sources.ram
                    }
                />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                        Importações recentes
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Últimos snapshots oficiais processados pelo FrotaPRO.
                    </p>
                </div>

                {recent_imports.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm text-slate-400">
                        Nenhuma importação disponível.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className={thClass}>
                                        Fonte
                                    </th>

                                    <th className={thClass}>
                                        Referência
                                    </th>

                                    <th className={thClass}>
                                        Registos
                                    </th>

                                    <th className={thClass}>
                                        Novos
                                    </th>

                                    <th className={thClass}>
                                        Alterados
                                    </th>

                                    <th className={thClass}>
                                        Removidos
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {recent_imports.map(
                                    (item) => (
                                        <tr
                                            key={item.id}
                                            className="transition hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <SourceBadge
                                                    source={
                                                        item.source
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {formatDate(
                                                    item.reference_date,
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                                                {formatNumber(
                                                    item.total_records,
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-emerald-700">
                                                +
                                                {formatNumber(
                                                    item.new_records,
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-amber-700">
                                                {formatNumber(
                                                    item.changed_records,
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-red-700">
                                                {item.removed_records >
                                                0
                                                    ? `-${formatNumber(item.removed_records)}`
                                                    : "0"}
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
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
    value: number;
    icon: typeof Building2;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
            </div>

            <div className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {formatNumber(value)}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
                {label}
            </div>
        </div>
    );
}

function SourceCard({
    title,
    description,
    importData,
}: {
    title: string;
    description: string;
    importData:
        | BackofficeTvdeImportSummary
        | null;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-950">
                        {title}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        {description}
                    </p>
                </div>

                <Database className="h-5 w-5 text-indigo-500" />
            </div>

            {importData ? (
                <div className="mt-5 grid grid-cols-2 gap-4">
                    <Info
                        label="Última lista"
                        value={formatDate(
                            importData.reference_date,
                        )}
                    />

                    <Info
                        label="Registos"
                        value={formatNumber(
                            importData.total_records,
                        )}
                    />

                    <Info
                        label="Novos"
                        value={formatNumber(
                            importData.new_records,
                        )}
                    />

                    <Info
                        label="Alterados"
                        value={formatNumber(
                            importData.changed_records,
                        )}
                    />
                </div>
            ) : (
                <div className="mt-5 text-sm text-slate-400">
                    Nenhuma importação disponível.
                </div>
            )}
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

            <div className="mt-1 font-semibold text-slate-800">
                {value}
            </div>
        </div>
    );
}

function SourceBadge({
    source,
}: {
    source: string;
}) {
    const ram =
        source === "ram";

    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                ram
                    ? "bg-violet-50 text-violet-700"
                    : "bg-indigo-50 text-indigo-700",
            ].join(" ")}
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
    ).format(value);
}

function formatDate(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle: "short",
        },
    ).format(
        new Date(value),
    );
}

const thClass =
    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";
