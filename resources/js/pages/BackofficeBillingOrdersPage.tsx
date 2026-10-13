import {
    ChevronLeft,
    ChevronRight,
    Eye,
    LoaderCircle,
    ReceiptText,
    RotateCcw,
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
    BillingOrderListItem,
    BillingOrderListResponse,
} from "../types/billing";

export default function BackofficeBillingOrdersPage() {
    const [search, setSearch] = useState("");
    const [sourceType, setSourceType] = useState("");
    const [chargeStatus, setChargeStatus] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [provider, setProvider] = useState("");
    const [method, setMethod] = useState("");
    const [due, setDue] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [perPage, setPerPage] = useState(25);
    const [page, setPage] = useState(1);

    const deferredSearch =
        useDeferredValue(
            search,
        );

    const query =
        useQuery({
            queryKey: [
                "backoffice",
                "faturacao",
                "pedidos",
                deferredSearch,
                sourceType,
                chargeStatus,
                paymentStatus,
                provider,
                method,
                due,
                dateFrom,
                dateTo,
                perPage,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/faturacao/pedidos",
                        {
                            params: {
                                q:
                                    deferredSearch ||
                                    undefined,

                                source_type:
                                    sourceType ||
                                    undefined,

                                charge_status:
                                    chargeStatus ||
                                    undefined,

                                payment_status:
                                    paymentStatus ||
                                    undefined,

                                provider:
                                    provider ||
                                    undefined,

                                method:
                                    method ||
                                    undefined,

                                due:
                                    due ||
                                    undefined,

                                date_from:
                                    dateFrom ||
                                    undefined,

                                date_to:
                                    dateTo ||
                                    undefined,

                                per_page:
                                    perPage,

                                page,
                            },
                        },
                    );

                return response
                    .data as BillingOrderListResponse;
            },
        });

    const orders =
        query.data
            ?.data ??
        [];

    const meta =
        query.data
            ?.meta;

    function resetPage(): void {
        setPage(1);
    }

    function clearFilters(): void {
        setSearch("");
        setSourceType("");
        setChargeStatus("");
        setPaymentStatus("");
        setProvider("");
        setMethod("");
        setDue("");
        setDateFrom("");
        setDateTo("");
        setPerPage(25);
        setPage(1);
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    Gestão financeira
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Pedidos e cobranças
                        </h1>

                        <p className="mt-2 max-w-3xl text-slate-500">
                            Assinaturas SaaS e FrotaPRO Ads numa única listagem de pagamentos.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {meta && (
                            <span className="text-sm text-slate-500">
                                <strong className="text-slate-900">
                                    {meta.total}
                                </strong>{" "}
                                pedido(s)
                            </span>
                        )}

                        <Link
                            to="/backoffice/faturacao"
                            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Resumo
                        </Link>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 xl:grid-cols-4">
                    <div className="relative xl:col-span-2">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={search}
                            onChange={(event) => {
                                setSearch(
                                    event.target.value,
                                );
                                resetPage();
                            }}
                            placeholder="Pedido, cliente, NIF, referência, Order ID, Request ID..."
                            className={inputClass + " pl-10"}
                        />
                    </div>

                    <select
                        value={sourceType}
                        onChange={(event) => {
                            setSourceType(
                                event.target.value,
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todos os tipos
                        </option>
                        <option value="saas_subscription">
                            Assinaturas SaaS
                        </option>
                        <option value="ad_order">
                            FrotaPRO Ads
                        </option>
                    </select>

                    <select
                        value={chargeStatus}
                        onChange={(event) => {
                            setChargeStatus(
                                event.target.value,
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Estado da cobrança
                        </option>
                        <option value="pending">
                            Pendente
                        </option>
                        <option value="paid">
                            Paga
                        </option>
                        <option value="expired">
                            Expirada
                        </option>
                        <option value="canceled">
                            Cancelada
                        </option>
                        <option value="refunded">
                            Reembolsada
                        </option>
                    </select>

                    <select
                        value={paymentStatus}
                        onChange={(event) => {
                            setPaymentStatus(
                                event.target.value,
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Estado do pagamento
                        </option>
                        <option value="pending">
                            Pendente
                        </option>
                        <option value="paid">
                            Pago
                        </option>
                        <option value="failed">
                            Falhou
                        </option>
                        <option value="expired">
                            Expirado
                        </option>
                        <option value="canceled">
                            Cancelado
                        </option>
                        <option value="refunded">
                            Reembolsado
                        </option>
                        <option value="none">
                            Sem pagamento
                        </option>
                    </select>

                    <select
                        value={provider}
                        onChange={(event) => {
                            setProvider(
                                event.target.value,
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todos os providers
                        </option>
                        <option value="ifthenpay">
                            Ifthenpay
                        </option>
                    </select>

                    <select
                        value={method}
                        onChange={(event) => {
                            setMethod(
                                event.target.value,
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todos os métodos
                        </option>
                        <option value="multibanco">
                            Multibanco
                        </option>
                    </select>

                    <select
                        value={due}
                        onChange={(event) => {
                            setDue(
                                event.target.value,
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todos os vencimentos
                        </option>
                        <option value="overdue">
                            Vencidos
                        </option>
                        <option value="upcoming">
                            Por vencer
                        </option>
                    </select>

                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => {
                            setDateFrom(
                                event.target.value,
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    />

                    <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => {
                            setDateTo(
                                event.target.value,
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    />

                    <select
                        value={perPage}
                        onChange={(event) => {
                            setPerPage(
                                Number(
                                    event.target.value,
                                ),
                            );
                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value={15}>
                            15 por página
                        </option>
                        <option value={25}>
                            25 por página
                        </option>
                        <option value={50}>
                            50 por página
                        </option>
                        <option value={100}>
                            100 por página
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Limpar filtros
                    </button>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {query.isLoading ? (
                    <div className="flex min-h-72 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : query.isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar os pedidos.
                    </div>
                ) : orders.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            Nenhum pedido encontrado
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Ajuste os filtros ou a pesquisa.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1350px] text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className={thClass}>
                                        Pedido
                                    </th>
                                    <th className={thClass}>
                                        Tipo
                                    </th>
                                    <th className={thClass}>
                                        Cliente
                                    </th>
                                    <th className={thClass}>
                                        Descrição
                                    </th>
                                    <th className={thClass}>
                                        Valor
                                    </th>
                                    <th className={thClass}>
                                        Cobrança
                                    </th>
                                    <th className={thClass}>
                                        Pagamento
                                    </th>
                                    <th className={thClass}>
                                        Referência
                                    </th>
                                    <th className={thClass}>
                                        Vencimento
                                    </th>
                                    <th className={thClass}>
                                        Pago em
                                    </th>
                                    <th className={`${thClass} text-right`}>
                                        Ação
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {orders.map(
                                    (order) => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                        />
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta && (
                    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-500">
                            {meta.total === 0
                                ? "0 resultados"
                                : `${meta.from}–${meta.to} de ${meta.total}`}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={
                                    meta.current_page <= 1
                                }
                                onClick={() =>
                                    setPage(
                                        (current) =>
                                            current - 1,
                                    )
                                }
                                className={paginationClass}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500">
                                {meta.current_page} /{" "}
                                {meta.last_page}
                            </div>

                            <button
                                type="button"
                                disabled={
                                    meta.current_page >=
                                    meta.last_page
                                }
                                onClick={() =>
                                    setPage(
                                        (current) =>
                                            current + 1,
                                    )
                                }
                                className={paginationClass}
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

function OrderRow({
    order,
}: {
    order: BillingOrderListItem;
}) {
    const destination =
        order.source_type ===
        "saas_subscription"
            ? `/backoffice/assinaturas/${order.source_id}`
            : order.source?.campaign?.id
              ? `/backoffice/ads/campanhas/${order.source.campaign.id}`
              : "/backoffice/ads/pedidos";

    return (
        <tr className="align-top transition hover:bg-slate-50/70">
            <td className="px-5 py-4">
                <div className="font-semibold text-slate-900">
                    {order.number}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                    {formatDateTime(
                        order.created_at,
                    )}
                </div>
            </td>

            <td className="px-5 py-4">
                <TypeBadge
                    type={
                        order.source_type
                    }
                />
            </td>

            <td className="px-5 py-4">
                <div className="font-medium text-slate-800">
                    {order.tenant?.nome ??
                        order.source?.advertiser?.name ??
                        "—"}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                    {order.tenant?.nif
                        ? `NIF ${order.tenant.nif}`
                        : order.tenant?.email ??
                          "—"}
                </div>
            </td>

            <td className="max-w-xs px-5 py-4">
                <div className="text-sm text-slate-700">
                    {order.description}
                </div>

                {order.source?.plan && (
                    <div className="mt-1 text-xs text-slate-400">
                        Plano{" "}
                        {
                            order.source
                                .plan.nome
                        }
                    </div>
                )}

                {order.source?.campaign && (
                    <div className="mt-1 text-xs text-slate-400">
                        {
                            order.source
                                .campaign.name
                        }
                    </div>
                )}
            </td>

            <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">
                {money(
                    order.total,
                    order.currency,
                )}
            </td>

            <td className="px-5 py-4">
                <StatusBadge
                    status={
                        order.status
                    }
                    overdue={
                        order.is_overdue
                    }
                />
            </td>

            <td className="px-5 py-4">
                <PaymentBadge
                    status={
                        order.payment
                            ?.status ??
                        null
                    }
                    mock={
                        order.payment
                            ?.mock ??
                        false
                    }
                />

                {order.payment && (
                    <div className="mt-1 text-xs text-slate-400">
                        {
                            order.payment
                                .provider
                        }{" "}
                        ·{" "}
                        {
                            order.payment
                                .method
                        }
                    </div>
                )}
            </td>

            <td className="whitespace-nowrap px-5 py-4">
                {order.payment ? (
                    <>
                        <div className="font-mono text-xs font-semibold text-slate-700">
                            {formatReference(
                                order.payment
                                    .reference,
                            )}
                        </div>

                        {order.payment.entity && (
                            <div className="mt-1 text-xs text-slate-400">
                                Ent.{" "}
                                {
                                    order.payment
                                        .entity
                                }
                            </div>
                        )}
                    </>
                ) : (
                    <span className="text-sm text-slate-400">
                        —
                    </span>
                )}
            </td>

            <td className="whitespace-nowrap px-5 py-4 text-sm">
                <span
                    className={
                        order.is_overdue
                            ? "font-semibold text-red-600"
                            : "text-slate-500"
                    }
                >
                    {order.due_at
                        ? formatDate(
                              order.due_at,
                          )
                        : "—"}
                </span>
            </td>

            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                {order.paid_at
                    ? formatDateTime(
                          order.paid_at,
                      )
                    : "—"}
            </td>

            <td className="px-5 py-4">
                <div className="flex justify-end">
                    <Link
                        to={destination}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                        <Eye className="h-4 w-4" />
                        Abrir
                    </Link>
                </div>
            </td>
        </tr>
    );
}

function TypeBadge({
    type,
}: {
    type:
        | "saas_subscription"
        | "ad_order";
}) {
    return (
        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {type ===
            "saas_subscription"
                ? "SaaS"
                : "Ads"}
        </span>
    );
}

function StatusBadge({
    status,
    overdue,
}: {
    status: string;
    overdue: boolean;
}) {
    if (
        status === "pending" &&
        overdue
    ) {
        return (
            <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                Vencida
            </span>
        );
    }

    const config =
        statusConfig[
            status
        ] ?? {
            label:
                status,
            className:
                "bg-slate-100 text-slate-600",
        };

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
            {config.label}
        </span>
    );
}

function PaymentBadge({
    status,
    mock,
}: {
    status: string | null;
    mock: boolean;
}) {
    if (!status) {
        return (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Sem pagamento
            </span>
        );
    }

    const config =
        statusConfig[
            status
        ] ?? {
            label:
                status,
            className:
                "bg-slate-100 text-slate-600",
        };

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
            {config.label}
            {mock
                ? " · MOCK"
                : ""}
        </span>
    );
}

const statusConfig: Record<
    string,
    {
        label: string;
        className: string;
    }
> = {
    pending: {
        label: "Pendente",
        className:
            "bg-amber-50 text-amber-700",
    },

    paid: {
        label: "Pago",
        className:
            "bg-emerald-50 text-emerald-700",
    },

    failed: {
        label: "Falhou",
        className:
            "bg-red-50 text-red-700",
    },

    expired: {
        label: "Expirado",
        className:
            "bg-orange-50 text-orange-700",
    },

    canceled: {
        label: "Cancelado",
        className:
            "bg-slate-100 text-slate-600",
    },

    refunded: {
        label: "Reembolsado",
        className:
            "bg-violet-50 text-violet-700",
    },
};

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

function formatReference(
    value: string | null,
): string {
    if (!value) {
        return "—";
    }

    const digits =
        value.replace(
            /\D/g,
            "",
        );

    if (digits.length !== 9) {
        return value;
    }

    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const paginationClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40";

const thClass =
    "whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";