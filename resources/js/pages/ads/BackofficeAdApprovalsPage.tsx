import {
    LoaderCircle,
    ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import AdStatusBadge from "../../components/ads/AdStatusBadge";
import api from "../../lib/api";
import type { AdCampaignSummary } from "../../types/backofficeAds";

export default function BackofficeAdApprovalsPage() {
    const query = useQuery({
        queryKey: [
            "backoffice",
            "ads",
            "approvals",
        ],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/campaigns",
                    {
                        params: {
                            statuses: [
                                "submitted",
                                "in_review",
                            ],
                            per_page: 100,
                        },
                    },
                )
            ).data as {
                data: AdCampaignSummary[];
            },
    });

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-950">
                    Aprovações
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Campanhas aguardando análise do
                    FrotaPro.
                </p>
            </div>

            {query.isLoading ? (
                <div className="flex min-h-64 items-center justify-center">
                    <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                </div>
            ) : query.data?.data.length ===
              0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                    <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />

                    <h3 className="mt-4 font-semibold text-slate-900">
                        Nenhuma campanha pendente
                    </h3>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {query.data?.data.map(
                        (campaign) => (
                            <Link
                                key={campaign.id}
                                to={`/backoffice/ads/campanhas/${campaign.id}`}
                                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            {
                                                campaign.name
                                            }
                                        </div>

                                        <div className="mt-1 text-sm text-slate-500">
                                            {
                                                campaign
                                                    .advertiser
                                                    ?.name
                                            }
                                        </div>
                                    </div>

                                    <AdStatusBadge
                                        status={
                                            campaign.status
                                        }
                                    />
                                </div>

                                <div className="mt-4 text-sm text-slate-500">
                                    {campaign.title}
                                </div>
                            </Link>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
