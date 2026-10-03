import type {
    BackofficeCrmLeadPriority,
} from "../types/backofficeCrmCommercial";

interface CrmPriorityBadgeProps {
    priority:
        BackofficeCrmLeadPriority;
}

export default function CrmPriorityBadge({
    priority,
}: CrmPriorityBadgeProps) {
    const config = priorityConfig(
        priority,
    );

    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                config.className,
            ].join(" ")}
        >
            {config.label}
        </span>
    );
}

function priorityConfig(
    priority: BackofficeCrmLeadPriority,
): {
    label: string;
    className: string;
} {
    switch (priority) {
        case "low":
            return {
                label: "Baixa",
                className:
                    "bg-slate-100 text-slate-600",
            };

        case "high":
            return {
                label: "Alta",
                className:
                    "bg-amber-50 text-amber-700",
            };

        case "urgent":
            return {
                label: "Urgente",
                className:
                    "bg-red-50 text-red-700",
            };

        default:
            return {
                label: "Normal",
                className:
                    "bg-indigo-50 text-indigo-700",
            };
    }
}
