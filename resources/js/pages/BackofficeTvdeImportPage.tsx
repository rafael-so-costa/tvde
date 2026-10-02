import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    LoaderCircle,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Link,
    useParams,
} from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeTvdeChangeType,
    BackofficeTvdeImportResponse,
    BackofficeTvdeSource,
} from "../types/backofficeCrm";

export default function BackofficeTvdeImportPage() {
    const { id } =
        useParams<{
            id: string;
        }>();

    const [
        changeType,
        setChangeType,
    ] = useState("");

    const [
        page,
        setPage,
    ] = useState(1);

    const importQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "importacoes",
                id,
                changeType,
                page,
            ],

            enabled: Boolean(id),

            queryFn: async () => {
                const response =
                    await api.get(
                        `/api/backoffice/crm/importacoes/${id}`,
                        {
                            params: {
                                change_type:
                                    changeType ||
                                    undefined,

                                page,

                                per_page: 50,
                            },
                        },
                    );

                return response
                    .data as BackofficeTvdeImportResponse;
            },
        });

    if (importQuery.isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (
        importQuery.isError ||
        !importQuery.data
    ) {
        return (
            <div className="mx-auto max-w-7xl space-y-5">
                <Link
                    to="/backoffice/crm/importacoes"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar às importações
                </Link>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Não foi possível carregar a importação.
                </div>
            </div>
        );
    }

    const item =
        importQuery.data.data;

    const changes =
        item.changes.data;

    const meta =
        item.changes.meta;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <Link
                    to="/backoffice/crm/importacoes"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar às importações
                </Link>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <div className="flex items-center gap-2">
                            <SourceBadge
                                source={
                                    item.source
                                }
                            />

                            <span className="text-sm text-slate-400">
                                {formatDate(
                                    item.reference_date,
                                )}
                            </span>
                        </div>

                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                            Importação TVDE
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            {item.original_filename}
                        </p>
                    </div>

                    <StatusBadge
                        status={
                            item.status
                        }
                    />
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <Metric
                    label="Registos"
                    value={
                        item.total_records
                    }
                />

                <Metric
                    label="Novos"
                    value={
                        item.new_records
                    }
                />

                <Metric
                    label="Alterados"
                    value={
                        item.changed_records
                    }
                />

                <Metric
                    label="Removidos"
                    value={
                        item.removed_records
                    }
                />

                <Metric
                    label="Restaurados"
                    value={
                        item.restored_records
                    }
                />

                <Metric
                    label="Inalterados"
                    value={
                        item.unchanged_records
                    }
                />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                        label="Início"
                        value={
                            item.started_at
                                ? formatDateTime(
                                      item.started_at,
                                  )
                                : "—"
                        }
                    />

                    <Info
                        label="Conclusão"
                        value={
                            item.completed_at
                                ? formatDateTime(
                                      item.completed_at,
                                  )
                                : "—"
                        }
                    />

                    <Info
                        label="Importado por"
                        value={
                            item.imported_by
                                ?.name ??
                            "Linha de comandos"
                        }
                    />

                    <Info
                        label="Hash SHA-256"
                        value={
                            `${item.file_hash.slice(
                                0,
                                16,
                            )}…`
                        }
                    />
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Alterações detetadas
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Eventos produzidos por este snapshot.
                        </p>
                    </div>

                    <select
                        value={changeType}
                        onChange={(event) => {
                            setChangeType(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    >
                        <option value="">
                            Todos os eventos
                        </option>

                        <option value="created">
                            Novos
                        </option>

                        <option value="updated">
                            Alterados
                        </option>

                        <option value="removed">
                            Removidos
                        </option>

                        <option value="restored">
                            Restaurados
                        </option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-4">
                    <ChangeCounter
                        label="Novos"
                        value={
                            item.change_counts.created
                        }
                    />

                    <ChangeCounter
                        label="Alterados"
                        value={
                            item.change_counts.updated
                        }
                    />

                    <ChangeCounter
                        label="Removidos"
                        value={
                            item.change_counts.removed
                        }
                    />

                    <ChangeCounter
                        label="Restaurados"
                        value={
                            item.change_counts.restored
                        }
                    />
                </div>

                {changes.length === 0 ? (
                    <div className="px-6 py-14 text-center text-sm text-slate-400">
                        Nenhuma alteração deste tipo.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className={thClass}>
                                        Evento
                                    </th>

                                    <th className={thClass}>
                                        Operador
                                    </th>

                                    <th className={thClass}>
                                        Localização
                                    </th>

                                    <th className={thClass}>
                                        Campos
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {changes.map(
                                    (change) => (
                                        <tr
                                            key={
                                                change.id
                                            }
                                        >
                                            <td className="px-5 py-4">
                                                <ChangeBadge
                                                    type={
                                                        change.change_type
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                {change.operator ? (
                                                    <Link
                                                        to={`/backoffice/crm/operadores/${change.operator.id}`}
                                                        className="font-semibold text-slate-900 transition hover:text-indigo-600"
                                                    >
                                                        {
                                                            change
                                                                .operator
                                                                .display_name
                                                        }

                                                        <div className="mt-1 text-xs font-normal text-slate-400">
                                                            NIF{" "}
                                                            {
                                                                change
                                                                    .operator
                                                                    .nif
                                                            }
                                                        </div>
                                                    </Link>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {[
                                                    change.registration
                                                        ?.district,
                                                    change.registration
                                                        ?.municipality,
                                                ]
                                                    .filter(
                                                        Boolean,
                                                    )
                                                    .join(
                                                        " · ",
                                                    ) ||
                                                    "—"}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-500">
                                                {change.changed_fields &&
                                                change.changed_fields
                                                    .length >
                                                    0
                                                    ? change.changed_fields.join(
                                                          ", ",
                                                      )
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                        <div className="text-sm text-slate-500">
                            {meta.from}–
                            {meta.to} de{" "}
                            {formatNumber(
                                meta.total,
                            )}
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

function Metric({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-2xl font-bold text-slate-950">
                {formatNumber(value)}
            </div>

            <div className="mt-1 text-sm text-slate-500">
                {label}
            </div>
        </div>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-1.5 break-all text-sm font-semibold text-slate-700">
                {value}
            </div>
        </div>
    );
}

function ChangeCounter({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="bg-white px-5 py-4">
            <div className="text-xl font-bold text-slate-900">
                {formatNumber(value)}
            </div>

            <div className="mt-1 text-xs font-medium text-slate-500">
                {label}
            </div>
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

function ChangeBadge({
    type,
}: {
    type: BackofficeTvdeChangeType;
}) {
    const config = {
        created: [
            "Novo",
            "bg-emerald-50 text-emerald-700",
        ],
        updated: [
            "Alterado",
            "bg-amber-50 text-amber-700",
        ],
        removed: [
            "Removido",
            "bg-red-50 text-red-700",
        ],
        restored: [
            "Restaurado",
            "bg-sky-50 text-sky-700",
        ],
    }[type];

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config[1]}`}
        >
            {config[0]}
        </span>
    );
}

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const completed =
        status === "completed";

    return (
        <span
            className={[
                "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                completed
                    ? "bg-emerald-50 text-emerald-700"
                    : status === "failed"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700",
            ].join(" ")}
        >
            {completed
                ? "Concluída"
                : status === "failed"
                  ? "Falhou"
                  : "A processar"}
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

function formatDateTime(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle: "short",
            timeStyle: "short",
        },
    ).format(new Date(value));
}

const paginationButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40";

const thClass =
    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";
