import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    DatabaseZap,
    LoaderCircle,
    Play,
    XCircle,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    Link,
    useParams,
} from "react-router-dom";

import NifEnrichmentBatchStatus from "../components/NifEnrichmentBatchStatus";
import api from "../lib/api";

import type {
    BackofficeNifBatchItemStatus,
    BackofficeNifBatchResponse,
} from "../types/backofficeCrmCommercial";

export default function BackofficeNifEnrichmentBatchPage() {
    const { id } =
        useParams();

    const queryClient =
        useQueryClient();

    const batchQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "nif-batch",
                id,
            ],

            enabled:
                Boolean(id),

            refetchInterval:
                15000,

            queryFn: async () => {
                const response =
                    await api.get(
                        `/api/backoffice/crm/enriquecimento/lotes/${id}`,
                    );

                return response
                    .data as BackofficeNifBatchResponse;
            },
        });

    const refresh =
        async () => {
            await queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "crm",
                    "nif-batch",
                    id,
                ],
            });

            await queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "crm",
                    "nif-batches",
                ],
            });
        };

    const processMutation =
        useMutation({
            mutationFn: async () =>
                api.post(
                    `/api/backoffice/crm/enriquecimento/lotes/${id}/processar`,
                    {},
                ),

            onSuccess:
                refresh,
        });

    const cancelMutation =
        useMutation({
            mutationFn: async () =>
                api.post(
                    `/api/backoffice/crm/enriquecimento/lotes/${id}/cancelar`,
                    {},
                ),

            onSuccess:
                refresh,
        });

    if (
        batchQuery.isLoading
    ) {
        return <Loading />;
    }

    const batch =
        batchQuery.data?.data;

    if (
        batchQuery.isError ||
        !batch
    ) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Não foi possível carregar o lote.
            </div>
        );
    }

    const processed =
        batch.success_items +
        batch.error_items +
        batch.skipped_items;

    const progress =
        batch.total_items > 0
            ? Math.round(
                  (processed /
                      batch.total_items) *
                      100,
              )
            : 0;

    const processable =
        batch.status ===
            "pending" ||
        batch.status ===
            "processing";

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <Link
                    to="/backoffice/crm/enriquecimento/lotes"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Lotes NIF.PT
                </Link>

                <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                                {batch.name ??
                                    "Lote de enriquecimento"}
                            </h1>

                            <NifEnrichmentBatchStatus
                                status={
                                    batch.status
                                }
                            />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                            Criado em{" "}
                            {formatDateTime(
                                batch.created_at,
                            )}
                        </p>
                    </div>

                    {processable && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={
                                    processMutation.isPending
                                }
                                onClick={() =>
                                    processMutation.mutate()
                                }
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {processMutation.isPending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}

                                Processar próximo
                            </button>

                            <button
                                type="button"
                                disabled={
                                    cancelMutation.isPending
                                }
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            "Cancelar este lote?",
                                        )
                                    ) {
                                        cancelMutation.mutate();
                                    }
                                }}
                                className="h-11 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Metric
                    label="Total"
                    value={
                        batch.total_items
                    }
                />

                <Metric
                    label="Sucesso"
                    value={
                        batch.success_items
                    }
                />

                <Metric
                    label="Cache"
                    value={
                        batch.cache_hits
                    }
                />

                <Metric
                    label="Externos"
                    value={
                        batch.external_lookups
                    }
                />

                <Metric
                    label="Erros"
                    value={
                        batch.error_items
                    }
                />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-600">
                        Progresso
                    </span>

                    <span className="font-semibold text-slate-900">
                        {progress}%
                    </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{
                            width: `${progress}%`,
                        }}
                    />
                </div>

                <div className="mt-3 text-xs text-slate-400">
                    {processed} de{" "}
                    {
                        batch.total_items
                    }{" "}
                    processados
                </div>
            </section>

            {batch.error_message && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {
                        batch.error_message
                    }
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                        Itens do lote
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className={thClass}>
                                    Operador
                                </th>

                                <th className={thClass}>
                                    NIF
                                </th>

                                <th className={thClass}>
                                    Estado
                                </th>

                                <th className={thClass}>
                                    Origem
                                </th>

                                <th className={thClass}>
                                    Tentativas
                                </th>

                                <th className={thClass}>
                                    Processado
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {batch.items.map(
                                (
                                    item,
                                ) => (
                                    <tr
                                        key={
                                            item.id
                                        }
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-900">
                                                {item.operator?.display_name ??
                                                    item.enrichment?.title ??
                                                    "Operador indisponível"}
                                            </div>

                                            {item.error_message && (
                                                <div className="mt-1 max-w-md text-xs text-red-500">
                                                    {
                                                        item.error_message
                                                    }
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {
                                                item.nif
                                            }
                                        </td>

                                        <td className="px-5 py-4">
                                            <ItemStatus
                                                status={
                                                    item.status
                                                }
                                            />
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {item.used_cache
                                                ? "Cache"
                                                : item.external_lookup
                                                  ? "NIF.PT"
                                                  : "Local"}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {
                                                item.attempt_count
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-500">
                                            {item.processed_at
                                                ? formatDateTime(
                                                      item.processed_at,
                                                  )
                                                : "—"}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm leading-6 text-indigo-700">
                O processamento automático também continuará pelo scheduler. O botão
                <strong>
                    {" "}
                    Processar próximo
                </strong>{" "}
                executa apenas um ciclo controlado.
            </div>
        </div>
    );
}

function Metric({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-3xl font-bold text-slate-950">
                {value}
            </div>

            <div className="mt-1 text-sm text-slate-500">
                {label}
            </div>
        </div>
    );
}

function ItemStatus({
    status,
}: {
    status: BackofficeNifBatchItemStatus;
}) {
    const config = {
        pending: {
            icon: DatabaseZap,
            label: "Pendente",
            className:
                "bg-slate-100 text-slate-600",
        },

        processing: {
            icon: LoaderCircle,
            label: "Processando",
            className:
                "bg-indigo-50 text-indigo-700",
        },

        success: {
            icon: CheckCircle2,
            label: "Sucesso",
            className:
                "bg-emerald-50 text-emerald-700",
        },

        error: {
            icon: XCircle,
            label: "Erro",
            className:
                "bg-red-50 text-red-700",
        },

        skipped: {
            icon: AlertTriangle,
            label: "Ignorado",
            className:
                "bg-amber-50 text-amber-700",
        },
    }[status];

    const Icon =
        config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
            <Icon
                className={[
                    "h-3.5 w-3.5",
                    status ===
                    "processing"
                        ? "animate-spin"
                        : "",
                ].join(
                    " ",
                )}
            />

            {
                config.label
            }
        </span>
    );
}

function Loading() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
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

const thClass =
    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";
