import axios from "axios";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    BadgePercent,
    LoaderCircle,
    ShieldCheck,
} from "lucide-react";

import api from "../../lib/api";

type Scope = "saas_subscription" | "ad_order";

type Quote = {
    code: string;
    subtotal: string;
    discount: string;
    total: string;
    currency: string;
    note: string;
};

export default function CouponCheckoutField({
    scope,
    sourceId,
    code,
    onCodeChange,
}: {
    scope: Scope;
    sourceId: string;
    code: string;
    onCodeChange: (code: string) => void;
}) {
    const [verified, setVerified] = useState<Quote | null>(null);

    const status = useQuery({
        queryKey: ["coupon-checkout", "status"],

        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/faturacao/cupoes/estado",
                )
            ).data.data as { enabled: boolean },

        staleTime: 30_000,
    });

    const quote = useMutation({
        mutationFn: async () =>
            (
                await api.post(
                    "/api/backoffice/faturacao/cupoes/cotacao",
                    {
                        scope,
                        source_id: sourceId,
                        coupon_code: code.trim().toUpperCase(),
                    },
                )
            ).data.data as Quote,

        onSuccess: setVerified,
    });

    useEffect(() => {
        setVerified(null);
        quote.reset();

        // Invalidar a cotação quando a compra ou código mudar.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope, sourceId, code]);

    const enabled = status.data?.enabled === true;

    function money(value: string, currency: string): string {
        const number = Number(value);

        return new Intl.NumberFormat("pt-PT", {
            style: "currency",
            currency,
        }).format(Number.isFinite(number) ? number : 0);
    }

    const error = axios.isAxiosError(quote.error)
        ? quote.error.response?.data?.errors?.coupon_code?.[0] ??
          quote.error.response?.data?.message
        : null;

    return (
        <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BadgePercent className="h-4 w-4 text-indigo-600" />
                Cupão promocional
            </div>

            {status.isError ? (
                <p className="text-sm text-red-700">
                    Não foi possível confirmar o estado dos cupões.
                </p>
            ) : !enabled ? (
                <p className="text-xs text-amber-800">
                    A aplicação de cupões aos pagamentos está desativada.
                    A gestão de campanhas continua disponível.
                </p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        <input
                            aria-label="Código do cupão"
                            type="text"
                            maxLength={64}
                            autoComplete="off"
                            placeholder="Introduzir código"
                            value={code}
                            onChange={(e) =>
                                onCodeChange(
                                    e.target.value.toUpperCase(),
                                )
                            }
                            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                        />

                        <button
                            type="button"
                            disabled={
                                quote.isPending ||
                                !/^[A-Z0-9_-]{2,64}$/.test(code.trim())
                            }
                            onClick={() => quote.mutate()}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 disabled:opacity-50"
                        >
                            {quote.isPending && (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            )}
                            Validar desconto
                        </button>
                    </div>

                    {quote.isError && (
                        <p role="alert" className="text-xs text-red-700">
                            {error || "Cupão indisponível."}
                        </p>
                    )}

                    {verified && (
                        <div className="space-y-1 rounded-lg border border-emerald-200 bg-white p-3 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <strong>
                                    {money(
                                        verified.subtotal,
                                        verified.currency,
                                    )}
                                </strong>
                            </div>

                            <div className="flex justify-between text-emerald-700">
                                <span>Desconto</span>
                                <strong>
                                    -
                                    {money(
                                        verified.discount,
                                        verified.currency,
                                    )}
                                </strong>
                            </div>

                            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
                                <span>Total previsto</span>
                                <span>
                                    {money(
                                        verified.total,
                                        verified.currency,
                                    )}
                                </span>
                            </div>

                            <p className="pt-1 text-xs text-slate-500">
                                {verified.note}
                            </p>
                        </div>
                    )}

                    <p className="flex gap-1 text-xs text-slate-500">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        O servidor volta a validar o preço e a
                        elegibilidade antes da emissão. Não é possível
                        aplicar desconto a referências já emitidas.
                    </p>
                </>
            )}
        </div>
    );
}