import {
    LoaderCircle,
    ReceiptText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api from "../../lib/api";
import type { AdOrder } from "../../types/backofficeAds";

export default function BackofficeAdOrdersPage() {
    const query = useQuery({
        queryKey: [
            "backoffice",
            "ads",
            "orders",
        ],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/orders",
                )
            ).data as {
                data: AdOrder[];
            },
    });

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-950">
                    Pagamentos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Pedidos de campanhas publicitárias e
                    respetivos pagamentos.
                </p>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {query.isLoading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : query.data?.data.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />

                        <p className="mt-4 text-sm text-slate-500">
                            Nenhum pedido publicitário
                            criado.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {query.data?.data.map(
                            (order) => (
                                <div
                                    key={
                                        order.id
                                    }
                                    className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
                                >
                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            {
                                                order.number
                                            }
                                        </div>

                                        <div className="mt-1 text-sm text-slate-500">
                                            {
                                                order
                                                    .campaign
                                                    .name
                                            }
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-semibold text-slate-900">
                                            {order.total.toFixed(
                                                2,
                                            )}{" "}
                                            {
                                                order.currency
                                            }
                                        </div>

                                        <div className="text-xs text-slate-400">
                                            {
                                                order.status
                                            }
                                        </div>
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
