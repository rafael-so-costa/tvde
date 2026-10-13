import {
    BadgeEuro,
    CheckCircle2,
    Clock3,
    CreditCard,
    LoaderCircle,
    Megaphone,
    ReceiptText,
    Settings2,
    TriangleAlert,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "../lib/api";

import type {
    BillingAdOrder,
    BillingDashboardResponse,
    BillingSubscription,
    IfthenpayStatus,
} from "../types/billing";

export default function BackofficeBillingPage() {
    const query = useQuery({
        queryKey: [
            "backoffice",
            "faturacao",
        ],

        queryFn: async () => {
            const response =
                await api.get(
                    "/api/backoffice/faturacao/resumo",
                );

            return (
                response.data as BillingDashboardResponse
            ).data;
        },
    });

    if (query.isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (
        query.isError ||
        !query.data
    ) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Não foi possível carregar o painel de faturação.
            </div>
        );
    }

    const data =
        query.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    Gestão financeira
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Faturação
                        </h1>

                        <p className="mt-2 max-w-3xl text-slate-500">
                            Cobranças dos planos SaaS e do FrotaPRO Ads num único painel.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            to="/backoffice/faturacao/pedidos"
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            Todos os pedidos
                        </Link>

                        <Link
                            to="/backoffice/assinaturas"
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Assinaturas
                        </Link>

                        <Link
                            to="/backoffice/ads/pedidos"
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            Pagamentos Ads
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="MRR estimado"
                    value={money(
                        data.metrics.mrr,
                        "EUR",
                    )}
                    hint="Assinaturas ativas"
                    icon={BadgeEuro}
                />

                <MetricCard
                    label="Assinaturas ativas"
                    value={String(
                        data.metrics
                            .subscriptions_active,
                    )}
                    hint={`${data.metrics.subscriptions_trialing} em trial`}
                    icon={CreditCard}
                />

                <MetricCard
                    label="Em atraso"
                    value={String(
                        data.metrics
                            .subscriptions_past_due,
                    )}
                    hint="Assinaturas SaaS"
                    icon={TriangleAlert}
                />

                <MetricCard
                    label="Ads por receber"
                    value={money(
                        data.metrics
                            .ads_pending_amount,
                        "EUR",
                    )}
                    hint={`${data.metrics.ads_pending_count} pedido(s)`}
                    icon={Megaphone}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <ProviderCard
                    status={
                        data.provider
                            .ifthenpay
                    }
                />

                <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">
                            Receita Ads — últimos 30 dias
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Pedidos publicitários marcados como pagos.
                        </p>
                    </div>

                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <p className="text-sm text-slate-500">
                                Valor recebido
                            </p>

                            <p className="mt-2 text-2xl font-bold text-slate-950">
                                {money(
                                    data.metrics
                                        .ads_paid_30_days_amount,
                                    "EUR",
                                )}
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <p className="text-sm text-slate-500">
                                Pedidos pagos
                            </p>

                            <p className="mt-2 text-2xl font-bold text-slate-950">
                                {
                                    data.metrics
                                        .ads_paid_30_days_count
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Assinaturas recentes
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Estado comercial dos clientes SaaS.
                            </p>
                        </div>

                        <Link
                            to="/backoffice/assinaturas"
                            className="text-sm font-semibold text-indigo-600"
                        >
                            Ver todas
                        </Link>
                    </div>

                    {data.recent_subscriptions.length ===
                    0 ? (
                        <Empty
                            text="Nenhuma assinatura encontrada."
                        />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {data.recent_subscriptions.map(
                                (
                                    subscription,
                                ) => (
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
                        </div>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Cobranças Ads recentes
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Pedidos de pagamento das campanhas.
                            </p>
                        </div>

                        <Link
                            to="/backoffice/ads/pedidos"
                            className="text-sm font-semibold text-indigo-600"
                        >
                            Ver todos
                        </Link>
                    </div>

                    {data.recent_ad_orders.length ===
                    0 ? (
                        <Empty
                            text="Nenhuma cobrança de publicidade encontrada."
                        />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {data.recent_ad_orders.map(
                                (order) => (
                                    <AdOrderRow
                                        key={
                                            order.id
                                        }
                                        order={
                                            order
                                        }
                                    />
                                ),
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function ProviderCard({
    status,
}: {
    status: IfthenpayStatus;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                    <h2 className="font-semibold text-slate-900">
                        Ifthenpay
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Provider principal de pagamentos.
                    </p>
                </div>

                <span
                    className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        status.configured
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                >
                    {status.configured
                        ? "Configurado"
                        : "A aguardar credenciais"}
                </span>
            </div>

            <div className="space-y-3 p-5">
                <ProviderLine
                    label="Ambiente"
                    ready
                    value={
                        status.sandbox
                            ? "Testes"
                            : "Produção"
                    }
                />

                <ProviderLine
                    label="Referência Multibanco"
                    ready={
                        status.multibanco_ready
                    }
                />

                <ProviderLine
                    label="Callback"
                    ready={
                        status.callback_ready
                    }
                />

                <ProviderLine
                    label="Reconciliação"
                    ready={
                        status.reconciliation_ready
                    }
                />

                <ProviderLine
                    label="MB WAY"
                    ready={
                        status.mbway_ready
                    }
                    optional
                />

                <ProviderLine
                    label="Débito Direto"
                    ready={
                        status.direct_debit_ready
                    }
                    optional
                />
            </div>
        </div>
    );
}

function ProviderLine({
    label,
    ready,
    value,
    optional = false,
}: {
    label: string;
    ready: boolean;
    value?: string;
    optional?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
                {ready ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                    <Clock3 className="h-4 w-4 text-amber-500" />
                )}

                <span className="text-sm font-medium text-slate-700">
                    {label}
                </span>
            </div>

            <span className="text-xs font-semibold text-slate-500">
                {value ??
                    (
                        ready
                            ? "Pronto"
                            : optional
                              ? "Futuro"
                              : "Por configurar"
                    )}
            </span>
        </div>
    );
}

function SubscriptionRow({
    subscription,
}: {
    subscription: BillingSubscription;
}) {
    return (
        <Link
            to={`/backoffice/assinaturas/${subscription.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
        >
            <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                    {subscription.tenant?.nome ??
                        "Cliente"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                    {subscription.plan?.nome ??
                        "Sem plano"}{" "}
                    ·{" "}
                    {subscription.billing_cycle ===
                    "yearly"
                        ? "Anual"
                        : "Mensal"}
                </p>
            </div>

            <div className="shrink-0 text-right">
                <p className="font-semibold text-slate-900">
                    {subscription.price_amount ===
                    null
                        ? "—"
                        : money(
                              subscription.price_amount,
                              subscription.currency,
                          )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    {subscription.status}
                </p>
            </div>
        </Link>
    );
}

function AdOrderRow({
    order,
}: {
    order: BillingAdOrder;
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                    {order.number}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                    {order.campaign?.name ??
                        order.advertiser?.name ??
                        "Publicidade"}
                </p>
            </div>

            <div className="shrink-0 text-right">
                <p className="font-semibold text-slate-900">
                    {money(
                        order.total,
                        order.currency,
                    )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    {order.status}
                </p>
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
}: {
    label: string;
    value: string;
    hint: string;
    icon: typeof CreditCard;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
                {value}
            </p>

            <p className="mt-1 text-xs text-slate-400">
                {hint}
            </p>
        </div>
    );
}

function Empty({
    text,
}: {
    text: string;
}) {
    return (
        <div className="px-6 py-14 text-center">
            <ReceiptText className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 text-sm text-slate-500">
                {text}
            </p>
        </div>
    );
}

function money(
    value: number,
    currency: string,
): string {
    return new Intl.NumberFormat(
        "pt-PT",
        {
            style: "currency",
            currency,
        },
    ).format(value);
}