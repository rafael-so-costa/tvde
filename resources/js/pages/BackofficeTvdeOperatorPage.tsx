import {
    ArrowLeft,
    Building2,
    Database,
    History,
    LoaderCircle,
    MapPin,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
    Link,
    useParams,
} from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeTvdeChangeType,
    BackofficeTvdeOperatorResponse,
    BackofficeTvdeRegistrationDetail,
    BackofficeTvdeSource,
} from "../types/backofficeCrm";

export default function BackofficeTvdeOperatorPage() {
    const { id } =
        useParams<{
            id: string;
        }>();

    const operatorQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "operadores",
                id,
            ],

            enabled: Boolean(id),

            queryFn: async () => {
                const response =
                    await api.get(
                        `/api/backoffice/crm/operadores/${id}`,
                    );

                return response
                    .data as BackofficeTvdeOperatorResponse;
            },
        });

    if (operatorQuery.isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (
        operatorQuery.isError ||
        !operatorQuery.data
    ) {
        return (
            <div className="mx-auto max-w-7xl space-y-5">
                <Link
                    to="/backoffice/crm/operadores"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar à Base TVDE
                </Link>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Não foi possível carregar o operador.
                </div>
            </div>
        );
    }

    const operator =
        operatorQuery.data.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <Link
                    to="/backoffice/crm/operadores"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar à Base TVDE
                </Link>

                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <Building2 className="h-6 w-6" />
                        </div>

                        <div>
                            <p className="mb-1 text-sm font-medium text-indigo-600">
                                Operador TVDE
                            </p>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                                {operator.display_name}
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                NIF {operator.nif}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {operator.sources.map(
                            (source) => (
                                <SourceBadge
                                    key={source}
                                    source={source}
                                />
                            ),
                        )}

                        <span
                            className={[
                                "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                                operator.active
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700",
                            ].join(" ")}
                        >
                            {operator.active
                                ? "Ativo"
                                : "Removido"}
                        </span>

                        <span
                            className={[
                                "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                                operator.is_customer
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-indigo-50 text-indigo-700",
                            ].join(" ")}
                        >
                            {operator.is_customer
                                ? "Cliente FrotaPRO"
                                : "Prospect"}
                        </span>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                    label="Registos"
                    value={
                        operator.registrations.length
                    }
                />

                <Metric
                    label="IMT"
                    value={
                        operator.source_presence.imt
                            ? "Sim"
                            : "Não"
                    }
                />

                <Metric
                    label="RAM"
                    value={
                        operator.source_presence.ram
                            ? "Sim"
                            : "Não"
                    }
                />

                <Metric
                    label="Eventos"
                    value={
                        operator.changes.length
                    }
                />
            </section>

            {operator.customers.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white">
                    <div className="border-b border-emerald-100 bg-emerald-50/50 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">
                            Cliente FrotaPRO
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Organização FrotaPRO com o mesmo NIF.
                        </p>
                    </div>

                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        {operator.customers.map(
                            (customer) => (
                                <Link
                                    key={customer.id}
                                    to={`/backoffice/clientes/${customer.id}`}
                                    className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                                >
                                    <div className="font-semibold text-slate-900">
                                        {customer.nome}
                                    </div>

                                    <div className="mt-2 text-sm text-slate-500">
                                        {customer.email ??
                                            "Sem e-mail"}
                                    </div>

                                    <div className="mt-1 text-sm text-slate-500">
                                        {customer.telefone ??
                                            "Sem telefone"}
                                    </div>
                                </Link>
                            ),
                        )}
                    </div>
                </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-indigo-500" />

                        <h2 className="font-semibold text-slate-900">
                            Registos oficiais
                        </h2>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        Presença da entidade nas diferentes fontes oficiais.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className={thClass}>
                                    Fonte
                                </th>

                                <th className={thClass}>
                                    Denominação
                                </th>

                                <th className={thClass}>
                                    Localização
                                </th>

                                <th className={thClass}>
                                    Licença
                                </th>

                                <th className={thClass}>
                                    Visto primeiro
                                </th>

                                <th className={thClass}>
                                    Estado
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {operator.registrations.map(
                                (registration) => (
                                    <RegistrationRow
                                        key={
                                            registration.id
                                        }
                                        registration={
                                            registration
                                        }
                                    />
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-indigo-500" />

                        <h2 className="font-semibold text-slate-900">
                            Histórico de alterações
                        </h2>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        Eventos detetados entre snapshots oficiais.
                    </p>
                </div>

                {operator.changes.length ===
                0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-400">
                        Nenhum evento registado.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {operator.changes.map(
                            (change) => (
                                <div
                                    key={
                                        change.id
                                    }
                                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <ChangeBadge
                                                type={
                                                    change.change_type
                                                }
                                            />

                                            {change.import && (
                                                <SourceBadge
                                                    source={
                                                        change.import.source
                                                    }
                                                />
                                            )}
                                        </div>

                                        <div className="mt-2 text-sm text-slate-500">
                                            {change.changed_fields &&
                                            change.changed_fields.length >
                                                0
                                                ? change.changed_fields.join(
                                                      ", ",
                                                  )
                                                : "Sem campos específicos"}
                                        </div>
                                    </div>

                                    <div className="text-sm text-slate-500">
                                        {change.import
                                            ? formatDate(
                                                  change.import.reference_date,
                                              )
                                            : formatDateTime(
                                                  change.created_at,
                                              )}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

function RegistrationRow({
    registration,
}: {
    registration: BackofficeTvdeRegistrationDetail;
}) {
    const location = [
        registration.district,
        registration.municipality,
        registration.postal_locality,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <tr>
            <td className="px-5 py-4">
                <SourceBadge
                    source={
                        registration.source
                    }
                />
            </td>

            <td className="px-5 py-4">
                <div className="font-medium text-slate-800">
                    {registration.denomination}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                    {registration.source_key}
                </div>
            </td>

            <td className="px-5 py-4 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <span>
                        {location || "—"}
                    </span>
                </div>
            </td>

            <td className="px-5 py-4 text-sm text-slate-600">
                {registration.license_number ??
                    "—"}
            </td>

            <td className="px-5 py-4 text-sm text-slate-500">
                {registration.first_seen_at
                    ? formatDate(
                          registration.first_seen_at,
                      )
                    : "—"}
            </td>

            <td className="px-5 py-4">
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        registration.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700",
                    ].join(" ")}
                >
                    {registration.active
                        ? "Ativo"
                        : "Removido"}
                </span>
            </td>
        </tr>
    );
}

function Metric({
    label,
    value,
}: {
    label: string;
    value: number | string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-2xl font-bold text-slate-950">
                {typeof value === "number"
                    ? formatNumber(value)
                    : value}
            </div>

            <div className="mt-1 text-sm text-slate-500">
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

const thClass =
    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";
