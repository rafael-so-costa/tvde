import {
    LoaderCircle,
    Rows3,
} from "lucide-react";
import {
    useQueries,
    useQuery,
} from "@tanstack/react-query";

import CrmLeadCard from "../components/CrmLeadCard";
import api from "../lib/api";

import type {
    BackofficeCrmLeadListResponse,
    BackofficeCrmPipelineResponse,
} from "../types/backofficeCrmCommercial";

export default function BackofficeCrmPipelinePage() {
    const pipelineQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "pipeline",
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/pipeline",
                    );

                return response
                    .data as BackofficeCrmPipelineResponse;
            },
        });

    const stages =
        pipelineQuery.data?.data ??
        [];

    const leadQueries =
        useQueries({
            queries: stages.map(
                (stage) => ({
                    queryKey: [
                        "backoffice",
                        "crm",
                        "pipeline",
                        "stage",
                        stage.id,
                    ],

                    queryFn: async () => {
                        const response =
                            await api.get(
                                "/api/backoffice/crm/leads",
                                {
                                    params: {
                                        stage_id:
                                            stage.id,

                                        per_page:
                                            100,
                                    },
                                },
                            );

                        return response
                            .data as BackofficeCrmLeadListResponse;
                    },

                    enabled:
                        Boolean(
                            stage.id,
                        ),
                }),
            ),
        });

    if (
        pipelineQuery.isLoading
    ) {
        return <Loading />;
    }

    if (
        pipelineQuery.isError
    ) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Não foi possível carregar o pipeline.
            </div>
        );
    }

    return (
        <div className="space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · Comercial
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Pipeline
                </h1>

                <p className="mt-2 text-slate-500">
                    Visão operacional das oportunidades por etapa comercial.
                </p>
            </section>

            {stages.length ===
            0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                    <Rows3 className="mx-auto h-10 w-10 text-slate-300" />

                    <p className="mt-4 text-sm text-slate-500">
                        Nenhuma etapa configurada.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto pb-4">
                    <div className="flex min-w-max gap-4">
                        {stages.map(
                            (
                                stage,
                                index,
                            ) => {
                                const result =
                                    leadQueries[
                                        index
                                    ];

                                const leads =
                                    result
                                        ?.data
                                        ?.data ??
                                    [];

                                return (
                                    <section
                                        key={
                                            stage.id
                                        }
                                        className="w-[320px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50"
                                    >
                                        <div className="border-b border-slate-200 px-4 py-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h2 className="font-semibold text-slate-900">
                                                        {
                                                            stage.name
                                                        }
                                                    </h2>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {
                                                            stage.leads_count
                                                        }{" "}
                                                        lead(s)
                                                    </p>
                                                </div>

                                                <span
                                                    className={[
                                                        "h-3 w-3 rounded-full",
                                                        stageDotClass(
                                                            stage.color,
                                                            stage.category,
                                                        ),
                                                    ].join(
                                                        " ",
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
                                            {result?.isLoading ? (
                                                <div className="flex justify-center py-10">
                                                    <LoaderCircle className="h-5 w-5 animate-spin text-indigo-600" />
                                                </div>
                                            ) : leads.length ===
                                              0 ? (
                                                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-400">
                                                    Sem leads
                                                </div>
                                            ) : (
                                                leads.map(
                                                    (
                                                        lead,
                                                    ) => (
                                                        <CrmLeadCard
                                                            key={
                                                                lead.id
                                                            }
                                                            lead={
                                                                lead
                                                            }
                                                        />
                                                    ),
                                                )
                                            )}
                                        </div>
                                    </section>
                                );
                            },
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Loading() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );
}

function stageDotClass(
    color: string | null,
    category: string,
): string {
    const colors: Record<
        string,
        string
    > = {
        slate: "bg-slate-400",
        sky: "bg-sky-500",
        blue: "bg-blue-500",
        indigo: "bg-indigo-500",
        violet: "bg-violet-500",
        purple: "bg-purple-500",
        amber: "bg-amber-500",
        emerald: "bg-emerald-500",
        rose: "bg-rose-500",
        red: "bg-red-500",
        orange: "bg-orange-500",
    };

    if (
        color &&
        colors[color]
    ) {
        return colors[color];
    }

    if (
        category ===
        "won"
    ) {
        return "bg-emerald-500";
    }

    if (
        category ===
        "lost"
    ) {
        return "bg-red-500";
    }

    return "bg-indigo-500";
}
