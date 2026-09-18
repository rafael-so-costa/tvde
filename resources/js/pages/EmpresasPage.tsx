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
    LoaderCircle,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-react';
import api from '../lib/api';
import {
    useTenant,
} from '../contexts/TenantContext';
import EmpresaFormModal from '../components/empresas/EmpresaFormModal';
import type {
    Empresa,
    EmpresaPayload,
    EmpresaStatus,
} from '../types/empresa';

const statusLabels: Record<
    EmpresaStatus,
    string
> = {
    pendente: 'Pendente',
    ativo: 'Ativo',
    incompleto: 'Incompleto',
    inativo: 'Inativo',
};

const statusClasses: Record<
    EmpresaStatus,
    string
> = {
    pendente:
        'bg-amber-50 text-amber-700 ring-amber-600/20',
    ativo:
        'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    incompleto:
        'bg-orange-50 text-orange-700 ring-orange-600/20',
    inativo:
        'bg-slate-100 text-slate-600 ring-slate-500/20',
};

function errorMessage(
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
            'Não foi possível carregar as empresas.'
        );
    }

    return 'Não foi possível carregar as empresas.';
}

export default function EmpresasPage() {
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
    ] = useState<Empresa | null>(
        null
    );

    const [
        deleting,
        setDeleting,
    ] = useState<Empresa | null>(
        null
    );

    const empresasQuery =
        useQuery({
            queryKey: [
                'empresas',
                tenant?.id,
            ],
            enabled: Boolean(
                tenant?.id
            ),
            queryFn: async () => {
                const response =
                    await api.get(
                        '/api/empresas'
                    );

                return response.data
                    .data as Empresa[];
            },
        });

    const createMutation =
        useMutation({
            mutationFn: async (
                payload: EmpresaPayload
            ) => {
                const response =
                    await api.post(
                        '/api/empresas',
                        payload
                    );

                return response.data
                    .data as Empresa;
            },
        });

    const updateMutation =
        useMutation({
            mutationFn: async ({
                id,
                payload,
            }: {
                id: string;
                payload: EmpresaPayload;
            }) => {
                const response =
                    await api.patch(
                        `/api/empresas/${id}`,
                        payload
                    );

                return response.data
                    .data as Empresa;
            },
        });

    const deleteMutation =
        useMutation({
            mutationFn: async (
                id: string
            ) => {
                await api.delete(
                    `/api/empresas/${id}`
                );
            },
            onSuccess: async () => {
                await queryClient
                    .invalidateQueries({
                        queryKey: [
                            'empresas',
                            tenant?.id,
                        ],
                    });

                setDeleting(null);
            },
        });

    const empresas =
        useMemo(() => {
            const data =
                empresasQuery.data ??
                [];

            const term =
                search
                    .trim()
                    .toLocaleLowerCase(
                        'pt-PT'
                    );

            if (!term) {
                return data;
            }

            return data.filter(
                (empresa) =>
                    [
                        empresa
                            .nome_empresa,
                        empresa.nif,
                        empresa.email,
                        empresa
                            .nome_gerente,
                        empresa
                            .endereco_cidade,
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
            empresasQuery.data,
            search,
        ]);

    function openCreate() {
        setEditing(null);
        setFormOpen(true);
    }

    function openEdit(
        empresa: Empresa
    ) {
        setEditing(empresa);
        setFormOpen(true);
    }

    async function handleSave(
        payload: EmpresaPayload
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

        await queryClient
            .invalidateQueries({
                queryKey: [
                    'empresas',
                    tenant?.id,
                ],
            });

        setFormOpen(false);
        setEditing(null);
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
                            Escolha uma organização no topo do painel antes de aceder às empresas.
                        </p>
                    </div>
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

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Empresas
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Empresas cadastradas em{' '}
                        <span className="font-medium text-slate-700">
                            {tenant.nome}
                        </span>
                        .
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        openCreate
                    }
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Nova empresa
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Total
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                        {empresasQuery
                            .data
                            ?.length ??
                            0}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Ativas
                    </p>

                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                        {empresasQuery.data
                            ?.filter(
                                (
                                    empresa
                                ) =>
                                    empresa
                                        .ativo
                            )
                            .length ??
                            0}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Pendentes
                    </p>

                    <p className="mt-2 text-2xl font-bold text-amber-600">
                        {empresasQuery.data
                            ?.filter(
                                (
                                    empresa
                                ) =>
                                    empresa
                                        .status_cadastro ===
                                    'pendente'
                            )
                            .length ??
                            0}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Incompletas
                    </p>

                    <p className="mt-2 text-2xl font-bold text-orange-600">
                        {empresasQuery.data
                            ?.filter(
                                (
                                    empresa
                                ) =>
                                    empresa
                                        .status_cadastro ===
                                    'incompleto'
                            )
                            .length ??
                            0}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-sm">
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
                            placeholder="Pesquisar empresa, NIF, e-mail..."
                            className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            empresasQuery.refetch()
                        }
                        disabled={
                            empresasQuery
                                .isFetching
                        }
                        className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                'w-4 h-4',
                                empresasQuery
                                    .isFetching
                                    ? 'animate-spin'
                                    : '',
                            ].join(
                                ' '
                            )}
                        />
                        Atualizar
                    </button>
                </div>

                {empresasQuery.isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600 mb-3" />

                        <p className="text-sm">
                            A carregar empresas...
                        </p>
                    </div>
                ) : empresasQuery.isError ? (
                    <div className="py-16 px-6 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />

                        <h3 className="font-semibold text-slate-900">
                            Não foi possível carregar as empresas
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            {errorMessage(
                                empresasQuery.error
                            )}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                empresasQuery.refetch()
                            }
                            className="mt-5 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : empresas.length ===
                  0 ? (
                    <div className="py-20 px-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-7 h-7" />
                        </div>

                        <h3 className="font-semibold text-slate-900">
                            {search
                                ? 'Nenhuma empresa encontrada'
                                : 'Ainda não existem empresas'}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                            {search
                                ? 'Tente pesquisar por outro nome, NIF ou e-mail.'
                                : 'Cadastre a primeira empresa desta organização.'}
                        </p>

                        {!search && (
                            <button
                                type="button"
                                onClick={
                                    openCreate
                                }
                                className="mt-5 h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
                            >
                                Criar empresa
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Empresa
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Contacto
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Localização
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {empresas.map(
                                    (
                                        empresa
                                    ) => (
                                        <tr
                                            key={
                                                empresa.id
                                            }
                                            className="hover:bg-slate-50/70 transition"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {empresa.logo_url ? (
                                                            <img
                                                                src={
                                                                    empresa.logo_url
                                                                }
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Building2 className="w-5 h-5" />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="font-semibold text-sm text-slate-900">
                                                            {
                                                                empresa.nome_empresa
                                                            }
                                                        </div>

                                                        <div className="mt-0.5 text-xs text-slate-500">
                                                            NIF{' '}
                                                            {
                                                                empresa.nif
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    {empresa.email && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Mail className="w-4 h-4 text-slate-400" />
                                                            {
                                                                empresa.email
                                                            }
                                                        </div>
                                                    )}

                                                    {empresa.telemovel && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Phone className="w-4 h-4 text-slate-400" />
                                                            {
                                                                empresa.telemovel
                                                            }
                                                        </div>
                                                    )}

                                                    {!empresa.email &&
                                                        !empresa.telemovel && (
                                                            <span className="text-sm text-slate-400">
                                                                —
                                                            </span>
                                                        )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                {empresa.endereco_cidade ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <MapPin className="w-4 h-4 text-slate-400" />
                                                        {
                                                            empresa.endereco_cidade
                                                        }
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <span
                                                        className={[
                                                            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                                                            statusClasses[
                                                                empresa
                                                                    .status_cadastro
                                                            ],
                                                        ].join(
                                                            ' '
                                                        )}
                                                    >
                                                        {
                                                            statusLabels[
                                                                empresa
                                                                    .status_cadastro
                                                            ]
                                                        }
                                                    </span>

                                                    {!empresa.ativo && (
                                                        <span className="text-xs text-red-500">
                                                            Desativada
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        onClick={() =>
                                                            openEdit(
                                                                empresa
                                                            )
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition flex items-center justify-center"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Eliminar"
                                                        onClick={() =>
                                                            setDeleting(
                                                                empresa
                                                            )
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition flex items-center justify-center"
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

            <EmpresaFormModal
                open={formOpen}
                empresa={editing}
                onClose={() => {
                    setFormOpen(
                        false
                    );
                    setEditing(
                        null
                    );
                }}
                onSubmit={
                    handleSave
                }
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
                        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-5">
                            <Trash2 className="w-5 h-5" />
                        </div>

                        <h2 className="text-xl font-semibold text-slate-950">
                            Eliminar empresa?
                        </h2>

                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            A empresa{' '}
                            <span className="font-semibold text-slate-700">
                                {
                                    deleting.nome_empresa
                                }
                            </span>{' '}
                            será removida permanentemente.
                        </p>

                        {deleteMutation.isError && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {errorMessage(
                                    deleteMutation.error
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={
                                    deleteMutation
                                        .isPending
                                }
                                onClick={() =>
                                    setDeleting(
                                        null
                                    )
                                }
                                className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                disabled={
                                    deleteMutation
                                        .isPending
                                }
                                onClick={() =>
                                    deleteMutation.mutate(
                                        deleting.id
                                    )
                                }
                                className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
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
