import {
    Building2,
    Database,
    LoaderCircle,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    Search,
    ShieldCheck,
    Webhook,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";

import api from "../lib/api";

import type {
    BackofficeNifEnrichment,
    BackofficeNifEnrichmentMutationResponse,
    BackofficeNifEnrichmentResponse,
} from "../types/backofficeNif";

export default function BackofficeNifEnrichmentPanel({
    operatorId,
    nif,
}: {
    operatorId: string;
    nif: string;
}) {
    const queryClient =
        useQueryClient();

    const queryKey = [
        "backoffice",
        "crm",
        "operadores",
        operatorId,
        "nif-enrichment",
    ];

    const enrichmentQuery =
        useQuery({
            queryKey,

            queryFn: async () => {
                const response =
                    await api.get(
                        `/api/backoffice/crm/operadores/${operatorId}/enriquecimento`,
                    );

                return response
                    .data as BackofficeNifEnrichmentResponse;
            },
        });

    const lookupMutation =
        useMutation({
            mutationFn: async (
                force: boolean,
            ) => {
                const response =
                    await api.post(
                        `/api/backoffice/crm/operadores/${operatorId}/enriquecimento`,
                        {
                            force,
                        },
                    );

                return response
                    .data as BackofficeNifEnrichmentMutationResponse;
            },

            onSuccess: (
                response,
            ) => {
                queryClient.setQueryData(
                    queryKey,
                    {
                        data:
                            response.data,
                    } satisfies BackofficeNifEnrichmentResponse,
                );
            },
        });

    if (
        enrichmentQuery.isLoading
    ) {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-8">
                <div className="flex items-center justify-center">
                    <LoaderCircle className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
            </section>
        );
    }

    if (
        enrichmentQuery.isError ||
        !enrichmentQuery.data
    ) {
        return (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                Não foi possível carregar o enriquecimento NIF.PT.
            </section>
        );
    }

    const {
        configured,
        enrichment,
    } =
        enrichmentQuery
            .data
            .data;

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-indigo-500" />

                        <h2 className="font-semibold text-slate-900">
                            Enriquecimento NIF.PT
                        </h2>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        Dados empresariais complementares para o NIF {nif}.
                    </p>
                </div>

                {configured && (
                    <button
                        type="button"
                        disabled={
                            lookupMutation.isPending
                        }
                        onClick={() =>
                            lookupMutation.mutate(
                                enrichment
                                    ?.lookup_status ===
                                    "success",
                            )
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {lookupMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : enrichment?.lookup_status ===
                          "success" ? (
                            <RefreshCw className="h-4 w-4" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}

                        {enrichment?.lookup_status ===
                        "success"
                            ? "Atualizar dados"
                            : "Consultar NIF.PT"}
                    </button>
                )}
            </div>

            {!configured ? (
                <div className="p-5">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        A integração NIF.PT ainda não está configurada. Defina
                        <strong> NIF_PT_KEY </strong>
                        no ambiente da aplicação.
                    </div>
                </div>
            ) : lookupMutation.isError ? (
                <div className="px-5 pt-5">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage(
                            lookupMutation.error,
                        )}
                    </div>
                </div>
            ) : null}

            {lookupMutation.isSuccess && (
                <div className="px-5 pt-5">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {
                            lookupMutation
                                .data
                                .message
                        }
                    </div>
                </div>
            )}

            {!enrichment ? (
                <div className="px-6 py-12 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-slate-300" />

                    <h3 className="mt-4 font-semibold text-slate-900">
                        Operador ainda não enriquecido
                    </h3>

                    <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                        A consulta só será feita quando utilizar o botão acima. Abrir esta página não consome créditos NIF.PT.
                    </p>
                </div>
            ) : (
                <EnrichmentData
                    enrichment={
                        enrichment
                    }
                />
            )}
        </section>
    );
}

function EnrichmentData({
    enrichment,
}: {
    enrichment: BackofficeNifEnrichment;
}) {
    const email =
        contactValue(
            enrichment.contacts,
            [
                "email",
                "emails",
                "mail",
            ],
        );

    const phone =
        contactValue(
            enrichment.contacts,
            [
                "phone",
                "phones",
                "telephone",
                "telefone",
            ],
        );

    const website =
        contactValue(
            enrichment.contacts,
            [
                "website",
                "web",
                "url",
            ],
        );

    return (
        <div>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                <Info
                    label="Denominação"
                    value={
                        enrichment.title ??
                        "—"
                    }
                />

                <Info
                    label="CAE"
                    value={
                        enrichment.cae ??
                        "—"
                    }
                />

                <Info
                    label="Estado"
                    value={
                        enrichment.company_status ??
                        "—"
                    }
                />

                <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Cache
                    </div>

                    <div className="mt-2">
                        <span
                            className={[
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                enrichment.cache_is_fresh
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700",
                            ].join(
                                " ",
                            )}
                        >
                            {enrichment.cache_is_fresh
                                ? "Atual"
                                : "Expirado"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-100 p-5">
                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <MapPin className="h-4 w-4 text-indigo-500" />
                            Localização
                        </div>

                        <div className="mt-3 text-sm text-slate-600">
                            {enrichment.address ??
                                "Morada não disponível"}
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                            {postalCode(
                                enrichment,
                            )}
                            {enrichment.city
                                ? ` ${enrichment.city}`
                                : ""}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900">
                            Contactos
                        </div>

                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                            <Contact
                                icon={Mail}
                                value={
                                    email
                                }
                            />

                            <Contact
                                icon={Phone}
                                value={
                                    phone
                                }
                            />

                            <Contact
                                icon={Webhook}
                                value={
                                    website
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            {enrichment.activity && (
                <div className="border-t border-slate-100 px-5 py-4">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Atividade
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        {enrichment.activity}
                    </p>
                </div>
            )}

            <div className="border-t border-slate-100 px-5 py-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                        label="Consultas externas"
                        value={String(
                            enrichment.lookup_count,
                        )}
                    />

                    <Info
                        label="Último sucesso"
                        value={
                            enrichment.last_success_at
                                ? formatDateTime(
                                      enrichment.last_success_at,
                                  )
                                : "—"
                        }
                    />

                    <Info
                        label="Cache expira"
                        value={
                            enrichment.cache_expires_at
                                ? formatDateTime(
                                      enrichment.cache_expires_at,
                                  )
                                : "—"
                        }
                    />

                    <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            Validação NIF
                        </div>

                        <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <ShieldCheck
                                className={[
                                    "h-4 w-4",
                                    enrichment.nif_validation
                                        ? "text-emerald-500"
                                        : "text-slate-300",
                                ].join(
                                    " ",
                                )}
                            />

                            {enrichment.nif_validation ===
                            true
                                ? "Válido"
                                : enrichment.nif_validation ===
                                    false
                                  ? "Inválido"
                                  : "—"}
                        </div>
                    </div>
                </div>
            </div>

            {enrichment.last_error && (
                <div className="border-t border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
                    Último erro:{" "}
                    {
                        enrichment.last_error
                    }
                </div>
            )}
        </div>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-1.5 text-sm font-semibold text-slate-700">
                {value}
            </div>
        </div>
    );
}

function Contact({
    icon: Icon,
    value,
}: {
    icon: typeof Mail;
    value: string | null;
}) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-slate-400" />

            <span>
                {value ?? "—"}
            </span>
        </div>
    );
}

function contactValue(
    contacts: Record<string, unknown> | null,
    keys: string[],
): string | null {
    if (!contacts) {
        return null;
    }

    for (const key of keys) {
        const value =
            contacts[key];

        if (
            typeof value ===
                "string" &&
            value.trim() !== ""
        ) {
            return value;
        }

        if (
            typeof value ===
                "number"
        ) {
            return String(
                value,
            );
        }

        if (
            Array.isArray(
                value,
            )
        ) {
            const values =
                value
                    .filter(
                        (
                            item,
                        ) =>
                            typeof item ===
                                "string" ||
                            typeof item ===
                                "number",
                    )
                    .map(
                        (
                            item,
                        ) =>
                            String(
                                item,
                            ),
                    );

            if (
                values.length >
                0
            ) {
                return values.join(
                    ", ",
                );
            }
        }
    }

    return null;
}

function postalCode(
    enrichment: BackofficeNifEnrichment,
): string {
    if (
        !enrichment.pc4 &&
        !enrichment.pc3
    ) {
        return "";
    }

    return [
        enrichment.pc4,
        enrichment.pc3,
    ]
        .filter(Boolean)
        .join("-");
}

function formatDateTime(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle: "short",
            timeStyle: "short",
        },
    ).format(
        new Date(
            value,
        ),
    );
}

function errorMessage(
    error: unknown,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const message =
            error.response
                ?.data
                ?.message;

        if (
            typeof message ===
            "string"
        ) {
            return message;
        }
    }

    return "Não foi possível consultar o NIF.PT.";
}
