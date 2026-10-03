import type {
    BackofficeCrmStage,
} from "../types/backofficeCrmCommercial";

interface CrmStageBadgeProps {
    stage:
        | BackofficeCrmStage
        | null
        | undefined;

    compact?: boolean;
}

export default function CrmStageBadge({
    stage,
    compact = false,
}: CrmStageBadgeProps) {
    if (!stage) {
        return (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                Sem etapa
            </span>
        );
    }

    return (
        <span
            className={[
                "inline-flex items-center rounded-full font-semibold",
                compact
                    ? "px-2 py-0.5 text-[11px]"
                    : "px-2.5 py-1 text-xs",
                stageClass(
                    stage.color,
                    stage.category,
                ),
            ].join(" ")}
        >
            {stage.name}
        </span>
    );
}

function stageClass(
    color: string | null,
    category: string,
): string {
    const classes: Record<
        string,
        string
    > = {
        slate:
            "bg-slate-100 text-slate-700",
        sky:
            "bg-sky-50 text-sky-700",
        blue:
            "bg-blue-50 text-blue-700",
        indigo:
            "bg-indigo-50 text-indigo-700",
        violet:
            "bg-violet-50 text-violet-700",
        purple:
            "bg-purple-50 text-purple-700",
        amber:
            "bg-amber-50 text-amber-700",
        emerald:
            "bg-emerald-50 text-emerald-700",
        rose:
            "bg-rose-50 text-rose-700",
        red:
            "bg-red-50 text-red-700",
        orange:
            "bg-orange-50 text-orange-700",
    };

    if (
        color &&
        classes[color]
    ) {
        return classes[color];
    }

    if (category === "won") {
        return "bg-emerald-50 text-emerald-700";
    }

    if (category === "lost") {
        return "bg-red-50 text-red-700";
    }

    return "bg-indigo-50 text-indigo-700";
}
