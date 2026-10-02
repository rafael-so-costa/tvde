import {
    ChevronLeft,
    ChevronRight,
    Database,
    Eye,
    LoaderCircle,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeTvdeImportListResponse,
    BackofficeTvdeSource,
} from "../types/backofficeCrm";

export default function BackofficeTvdeImportsPage() {
    const [
        source,
        setSource,
    ] = useState("");

    const [
        status,
        setStatus,
    ] = useState("");

    const [
        page,
        setPage,
    ] = useState(1);

    const importsQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "importacoes",
                source,
                status,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/importacoes",
                        {
                            params: {
                                source:
                                    source ||
                                    undefined,

                                status:
                                    status ||
                                    undefined,

                                page,

                                per_page: 20,
                            },
                        },
                    );

                return response
                    .data as BackofficeTvdeImportListResponse;
            },
        });

    const imports =
        importsQuery
            .data
            ?.data ?? [];

    const meta =
        importsQuery
            .data
            ?.meta;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · Base oficial TVDE
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Importações TVDE
                        </h1>

                        <p className="mt-2 text-slate-500">
                            Snapshots oficiais importados das fontes IMT e RAM.
                        </p>
                    </div>

                    {meta && (
                        <div className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-900">
                                {meta.total}
                            </span>{" "}
                            importações
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                    <select
                        value={source}
                        onChange={(event) => {
                            setSource(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                        className={selectClass}
                    >
                        <option value="">
                            Todas as fontes
                        </option>

                        <option value="imt_continental">
                            IMT
                        </option>

                        <option value="ram">
                            RAM
                        </option>
                    </select>

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                        className={selectClass}
                    >
                        <option value="">
                            Todos os estados
                        </option>

                        <option value="completed">
                            Concluídas
                        </option>

                        <option value="processing">
                            Em processamento
                        </option>

                        <option value="failed">
                            Falhadas
                        </option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {importsQuery.isLoading ? (
                    <div className="flex min-h-72 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : importsQuery.isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar as importações.
                    </div>
                ) : imports.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Database className="mx-auto h-10 w-10 text-slate-300" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            Nenhuma importação encontrada
                        </h2>
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

                                    <th className={thClass}>
                                        Estado
                                    </th>

                                    <th className={`${thClass} text-right`}>
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {imports.map(
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

                                            <td className="px-5 py-4">
                                                <div className="font-medium text-slate-800">
                                                    {formatDate(
                                                        item.reference_date,
                                                    )}
                                                </div>

                                                <div className="mt-1 max-w-48 truncate text-xs text-slate-400">
                                                    {item.original_filename}
                                                </div>
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

                                            <td className="px-5 py-4">
                                                <StatusBadge
                                                    status={
                                                        item.status
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end">
                                                    <Link
                                                        to={`/backoffice/crm/importacoes/${item.id}`}
                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
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
                    meta.last_page > 1 && (
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
                                            (current) =>
                                                current -
                                                1,
                                        )
                                    }
                                    className={paginationButtonClass}
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
                                            (current) =>
                                                current +
                                                1,
                                        )
                                    }
                                    className={paginationButtonClass}
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

function SourceBadge({
    source,
}: {
    source: BackofficeTvdeSource;
}) {
    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                source === "ram"
                    ? "bg-violet-50 text-violet-700"
                    : "bg-indigo-50 text-indigo-700",
            ].join(" ")}
        >
            {source === "ram"
                ? "RAM"
                : "IMT"}
        </span>
    );
}

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const config: Record<
        string,
        [string, string]
    > = {
        completed: [
            "Concluída",
            "bg-emerald-50 text-emerald-700",
        ],

        processing: [
            "A processar",
            "bg-amber-50 text-amber-700",
        ],

        failed: [
            "Falhou",
            "bg-red-50 text-red-700",
        ],
    };

    const [
        label,
        className,
    ] =
        config[status] ?? [
            status,
            "bg-slate-100 text-slate-600",
        ];

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
        >
            {label}
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
    ).format(new Date(value));
}

const selectClass =
    "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500";

const paginationButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40";

const thClass =
    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";
