import type { AdCampaignStatus } from "../../types/backofficeAds";

const labels: Record<AdCampaignStatus, string> = {
    draft: "Rascunho",
    submitted: "Submetida",
    in_review: "Em análise",
    changes_requested: "Requer alterações",
    rejected: "Rejeitada",
    approved: "Aprovada",
    awaiting_payment: "Aguarda pagamento",
    scheduled: "Agendada",
    active: "Ativa",
    paused: "Pausada",
    completed: "Concluída",
    canceled: "Cancelada",
    suspended: "Suspensa",
};

const classes: Record<AdCampaignStatus, string> = {
    draft: "bg-slate-100 text-slate-700",
    submitted: "bg-sky-50 text-sky-700",
    in_review: "bg-indigo-50 text-indigo-700",
    changes_requested: "bg-amber-50 text-amber-700",
    rejected: "bg-red-50 text-red-700",
    approved: "bg-emerald-50 text-emerald-700",
    awaiting_payment: "bg-orange-50 text-orange-700",
    scheduled: "bg-violet-50 text-violet-700",
    active: "bg-emerald-50 text-emerald-700",
    paused: "bg-yellow-50 text-yellow-700",
    completed: "bg-slate-100 text-slate-600",
    canceled: "bg-slate-100 text-slate-500",
    suspended: "bg-rose-50 text-rose-700",
};

export default function AdStatusBadge({
    status,
}: {
    status: AdCampaignStatus;
}) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status]}`}
        >
            {labels[status]}
        </span>
    );
}
