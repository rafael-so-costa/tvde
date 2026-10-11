import axios from "axios";

import {
    FilePlus2,
    FileSignature,
    Link2,
    LoaderCircle,
    ShieldCheck,
    X,
} from "lucide-react";

import {
    useMemo,
    useState,
} from "react";

import {
    useQuery,
} from "@tanstack/react-query";

import api from "../../lib/api";

import type {
    Contrato,
    ContratoProcessItem,
} from "../../types/contrato";

import type {
    Empresa,
} from "../../types/empresa";

import type {
    Motorista,
} from "../../types/motorista";

import type {
    Proprietario,
} from "../../types/proprietario";

import type {
    ContractWizardForm,
} from "../../types/tipo-contrato";

import type {
    Veiculo,
} from "../../types/veiculo";

import ContractWizard from "./wizard/ContractWizard";

type CompletionStatus =
    | "criado"
    | "assinado"
    | "encerrado";

interface AvailableType {
    id: string;
    nome: string;
    codigo: string;

    entidades: {
        empresa?: boolean;
        proprietario?: boolean;
        motorista?: boolean;
        veiculo?: boolean;
    };
}

interface RelatedStatus {
    item_id: string;
    item_status: string;
    bloqueado: boolean;

    configuracao_pendente:
        boolean;

    status_conclusao:
        CompletionStatus;

    tipo_contrato:
        AvailableType & {
            ativo: boolean;
        } |
        null;

    tipos_disponiveis:
        AvailableType[];

    relacao: {
        id: string;

        contrato: {
            id: string;
            status: string;
            tipo: string;

            tipo_contrato_id:
                string | null;

            tipo_contrato_nome:
                string | null;

            documento_codigo:
                string | null;

            data_inicio:
                string | null;

            data_fim:
                string | null;
        };

        criterio_atingido:
            boolean;
    } | null;

    candidatos: Array<{
        id: string;
        status: string;

        documento_codigo:
            string | null;

        data_inicio:
            string | null;

        data_fim:
            string | null;
    }>;
}

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
                        (value) =>
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

    return "Não foi possível concluir a operação.";
}

function statusLabel(
    value: string,
): string {
    const labels:
        Record<string, string> = {
            rascunho:
                "Rascunho",

            enviado:
                "Aguardando assinatura",

            assinado:
                "Assinado",

            encerrado:
                "Encerrado",

            renovado:
                "Renovado",

            expirado:
                "Expirado",

            cancelado:
                "Cancelado",
        };

    return (
        labels[value] ??
        value
    );
}

function completionLabel(
    value: CompletionStatus,
): string {
    if (
        value ===
        "criado"
    ) {
        return "criação";
    }

    if (
        value ===
        "encerrado"
    ) {
        return "encerramento";
    }

    return "assinatura";
}

export default function RelatedContractActionModal({
    contrato,
    item,
    onClose,
    onUpdated,
    onOpenContract,
}: {
    contrato:
        Contrato;

    item:
        ContratoProcessItem;

    onClose:
        () => void;

    onUpdated:
        () => Promise<void>;

    onOpenContract:
        (
            id: string,
        ) => void;
}) {
    const [
        wizardOpen,
        setWizardOpen,
    ] =
        useState(false);

    const [
        selectedTypeId,
        setSelectedTypeId,
    ] =
        useState("");

    const [
        configuring,
        setConfiguring,
    ] =
        useState(false);

    const [
        linking,
        setLinking,
    ] =
        useState<
            string | null
        >(null);

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    const statusQuery =
        useQuery({
            queryKey: [
                "related-contract",
                contrato.id,
                item.id,
            ],

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            `/api/contratos/${contrato.id}/workflow/items/${item.id}/contrato-relacionado`,
                        );

                    return response
                        .data
                        .data as RelatedStatus;
                },
        });

    const status =
        statusQuery.data;

    const empresasQuery =
        useQuery({
            queryKey: [
                "related-contract-empresas",
                contrato.tenant_id,
            ],

            enabled:
                wizardOpen,

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/empresas",
                        );

                    return response
                        .data
                        .data as Empresa[];
                },
        });

    const proprietariosQuery =
        useQuery({
            queryKey: [
                "related-contract-proprietarios",
                contrato.tenant_id,
            ],

            enabled:
                wizardOpen,

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/proprietarios",
                        );

                    return response
                        .data
                        .data as Proprietario[];
                },
        });

    const motoristasQuery =
        useQuery({
            queryKey: [
                "related-contract-motoristas",
                contrato.tenant_id,
            ],

            enabled:
                wizardOpen,

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/motoristas",
                        );

                    return response
                        .data
                        .data as Motorista[];
                },
        });

    const veiculosQuery =
        useQuery({
            queryKey: [
                "related-contract-veiculos",
                contrato.tenant_id,
            ],

            enabled:
                wizardOpen,

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/veiculos",
                        );

                    return response
                        .data
                        .data as Veiculo[];
                },
        });

    const wizardLoading =
        wizardOpen &&
        (
            empresasQuery.isLoading ||
            proprietariosQuery.isLoading ||
            motoristasQuery.isLoading ||
            veiculosQuery.isLoading
        );

    const wizardError =
        wizardOpen &&
        (
            empresasQuery.isError ||
            proprietariosQuery.isError ||
            motoristasQuery.isError ||
            veiculosQuery.isError
        );

    const initialValues =
        useMemo(
            () => {
                const values:
                    Partial<
                        ContractWizardForm
                    > = {
                    data_inicio:
                        contrato
                            .data_inicio
                            ?.slice(
                                0,
                                10,
                            ) ??
                        "",

                    data_fim:
                        contrato
                            .data_fim
                            ?.slice(
                                0,
                                10,
                            ) ??
                        "",

                    campos_preenchidos:
                        {},
                };

                if (
                    !status
                        ?.tipo_contrato
                ) {
                    return values;
                }

                const entities =
                    status
                        .tipo_contrato
                        .entidades;

                if (
                    entities.empresa
                ) {
                    values.empresa_id =
                        contrato
                            .empresa_id ??
                        "";
                }

                if (
                    entities
                        .proprietario
                ) {
                    values.proprietario_id =
                        contrato
                            .proprietario_id ??
                        "";
                }

                if (
                    entities.motorista
                ) {
                    values.motorista_id =
                        contrato
                            .motorista_id ??
                        "";
                }

                if (
                    entities.veiculo
                ) {
                    values.veiculo_id =
                        contrato
                            .veiculo_id ??
                        "";
                }

                return values;
            },
            [
                contrato,
                status,
            ],
        );

    async function configureType() {
        if (
            !selectedTypeId
        ) {
            setError(
                "Selecione um tipo de contrato.",
            );

            return;
        }

        setConfiguring(
            true,
        );

        setError(
            null,
        );

        try {
            await api.post(
                `/api/contratos/${contrato.id}/workflow/items/${item.id}/contrato-relacionado/configurar-tipo`,
                {
                    tipo_contrato_id:
                        selectedTypeId,
                },
            );

            setSelectedTypeId(
                "",
            );

            await statusQuery.refetch();

            await onUpdated();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setConfiguring(
                false,
            );
        }
    }

    async function link(
        contractId: string,
    ) {
        setLinking(
            contractId,
        );

        setError(
            null,
        );

        try {
            await api.post(
                `/api/contratos/${contrato.id}/workflow/items/${item.id}/contrato-relacionado/vincular`,
                {
                    contrato_relacionado_id:
                        contractId,
                },
            );

            await statusQuery.refetch();

            await onUpdated();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                ),
            );

            throw requestError;
        } finally {
            setLinking(
                null,
            );
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                <button
                    type="button"
                    aria-label="Fechar"
                    onClick={
                        onClose
                    }
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                />

                <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                    <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                <FileSignature className="h-5 w-5" />
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-950">
                                    Contrato relacionado
                                </h3>

                                <p className="mt-0.5 text-sm text-slate-500">
                                    {
                                        item
                                            .titulo_snapshot
                                    }
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
                        {statusQuery.isLoading ? (
                            <div className="flex justify-center py-12">
                                <LoaderCircle className="h-7 w-7 animate-spin text-violet-600" />
                            </div>
                        ) : statusQuery.isError ||
                          !status ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {apiError(
                                    statusQuery.error,
                                )}
                            </div>
                        ) : status
                              .configuracao_pendente ? (
                            <>
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="font-semibold text-amber-900">
                                        Defina o tipo de contrato relacionado
                                    </div>

                                    <p className="mt-1 text-sm leading-6 text-amber-700">
                                        O workflow antigo referencia um código que não corresponde a nenhum tipo de contrato atual. Selecione abaixo o tipo correto existente na organização.
                                    </p>
                                </div>

                                {status
                                    .tipos_disponiveis
                                    .length ===
                                0 ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        Não existem tipos de contrato ativos nesta organização. Crie primeiro um tipo de contrato.
                                    </div>
                                ) : (
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium text-slate-700">
                                            Tipo de contrato
                                        </span>

                                        <select
                                            value={
                                                selectedTypeId
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSelectedTypeId(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                                        >
                                            <option value="">
                                                Selecione...
                                            </option>

                                            {status
                                                .tipos_disponiveis
                                                .map(
                                                    (
                                                        type,
                                                    ) => (
                                                        <option
                                                            key={
                                                                type.id
                                                            }
                                                            value={
                                                                type.id
                                                            }
                                                        >
                                                            {
                                                                type.nome
                                                            }{" "}
                                                            ({type.codigo})
                                                        </option>
                                                    ),
                                                )}
                                        </select>
                                    </label>
                                )}

                                {error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        {
                                            error
                                        }
                                    </div>
                                )}

                                <div className="flex justify-end border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        disabled={
                                            configuring ||
                                            !selectedTypeId
                                        }
                                        onClick={
                                            configureType
                                        }
                                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
                                    >
                                        {configuring ? (
                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="h-4 w-4" />
                                        )}

                                        Definir tipo
                                    </button>
                                </div>
                            </>
                        ) : status
                              .tipo_contrato ? (
                            <>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Tipo exigido
                                    </div>

                                    <div className="mt-1 font-semibold text-slate-900">
                                        {
                                            status
                                                .tipo_contrato
                                                .nome
                                        }
                                    </div>

                                    <div className="mt-1 text-sm text-slate-500">
                                        Código{" "}
                                        <span className="font-mono">
                                            {
                                                status
                                                    .tipo_contrato
                                                    .codigo
                                            }
                                        </span>

                                        {" · "}
                                        concluir após{" "}
                                        {
                                            completionLabel(
                                                status
                                                    .status_conclusao,
                                            )
                                        }
                                    </div>
                                </div>

                                {status.bloqueado && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                        Existem etapas obrigatórias anteriores ainda pendentes.
                                    </div>
                                )}

                                {status.relacao ? (
                                    <div
                                        className={[
                                            "rounded-2xl border p-5",

                                            status
                                                .relacao
                                                .criterio_atingido
                                                ? "border-emerald-200 bg-emerald-50"
                                                : "border-amber-200 bg-amber-50",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {status
                                                        .relacao
                                                        .criterio_atingido ? (
                                                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                                    ) : (
                                                        <FileSignature className="h-5 w-5 text-amber-600" />
                                                    )}

                                                    <h4 className="font-semibold text-slate-900">
                                                        {status
                                                            .relacao
                                                            .contrato
                                                            .tipo_contrato_nome ??
                                                            status
                                                                .tipo_contrato
                                                                .nome}
                                                    </h4>
                                                </div>

                                                <div className="mt-2 text-sm text-slate-600">
                                                    {status
                                                        .relacao
                                                        .contrato
                                                        .documento_codigo ??
                                                        `Contrato ${status.relacao.contrato.id.slice(0, 8)}`
                                                    }
                                                </div>

                                                <div className="mt-1 text-sm font-medium text-slate-700">
                                                    {statusLabel(
                                                        status
                                                            .relacao
                                                            .contrato
                                                            .status,
                                                    )}
                                                </div>

                                                {!status
                                                    .relacao
                                                    .criterio_atingido && (
                                                    <p className="mt-2 text-sm text-amber-700">
                                                        A etapa permanece pendente até cumprir o critério de{" "}
                                                        {
                                                            completionLabel(
                                                                status
                                                                    .status_conclusao,
                                                            )
                                                        }
                                                        .
                                                    </p>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onOpenContract(
                                                        status
                                                            .relacao!
                                                            .contrato
                                                            .id,
                                                    )
                                                }
                                                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                                            >
                                                Abrir contrato
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {status
                                            .candidatos
                                            .length >
                                            0 && (
                                            <section>
                                                <h4 className="font-semibold text-slate-900">
                                                    Contratos compatíveis encontrados
                                                </h4>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Pode vincular um contrato existente ou criar um novo.
                                                </p>

                                                <div className="mt-3 space-y-2">
                                                    {status
                                                        .candidatos
                                                        .map(
                                                            (
                                                                candidate,
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        candidate.id
                                                                    }
                                                                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                                                                >
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-slate-800">
                                                                            {candidate.documento_codigo ??
                                                                                `Contrato ${candidate.id.slice(0, 8)}`
                                                                            }
                                                                        </div>

                                                                        <div className="mt-1 text-xs text-slate-500">
                                                                            {statusLabel(
                                                                                candidate.status,
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            linking ===
                                                                            candidate.id
                                                                        }
                                                                        onClick={() =>
                                                                            void link(
                                                                                candidate.id,
                                                                            )
                                                                        }
                                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 disabled:opacity-50"
                                                                    >
                                                                        {linking ===
                                                                        candidate.id ? (
                                                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <Link2 className="h-4 w-4" />
                                                                        )}

                                                                        Vincular
                                                                    </button>
                                                                </div>
                                                            ),
                                                        )}
                                                </div>
                                            </section>
                                        )}

                                        {error && (
                                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                                {
                                                    error
                                                }
                                            </div>
                                        )}

                                        <div className="flex justify-end border-t border-slate-100 pt-4">
                                            <button
                                                type="button"
                                                disabled={
                                                    status.bloqueado ||
                                                    !status
                                                        .tipo_contrato
                                                        .ativo
                                                }
                                                onClick={() =>
                                                    setWizardOpen(
                                                        true,
                                                    )
                                                }
                                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
                                            >
                                                <FilePlus2 className="h-4 w-4" />

                                                Criar contrato relacionado
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {wizardOpen &&
                wizardLoading && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70">
                        <LoaderCircle className="h-8 w-8 animate-spin text-white" />
                    </div>
                )}

            {wizardOpen &&
                wizardError && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6">
                            <div className="font-semibold text-red-700">
                                Não foi possível carregar os dados necessários para o contrato.
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setWizardOpen(
                                        false,
                                    )
                                }
                                className="mt-4 h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}

            {wizardOpen &&
                !wizardLoading &&
                !wizardError &&
                status
                    ?.tipo_contrato && (
                    <ContractWizard
                        open={
                            true
                        }
                        initialTypeId={
                            status
                                .tipo_contrato
                                .id
                        }
                        initialValues={
                            initialValues
                        }
                        empresas={
                            empresasQuery
                                .data ??
                            []
                        }
                        proprietarios={
                            proprietariosQuery
                                .data ??
                            []
                        }
                        motoristas={
                            motoristasQuery
                                .data ??
                            []
                        }
                        veiculos={
                            veiculosQuery
                                .data ??
                            []
                        }
                        onClose={() =>
                            setWizardOpen(
                                false,
                            )
                        }
                        onSuccess={async (
                            created,
                        ) => {
                            await link(
                                created.id,
                            );

                            setWizardOpen(
                                false,
                            );
                        }}
                    />
                )}
        </>
    );
}