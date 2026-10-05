import axios from "axios";
import {
    AlertTriangle,
    BadgeEuro,
    Check,
    Info,
    Layers3,
    LoaderCircle,
    Megaphone,
    Save,
    Send,
    Target,
    UsersRound,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    useEffect,
    useState,
} from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";

import AdCampaignHelpGuide from "../../components/ads/AdCampaignHelpGuide";
import AdCampaignMetrics from "../../components/ads/AdCampaignMetrics";
import AdCreativeManager from "../../components/ads/AdCreativeManager";
import AdStatusBadge from "../../components/ads/AdStatusBadge";
import api from "../../lib/api";

import type {
    AdAdvertiser,
    AdCampaignDetail,
    AdCategory,
    AdZone,
} from "../../types/backofficeAds";

const inputClass =
    "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const textareaClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

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

interface ValidationResponse {
    message?: string;

    errors?: Record<
        string,
        string[]
    >;
}

export default function BackofficeAdCampaignPage() {
    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const creating =
        !id;

    const [form, setForm] =
        useState(
            defaultForm,
        );

    const [
        saveError,
        setSaveError,
    ] = useState<
        string | null
    >(null);

    const [
        fieldErrors,
        setFieldErrors,
    ] = useState<
        Record<
            string,
            string[]
        >
    >({});

    const detailQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "ads",
                "campaign",
                id,
            ],

            enabled:
                !creating,

            queryFn:
                async () =>
                    (
                        await api.get(
                            `/api/backoffice/ads/campaigns/${id}`,
                        )
                    ).data
                        .data as AdCampaignDetail,
        });

    const advertisersQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "ads",
                "advertisers",
            ],

            queryFn:
                async () =>
                    (
                        await api.get(
                            "/api/backoffice/ads/advertisers",
                        )
                    ).data
                        .data as AdAdvertiser[],
        });

    const categoriesQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "ads",
                "categories",
            ],

            queryFn:
                async () =>
                    (
                        await api.get(
                            "/api/backoffice/ads/categories",
                        )
                    ).data
                        .data as AdCategory[],
        });

    const zonesQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "ads",
                "zones",
            ],

            queryFn:
                async () =>
                    (
                        await api.get(
                            "/api/backoffice/ads/zones",
                        )
                    ).data
                        .data as AdZone[],
        });

    useEffect(() => {
        const campaign =
            detailQuery.data;

        if (
            !campaign
        ) {
            return;
        }

        setForm({
            advertiser_id:
                campaign.advertiser
                    ?.id ??
                "",

            tenant_id:
                campaign.tenant
                    ?.id ??
                null,

            category_id:
                campaign.category
                    ?.id ??
                null,

            source:
                campaign.source,

            kind:
                campaign.kind,

            name:
                campaign.name,

            title:
                campaign.title,

            description:
                campaign.description ??
                "",

            pricing_model:
                campaign.pricing_model,

            quoted_price:
                campaign.quoted_price,

            currency:
                campaign.currency,

            payment_required:
                campaign.payment_required,

            priority:
                campaign.priority,

            weight:
                campaign.weight,

            max_impressions:
                campaign.max_impressions,

            max_clicks:
                campaign.max_clicks,

            frequency_cap_daily:
                campaign.frequency_cap_daily ??
                3,

            start_at:
                toLocalInput(
                    campaign.start_at,
                ),

            end_at:
                toLocalInput(
                    campaign.end_at,
                ),

            admin_notes:
                campaign.admin_notes ??
                "",

            metadata:
                null,

            channels:
                campaign.channels,

            audiences:
                campaign.audiences,

            zone_ids:
                campaign.zones.map(
                    (
                        zone,
                    ) =>
                        zone.id,
                ),

            locations:
                campaign.locations.map(
                    (
                        location,
                    ) => ({
                        country_code:
                            location.country_code,

                        district:
                            location.district,

                        municipality:
                            location.municipality,
                    }),
                ),
        });
    }, [
        detailQuery.data,
    ]);

    const saveMutation =
        useMutation({
            mutationFn:
                async () => {
                    const payload =
                        {
                            ...form,

                            start_at:
                                form.start_at ||
                                null,

                            end_at:
                                form.end_at ||
                                null,
                        };

                    if (
                        creating
                    ) {
                        return api.post(
                            "/api/backoffice/ads/campaigns",
                            payload,
                        );
                    }

                    return api.patch(
                        `/api/backoffice/ads/campaigns/${id}`,
                        payload,
                    );
                },

            onMutate:
                () => {
                    setSaveError(
                        null,
                    );

                    setFieldErrors(
                        {},
                    );
                },

            onSuccess:
                async () => {
                    await queryClient.invalidateQueries(
                        {
                            queryKey:
                                [
                                    "backoffice",
                                    "ads",
                                ],
                        },
                    );

                    navigate(
                        "/backoffice/ads/campanhas",
                        {
                            replace:
                                true,

                            state: {
                                success:
                                    creating
                                        ? "Campanha criada com sucesso."
                                        : "Campanha atualizada com sucesso.",
                            },
                        },
                    );
                },

            onError:
                (
                    error: unknown,
                ) => {
                    const parsed =
                        parseSaveError(
                            error,
                        );

                    setSaveError(
                        parsed.message,
                    );

                    setFieldErrors(
                        parsed.errors,
                    );

                    window.scrollTo(
                        {
                            top: 0,
                            behavior:
                                "smooth",
                        },
                    );
                },
        });

    const actionMutation =
        useMutation({
            mutationFn:
                async (
                    action: string,
                ) =>
                    api.post(
                        `/api/backoffice/ads/campaigns/${id}/action`,
                        {
                            action,
                        },
                    ),

            onSuccess:
                async () => {
                    await detailQuery.refetch();

                    await queryClient.invalidateQueries(
                        {
                            queryKey:
                                [
                                    "backoffice",
                                    "ads",
                                ],
                        },
                    );
                },
        });

    if (
        !creating &&
        detailQuery.isLoading
    ) {
        return (
            <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const campaign =
        detailQuery.data;

    const fieldError =
        (
            field: string,
        ):
            | string
            | undefined =>
            fieldErrors[
                field
            ]?.[0];

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-7">
            <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            {creating
                                ? "Nova campanha"
                                : campaign
                                      ?.name}
                        </h1>

                        {!creating &&
                            campaign && (
                                <AdStatusBadge
                                    status={
                                        campaign.status
                                    }
                                />
                            )}
                    </div>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Configure os
                        dados
                        comerciais,
                        distribuição e
                        criativos da
                        campanha.
                        Encontrará um
                        guia completo
                        de
                        preenchimento
                        no final desta
                        página.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {!creating &&
                        campaign?.status ===
                            "draft" && (
                            <ActionButton
                                label="Submeter"
                                icon={
                                    Send
                                }
                                onClick={() =>
                                    actionMutation.mutate(
                                        "submit",
                                    )
                                }
                            />
                        )}

                    {!creating &&
                        [
                            "submitted",
                            "in_review",
                        ].includes(
                            campaign?.status ??
                                "",
                        ) && (
                            <ActionButton
                                label="Aprovar"
                                icon={
                                    Check
                                }
                                onClick={() =>
                                    actionMutation.mutate(
                                        "approve",
                                    )
                                }
                            />
                        )}

                    {!creating &&
                        campaign?.status ===
                            "awaiting_payment" && (
                            <ActionButton
                                label="Marcar como pago"
                                icon={
                                    Check
                                }
                                onClick={() =>
                                    actionMutation.mutate(
                                        "mark_paid",
                                    )
                                }
                            />
                        )}

                    <button
                        type="button"
                        onClick={() =>
                            saveMutation.mutate()
                        }
                        disabled={
                            saveMutation.isPending
                        }
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saveMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}

                        {saveMutation.isPending
                            ? "A guardar..."
                            : "Guardar campanha"}
                    </button>
                </div>
            </header>

            {saveError && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-red-900">
                                Não foi
                                possível
                                guardar a
                                campanha
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-red-700">
                                {
                                    saveError
                                }
                            </p>

                            {Object.keys(
                                fieldErrors,
                            )
                                .length >
                                0 && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-white p-4">
                                    <div className="text-sm font-semibold text-red-900">
                                        Corrija
                                        os
                                        seguintes
                                        pontos:
                                    </div>

                                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-red-700">
                                        {Object.entries(
                                            fieldErrors,
                                        ).flatMap(
                                            ([
                                                field,
                                                messages,
                                            ]) =>
                                                messages.map(
                                                    (
                                                        message,
                                                        index,
                                                    ) => (
                                                        <li
                                                            key={`${field}-${index}`}
                                                        >
                                                            {
                                                                message
                                                            }
                                                        </li>
                                                    ),
                                                ),
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                <div className="text-sm leading-6 text-indigo-900">
                    <span className="font-semibold">
                        Precisa de
                        ajuda para
                        preencher?
                    </span>{" "}
                    Cada campo é
                    explicado no{" "}
                    <a
                        href="#guia-preenchimento"
                        className="font-semibold underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700"
                    >
                        guia de
                        preenchimento
                        no final da
                        página
                    </a>
                    . As dimensões
                    recomendadas de
                    cada formato
                    também estão
                    disponíveis no
                    bloco de
                    criativos.
                </div>
            </div>

            <Section
                icon={
                    Megaphone
                }
                title="Identificação da campanha"
                description="Informações principais utilizadas para organizar e apresentar a campanha."
            >
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-12">
                    <div className="xl:col-span-6">
                        <Field
                            label="Anunciante"
                            hint="Empresa, parceiro, tenant ou FrotaPro responsável pelo anúncio."
                            error={fieldError(
                                "advertiser_id",
                            )}
                        >
                            <select
                                value={
                                    form.advertiser_id
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        advertiser_id:
                                            event
                                                .target
                                                .value,
                                    })
                                }
                                className={
                                    inputClass
                                }
                            >
                                <option value="">
                                    Selecione
                                    o
                                    anunciante...
                                </option>

                                {advertisersQuery.data?.map(
                                    (
                                        advertiser,
                                    ) => (
                                        <option
                                            key={
                                                advertiser.id
                                            }
                                            value={
                                                advertiser.id
                                            }
                                        >
                                            {
                                                advertiser.name
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                    </div>

                    <div className="xl:col-span-6">
                        <Field
                            label="Categoria"
                            hint="Ajuda na segmentação, nos filtros e no marketplace público."
                            error={fieldError(
                                "category_id",
                            )}
                        >
                            <select
                                value={
                                    form.category_id ??
                                    ""
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        category_id:
                                            event
                                                .target
                                                .value ||
                                            null,
                                    })
                                }
                                className={
                                    inputClass
                                }
                            >
                                <option value="">
                                    Selecione
                                    uma
                                    categoria...
                                </option>

                                {categoriesQuery.data?.map(
                                    (
                                        category,
                                    ) => (
                                        <option
                                            key={
                                                category.id
                                            }
                                            value={
                                                category.id
                                            }
                                        >
                                            {
                                                category.name
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                    </div>

                    <div className="xl:col-span-6">
                        <Field
                            label="Nome interno"
                            hint="Usado apenas no backoffice para identificar a campanha."
                            error={fieldError(
                                "name",
                            )}
                        >
                            <input
                                value={
                                    form.name
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        name: event
                                            .target
                                            .value,
                                    })
                                }
                                placeholder="Ex.: Oficina XPTO — Lisboa — Outubro 2026"
                                className={
                                    inputClass
                                }
                            />
                        </Field>
                    </div>

                    <div className="xl:col-span-6">
                        <Field
                            label="Título da campanha"
                            hint="Mensagem principal que identifica a campanha."
                            error={fieldError(
                                "title",
                            )}
                        >
                            <input
                                value={
                                    form.title
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        title: event
                                            .target
                                            .value,
                                    })
                                }
                                placeholder="Ex.: 10% de desconto para motoristas TVDE"
                                className={
                                    inputClass
                                }
                            />
                        </Field>
                    </div>

                    <div className="xl:col-span-12">
                        <Field
                            label="Descrição"
                            hint="Resumo do objetivo, oferta ou contexto da campanha."
                            error={fieldError(
                                "description",
                            )}
                        >
                            <textarea
                                value={
                                    form.description
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        description:
                                            event
                                                .target
                                                .value,
                                    })
                                }
                                rows={
                                    5
                                }
                                placeholder="Descreva a campanha, a oferta, o benefício ou a mensagem que será promovida..."
                                className={
                                    textareaClass
                                }
                            />
                        </Field>
                    </div>
                </div>
            </Section>

            <Section
                icon={
                    BadgeEuro
                }
                title="Configuração comercial"
                description="Defina a origem, modalidade, período e regras de pagamento."
            >
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-12">
                    <div className="xl:col-span-4">
                        <Field
                            label="Origem"
                            hint="Quem originou a campanha dentro do ecossistema FrotaPro."
                            error={fieldError(
                                "source",
                            )}
                        >
                            <select
                                value={
                                    form.source
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        source:
                                            event
                                                .target
                                                .value,
                                    })
                                }
                                className={
                                    inputClass
                                }
                            >
                                <option value="saas">
                                    FrotaPro
                                    /
                                    SaaS
                                </option>

                                <option value="tenant">
                                    Gestor
                                    de
                                    frota
                                </option>

                                <option value="external">
                                    Parceiro
                                    externo
                                </option>
                            </select>
                        </Field>
                    </div>

                    <div className="xl:col-span-4">
                        <Field
                            label="Tipo de campanha"
                            hint="Define a finalidade comercial e as regras da campanha."
                            error={fieldError(
                                "kind",
                            )}
                        >
                            <select
                                value={
                                    form.kind
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        kind: event
                                            .target
                                            .value,
                                    })
                                }
                                className={
                                    inputClass
                                }
                            >
                                <option value="house">
                                    Campanha
                                    FrotaPro
                                </option>

                                <option value="tenant_internal">
                                    Comunicação
                                    interna
                                </option>

                                <option value="commercial">
                                    Campanha
                                    comercial
                                </option>
                            </select>
                        </Field>
                    </div>

                    <div className="xl:col-span-4">
                        <Field
                            label="Preço aprovado"
                            hint="Valor comercial total da campanha em euros."
                            error={fieldError(
                                "quoted_price",
                            )}
                        >
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                        form.quoted_price
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,

                                            quoted_price:
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                        })
                                    }
                                    className={`${inputClass} pr-14`}
                                />

                                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">
                                    EUR
                                </span>
                            </div>
                        </Field>
                    </div>

                    <div className="xl:col-span-6">
                        <Field
                            label="Início"
                            hint="Data e hora a partir das quais a campanha poderá ficar ativa."
                            error={fieldError(
                                "start_at",
                            )}
                        >
                            <input
                                type="datetime-local"
                                value={
                                    form.start_at
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        start_at:
                                            event
                                                .target
                                                .value,
                                    })
                                }
                                className={
                                    inputClass
                                }
                            />
                        </Field>
                    </div>

                    <div className="xl:col-span-6">
                        <Field
                            label="Fim"
                            hint="A campanha deixa de ser servida automaticamente após esta data."
                            error={fieldError(
                                "end_at",
                            )}
                        >
                            <input
                                type="datetime-local"
                                value={
                                    form.end_at
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        end_at:
                                            event
                                                .target
                                                .value,
                                    })
                                }
                                className={
                                    inputClass
                                }
                            />
                        </Field>
                    </div>

                    <div className="xl:col-span-12">
                        <label
                            className={[
                                "flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition",
                                fieldError(
                                    "payment_required",
                                )
                                    ? "border-red-300 bg-red-50"
                                    : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50",
                            ].join(
                                " ",
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={
                                    form.payment_required
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,

                                        payment_required:
                                            event
                                                .target
                                                .checked,
                                    })
                                }
                                className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />

                            <span>
                                <span className="block font-semibold text-slate-900">
                                    Exigir
                                    pagamento
                                </span>

                                <span className="mt-1 block text-sm leading-6 text-slate-500">
                                    Quando
                                    ativo, a
                                    campanha
                                    só poderá
                                    ser
                                    veiculada
                                    depois de
                                    aprovada e
                                    marcada
                                    como
                                    paga.
                                    Campanhas
                                    FrotaPro e
                                    comunicações
                                    internas
                                    podem ter
                                    esta opção
                                    desativada.
                                </span>

                                {fieldError(
                                    "payment_required",
                                ) && (
                                    <span className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-600">
                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                                        {fieldError(
                                            "payment_required",
                                        )}
                                    </span>
                                )}
                            </span>
                        </label>
                    </div>
                </div>
            </Section>

            <Section
                icon={
                    UsersRound
                }
                title="Público e distribuição"
                description="Escolha quem pode receber a campanha e em que áreas da plataforma ela poderá aparecer."
            >
                {(fieldError(
                    "audiences",
                ) ||
                    fieldError(
                        "channels",
                    ) ||
                    fieldError(
                        "tenant_id",
                    )) && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {fieldError(
                            "tenant_id",
                        ) && (
                            <p>
                                {
                                    fieldError(
                                        "tenant_id",
                                    )
                                }
                            </p>
                        )}

                        {fieldError(
                            "audiences",
                        ) && (
                            <p>
                                {
                                    fieldError(
                                        "audiences",
                                    )
                                }
                            </p>
                        )}

                        {fieldError(
                            "channels",
                        ) && (
                            <p>
                                {
                                    fieldError(
                                        "channels",
                                    )
                                }
                            </p>
                        )}
                    </div>
                )}

                <div className="grid gap-5 xl:grid-cols-2">
                    <CheckboxGroup
                        title="Públicos"
                        description="Utilizadores elegíveis para receber esta campanha."
                        error={fieldError(
                            "audiences",
                        )}
                        options={[
                            {
                                value: "driver",
                                label: "Motoristas",
                                description:
                                    "Motoristas associados à plataforma ou ao tenant elegível.",
                            },

                            {
                                value: "owner",
                                label: "Proprietários",
                                description:
                                    "Proprietários com acesso ao respetivo portal.",
                            },

                            {
                                value: "manager",
                                label: "Gestores",
                                description:
                                    "Gestores de frota. Por regra, este painel deverá receber apenas campanhas FrotaPro.",
                            },
                        ]}
                        values={
                            form.audiences
                        }
                        onChange={(
                            values,
                        ) =>
                            setForm({
                                ...form,

                                audiences:
                                    values,
                            })
                        }
                    />

                    <CheckboxGroup
                        title="Canais"
                        description="Áreas gerais onde a campanha poderá ser distribuída."
                        error={fieldError(
                            "channels",
                        )}
                        options={[
                            {
                                value: "driver_portal",
                                label: "Portal Motorista",
                                description:
                                    "Área autenticada dos motoristas.",
                            },

                            {
                                value: "owner_portal",
                                label: "Portal Proprietário",
                                description:
                                    "Área autenticada dos proprietários.",
                            },

                            {
                                value: "manager_panel",
                                label: "Painel Gestor",
                                description:
                                    "Área administrativa do gestor de frota.",
                            },

                            {
                                value: "public_marketplace",
                                label: "Marketplace público",
                                description:
                                    "Página pública FrotaPro Ads.",
                            },
                        ]}
                        values={
                            form.channels
                        }
                        onChange={(
                            values,
                        ) =>
                            setForm({
                                ...form,

                                channels:
                                    values,
                            })
                        }
                    />
                </div>

                <div className="mt-7 border-t border-slate-200 pt-7">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Layers3 className="h-5 w-5" />
                        </div>

                        <div>
                            <h3 className="font-semibold text-slate-900">
                                Zonas
                                publicitárias
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                As zonas
                                representam
                                as posições
                                concretas
                                onde o
                                anúncio
                                poderá ser
                                apresentado.
                            </p>
                        </div>
                    </div>

                    {fieldError(
                        "zone_ids",
                    ) && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {fieldError(
                                "zone_ids",
                            )}
                        </div>
                    )}

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {zonesQuery.data?.map(
                            (
                                zone,
                            ) => {
                                const selected =
                                    form.zone_ids.includes(
                                        zone.id,
                                    );

                                return (
                                    <label
                                        key={
                                            zone.id
                                        }
                                        className={[
                                            "cursor-pointer rounded-2xl border p-4 transition",

                                            selected
                                                ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selected
                                                }
                                                onChange={() => {
                                                    const zones =
                                                        selected
                                                            ? form.zone_ids.filter(
                                                                  (
                                                                      item,
                                                                  ) =>
                                                                      item !==
                                                                      zone.id,
                                                              )
                                                            : [
                                                                  ...form.zone_ids,
                                                                  zone.id,
                                                              ];

                                                    setForm({
                                                        ...form,

                                                        zone_ids:
                                                            zones,
                                                    });
                                                }}
                                                className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />

                                            <span>
                                                <span className="block font-semibold text-slate-900">
                                                    {
                                                        zone.name
                                                    }
                                                </span>

                                                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                                    {friendlyChannel(
                                                        zone.channel,
                                                    )}
                                                </span>

                                                {zone.description && (
                                                    <span className="mt-2 block text-sm leading-5 text-slate-500">
                                                        {
                                                            zone.description
                                                        }
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </label>
                                );
                            },
                        )}
                    </div>
                </div>
            </Section>

            {creating && (
                <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                    <div>
                        <div className="font-semibold text-indigo-900">
                            Guarde
                            primeiro a
                            campanha
                        </div>

                        <p className="mt-1 text-sm leading-6 text-indigo-700">
                            Depois de
                            criar a
                            campanha
                            será
                            possível
                            adicionar
                            imagens,
                            vídeos,
                            CTA,
                            WhatsApp,
                            telefone,
                            links de
                            destino e
                            múltiplos
                            criativos.
                        </p>
                    </div>
                </div>
            )}

            {campaign && (
                <>
                    <Section
                        icon={
                            Target
                        }
                        title="Performance"
                        description="Resultados acumulados da campanha e respetivos criativos."
                    >
                        <AdCampaignMetrics
                            metrics={
                                campaign.metrics
                            }
                        />
                    </Section>

                    <AdCreativeManager
                        campaignId={
                            campaign.id
                        }
                        creatives={
                            campaign.creatives
                        }
                    />
                </>
            )}

            <AdCampaignHelpGuide />
        </div>
    );
}

function Section({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof Megaphone;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-950">
                            {title}
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            {
                                description
                            }
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 sm:p-7">
                {children}
            </div>
        </section>
    );
}

function Field({
    label,
    hint,
    error,
    children,
}: {
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
                {label}
            </span>

            {children}

            {error ? (
                <span className="mt-2 flex items-start gap-1.5 text-xs font-medium leading-5 text-red-600">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                    {error}
                </span>
            ) : hint ? (
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {hint}
                </span>
            ) : null}
        </label>
    );
}

function CheckboxGroup({
    title,
    description,
    error,
    options,
    values,
    onChange,
}: {
    title: string;
    description: string;
    error?: string;

    options: Array<{
        value: string;
        label: string;
        description: string;
    }>;

    values: string[];

    onChange: (
        values: string[],
    ) => void;
}) {
    return (
        <div
            className={[
                "rounded-2xl border p-5",

                error
                    ? "border-red-200 bg-red-50/50"
                    : "border-slate-200 bg-slate-50/60",
            ].join(
                " ",
            )}
        >
            <h3 className="font-semibold text-slate-900">
                {title}
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
            </p>

            {error && (
                <div className="mt-3 flex items-start gap-1.5 text-xs font-medium text-red-600">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                    {error}
                </div>
            )}

            <div className="mt-4 space-y-3">
                {options.map(
                    (
                        option,
                    ) => {
                        const selected =
                            values.includes(
                                option.value,
                            );

                        return (
                            <label
                                key={
                                    option.value
                                }
                                className={[
                                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",

                                    selected
                                        ? "border-indigo-300 bg-white shadow-sm"
                                        : "border-slate-200 bg-white/70 hover:border-slate-300",
                                ].join(
                                    " ",
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        selected
                                    }
                                    onChange={() =>
                                        onChange(
                                            selected
                                                ? values.filter(
                                                      (
                                                          item,
                                                      ) =>
                                                          item !==
                                                          option.value,
                                                  )
                                                : [
                                                      ...values,
                                                      option.value,
                                                  ],
                                        )
                                    }
                                    className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />

                                <span>
                                    <span className="block text-sm font-semibold text-slate-800">
                                        {
                                            option.label
                                        }
                                    </span>

                                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                                        {
                                            option.description
                                        }
                                    </span>
                                </span>
                            </label>
                        );
                    },
                )}
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
            onClick={
                onClick
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        >
            <Icon className="h-4 w-4" />

            {label}
        </button>
    );
}

function friendlyChannel(
    channel: string,
): string {
    const labels: Record<
        string,
        string
    > = {
        driver_portal:
            "Portal Motorista",

        owner_portal:
            "Portal Proprietário",

        manager_panel:
            "Painel Gestor",

        public_marketplace:
            "Marketplace público",
    };

    return labels[
        channel
    ] ?? channel;
}

function toLocalInput(
    value: string | null,
): string {
    if (
        !value
    ) {
        return "";
    }

    const date =
        new Date(
            value,
        );

    const pad = (
        number: number,
    ) =>
        String(
            number,
        ).padStart(
            2,
            "0",
        );

    return `${date.getFullYear()}-${pad(
        date.getMonth() +
            1,
    )}-${pad(
        date.getDate(),
    )}T${pad(
        date.getHours(),
    )}:${pad(
        date.getMinutes(),
    )}`;
}

function parseSaveError(
    error: unknown,
): {
    message: string;

    errors: Record<
        string,
        string[]
    >;
} {
    if (
        axios.isAxiosError<ValidationResponse>(
            error,
        )
    ) {
        const status =
            error.response
                ?.status;

        const data =
            error.response
                ?.data;

        if (
            status === 422
        ) {
            return {
                message:
                    "Existem informações obrigatórias ou inválidas. Corrija os campos indicados abaixo e tente guardar novamente.",

                errors:
                    data?.errors ??
                    {},
            };
        }

        if (
            status === 401
        ) {
            return {
                message:
                    "A sua sessão expirou ou já não está autenticada. Entre novamente no sistema antes de guardar a campanha.",

                errors: {},
            };
        }

        if (
            status === 403
        ) {
            return {
                message:
                    "Não tem permissão para efetuar esta operação.",

                errors: {},
            };
        }

        if (
            status === 404
        ) {
            return {
                message:
                    "A campanha ou uma das informações associadas já não foi encontrada. Atualize a página e tente novamente.",

                errors: {},
            };
        }

        if (
            status === 409
        ) {
            return {
                message:
                    data?.message ??
                    "A campanha sofreu uma alteração concorrente. Atualize a página antes de tentar novamente.",

                errors:
                    data?.errors ??
                    {},
            };
        }

        if (
            status &&
            status >= 500
        ) {
            return {
                message:
                    "Ocorreu um erro interno ao guardar a campanha. Nenhuma alteração foi confirmada. Tente novamente e, se o problema continuar, consulte os logs do sistema.",

                errors: {},
            };
        }

        if (
            data?.message
        ) {
            return {
                message:
                    data.message,

                errors:
                    data.errors ??
                    {},
            };
        }
    }

    return {
        message:
            "Não foi possível comunicar com o servidor. Verifique a ligação e tente novamente.",

        errors: {},
    };
}
