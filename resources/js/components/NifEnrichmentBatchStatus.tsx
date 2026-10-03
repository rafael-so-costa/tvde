import {
    AlertTriangle,
    Ban,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    XCircle,
} from "lucide-react";

import type {
    BackofficeNifBatchStatus,
} from "../types/backofficeCrmCommercial";

interface NifEnrichmentBatchStatusProps {
    status:
        BackofficeNifBatchStatus;

    compact?: boolean;
}

export default function NifEnrichmentBatchStatus({
    status,
    compact = false,
}: NifEnrichmentBatchStatusProps) {
    const config =
        statusConfig(
            status,
        );

    const Icon =
        config.icon;

    return (
        <span
            className={[
                "inline-flex items-center rounded-full font-semibold",
                compact
                    ? "gap-1 px-2 py-0.5 text-[11px]"
                    : "gap-1.5 px-2.5 py-1 text-xs",
                config.className,
            ].join(" ")}
        >
            <Icon
                className={[
                    compact
                        ? "h-3 w-3"
                        : "h-3.5 w-3.5",
                    status ===
                    "processing"
                        ? "animate-spin"
                        : "",
                ].join(
                    " ",
                )}
            />

            {config.label}
        </span>
    );
}

function statusConfig(
    status: BackofficeNifBatchStatus,
): {
    label: string;
    icon: typeof Clock3;
    className: string;
} {
    switch (status) {
        case "processing":
            return {
                label: "Em processamento",
                icon: LoaderCircle,
                className:
                    "bg-indigo-50 text-indigo-700",
            };

        case "completed":
            return {
                label: "Concluído",
                icon: CheckCircle2,
                className:
                    "bg-emerald-50 text-emerald-700",
            };

        case "partial":
            return {
                label: "Parcial",
                icon: AlertTriangle,
                className:
                    "bg-amber-50 text-amber-700",
            };

        case "error":
            return {
                label: "Erro",
                icon: XCircle,
                className:
                    "bg-red-50 text-red-700",
            };

        case "canceled":
            return {
                label: "Cancelado",
                icon: Ban,
                className:
                    "bg-slate-100 text-slate-600",
            };

        default:
            return {
                label: "Pendente",
                icon: Clock3,
                className:
                    "bg-sky-50 text-sky-700",
            };
    }
}
