import axios from 'axios';
import {
    useMemo,
    useState,
} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    Car,
    Gauge,
    LoaderCircle,
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    ToggleLeft,
    ToggleRight,
    Trash2,
    UserRound,
} from 'lucide-react';
import api from '../lib/api';
import {
    useTenant,
} from '../contexts/TenantContext';
import VeiculoFormModal from '../components/veiculos/VeiculoFormModal';
import type {
    Proprietario,
} from '../types/proprietario';
import type {
    Veiculo,
    VeiculoPayload,
    VeiculoStatus,
} from '../types/veiculo';

const statusLabels: Record<
    VeiculoStatus,
    string
> = {
    pendente: 'Pendente',
    ativo: 'Completo',
    incompleto: 'Incompleto',
    inativo: 'Inativo',
};

const statusClasses: Record<
    VeiculoStatus,
    string
> = {
    pendente:
        'bg-amber-50 text-amber-700',
    ativo:
        'bg-emerald-50 text-emerald-700',
    incompleto:
        'bg-orange-50 text-orange-700',
    inativo:
        'bg-slate-100 text-slate-600',
};

function proprietarioNome(
    veiculo: Veiculo
): string {
    if (!veiculo.proprietario) {
        return 'Sem proprietário';
    }

    return (
        veiculo.proprietario
            .nome_completo ??
        veiculo.proprietario
            .nome_empresa ??
        'Sem nome'
    );
}

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

function currency(
    value: string | null
): string {
    if (
        value === null ||
        value === ''
    ) {
        return '—';
    }

    return new Intl.NumberFormat(
        'pt-PT',
        {
            style: 'currency',
            currency: 'EUR',
        }
    ).format(
        Number(value)
    );
}

export default function VeiculosPage() {
    const {
        tenant,
    } = useTenant();

    const queryClient =
        useQueryClient();

    const [search, setSearch] =
        useState('');

    const [
        formOpen,
        setFormOpen,
    ] = useState(false);

    const [
        editing,
        setEditing,
    ] = useState<Veiculo | null>(
        null
    );

    const [
        deleting,
        setDeleting,
    ] = useState<Veiculo | null>(
        null
    );

    const veiculosQuery =
        useQuery({
            queryKey: [
                'veiculos',
                tenant?.id,
            ],
            enabled: Boolean(
                tenant?.id
            ),
            queryFn: async () => {
                const response =
                    await api.get(
                        '/api/veiculos'
                    );

                return response.data
                    .data as Veiculo[];
            },
        });

    const proprietariosQuery =
        useQuery({
            queryKey: [
                'proprietarios',
                tenant?.id,
            ],
            enabled: Boolean(
                tenant?.id
            ),
            queryFn: async () => {
                const response =
                    await api.get(
                        '/api/proprietarios'
                    );

                return response.data
                    .data as Proprietario[];
            },
        });

    const createMutation =
        useMutation({
            mutationFn: async (
                payload: VeiculoPayload
            ) => {
                await api.post(
                    '/api/veiculos',
                    payload
                );
            },
        });

    const updateMutation =
        useMutation({
            mutationFn: async ({
                id,
                payload,
            }: {
                id: string;
                payload: VeiculoPayload;
            }) => {
                await api.patch(
                    `/api/veiculos/${id}`,
                    payload
                );
            },
        });

    const statusMutation =
        useMutation({
            mutationFn: async ({
                id,
                ativo,
            }: {
                id: string;
                ativo: boolean;
            }) => {
                await api.patch(
                    `/api/veiculos/${id}/status`,
                    {
                        ativo,
                    }
                );
            },
            onSuccess: async () => {
                await refresh();
            },
        });

    const deleteMutation =
        useMutation({
            mutationFn: async (
                id: string
            ) => {
                await api.delete(
                    `/api/veiculos/${id}`
                );
            },
            onSuccess: async () => {
                setDeleting(null);
                await refresh();
            },
        });

    async function refresh() {
        await queryClient
            .invalidateQueries({
                queryKey: [
                    'veiculos',
                    tenant?.id,
                ],
            });
    }

    async function save(
        payload: VeiculoPayload
    ) {
        if (editing) {
            await updateMutation
                .mutateAsync({
                    id: editing.id,
                    payload,
                });
        } else {
            await createMutation
                .mutateAsync(
                    payload
                );
        }

        await refresh();

        setFormOpen(false);
        setEditing(null);
    }

    const veiculos =
        useMemo(() => {
            const list =
                veiculosQuery.data ??
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
                (veiculo) =>
                    [
                        veiculo.matricula,
                        veiculo.marca,
                        veiculo.modelo,
                        veiculo.cor,
                        veiculo.chassi,
                        veiculo.combustivel,
                        proprietarioNome(
                            veiculo
                        ),
                    ]
                        .filter(Boolean)
                        .some((value) =>
                            String(value)
                                .toLocaleLowerCase(
                                    'pt-PT'
                                )
                                .includes(
                                    term
                                )
                        )
            );
        }, [
            veiculosQuery.data,
            search,
        ]);

    if (!tenant) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />

                <div>
                    <h1 className="font-semibold text-amber-900">
                        Selecione uma organização
                    </h1>

                    <p className="mt-1 text-sm text-amber-700">
                        Selecione uma organização antes de gerir a frota.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        Frota
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Veículos
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Gestão da frota de{' '}
                        <span className="font-medium text-slate-700">
                            {tenant.nome}
                        </span>
                        .
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Novo veículo
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    label="Total"
                    value={
                        veiculosQuery.data
                            ?.length ?? 0
                    }
                    icon={Car}
                />

                <Stat
                    label="Ativos"
                    value={
                        veiculosQuery.data
                            ?.filter(
                                (item) =>
                                    item.ativo
                            )
                            .length ?? 0
                    }
                    icon={
                        ShieldCheck
                    }
                />

                <Stat
                    label="Incompletos"
                    value={
                        veiculosQuery.data
                            ?.filter(
                                (item) =>
                                    item.status_cadastro ===
                                    'incompleto'
                            )
                            .length ?? 0
                    }
                    icon={Gauge}
                />

                <Stat
                    label="Com proprietário"
                    value={
                        veiculosQuery.data
                            ?.filter(
                                (item) =>
                                    item.proprietario_id
                            )
                            .length ?? 0
                    }
                    icon={UserRound}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                        <input
                            value={search}
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Pesquisar matrícula, marca, modelo..."
                            className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>
                </div>

                {veiculosQuery.isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : veiculosQuery.isError ? (
                    <div className="py-16 text-center px-6">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                        <p className="mt-3 text-slate-700">
                            {apiError(
                                veiculosQuery.error
                            )}
                        </p>
                    </div>
                ) : veiculos.length === 0 ? (
                    <div className="py-20 text-center px-6">
                        <Car className="w-11 h-11 mx-auto text-indigo-500" />

                        <h3 className="mt-4 font-semibold text-slate-900">
                            {search
                                ? 'Nenhum veículo encontrado'
                                : 'Ainda não existem veículos'}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            {search
                                ? 'Tente pesquisar por outra matrícula, marca ou modelo.'
                                : 'Cadastre o primeiro veículo desta organização.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Veículo
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Proprietário
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Aluguer
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {veiculos.map(
                                    (veiculo) => (
                                        <tr
                                            key={
                                                veiculo.id
                                            }
                                            className="hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center overflow-hidden shrink-0">
                                                        {veiculo.foto_principal_url ? (
                                                            <img
                                                                src={
                                                                    veiculo.foto_principal_url
                                                                }
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Car className="w-6 h-6" />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="font-semibold text-slate-900">
                                                            {
                                                                veiculo.matricula
                                                            }
                                                        </div>

                                                        <div className="text-sm text-slate-500 mt-0.5">
                                                            {
                                                                veiculo.marca
                                                            }{' '}
                                                            {
                                                                veiculo.modelo
                                                            }
                                                        </div>

                                                        {(veiculo.cor ||
                                                            veiculo.combustivel) && (
                                                            <div className="text-xs text-slate-400 mt-1">
                                                                {[
                                                                    veiculo.cor,
                                                                    veiculo.combustivel,
                                                                ]
                                                                    .filter(
                                                                        Boolean
                                                                    )
                                                                    .join(
                                                                        ' · '
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                {veiculo.proprietario ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <UserRound className="w-4 h-4 text-slate-400" />
                                                        {proprietarioNome(
                                                            veiculo
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">
                                                        Sem proprietário
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="font-medium text-sm text-slate-800">
                                                    {currency(
                                                        veiculo.valor_aluguel
                                                    )}
                                                </div>

                                                {veiculo.valor_caucao && (
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        Caução{' '}
                                                        {currency(
                                                            veiculo.valor_caucao
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={[
                                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                                                        statusClasses[
                                                            veiculo.status_cadastro
                                                        ],
                                                    ].join(
                                                        ' '
                                                    )}
                                                >
                                                    {
                                                        statusLabels[
                                                            veiculo.status_cadastro
                                                        ]
                                                    }
                                                </span>

                                                <div className="mt-2 text-xs">
                                                    {veiculo.ativo ? (
                                                        <span className="text-emerald-600">
                                                            Ativo
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500">
                                                            Inativo
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        title={
                                                            veiculo.ativo
                                                                ? 'Inativar'
                                                                : 'Ativar'
                                                        }
                                                        disabled={
                                                            statusMutation.isPending ||
                                                            (!veiculo.ativo &&
                                                                veiculo.status_cadastro ===
                                                                    'incompleto')
                                                        }
                                                        onClick={() =>
                                                            statusMutation.mutate(
                                                                {
                                                                    id: veiculo.id,
                                                                    ativo: !veiculo.ativo,
                                                                }
                                                            )
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50"
                                                    >
                                                        {veiculo.ativo ? (
                                                            <ToggleRight className="w-5 h-5 text-emerald-600" />
                                                        ) : (
                                                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        onClick={() => {
                                                            setEditing(
                                                                veiculo
                                                            );
                                                            setFormOpen(
                                                                true
                                                            );
                                                        }}
                                                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Eliminar"
                                                        onClick={() =>
                                                            setDeleting(
                                                                veiculo
                                                            )
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-red-50 text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
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

            <VeiculoFormModal
                open={formOpen}
                veiculo={editing}
                proprietarios={
                    proprietariosQuery.data ??
                    []
                }
                proprietariosLoading={
                    proprietariosQuery.isLoading
                }
                onClose={() => {
                    setFormOpen(false);
                    setEditing(null);
                }}
                onSubmit={save}
            />

            {deleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Cancelar"
                        onClick={() =>
                            setDeleting(
                                null
                            )
                        }
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    />

                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <Trash2 className="w-10 h-10 text-red-500" />

                        <h2 className="mt-4 text-xl font-semibold text-slate-950">
                            Eliminar veículo?
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            O veículo{' '}
                            <span className="font-semibold text-slate-700">
                                {
                                    deleting.matricula
                                }
                            </span>{' '}
                            será removido permanentemente.
                        </p>

                        {deleteMutation.isError && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {apiError(
                                    deleteMutation.error
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setDeleting(
                                        null
                                    )
                                }
                                disabled={
                                    deleteMutation.isPending
                                }
                                className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                disabled={
                                    deleteMutation.isPending
                                }
                                onClick={() =>
                                    deleteMutation.mutate(
                                        deleting.id
                                    )
                                }
                                className="h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleteMutation.isPending && (
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                )}

                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Car;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
