import axios from "axios";
import {
    AlertTriangle,
    CheckCircle2,
    Gauge,
    Info,
    LoaderCircle,
    Save,
    ShieldCheck,
    Store,
    UsersRound,
    X,
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

import api from "../../lib/api";

import type {
    AdSettings,
} from "../../types/backofficeAds";

interface ValidationResponse {
    message?: string;

    errors?: Record<
        string,
        string[]
    >;
}

type BooleanSetting =
    | "tenant_internal_free_enabled"
    | "tenant_internal_requires_approval"
    | "tenant_internal_allow_partners"
    | "public_marketplace_enabled";

const inputClass =
    "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export default function BackofficeAdSettingsPage() {
    const queryClient =
        useQueryClient();

    const [
        form,
        setForm,
    ] = useState<
        AdSettings | null
    >(null);

    const [
        successMessage,
        setSuccessMessage,
    ] = useState<
        string | null
    >(null);

    const [
        errorMessage,
        setErrorMessage,
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

    const query =
        useQuery({
            queryKey: [
                "backoffice",
                "ads",
                "settings",
            ],

            queryFn:
                async () =>
                    (
                        await api.get(
                            "/api/backoffice/ads/settings",
                        )
                    ).data
                        .data as AdSettings,
        });

    useEffect(() => {
        if (
            query.data
        ) {
            setForm({
                ...query.data,

                manager_panel_external_ads_enabled:
                    false,
            });
        }
    }, [
        query.data,
    ]);

    const mutation =
        useMutation({
            mutationFn:
                async () => {
                    if (
                        !form
                    ) {
                        throw new Error(
                            "As configurações ainda não foram carregadas.",
                        );
                    }

                    return api.patch(
                        "/api/backoffice/ads/settings",
                        {
                            ...form,

                            manager_panel_external_ads_enabled:
                                false,
                        },
                    );
                },

            onMutate:
                () => {
                    setSuccessMessage(
                        null,
                    );

                    setErrorMessage(
                        null,
                    );

                    setFieldErrors(
                        {},
                    );
                },

            onSuccess:
                async (
                    response,
                ) => {
                    setSuccessMessage(
                        response.data
                            ?.message ??
                            "Configurações atualizadas com sucesso.",
                    );

                    setForm(
                        response.data
                            .data as AdSettings,
                    );

                    await queryClient.invalidateQueries(
                        {
                            queryKey:
                                [
                                    "backoffice",
                                    "ads",
                                    "settings",
                                ],
                        },
                    );
                },

            onError:
                (
                    error: unknown,
                ) => {
                    const parsed =
                        parseApiError(
                            error,
                        );

                    setErrorMessage(
                        parsed.message,
                    );

                    setFieldErrors(
                        parsed.errors,
                    );

                    window.scrollTo({
                        top: 0,
                        behavior:
                            "smooth",
                    });
                },
        });

    function toggle(
        field: BooleanSetting,
    ) {
        if (
            !form
        ) {
            return;
        }

        setForm({
            ...form,

            [field]:
                !form[
                    field
                ],
        });
    }

    function fieldError(
        field: string,
    ) {
        return fieldErrors[
            field
        ]?.[0];
    }

    if (
        query.isLoading
    ) {
        return (
            <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (
        query.isError
    ) {
        return (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-14 text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />

                <h2 className="mt-4 text-lg font-bold text-red-900">
                    Não foi possível carregar as configurações
                </h2>

                <p className="mt-2 text-sm text-red-700">
                    {
                        parseApiError(
                            query.error,
                        ).message
                    }
                </p>

                <button
                    type="button"
                    onClick={() =>
                        query.refetch()
                    }
                    className="mt-5 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (
        !form
    ) {
        return null;
    }

    return (
        <div className="mx-auto w-full max-w-[1400px] space-y-7">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Configurações
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Regras globais de publicidade,
                    campanhas internas, marketplace e
                    distribuição do FrotaPro Ads.
                </p>
            </header>

            {successMessage && (
                <div
                    role="status"
                    className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm"
                >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-emerald-900">
                            Configurações guardadas
                        </div>

                        <p className="mt-1 text-sm text-emerald-700">
                            {
                                successMessage
                            }
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setSuccessMessage(
                                null,
                            )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm"
                >
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                        <div>
                            <div className="font-semibold text-red-900">
                                Não foi possível guardar as configurações
                            </div>

                            <p className="mt-1 text-sm text-red-700">
                                {
                                    errorMessage
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <SettingsSection
                icon={
                    UsersRound
                }
                title="Campanhas internas dos gestores"
                description="Defina as regras para comunicações e anúncios gratuitos destinados aos próprios motoristas e proprietários do tenant."
            >
                <div className="space-y-3">
                    <SettingSwitch
                        label="Permitir campanhas internas gratuitas"
                        description="Gestores podem divulgar serviços próprios, parceiros operacionais e benefícios aos seus próprios utilizadores sem cobrança."
                        checked={
                            form.tenant_internal_free_enabled
                        }
                        onChange={() =>
                            toggle(
                                "tenant_internal_free_enabled",
                            )
                        }
                    />

                    <SettingSwitch
                        label="Exigir aprovação do FrotaPro"
                        description="Mesmo campanhas internas gratuitas precisam passar pela equipa administrativa antes de serem publicadas."
                        checked={
                            form.tenant_internal_requires_approval
                        }
                        onChange={() =>
                            toggle(
                                "tenant_internal_requires_approval",
                            )
                        }
                    />

                    <SettingSwitch
                        label="Permitir parceiros do tenant"
                        description="Permite que o gestor divulgue oficinas, contabilistas, seguradoras ou outros parceiros ligados à operação da própria frota."
                        checked={
                            form.tenant_internal_allow_partners
                        }
                        onChange={() =>
                            toggle(
                                "tenant_internal_allow_partners",
                            )
                        }
                    />
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <NumberInput
                        label="Máximo de campanhas internas ativas"
                        description="Número máximo de campanhas gratuitas simultâneas por tenant."
                        value={
                            form.tenant_internal_max_active
                        }
                        min={
                            0
                        }
                        max={
                            1000
                        }
                        error={fieldError(
                            "tenant_internal_max_active",
                        )}
                        onChange={(
                            value,
                        ) =>
                            setForm({
                                ...form,

                                tenant_internal_max_active:
                                    value,
                            })
                        }
                    />

                    <NumberInput
                        label="Duração máxima gratuita"
                        description="Quantidade máxima de dias de uma campanha interna gratuita."
                        suffix="dias"
                        value={
                            form.tenant_internal_max_days
                        }
                        min={
                            1
                        }
                        max={
                            3650
                        }
                        error={fieldError(
                            "tenant_internal_max_days",
                        )}
                        onChange={(
                            value,
                        ) =>
                            setForm({
                                ...form,

                                tenant_internal_max_days:
                                    value,
                            })
                        }
                    />
                </div>
            </SettingsSection>

            <SettingsSection
                icon={
                    Store
                }
                title="Marketplace público"
                description="Controla a disponibilidade da futura área pública de anúncios, parceiros e ofertas do FrotaPro."
            >
                <SettingSwitch
                    label="Marketplace público ativo"
                    description="Permite que campanhas elegíveis sejam disponibilizadas na área pública FrotaPro Ads."
                    checked={
                        form.public_marketplace_enabled
                    }
                    onChange={() =>
                        toggle(
                            "public_marketplace_enabled",
                        )
                    }
                />
            </SettingsSection>

            <SettingsSection
                icon={
                    Gauge
                }
                title="Distribuição e frequência"
                description="Parâmetros globais utilizados pelo futuro motor de entrega dos anúncios."
            >
                <div className="grid gap-5 md:grid-cols-2">
                    <NumberInput
                        label="Reserva de inventário FrotaPro"
                        description="Percentagem de inventário que poderá ficar reservada às campanhas próprias do SaaS."
                        suffix="%"
                        value={
                            form.saas_inventory_reserved_percent
                        }
                        min={
                            0
                        }
                        max={
                            100
                        }
                        error={fieldError(
                            "saas_inventory_reserved_percent",
                        )}
                        onChange={(
                            value,
                        ) =>
                            setForm({
                                ...form,

                                saas_inventory_reserved_percent:
                                    value,
                            })
                        }
                    />

                    <NumberInput
                        label="Frequency cap diário"
                        description="Número máximo padrão de impressões da mesma campanha por utilizador em cada dia."
                        value={
                            form.default_frequency_cap_daily
                        }
                        min={
                            1
                        }
                        max={
                            100
                        }
                        error={fieldError(
                            "default_frequency_cap_daily",
                        )}
                        onChange={(
                            value,
                        ) =>
                            setForm({
                                ...form,

                                default_frequency_cap_daily:
                                    value,
                            })
                        }
                    />
                </div>
            </SettingsSection>

            <SettingsSection
                icon={
                    ShieldCheck
                }
                title="Proteção do painel do gestor"
                description="O painel administrativo da frota deve permanecer livre de publicidade comercial de terceiros."
            >
                <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                        <div className="font-semibold text-emerald-900">
                            Publicidade externa desativada
                        </div>

                        <p className="mt-1 text-sm leading-6 text-emerald-700">
                            O painel do gestor fica reservado
                            a comunicações e campanhas do
                            próprio FrotaPro. Esta regra também
                            deverá ser aplicada diretamente pelo
                            Delivery Engine.
                        </p>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection
                icon={
                    Info
                }
                title="Moeda"
                description="Moeda padrão utilizada nos preços e pedidos do módulo de publicidade."
            >
                <label className="block max-w-sm">
                    <span className="mb-2 block text-sm font-semibold text-slate-800">
                        Moeda padrão
                    </span>

                    <select
                        value={
                            form.currency
                        }
                        onChange={(
                            event,
                        ) =>
                            setForm({
                                ...form,

                                currency:
                                    event
                                        .target
                                        .value,
                            })
                        }
                        className={
                            inputClass
                        }
                    >
                        <option value="EUR">
                            EUR — Euro
                        </option>
                    </select>

                    {fieldError(
                        "currency",
                    ) && (
                        <span className="mt-2 block text-xs font-medium text-red-600">
                            {fieldError(
                                "currency",
                            )}
                        </span>
                    )}
                </label>
            </SettingsSection>

            <div className="sticky bottom-4 z-10 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                <button
                    type="button"
                    onClick={() =>
                        mutation.mutate()
                    }
                    disabled={
                        mutation.isPending
                    }
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {mutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}

                    {mutation.isPending
                        ? "A guardar..."
                        : "Guardar configurações"}
                </button>
            </div>
        </div>
    );
}

function SettingsSection({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof UsersRound;
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
                            {
                                title
                            }
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
                {
                    children
                }
            </div>
        </section>
    );
}

function SettingSwitch({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label
            className={[
                "flex cursor-pointer items-start justify-between gap-5 rounded-2xl border p-5 transition",

                checked
                    ? "border-indigo-200 bg-indigo-50/60"
                    : "border-slate-200 bg-white hover:bg-slate-50",
            ].join(
                " ",
            )}
        >
            <span>
                <span className="block font-semibold text-slate-900">
                    {
                        label
                    }
                </span>

                <span className="mt-1 block max-w-3xl text-sm leading-6 text-slate-500">
                    {
                        description
                    }
                </span>
            </span>

            <input
                type="checkbox"
                checked={
                    checked
                }
                onChange={
                    onChange
                }
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
        </label>
    );
}

function NumberInput({
    label,
    description,
    suffix,
    value,
    min,
    max,
    error,
    onChange,
}: {
    label: string;
    description: string;
    suffix?: string;
    value: number;
    min: number;
    max: number;
    error?: string;
    onChange: (
        value: number,
    ) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
                {
                    label
                }
            </span>

            <div className="relative">
                <input
                    type="number"
                    min={
                        min
                    }
                    max={
                        max
                    }
                    value={
                        value
                    }
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            Number(
                                event
                                    .target
                                    .value,
                            ),
                        )
                    }
                    className={`${inputClass} ${suffix ? "pr-16" : ""}`}
                />

                {suffix && (
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">
                        {
                            suffix
                        }
                    </span>
                )}
            </div>

            {error ? (
                <span className="mt-2 block text-xs font-medium text-red-600">
                    {
                        error
                    }
                </span>
            ) : (
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {
                        description
                    }
                </span>
            )}
        </label>
    );
}

function parseApiError(
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
        const data =
            error.response
                ?.data;

        if (
            error.response
                ?.status ===
            422
        ) {
            return {
                message:
                    "Existem configurações inválidas. Corrija os campos indicados e tente novamente.",

                errors:
                    data?.errors ??
                    {},
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

        if (
            error.response
                ?.status ===
            403
        ) {
            return {
                message:
                    "Não tem permissão para alterar estas configurações.",

                errors: {},
            };
        }
    }

    if (
        error instanceof
            Error &&
        error.message
    ) {
        return {
            message:
                error.message,

            errors: {},
        };
    }

    return {
        message:
            "Não foi possível guardar as configurações.",

        errors: {},
    };
}
