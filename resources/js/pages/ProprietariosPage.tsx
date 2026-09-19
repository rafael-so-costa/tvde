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
    Building2,
    KeyRound,
    LoaderCircle,
    Mail,
    Pencil,
    Plus,
    Search,
    ToggleLeft,
    ToggleRight,
    Trash2,
    UserRound,
} from 'lucide-react';
import api from '../lib/api';
import {
    useTenant,
} from '../contexts/TenantContext';
import ProprietarioFormModal from '../components/proprietarios/ProprietarioFormModal';
import ProprietarioAccountModal from '../components/proprietarios/ProprietarioAccountModal';
import type {
    Proprietario,
    ProprietarioPayload,
    ProprietarioStatus,
} from '../types/proprietario';

const statusLabels: Record<
    ProprietarioStatus,
    string
> = {
    pendente: 'Pendente',
    ativo: 'Completo',
    incompleto: 'Incompleto',
    inativo: 'Inativo',
};

const statusClasses: Record<
    ProprietarioStatus,
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

function ownerName(
    proprietario: Proprietario
): string {
    return (
        proprietario.nome_completo ??
        proprietario.nome_empresa ??
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

export default function ProprietariosPage() {
    const {
        tenant,
    } = useTenant();

    const queryClient =
        useQueryClient();

    const [search, setSearch] =
        useState('');

    const [
        editing,
        setEditing,
    ] = useState<Proprietario | null>(
        null
    );

    const [
        formOpen,
        setFormOpen,
    ] = useState(false);

    const [
        accountOwner,
        setAccountOwner,
    ] = useState<Proprietario | null>(
        null
    );

    const [
        deleting,
        setDeleting,
    ] = useState<Proprietario | null>(
        null
    );

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
                payload: ProprietarioPayload
            ) => {
                await api.post(
                    '/api/proprietarios',
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
                payload: ProprietarioPayload;
            }) => {
                await api.patch(
                    `/api/proprietarios/${id}`,
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
                    `/api/proprietarios/${id}/status`,
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
                    `/api/proprietarios/${id}`
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
                    'proprietarios',
                    tenant?.id,
                ],
            });
    }

    const proprietarios =
        useMemo(() => {
            const list =
                proprietariosQuery.data ??
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
                (owner) =>
                    [
                        ownerName(owner),
                        owner.nif,
                        owner.email,
                        owner.telemovel,
                        owner.endereco_cidade,
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
            proprietariosQuery.data,
            search,
        ]);

    async function save(
        payload: ProprietarioPayload
    ) {
        if (editing) {
            await updateMutation
                .mutateAsync({
                    id: editing.id,
                    payload,
                });
        } else {
            await createMutation
                .mutateAsync(payload);
        }

        await refresh();

        setFormOpen(false);
        setEditing(null);
    }

    if (!tenant) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />

                <div>
                    <h1 className="font-semibold text-amber-900">
                        Selecione uma organização
                    </h1>

                    <p className="text-sm text-amber-700 mt-1">
                        Selecione uma organização antes de gerir proprietários.
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
                        Organização
                    </p>

                    <h1 className="text-3xl font-bold text-slate-950">
                        Proprietários
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Gestão dos proprietários de veículos de{' '}
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
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Novo proprietário
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    label="Total"
                    value={
                        proprietariosQuery
                            .data
                            ?.length ?? 0
                    }
                />

                <Stat
                    label="Ativos"
                    value={
                        proprietariosQuery.data
                            ?.filter(
                                (item) =>
                                    item.ativo
                            )
                            .length ?? 0
                    }
                />

                <Stat
                    label="Incompletos"
                    value={
                        proprietariosQuery.data
                            ?.filter(
                                (item) =>
                                    item.status_cadastro ===
                                    'incompleto'
                            )
                            .length ?? 0
                    }
                />

                <Stat
                    label="Com conta"
                    value={
                        proprietariosQuery.data
                            ?.filter(
                                (item) =>
                                    item.user_id
                            )
                            .length ?? 0
                    }
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
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Pesquisar proprietário, NIF, e-mail..."
                            className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>
                </div>

                {proprietariosQuery.isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : proprietariosQuery.isError ? (
                    <div className="py-16 text-center px-6">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                        <p className="mt-3 text-slate-700">
                            {apiError(
                                proprietariosQuery.error
                            )}
                        </p>
                    </div>
                ) : proprietarios.length ===
                  0 ? (
                    <div className="py-20 text-center px-6">
                        <UserRound className="w-10 h-10 mx-auto text-indigo-500" />

                        <h3 className="mt-4 font-semibold text-slate-900">
                            Nenhum proprietário encontrado
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            Cadastre o primeiro proprietário desta organização.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Proprietário
                                    </th>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Contacto
                                    </th>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Estado
                                    </th>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Conta
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs uppercase text-slate-500">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {proprietarios.map(
                                    (owner) => (
                                        <tr
                                            key={
                                                owner.id
                                            }
                                            className="hover:bg-slate-50"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden">
                                                        {owner.foto_perfil_url ? (
                                                            <img
                                                                src={
                                                                    owner.foto_perfil_url
                                                                }
                                                                className="w-full h-full object-cover"
                                                                alt=""
                                                            />
                                                        ) : owner.tipo ===
                                                          'empresa' ? (
                                                            <Building2 className="w-5 h-5 text-indigo-600" />
                                                        ) : (
                                                            <UserRound className="w-5 h-5 text-indigo-600" />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="font-semibold text-sm text-slate-900">
                                                            {ownerName(
                                                                owner
                                                            )}
                                                        </div>

                                                        <div className="text-xs text-slate-500 mt-1">
                                                            {owner.tipo ===
                                                            'empresa'
                                                                ? 'Empresa'
                                                                : 'Pessoa física'}
                                                            {owner.nif &&
                                                                ` · NIF ${owner.nif}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                {owner.email ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Mail className="w-4 h-4 text-slate-400" />
                                                        {
                                                            owner.email
                                                        }
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={[
                                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                                                        statusClasses[
                                                            owner
                                                                .status_cadastro
                                                        ],
                                                    ].join(
                                                        ' '
                                                    )}
                                                >
                                                    {
                                                        statusLabels[
                                                            owner
                                                                .status_cadastro
                                                        ]
                                                    }
                                                </span>

                                                <div className="mt-2 text-xs">
                                                    {owner.ativo ? (
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
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setAccountOwner(
                                                            owner
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                                >
                                                    <KeyRound className="w-4 h-4" />

                                                    {owner.user_id
                                                        ? 'Alterar senha'
                                                        : 'Criar conta'}
                                                </button>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        title={
                                                            owner.ativo
                                                                ? 'Inativar'
                                                                : 'Ativar'
                                                        }
                                                        disabled={
                                                            statusMutation.isPending ||
                                                            (!owner.ativo &&
                                                                owner.status_cadastro ===
                                                                    'incompleto')
                                                        }
                                                        onClick={() =>
                                                            statusMutation.mutate(
                                                                {
                                                                    id: owner.id,
                                                                    ativo: !owner.ativo,
                                                                }
                                                            )
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-30"
                                                    >
                                                        {owner.ativo ? (
                                                            <ToggleRight className="w-5 h-5 text-emerald-600" />
                                                        ) : (
                                                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditing(
                                                                owner
                                                            );
                                                            setFormOpen(
                                                                true
                                                            );
                                                        }}
                                                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-indigo-50"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleting(
                                                                owner
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

            <ProprietarioFormModal
                open={formOpen}
                proprietario={
                    editing
                }
                onClose={() => {
                    setFormOpen(false);
                    setEditing(null);
                }}
                onSubmit={save}
            />

            <ProprietarioAccountModal
                open={Boolean(
                    accountOwner
                )}
                proprietario={
                    accountOwner
                }
                onClose={() =>
                    setAccountOwner(
                        null
                    )
                }
                onSuccess={
                    refresh
                }
            />

            {deleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        onClick={() =>
                            setDeleting(
                                null
                            )
                        }
                        className="absolute inset-0 bg-slate-950/60"
                    />

                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <Trash2 className="w-10 h-10 text-red-500" />

                        <h2 className="mt-4 text-xl font-semibold">
                            Eliminar proprietário?
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            {ownerName(
                                deleting
                            )}{' '}
                            será removido permanentemente.
                        </p>

                        {deleteMutation.isError && (
                            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
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
