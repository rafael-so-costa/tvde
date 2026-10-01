import {
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Eye,
    LoaderCircle,
    Search,
} from "lucide-react";
import {
    useDeferredValue,
    useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeSubscription,
    BackofficeSubscriptionListResponse,
    BackofficeSubscriptionStatus,
} from "../types/backoffice";

export default function BackofficeSubscriptionsPage() {
    const [
        search,
        setSearch,
    ] = useState("");

    const [
        status,
        setStatus,
    ] = useState("");

    const [
        billingCycle,
        setBillingCycle,
    ] = useState("");

    const [
        page,
        setPage,
    ] = useState(1);

    const deferredSearch =
        useDeferredValue(
            search,
        );

    const subscriptionsQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "assinaturas",
                deferredSearch,
                status,
                billingCycle,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/assinaturas",
                        {
                            params: {
                                search:
                                    deferredSearch ||
                                    undefined,

                                status:
                                    status ||
                                    undefined,

                                billing_cycle:
                                    billingCycle ||
                                    undefined,

                                page,

                                per_page:
                                    20,
                            },
                        },
                    );

                return response
                    .data as BackofficeSubscriptionListResponse;
            },
        });

    const subscriptions =
        subscriptionsQuery
            .data
            ?.data ??
        [];

    const meta =
        subscriptionsQuery
            .data
            ?.meta;

    function resetPage(): void {
        setPage(1);
    }

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    Gestão SaaS
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Assinaturas
                        </h1>

                        <p className="mt-2 text-slate-500">
                            Gestão comercial das assinaturas dos clientes FrotaPRO.
                        </p>
                    </div>

                    {meta && (
                        <div className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-900">
                                {meta.total}
                            </span>{" "}
                            assinaturas
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px]">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={search}
                            onChange={(event) => {
                                setSearch(
                                    event.target.value,
                                );

                                resetPage();
                            }}
                            placeholder="Pesquisar cliente, NIF, e-mail..."
                            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(
                                event.target.value,
                            );

                            resetPage();
                        }}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    >
                        <option value="">
                            Todos os estados
                        </option>

                        <option value="active">
                            Ativas
                        </option>

                        <option value="trialing">
                            Em trial
                        </option>

                        <option value="past_due">
                            Em atraso
                        </option>

                        <option value="suspended">
                            Suspensas
                        </option>

                        <option value="canceled">
                            Canceladas
                        </option>
                    </select>

                    <select
                        value={billingCycle}
                        onChange={(event) => {
                            setBillingCycle(
                                event.target.value,
                            );

                            resetPage();
                        }}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    >
                        <option value="">
                            Todos os ciclos
                        </option>

                        <option value="monthly">
                            Mensal
                        </option>

                        <option value="yearly">
                            Anual
                        </option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {subscriptionsQuery.isLoading ? (
                    <div className="flex min-h-72 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : subscriptionsQuery.isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar as assinaturas.
                    </div>
                ) : subscriptions.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <CreditCard className="mx-auto h-10 w-10 text-slate-300" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            Nenhuma assinatura encontrada
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
                                    <th className={thClass}>
                                        Cliente
                                    </th>

                                    <th className={thClass}>
                                        Plano
                                    </th>

                                    <th className={thClass}>
                                        Estado
                                    </th>

                                    <th className={thClass}>
                                        Ciclo
                                    </th>

                                    <th className={thClass}>
                                        Valor
                                    </th>

                                    <th className={thClass}>
                                        Renovação
                                    </th>

                                    <th className={`${thClass} text-right`}>
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {subscriptions.map(
                                    (subscription) => (
                                        <SubscriptionRow
                                            key={
                                                subscription.id
                                            }
                                            subscription={
                                                subscription
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
                                {meta.total}
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
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
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
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
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

function SubscriptionRow({
    subscription,
}: {
    subscription: BackofficeSubscription;
}) {
    return (
        <tr className="transition hover:bg-slate-50/70">
            <td className="px-5 py-4">
                <div className="font-semibold text-slate-900">
                    {subscription
                        .tenant
                        ?.nome ??
                        "Cliente indisponível"}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                    {subscription
                        .tenant
                        ?.nif
                        ? `NIF ${subscription.tenant.nif}`
                        : subscription
                              .tenant
                              ?.email ??
                          "—"}
                </div>
            </td>

            <td className="px-5 py-4">
                <div className="font-medium text-slate-700">
                    {subscription
                        .plan
                        ?.nome ??
                        "—"}
                </div>

                {subscription.plan && (
                    <div className="mt-1 text-xs uppercase text-slate-400">
                        {
                            subscription
                                .plan
                                .codigo
                        }
                    </div>
                )}
            </td>

            <td className="px-5 py-4">
                <SubscriptionStatusBadge
                    status={
                        subscription.status
                    }
                />

                {subscription.cancel_scheduled && (
                    <div className="mt-1 text-xs font-medium text-amber-600">
                        Cancelamento agendado
                    </div>
                )}
            </td>

            <td className="px-5 py-4 text-sm text-slate-600">
                {subscription.billing_cycle ===
                "yearly"
                    ? "Anual"
                    : "Mensal"}
            </td>

            <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                {formatMoney(
                    subscription.price_amount,
                    subscription.currency,
                )}
            </td>

            <td className="px-5 py-4 text-sm text-slate-500">
                {subscription.current_period_ends_at
                    ? formatDate(
                          subscription.current_period_ends_at,
                      )
                    : "—"}
            </td>

            <td className="px-5 py-4">
                <div className="flex justify-end">
                    <Link
                        to={`/backoffice/assinaturas/${subscription.id}`}
                        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                        <Eye className="h-4 w-4" />

                        Gerir
                    </Link>
                </div>
            </td>
        </tr>
    );
}

function SubscriptionStatusBadge({
    status,
}: {
    status: BackofficeSubscriptionStatus;
}) {
    const config = {
        active: {
            label: "Ativa",
            className:
                "bg-emerald-50 text-emerald-700",
        },

        trialing: {
            label: "Trial",
            className:
                "bg-indigo-50 text-indigo-700",
        },

        past_due: {
            label: "Em atraso",
            className:
                "bg-amber-50 text-amber-700",
        },

        suspended: {
            label: "Suspensa",
            className:
                "bg-orange-50 text-orange-700",
        },

        canceled: {
            label: "Cancelada",
            className:
                "bg-red-50 text-red-700",
        },
    }[status];

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
            {config.label}
        </span>
    );
}

function formatMoney(
    amount: number | null,
    currency: string,
): string {
    if (amount === null) {
        return "Sem preço definido";
    }

    return new Intl.NumberFormat(
        "pt-PT",
        {
            style: "currency",
            currency,
        },
    ).format(amount);
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
