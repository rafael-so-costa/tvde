import {
    LoaderCircle,
    Plus,
    Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";

import AdStatusBadge from "../../components/ads/AdStatusBadge";
import api from "../../lib/api";
import type {
    AdCampaignStatus,
    AdCampaignSummary,
} from "../../types/backofficeAds";

interface Response {
    data: AdCampaignSummary[];
    meta: {
        total: number;
    };
}

export default function BackofficeAdCampaignsPage() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const query = useQuery({
        queryKey: [
            "backoffice",
            "ads",
            "campaigns",
            search,
            status,
        ],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/campaigns",
                    {
                        params: {
                            search:
                                search || undefined,
                            status:
                                status || undefined,
                        },
                    },
                )
            ).data as Response,
    });

    return (
        <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-950">
                        Campanhas
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Todas as campanhas comerciais,
                        institucionais e internas.
                    </p>
                </div>

                <Link
                    to="/backoffice/ads/campanhas/nova"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" />
                    Nova campanha
                </Link>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
                <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />

                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                        placeholder="Pesquisar campanha ou anunciante..."
                        className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3"
                    />
                </div>

                <select
                    value={status}
                    onChange={(event) =>
                        setStatus(
                            event.target.value,
                        )
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3"
                >
                    <option value="">
                        Todos os estados
                    </option>
                    <option value="draft">
                        Rascunho
                    </option>
                    <option value="submitted">
                        Submetida
                    </option>
                    <option value="in_review">
                        Em análise
                    </option>
                    <option value="awaiting_payment">
                        Aguarda pagamento
                    </option>
                    <option value="scheduled">
                        Agendada
                    </option>
                    <option value="active">
                        Ativa
                    </option>
                    <option value="paused">
                        Pausada
                    </option>
                    <option value="completed">
                        Concluída
                    </option>
                </select>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {query.isLoading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">
                                        Campanha
                                    </th>
                                    <th className="px-5 py-3">
                                        Anunciante
                                    </th>
                                    <th className="px-5 py-3">
                                        Estado
                                    </th>
                                    <th className="px-5 py-3">
                                        Valor
                                    </th>
                                    <th className="px-5 py-3">
                                        Período
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {query.data?.data.map(
                                    (campaign) => (
                                        <CampaignRow
                                            key={
                                                campaign.id
                                            }
                                            campaign={
                                                campaign
                                            }
                                        />
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function CampaignRow({
    campaign,
}: {
    campaign: AdCampaignSummary;
}) {
    return (
        <tr className="hover:bg-slate-50">
            <td className="px-5 py-4">
                <Link
                    to={`/backoffice/ads/campanhas/${campaign.id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600"
                >
                    {campaign.name}
                </Link>

                <div className="mt-1 text-xs text-slate-400">
                    {campaign.title}
                </div>
            </td>

            <td className="px-5 py-4 text-sm text-slate-600">
                {campaign.advertiser?.name ??
                    "—"}
            </td>

            <td className="px-5 py-4">
                <AdStatusBadge
                    status={
                        campaign.status as AdCampaignStatus
                    }
                />
            </td>

            <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                {campaign.quoted_price.toFixed(
                    2,
                )}{" "}
                {campaign.currency}
            </td>

            <td className="px-5 py-4 text-sm text-slate-500">
                {formatDate(campaign.start_at)}
                {" → "}
                {formatDate(campaign.end_at)}
            </td>
        </tr>
    );
}

function formatDate(
    value: string | null,
) {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
    ).format(new Date(value));
}
