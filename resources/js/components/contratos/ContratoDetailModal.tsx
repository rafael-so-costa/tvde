import axios from "axios";

import {
    useEffect,
    useState,
} from "react";

import {
    useQuery,
} from "@tanstack/react-query";

import {
    useNavigate,
} from "react-router-dom";

import {
    AlertCircle,
    Check,
    CheckCircle2,
    Circle,
    ClipboardCheck,
    Download,
    Eye,
    FileClock,
    FileOutput,
    FileSignature,
    History,
    KeyRound,
    LoaderCircle,
    ShieldCheck,
    Trash2,
    X,
} from "lucide-react";

import api from "../../lib/api";

import ChecklistFormModal from "../checklists/ChecklistFormModal";

import {
    downloadAuthenticatedFile,
    fetchAuthenticatedFile,
} from "../../lib/authenticatedFile";

import type {
    ChecklistRecord,
} from "../../types/checklist";

import type {
    Contrato,
    ContratoProcessItem,
} from "../../types/contrato";

interface Props {
    id: string;

    onClose:
        () => void;

    onChanged:
        () => Promise<void>;
}

type Tab =
    | "resumo"
    | "processo"
    | "assinaturas"
    | "historico";

const automaticTypes = [
    "assinatura",
    "gerar_documento",
];

function apiError(
    error: unknown,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const errors =
            error.response
                ?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                "object"
        ) {
            const first =
                Object.values(
                    errors,
                )
                    .flat()
                    .find(
                        (
                            value,
                        ) =>
                            typeof value ===
                            "string",
                    );

            if (
                typeof first ===
                "string"
            ) {
                return first;
            }
        }

        return (
            error.response
                ?.data
                ?.message ??
            "Não foi possível concluir a operação."
        );
    }

    if (
        error instanceof Error
    ) {
        return error.message;
    }

    return "Não foi possível concluir a operação.";
}

export default function ContratoDetailModal({
    id,
    onClose,
    onChanged,
}: Props) {
    const navigate =
        useNavigate();

    const [
        tab,
        setTab,
    ] =
        useState<Tab>(
            "resumo",
        );

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    const [
        completing,
        setCompleting,
    ] =
        useState<
            string | null
        >(null);

    const [
        resending,
        setResending,
    ] =
        useState<
            string | null
        >(null);

    const [
        generatingPdf,
        setGeneratingPdf,
    ] =
        useState(false);

    const [
        previewingPdf,
        setPreviewingPdf,
    ] =
        useState(false);

    const [
        downloadingPdf,
        setDownloadingPdf,
    ] =
        useState(false);

    const [
        pdfPreviewUrl,
        setPdfPreviewUrl,
    ] =
        useState<
            string | null
        >(null);

    const [
        ending,
        setEnding,
    ] =
        useState(false);

    const [
        deleting,
        setDeleting,
    ] =
        useState(false);

    const [
        endDate,
        setEndDate,
    ] =
        useState("");

    const [
        actionItem,
        setActionItem,
    ] =
        useState<
            ContratoProcessItem | null
        >(null);

    const [
        activeChecklist,
        setActiveChecklist,
    ] =
        useState<
            ChecklistRecord | null
        >(null);

    const [
        startingChecklist,
        setStartingChecklist,
    ] =
        useState<
            string | null
        >(null);

    const detailQuery =
        useQuery({
            queryKey: [
                "contrato",
                id,
            ],

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            `/api/contratos/${id}`,
                        );

                    return response
                        .data
                        .data as Contrato;
                },
        });

    const contrato =
        detailQuery.data;

    useEffect(
        () => {
            setEndDate(
                contrato
                    ?.data_fim
                    ?.slice(
                        0,
                        10,
                    ) ??
                    "",
            );
        },
        [
            contrato
                ?.data_fim,
        ],
    );

    useEffect(
        () => {
            return () => {
                if (
                    pdfPreviewUrl
                ) {
                    URL.revokeObjectURL(
                        pdfPreviewUrl,
                    );
                }
            };
        },
        [
            pdfPreviewUrl,
        ],
    );

    async function refresh() {
        await Promise.all([
            detailQuery.refetch(),
            onChanged(),
        ]);
    }

    async function completeItem(
        item:
            ContratoProcessItem,
    ) {
        setCompleting(
            item.id,
        );

        setError(
            null,
        );

        try {
            await api.patch(
                `/api/contratos/${id}/checklist-processo/items/${item.id}/concluir`,
                {
                    resultado: {
                        origem:
                            "interface_contratos",
                    },
                },
            );

            await refresh();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setCompleting(
                null,
            );
        }
    }

    async function startVehicleChecklist(
        item:
            ContratoProcessItem,
    ) {
        setStartingChecklist(
            item.id,
        );

        setError(
            null,
        );

        try {
            const response =
                await api.post(
                    `/api/checklists/pendentes/${item.id}/iniciar`,
                );

            setActiveChecklist(
                response.data
                    .data as ChecklistRecord,
            );

            await refresh();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setStartingChecklist(
                null,
            );
        }
    }

    async function resendSignature(
        signatureId:
            string,
    ) {
        setResending(
            signatureId,
        );

        setError(
            null,
        );

        try {
            await api.post(
                `/api/contratos/${id}/assinaturas/${signatureId}/reenviar`,
            );

            await refresh();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setResending(
                null,
            );
        }
    }

    async function generatePdf() {
        setGeneratingPdf(
            true,
        );

        setError(
            null,
        );

        try {
            await api.post(
                `/api/contratos/${id}/pdf`,
            );

            await refresh();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setGeneratingPdf(
                false,
            );
        }
    }

    async function previewPdf() {
        setPreviewingPdf(
            true,
        );

        setError(
            null,
        );

        try {
            const file =
                await fetchAuthenticatedFile(
                    `/api/contratos/${id}/pdf`,
                );

            setPdfPreviewUrl(
                (
                    current,
                ) => {
                    if (
                        current
                    ) {
                        URL.revokeObjectURL(
                            current,
                        );
                    }

                    return file.url;
                },
            );
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setPreviewingPdf(
                false,
            );
        }
    }

    async function downloadPdf() {
        setDownloadingPdf(
            true,
        );

        setError(
            null,
        );

        try {
            await downloadAuthenticatedFile(
                `/api/contratos/${id}/pdf/download`,
                `contrato-${
                    contrato
                        ?.documento
                        ?.codigo ??
                    id.slice(
                        0,
                        8,
                    )
                }.pdf`,
            );
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setDownloadingPdf(
                false,
            );
        }
    }

    async function endContract() {
        if (
            !window.confirm(
                "Encerrar este contrato? A associação ativa com o veículo será terminada.",
            )
        ) {
            return;
        }

        setEnding(
            true,
        );

        setError(
            null,
        );

        try {
            await api.patch(
                `/api/contratos/${id}/encerrar`,
                {
                    data_fim:
                        endDate ||
                        null,
                },
            );

            await refresh();

            setTab(
                "processo",
            );
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setEnding(
                false,
            );
        }
    }

    async function deleteContract() {
        if (
            !window.confirm(
                "Eliminar este contrato?",
            )
        ) {
            return;
        }

        setDeleting(
            true,
        );

        setError(
            null,
        );

        try {
            await api.delete(
                `/api/contratos/${id}`,
            );

            await onChanged();

            onClose();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );

            setDeleting(
                false,
            );
        }
    }

    function closePdfPreview() {
        setPdfPreviewUrl(
            null,
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
                <button
                    type="button"
                    aria-label="Fechar"
                    onClick={
                        onClose
                    }
                    className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
                />

                <div className="relative flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                Contrato
                                {contrato
                                    ?.documento
                                    ?.codigo
                                    ? ` · ${contrato.documento.codigo}`
                                    : ""}
                            </p>

                            <h2 className="mt-1 truncate text-xl font-bold text-slate-950">
                                {contrato
                                    ?.tipo_contrato
                                    ?.nome ??
                                    contrato
                                        ?.template
                                        ?.nome ??
                                    "Detalhes do contrato"}
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </header>

                    {detailQuery
                        .isLoading ? (
                        <div className="flex justify-center py-24">
                            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : detailQuery
                          .isError ||
                      !contrato ? (
                        <div className="p-8 text-center">
                            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

                            <p className="mt-3 text-slate-600">
                                Não foi possível carregar o contrato.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-slate-200 px-5 sm:px-7">
                                <div className="flex gap-5 overflow-x-auto">
                                    <TabButton
                                        active={
                                            tab ===
                                            "resumo"
                                        }
                                        onClick={() =>
                                            setTab(
                                                "resumo",
                                            )
                                        }
                                    >
                                        Resumo
                                    </TabButton>

                                    <TabButton
                                        active={
                                            tab ===
                                            "processo"
                                        }
                                        onClick={() =>
                                            setTab(
                                                "processo",
                                            )
                                        }
                                    >
                                        Checklist
                                    </TabButton>

                                    <TabButton
                                        active={
                                            tab ===
                                            "assinaturas"
                                        }
                                        onClick={() =>
                                            setTab(
                                                "assinaturas",
                                            )
                                        }
                                    >
                                        Assinaturas
                                    </TabButton>

                                    <TabButton
                                        active={
                                            tab ===
                                            "historico"
                                        }
                                        onClick={() =>
                                            setTab(
                                                "historico",
                                            )
                                        }
                                    >
                                        Histórico
                                    </TabButton>
                                </div>
                            </div>

                            <main className="flex-1 overflow-y-auto p-5 sm:p-7">
                                {error && (
                                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        {
                                            error
                                        }
                                    </div>
                                )}

                                {tab ===
                                    "resumo" && (
                                    <SummaryTab
                                        contrato={
                                            contrato
                                        }
                                        endDate={
                                            endDate
                                        }
                                        ending={
                                            ending
                                        }
                                        deleting={
                                            deleting
                                        }
                                        generatingPdf={
                                            generatingPdf
                                        }
                                        previewingPdf={
                                            previewingPdf
                                        }
                                        downloadingPdf={
                                            downloadingPdf
                                        }
                                        onGeneratePdf={
                                            generatePdf
                                        }
                                        onPreviewPdf={
                                            previewPdf
                                        }
                                        onDownloadPdf={
                                            downloadPdf
                                        }
                                        onEndDate={
                                            setEndDate
                                        }
                                        onEnd={
                                            endContract
                                        }
                                        onDelete={
                                            deleteContract
                                        }
                                    />
                                )}

                                {tab ===
                                    "processo" && (
                                    <ProcessTab
                                        contrato={
                                            contrato
                                        }
                                        completing={
                                            completing
                                        }
                                        startingChecklist={
                                            startingChecklist
                                        }
                                        onComplete={
                                            completeItem
                                        }
                                        onSystemAction={(
                                            item,
                                        ) =>
                                            setActionItem(
                                                item,
                                            )
                                        }
                                        onStartChecklist={
                                            startVehicleChecklist
                                        }
                                    />
                                )}

                                {tab ===
                                    "assinaturas" && (
                                    <SignaturesTab
                                        contrato={
                                            contrato
                                        }
                                        resending={
                                            resending
                                        }
                                        onResend={
                                            resendSignature
                                        }
                                    />
                                )}

                                {tab ===
                                    "historico" && (
                                    <HistoryTab
                                        contrato={
                                            contrato
                                        }
                                    />
                                )}
                            </main>
                        </>
                    )}
                </div>
            </div>

            {actionItem &&
                contrato && (
                <DriverAccessActionModal
                    contratoId={
                        contrato.id
                    }
                    item={
                        actionItem
                    }
                    onClose={() =>
                        setActionItem(
                            null,
                        )
                    }
                    onUpdated={async () => {
                        setActionItem(
                            null,
                        );

                        await refresh();
                    }}
                    onOpenMotoristas={() => {
                        setActionItem(
                            null,
                        );

                        onClose();

                        navigate(
                            "/motoristas",
                        );
                    }}
                />
            )}

            {activeChecklist &&
                contrato && (
                <ChecklistFormModal
                    open={
                        true
                    }
                    tipo={
                        activeChecklist.tipo
                    }
                    record={
                        activeChecklist
                    }
                    records={[
                        ...(
                            activeChecklist
                                .entrega_vinculada
                                ? [
                                      activeChecklist
                                          .entrega_vinculada,
                                  ]
                                : []
                        ),

                        activeChecklist,
                    ]}
                    motoristas={
                        contrato.motorista
                            ? [
                                  contrato.motorista,
                              ]
                            : []
                    }
                    veiculos={
                        contrato.veiculo
                            ? [
                                  contrato.veiculo,
                              ]
                            : []
                    }
                    lockEntities
                    onClose={() =>
                        setActiveChecklist(
                            null,
                        )
                    }
                    onSuccess={async () => {
                        setActiveChecklist(
                            null,
                        );

                        await refresh();
                    }}
                />
            )}

            {pdfPreviewUrl && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
                    <button
                        type="button"
                        aria-label="Fechar visualização do PDF"
                        onClick={
                            closePdfPreview
                        }
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    />

                    <div className="relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                            <div className="min-w-0">
                                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                    Contrato
                                    {contrato
                                        ?.documento
                                        ?.codigo
                                        ? ` ${contrato.documento.codigo}`
                                        : ""}
                                </div>

                                <div className="mt-1 truncate font-semibold text-slate-950">
                                    {contrato
                                        ?.tipo_contrato
                                        ?.nome ??
                                        contrato
                                            ?.template
                                            ?.nome ??
                                        "Documento PDF"}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closePdfPreview
                                }
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </header>

                        <iframe
                            src={
                                pdfPreviewUrl
                            }
                            title="Visualização do contrato"
                            className="min-h-0 flex-1 bg-slate-100"
                        />
                    </div>
                </div>
            )}
        </>
    );
}

function SummaryTab({
    contrato,
    endDate,
    ending,
    deleting,
    generatingPdf,
    previewingPdf,
    downloadingPdf,
    onGeneratePdf,
    onPreviewPdf,
    onDownloadPdf,
    onEndDate,
    onEnd,
    onDelete,
}: {
    contrato: Contrato;

    endDate:
        string;

    ending:
        boolean;

    deleting:
        boolean;

    generatingPdf:
        boolean;

    previewingPdf:
        boolean;

    downloadingPdf:
        boolean;

    onGeneratePdf:
        () => Promise<void>;

    onPreviewPdf:
        () => Promise<void>;

    onDownloadPdf:
        () => Promise<void>;

    onEndDate:
        (
            value: string,
        ) => void;

    onEnd:
        () => Promise<void>;

    onDelete:
        () => Promise<void>;
}) {
    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <FileOutput className="h-5 w-5 shrink-0 text-indigo-600" />

                            <h3 className="font-semibold text-slate-900">
                                Documento PDF
                            </h3>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                            {contrato
                                .pdf_gerado_url
                                ? `PDF disponível para a versão ${contrato.versao_atual}.`
                                : "Gere o documento final a partir do modelo e dos dados do contrato."}
                        </p>

                        {contrato
                            .hash_documento && (
                            <p
                                title={
                                    contrato
                                        .hash_documento
                                }
                                className="mt-2 max-w-2xl truncate font-mono text-xs text-slate-400"
                            >
                                SHA-256:{" "}
                                {
                                    contrato
                                        .hash_documento
                                }
                            </p>
                        )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={
                                generatingPdf
                            }
                            onClick={
                                onGeneratePdf
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {generatingPdf ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileOutput className="h-4 w-4" />
                            )}

                            {contrato
                                .pdf_gerado_url
                                ? "Regenerar PDF"
                                : "Gerar PDF"}
                        </button>

                        {contrato
                            .pdf_gerado_url && (
                            <>
                                <button
                                    type="button"
                                    disabled={
                                        previewingPdf
                                    }
                                    onClick={
                                        onPreviewPdf
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50"
                                >
                                    {previewingPdf ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}

                                    Visualizar
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        downloadingPdf
                                    }
                                    onClick={
                                        onDownloadPdf
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50"
                                >
                                    {downloadingPdf ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}

                                    Baixar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <InfoCard
                    label="Número"
                    value={
                        contrato
                            .documento
                            ?.codigo ??
                        "—"
                    }
                />

                <InfoCard
                    label="Estado"
                    value={
                        statusLabel(
                            contrato.status,
                        )
                    }
                />

                <InfoCard
                    label="Tipo"
                    value={
                        contrato
                            .tipo_contrato
                            ?.nome ??
                        typeLabel(
                            contrato.tipo,
                        )
                    }
                />

                <InfoCard
                    label="Versão"
                    value={`v${contrato.versao_atual}`}
                />

                <InfoCard
                    label="Modelo"
                    value={
                        contrato
                            .template
                            ?.nome ??
                        "Sem modelo"
                    }
                />
            </div>

            <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900">
                    Entidades
                </h3>

                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                        label="Empresa"
                        value={
                            contrato
                                .empresa
                                ?.nome_empresa ??
                            "—"
                        }
                    />

                    <Info
                        label="Motorista"
                        value={
                            contrato
                                .motorista
                                ?.nome_completo ??
                            "—"
                        }
                    />

                    <Info
                        label="Veículo"
                        value={
                            contrato
                                .veiculo
                                ? `${contrato.veiculo.matricula} · ${contrato.veiculo.marca} ${contrato.veiculo.modelo}`
                                : "—"
                        }
                    />

                    <Info
                        label="Proprietário"
                        value={
                            contrato
                                .proprietario
                                ?.nome_empresa ??
                            contrato
                                .proprietario
                                ?.nome_completo ??
                            "—"
                        }
                    />
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900">
                    Período e valores
                </h3>

                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                        label="Início"
                        value={
                            dateLabel(
                                contrato
                                    .data_inicio,
                            )
                        }
                    />

                    <Info
                        label="Fim"
                        value={
                            dateLabel(
                                contrato
                                    .data_fim,
                            )
                        }
                    />

                    <Info
                        label="Semanal"
                        value={
                            currency(
                                contrato
                                    .valor_semanal,
                            )
                        }
                    />

                    <Info
                        label="Caução"
                        value={
                            currency(
                                contrato
                                    .valor_caucao,
                            )
                        }
                    />

                    <Info
                        label="Diário"
                        value={
                            currency(
                                contrato
                                    .valor_diaria,
                            )
                        }
                    />

                    <Info
                        label="Total"
                        value={
                            currency(
                                contrato
                                    .valor_total,
                            )
                        }
                    />

                    <Info
                        label="Assinado"
                        value={
                            dateTimeLabel(
                                contrato
                                    .data_assinatura,
                            )
                        }
                    />

                    <Info
                        label="Bloqueado"
                        value={
                            contrato
                                .bloqueado
                                ? "Sim"
                                : "Não"
                        }
                    />
                </div>
            </section>

            {Object.keys(
                contrato
                    .campos_preenchidos ??
                    {},
            ).length >
                0 && (
                <section className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-900">
                        Campos preenchidos
                    </h3>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {Object.entries(
                            contrato
                                .campos_preenchidos,
                        ).map(
                            ([
                                key,
                                value,
                            ]) => (
                                <div
                                    key={
                                        key
                                    }
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                                >
                                    <div className="text-xs uppercase tracking-wide text-slate-400">
                                        {
                                            key
                                        }
                                    </div>

                                    <div className="mt-1 break-words text-sm text-slate-700">
                                        {typeof value ===
                                        "object"
                                            ? JSON.stringify(
                                                  value,
                                              )
                                            : String(
                                                  value ??
                                                      "—",
                                              )}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                </section>
            )}

            {contrato.status ===
                "assinado" && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <h3 className="font-semibold text-amber-900">
                        Encerrar contrato
                    </h3>

                    <p className="mt-1 text-sm text-amber-700">
                        O encerramento bloqueia o contrato e termina a associação ativa com o veículo.
                    </p>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                            type="date"
                            value={
                                endDate
                            }
                            onChange={(
                                event,
                            ) =>
                                onEndDate(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="h-10 rounded-xl border border-amber-200 bg-white px-3 text-sm"
                        />

                        <button
                            type="button"
                            disabled={
                                ending
                            }
                            onClick={
                                onEnd
                            }
                            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {ending && (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            )}

                            Encerrar contrato
                        </button>
                    </div>
                </section>
            )}

            {!contrato
                .bloqueado &&
                contrato.status !==
                    "encerrado" && (
                    <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
                        <h3 className="font-semibold text-red-900">
                            Eliminar contrato
                        </h3>

                        <p className="mt-1 text-sm text-red-700">
                            Contratos encerrados ou bloqueados não podem ser eliminados.
                        </p>

                        <button
                            type="button"
                            disabled={
                                deleting
                            }
                            onClick={
                                onDelete
                            }
                            className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 disabled:opacity-50"
                        >
                            {deleting ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}

                            Eliminar
                        </button>
                    </section>
                )}
        </div>
    );
}

function ProcessTab({
    contrato,
    completing,
    startingChecklist,
    onComplete,
    onSystemAction,
    onStartChecklist,
}: {
    contrato:
        Contrato;

    completing:
        string | null;

    startingChecklist:
        string | null;

    onComplete:
        (
            item:
                ContratoProcessItem,
        ) => Promise<void>;

    onSystemAction:
        (
            item:
                ContratoProcessItem,
        ) => void;

    onStartChecklist:
        (
            item:
                ContratoProcessItem,
        ) => Promise<void>;
}) {
    const run =
        contrato
            .checklist_process_run;

    if (!run) {
        return (
            <EmptyState
                type="process"
                title="Sem checklist de processo"
                text="O contrato não possui execução de checklist."
            />
        );
    }

    function completed(
        item:
            ContratoProcessItem,
    ): boolean {
        return (
            item.status ===
                "concluido" ||
            item.status ===
                "dispensado"
        );
    }

    return (
        <div className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            {
                                run
                                    .template_nome_snapshot
                            }
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                            Versão{" "}
                            {
                                run
                                    .template_versao_snapshot
                            }
                        </p>
                    </div>

                    <ProcessStatus
                        status={
                            run.status
                        }
                    />
                </div>

                <div className="divide-y divide-slate-100">
                    {run.items.map(
                        (
                            item,
                            index,
                        ) => {
                            const done =
                                completed(
                                    item,
                                );

                            const blocked =
                                run.items
                                    .slice(
                                        0,
                                        index,
                                    )
                                    .some(
                                        (
                                            previous,
                                        ) =>
                                            previous
                                                .obrigatorio &&
                                            !completed(
                                                previous,
                                            ),
                                    );

                            const automatic =
                                automaticTypes.includes(
                                    item.tipo,
                                );

                            const checklistType =
                                String(
                                    item
                                        .configuracao_snapshot
                                        ?.checklist_tipo ??
                                        "entrega",
                                );

                            const action =
                                String(
                                    item
                                        .configuracao_snapshot
                                        ?.action ??
                                        "",
                                );

                            return (
                                <div
                                    key={
                                        item.id
                                    }
                                    className="flex items-center gap-4 p-5"
                                >
                                    <div
                                        className={[
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",

                                            done
                                                ? "bg-emerald-100 text-emerald-700"
                                                : blocked
                                                  ? "bg-slate-100 text-slate-300"
                                                  : "bg-slate-100 text-slate-400",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        {done ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <Circle className="h-4 w-4" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {
                                                item
                                                    .titulo_snapshot
                                            }
                                        </div>

                                        {item
                                            .descricao_snapshot && (
                                            <div className="mt-1 text-sm text-slate-500">
                                                {
                                                    item
                                                        .descricao_snapshot
                                                }
                                            </div>
                                        )}

                                        <div className="mt-1 text-xs text-slate-400">
                                            {
                                                item.tipo
                                            }

                                            {item
                                                .obrigatorio
                                                ? " · obrigatório"
                                                : " · opcional"}
                                        </div>
                                    </div>

                                    {done ? (
                                        <div className="text-right">
                                            <span className="text-xs font-semibold text-emerald-700">
                                                Concluído
                                            </span>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {dateTimeLabel(
                                                    item
                                                        .concluido_em,
                                                )}
                                            </div>
                                        </div>
                                    ) : blocked ? (
                                        <span className="max-w-40 text-right text-xs font-medium text-slate-400">
                                            Aguardando etapas anteriores
                                        </span>
                                    ) : item.tipo ===
                                      "acao_sistema" ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onSystemAction(
                                                    item,
                                                )
                                            }
                                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                        >
                                            <KeyRound className="h-4 w-4" />

                                            {action ===
                                            "motorista_acesso"
                                                ? "Gerir acesso"
                                                : "Executar ação"}
                                        </button>
                                    ) : item.tipo ===
                                      "checklist_veiculo" ? (
                                        checklistType ===
                                            "recolha" &&
                                        contrato.status !==
                                            "encerrado" ? (
                                            <span className="max-w-40 text-right text-xs font-medium text-amber-600">
                                                Disponível no encerramento
                                            </span>
                                        ) : checklistType ===
                                              "entrega" &&
                                          contrato.status !==
                                              "assinado" ? (
                                            <span className="max-w-40 text-right text-xs font-medium text-slate-400">
                                                Disponível após assinatura
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={
                                                    startingChecklist ===
                                                    item.id
                                                }
                                                onClick={() =>
                                                    onStartChecklist(
                                                        item,
                                                    )
                                                }
                                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                            >
                                                {startingChecklist ===
                                                item.id ? (
                                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ClipboardCheck className="h-4 w-4" />
                                                )}

                                                {checklistType ===
                                                "recolha"
                                                    ? "Iniciar recolha"
                                                    : "Iniciar entrega"}
                                            </button>
                                        )
                                    ) : automatic ? (
                                        <span className="text-xs font-medium text-slate-400">
                                            Automática
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={
                                                completing ===
                                                item.id
                                            }
                                            onClick={() =>
                                                onComplete(
                                                    item,
                                                )
                                            }
                                            className="h-9 rounded-lg bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 disabled:opacity-50"
                                        >
                                            {completing ===
                                            item.id
                                                ? "A concluir..."
                                                : "Concluir"}
                                        </button>
                                    )}
                                </div>
                            );
                        },
                    )}
                </div>
            </div>
        </div>
    );
}

interface DriverAccessStatus {
    action: string;
    item_id: string;
    item_status: string;

    motorista_id:
        string | null;

    motorista_nome:
        string | null;

    email:
        string | null;

    user_id:
        string | null;

    conta_vinculada:
        boolean;

    conta_criada:
        boolean;

    utilizador_ativo:
        boolean;

    associacao_tenant_ativa:
        boolean;

    role_motorista:
        boolean;

    pode_criar:
        boolean;

    acesso_ativo:
        boolean;

    concluido:
        boolean;
}

function DriverAccessActionModal({
    contratoId,
    item,
    onClose,
    onUpdated,
    onOpenMotoristas,
}: {
    contratoId:
        string;

    item:
        ContratoProcessItem;

    onClose:
        () => void;

    onUpdated:
        () => Promise<void>;

    onOpenMotoristas:
        () => void;
}) {
    const [
        password,
        setPassword,
    ] =
        useState("");

    const [
        confirmation,
        setConfirmation,
    ] =
        useState("");

    const [
        submitting,
        setSubmitting,
    ] =
        useState(false);

    const [
        localError,
        setLocalError,
    ] =
        useState<
            string | null
        >(null);

    const query =
        useQuery({
            queryKey: [
                "workflow-action",
                contratoId,
                item.id,
            ],

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            `/api/contratos/${contratoId}/workflow/items/${item.id}/acao`,
                        );

                    return response
                        .data
                        .data as DriverAccessStatus;
                },
        });

    const status =
        query.data;

    async function execute() {
        if (!status) {
            return;
        }

        setLocalError(
            null,
        );

        if (
            status.pode_criar
        ) {
            if (
                !status.email
            ) {
                setLocalError(
                    "O motorista precisa ter um e-mail antes de criar o acesso.",
                );

                return;
            }

            if (
                password.length <
                8
            ) {
                setLocalError(
                    "A senha inicial deve ter pelo menos 8 caracteres.",
                );

                return;
            }

            if (
                password !==
                confirmation
            ) {
                setLocalError(
                    "A confirmação da senha não corresponde.",
                );

                return;
            }
        }

        setSubmitting(
            true,
        );

        try {
            await api.post(
                `/api/contratos/${contratoId}/workflow/items/${item.id}/acao`,
                status.pode_criar
                    ? {
                          password,

                          password_confirmation:
                              confirmation,
                      }
                    : {},
            );

            await onUpdated();
        } catch (
            requestError
        ) {
            setLocalError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setSubmitting(
                false,
            );
        }
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={
                    onClose
                }
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <KeyRound className="h-5 w-5" />
                        </div>

                        <div>
                            <h3 className="font-semibold text-slate-950">
                                Acesso do motorista
                            </h3>

                            <p className="mt-0.5 text-sm text-slate-500">
                                Criar ou validar acesso à organização.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="space-y-5 p-6">
                    {query.isLoading ? (
                        <div className="flex justify-center py-10">
                            <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
                        </div>
                    ) : query.isError ||
                      !status ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {apiError(
                                query.error,
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="font-semibold text-slate-900">
                                    {status.motorista_nome ??
                                        "Motorista"}
                                </div>

                                <div className="mt-1 text-sm text-slate-500">
                                    {status.email ??
                                        "Sem e-mail registado"}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <AccessStatus
                                    label="Conta"
                                    ok={
                                        status.conta_criada
                                    }
                                />

                                <AccessStatus
                                    label="Utilizador"
                                    ok={
                                        status.utilizador_ativo
                                    }
                                />

                                <AccessStatus
                                    label="Organização"
                                    ok={
                                        status.associacao_tenant_ativa
                                    }
                                />

                                <AccessStatus
                                    label="Motorista"
                                    ok={
                                        status.role_motorista
                                    }
                                />
                            </div>

                            {status.concluido ? (
                                <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                                    <div>
                                        <div className="font-semibold text-emerald-900">
                                            Acesso válido
                                        </div>

                                        <p className="mt-1 text-sm text-emerald-700">
                                            A conta está ativa, pertence à organização e possui a função de motorista.
                                        </p>
                                    </div>
                                </div>
                            ) : status.pode_criar &&
                              status.email ? (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                                        O motorista ainda não possui conta. Defina uma senha inicial para criar o acesso completo agora.
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label>
                                            <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Senha inicial
                                            </span>

                                            <input
                                                type="password"
                                                value={
                                                    password
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setPassword(
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="new-password"
                                                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                            />
                                        </label>

                                        <label>
                                            <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Confirmar senha
                                            </span>

                                            <input
                                                type="password"
                                                value={
                                                    confirmation
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setConfirmation(
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="new-password"
                                                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                            />
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="font-semibold text-amber-900">
                                        Acesso precisa de regularização
                                    </div>

                                    <p className="mt-1 text-sm leading-6 text-amber-700">
                                        A conta já está associada ao motorista, mas falta pelo menos uma condição para o acesso completo. Abra o cadastro do motorista para regularizar a conta, organização ou função.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={
                                            onOpenMotoristas
                                        }
                                        className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800"
                                    >
                                        Abrir Motoristas
                                    </button>
                                </div>
                            )}

                            {localError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {
                                        localError
                                    }
                                </div>
                            )}

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={
                                        onClose
                                    }
                                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                                >
                                    Fechar
                                </button>

                                {(status.concluido ||
                                    (
                                        status.pode_criar &&
                                        status.email
                                    )) && (
                                    <button
                                        type="button"
                                        disabled={
                                            submitting
                                        }
                                        onClick={
                                            execute
                                        }
                                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="h-4 w-4" />
                                        )}

                                        {status.concluido
                                            ? "Validar e concluir"
                                            : "Criar acesso e concluir"}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function AccessStatus({
    label,
    ok,
}: {
    label:
        string;

    ok:
        boolean;
}) {
    return (
        <div
            className={[
                "rounded-xl border p-3 text-center",

                ok
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50",
            ].join(
                " ",
            )}
        >
            <div
                className={[
                    "text-xs font-semibold",

                    ok
                        ? "text-emerald-700"
                        : "text-slate-400",
                ].join(
                    " ",
                )}
            >
                {
                    label
                }
            </div>

            <div
                className={[
                    "mt-1 text-xs",

                    ok
                        ? "text-emerald-600"
                        : "text-slate-400",
                ].join(
                    " ",
                )}
            >
                {ok
                    ? "OK"
                    : "Pendente"}
            </div>
        </div>
    );
}

function SignaturesTab({
    contrato,
    resending,
    onResend,
}: {
    contrato:
        Contrato;

    resending:
        string | null;

    onResend:
        (
            signatureId:
                string,
        ) => Promise<void>;
}) {
    const signatures =
        contrato
            .assinaturas ??
        [];

    if (
        signatures.length ===
        0
    ) {
        return (
            <EmptyState
                type="signature"
                title="Sem assinaturas"
                text="Este contrato não possui assinaturas registadas."
            />
        );
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {signatures.map(
                (
                    signature,
                ) => (
                    <div
                        key={
                            signature.id
                        }
                        className="rounded-2xl border border-slate-200 p-5"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    {signature
                                        .signatario_nome ??
                                        "Signatário"}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    {
                                        signature
                                            .signatario_tipo
                                    }
                                </p>
                            </div>

                            <span
                                className={[
                                    "rounded-full px-2.5 py-1 text-xs font-semibold",

                                    signature.status ===
                                    "assinado"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700",
                                ].join(
                                    " ",
                                )}
                            >
                                {
                                    signature.status
                                }
                            </span>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <Info
                                label="Placeholder"
                                value={
                                    signature
                                        .placeholder
                                }
                            />

                            <Info
                                label="E-mail"
                                value={
                                    signature
                                        .signatario_email ??
                                    "—"
                                }
                            />

                            <Info
                                label="Solicitado"
                                value={
                                    dateTimeLabel(
                                        signature
                                            .solicitado_em,
                                    )
                                }
                            />

                            <Info
                                label="Expira"
                                value={
                                    dateTimeLabel(
                                        signature
                                            .otp_expira_em,
                                    )
                                }
                            />

                            <Info
                                label="Assinado"
                                value={
                                    dateTimeLabel(
                                        signature
                                            .assinado_em,
                                    )
                                }
                            />

                            <Info
                                label="Verificado"
                                value={
                                    signature
                                        .verificado
                                        ? "Sim"
                                        : "Não"
                                }
                            />
                        </div>

                        {signature.status ===
                            "pendente" &&
                            !signature
                                .verificado && (
                                <button
                                    type="button"
                                    disabled={
                                        resending ===
                                        signature.id
                                    }
                                    onClick={() =>
                                        onResend(
                                            signature.id,
                                        )
                                    }
                                    className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 disabled:opacity-50"
                                >
                                    {resending ===
                                        signature.id && (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    )}

                                    Reenviar solicitação
                                </button>
                            )}
                    </div>
                ),
            )}
        </div>
    );
}

function HistoryTab({
    contrato,
}: {
    contrato:
        Contrato;
}) {
    const versions =
        contrato
            .versoes ??
        [];

    const logs =
        contrato
            .logs_auditoria ??
        [];

    return (
        <div className="space-y-8">
            <section>
                <div className="mb-4 flex items-center gap-2">
                    <FileClock className="h-5 w-5 text-indigo-600" />

                    <h3 className="font-semibold text-slate-900">
                        Versões
                    </h3>
                </div>

                {versions.length ===
                0 ? (
                    <p className="text-sm text-slate-400">
                        Nenhuma versão registada.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {versions.map(
                            (
                                version,
                            ) => (
                                <div
                                    key={
                                        version.id
                                    }
                                    className="rounded-xl border border-slate-200 p-4"
                                >
                                    <div className="flex justify-between gap-4">
                                        <div className="text-sm font-semibold text-slate-900">
                                            Versão{" "}
                                            {
                                                version
                                                    .versao_numero
                                            }
                                        </div>

                                        <div className="text-xs text-slate-400">
                                            {dateTimeLabel(
                                                version
                                                    .created_at,
                                            )}
                                        </div>
                                    </div>

                                    {version
                                        .observacoes && (
                                        <p className="mt-2 text-sm text-slate-500">
                                            {
                                                version
                                                    .observacoes
                                            }
                                        </p>
                                    )}
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>

            <section>
                <div className="mb-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-600" />

                    <h3 className="font-semibold text-slate-900">
                        Auditoria
                    </h3>
                </div>

                {logs.length ===
                0 ? (
                    <p className="text-sm text-slate-400">
                        Nenhum evento registado.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {logs.map(
                            (
                                log,
                            ) => (
                                <div
                                    key={
                                        log.id
                                    }
                                    className="rounded-xl border border-slate-200 p-4"
                                >
                                    <div className="flex justify-between gap-4">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">
                                                {
                                                    log.acao
                                                }
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                IP:{" "}
                                                {log
                                                    .ip_address ??
                                                    "—"}
                                            </div>
                                        </div>

                                        <div className="text-xs text-slate-400">
                                            {dateTimeLabel(
                                                log
                                                    .created_at,
                                            )}
                                        </div>
                                    </div>

                                    {Object.keys(
                                        log
                                            .detalhes ??
                                            {},
                                    ).length >
                                        0 && (
                                        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                            {JSON.stringify(
                                                log.detalhes,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    )}
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

function ProcessStatus({
    status,
}: {
    status: string;
}) {
    const complete =
        status ===
        "concluido";

    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",

                complete
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
            ].join(
                " ",
            )}
        >
            {complete && (
                <CheckCircle2 className="h-3.5 w-3.5" />
            )}

            {complete
                ? "Concluído"
                : status}
        </span>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active:
        boolean;

    onClick:
        () => void;

    children:
        string;
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            className={[
                "border-b-2 py-4 text-sm font-semibold whitespace-nowrap",

                active
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500",
            ].join(
                " ",
            )}
        >
            {children}
        </button>
    );
}

function InfoCard({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-2 text-sm font-semibold text-slate-900">
                {value}
            </div>
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
            <div className="text-xs uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-800">
                {value}
            </div>
        </div>
    );
}

function EmptyState({
    type,
    title,
    text,
}: {
    type:
        | "process"
        | "signature";

    title:
        string;

    text:
        string;
}) {
    return (
        <div className="py-16 text-center">
            {type ===
            "process" ? (
                <FileClock className="mx-auto h-11 w-11 text-slate-300" />
            ) : (
                <FileSignature className="mx-auto h-11 w-11 text-slate-300" />
            )}

            <h3 className="mt-4 font-semibold text-slate-900">
                {title}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
                {text}
            </p>
        </div>
    );
}

function typeLabel(
    value: string,
): string {
    const legacy:
        Record<
            string,
            string
        > = {
        aluguer:
            "Aluguer",

        prestacao_servico:
            "Prestação de serviços",

        checklist_entrega:
            "Checklist de entrega",

        checklist_devolucao:
            "Checklist de devolução",
    };

    if (
        legacy[value]
    ) {
        return legacy[
            value
        ];
    }

    const normalized =
        value
            .replace(
                /_/g,
                " ",
            )
            .trim();

    if (!normalized) {
        return "—";
    }

    return (
        normalized
            .charAt(
                0,
            )
            .toUpperCase() +
        normalized.slice(
            1,
        )
    );
}

function statusLabel(
    value: string,
): string {
    return (
        {
            rascunho:
                "Rascunho",

            enviado:
                "Enviado",

            assinado:
                "Assinado",

            cancelado:
                "Cancelado",

            renovado:
                "Renovado",

            expirado:
                "Expirado",

            encerrado:
                "Encerrado",
        }[
            value
        ] ?? value
    );
}

function currency(
    value:
        | string
        | number
        | null,
): string {
    if (
        value ===
            null ||
        value ===
            ""
    ) {
        return "—";
    }

    const numeric =
        Number(
            value,
        );

    if (
        Number.isNaN(
            numeric,
        )
    ) {
        return String(
            value,
        );
    }

    return numeric.toLocaleString(
        "pt-PT",
        {
            style:
                "currency",

            currency:
                "EUR",
        },
    );
}

function dateLabel(
    value:
        string | null,
): string {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
    ).format(
        new Date(
            `${value.slice(
                0,
                10,
            )}T12:00:00`,
        ),
    );
}

function dateTimeLabel(
    value:
        string | null,
): string {
    if (!value) {
        return "—";
    }

    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
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
        date,
    );
}
