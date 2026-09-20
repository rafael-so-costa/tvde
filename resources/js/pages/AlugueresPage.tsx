import axios from 'axios';
import {
    useMemo,
    useState,
} from 'react';
import {
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    Car,
    LoaderCircle,
    PlayCircle,
    Plus,
    Search,
    Trash2,
    UserRound,
} from 'lucide-react';
import api from '../lib/api';
import {
    useTenant,
} from '../contexts/TenantContext';
import AluguerWizard from '../components/alugueres/AluguerWizard';
import type {
    Aluguer,
    AluguerStatus,
} from '../types/aluguer';
import type {
    ChecklistRecord,
} from '../types/checklist';
import type {
    Empresa,
} from '../types/empresa';
import type {
    Motorista,
} from '../types/motorista';
import type {
    TemplateContrato,
} from '../types/template';
import type {
    Veiculo,
} from '../types/veiculo';

const statusLabels:
    Record<
        AluguerStatus,
        string
    > = {
        rascunho:
            'Rascunho',
        ativo:
            'Ativo',
        finalizado:
            'Finalizado',
        cancelado:
            'Cancelado',
    };

const statusClasses:
    Record<
        AluguerStatus,
        string
    > = {
        rascunho:
            'bg-amber-50 text-amber-700',
        ativo:
            'bg-emerald-50 text-emerald-700',
        finalizado:
            'bg-slate-100 text-slate-700',
        cancelado:
            'bg-red-50 text-red-700',
    };

function apiError(
    error: unknown
): string {
    if (
        axios.isAxiosError(
            error
        )
    ) {
        return (
            error.response?.data
                ?.message ??
            'Não foi possível concluir a operação.'
        );
    }

    return 'Não foi possível concluir a operação.';
}

export default function AlugueresPage() {
    const {
        tenant,
    } = useTenant();

    const queryClient =
        useQueryClient();

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        wizardId,
        setWizardId,
    ] =
        useState<string | null>(
            null
        );

    const [
        starting,
        setStarting,
    ] = useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const alugueresQuery =
        useQuery({
            queryKey: [
                'alugueres',
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/alugueres'
                        );

                    return response
                        .data
                        .data as Aluguer[];
                },
        });

    const templatesQuery =
        useQuery({
            queryKey: [
                'templates',
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/templates-contrato'
                        );

                    return response
                        .data
                        .data as TemplateContrato[];
                },
        });

    const motoristasQuery =
        useQuery({
            queryKey: [
                'motoristas',
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/motoristas'
                        );

                    return response
                        .data
                        .data as Motorista[];
                },
        });

    const veiculosQuery =
        useQuery({
            queryKey: [
                'veiculos',
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/veiculos'
                        );

                    return response
                        .data
                        .data as Veiculo[];
                },
        });

    const empresasQuery =
        useQuery({
            queryKey: [
                'empresas',
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/empresas'
                        );

                    return response
                        .data
                        .data as Empresa[];
                },
        });

    const checklistsQuery =
        useQuery({
            queryKey: [
                'checklists',
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/checklists'
                        );

                    return response
                        .data
                        .data as ChecklistRecord[];
                },
        });

    const alugueres =
        useMemo(() => {
            const list =
                alugueresQuery
                    .data ??
                [];

            const term =
                search
                    .trim()
                    .toLocaleLowerCase(
                        'pt-PT'
                    );

            if (!term) {
                return list;
            }

            return list.filter(
                (
                    aluguer
                ) =>
                    [
                        aluguer
                            .motorista
                            ?.nome_completo,
                        aluguer
                            .veiculo
                            ?.matricula,
                        aluguer
                            .veiculo
                            ?.marca,
                        aluguer
                            .veiculo
                            ?.modelo,
                        aluguer.status,
                    ]
                        .filter(
                            Boolean
                        )
                        .some(
                            (
                                value
                            ) =>
                                String(
                                    value
                                )
                                    .toLocaleLowerCase(
                                        'pt-PT'
                                    )
                                    .includes(
                                        term
                                    )
                        )
            );
        }, [
            alugueresQuery.data,
            search,
        ]);

    async function refresh() {
        await Promise.all([
            queryClient
                .invalidateQueries({
                    queryKey: [
                        'alugueres',
                        tenant?.id,
                    ],
                }),

            queryClient
                .invalidateQueries({
                    queryKey: [
                        'checklists',
                        tenant?.id,
                    ],
                }),
        ]);
    }

    async function startNew() {
        setStarting(
            true
        );

        setError(
            null
        );

        try {
            const response =
                await api.post(
                    '/api/alugueres',
                    {}
                );

            const created =
                response.data
                    .data as Aluguer;

            await refresh();

            setWizardId(
                created.id
            );
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError
                )
            );
        } finally {
            setStarting(
                false
            );
        }
    }

    async function deleteDraft(
        aluguer: Aluguer
    ) {
        if (
            !window.confirm(
                'Eliminar este rascunho de aluguer?'
            )
        ) {
            return;
        }

        try {
            await api.delete(
                `/api/alugueres/${aluguer.id}`
            );

            await refresh();
        } catch (
            requestError
        ) {
            window.alert(
                apiError(
                    requestError
                )
            );
        }
    }

    if (!tenant) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Escolha uma organização antes de gerir alugueres.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const loading =
        alugueresQuery.isLoading ||
        templatesQuery.isLoading ||
        motoristasQuery.isLoading ||
        veiculosQuery.isLoading ||
        empresasQuery.isLoading ||
        checklistsQuery.isLoading;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        Operação
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Alugueres
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Contratos, entrega, ativação e acompanhamento dos alugueres.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        startNew
                    }
                    disabled={
                        starting
                    }
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {starting ? (
                        <LoaderCircle className="w-5 h-5 animate-spin" />
                    ) : (
                        <Plus className="w-5 h-5" />
                    )}

                    Novo aluguer
                </button>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    label="Total"
                    value={
                        alugueresQuery
                            .data
                            ?.length ??
                        0
                    }
                />

                <Stat
                    label="Rascunhos"
                    value={
                        alugueresQuery
                            .data
                            ?.filter(
                                (
                                    item
                                ) =>
                                    item.status ===
                                    'rascunho'
                            )
                            .length ??
                        0
                    }
                />

                <Stat
                    label="Ativos"
                    value={
                        alugueresQuery
                            .data
                            ?.filter(
                                (
                                    item
                                ) =>
                                    item.status ===
                                    'ativo'
                            )
                            .length ??
                        0
                    }
                />

                <Stat
                    label="Finalizados"
                    value={
                        alugueresQuery
                            .data
                            ?.filter(
                                (
                                    item
                                ) =>
                                    item.status ===
                                    'finalizado'
                            )
                            .length ??
                        0
                    }
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Pesquisar matrícula ou motorista..."
                            className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : alugueresQuery.isError ? (
                    <div className="py-16 px-6 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                        <p className="mt-3 text-slate-600">
                            Não foi possível carregar os alugueres.
                        </p>
                    </div>
                ) : alugueres.length ===
                  0 ? (
                    <div className="py-20 px-6 text-center">
                        <Car className="w-12 h-12 mx-auto text-indigo-400" />

                        <h3 className="mt-4 font-semibold text-slate-900">
                            Ainda não existem alugueres
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            Inicie o primeiro processo de aluguer.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <Th>
                                        Motorista
                                    </Th>

                                    <Th>
                                        Veículo
                                    </Th>

                                    <Th>
                                        Período
                                    </Th>

                                    <Th>
                                        Processo
                                    </Th>

                                    <Th>
                                        Estado
                                    </Th>

                                    <Th>
                                        Ações
                                    </Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {alugueres.map(
                                    (
                                        aluguer
                                    ) => (
                                        <tr
                                            key={
                                                aluguer.id
                                            }
                                            className="hover:bg-slate-50"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                        <UserRound className="w-4 h-4" />
                                                    </div>

                                                    <div className="text-sm font-medium text-slate-900">
                                                        {aluguer
                                                            .motorista
                                                            ?.nome_completo ??
                                                            'Por definir'}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {aluguer
                                                        .veiculo
                                                        ?.matricula ??
                                                        '—'}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {aluguer
                                                        .veiculo
                                                        ? `${aluguer.veiculo.marca} ${aluguer.veiculo.modelo}`
                                                        : ''}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {dateLabel(
                                                    aluguer.data_inicio
                                                )}
                                                {' → '}
                                                {dateLabel(
                                                    aluguer.data_fim
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                Passo{' '}
                                                {
                                                    aluguer.rascunho_passo
                                                }{' '}
                                                de 4
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={[
                                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                        statusClasses[
                                                            aluguer.status
                                                        ],
                                                    ].join(
                                                        ' '
                                                    )}
                                                >
                                                    {
                                                        statusLabels[
                                                            aluguer.status
                                                        ]
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    {aluguer.status ===
                                                        'rascunho' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setWizardId(
                                                                        aluguer.id
                                                                    )
                                                                }
                                                                className="h-9 px-3 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center gap-2"
                                                            >
                                                                <PlayCircle className="w-4 h-4" />
                                                                Continuar
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    deleteDraft(
                                                                        aluguer
                                                                    )
                                                                }
                                                                className="w-9 h-9 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 flex items-center justify-center"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {wizardId && (
                <AluguerWizard
                    id={
                        wizardId
                    }
                    templates={
                        templatesQuery
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
                    empresas={
                        empresasQuery
                            .data ??
                        []
                    }
                    checklists={
                        checklistsQuery
                            .data ??
                        []
                    }
                    onClose={() =>
                        setWizardId(
                            null
                        )
                    }
                    onChanged={
                        refresh
                    }
                    onActivated={
                        refresh
                    }
                />
            )}
        </div>
    );
}

function Stat({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
                {value}
            </p>
        </div>
    );
}

function Th({
    children,
}: {
    children: string;
}) {
    return (
        <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
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
