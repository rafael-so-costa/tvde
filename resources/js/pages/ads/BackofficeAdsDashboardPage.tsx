import {
    BadgeEuro,
    Eye,
    LoaderCircle,
    Megaphone,
    MousePointerClick,
    ShieldCheck,
    WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import AdStatusBadge from "../../components/ads/AdStatusBadge";
import api from "../../lib/api";
import type { AdCampaignSummary } from "../../types/backofficeAds";

interface DashboardResponse {
    data: {
        metrics: {
            campaigns_total: number;
            campaigns_active: number;
            pending_approval: number;
            awaiting_payment: number;
            advertisers_active: number;
            revenue_month: number;
            impressions_month: number;
            viewable_impressions_month: number;
            clicks_month: number;
            ctr_month: number;
        };
        recent_campaigns: AdCampaignSummary[];
    };
}

export default function BackofficeAdsDashboardPage() {
    const query = useQuery({
        queryKey: ["backoffice", "ads", "dashboard"],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/dashboard",
                )
            ).data as DashboardResponse,
    });

    if (query.isLoading) {
        return (
            <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!query.data) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                Não foi possível carregar o FrotaPro Ads.
            </div>
        );
    }

    const { metrics, recent_campaigns } =
        query.data.data;

    return (
        <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                    label="Campanhas ativas"
                    value={metrics.campaigns_active}
                    icon={Megaphone}
                />

                <Metric
                    label="Aguardam aprovação"
                    value={metrics.pending_approval}
                    icon={ShieldCheck}
                />

                <Metric
                    label="Aguardam pagamento"
                    value={metrics.awaiting_payment}
                    icon={WalletCards}
                />

                <Metric
                    label="Receita do mês"
                    value={`${metrics.revenue_month.toFixed(2)} €`}
                    icon={BadgeEuro}
                />

                <Metric
                    label="Impressões"
                    value={metrics.impressions_month}
                    icon={Eye}
                />

                <Metric
                    label="Cliques"
                    value={metrics.clicks_month}
                    icon={MousePointerClick}
                />

                <Metric
                    label="CTR"
                    value={`${metrics.ctr_month.toFixed(2)}%`}
                    icon={MousePointerClick}
                />

                <Metric
                    label="Anunciantes ativos"
                    value={metrics.advertisers_active}
                    icon={Megaphone}
                />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Campanhas recentes
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Últimas campanhas criadas na plataforma.
                        </p>
                    </div>

                    <Link
                        to="/backoffice/ads/campanhas"
                        className="text-sm font-semibold text-indigo-600"
                    >
                        Ver todas
                    </Link>
                </div>

                <div className="divide-y divide-slate-100">
                    {recent_campaigns.map(
                        (campaign) => (
                            <Link
                                key={campaign.id}
                                to={`/backoffice/ads/campanhas/${campaign.id}`}
                                className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <div className="font-semibold text-slate-900">
                                        {campaign.name}
                                    </div>

                                    <div className="mt-1 text-sm text-slate-500">
                                        {campaign.advertiser?.name ??
                                            "Sem anunciante"}
                                    </div>
                                </div>

                                <AdStatusBadge
                                    status={campaign.status}
                                />
                            </Link>
                        ),
                    )}
                </div>
            </section>
        </div>
    );
}

function Metric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    icon: typeof Megaphone;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
            </div>

            <div className="mt-4 text-2xl font-bold text-slate-950">
                {value}
            </div>

            <div className="mt-1 text-sm text-slate-500">
                {label}
            </div>
        </div>
    );
}
