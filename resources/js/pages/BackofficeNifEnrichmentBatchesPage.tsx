import {
    ChevronLeft,
    ChevronRight,
    DatabaseZap,
    Eye,
    LoaderCircle,
} from "lucide-react";
import {
    useState,
} from "react";
import {
    useQuery,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";

import NifEnrichmentBatchStatus from "../components/NifEnrichmentBatchStatus";
import api from "../lib/api";

import type {
    BackofficeNifBatchListResponse,
    BackofficeNifBatchStatus,
} from "../types/backofficeCrmCommercial";

export default function BackofficeNifEnrichmentBatchesPage() {
    const [status, setStatus] =
        useState("");

    const [page, setPage] =
        useState(1);

    const batchesQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "nif-batches",
                status,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/enriquecimento/lotes",
                        {
                            params: {
                                status:
                                    status ||
                                    undefined,

                                page,

                                per_page:
                                    20,
                            },
                        },
                    );

                return response
                    .data as BackofficeNifBatchListResponse;
            },
        });

    const batches =
        batchesQuery.data
            ?.data ?? [];

    const meta =
        batchesQuery.data
            ?.meta;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · NIF.PT
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Lotes de enriquecimento
                </h1>

                <p className="mt-2 text-slate-500">
                    Processamento controlado dos operadores selecionados na Base TVDE.
                </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <select
                    value={
                        status
                    }
                    onChange={(
                        event,
                    ) => {
                        setStatus(
                            event
                                .target
                                .value,
                        );

                        setPage(1);
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none sm:w-64"
                >
                    <option value="">
                        Todos os estados
                    </option>

                    {(
                        [
                            "pending",
                            "processing",
                            "completed",
                            "partial",
                            "error",
                            "canceled",
                        ] as BackofficeNifBatchStatus[]
                    ).map(
                        (item) => (
                            <option
                                key={
                                    item
                                }
                                value={
                                    item
                                }
                            >
                                {statusLabel(
                                    item,
                                )}
                            </option>
                        ),
                    )}
                </select>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {batchesQuery.isLoading ? (
                    <Loading />
                ) : batchesQuery.isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar os lotes.
                    </div>
                ) : batches.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <DatabaseZap className="mx-auto h-10 w-10 text-slate-300" />

                        <p className="mt-4 text-sm text-slate-500">
                            Nenhum lote criado.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className={thClass}>
                                        Lote
                                    </th>

                                    <th className={thClass}>
                                        Estado
                                    </th>

                                    <th className={thClass}>
                                        Progresso
                                    </th>

                                    <th className={thClass}>
                                        Cache
                                    </th>

                                    <th className={thClass}>
                                        Externos
                                    </th>

                                    <th className={thClass}>
                                        Criado
                                    </th>

                                    <th className={`${thClass} text-right`}>
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {batches.map(
                                    (
                                        batch,
                                    ) => (
                                        <tr
                                            key={
                                                batch.id
                                            }
                                            className="hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900">
                                                    {batch.name ??
                                                        "Lote NIF.PT"}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {batch.force_refresh
                                                        ? "Atualização forçada"
                                                        : "Respeita cache"}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <NifEnrichmentBatchStatus
                                                    status={
                                                        batch.status
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                                                {batch.success_items +
                                                    batch.skipped_items +
                                                    batch.error_items}
                                                /
                                                {
                                                    batch.total_items
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {
                                                    batch.cache_hits
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {
                                                    batch.external_lookups
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-500">
                                                {formatDateTime(
                                                    batch.created_at,
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end">
                                                    <Link
                                                        to={`/backoffice/crm/enriquecimento/lotes/${batch.id}`}
                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Ver
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
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
                                {
                                    meta.total
                                }
                            </div>

                            <div className="flex gap-2">
                                <PageButton
                                    disabled={
                                        meta.current_page <=
                                        1
                                    }
                                    onClick={() =>
                                        setPage(
                                            (
                                                value,
                                            ) =>
                                                value -
                                                1,
                                        )
                                    }
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </PageButton>

                                <PageButton
                                    disabled={
                                        meta.current_page >=
                                        meta.last_page
                                    }
                                    onClick={() =>
                                        setPage(
                                            (
                                                value,
                                            ) =>
                                                value +
                                                1,
                                        )
                                    }
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </PageButton>
                            </div>
                        </div>
                    )}
            </section>
        </div>
    );
}

function Loading() {
    return (
        <div className="flex min-h-72 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
    );
}

function PageButton({
    children,
    disabled,
    onClick,
}: {
    children: React.ReactNode;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
        >
            {children}
        </button>
    );
}

function statusLabel(
    status: BackofficeNifBatchStatus,
): string {
    return {
        pending: "Pendente",
        processing: "Em processamento",
        completed: "Concluído",
        partial: "Parcial",
        error: "Erro",
        canceled: "Cancelado",
    }[status];
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
