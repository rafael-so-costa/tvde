import {
    Building2,
    LoaderCircle,
    Plus,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import api from "../../lib/api";
import type { AdAdvertiser } from "../../types/backofficeAds";

export default function BackofficeAdAdvertisersPage() {
    const queryClient =
        useQueryClient();

    const [name, setName] =
        useState("");
    const [type, setType] =
        useState<
            "saas" | "tenant" | "external"
        >("external");

    const query = useQuery({
        queryKey: [
            "backoffice",
            "ads",
            "advertisers",
        ],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/advertisers",
                )
            ).data as {
                data: AdAdvertiser[];
            },
    });

    const createMutation =
        useMutation({
            mutationFn: async () =>
                api.post(
                    "/api/backoffice/ads/advertisers",
                    {
                        type,
                        name,
                        status: "active",
                        tenant_id: null,
                        legal_name: null,
                        nif: null,
                        email: null,
                        phone: null,
                        website: null,
                        metadata: null,
                    },
                ),

            onSuccess: async () => {
                setName("");

                await queryClient.invalidateQueries({
                    queryKey: [
                        "backoffice",
                        "ads",
                        "advertisers",
                    ],
                });
            },
        });

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-950">
                    Anunciantes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Empresas, tenants, parceiros e o
                    próprio FrotaPro.
                </p>
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    if (name.trim()) {
                        createMutation.mutate();
                    }
                }}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_200px_auto]"
            >
                <input
                    value={name}
                    onChange={(event) =>
                        setName(
                            event.target.value,
                        )
                    }
                    placeholder="Nome do anunciante"
                    className="h-11 rounded-xl border border-slate-200 px-3"
                />

                <select
                    value={type}
                    onChange={(event) =>
                        setType(
                            event.target
                                .value as typeof type,
                        )
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3"
                >
                    <option value="saas">
                        FrotaPro
                    </option>
                    <option value="tenant">
                        Gestor de frota
                    </option>
                    <option value="external">
                        Parceiro externo
                    </option>
                </select>

                <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" />
                    Adicionar
                </button>
            </form>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {query.isLoading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {query.data?.data.map(
                            (advertiser) => (
                                <div
                                    key={
                                        advertiser.id
                                    }
                                    className="flex items-center justify-between gap-4 px-5 py-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                            <Building2 className="h-5 w-5" />
                                        </div>

                                        <div>
                                            <div className="font-semibold text-slate-900">
                                                {
                                                    advertiser.name
                                                }
                                            </div>

                                            <div className="text-xs text-slate-400">
                                                {
                                                    advertiser.type
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-sm text-slate-500">
                                        {advertiser.campaigns_count ??
                                            0}{" "}
                                        campanhas
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
