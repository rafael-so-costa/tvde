import {
    CalendarClock,
    CheckCircle2,
    CircleDot,
    FileText,
    Mail,
    MessageCircle,
    Phone,
    Presentation,
    UsersRound,
    XCircle,
} from "lucide-react";

import type {
    BackofficeCrmActivity,
    BackofficeCrmActivityType,
} from "../types/backofficeCrmCommercial";

interface CrmActivityTimelineProps {
    activities:
        BackofficeCrmActivity[];
}

export default function CrmActivityTimeline({
    activities,
}: CrmActivityTimelineProps) {
    if (activities.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
                <CircleDot className="mx-auto h-8 w-8 text-slate-300" />

                <p className="mt-3 text-sm font-medium text-slate-600">
                    Nenhuma atividade registada.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {activities.map(
                (
                    activity,
                    index,
                ) => {
                    const config =
                        activityConfig(
                            activity.type,
                        );

                    const Icon =
                        config.icon;

                    return (
                        <div
                            key={
                                activity.id
                            }
                            className="relative flex gap-4"
                        >
                            {index !==
                                activities.length -
                                    1 && (
                                <div className="absolute bottom-0 left-5 top-10 w-px bg-slate-200" />
                            )}

                            <div
                                className={[
                                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                    config.className,
                                ].join(
                                    " ",
                                )}
                            >
                                <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1 pb-7">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">
                                                    {
                                                        activity.subject
                                                    }
                                                </h3>

                                                <ActivityStatus
                                                    status={
                                                        activity.status
                                                    }
                                                />
                                            </div>

                                            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                                                {
                                                    config.label
                                                }
                                            </div>
                                        </div>

                                        <div className="text-xs text-slate-400">
                                            {formatDateTime(
                                                activity.completed_at ??
                                                    activity.scheduled_at ??
                                                    activity.created_at,
                                            )}
                                        </div>
                                    </div>

                                    {activity.description && (
                                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                                            {
                                                activity.description
                                            }
                                        </p>
                                    )}

                                    {activity.outcome && (
                                        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                                Resultado
                                            </div>

                                            <div className="mt-1 text-sm text-slate-700">
                                                {
                                                    activity.outcome
                                                }
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                                        {activity.assigned_to && (
                                            <span>
                                                Responsável:{" "}
                                                <strong className="font-medium text-slate-600">
                                                    {
                                                        activity
                                                            .assigned_to
                                                            .name
                                                    }
                                                </strong>
                                            </span>
                                        )}

                                        {activity.created_by && (
                                            <span>
                                                Criado por:{" "}
                                                <strong className="font-medium text-slate-600">
                                                    {
                                                        activity
                                                            .created_by
                                                            .name
                                                    }
                                                </strong>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                },
            )}
        </div>
    );
}

function ActivityStatus({
    status,
}: {
    status: BackofficeCrmActivity["status"];
}) {
    if (
        status ===
        "completed"
    ) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Concluída
            </span>
        );
    }

    if (
        status ===
        "canceled"
    ) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                <XCircle className="h-3 w-3" />
                Cancelada
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            <CalendarClock className="h-3 w-3" />
            Planeada
        </span>
    );
}

function activityConfig(
    type: BackofficeCrmActivityType,
): {
    label: string;
    icon: typeof Phone;
    className: string;
} {
    switch (type) {
        case "call":
            return {
                label: "Chamada",
                icon: Phone,
                className:
                    "bg-blue-50 text-blue-600",
            };

        case "email":
            return {
                label: "Email",
                icon: Mail,
                className:
                    "bg-indigo-50 text-indigo-600",
            };

        case "whatsapp":
            return {
                label: "WhatsApp",
                icon: MessageCircle,
                className:
                    "bg-emerald-50 text-emerald-600",
            };

        case "meeting":
            return {
                label: "Reunião",
                icon: UsersRound,
                className:
                    "bg-violet-50 text-violet-600",
            };

        case "demo":
            return {
                label: "Demonstração",
                icon: Presentation,
                className:
                    "bg-purple-50 text-purple-600",
            };

        case "proposal":
            return {
                label: "Proposta",
                icon: FileText,
                className:
                    "bg-amber-50 text-amber-600",
            };

        case "task":
            return {
                label: "Tarefa",
                icon: CheckCircle2,
                className:
                    "bg-slate-100 text-slate-600",
            };

        case "follow_up":
            return {
                label: "Follow-up",
                icon: CalendarClock,
                className:
                    "bg-orange-50 text-orange-600",
            };

        default:
            return {
                label: "Nota",
                icon: CircleDot,
                className:
                    "bg-slate-100 text-slate-600",
            };
    }
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
