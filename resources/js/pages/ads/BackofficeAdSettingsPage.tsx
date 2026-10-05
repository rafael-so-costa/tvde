import {
    LoaderCircle,
    Save,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import api from "../../lib/api";
import type { AdSettings } from "../../types/backofficeAds";

export default function BackofficeAdSettingsPage() {
    const queryClient =
        useQueryClient();

    const query = useQuery({
        queryKey: [
            "backoffice",
            "ads",
            "settings",
        ],
        queryFn: async () =>
            (
                await api.get(
                    "/api/backoffice/ads/settings",
                )
            ).data.data as AdSettings,
    });

    const [form, setForm] =
        useState<AdSettings | null>(
            null,
        );

    useEffect(() => {
        if (query.data) {
            setForm(query.data);
        }
    }, [query.data]);

    const mutation = useMutation({
        mutationFn: async () =>
            api.patch(
                "/api/backoffice/ads/settings",
                form,
            ),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: [
                    "backoffice",
                    "ads",
                    "settings",
                ],
            });
        },
    });

    if (!form) {
        return (
            <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
        );
    }

    const toggle = (
        field: keyof AdSettings,
    ) =>
        setForm({
            ...form,
            [field]: !form[
                field
            ],
        });

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-950">
                    Configurações
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Regras globais do FrotaPro Ads.
                </p>
            </div>

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
                <Switch
                    label="Campanhas internas gratuitas"
                    checked={
                        form.tenant_internal_free_enabled
                    }
                    onChange={() =>
                        toggle(
                            "tenant_internal_free_enabled",
                        )
                    }
                />

                <Switch
                    label="Campanhas internas exigem aprovação"
                    checked={
                        form.tenant_internal_requires_approval
                    }
                    onChange={() =>
                        toggle(
                            "tenant_internal_requires_approval",
                        )
                    }
                />

                <Switch
                    label="Permitir parceiros do tenant"
                    checked={
                        form.tenant_internal_allow_partners
                    }
                    onChange={() =>
                        toggle(
                            "tenant_internal_allow_partners",
                        )
                    }
                />

                <Switch
                    label="Marketplace público ativo"
                    checked={
                        form.public_marketplace_enabled
                    }
                    onChange={() =>
                        toggle(
                            "public_marketplace_enabled",
                        )
                    }
                />

                <Switch
                    label="Publicidade externa no painel do gestor"
                    checked={
                        form.manager_panel_external_ads_enabled
                    }
                    onChange={() =>
                        toggle(
                            "manager_panel_external_ads_enabled",
                        )
                    }
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <NumberInput
                        label="Máximo de campanhas internas ativas"
                        value={
                            form.tenant_internal_max_active
                        }
                        onChange={(value) =>
                            setForm({
                                ...form,
                                tenant_internal_max_active:
                                    value,
                            })
                        }
                    />

                    <NumberInput
                        label="Duração máxima gratuita (dias)"
                        value={
                            form.tenant_internal_max_days
                        }
                        onChange={(value) =>
                            setForm({
                                ...form,
                                tenant_internal_max_days:
                                    value,
                            })
                        }
                    />

                    <NumberInput
                        label="Reserva de inventário SaaS (%)"
                        value={
                            form.saas_inventory_reserved_percent
                        }
                        onChange={(value) =>
                            setForm({
                                ...form,
                                saas_inventory_reserved_percent:
                                    value,
                            })
                        }
                    />

                    <NumberInput
                        label="Frequency cap diário"
                        value={
                            form.default_frequency_cap_daily
                        }
                        onChange={(value) =>
                            setForm({
                                ...form,
                                default_frequency_cap_daily:
                                    value,
                            })
                        }
                    />
                </div>

                <button
                    type="button"
                    onClick={() =>
                        mutation.mutate()
                    }
                    disabled={
                        mutation.isPending
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    Guardar configurações
                </button>
            </section>
        </div>
    );
}

function Switch({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
            <span className="font-medium text-slate-700">
                {label}
            </span>

            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="h-5 w-5"
            />
        </label>
    );
}

function NumberInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <label>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
            </span>

            <input
                type="number"
                value={value}
                onChange={(event) =>
                    onChange(
                        Number(
                            event.target.value,
                        ),
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3"
            />
        </label>
    );
}
