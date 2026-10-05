import {
    Boxes,
    LoaderCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api from "../../lib/api";
import type {
    AdCategory,
    AdPriceRule,
    AdZone,
} from "../../types/backofficeAds";

export default function BackofficeAdInventoryPage() {
    const categoriesQuery = useQuery({
        queryKey: [
            "backoffice",
            "ads",
            "categories",
        ],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/categories",
                )
            ).data as {
                data: AdCategory[];
            },
    });

    const zonesQuery = useQuery({
        queryKey: [
            "backoffice",
            "ads",
            "zones",
        ],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/zones",
                )
            ).data as {
                data: AdZone[];
            },
    });

    const pricesQuery = useQuery({
        queryKey: [
            "backoffice",
            "ads",
            "prices",
        ],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/price-rules",
                )
            ).data as {
                data: AdPriceRule[];
            },
    });

    if (
        categoriesQuery.isLoading ||
        zonesQuery.isLoading ||
        pricesQuery.isLoading
    ) {
        return (
            <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-950">
                    Inventário publicitário
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Categorias, zonas de exibição e
                    regras comerciais.
                </p>
            </div>

            <Panel title="Zonas publicitárias">
                <div className="grid gap-3 md:grid-cols-2">
                    {zonesQuery.data?.data.map(
                        (zone) => (
                            <div
                                key={zone.id}
                                className="rounded-xl border border-slate-200 p-4"
                            >
                                <div className="font-semibold text-slate-900">
                                    {zone.name}
                                </div>

                                <div className="mt-1 font-mono text-xs text-slate-400">
                                    {zone.code}
                                </div>

                                <div className="mt-3 text-sm text-slate-500">
                                    Canal:{" "}
                                    {
                                        zone.channel
                                    }
                                </div>

                                <div className="text-sm text-slate-500">
                                    Reserva SaaS:{" "}
                                    {
                                        zone.saas_reserved_percent
                                    }
                                    %
                                </div>
                            </div>
                        ),
                    )}
                </div>
            </Panel>

            <Panel title="Categorias">
                <div className="flex flex-wrap gap-2">
                    {categoriesQuery.data?.data.map(
                        (category) => (
                            <span
                                key={
                                    category.id
                                }
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                            >
                                {
                                    category.name
                                }
                            </span>
                        ),
                    )}
                </div>
            </Panel>

            <Panel title="Regras de preço">
                {pricesQuery.data?.data.length ===
                0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                        Ainda não existem regras de
                        preço. Elas poderão ser
                        cadastradas pelo endpoint do
                        módulo.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {pricesQuery.data?.data.map(
                            (rule) => (
                                <div
                                    key={
                                        rule.id
                                    }
                                    className="flex items-center justify-between py-3"
                                >
                                    <div>
                                        <div className="font-semibold text-slate-800">
                                            {
                                                rule.name
                                            }
                                        </div>

                                        <div className="text-xs text-slate-400">
                                            {
                                                rule.duration_days
                                            }{" "}
                                            dias
                                        </div>
                                    </div>

                                    <div className="font-semibold text-indigo-600">
                                        {Number(
                                            rule.price,
                                        ).toFixed(
                                            2,
                                        )}{" "}
                                        {
                                            rule.currency
                                        }
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </Panel>
        </div>
    );
}

function Panel({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-indigo-600" />

                <h3 className="font-semibold text-slate-900">
                    {title}
                </h3>
            </div>

            {children}
        </section>
    );
}
