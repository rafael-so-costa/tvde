import axios from "axios";
import {
    ArrowLeft,
    Building2,
    CalendarClock,
    CheckCircle2,
    LoaderCircle,
    Mail,
    MapPin,
    MessageSquarePlus,
    Phone,
    Rocket,
    UserRound,
} from "lucide-react";
import {
    useEffect,
    useState,
} from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    Link,
    useParams,
} from "react-router-dom";

import CrmActivityTimeline from "../components/CrmActivityTimeline";
import CrmPriorityBadge from "../components/CrmPriorityBadge";
import CrmStageBadge from "../components/CrmStageBadge";
import api from "../lib/api";

import type {
    BackofficePlanListResponse,
} from "../types/backoffice";

import type {
    BackofficeCrmActivityStatus,
    BackofficeCrmActivityType,
    BackofficeCrmConversionResponse,
    BackofficeCrmLeadResponse,
    BackofficeCrmPipelineResponse,
} from "../types/backofficeCrmCommercial";

export default function BackofficeCrmLeadPage() {
    const { id } =
        useParams();

    const queryClient =
        useQueryClient();

    const [stageId, setStageId] =
        useState("");

    const [stageNote, setStageNote] =
        useState("");

    const [lostReason, setLostReason] =
        useState("");

    const [activityType, setActivityType] =
        useState<BackofficeCrmActivityType>(
            "call",
        );

    const [activityStatus, setActivityStatus] =
        useState<BackofficeCrmActivityStatus>(
            "completed",
        );

    const [activitySubject, setActivitySubject] =
        useState("");

    const [activityDescription, setActivityDescription] =
        useState("");

    const [scheduledAt, setScheduledAt] =
        useState("");

    const [planId, setPlanId] =
        useState("");

    const [trialDays, setTrialDays] =
        useState("14");

    const leadQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "lead",
                id,
            ],

            enabled: Boolean(id),

            queryFn: async () => {
                const response =
                    await api.get(
                        `/api/backoffice/crm/leads/${id}`,
                    );

                return response
                    .data as BackofficeCrmLeadResponse;
            },
        });

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

    const plansQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "planos",
                "crm-conversion",
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/planos",
                    );

                return response
                    .data as BackofficePlanListResponse;
            },
        });

    const lead =
        leadQuery.data?.data;

    useEffect(() => {
        if (
            lead &&
            stageId === ""
        ) {
            setStageId(
                lead.stage.id,
            );
        }
    }, [
        lead,
        stageId,
    ]);

    useEffect(() => {
        if (
            plansQuery.data &&
            !planId
        ) {
            const firstActive =
                plansQuery.data.data.find(
                    (plan) =>
                        plan.ativo,
                );

            if (firstActive) {
                setPlanId(
                    firstActive.id,
                );
            }
        }
    }, [
        plansQuery.data,
        planId,
    ]);

    const invalidateLead =
        async () => {
            await queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "crm",
                    "lead",
                    id,
                ],
            });

            await queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "crm",
                    "leads",
                ],
            });

            await queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "crm",
                    "pipeline",
                ],
            });

            await queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "crm",
                    "dashboard",
                ],
            });
        };

    const stageMutation =
        useMutation({
            mutationFn: async () => {
                const target =
                    pipelineQuery.data?.data.find(
                        (stage) =>
                            stage.id ===
                            stageId,
                    );

                const response =
                    await api.patch(
                        `/api/backoffice/crm/leads/${id}/etapa`,
                        {
                            stage_id:
                                stageId,

                            note:
                                stageNote ||
                                null,

                            lost_reason:
                                target?.category ===
                                "lost"
                                    ? lostReason
                                    : null,
                        },
                    );

                return response.data;
            },

            onSuccess:
                invalidateLead,
        });

    const activityMutation =
        useMutation({
            mutationFn: async () => {
                const response =
                    await api.post(
                        `/api/backoffice/crm/leads/${id}/atividades`,
                        {
                            type:
                                activityType,

                            status:
                                activityStatus,

                            subject:
                                activitySubject,

                            description:
                                activityDescription ||
                                null,

                            scheduled_at:
                                scheduledAt ||
                                null,
                        },
                    );

                return response.data;
            },

            onSuccess: async () => {
                setActivitySubject(
                    "",
                );

                setActivityDescription(
                    "",
                );

                setScheduledAt(
                    "",
                );

                await invalidateLead();
            },
        });

    const conversionMutation =
        useMutation({
            mutationFn: async () => {
                const response =
                    await api.post(
                        `/api/backoffice/crm/leads/${id}/converter`,
                        {
                            saas_plan_id:
                                planId,

                            trial_days:
                                Number(
                                    trialDays ||
                                        0,
                                ),
                        },
                    );

                return response
                    .data as BackofficeCrmConversionResponse;
            },

            onSuccess:
                invalidateLead,
        });

    if (
        leadQuery.isLoading
    ) {
        return <Loading />;
    }

    if (
        leadQuery.isError ||
        !lead
    ) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Não foi possível carregar o lead.
            </div>
        );
    }

    const selectedStage =
        pipelineQuery.data?.data.find(
            (stage) =>
                stage.id ===
                stageId,
        );

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <Link
                    to="/backoffice/crm/leads"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Leads
                </Link>

                <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                                {
                                    lead.company_name
                                }
                            </h1>

                            <CrmStageBadge
                                stage={
                                    lead.stage
                                }
                            />

                            <CrmPriorityBadge
                                priority={
                                    lead.priority
                                }
                            />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                            {lead.nif
                                ? `NIF ${lead.nif}`
                                : "Lead sem NIF"}
                        </p>
                    </div>

                    {lead.converted_tenant && (
                        <Link
                            to={`/backoffice/clientes/${lead.converted_tenant.id}`}
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Ver cliente FrotaPRO
                        </Link>
                    )}
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="font-semibold text-slate-900">
                        Dados comerciais
                    </h2>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <Info
                            icon={
                                UserRound
                            }
                            label="Contacto"
                            value={
                                lead.contact_name
                            }
                        />

                        <Info
                            icon={Mail}
                            label="Email"
                            value={
                                lead.email
                            }
                        />

                        <Info
                            icon={Phone}
                            label="Telefone"
                            value={
                                lead.phone
                            }
                        />

                        <Info
                            icon={MapPin}
                            label="Localização"
                            value={
                                [
                                    lead.municipality,
                                    lead.district,
                                ]
                                    .filter(
                                        Boolean,
                                    )
                                    .join(
                                        ", ",
                                    ) ||
                                null
                            }
                        />

                        <Info
                            icon={
                                CalendarClock
                            }
                            label="Último contacto"
                            value={
                                lead.last_contacted_at
                                    ? formatDateTime(
                                          lead.last_contacted_at,
                                      )
                                    : null
                            }
                        />

                        <Info
                            icon={
                                CalendarClock
                            }
                            label="Próximo follow-up"
                            value={
                                lead.next_follow_up_at
                                    ? formatDateTime(
                                          lead.next_follow_up_at,
                                      )
                                    : null
                            }
                        />
                    </div>

                    {lead.notes && (
                        <div className="mt-5 border-t border-slate-100 pt-5">
                            <div className={labelClass}>
                                Notas
                            </div>

                            <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                                {
                                    lead.notes
                                }
                            </p>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="font-semibold text-slate-900">
                        Pipeline
                    </h2>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className={labelClass}>
                                Nova etapa
                            </label>

                            <select
                                value={
                                    stageId
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setStageId(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className={inputClass}
                            >
                                {pipelineQuery.data?.data.map(
                                    (
                                        stage,
                                    ) => (
                                        <option
                                            key={
                                                stage.id
                                            }
                                            value={
                                                stage.id
                                            }
                                            disabled={
                                                stage.category ===
                                                    "won" &&
                                                !lead.converted_tenant
                                            }
                                        >
                                            {
                                                stage.name
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>

                        {selectedStage?.category ===
                            "lost" && (
                            <div>
                                <label className={labelClass}>
                                    Motivo de encerramento *
                                </label>

                                <textarea
                                    value={
                                        lostReason
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setLostReason(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className={textareaClass}
                                />
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>
                                Nota da mudança
                            </label>

                            <textarea
                                value={
                                    stageNote
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setStageNote(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className={textareaClass}
                            />
                        </div>

                        <button
                            type="button"
                            disabled={
                                stageMutation.isPending ||
                                stageId ===
                                    lead.stage.id ||
                                (selectedStage?.category ===
                                    "lost" &&
                                    !lostReason.trim())
                            }
                            onClick={() =>
                                stageMutation.mutate()
                            }
                            className={primaryButton}
                        >
                            {stageMutation.isPending && (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            )}

                            Atualizar etapa
                        </button>

                        {stageMutation.isError && (
                            <ErrorBox
                                error={
                                    stageMutation.error
                                }
                            />
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2">
                        <MessageSquarePlus className="h-5 w-5 text-indigo-600" />

                        <h2 className="font-semibold text-slate-900">
                            Registar atividade
                        </h2>
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            activityMutation.mutate();
                        }}
                        className="mt-5 space-y-4"
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>
                                    Tipo
                                </label>

                                <select
                                    value={
                                        activityType
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setActivityType(
                                            event
                                                .target
                                                .value as BackofficeCrmActivityType,
                                        )
                                    }
                                    className={inputClass}
                                >
                                    <option value="note">
                                        Nota
                                    </option>
                                    <option value="call">
                                        Chamada
                                    </option>
                                    <option value="email">
                                        Email
                                    </option>
                                    <option value="whatsapp">
                                        WhatsApp
                                    </option>
                                    <option value="meeting">
                                        Reunião
                                    </option>
                                    <option value="demo">
                                        Demonstração
                                    </option>
                                    <option value="proposal">
                                        Proposta
                                    </option>
                                    <option value="task">
                                        Tarefa
                                    </option>
                                    <option value="follow_up">
                                        Follow-up
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Estado
                                </label>

                                <select
                                    value={
                                        activityStatus
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setActivityStatus(
                                            event
                                                .target
                                                .value as BackofficeCrmActivityStatus,
                                        )
                                    }
                                    className={inputClass}
                                >
                                    <option value="completed">
                                        Concluída
                                    </option>

                                    <option value="planned">
                                        Planeada
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>
                                Assunto *
                            </label>

                            <input
                                value={
                                    activitySubject
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setActivitySubject(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>
                                Descrição
                            </label>

                            <textarea
                                value={
                                    activityDescription
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setActivityDescription(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className={textareaClass}
                            />
                        </div>

                        {activityStatus ===
                            "planned" && (
                            <div>
                                <label className={labelClass}>
                                    Data prevista
                                </label>

                                <input
                                    type="datetime-local"
                                    value={
                                        scheduledAt
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setScheduledAt(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className={inputClass}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={
                                activityMutation.isPending ||
                                !activitySubject.trim()
                            }
                            className={primaryButton}
                        >
                            {activityMutation.isPending && (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            )}

                            Guardar atividade
                        </button>

                        {activityMutation.isError && (
                            <ErrorBox
                                error={
                                    activityMutation.error
                                }
                            />
                        )}
                    </form>
                </div>

                {!lead.converted_tenant ? (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
                        <div className="flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-indigo-600" />

                            <h2 className="font-semibold text-slate-900">
                                Converter em cliente
                            </h2>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Cria ou associa o Tenant FrotaPRO e configura a assinatura comercial.
                        </p>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className={labelClass}>
                                    Plano
                                </label>

                                <select
                                    value={
                                        planId
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setPlanId(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className={inputClass}
                                >
                                    {plansQuery.data?.data
                                        .filter(
                                            (
                                                plan,
                                            ) =>
                                                plan.ativo,
                                        )
                                        .map(
                                            (
                                                plan,
                                            ) => (
                                                <option
                                                    key={
                                                        plan.id
                                                    }
                                                    value={
                                                        plan.id
                                                    }
                                                >
                                                    {
                                                        plan.nome
                                                    }
                                                </option>
                                            ),
                                        )}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Trial em dias
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={
                                        trialDays
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setTrialDays(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className={inputClass}
                                />
                            </div>

                            <button
                                type="button"
                                disabled={
                                    conversionMutation.isPending ||
                                    !planId
                                }
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            "Converter este lead em cliente FrotaPRO?",
                                        )
                                    ) {
                                        conversionMutation.mutate();
                                    }
                                }}
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {conversionMutation.isPending && (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                )}

                                Converter em cliente
                            </button>

                            {conversionMutation.isError && (
                                <ErrorBox
                                    error={
                                        conversionMutation.error
                                    }
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <Building2 className="h-7 w-7 text-emerald-600" />

                        <h2 className="mt-4 font-semibold text-emerald-900">
                            Lead convertido
                        </h2>

                        <p className="mt-2 text-sm text-emerald-700">
                            {
                                lead.converted_tenant.nome
                            }
                        </p>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-semibold text-slate-900">
                    Histórico de atividades
                </h2>

                <div className="mt-5">
                    <CrmActivityTimeline
                        activities={
                            lead.activities
                        }
                    />
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-semibold text-slate-900">
                    Histórico do pipeline
                </h2>

                <div className="mt-5 space-y-3">
                    {lead.stage_history.map(
                        (history) => (
                            <div
                                key={
                                    history.id
                                }
                                className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 sm:flex-row sm:items-center"
                            >
                                <div className="flex items-center gap-2">
                                    {history.from_stage && (
                                        <>
                                            <CrmStageBadge
                                                stage={
                                                    history.from_stage
                                                }
                                                compact
                                            />

                                            <span className="text-slate-300">
                                                →
                                            </span>
                                        </>
                                    )}

                                    <CrmStageBadge
                                        stage={
                                            history.to_stage
                                        }
                                        compact
                                    />
                                </div>

                                <div className="text-xs text-slate-400">
                                    {formatDateTime(
                                        history.changed_at,
                                    )}
                                </div>
                            </div>
                        ),
                    )}
                </div>
            </section>
        </div>
    );
}

function Info({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Mail;
    label: string;
    value: string | null;
}) {
    return (
        <div>
            <div className={labelClass}>
                {label}
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Icon className="h-4 w-4 text-slate-400" />
                {value ?? "—"}
            </div>
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

function ErrorBox({
    error,
}: {
    error: unknown;
}) {
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage(
                error,
            )}
        </div>
    );
}

function errorMessage(
    error: unknown,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const message =
            error.response?.data
                ?.message;

        if (
            typeof message ===
            "string"
        ) {
            return message;
        }

        const errors =
            error.response?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                "object"
        ) {
            const first =
                Object.values(
                    errors,
                )[0];

            if (
                Array.isArray(
                    first,
                )
            ) {
                return String(
                    first[0],
                );
            }
        }
    }

    return "Não foi possível concluir a operação.";
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

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const textareaClass =
    "min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

const primaryButton =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50";
