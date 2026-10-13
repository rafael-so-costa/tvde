import axios from "axios";
import {
    ArrowLeft,
    Building2,
    CalendarDays,
    Clock,
    CreditCard,
    LoaderCircle,
    Pause,
    Play,
    RefreshCw,
    Save,
    TestTube2,
    X,
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
    useParams,
} from "react-router-dom";

import api from "../lib/api";

import type {
    BillingPaymentMutationResponse,
    BillingPaymentView,
} from "../types/billing";

import type {
    BackofficeBillingCycle,
    BackofficeSubscription,
    BackofficeSubscriptionMutationResponse,
    BackofficeSubscriptionResponse,
    BackofficeSubscriptionStatus,
} from "../types/backoffice";

export default function BackofficeSubscriptionPage() {
    const { id } =
        useParams<{
            id: string;
        }>();

    const queryClient =
        useQueryClient();

    const [
        billingCycle,
        setBillingCycle,
    ] =
        useState<BackofficeBillingCycle>(
            "monthly",
        );

    const [
        priceAmount,
        setPriceAmount,
    ] = useState("");

    const [
        currency,
        setCurrency,
    ] = useState("EUR");

    const [
        trialDays,
        setTrialDays,
    ] = useState("14");

    const [
        successMessage,
        setSuccessMessage,
    ] = useState<
        string | null
    >(null);

    const [
        billingPayment,
        setBillingPayment,
    ] = useState<
        BillingPaymentView | null
    >(null);

    const subscriptionQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "assinaturas",
                id,
            ],

            enabled:
                Boolean(id),

            queryFn: async () => {
                const response =
                    await api.get(
                        `/api/backoffice/assinaturas/${id}`,
                    );

                return (
                    response
                        .data as BackofficeSubscriptionResponse
                ).data;
            },
        });

    useEffect(() => {
        if (
            !subscriptionQuery.data
        ) {
            return;
        }

        setBillingCycle(
            subscriptionQuery
                .data
                .billing_cycle,
        );

        setPriceAmount(
            subscriptionQuery
                .data
                .price_amount ===
                null
                ? ""
                : String(
                      subscriptionQuery
                          .data
                          .price_amount,
                  ),
        );

        setCurrency(
            subscriptionQuery
                .data
                .currency,
        );

        setBillingPayment(
            subscriptionQuery
                .data
                .billing_payment,
        );
    }, [
        subscriptionQuery.data,
    ]);

    const termsMutation =
        useMutation({
            mutationFn:
                async () => {
                    const response =
                        await api.patch(
                            `/api/backoffice/assinaturas/${id}`,
                            {
                                billing_cycle:
                                    billingCycle,

                                price_amount:
                                    priceAmount.trim() ===
                                    ""
                                        ? null
                                        : Number(
                                              priceAmount,
                                          ),

                                currency,
                            },
                        );

                    return response
                        .data as BackofficeSubscriptionMutationResponse;
                },

            onSuccess:
                async (
                    response,
                ) => {
                    setSuccessMessage(
                        response.message,
                    );

                    await refreshQueries();
                },
        });

    const actionMutation =
        useMutation({
            mutationFn:
                async ({
                    action,
                    trial_days,
                }: {
                    action: string;
                    trial_days?: number;
                }) => {
                    const response =
                        await api.post(
                            `/api/backoffice/assinaturas/${id}/acao`,
                            {
                                action,
                                ...(trial_days !==
                                undefined
                                    ? {
                                          trial_days,
                                      }
                                    : {}),
                            },
                        );

                    return response
                        .data as BackofficeSubscriptionMutationResponse;
                },

            onSuccess:
                async (
                    response,
                ) => {
                    setSuccessMessage(
                        response.message,
                    );

                    await refreshQueries();
                },
        });

    const generatePaymentMutation =
        useMutation({
            mutationFn:
                async () => {
                    const response =
                        await api.post(
                            `/api/backoffice/faturacao/assinaturas/${id}/multibanco`,
                        );

                    return response
                        .data as BillingPaymentMutationResponse;
                },

            onSuccess:
                async (
                    response,
                ) => {
                    setBillingPayment(
                        response.data,
                    );

                    setSuccessMessage(
                        response.message,
                    );

                    await refreshQueries();
                },
        });

    const simulatePaymentMutation =
        useMutation({
            mutationFn:
                async (
                    paymentId: string,
                ) => {
                    const response =
                        await api.post(
                            `/api/backoffice/faturacao/pagamentos/${paymentId}/simular`,
                        );

                    return response
                        .data as BillingPaymentMutationResponse;
                },

            onSuccess:
                async (
                    response,
                ) => {
                    setBillingPayment(
                        response.data,
                    );

                    setSuccessMessage(
                        response.message,
                    );

                    await refreshQueries();
                },
        });

    async function refreshQueries(): Promise<void> {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "assinaturas",
                    id,
                ],
            }),

            queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "assinaturas",
                ],
            }),

            queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "clientes",
                ],
            }),

            queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "faturacao",
                ],
            }),
        ]);
    }

    function runAction(
        action: string,
        confirmation?: string,
        days?: number,
    ): void {
        if (
            actionMutation.isPending
        ) {
            return;
        }

        if (
            confirmation &&
            !window.confirm(
                confirmation,
            )
        ) {
            return;
        }

        setSuccessMessage(
            null,
        );

        actionMutation.mutate({
            action,
            ...(days !==
            undefined
                ? {
                      trial_days:
                          days,
                  }
                : {}),
        });
    }

    if (
        subscriptionQuery.isLoading
    ) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (
        subscriptionQuery.isError ||
        !subscriptionQuery.data
    ) {
        return (
            <div className="mx-auto max-w-6xl">
                <Link
                    to="/backoffice/assinaturas"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />

                    Voltar às assinaturas
                </Link>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Não foi possível carregar esta assinatura.
                </div>
            </div>
        );
    }

    const subscription =
        subscriptionQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <Link
                    to="/backoffice/assinaturas"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />

                    Assinaturas
                </Link>

                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                                {subscription
                                    .tenant
                                    ?.nome ??
                                    "Assinatura"}
                            </h1>

                            <StatusBadge
                                status={
                                    subscription.status
                                }
                            />
                        </div>

                        <p className="mt-2 text-slate-500">
                            Gestão comercial da assinatura SaaS.
                        </p>
                    </div>

                    {subscription.tenant && (
                        <Link
                            to={`/backoffice/clientes/${subscription.tenant.id}`}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            <Building2 className="h-4 w-4" />

                            Abrir cliente
                        </Link>
                    )}
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Plano"
                    value={
                        subscription
                            .plan
                            ?.nome ??
                        "Sem plano"
                    }
                    icon={CreditCard}
                />

                <SummaryCard
                    label="Ciclo"
                    value={
                        subscription.billing_cycle ===
                        "yearly"
                            ? "Anual"
                            : "Mensal"
                    }
                    icon={RefreshCw}
                />

                <SummaryCard
                    label="Valor"
                    value={formatMoney(
                        subscription.price_amount,
                        subscription.currency,
                    )}
                    icon={CreditCard}
                />

                <SummaryCard
                    label="Renovação"
                    value={
                        subscription.current_period_ends_at
                            ? formatDate(
                                  subscription.current_period_ends_at,
                              )
                            : "—"
                    }
                    icon={CalendarDays}
                />
            </section>

            {subscription.cancel_scheduled && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-5 w-5 text-amber-600" />

                        <div>
                            <p className="font-semibold text-amber-800">
                                Cancelamento agendado
                            </p>

                            <p className="mt-1 text-sm text-amber-700">
                                Esta assinatura será cancelada no fim do período atual
                                {subscription.cancels_at
                                    ? `, em ${formatDate(subscription.cancels_at)}.`
                                    : "."}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white">
                    <SectionHeader
                        title="Condições comerciais"
                        description="Preço e periodicidade desta assinatura."
                    />

                    <div className="space-y-5 p-5">
                        <label className="block">
                            <span className={labelClass}>
                                Ciclo de faturação
                            </span>

                            <select
                                value={
                                    billingCycle
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setBillingCycle(
                                        event
                                            .target
                                            .value as BackofficeBillingCycle,
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="monthly">
                                    Mensal
                                </option>

                                <option value="yearly">
                                    Anual
                                </option>
                            </select>
                        </label>

                        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                            <label className="block">
                                <span className={labelClass}>
                                    Preço
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                        priceAmount
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setPriceAmount(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="Sem preço definido"
                                    className={inputClass}
                                />
                            </label>

                            <label className="block">
                                <span className={labelClass}>
                                    Moeda
                                </span>

                                <input
                                    maxLength={
                                        3
                                    }
                                    value={
                                        currency
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setCurrency(
                                            event
                                                .target
                                                .value
                                                .toUpperCase(),
                                        )
                                    }
                                    className={inputClass}
                                />
                            </label>
                        </div>

                        <button
                            type="button"
                            disabled={
                                termsMutation.isPending
                            }
                            onClick={() => {
                                setSuccessMessage(
                                    null,
                                );

                                termsMutation.mutate();
                            }}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {termsMutation.isPending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}

                            Guardar condições
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white">
                    <SectionHeader
                        title="Datas da assinatura"
                        description="Ciclo e estado temporal da subscrição."
                    />

                    <div className="grid gap-5 p-5 sm:grid-cols-2">
                        <DateInfo
                            label="Início"
                            value={
                                subscription.starts_at
                            }
                        />

                        <DateInfo
                            label="Trial até"
                            value={
                                subscription.trial_ends_at
                            }
                        />

                        <DateInfo
                            label="Período iniciado"
                            value={
                                subscription.current_period_starts_at
                            }
                        />

                        <DateInfo
                            label="Período termina"
                            value={
                                subscription.current_period_ends_at
                            }
                        />

                        <DateInfo
                            label="Cancelar em"
                            value={
                                subscription.cancels_at
                            }
                        />

                        <DateInfo
                            label="Cancelado em"
                            value={
                                subscription.canceled_at
                            }
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white">
                <SectionHeader
                    title="Cobrança Multibanco"
                    description="Referência associada ao período atual da assinatura."
                />

                <div className="p-5">
                    {billingPayment ? (
                        <SubscriptionPayment
                            payment={
                                billingPayment
                            }
                            simulating={
                                simulatePaymentMutation.isPending
                            }
                            onSimulate={() => {
                                setSuccessMessage(
                                    null,
                                );

                                simulatePaymentMutation.mutate(
                                    billingPayment.id,
                                );
                            }}
                        />
                    ) : (
                        <div className="flex flex-col justify-between gap-4 rounded-xl bg-slate-50 p-5 sm:flex-row sm:items-center">
                            <div>
                                <p className="font-semibold text-slate-900">
                                    Nenhuma referência emitida
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    Gere uma referência Multibanco para cobrar o período atual.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    generatePaymentMutation.isPending ||
                                    subscription.price_amount === null ||
                                    subscription.price_amount <= 0 ||
                                    subscription.status ===
                                        "canceled"
                                }
                                onClick={() => {
                                    setSuccessMessage(
                                        null,
                                    );

                                    generatePaymentMutation.mutate();
                                }}
                                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {generatePaymentMutation.isPending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CreditCard className="h-4 w-4" />
                                )}

                                Gerar referência Multibanco
                            </button>
                        </div>
                    )}

                    {subscription.price_amount ===
                        null && (
                        <p className="mt-3 text-xs text-amber-600">
                            Defina primeiro um preço nas condições comerciais.
                        </p>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white">
                <SectionHeader
                    title="Administração da assinatura"
                    description="Ações administrativas sobre o ciclo de vida."
                />

                <div className="grid gap-6 p-5 lg:grid-cols-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Estado
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Suspender não remove dados nem altera o plano.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {subscription.status ===
                                "suspended" ||
                            subscription.status ===
                                "canceled" ||
                            subscription.status ===
                                "past_due" ? (
                                <ActionButton
                                    label="Reativar"
                                    icon={Play}
                                    disabled={
                                        actionMutation.isPending
                                    }
                                    onClick={() =>
                                        runAction(
                                            "reactivate",
                                            "Reativar esta assinatura?",
                                        )
                                    }
                                />
                            ) : (
                                <ActionButton
                                    label="Suspender"
                                    icon={Pause}
                                    disabled={
                                        actionMutation.isPending
                                    }
                                    onClick={() =>
                                        runAction(
                                            "suspend",
                                            "Suspender esta assinatura?",
                                        )
                                    }
                                />
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Trial
                        </h3>

                        {subscription.status ===
                        "trialing" ? (
                            <>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Trial ativo
                                    {subscription.trial_ends_at
                                        ? ` até ${formatDate(subscription.trial_ends_at)}.`
                                        : "."}
                                </p>

                                <div className="mt-4">
                                    <ActionButton
                                        label="Encerrar trial"
                                        icon={X}
                                        disabled={
                                            actionMutation.isPending
                                        }
                                        onClick={() =>
                                            runAction(
                                                "end_trial",
                                                "Encerrar o período experimental e ativar a assinatura?",
                                            )
                                        }
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Defina quantos dias de utilização experimental pretende conceder.
                                </p>

                                <div className="mt-4 flex gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={
                                            trialDays
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setTrialDays(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
                                    />

                                    <ActionButton
                                        label="Iniciar trial"
                                        icon={Clock}
                                        disabled={
                                            actionMutation.isPending ||
                                            subscription.status ===
                                                "canceled"
                                        }
                                        onClick={() =>
                                            runAction(
                                                "start_trial",
                                                undefined,
                                                Number(
                                                    trialDays,
                                                ),
                                            )
                                        }
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Cancelamento
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            O cancelamento pode ser imediato ou no fim do período.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {subscription.cancel_scheduled && (
                                <ActionButton
                                    label="Remover agendamento"
                                    icon={RefreshCw}
                                    disabled={
                                        actionMutation.isPending
                                    }
                                    onClick={() =>
                                        runAction(
                                            "clear_cancel",
                                        )
                                    }
                                />
                            )}

                            {!subscription.cancel_scheduled &&
                                subscription.status !==
                                    "canceled" && (
                                    <ActionButton
                                        label="Cancelar no fim"
                                        icon={Clock}
                                        disabled={
                                            actionMutation.isPending
                                        }
                                        onClick={() =>
                                            runAction(
                                                "schedule_cancel",
                                                "Agendar o cancelamento para o fim do período atual?",
                                            )
                                        }
                                    />
                                )}

                            {subscription.status !==
                                "canceled" && (
                                <ActionButton
                                    label="Cancelar agora"
                                    icon={X}
                                    danger
                                    disabled={
                                        actionMutation.isPending
                                    }
                                    onClick={() =>
                                        runAction(
                                            "cancel_now",
                                            "Cancelar esta assinatura imediatamente? Esta ação altera o estado comercial para cancelado.",
                                        )
                                    }
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white">
                <SectionHeader
                    title="Integração de faturação"
                    description="Informação reservada para o futuro provedor de pagamentos."
                />

                <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <Info
                        label="Provider"
                        value={
                            subscription.external_provider
                        }
                    />

                    <Info
                        label="Subscription ID externo"
                        value={
                            subscription.external_subscription_id
                        }
                    />
                </div>
            </section>

            {(termsMutation.isError ||
                actionMutation.isError ||
                generatePaymentMutation.isError ||
                simulatePaymentMutation.isError) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage(
                        termsMutation.error ??
                            actionMutation.error ??
                            generatePaymentMutation.error ??
                            simulatePaymentMutation.error,
                    )}
                </div>
            )}

            {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                </div>
            )}
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
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

            <p className="mt-1 font-semibold text-slate-950">
                {value}
            </p>
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

function DateInfo({
    label,
    value,
}: {
    label: string;
    value: string | null;
}) {
    return (
        <div>
            <p className={labelClass}>
                {label}
            </p>

            <p className="mt-1.5 text-sm font-medium text-slate-700">
                {value
                    ? formatDateTime(
                          value,
                      )
                    : "—"}
            </p>
        </div>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: string | null;
}) {
    return (
        <div>
            <p className={labelClass}>
                {label}
            </p>

            <p className="mt-1.5 text-sm font-medium text-slate-700">
                {value || "—"}
            </p>
        </div>
    );
}

function ActionButton({
    label,
    icon: Icon,
    disabled,
    danger = false,
    onClick,
}: {
    label: string;
    icon: typeof Play;
    disabled: boolean;
    danger?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition disabled:opacity-50",
                danger
                    ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600",
            ].join(" ")}
        >
            <Icon className="h-4 w-4" />

            {label}
        </button>
    );
}

function SubscriptionPayment({
    payment,
    simulating,
    onSimulate,
}: {
    payment: BillingPaymentView;
    simulating: boolean;
    onSimulate: () => void;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {payment.charge?.number ??
                            "Cobrança"}
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div>
                            <p className={labelClass}>
                                Entidade
                            </p>

                            <p className="mt-1 font-semibold text-slate-900">
                                {payment.entity ??
                                    "—"}
                            </p>
                        </div>

                        <div>
                            <p className={labelClass}>
                                Referência
                            </p>

                            <p className="mt-1 font-semibold text-slate-900">
                                {formatReference(
                                    payment.reference,
                                )}
                            </p>
                        </div>

                        <div>
                            <p className={labelClass}>
                                Valor
                            </p>

                            <p className="mt-1 font-semibold text-slate-900">
                                {formatMoney(
                                    payment.amount,
                                    payment.currency,
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <span
                    className={[
                        "inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                        payment.status ===
                        "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700",
                    ].join(" ")}
                >
                    {payment.status ===
                    "paid"
                        ? "Pago"
                        : "Pendente"}
                </span>
            </div>

            {payment.expires_at && (
                <p className="mt-4 text-xs text-slate-500">
                    Válida até{" "}
                    {formatDateTime(
                        payment.expires_at,
                    )}
                </p>
            )}

            <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Dados técnicos
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <PaymentTechnicalInfo
                        label="Provider"
                        value={
                            payment.provider ===
                            "ifthenpay"
                                ? "Ifthenpay"
                                : payment.provider
                        }
                    />

                    <PaymentTechnicalInfo
                        label="Ambiente"
                        value={
                            payment.sandbox
                                ? "Testes"
                                : "Produção"
                        }
                    />

                    <PaymentTechnicalInfo
                        label="Order ID"
                        value={
                            payment.provider_reference
                        }
                    />

                    <PaymentTechnicalInfo
                        label="Request ID"
                        value={
                            payment.external_id
                        }
                    />
                </div>
            </div>

            {payment.mock && (
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2 text-xs leading-5 text-amber-800">
                        <TestTube2 className="mt-0.5 h-4 w-4 shrink-0" />

                        <span>
                            Referência MOCK de testes. Não efetuar pagamento bancário.
                        </span>
                    </div>

                    {payment.status ===
                        "pending" && (
                        <button
                            type="button"
                            disabled={
                                simulating
                            }
                            onClick={
                                onSimulate
                            }
                            className="h-9 shrink-0 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                        >
                            {simulating
                                ? "A confirmar..."
                                : "Simular pagamento"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function PaymentTechnicalInfo({
    label,
    value,
}: {
    label: string;
    value: string | null;
}) {
    return (
        <div className="min-w-0">
            <p className={labelClass}>
                {label}
            </p>

            <p
                className="mt-1 break-all text-xs font-medium text-slate-700"
                title={value ?? undefined}
            >
                {value || "—"}
            </p>
        </div>
    );
}
function formatReference(
    value: string | null,
): string {
    if (!value) {
        return "—";
    }

    const clean =
        value.replace(
            /\s+/g,
            "",
        );

    return clean.match(/.{1,3}/g)
        ?.join(" ") ?? clean;
}

function StatusBadge({
    status,
}: {
    status: BackofficeSubscriptionStatus;
}) {
    const config = {
        active: [
            "Ativa",
            "bg-emerald-50 text-emerald-700",
        ],

        trialing: [
            "Trial",
            "bg-indigo-50 text-indigo-700",
        ],

        past_due: [
            "Em atraso",
            "bg-amber-50 text-amber-700",
        ],

        suspended: [
            "Suspensa",
            "bg-orange-50 text-orange-700",
        ],

        canceled: [
            "Cancelada",
            "bg-red-50 text-red-700",
        ],
    }[status];

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config[1]}`}
        >
            {config[0]}
        </span>
    );
}

function formatMoney(
    amount: number | null,
    currency: string,
): string {
    if (amount === null) {
        return "Não definido";
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

function formatDateTime(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle: "short",
            timeStyle: "short",
        },
    ).format(
        new Date(value),
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
        const errors =
            error.response
                ?.data
                ?.errors as
                | Record<
                      string,
                      string[]
                  >
                | undefined;

        if (errors) {
            const first =
                Object
                    .values(
                        errors,
                    )
                    .flat()
                    .at(0);

            if (first) {
                return first;
            }
        }

        return (
            error.response
                ?.data
                ?.message ??
            "Não foi possível concluir a operação."
        );
    }

    return "Não foi possível concluir a operação.";
}

const labelClass =
    "text-xs font-semibold uppercase tracking-wider text-slate-400";

const inputClass =
    "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
