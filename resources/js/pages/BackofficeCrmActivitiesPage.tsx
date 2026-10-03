import {
    CalendarClock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    LoaderCircle,
    XCircle,
} from "lucide-react";
import {
    useState,
} from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeCrmActivityListResponse,
    BackofficeCrmActivityStatus,
    BackofficeCrmActivityType,
} from "../types/backofficeCrmCommercial";

export default function BackofficeCrmActivitiesPage() {
    const queryClient =
        useQueryClient();

    const [type, setType] =
        useState("");

    const [status, setStatus] =
        useState("");

    const [scheduled, setScheduled] =
        useState("");

    const [page, setPage] =
        useState(1);

    const activitiesQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "atividades",
                type,
                status,
                scheduled,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/atividades",
                        {
                            params: {
                                type:
                                    type ||
                                    undefined,

                                status:
                                    status ||
                                    undefined,

                                scheduled:
                                    scheduled ||
                                    undefined,

                                page,

                                per_page:
                                    20,
                            },
                        },
                    );

                return response
                    .data as BackofficeCrmActivityListResponse;
            },
        });

    const refresh =
        async () => {
            await queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "crm",
                    "atividades",
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

    const completeMutation =
        useMutation({
            mutationFn: async (
                id: string,
            ) =>
                api.post(
                    `/api/backoffice/crm/atividades/${id}/concluir`,
                    {},
                ),

            onSuccess:
                refresh,
        });

    const cancelMutation =
        useMutation({
            mutationFn: async (
                id: string,
            ) =>
                api.post(
                    `/api/backoffice/crm/atividades/${id}/cancelar`,
                    {},
                ),

            onSuccess:
                refresh,
        });

    const activities =
        activitiesQuery.data
            ?.data ?? [];

    const meta =
        activitiesQuery.data
            ?.meta;

    function resetPage() {
        setPage(1);
    }

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · Comercial
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Atividades
                </h1>

                <p className="mt-2 text-slate-500">
                    Chamadas, reuniões, tarefas e follow-ups da equipa comercial.
                </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-3 md:grid-cols-3">
                    <select
                        value={
                            type
                        }
                        onChange={(
                            event,
                        ) => {
                            setType(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todos os tipos
                        </option>

                        {activityTypes.map(
                            (item) => (
                                <option
                                    key={
                                        item.value
                                    }
                                    value={
                                        item.value
                                    }
                                >
                                    {
                                        item.label
                                    }
                                </option>
                            ),
                        )}
                    </select>

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

                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todos os estados
                        </option>

                        <option value="planned">
                            Planeadas
                        </option>

                        <option value="completed">
                            Concluídas
                        </option>

                        <option value="canceled">
                            Canceladas
                        </option>
                    </select>

                    <select
                        value={
                            scheduled
                        }
                        onChange={(
                            event,
                        ) => {
                            setScheduled(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todas as datas
                        </option>

                        <option value="overdue">
                            Em atraso
                        </option>

                        <option value="today">
                            Hoje
                        </option>

                        <option value="upcoming">
                            Futuras
                        </option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {activitiesQuery.isLoading ? (
                    <Loading />
                ) : activitiesQuery.isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar as atividades.
                    </div>
                ) : activities.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />

                        <p className="mt-4 text-sm text-slate-500">
                            Nenhuma atividade encontrada.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {activities.map(
                            (
                                activity,
                            ) => (
                                <div
                                    key={
                                        activity.id
                                    }
                                    className="flex flex-col justify-between gap-4 px-5 py-4 lg:flex-row lg:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <ActivityStatus
                                                status={
                                                    activity.status
                                                }
                                            />

                                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                {activityTypeLabel(
                                                    activity.type,
                                                )}
                                            </span>
                                        </div>

                                        <div className="mt-2 font-semibold text-slate-900">
                                            {
                                                activity.subject
                                            }
                                        </div>

                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                            {activity.lead && (
                                                <Link
                                                    to={`/backoffice/crm/leads/${activity.lead.id}`}
                                                    className="font-medium text-indigo-600 hover:text-indigo-700"
                                                >
                                                    {
                                                        activity
                                                            .lead
                                                            .company_name
                                                    }
                                                </Link>
                                            )}

                                            <span>
                                                {activity.scheduled_at
                                                    ? formatDateTime(
                                                          activity.scheduled_at,
                                                      )
                                                    : formatDateTime(
                                                          activity.created_at,
                                                      )}
                                            </span>
                                        </div>
                                    </div>

                                    {activity.status ===
                                        "planned" && (
                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                disabled={
                                                    completeMutation.isPending
                                                }
                                                onClick={() =>
                                                    completeMutation.mutate(
                                                        activity.id,
                                                    )
                                                }
                                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-semibold text-emerald-700"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Concluir
                                            </button>

                                            <button
                                                type="button"
                                                disabled={
                                                    cancelMutation.isPending
                                                }
                                                onClick={() =>
                                                    cancelMutation.mutate(
                                                        activity.id,
                                                    )
                                                }
                                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-semibold text-red-700"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ),
                        )}
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

function ActivityStatus({
    status,
}: {
    status: BackofficeCrmActivityStatus;
}) {
    const config = {
        planned: {
            label: "Planeada",
            className:
                "bg-amber-50 text-amber-700",
        },

        completed: {
            label: "Concluída",
            className:
                "bg-emerald-50 text-emerald-700",
        },

        canceled: {
            label: "Cancelada",
            className:
                "bg-red-50 text-red-700",
        },
    }[status];

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
            {config.label}
        </span>
    );
}

function activityTypeLabel(
    type: BackofficeCrmActivityType,
): string {
    return (
        activityTypes.find(
            (item) =>
                item.value ===
                type,
        )?.label ?? type
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

const activityTypes: {
    value: BackofficeCrmActivityType;
    label: string;
}[] = [
    {
        value: "note",
        label: "Nota",
    },
    {
        value: "call",
        label: "Chamada",
    },
    {
        value: "email",
        label: "Email",
    },
    {
        value: "whatsapp",
        label: "WhatsApp",
    },
    {
        value: "meeting",
        label: "Reunião",
    },
    {
        value: "demo",
        label: "Demonstração",
    },
    {
        value: "proposal",
        label: "Proposta",
    },
    {
        value: "task",
        label: "Tarefa",
    },
    {
        value: "follow_up",
        label: "Follow-up",
    },
];

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500";
