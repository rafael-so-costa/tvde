import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    Copy,
    FileCheck2,
    FileText,
    LoaderCircle,
    RefreshCw,
    TrendingUp,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import {
    fetchBackofficeModeloDocumentoMetricas,
} from "../../lib/modelos-documento-saas";

import type {
    ModeloDocumentoSaasMetricasModelo,
} from "../../types/modelos-documento-saas";

export default function ModeloDocumentoSaasMetricsPanel() {
    const query = useQuery({
        queryKey: [
            "backoffice-modelos-documento",
            "metrics",
        ],

        queryFn:
            fetchBackofficeModeloDocumentoMetricas,
    });

    if (query.isLoading) {
        return (
            <div className="flex justify-center py-20">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (
        query.isError ||
        !query.data
    ) {
        return (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertTriangle className="mx-auto h-9 w-9 text-red-500" />

                <h3 className="mt-3 font-semibold text-red-900">
                    Não foi possível carregar as métricas
                </h3>

                <button
                    type="button"
                    onClick={() =>
                        query.refetch()
                    }
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white"
                >
                    <RefreshCw className="h-4 w-4" />

                    Tentar novamente
                </button>
            </section>
        );
    }

    const {
        resumo,
        modelos,
    } = query.data;

    return (
        <div className="space-y-6">
            <section>
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-950">
                            Adoção dos modelos FrotaPro
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Métricas calculadas a partir dos modelos efetivamente
                            utilizados pelas organizações.
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={
                            query.isFetching
                        }
                        onClick={() =>
                            query.refetch()
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                "h-4 w-4",
                                query.isFetching
                                    ? "animate-spin"
                                    : "",
                            ].join(" ")}
                        />

                        Atualizar
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <MetricCard
                        label="Modelos publicados"
                        value={
                            resumo.modelos_publicados
                        }
                        icon={
                            FileCheck2
                        }
                    />

                    <MetricCard
                        label="Organizações aderentes"
                        value={
                            resumo.organizacoes_aderentes
                        }
                        icon={
                            Building2
                        }
                    />

                    <MetricCard
                        label="Cópias históricas"
                        value={
                            resumo.copias_totais
                        }
                        icon={
                            Copy
                        }
                    />

                    <MetricCard
                        label="Templates FrotaPro ativos"
                        value={
                            resumo.templates_ativos_frotapro
                        }
                        icon={
                            BadgeCheck
                        }
                    />

                    <MetricCard
                        label="Templates próprios ativos"
                        value={
                            resumo.templates_ativos_proprios
                        }
                        icon={
                            FileText
                        }
                    />

                    <MetricCard
                        label="Taxa de padronização"
                        value={`${formatPercent(
                            resumo.taxa_padronizacao,
                        )}%`}
                        icon={
                            TrendingUp
                        }
                        highlight
                    />
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-950">
                            Índice de padronização
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            Percentagem dos templates ativos originados no
                            catálogo oficial FrotaPro.
                        </p>
                    </div>

                    <div className="text-3xl font-bold text-indigo-600">
                        {formatPercent(
                            resumo.taxa_padronizacao,
                        )}
                        %
                    </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{
                            width: `${Math.min(
                                100,
                                Math.max(
                                    0,
                                    resumo.taxa_padronizacao,
                                ),
                            )}%`,
                        }}
                    />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                    <span>
                        {
                            resumo.templates_ativos_frotapro
                        }{" "}
                        padronizados
                    </span>

                    <span>
                        {
                            resumo.templates_ativos_proprios
                        }{" "}
                        próprios
                    </span>

                    <span>
                        {
                            resumo.templates_ativos_total
                        }{" "}
                        ativos no total
                    </span>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="font-semibold text-slate-950">
                        Adoção por modelo
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Distribuição das cópias, organizações e versões
                        efetivamente utilizadas.
                    </p>
                </div>

                {!modelos.length ? (
                    <div className="px-6 py-16 text-center text-sm text-slate-500">
                        Ainda não existem dados de adoção.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <Th>
                                        Modelo
                                    </Th>

                                    <Th>
                                        Versão atual
                                    </Th>

                                    <Th>
                                        Organizações
                                    </Th>

                                    <Th>
                                        Cópias
                                    </Th>

                                    <Th>
                                        Versão mais usada
                                    </Th>

                                    <Th>
                                        Desatualizadas
                                    </Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {modelos.map(
                                    (
                                        modelo,
                                    ) => (
                                        <ModelRow
                                            key={
                                                modelo.id
                                            }
                                            modelo={
                                                modelo
                                            }
                                        />
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function ModelRow({
    modelo,
}: {
    modelo: ModeloDocumentoSaasMetricasModelo;
}) {
    return (
        <tr className="transition hover:bg-slate-50">
            <td className="px-5 py-4">
                <div className="font-semibold text-slate-900">
                    {
                        modelo.nome
                    }
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>
                        {modelo.categoria
                            ?.nome ??
                            "Sem categoria"}
                    </span>

                    {!modelo.ativo && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                            Inativo
                        </span>
                    )}

                    {modelo.status ===
                        "arquivado" && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                            Arquivado
                        </span>
                    )}
                </div>
            </td>

            <td className="px-5 py-4">
                {modelo.versao_publicada ? (
                    <span className="font-semibold text-slate-700">
                        v
                        {
                            modelo.versao_publicada
                        }
                    </span>
                ) : (
                    <span className="text-slate-400">
                        —
                    </span>
                )}
            </td>

            <td className="px-5 py-4">
                <div className="font-semibold text-slate-900">
                    {
                        modelo.organizacoes_aderentes
                    }
                </div>

                <div className="text-xs text-slate-400">
                    com uso ativo
                </div>
            </td>

            <td className="px-5 py-4">
                <div className="font-semibold text-slate-900">
                    {
                        modelo.copias_totais
                    }
                </div>

                <div className="text-xs text-slate-400">
                    {
                        modelo.copias_ativas
                    }{" "}
                    ativas
                </div>
            </td>

            <td className="px-5 py-4">
                {modelo.versao_mais_usada ? (
                    <div>
                        <div className="font-semibold text-slate-800">
                            v
                            {
                                modelo.versao_mais_usada
                            }
                        </div>

                        <div className="text-xs text-slate-400">
                            {
                                modelo.versao_mais_usada_copias
                            }{" "}
                            cópia
                            {modelo.versao_mais_usada_copias ===
                            1
                                ? ""
                                : "s"}
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-400">
                        —
                    </span>
                )}
            </td>

            <td className="px-5 py-4">
                {modelo.organizacoes_desatualizadas >
                0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />

                        {
                            modelo.organizacoes_desatualizadas
                        }
                    </span>
                ) : modelo.organizacoes_aderentes >
                  0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <BadgeCheck className="h-3.5 w-3.5" />

                        Atualizadas
                    </span>
                ) : (
                    <span className="text-slate-400">
                        —
                    </span>
                )}
            </td>
        </tr>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
    highlight = false,
}: {
    label: string;
    value: number | string;
    icon: typeof FileText;
    highlight?: boolean;
}) {
    return (
        <div
            className={[
                "rounded-2xl border p-5",
                highlight
                    ? "border-indigo-200 bg-indigo-50"
                    : "border-slate-200 bg-white",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p
                        className={[
                            "text-[11px] font-semibold uppercase tracking-wide",
                            highlight
                                ? "text-indigo-500"
                                : "text-slate-400",
                        ].join(" ")}
                    >
                        {label}
                    </p>

                    <p
                        className={[
                            "mt-2 text-2xl font-bold",
                            highlight
                                ? "text-indigo-700"
                                : "text-slate-950",
                        ].join(" ")}
                    >
                        {typeof value ===
                        "number"
                            ? value.toLocaleString(
                                  "pt-PT",
                              )
                            : value}
                    </p>
                </div>

                <div
                    className={[
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        highlight
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

function Th({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <th className="bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {children}
        </th>
    );
}

function formatPercent(
    value: number,
): string {
    return new Intl.NumberFormat(
        "pt-PT",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        },
    ).format(value);
}
