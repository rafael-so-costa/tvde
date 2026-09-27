import {
    Activity,
    Building2,
    CalendarDays,
    Car,
    LoaderCircle,
    UserRound,
    UsersRound,
} from "lucide-react";
import {
    useQuery,
} from "@tanstack/react-query";

import api from "../lib/api";

import type {
    BackofficeDashboardData,
} from "../types/backoffice";

export default function BackofficeDashboardPage() {
    const dashboardQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "dashboard",
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/dashboard"
                    );

                return response
                    .data
                    .data as BackofficeDashboardData;
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
                Não foi possível carregar o backoffice.
            </div>
        );
    }

    const {
        metrics,
        recent_tenants,
    } = dashboardQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    Visão global
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Dashboard SaaS
                </h1>

                <p className="mt-2 max-w-2xl text-slate-500">
                    Indicadores globais da plataforma FrotaPRO, independentes da organização selecionada.
                </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                    label="Organizações"
                    value={
                        metrics.tenants_total
                    }
                    icon={Building2}
                />

                <Metric
                    label="Organizações ativas"
                    value={
                        metrics.tenants_active
                    }
                    icon={Activity}
                />

                <Metric
                    label="Novas em 30 dias"
                    value={
                        metrics.tenants_last_30_days
                    }
                    icon={CalendarDays}
                />

                <Metric
                    label="Utilizadores ativos"
                    value={
                        metrics.users_active
                    }
                    icon={UsersRound}
                />

                <Metric
                    label="Empresas ativas"
                    value={
                        metrics.empresas_active
                    }
                    icon={Building2}
                />

                <Metric
                    label="Veículos"
                    value={
                        metrics.veiculos_total
                    }
                    icon={Car}
                />

                <Metric
                    label="Motoristas"
                    value={
                        metrics.motoristas_total
                    }
                    icon={UserRound}
                />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                        Organizações recentes
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Últimos clientes/tenants criados na plataforma.
                    </p>
                </div>

                {recent_tenants.length ===
                0 ? (
                    <div className="px-6 py-16 text-center text-sm text-slate-400">
                        Nenhuma organização registada.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Organização
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Utilizadores
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Frota
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Criada
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {recent_tenants.map(
                                    tenant => (
                                        <tr
                                            key={
                                                tenant.id
                                            }
                                            className="transition hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900">
                                                    {
                                                        tenant.nome
                                                    }
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {tenant.nif
                                                        ? `NIF ${tenant.nif}`
                                                        : tenant.email ??
                                                          tenant.slug}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span
                                                        className={[
                                                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                            tenant.ativo
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-slate-100 text-slate-600",
                                                        ].join(
                                                            " "
                                                        )}
                                                    >
                                                        {tenant.ativo
                                                            ? "Ativa"
                                                            : "Inativa"}
                                                    </span>

                                                    {tenant.onboarding_required && (
                                                        <span className="text-xs text-amber-600">
                                                            Onboarding pendente
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {
                                                    tenant.users_count
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {
                                                    tenant.veiculos_count
                                                }{" "}
                                                veículos ·{" "}
                                                {
                                                    tenant.motoristas_count
                                                }{" "}
                                                motoristas
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-500">
                                                {formatDate(
                                                    tenant.created_at
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function Metric({
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
                {value}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
                {label}
            </div>
        </div>
    );
}

function formatDate(
    value: string
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    ).format(
        new Date(value)
    );
}
