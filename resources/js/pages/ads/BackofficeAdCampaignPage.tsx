import { Check, LoaderCircle, Save, Send } from "lucide-react";
import AdCampaignMetrics from "../../components/ads/AdCampaignMetrics";
import AdCreativeManager from "../../components/ads/AdCreativeManager";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AdStatusBadge from "../../components/ads/AdStatusBadge";
import api from "../../lib/api";
import type {
    AdAdvertiser,
    AdCampaignDetail,
    AdCategory,
    AdZone,
} from "../../types/backofficeAds";

const defaultForm = {
    advertiser_id: "",
    tenant_id: null as string | null,
    category_id: null as string | null,
    source: "saas",
    kind: "house",
    name: "",
    title: "",
    description: "",
    pricing_model: "fixed_period",
    quoted_price: 0,
    currency: "EUR",
    payment_required: false,
    priority: 90,
    weight: 1,
    max_impressions: null as number | null,
    max_clicks: null as number | null,
    frequency_cap_daily: 3,
    start_at: "",
    end_at: "",
    admin_notes: "",
    metadata: null,
    channels: ["driver_portal"],
    audiences: ["driver"],
    zone_ids: [] as string[],
    locations: [] as Array<{
        country_code: string;
        district: string | null;
        municipality: string | null;
    }>,
};

export default function BackofficeAdCampaignPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const creating = !id;

    const [form, setForm] = useState(defaultForm);

    const detailQuery = useQuery({
        queryKey: ["backoffice", "ads", "campaign", id],
        enabled: !creating,
        queryFn: async () =>
            (await api.get(`/api/backoffice/ads/campaigns/${id}`)).data
                .data as AdCampaignDetail,
    });

    const advertisersQuery = useQuery({
        queryKey: ["backoffice", "ads", "advertisers"],
        queryFn: async () =>
            (await api.get("/api/backoffice/ads/advertisers")).data
                .data as AdAdvertiser[],
    });

    const categoriesQuery = useQuery({
        queryKey: ["backoffice", "ads", "categories"],
        queryFn: async () =>
            (await api.get("/api/backoffice/ads/categories")).data
                .data as AdCategory[],
    });

    const zonesQuery = useQuery({
        queryKey: ["backoffice", "ads", "zones"],
        queryFn: async () =>
            (await api.get("/api/backoffice/ads/zones")).data.data as AdZone[],
    });

    useEffect(() => {
        const campaign = detailQuery.data;

        if (!campaign) {
            return;
        }

        setForm({
            advertiser_id: campaign.advertiser?.id ?? "",
            tenant_id: campaign.tenant?.id ?? null,
            category_id: campaign.category?.id ?? null,
            source: campaign.source,
            kind: campaign.kind,
            name: campaign.name,
            title: campaign.title,
            description: campaign.description ?? "",
            pricing_model: campaign.pricing_model,
            quoted_price: campaign.quoted_price,
            currency: campaign.currency,
            payment_required: campaign.payment_required,
            priority: campaign.priority,
            weight: campaign.weight,
            max_impressions: campaign.max_impressions,
            max_clicks: campaign.max_clicks,
            frequency_cap_daily: campaign.frequency_cap_daily ?? 3,
            start_at: toLocalInput(campaign.start_at),
            end_at: toLocalInput(campaign.end_at),
            admin_notes: campaign.admin_notes ?? "",
            metadata: null,
            channels: campaign.channels,
            audiences: campaign.audiences,
            zone_ids: campaign.zones.map((zone) => zone.id),
            locations: campaign.locations.map((location) => ({
                country_code: location.country_code,
                district: location.district,
                municipality: location.municipality,
            })),
        });
    }, [detailQuery.data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                ...form,
                start_at: form.start_at || null,
                end_at: form.end_at || null,
            };

            if (creating) {
                return api.post("/api/backoffice/ads/campaigns", payload);
            }

            return api.patch(`/api/backoffice/ads/campaigns/${id}`, payload);
        },

        onSuccess: async (response) => {
            const campaign = response.data.data as AdCampaignDetail;

            await queryClient.invalidateQueries({
                queryKey: ["backoffice", "ads"],
            });

            if (creating) {
                navigate(`/backoffice/ads/campanhas/${campaign.id}`);
            }
        },
    });

    const actionMutation = useMutation({
        mutationFn: async (action: string) =>
            api.post(`/api/backoffice/ads/campaigns/${id}/action`, {
                action,
            }),

        onSuccess: async () => {
            await detailQuery.refetch();

            await queryClient.invalidateQueries({
                queryKey: ["backoffice", "ads"],
            });
        },
    });

    if (!creating && detailQuery.isLoading) {
        return (
            <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
        );
    }

    const campaign = detailQuery.data;

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-950">
                        {creating ? "Nova campanha" : campaign?.name}
                    </h2>

                    {!creating && campaign && (
                        <div className="mt-2">
                            <AdStatusBadge status={campaign.status} />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {!creating && campaign?.status === "draft" && (
                        <ActionButton
                            label="Submeter"
                            icon={Send}
                            onClick={() => actionMutation.mutate("submit")}
                        />
                    )}

                    {!creating &&
                        ["submitted", "in_review"].includes(
                            campaign?.status ?? "",
                        ) && (
                            <ActionButton
                                label="Aprovar"
                                icon={Check}
                                onClick={() => actionMutation.mutate("approve")}
                            />
                        )}

                    {!creating && campaign?.status === "awaiting_payment" && (
                        <ActionButton
                            label="Marcar como pago"
                            icon={Check}
                            onClick={() => actionMutation.mutate("mark_paid")}
                        />
                    )}

                    <button
                        type="button"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        Guardar
                    </button>
                </div>
            </div>

            <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 lg:grid-cols-2">
                <Field label="Anunciante">
                    <select
                        value={form.advertiser_id}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                advertiser_id: event.target.value,
                            })
                        }
                        className="input"
                    >
                        <option value="">Selecionar...</option>

                        {advertisersQuery.data?.map((advertiser) => (
                            <option key={advertiser.id} value={advertiser.id}>
                                {advertiser.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Categoria">
                    <select
                        value={form.category_id ?? ""}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                category_id: event.target.value || null,
                            })
                        }
                        className="input"
                    >
                        <option value="">Sem categoria</option>

                        {categoriesQuery.data?.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Nome interno">
                    <input
                        value={form.name}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                name: event.target.value,
                            })
                        }
                        className="input"
                    />
                </Field>

                <Field label="Título">
                    <input
                        value={form.title}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                title: event.target.value,
                            })
                        }
                        className="input"
                    />
                </Field>

                <Field label="Origem">
                    <select
                        value={form.source}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                source: event.target.value,
                            })
                        }
                        className="input"
                    >
                        <option value="saas">FrotaPro</option>
                        <option value="tenant">Gestor de frota</option>
                        <option value="external">Parceiro externo</option>
                    </select>
                </Field>

                <Field label="Tipo">
                    <select
                        value={form.kind}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                kind: event.target.value,
                            })
                        }
                        className="input"
                    >
                        <option value="house">Campanha FrotaPro</option>
                        <option value="tenant_internal">
                            Comunicação interna
                        </option>
                        <option value="commercial">Comercial</option>
                    </select>
                </Field>

                <Field label="Início">
                    <input
                        type="datetime-local"
                        value={form.start_at}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                start_at: event.target.value,
                            })
                        }
                        className="input"
                    />
                </Field>

                <Field label="Fim">
                    <input
                        type="datetime-local"
                        value={form.end_at}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                end_at: event.target.value,
                            })
                        }
                        className="input"
                    />
                </Field>

                <Field label="Preço">
                    <input
                        type="number"
                        step="0.01"
                        value={form.quoted_price}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                quoted_price: Number(event.target.value),
                            })
                        }
                        className="input"
                    />
                </Field>

                <Field label="Pagamento">
                    <label className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 px-3">
                        <input
                            type="checkbox"
                            checked={form.payment_required}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    payment_required: event.target.checked,
                                })
                            }
                        />
                        Exigir pagamento
                    </label>
                </Field>

                <div className="lg:col-span-2">
                    <Field label="Descrição">
                        <textarea
                            value={form.description}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    description: event.target.value,
                                })
                            }
                            rows={4}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2"
                        />
                    </Field>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900">
                    Públicos e canais
                </h3>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <CheckboxGroup
                        title="Públicos"
                        options={[
                            ["driver", "Motoristas"],
                            ["owner", "Proprietários"],
                            ["manager", "Gestores"],
                        ]}
                        values={form.audiences}
                        onChange={(values) =>
                            setForm({
                                ...form,
                                audiences: values,
                            })
                        }
                    />

                    <CheckboxGroup
                        title="Canais"
                        options={[
                            ["driver_portal", "Portal Motorista"],
                            ["owner_portal", "Portal Proprietário"],
                            ["manager_panel", "Painel Gestor"],
                            ["public_marketplace", "Marketplace público"],
                        ]}
                        values={form.channels}
                        onChange={(values) =>
                            setForm({
                                ...form,
                                channels: values,
                            })
                        }
                    />
                </div>

                <h4 className="mt-6 text-sm font-semibold text-slate-700">
                    Zonas
                </h4>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {zonesQuery.data?.map((zone) => (
                        <label
                            key={zone.id}
                            className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
                        >
                            <input
                                type="checkbox"
                                checked={form.zone_ids.includes(zone.id)}
                                onChange={() => {
                                    const selected = form.zone_ids.includes(
                                        zone.id,
                                    )
                                        ? form.zone_ids.filter(
                                              (item) => item !== zone.id,
                                          )
                                        : [...form.zone_ids, zone.id];

                                    setForm({
                                        ...form,
                                        zone_ids: selected,
                                    });
                                }}
                            />

                            <span>
                                <span className="block text-sm font-semibold text-slate-700">
                                    {zone.name}
                                </span>

                                <span className="text-xs text-slate-400">
                                    {zone.channel}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>

                {creating && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-700">
                        Guarde primeiro a campanha para poder adicionar imagens,
                        vídeos, chamadas para ação e destinos.
                    </div>
                )}

                {campaign && (
                    <>
                        <AdCampaignMetrics metrics={campaign.metrics} />

                        <AdCreativeManager
                            campaignId={campaign.id}
                            creatives={campaign.creatives}
                        />
                    </>
                )}
            </section>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
            </span>

            {children}
        </label>
    );
}

function CheckboxGroup({
    title,
    options,
    values,
    onChange,
}: {
    title: string;
    options: Array<[string, string]>;
    values: string[];
    onChange: (values: string[]) => void;
}) {
    return (
        <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
                {title}
            </div>

            <div className="space-y-2">
                {options.map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={values.includes(value)}
                            onChange={() =>
                                onChange(
                                    values.includes(value)
                                        ? values.filter(
                                              (item) => item !== value,
                                          )
                                        : [...values, value],
                                )
                            }
                        />

                        <span className="text-sm text-slate-600">{label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

function ActionButton({
    label,
    icon: Icon,
    onClick,
}: {
    label: string;
    icon: typeof Check;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

function toLocalInput(value: string | null): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    const pad = (number: number) => String(number).padStart(2, "0");

    return `${date.getFullYear()}-${pad(
        date.getMonth() + 1,
    )}-${pad(date.getDate())}T${pad(
        date.getHours(),
    )}:${pad(date.getMinutes())}`;
}
