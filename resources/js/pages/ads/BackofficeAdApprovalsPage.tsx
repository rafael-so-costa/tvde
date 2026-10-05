import axios from "axios";
import {
    AlertTriangle,
    BadgeEuro,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock3,
    ExternalLink,
    LoaderCircle,
    MessageSquareWarning,
    SearchCheck,
    ShieldCheck,
    X,
    XCircle,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    useState,
} from "react";
import {
    Link,
} from "react-router-dom";

import AdStatusBadge from "../../components/ads/AdStatusBadge";
import api from "../../lib/api";

import type {
    AdCampaignSummary,
} from "../../types/backofficeAds";

interface ApprovalsResponse {
    data: AdCampaignSummary[];
}

interface ValidationResponse {
    message?: string;

    errors?: Record<
        string,
        string[]
    >;
}

type ReviewAction =
    | "approve"
    | "request_changes"
    | "reject";

const textareaClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export default function BackofficeAdApprovalsPage() {
    const queryClient =
        useQueryClient();

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
        selectedCampaign,
        setSelectedCampaign,
    ] = useState<
        AdCampaignSummary | null
    >(null);

    const [
        reviewAction,
        setReviewAction,
    ] = useState<
        ReviewAction | null
    >(null);

    const [
        reason,
        setReason,
    ] = useState("");

    const [
        notes,
        setNotes,
    ] = useState("");

    const [
        decisionError,
        setDecisionError,
    ] = useState<
        string | null
    >(null);

    const query =
        useQuery({
            queryKey: [
                "backoffice",
                "ads",
                "approvals",
            ],

            queryFn:
                async () =>
                    (
                        await api.get(
                            "/api/backoffice/ads/campaigns",
                            {
                                params: {
                                    statuses: [
                                        "submitted",
                                        "in_review",
                                    ],

                                    per_page:
                                        100,
                                },
                            },
                        )
                    ).data as ApprovalsResponse,
        });

    const actionMutation =
        useMutation({
            mutationFn:
                async ({
                    campaignId,
                    action,
                    reason,
                    notes,
                }: {
                    campaignId: string;
                    action: string;
                    reason?: string | null;
                    notes?: string | null;
                }) =>
                    api.post(
                        `/api/backoffice/ads/campaigns/${campaignId}/action`,
                        {
                            action,
                            reason:
                                reason ||
                                null,
                            notes:
                                notes ||
                                null,
                        },
                    ),

            onMutate:
                () => {
                    setErrorMessage(
                        null,
                    );

                    setDecisionError(
                        null,
                    );
                },

            onSuccess:
                async (
                    _response,
                    variables,
                ) => {
                    setSuccessMessage(
                        actionSuccessMessage(
                            variables.action,
                        ),
                    );

                    closeDecision();

                    await Promise.all([
                        queryClient.invalidateQueries(
                            {
                                queryKey: [
                                    "backoffice",
                                    "ads",
                                    "approvals",
                                ],
                            },
                        ),

                        queryClient.invalidateQueries(
                            {
                                queryKey: [
                                    "backoffice",
                                    "ads",
                                    "campaigns",
                                ],
                            },
                        ),

                        queryClient.invalidateQueries(
                            {
                                queryKey: [
                                    "backoffice",
                                    "ads",
                                    "dashboard",
                                ],
                            },
                        ),
                    ]);
                },

            onError:
                (
                    error: unknown,
                ) => {
                    const message =
                        parseApiError(
                            error,
                        );

                    if (
                        reviewAction
                    ) {
                        setDecisionError(
                            message,
                        );

                        return;
                    }

                    setErrorMessage(
                        message,
                    );
                },
        });

    function startReview(
        campaign: AdCampaignSummary,
    ) {
        setSuccessMessage(
            null,
        );

        actionMutation.mutate({
            campaignId:
                campaign.id,

            action:
                "start_review",
        });
    }

    function openDecision(
        campaign: AdCampaignSummary,
        action: ReviewAction,
    ) {
        setSelectedCampaign(
            campaign,
        );

        setReviewAction(
            action,
        );

        setReason("");
        setNotes("");

        setDecisionError(
            null,
        );

        setSuccessMessage(
            null,
        );
    }

    function closeDecision() {
        setSelectedCampaign(
            null,
        );

        setReviewAction(
            null,
        );

        setReason("");
        setNotes("");

        setDecisionError(
            null,
        );
    }

    function confirmDecision() {
        if (
            !selectedCampaign ||
            !reviewAction
        ) {
            return;
        }

        if (
            [
                "request_changes",
                "reject",
            ].includes(
                reviewAction,
            ) &&
            !reason.trim()
        ) {
            setDecisionError(
                "Informe o motivo desta decisão antes de continuar.",
            );

            return;
        }

        actionMutation.mutate({
            campaignId:
                selectedCampaign.id,

            action:
                reviewAction,

            reason:
                reason.trim() ||
                null,

            notes:
                notes.trim() ||
                null,
        });
    }

    const campaigns =
        Array.isArray(
            query.data?.data,
        )
            ? query.data.data
            : [];

    const submitted =
        campaigns.filter(
            (campaign) =>
                campaign.status ===
                "submitted",
        ).length;

    const inReview =
        campaigns.filter(
            (campaign) =>
                campaign.status ===
                "in_review",
        ).length;

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-7">
            <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Aprovações
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Analise campanhas submetidas antes de
                        autorizar pagamento, agendamento ou
                        publicação no FrotaPro Ads.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <SummaryBadge
                        label="Submetidas"
                        value={
                            submitted
                        }
                        icon={
                            Clock3
                        }
                    />

                    <SummaryBadge
                        label="Em análise"
                        value={
                            inReview
                        }
                        icon={
                            SearchCheck
                        }
                    />
                </div>
            </header>

            {successMessage && (
                <div
                    role="status"
                    className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-emerald-900">
                            Operação concluída
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
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm"
                >
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                    <div>
                        <div className="font-semibold text-red-900">
                            Não foi possível concluir a operação
                        </div>

                        <p className="mt-1 text-sm text-red-700">
                            {
                                errorMessage
                            }
                        </p>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm leading-6 text-indigo-900">
                <strong>
                    Fluxo recomendado:
                </strong>{" "}
                abra a campanha para confirmar criativos,
                destino, público, zonas e período antes da
                decisão final. A aprovação poderá gerar
                cobrança ou ativar/agendar diretamente a
                campanha, conforme a configuração comercial.
            </div>

            {query.isLoading ? (
                <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white">
                    <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : query.isError ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-14 text-center">
                    <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />

                    <h2 className="mt-4 font-bold text-red-900">
                        Não foi possível carregar as aprovações
                    </h2>

                    <p className="mt-2 text-sm text-red-700">
                        {parseApiError(
                            query.error,
                        )}
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
            ) : campaigns.length ===
              0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <ShieldCheck className="h-7 w-7" />
                    </div>

                    <h2 className="mt-5 text-lg font-bold text-slate-900">
                        Nenhuma campanha pendente
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Todas as campanhas submetidas já foram
                        analisadas. Novos pedidos aparecerão
                        automaticamente nesta fila.
                    </p>
                </div>
            ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                    {campaigns.map(
                        (
                            campaign,
                        ) => (
                            <CampaignApprovalCard
                                key={
                                    campaign.id
                                }
                                campaign={
                                    campaign
                                }
                                pending={
                                    actionMutation.isPending
                                }
                                onStartReview={() =>
                                    startReview(
                                        campaign,
                                    )
                                }
                                onApprove={() =>
                                    openDecision(
                                        campaign,
                                        "approve",
                                    )
                                }
                                onRequestChanges={() =>
                                    openDecision(
                                        campaign,
                                        "request_changes",
                                    )
                                }
                                onReject={() =>
                                    openDecision(
                                        campaign,
                                        "reject",
                                    )
                                }
                            />
                        ),
                    )}
                </div>
            )}

            {selectedCampaign &&
                reviewAction && (
                    <DecisionModal
                        campaign={
                            selectedCampaign
                        }
                        action={
                            reviewAction
                        }
                        reason={
                            reason
                        }
                        notes={
                            notes
                        }
                        error={
                            decisionError
                        }
                        pending={
                            actionMutation.isPending
                        }
                        onReasonChange={
                            setReason
                        }
                        onNotesChange={
                            setNotes
                        }
                        onClose={
                            closeDecision
                        }
                        onConfirm={
                            confirmDecision
                        }
                    />
                )}
        </div>
    );
}

function CampaignApprovalCard({
    campaign,
    pending,
    onStartReview,
    onApprove,
    onRequestChanges,
    onReject,
}: {
    campaign: AdCampaignSummary;
    pending: boolean;
    onStartReview: () => void;
    onApprove: () => void;
    onRequestChanges: () => void;
    onReject: () => void;
}) {
    return (
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-lg font-bold text-slate-950">
                                {
                                    campaign.name
                                }
                            </h2>

                            <AdStatusBadge
                                status={
                                    campaign.status
                                }
                            />
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {
                                campaign.title
                            }
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoBox
                        label="Anunciante"
                        value={
                            campaign
                                .advertiser
                                ?.name ??
                            "Sem anunciante"
                        }
                    />

                    <InfoBox
                        label="Origem"
                        value={
                            sourceLabel(
                                campaign.source,
                            )
                        }
                    />

                    <InfoBox
                        label="Tipo"
                        value={
                            kindLabel(
                                campaign.kind,
                            )
                        }
                    />

                    <InfoBox
                        label="Categoria"
                        value={
                            campaign
                                .category
                                ?.name ??
                            "Sem categoria"
                        }
                    />
                </div>
            </div>

            <div className="grid gap-4 border-b border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-3">
                <SmallMetric
                    icon={
                        BadgeEuro
                    }
                    label="Valor"
                    value={`${campaign.quoted_price.toLocaleString(
                        "pt-PT",
                        {
                            minimumFractionDigits:
                                2,
                            maximumFractionDigits:
                                2,
                        },
                    )} ${campaign.currency}`}
                />

                <SmallMetric
                    icon={
                        CalendarDays
                    }
                    label="Início"
                    value={
                        formatDate(
                            campaign.start_at,
                        )
                    }
                />

                <SmallMetric
                    icon={
                        CalendarDays
                    }
                    label="Fim"
                    value={
                        formatDate(
                            campaign.end_at,
                        )
                    }
                />
            </div>

            <div className="space-y-3 p-5">
                <Link
                    to={`/backoffice/ads/campanhas/${campaign.id}`}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                    <ExternalLink className="h-4 w-4" />

                    Abrir campanha completa
                </Link>

                <div className="grid gap-2 sm:grid-cols-2">
                    {campaign.status ===
                        "submitted" && (
                        <button
                            type="button"
                            disabled={
                                pending
                            }
                            onClick={
                                onStartReview
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                        >
                            <SearchCheck className="h-4 w-4" />

                            Iniciar análise
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={
                            pending
                        }
                        onClick={
                            onApprove
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <Check className="h-4 w-4" />

                        Aprovar
                    </button>

                    <button
                        type="button"
                        disabled={
                            pending
                        }
                        onClick={
                            onRequestChanges
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                        <MessageSquareWarning className="h-4 w-4" />

                        Solicitar alterações
                    </button>

                    <button
                        type="button"
                        disabled={
                            pending
                        }
                        onClick={
                            onReject
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                        <XCircle className="h-4 w-4" />

                        Rejeitar
                    </button>
                </div>
            </div>
        </article>
    );
}

function DecisionModal({
    campaign,
    action,
    reason,
    notes,
    error,
    pending,
    onReasonChange,
    onNotesChange,
    onClose,
    onConfirm,
}: {
    campaign: AdCampaignSummary;
    action: ReviewAction;
    reason: string;
    notes: string;
    error: string | null;
    pending: boolean;
    onReasonChange: (
        value: string,
    ) => void;
    onNotesChange: (
        value: string,
    ) => void;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const config =
        decisionConfig(
            action,
        );

    const needsReason =
        action ===
            "request_changes" ||
        action ===
            "reject";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                    <div>
                        <div
                            className={`text-sm font-semibold ${config.textClass}`}
                        >
                            {
                                config.eyebrow
                            }
                        </div>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            {
                                config.title
                            }
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Campanha:{" "}
                            <strong className="text-slate-700">
                                {
                                    campaign.name
                                }
                            </strong>
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            pending
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        {
                            config.description
                        }
                    </p>

                    {needsReason && (
                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-800">
                                Motivo{" "}
                                <span className="text-red-500">
                                    *
                                </span>
                            </span>

                            <textarea
                                value={
                                    reason
                                }
                                onChange={(
                                    event,
                                ) =>
                                    onReasonChange(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                rows={
                                    4
                                }
                                placeholder={
                                    action ===
                                    "request_changes"
                                        ? "Explique exatamente o que deve ser corrigido antes de uma nova submissão..."
                                        : "Explique o motivo da rejeição..."
                                }
                                className={
                                    textareaClass
                                }
                            />
                        </label>
                    )}

                    <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-800">
                            Notas internas
                        </span>

                        <textarea
                            value={
                                notes
                            }
                            onChange={(
                                event,
                            ) =>
                                onNotesChange(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            rows={
                                3
                            }
                            placeholder="Observações adicionais da revisão. Opcional."
                            className={
                                textareaClass
                            }
                        />

                        <span className="mt-2 block text-xs text-slate-500">
                            Estas notas ficam
                            registadas no histórico
                            da revisão.
                        </span>
                    </label>

                    {error && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                            {
                                error
                            }
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            pending
                        }
                        className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={
                            onConfirm
                        }
                        disabled={
                            pending
                        }
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50 ${config.buttonClass}`}
                    >
                        {pending && (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}

                        {
                            config.confirmLabel
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryBadge({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Clock3;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Icon className="h-5 w-5 text-indigo-600" />

            <div>
                <div className="text-lg font-bold leading-none text-slate-950">
                    {
                        value
                    }
                </div>

                <div className="mt-1 text-xs text-slate-500">
                    {
                        label
                    }
                </div>
            </div>
        </div>
    );
}

function InfoBox({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {
                    label
                }
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-800">
                {
                    value
                }
            </div>
        </div>
    );
}

function SmallMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof BadgeEuro;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />

            <div>
                <div className="text-xs text-slate-400">
                    {
                        label
                    }
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-700">
                    {
                        value
                    }
                </div>
            </div>
        </div>
    );
}

function decisionConfig(
    action: ReviewAction,
) {
    if (
        action ===
        "approve"
    ) {
        return {
            eyebrow:
                "Aprovação",

            title:
                "Aprovar campanha",

            description:
                "Ao aprovar, uma campanha paga seguirá para pagamento. Se não exigir pagamento, poderá ser ativada imediatamente ou agendada de acordo com a data de início.",

            confirmLabel:
                "Confirmar aprovação",

            buttonClass:
                "bg-emerald-600 hover:bg-emerald-700",

            textClass:
                "text-emerald-600",
        };
    }

    if (
        action ===
        "request_changes"
    ) {
        return {
            eyebrow:
                "Revisão",

            title:
                "Solicitar alterações",

            description:
                "A campanha voltará para o estado de alterações solicitadas. Informe claramente o que precisa ser corrigido antes de uma nova submissão.",

            confirmLabel:
                "Solicitar alterações",

            buttonClass:
                "bg-amber-600 hover:bg-amber-700",

            textClass:
                "text-amber-600",
        };
    }

    return {
        eyebrow:
            "Rejeição",

        title:
            "Rejeitar campanha",

        description:
            "A campanha será rejeitada e deixará a fila de aprovação. Esta decisão e o respetivo motivo ficarão registados no histórico.",

        confirmLabel:
            "Confirmar rejeição",

        buttonClass:
            "bg-red-600 hover:bg-red-700",

        textClass:
            "text-red-600",
    };
}

function sourceLabel(
    source: AdCampaignSummary["source"],
): string {
    const labels = {
        saas:
            "FrotaPro / SaaS",

        tenant:
            "Gestor de frota",

        external:
            "Parceiro externo",
    };

    return labels[
        source
    ];
}

function kindLabel(
    kind: AdCampaignSummary["kind"],
): string {
    const labels = {
        house:
            "Campanha FrotaPro",

        tenant_internal:
            "Comunicação interna",

        commercial:
            "Comercial",
    };

    return labels[
        kind
    ];
}

function formatDate(
    value: string | null,
): string {
    if (
        !value
    ) {
        return "Sem data";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:
                "short",

            timeStyle:
                "short",
        },
    ).format(
        new Date(
            value,
        ),
    );
}

function actionSuccessMessage(
    action: string,
): string {
    const messages: Record<
        string,
        string
    > = {
        start_review:
            "A análise da campanha foi iniciada.",

        approve:
            "Campanha aprovada com sucesso.",

        request_changes:
            "As alterações foram solicitadas ao anunciante.",

        reject:
            "Campanha rejeitada com sucesso.",
    };

    return (
        messages[
            action
        ] ??
        "Campanha atualizada com sucesso."
    );
}

function parseApiError(
    error: unknown,
): string {
    if (
        axios.isAxiosError<ValidationResponse>(
            error,
        )
    ) {
        const data =
            error.response
                ?.data;

        const errors =
            data?.errors;

        if (
            errors
        ) {
            const first =
                Object.values(
                    errors,
                )
                    .flat()
                    .find(
                        Boolean,
                    );

            if (
                first
            ) {
                return first;
            }
        }

        if (
            data?.message
        ) {
            return data.message;
        }

        if (
            error.response
                ?.status ===
            403
        ) {
            return "Não tem permissão para executar esta decisão.";
        }

        if (
            error.response
                ?.status &&
            error.response
                .status >=
                500
        ) {
            return "O servidor encontrou um erro ao processar a decisão.";
        }
    }

    if (
        error instanceof
            Error &&
        error.message
    ) {
        return error.message;
    }

    return "Não foi possível concluir a operação.";
}
