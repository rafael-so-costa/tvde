import {
    Eye,
    MousePointerClick,
    Percent,
    UsersRound,
} from "lucide-react";

import type {
    AdMetrics,
} from "../../types/backofficeAds";

export default function AdCampaignMetrics({
    metrics,
}: {
    metrics: AdMetrics;
}) {
    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-slate-900">
                    Performance
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Métricas acumuladas da campanha.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                    label="Impressões"
                    value={
                        metrics.impressions
                    }
                    icon={Eye}
                />

                <Metric
                    label="Visualizações válidas"
                    value={
                        metrics.viewable_impressions
                    }
                    icon={Eye}
                />

                <Metric
                    label="Alcance"
                    value={
                        metrics.unique_impressions
                    }
                    icon={UsersRound}
                />

                <Metric
                    label="Cliques"
                    value={
                        metrics.clicks
                    }
                    icon={MousePointerClick}
                />

                <Metric
                    label="Cliques únicos"
                    value={
                        metrics.unique_clicks
                    }
                    icon={MousePointerClick}
                />

                <Metric
                    label="CTR"
                    value={`${metrics.ctr.toFixed(
                        2,
                    )}%`}
                    icon={Percent}
                />

                <Metric
                    label="Viewability"
                    value={`${(
                        metrics.viewability_rate ??
                        0
                    ).toFixed(2)}%`}
                    icon={Percent}
                />
            </div>
        </section>
    );
}

function Metric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    icon: typeof Eye;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
            </div>

            <div className="mt-4 text-2xl font-bold text-slate-950">
                {typeof value ===
                "number"
                    ? value.toLocaleString(
                          "pt-PT",
                      )
                    : value}
            </div>

            <div className="mt-1 text-sm text-slate-500">
                {label}
            </div>
        </div>
    );
}
