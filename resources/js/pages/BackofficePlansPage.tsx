import {
    CheckCircle2,
    Eye,
    Layers3,
    LoaderCircle,
    Plus,
    UsersRound,
    XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficePlan,
    BackofficePlanListResponse,
} from "../types/backoffice";

export default function BackofficePlansPage() {
    const plansQuery = useQuery({
        queryKey: [
            "backoffice",
            "planos",
        ],

        queryFn: async () => {
            const response =
                await api.get(
                    "/api/backoffice/planos",
                );

            return response
                .data as BackofficePlanListResponse;
        },
    });

    const plans =
        plansQuery.data?.data ??
        [];

    const activePlans =
        plans.filter(
            (plan) => plan.ativo,
        ).length;

    const tenants =
        plans.reduce(
            (total, plan) =>
                total +
                plan.tenants_count,
            0,
        );

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    Gestão SaaS
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Planos
                        </h1>

                        <p className="mt-2 text-slate-500">
                            Configure os planos, limites e funcionalidades
                            disponíveis para os clientes FrotaPRO.
                        </p>
                    </div>

                    <Link
                        to="/backoffice/planos/novo"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" />

                        Novo plano
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <SummaryCard
                    label="Planos"
                    value={
                        plans.length
                    }
                    icon={Layers3}
                />

                <SummaryCard
                    label="Planos ativos"
                    value={
                        activePlans
                    }
                    icon={
                        CheckCircle2
                    }
                />

                <SummaryCard
                    label="Clientes vinculados"
                    value={
                        tenants
                    }
                    icon={UsersRound}
                />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {plansQuery.isLoading ? (
                    <div className="flex min-h-72 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : plansQuery.isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar os planos.
                    </div>
                ) : plans.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <Layers3 className="mx-auto h-10 w-10 text-slate-300" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            Nenhum plano encontrado
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Crie o primeiro plano SaaS da plataforma.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Plano
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Clientes
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Limites
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Funcionalidades
                                    </th>

                                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {plans.map(
                                    (plan) => (
                                        <PlanRow
                                            key={
                                                plan.id
                                            }
                                            plan={
                                                plan
                                            }
                                        />
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

function PlanRow({
    plan,
}: {
    plan: BackofficePlan;
}) {
    const activeFeatures =
        Object.values(
            plan.features,
        ).filter(Boolean).length;

    return (
        <tr className="transition hover:bg-slate-50/70">
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Layers3 className="h-5 w-5" />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                                {
                                    plan.nome
                                }
                            </span>

                            {plan.codigo ===
                                "starter" && (
                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                                    Base
                                </span>
                            )}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                            {
                                plan.codigo
                            }{" "}
                            · Ordem{" "}
                            {
                                plan.ordem
                            }
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-5 py-4">
                <span
                    className={[
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                        plan.ativo
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                >
                    {plan.ativo ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                        <XCircle className="h-3.5 w-3.5" />
                    )}

                    {plan.ativo
                        ? "Ativo"
                        : "Inativo"}
                </span>
            </td>

            <td className="px-5 py-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <UsersRound className="h-4 w-4 text-slate-400" />

                    <span className="font-semibold text-slate-800">
                        {
                            plan.tenants_count
                        }
                    </span>
                </div>
            </td>

            <td className="px-5 py-4">
                <div className="text-xs leading-5 text-slate-500">
                    <div>
                        Empresas:{" "}
                        <LimitValue
                            value={
                                plan
                                    .limits
                                    .empresas
                            }
                        />
                    </div>

                    <div>
                        Veículos:{" "}
                        <LimitValue
                            value={
                                plan
                                    .limits
                                    .veiculos
                            }
                        />
                    </div>
                </div>
            </td>

            <td className="px-5 py-4">
                <span className="text-sm font-semibold text-slate-700">
                    {
                        activeFeatures
                    }{" "}
                    / 3
                </span>

                <div className="mt-1 text-xs text-slate-400">
                    funcionalidades ativas
                </div>
            </td>

            <td className="px-5 py-4">
                <div className="flex justify-end">
                    <Link
                        to={`/backoffice/planos/${plan.id}`}
                        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                        <Eye className="h-4 w-4" />

                        Editar
                    </Link>
                </div>
            </td>
        </tr>
    );
}

function LimitValue({
    value,
}: {
    value: number | null;
}) {
    return (
        <span className="font-semibold text-slate-700">
            {value === null
                ? "Ilimitado"
                : value}
        </span>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Layers3;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}
