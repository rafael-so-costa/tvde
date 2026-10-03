import {
    Building2,
    CalendarClock,
    Mail,
    MapPin,
    Phone,
    UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import CrmPriorityBadge from "./CrmPriorityBadge";
import CrmStageBadge from "./CrmStageBadge";

import type {
    BackofficeCrmLead,
} from "../types/backofficeCrmCommercial";

interface CrmLeadCardProps {
    lead: BackofficeCrmLead;
    showStage?: boolean;
}

export default function CrmLeadCard({
    lead,
    showStage = false,
}: CrmLeadCardProps) {
    return (
        <Link
            to={`/backoffice/crm/leads/${lead.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-indigo-500" />

                        <h3 className="truncate font-semibold text-slate-900">
                            {lead.company_name}
                        </h3>
                    </div>

                    {lead.nif && (
                        <div className="mt-1 text-xs text-slate-400">
                            NIF {lead.nif}
                        </div>
                    )}
                </div>

                <CrmPriorityBadge
                    priority={
                        lead.priority
                    }
                />
            </div>

            {showStage && (
                <div className="mt-3">
                    <CrmStageBadge
                        stage={
                            lead.stage
                        }
                        compact
                    />
                </div>
            )}

            <div className="mt-4 space-y-2 text-sm text-slate-500">
                {lead.contact_name && (
                    <InfoRow
                        icon={
                            UserRound
                        }
                    >
                        {
                            lead.contact_name
                        }
                    </InfoRow>
                )}

                {lead.phone && (
                    <InfoRow
                        icon={Phone}
                    >
                        {lead.phone}
                    </InfoRow>
                )}

                {lead.email && (
                    <InfoRow
                        icon={Mail}
                    >
                        {lead.email}
                    </InfoRow>
                )}

                {(
                    lead.municipality ||
                    lead.district
                ) && (
                    <InfoRow
                        icon={MapPin}
                    >
                        {[
                            lead.municipality,
                            lead.district,
                        ]
                            .filter(
                                Boolean,
                            )
                            .join(
                                ", ",
                            )}
                    </InfoRow>
                )}

                {lead.next_follow_up_at && (
                    <InfoRow
                        icon={
                            CalendarClock
                        }
                    >
                        Follow-up{" "}
                        {formatDateTime(
                            lead.next_follow_up_at,
                        )}
                    </InfoRow>
                )}
            </div>

            {lead.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {lead.tags
                        .slice(
                            0,
                            4,
                        )
                        .map(
                            (tag) => (
                                <span
                                    key={
                                        tag.id
                                    }
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                >
                                    {
                                        tag.name
                                    }
                                </span>
                            ),
                        )}

                    {lead.tags.length >
                        4 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            +
                            {lead
                                .tags
                                .length -
                                4}
                        </span>
                    )}
                </div>
            )}

            {lead.converted_tenant && (
                <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    Cliente FrotaPRO
                </div>
            )}
        </Link>
    );
}

function InfoRow({
    icon: Icon,
    children,
}: {
    icon: typeof Phone;
    children:
        React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />

            <span className="truncate">
                {children}
            </span>
        </div>
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
