import axios from "axios";

import {
    AlertTriangle,
    ArrowUpCircle,
    BadgeCheck,
    FileText,
    GitCompareArrows,
    LoaderCircle,
    X,
} from "lucide-react";

import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";

import {
    atualizarModeloDocumentoRecomendado,
    compararModeloDocumentoRecomendado,
} from "../../../lib/modelos-documento-saas";

import type {
    TemplateContrato,
} from "../../../types/template";

export default function RecommendedTemplateUpdateModal({
    template,
    onClose,
    onUpdated,
}: {
    template: TemplateContrato;

    onClose: () => void;

    onUpdated: () => Promise<void>;
}) {
    const comparisonQuery =
        useQuery({
            queryKey: [
                "recommended-template-comparison",
                template.id,
            ],

            queryFn: () =>
                compararModeloDocumentoRecomendado(
                    template.id,
                ),
        });

    const updateMutation =
        useMutation({
            mutationFn: () =>
                atualizarModeloDocumentoRecomendado(
                    template.id,
                ),

            onSuccess: async () => {
                await onUpdated();
            },
        });

    const comparison =
        comparisonQuery.data;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative z-10 max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <GitCompareArrows className="h-5 w-5 text-indigo-600" />

                            <h2 className="text-lg font-semibold text-slate-950">
                                Comparar versão do modelo
                            </h2>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                            {template.nome}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {comparisonQuery.isLoading ? (
                    <div className="flex justify-center py-20">
                        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                ) : comparisonQuery.isError || !comparison ? (
                    <div className="p-6">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {errorMessage(
                                comparisonQuery.error,
                                "Não foi possível comparar as versões.",
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 p-6">
                        <section className="grid gap-4 sm:grid-cols-3">
                            <Info
                                label="Versão utilizada"
                                value={
                                    comparison.versao_atual.versao
                                        ? `v${comparison.versao_atual.versao}`
                                        : "Desconhecida"
                                }
                            />

                            <Info
                                label="Versão FrotaPro"
                                value={`v${comparison.nova_versao.versao}`}
                            />

                            <Info
                                label="Estado"
                                value={
                                    comparison.update_disponivel
                                        ? "Nova versão disponível"
                                        : "Atualizado"
                                }
                            />
                        </section>

                        {comparison.template.personalizado && (
                            <section className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                                <div>
                                    <h3 className="font-semibold text-amber-900">
                                        Esta cópia foi personalizada
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-amber-800">
                                        O conteúdo atual difere do snapshot
                                        FrotaPro que originou esta cópia. Ao
                                        adotar a nova versão, essas alterações
                                        não serão transportadas automaticamente.
                                        Compare os textos antes de continuar.
                                    </p>
                                </div>
                            </section>
                        )}

                        {!comparison.update_disponivel && (
                            <section className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                                <div>
                                    <h3 className="font-semibold text-emerald-900">
                                        Modelo atualizado
                                    </h3>

                                    <p className="mt-1 text-sm text-emerald-800">
                                        A sua empresa já utiliza a versão
                                        atualmente publicada pelo FrotaPro.
                                    </p>
                                </div>
                            </section>
                        )}

                        <section>
                            <div className="mb-3">
                                <h3 className="font-semibold text-slate-950">
                                    Comparação do conteúdo
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    À esquerda está a cópia atualmente utilizada
                                    pela empresa. À direita está o snapshot da
                                    versão oficial mais recente.
                                </p>
                            </div>

                            <div className="grid overflow-hidden rounded-2xl border border-slate-200 lg:grid-cols-2">
                                <VersionContent
                                    title={
                                        comparison.versao_atual.versao
                                            ? `Versão atual · v${comparison.versao_atual.versao}`
                                            : "Versão atual"
                                    }
                                    content={
                                        comparison.versao_atual.conteudo
                                    }
                                />

                                <VersionContent
                                    title={`Nova versão · v${comparison.nova_versao.versao}`}
                                    content={
                                        comparison.nova_versao.conteudo
                                    }
                                    right
                                />
                            </div>
                        </section>

                        {comparison.tipos_contrato_afetados.length > 0 && (
                            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="font-semibold text-slate-900">
                                    Tipos de contrato que serão atualizados
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Estes tipos passarão automaticamente a usar
                                    o novo snapshot.
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {comparison.tipos_contrato_afetados.map(
                                        (tipo) => (
                                            <span
                                                key={tipo.id}
                                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                            >
                                                {tipo.nome}
                                            </span>
                                        ),
                                    )}
                                </div>
                            </section>
                        )}

                        {updateMutation.isError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {errorMessage(
                                    updateMutation.error,
                                    "Não foi possível adotar a nova versão.",
                                )}
                            </div>
                        )}

                        <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                            <div className="flex gap-3">
                                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                                <div>
                                    <h3 className="font-semibold text-indigo-950">
                                        O histórico será preservado
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-indigo-800">
                                        O FrotaPro criará uma nova cópia a partir
                                        da versão oficial, repontará os tipos de
                                        contrato que utilizam este modelo e
                                        arquivará a cópia anterior. Contratos já
                                        existentes continuam ligados ao snapshot
                                        histórico anterior.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                Fechar
                            </button>

                            {comparison.update_disponivel && (
                                <button
                                    type="button"
                                    disabled={updateMutation.isPending}
                                    onClick={() => {
                                        if (
                                            !window.confirm(
                                                `Adotar a versão ${comparison.nova_versao.versao}? A cópia atual será preservada como histórico.`,
                                            )
                                        ) {
                                            return;
                                        }

                                        updateMutation.mutate();
                                    }}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowUpCircle className="h-4 w-4" />
                                    )}

                                    Adotar v
                                    {comparison.nova_versao.versao}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function VersionContent({
    title,
    content,
    right = false,
}: {
    title: string;
    content: string;
    right?: boolean;
}) {
    return (
        <div
            className={
                right
                    ? "border-t border-slate-200 lg:border-l lg:border-t-0"
                    : ""
            }
        >
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-800">
                    {title}
                </div>
            </div>

            <pre className="max-h-[52vh] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-slate-700">
                {content || "Sem conteúdo disponível."}
            </pre>
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-800">
                {value}
            </div>
        </div>
    );
}

function errorMessage(
    error: unknown,
    fallback: string,
): string {
    if (axios.isAxiosError(error)) {
        const errors =
            error.response?.data?.errors;

        if (
            errors &&
            typeof errors === "object"
        ) {
            const first =
                Object.values(errors)
                    .flat()
                    .find(
                        (value) =>
                            typeof value === "string",
                    );

            if (
                typeof first === "string"
            ) {
                return first;
            }
        }

        return (
            error.response?.data?.message ??
            fallback
        );
    }

    return fallback;
}