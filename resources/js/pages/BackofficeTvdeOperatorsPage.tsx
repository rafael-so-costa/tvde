import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Database,
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
    BackofficeTvdeOperator,
    BackofficeTvdeOperatorListResponse,
    BackofficeTvdeSource,
} from "../types/backofficeCrm";

export default function BackofficeTvdeOperatorsPage() {
    const [
        search,
        setSearch,
    ] = useState("");

    const [
        source,
        setSource,
    ] = useState("");

    const [
        status,
        setStatus,
    ] = useState(
        "active",
    );

    const [
        customer,
        setCustomer,
    ] = useState("");

    const [
        district,
        setDistrict,
    ] = useState("");

    const [
        municipality,
        setMunicipality,
    ] = useState("");

    const [
        page,
        setPage,
    ] = useState(1);

    const deferredSearch =
        useDeferredValue(search);

    const deferredDistrict =
        useDeferredValue(district);

    const deferredMunicipality =
        useDeferredValue(
            municipality,
        );

    const operatorsQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "operadores",
                deferredSearch,
                source,
                status,
                customer,
                deferredDistrict,
                deferredMunicipality,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/operadores",
                        {
                            params: {
                                search:
                                    deferredSearch ||
                                    undefined,

                                source:
                                    source ||
                                    undefined,

                                status:
                                    status ||
                                    undefined,

                                customer:
                                    customer ||
                                    undefined,

                                district:
                                    deferredDistrict ||
                                    undefined,

                                municipality:
                                    deferredMunicipality ||
                                    undefined,

                                page,

                                per_page: 20,
                            },
                        },
                    );

                return response
                    .data as BackofficeTvdeOperatorListResponse;
            },
        });

    const operators =
        operatorsQuery
            .data
            ?.data ?? [];

    const meta =
        operatorsQuery
            .data
            ?.meta;

    function resetPage(): void {
        setPage(1);
    }

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · Base oficial TVDE
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Operadores TVDE
                        </h1>

                        <p className="mt-2 text-slate-500">
                            Entidades identificadas nas listas oficiais IMT e RAM.
                        </p>
                    </div>

                    {meta && (
                        <div className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-900">
                                {formatNumber(
                                    meta.total,
                                )}
                            </span>{" "}
                            operadores
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 xl:grid-cols-[1.5fr_160px_160px_170px]">
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
                            placeholder="Pesquisar empresa ou NIF..."
                            className={inputClass}
                        />
                    </div>

                    <select
                        value={source}
                        onChange={(event) => {
                            setSource(
                                event.target.value,
                            );

                            resetPage();
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

                            resetPage();
                        }}
                        className={selectClass}
                    >
                        <option value="">
                            Todos
                        </option>

                        <option value="active">
                            Ativos
                        </option>

                        <option value="inactive">
                            Removidos
                        </option>
                    </select>

                    <select
                        value={customer}
                        onChange={(event) => {
                            setCustomer(
                                event.target.value,
                            );

                            resetPage();
                        }}
                        className={selectClass}
                    >
                        <option value="">
                            Todos
                        </option>

                        <option value="no">
                            Prospects
                        </option>

                        <option value="yes">
                            Clientes FrotaPRO
                        </option>
                    </select>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                        value={district}
                        onChange={(event) => {
                            setDistrict(
                                event.target.value,
                            );

                            resetPage();
                        }}
                        placeholder="Distrito, ex.: Lisboa"
                        className={plainInputClass}
                    />

                    <input
                        value={municipality}
                        onChange={(event) => {
                            setMunicipality(
                                event.target.value,
                            );

                            resetPage();
                        }}
                        placeholder="Concelho, ex.: Sintra"
                        className={plainInputClass}
                    />
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {operatorsQuery.isLoading ? (
                    <div className="flex min-h-72 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : operatorsQuery.isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar a base TVDE.
                    </div>
                ) : operators.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Database className="mx-auto h-10 w-10 text-slate-300" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            Nenhum operador encontrado
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
                                        Operador
                                    </th>

                                    <th className={thClass}>
                                        Fonte
                                    </th>

                                    <th className={thClass}>
                                        Localização
                                    </th>

                                    <th className={thClass}>
                                        CRM
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
                                {operators.map(
                                    (operator) => (
                                        <OperatorRow
                                            key={
                                                operator.id
                                            }
                                            operator={
                                                operator
                                            }
                                        />
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
                                            (
                                                current,
                                            ) =>
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
                                            (
                                                current,
                                            ) =>
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

function OperatorRow({
    operator,
}: {
    operator: BackofficeTvdeOperator;
}) {
    const locations =
        operator.registrations
            .filter(
                (registration) =>
                    registration.active,
            )
            .map((registration) => {
                return [
                    registration.district,
                    registration.municipality,
                ]
                    .filter(Boolean)
                    .join(" · ");
            })
            .filter(Boolean);

    const uniqueLocations =
        [...new Set(locations)];

    return (
        <tr className="transition hover:bg-slate-50/70">
            <td className="px-5 py-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Building2 className="h-5 w-5" />
                    </div>

                    <div>
                        <div className="font-semibold text-slate-900">
                            {operator.display_name}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                            NIF {operator.nif}
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                    {operator.sources.map(
                        (source) => (
                            <SourceBadge
                                key={source}
                                source={source}
                            />
                        ),
                    )}
                </div>
            </td>

            <td className="px-5 py-4 text-sm text-slate-600">
                {uniqueLocations.length > 0
                    ? uniqueLocations.join(
                          " / ",
                      )
                    : "—"}
            </td>

            <td className="px-5 py-4">
                {operator.is_customer ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Cliente
                    </span>
                ) : (
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        Prospect
                    </span>
                )}
            </td>

            <td className="px-5 py-4">
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        operator.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700",
                    ].join(" ")}
                >
                    {operator.active
                        ? "Ativo"
                        : "Removido"}
                </span>
            </td>

            <td className="px-5 py-4">
                <div className="flex justify-end">
                    <Link
                        to={`/backoffice/crm/operadores/${operator.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                        <Eye className="h-4 w-4" />
                        Ver
                    </Link>
                </div>
            </td>
        </tr>
    );
}

function SourceBadge({
    source,
}: {
    source: BackofficeTvdeSource;
}) {
    const ram =
        source === "ram";

    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                ram
                    ? "bg-violet-50 text-violet-700"
                    : "bg-indigo-50 text-indigo-700",
            ].join(" ")}
        >
            {ram
                ? "RAM"
                : "IMT"}
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

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const plainInputClass =
    "h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const selectClass =
    "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500";

const paginationButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40";

const thClass =
    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";
