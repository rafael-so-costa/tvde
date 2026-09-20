import axios from 'axios';
import {
    useEffect,
    useState,
} from 'react';
import {
    useQuery,
} from '@tanstack/react-query';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Circle,
    FileClock,
    FileSignature,
    History,
    LoaderCircle,
    Trash2,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import type {
    Contrato,
    ContratoProcessItem,
} from '../../types/contrato';

interface Props {
    id: string;
    onClose: () => void;
    onChanged: () => Promise<void>;
}

type Tab =
    | 'resumo'
    | 'processo'
    | 'assinaturas'
    | 'historico';

const automaticTypes = [
    'assinatura',
    'gerar_documento',
    'checklist_veiculo',
];

function apiError(
    error: unknown
): string {
    if (
        axios.isAxiosError(
            error
        )
    ) {
        const errors =
            error.response?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                'object'
        ) {
            const first =
                Object.values(
                    errors
                )
                    .flat()
                    .find(
                        (value) =>
                            typeof value ===
                            'string'
                    );

            if (
                typeof first ===
                'string'
            ) {
                return first;
            }
        }

        return (
            error.response?.data
                ?.message ??
            'Não foi possível concluir a operação.'
        );
    }

    return 'Não foi possível concluir a operação.';
}

export default function ContratoDetailModal({
    id,
    onClose,
    onChanged,
}: Props) {
    const [
        tab,
        setTab,
    ] = useState<Tab>(
        'resumo'
    );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        completing,
        setCompleting,
    ] =
        useState<string | null>(
            null
        );

    const [
        ending,
        setEnding,
    ] = useState(false);

    const [
        deleting,
        setDeleting,
    ] = useState(false);

    const [
        endDate,
        setEndDate,
    ] = useState('');

    const detailQuery =
        useQuery({
            queryKey: [
                'contrato',
                id,
            ],
            queryFn:
                async () => {
                    const response =
                        await api.get(
                            `/api/contratos/${id}`
                        );

                    return response
                        .data
                        .data as Contrato;
                },
        });

    const contrato =
        detailQuery.data;

    useEffect(() => {
        setEndDate(
            contrato
                ?.data_fim
                ?.slice(
                    0,
                    10
                ) ??
                ''
        );
    }, [
        contrato?.data_fim,
    ]);

    async function refresh() {
        await Promise.all([
            detailQuery.refetch(),
            onChanged(),
        ]);
    }

    async function completeItem(
        item: ContratoProcessItem
    ) {
        setCompleting(
            item.id
        );

        setError(
            null
        );

        try {
            await api.patch(
                `/api/contratos/${id}/checklist-processo/items/${item.id}/concluir`,
                {
                    resultado: {
                        origem:
                            'interface_contratos',
                    },
                }
            );

            await refresh();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError
                )
            );
        } finally {
            setCompleting(
                null
            );
        }
    }

    async function endContract() {
        if (
            !window.confirm(
                'Encerrar este contrato? A associação ativa com o veículo será terminada.'
            )
        ) {
            return;
        }

        setEnding(
            true
        );

        setError(
            null
        );

        try {
            await api.patch(
                `/api/contratos/${id}/encerrar`,
                {
                    data_fim:
                        endDate ||
                        null,
                }
            );

            await refresh();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError
                )
            );
        } finally {
            setEnding(
                false
            );
        }
    }

    async function deleteContract() {
        if (
            !window.confirm(
                'Eliminar este contrato?'
            )
        ) {
            return;
        }

        setDeleting(
            true
        );

        setError(
            null
        );

        try {
            await api.delete(
                `/api/contratos/${id}`
            );

            await onChanged();

            onClose();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError
                )
            );

            setDeleting(
                false
            );
        }
    }

    return (
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
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                            Contrato
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            {contrato
                                ?.template
                                ?.nome ??
                                'Detalhes do contrato'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {detailQuery.isLoading ? (
                    <div className="flex justify-center py-24">
                        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                ) : detailQuery.isError ||
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
                                        'resumo'
                                    }
                                    onClick={() =>
                                        setTab(
                                            'resumo'
                                        )
                                    }
                                >
                                    Resumo
                                </TabButton>

                                <TabButton
                                    active={
                                        tab ===
                                        'processo'
                                    }
                                    onClick={() =>
                                        setTab(
                                            'processo'
                                        )
                                    }
                                >
                                    Checklist
                                </TabButton>

                                <TabButton
                                    active={
                                        tab ===
                                        'assinaturas'
                                    }
                                    onClick={() =>
                                        setTab(
                                            'assinaturas'
                                        )
                                    }
                                >
                                    Assinaturas
                                </TabButton>

                                <TabButton
                                    active={
                                        tab ===
                                        'historico'
                                    }
                                    onClick={() =>
                                        setTab(
                                            'historico'
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
                                    {error}
                                </div>
                            )}

                            {tab ===
                                'resumo' && (
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
                                'processo' && (
                                <ProcessTab
                                    contrato={
                                        contrato
                                    }
                                    completing={
                                        completing
                                    }
                                    onComplete={
                                        completeItem
                                    }
                                />
                            )}

                            {tab ===
                                'assinaturas' && (
                                <SignaturesTab
                                    contrato={
                                        contrato
                                    }
                                />
                            )}

                            {tab ===
                                'historico' && (
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
    );
}

function SummaryTab({
    contrato,
    endDate,
    ending,
    deleting,
    onEndDate,
    onEnd,
    onDelete,
}: {
    contrato: Contrato;
    endDate: string;
    ending: boolean;
    deleting: boolean;
    onEndDate: (
        value: string
    ) => void;
    onEnd: () => Promise<void>;
    onDelete: () => Promise<void>;
}) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard
                    label="Estado"
                    value={statusLabel(
                        contrato.status
                    )}
                />

                <InfoCard
                    label="Tipo"
                    value={typeLabel(
                        contrato.tipo
                    )}
                />

                <InfoCard
                    label="Versão"
                    value={`v${contrato.versao_atual}`}
                />

                <InfoCard
                    label="Template"
                    value={
                        contrato
                            .template
                            ?.nome ??
                        'Sem template'
                    }
                />
            </div>

            <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900">
                    Entidades
                </h3>

                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Info
                        label="Motorista"
                        value={
                            contrato
                                .motorista
                                ?.nome_completo ??
                            '—'
                        }
                    />

                    <Info
                        label="Veículo"
                        value={
                            contrato
                                .veiculo
                                ? `${contrato.veiculo.matricula} · ${contrato.veiculo.marca} ${contrato.veiculo.modelo}`
                                : '—'
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
                            '—'
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
                        value={dateLabel(
                            contrato.data_inicio
                        )}
                    />

                    <Info
                        label="Fim"
                        value={dateLabel(
                            contrato.data_fim
                        )}
                    />

                    <Info
                        label="Semanal"
                        value={currency(
                            contrato.valor_semanal
                        )}
                    />

                    <Info
                        label="Caução"
                        value={currency(
                            contrato.valor_caucao
                        )}
                    />

                    <Info
                        label="Diário"
                        value={currency(
                            contrato.valor_diaria
                        )}
                    />

                    <Info
                        label="Total"
                        value={currency(
                            contrato.valor_total
                        )}
                    />

                    <Info
                        label="Assinado"
                        value={dateTimeLabel(
                            contrato.data_assinatura
                        )}
                    />

                    <Info
                        label="Bloqueado"
                        value={
                            contrato.bloqueado
                                ? 'Sim'
                                : 'Não'
                        }
                    />
                </div>
            </section>

            {Object.keys(
                contrato
                    .campos_preenchidos ??
                    {}
            ).length >
                0 && (
                <section className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-900">
                        Campos preenchidos
                    </h3>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {Object.entries(
                            contrato.campos_preenchidos
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
                                        'object'
                                            ? JSON.stringify(
                                                  value
                                              )
                                            : String(
                                                  value ??
                                                      '—'
                                              )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </section>
            )}

            {contrato.status ===
                'assinado' && (
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
                                event
                            ) =>
                                onEndDate(
                                    event
                                        .target
                                        .value
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

            {!contrato.bloqueado &&
                contrato.status !==
                    'encerrado' && (
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
    onComplete,
}: {
    contrato: Contrato;
    completing: string | null;
    onComplete: (
        item: ContratoProcessItem
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

    return (
        <div className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            {
                                run.template_nome_snapshot
                            }
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                            Versão{' '}
                            {
                                run.template_versao_snapshot
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
                            item
                        ) => {
                            const done =
                                item.status ===
                                    'concluido' ||
                                item.status ===
                                    'dispensado';

                            const automatic =
                                automaticTypes.includes(
                                    item.tipo
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
                                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                                            done
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-400',
                                        ].join(
                                            ' '
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
                                                item.titulo_snapshot
                                            }
                                        </div>

                                        {item.descricao_snapshot && (
                                            <div className="mt-1 text-sm text-slate-500">
                                                {
                                                    item.descricao_snapshot
                                                }
                                            </div>
                                        )}

                                        <div className="mt-1 text-xs text-slate-400">
                                            {
                                                item.tipo
                                            }
                                            {item.obrigatorio
                                                ? ' · obrigatório'
                                                : ' · opcional'}
                                        </div>
                                    </div>

                                    {done ? (
                                        <div className="text-right">
                                            <span className="text-xs font-semibold text-emerald-700">
                                                Concluído
                                            </span>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {dateTimeLabel(
                                                    item.concluido_em
                                                )}
                                            </div>
                                        </div>
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
                                                    item
                                                )
                                            }
                                            className="h-9 rounded-lg bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 disabled:opacity-50"
                                        >
                                            {completing ===
                                            item.id
                                                ? 'A concluir...'
                                                : 'Concluir'}
                                        </button>
                                    )}
                                </div>
                            );
                        }
                    )}
                </div>
            </div>
        </div>
    );
}

function SignaturesTab({
    contrato,
}: {
    contrato: Contrato;
}) {
    const signatures =
        contrato.assinaturas ??
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
                    signature
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
                                    {signature.signatario_nome ??
                                        'Signatário'}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    {
                                        signature.signatario_tipo
                                    }
                                </p>
                            </div>

                            <span
                                className={[
                                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                                    signature.status ===
                                    'assinado'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700',
                                ].join(
                                    ' '
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
                                    signature.placeholder
                                }
                            />

                            <Info
                                label="E-mail"
                                value={
                                    signature.signatario_email ??
                                    '—'
                                }
                            />

                            <Info
                                label="Solicitado"
                                value={dateTimeLabel(
                                    signature.solicitado_em
                                )}
                            />

                            <Info
                                label="Assinado"
                                value={dateTimeLabel(
                                    signature.assinado_em
                                )}
                            />

                            <Info
                                label="Verificado"
                                value={
                                    signature.verificado
                                        ? 'Sim'
                                        : 'Não'
                                }
                            />
                        </div>
                    </div>
                )
            )}
        </div>
    );
}

function HistoryTab({
    contrato,
}: {
    contrato: Contrato;
}) {
    const versions =
        contrato.versoes ??
        [];

    const logs =
        contrato.logs_auditoria ??
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
                                version
                            ) => (
                                <div
                                    key={
                                        version.id
                                    }
                                    className="rounded-xl border border-slate-200 p-4"
                                >
                                    <div className="flex justify-between gap-4">
                                        <div className="text-sm font-semibold text-slate-900">
                                            Versão{' '}
                                            {
                                                version.versao_numero
                                            }
                                        </div>

                                        <div className="text-xs text-slate-400">
                                            {dateTimeLabel(
                                                version.created_at
                                            )}
                                        </div>
                                    </div>

                                    {version.observacoes && (
                                        <p className="mt-2 text-sm text-slate-500">
                                            {
                                                version.observacoes
                                            }
                                        </p>
                                    )}
                                </div>
                            )
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
                                log
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
                                                IP:{' '}
                                                {
                                                    log.ip_address ??
                                                    '—'
                                                }
                                            </div>
                                        </div>

                                        <div className="text-xs text-slate-400">
                                            {dateTimeLabel(
                                                log.created_at
                                            )}
                                        </div>
                                    </div>

                                    {Object.keys(
                                        log.detalhes ??
                                            {}
                                    ).length >
                                        0 && (
                                        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                            {JSON.stringify(
                                                log.detalhes,
                                                null,
                                                2
                                            )}
                                        </pre>
                                    )}
                                </div>
                            )
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
        'concluido';

    return (
        <span
            className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                complete
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700',
            ].join(
                ' '
            )}
        >
            {complete && (
                <CheckCircle2 className="h-3.5 w-3.5" />
            )}

            {complete
                ? 'Concluído'
                : status}
        </span>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            className={[
                'border-b-2 py-4 text-sm font-semibold whitespace-nowrap',
                active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500',
            ].join(
                ' '
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
        | 'process'
        | 'signature';
    title: string;
    text: string;
}) {
    return (
        <div className="py-16 text-center">
            {type ===
            'process' ? (
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
    value: string
): string {
    return {
        aluguer:
            'Aluguer',
        prestacao_servico:
            'Prestação de serviços',
        checklist_entrega:
            'Checklist de entrega',
        checklist_devolucao:
            'Checklist de devolução',
    }[value] ??
        value;
}

function statusLabel(
    value: string
): string {
    return {
        rascunho:
            'Rascunho',
        enviado:
            'Enviado',
        assinado:
            'Assinado',
        cancelado:
            'Cancelado',
        renovado:
            'Renovado',
        expirado:
            'Expirado',
        encerrado:
            'Encerrado',
    }[value] ??
        value;
}

function currency(
    value:
        | string
        | number
        | null
): string {
    if (
        value ===
            null ||
        value ===
            ''
    ) {
        return '—';
    }

    return Number(
        value
    ).toLocaleString(
        'pt-PT',
        {
            style:
                'currency',
            currency:
                'EUR',
        }
    );
}

function dateLabel(
    value:
        | string
        | null
): string {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat(
        'pt-PT'
    ).format(
        new Date(
            `${value.slice(
                0,
                10
            )}T12:00:00`
        )
    );
}

function dateTimeLabel(
    value:
        | string
        | null
): string {
    if (!value) {
        return '—';
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'pt-PT',
        {
            dateStyle:
                'short',
            timeStyle:
                'short',
        }
    ).format(
        date
    );
}
