import axios from "axios";
import {
    CheckCircle2,
    CreditCard,
    LoaderCircle,
    ReceiptText,
    TestTube2,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import api from "../../lib/api";

import type {
    AdOrder,
} from "../../types/backofficeAds";

import type {
    BillingPaymentMutationResponse,
    BillingPaymentView,
} from "../../types/billing";

export default function BackofficeAdOrdersPage() {
    const queryClient =
        useQueryClient();

    const query =
        useQuery({
            queryKey: [
                "backoffice",
                "ads",
                "orders",
            ],

            queryFn: async () =>
                (
                    await api.get(
                        "/api/backoffice/ads/orders",
                    )
                ).data as {
                    data: AdOrder[];
                },
        });

    const generateMutation =
        useMutation({
            mutationFn:
                async (
                    orderId: string,
                ) => {
                    const response =
                        await api.post(
                            `/api/backoffice/faturacao/ads/${orderId}/multibanco`,
                        );

                    return response
                        .data as BillingPaymentMutationResponse;
                },

            onSuccess:
                async () => {
                    await Promise.all([
                        queryClient.invalidateQueries({
                            queryKey: [
                                "backoffice",
                                "ads",
                                "orders",
                            ],
                        }),

                        queryClient.invalidateQueries({
                            queryKey: [
                                "backoffice",
                                "faturacao",
                            ],
                        }),
                    ]);
                },
        });

    const simulateMutation =
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
                async () => {
                    await Promise.all([
                        queryClient.invalidateQueries({
                            queryKey: [
                                "backoffice",
                                "ads",
                                "orders",
                            ],
                        }),

                        queryClient.invalidateQueries({
                            queryKey: [
                                "backoffice",
                                "faturacao",
                            ],
                        }),
                    ]);
                },
        });

    const mutationError =
        generateMutation.error ??
        simulateMutation.error;

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-950">
                    Pagamentos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Pedidos de campanhas publicitárias e respetivos pagamentos.
                </p>
            </div>

            {mutationError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage(
                        mutationError,
                    )}
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {query.isLoading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : query.data?.data.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />

                        <p className="mt-4 text-sm text-slate-500">
                            Nenhum pedido publicitário criado.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {query.data?.data.map(
                            (order) => (
                                <OrderRow
                                    key={
                                        order.id
                                    }
                                    order={
                                        order
                                    }
                                    generating={
                                        generateMutation.isPending
                                    }
                                    simulating={
                                        simulateMutation.isPending
                                    }
                                    onGenerate={() =>
                                        generateMutation.mutate(
                                            order.id,
                                        )
                                    }
                                    onSimulate={(
                                        paymentId,
                                    ) =>
                                        simulateMutation.mutate(
                                            paymentId,
                                        )
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

function OrderRow({
    order,
    generating,
    simulating,
    onGenerate,
    onSimulate,
}: {
    order: AdOrder;
    generating: boolean;
    simulating: boolean;
    onGenerate: () => void;
    onSimulate: (
        paymentId: string,
    ) => void;
}) {
    const payment =
        order.billing_payment;

    return (
        <div className="space-y-4 px-5 py-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <div className="font-semibold text-slate-900">
                        {order.number}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                        {order.campaign.name}
                    </div>
                </div>

                <div className="sm:text-right">
                    <div className="font-semibold text-slate-900">
                        {money(
                            order.total,
                            order.currency,
                        )}
                    </div>

                    <div className="text-xs text-slate-400">
                        {order.status}
                    </div>
                </div>
            </div>

            {payment ? (
                <PaymentBox
                    payment={
                        payment
                    }
                    simulating={
                        simulating
                    }
                    onSimulate={
                        onSimulate
                    }
                />
            ) : (
                order.status ===
                    "pending" && (
                    <button
                        type="button"
                        disabled={
                            generating
                        }
                        onClick={
                            onGenerate
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {generating ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <CreditCard className="h-4 w-4" />
                        )}

                        Gerar referência Multibanco
                    </button>
                )
            )}
        </div>
    );
}

function PaymentBox({
    payment,
    simulating,
    onSimulate,
}: {
    payment: BillingPaymentView;
    simulating: boolean;
    onSimulate: (
        paymentId: string,
    ) => void;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Referência Multibanco
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <span>
                            Entidade{" "}
                            <strong>
                                {payment.entity ??
                                    "—"}
                            </strong>
                        </span>

                        <span>
                            Referência{" "}
                            <strong>
                                {formatReference(
                                    payment.reference,
                                )}
                            </strong>
                        </span>

                        <span>
                            Valor{" "}
                            <strong>
                                {money(
                                    payment.amount,
                                    payment.currency,
                                )}
                            </strong>
                        </span>
                    </div>
                </div>

                {payment.status ===
                "paid" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />

                        Pago
                    </span>
                ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pendente
                    </span>
                )}
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
                            onClick={() =>
                                onSimulate(
                                    payment.id,
                                )
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

        const first =
            errors
                ? Object
                      .values(
                          errors,
                      )
                      .flat()
                      .at(0)
                : null;

        return (
            first ??
            error.response
                ?.data
                ?.message ??
            "Não foi possível concluir a operação."
        );
    }

    return "Não foi possível concluir a operação.";
}