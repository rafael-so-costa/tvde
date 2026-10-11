import axios from "axios";

import {
    BadgeCheck,
    CheckCircle2,
    Copy,
    FileSignature,
    GitBranch,
    LoaderCircle,
    Sparkles,
} from "lucide-react";

import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";

import api from "../../../lib/api";

import type {
    ChecklistProcessPreset,
    ChecklistProcessTemplate,
} from "../../../types/template";

const labels: Record<string, string> = {
    tarefa: "Tarefa",
    preenchimento: "Preenchimento",
    assinatura: "Assinatura",
    upload: "Upload",
    aprovacao: "Aprovação",
    gerar_documento: "Gerar documento",
    contrato_relacionado: "Contrato relacionado",
    checklist_veiculo: "Checklist do veículo",
    validacao: "Validação",
    acao_sistema: "Ação do sistema",
};

export default function RecommendedWorkflowPresetsPanel({
    onUsed,
}: {
    onUsed: (
        workflow: ChecklistProcessTemplate,
    ) => Promise<void>;
}) {
    const query =
        useQuery({
            queryKey: [
                "checklist-process-presets",
            ],

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/checklist-process-presets",
                        );

                    return response
                        .data
                        .data as ChecklistProcessPreset[];
                },
        });

    const mutation =
        useMutation({
            mutationFn:
                async (
                    preset: ChecklistProcessPreset,
                ) => {
                    const response =
                        await api.post(
                            `/api/checklist-process-presets/${preset.codigo}/usar`,
                        );

                    return response
                        .data
                        .data as ChecklistProcessTemplate;
                },

            onSuccess:
                async (
                    workflow,
                ) => {
                    await onUsed(
                        workflow,
                    );
                },
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
            <div className="px-6 py-16 text-center">
                <GitBranch className="mx-auto h-12 w-12 text-slate-300" />

                <h3 className="mt-4 font-semibold text-slate-900">
                    Não foi possível carregar os workflows recomendados
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                    {errorMessage(
                        query.error,
                        "Tente novamente.",
                    )}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5 p-5">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <div className="flex gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                    <div>
                        <h3 className="font-semibold text-indigo-950">
                            Workflows recomendados pelo FrotaPro
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-indigo-800">
                            Escolha um fluxo pronto e copie-o para a sua
                            organização. Depois da cópia poderá editar, remover
                            ou acrescentar etapas normalmente.
                        </p>
                    </div>
                </div>
            </div>

            {mutation.isError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {errorMessage(
                        mutation.error,
                        "Não foi possível adicionar o workflow.",
                    )}
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                {query.data.map(
                    (
                        preset,
                    ) => (
                        <article
                            key={
                                preset.codigo
                            }
                            className={[
                                "rounded-2xl border bg-white p-5",
                                preset.destaque
                                    ? "border-indigo-200 ring-1 ring-indigo-100"
                                    : "border-slate-200",
                            ].join(
                                " ",
                            )}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                            {
                                                preset.categoria
                                            }
                                        </span>

                                        {preset.destaque && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                                <Sparkles className="h-3 w-3" />

                                                Recomendado
                                            </span>
                                        )}

                                        {preset.ja_utilizado && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                <BadgeCheck className="h-3 w-3" />

                                                Já utilizado
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="mt-3 text-lg font-bold text-slate-950">
                                        {
                                            preset.nome
                                        }
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {
                                            preset.descricao
                                        }
                                    </p>
                                </div>

                                <span className="shrink-0 text-xs font-medium text-slate-400">
                                    v
                                    {
                                        preset.versao
                                    }
                                </span>
                            </div>

                            <div className="mt-5 space-y-2">
                                {preset.items.map(
                                    (
                                        item,
                                    ) => (
                                        <div
                                            key={
                                                item.codigo
                                            }
                                            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                                        >
                                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                                                {
                                                    item.ordem
                                                }
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-slate-800">
                                                    {
                                                        item.titulo
                                                    }
                                                </div>

                                                <div className="mt-0.5 text-xs text-slate-400">
                                                    {
                                                        labels[
                                                            item.tipo
                                                        ] ??
                                                        item.tipo
                                                    }

                                                    {item.obrigatorio
                                                        ? " · obrigatório"
                                                        : " · opcional"}
                                                </div>

                                                {item.tipo ===
                                                    "contrato_relacionado" && (
                                                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-violet-600">
                                                        <FileSignature className="h-3.5 w-3.5" />

                                                        {
                                                            item
                                                                .configuracao
                                                                ?.tipo_contrato_codigo
                                                        }
                                                    </div>
                                                )}
                                            </div>

                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                                        </div>
                                    ),
                                )}
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                                <div className="text-xs text-slate-400">
                                    {
                                        preset.items
                                            .length
                                    }{" "}
                                    etapas

                                    {preset.copias >
                                        0 &&
                                        ` · ${preset.copias} cópia${
                                            preset.copias ===
                                            1
                                                ? ""
                                                : "s"
                                        }`}
                                </div>

                                <button
                                    type="button"
                                    disabled={
                                        mutation.isPending
                                    }
                                    onClick={() =>
                                        mutation.mutate(
                                            preset,
                                        )
                                    }
                                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {mutation.isPending &&
                                    mutation.variables
                                        ?.codigo ===
                                        preset.codigo ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}

                                    Usar workflow
                                </button>
                            </div>
                        </article>
                    ),
                )}
            </div>
        </div>
    );
}

function errorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const errors =
            error.response
                ?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                "object"
        ) {
            const first =
                Object.values(
                    errors,
                )
                    .flat()
                    .find(
                        (
                            value,
                        ) =>
                            typeof value ===
                            "string",
                    );

            if (
                typeof first ===
                    "string"
            ) {
                return first;
            }
        }

        return (
            error.response
                ?.data
                ?.message ??
            fallback
        );
    }

    return fallback;
}