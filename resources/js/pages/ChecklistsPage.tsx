import ContratosSubnav from "../components/contratos/ContratosSubnav";
import axios from 'axios';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import {
    useSearchParams,
} from 'react-router-dom';
import {
    AlertCircle,
    Car,
    ClipboardCheck,
    Download,
    Eye,
    FileText,
    LoaderCircle,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    UserRound,
    X,
} from 'lucide-react';
import api from '../lib/api';
import {
    downloadAuthenticatedFile,
    openAuthenticatedFile,
} from '../lib/authenticatedFile';

import {
    useTenant,
} from '../contexts/TenantContext';
import ChecklistFormModal from '../components/checklists/ChecklistFormModal';
import type {
    ChecklistEstado,
    ChecklistRecord,
    ChecklistTipo,
} from '../types/checklist';
import type {
    Motorista,
} from '../types/motorista';
import type {
    Veiculo,
} from '../types/veiculo';

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

function dateLabel(
    value: string | null
) {
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

function currency(
    value:
        | string
        | number
) {
    return Number(
        value || 0
    ).toLocaleString(
        'pt-PT',
        {
            style: 'currency',
            currency: 'EUR',
        }
    );
}

export default function ChecklistsPage() {
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
        filter,
        setFilter,
    ] = useState<
        'todos' | ChecklistTipo
    >('todos');

    const [
        formOpen,
        setFormOpen,
    ] = useState(false);

    const [
        formTipo,
        setFormTipo,
    ] =
        useState<ChecklistTipo>(
            'entrega'
        );

    const [
        editing,
        setEditing,
    ] =
        useState<ChecklistRecord | null>(
            null
        );

    const [
        deliveryForReturn,
        setDeliveryForReturn,
    ] =
        useState<ChecklistRecord | null>(
            null
        );

    const [
        viewing,
        setViewing,
    ] =
        useState<ChecklistRecord | null>(
            null
        );

    const [
        deleting,
        setDeleting,
    ] =
        useState<ChecklistRecord | null>(
            null
        );

    const [
        searchParams,
        setSearchParams,
    ]=useSearchParams();

    const [
        estado,
        setEstado,
    ]=useState<
        'todos'|
        ChecklistEstado
    >(
        ()=>{
            const value=
                searchParams.get(
                    'estado'
                );

            return value===
                'rascunho'||
                value===
                'finalizado'
                    ?value
                    :'todos';
        }
    );

    useEffect(()=>{
        if(
            searchParams.get(
                'novo'
            ) ===
            'entrega'
        ){
            setEditing(null);
            setDeliveryForReturn(null);
            setFormTipo('entrega');
            setFormOpen(true);

            const next=
                new URLSearchParams(
                    searchParams
                );

            next.delete(
                'novo'
            );

            setSearchParams(
                next,
                {
                    replace:true,
                }
            );
        }
    },[
        searchParams,
        setSearchParams,
    ]);

    const recordsQuery =
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

    const optionsQuery =
        useQuery({
            queryKey: [
                'checklist-options',
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            staleTime: 0,

            refetchOnMount:
                'always',

            refetchOnWindowFocus:
                true,

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            '/api/checklists/options'
                        );

                    return response
                        .data
                        .data as {
                            motoristas: Motorista[];
                            veiculos: Veiculo[];
                        };
                },
        });
    const deleteMutation =
        useMutation({
            mutationFn:
                async (
                    id: string
                ) => {
                    await api.delete(
                        `/api/checklists/${id}`
                    );
                },

            onSuccess:
                async () => {
                    setDeleting(
                        null
                    );

                    await refresh();
                },
        });

    async function refresh() {
        await queryClient.invalidateQueries(
            {
                queryKey: [
                    'checklists',
                    tenant?.id,
                ],
            }
        );
    }

    const records =
        useMemo(() => {
            const list =
                recordsQuery.data ??
                [];

            const term =
                search
                    .trim()
                    .toLocaleLowerCase(
                        'pt-PT'
                    );

            return list.filter(
                (record) => {
                    if (
                        filter !==
                            'todos' &&
                        record.tipo !==
                            filter
                    ) {
                        return false;
                    }

                    if (
                        estado !==
                            'todos' &&
                        record.estado !==
                            estado
                    ) {
                        return false;
                    }

                    if (!term) {
                        return true;
                    }

                    return [
                        record.matricula_snapshot,
                        record.modelo_snapshot,
                        record.motorista_nome_snapshot,
                        record.estado,
                        record.tipo,
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
                        );
                }
            );
        }, [
            recordsQuery.data,
            search,
            filter,
            estado,
        ]);

    const allRecords =
        recordsQuery.data ??
        [];

    const openDeliveries =
        allRecords.filter(
            (record) =>
                record.tipo ===
                    'entrega' &&
                record.estado ===
                    'finalizado' &&
                !record.recolha
        );

    if (!tenant) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />

                <div>
                    <h1 className="font-semibold text-amber-900">
                        Selecione uma organização
                    </h1>

                    <p className="mt-1 text-sm text-amber-700">
                        Selecione uma organização antes de gerir checklists.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <ContratosSubnav />
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        Operação
                    </p>

                    <h1 className="text-3xl font-bold text-slate-950">
                        Checklists
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Inspeções de entrega, recolha e histórico operacional vinculados aos contratos.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setEditing(
                                null
                            );
                            setDeliveryForReturn(
                                null
                            );
                            setFormTipo(
                                'entrega'
                            );
                            setFormOpen(
                                true
                            );
                        }}
                        className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nova entrega
                    </button>

                    <button
                        type="button"
                        disabled={
                            openDeliveries.length ===
                            0
                        }
                        onClick={() => {
                            setEditing(
                                null
                            );
                            setDeliveryForReturn(
                                null
                            );
                            setFormTipo(
                                'recolha'
                            );
                            setFormOpen(
                                true
                            );
                        }}
                        className="h-11 px-5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Nova recolha
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    label="Total"
                    value={
                        allRecords.length
                    }
                />

                <Stat
                    label="Finalizados"
                    value={
                        allRecords.filter(
                            (
                                item
                            ) =>
                                item.estado ===
                                'finalizado'
                        ).length
                    }
                />

                <Stat
                    label="Entregas abertas"
                    value={
                        openDeliveries.length
                    }
                />

                <Stat
                    label="Recolhas"
                    value={
                        allRecords.filter(
                            (
                                item
                            ) =>
                                item.tipo ===
                                'recolha'
                        ).length
                    }
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
                    <div className="relative max-w-md flex-1">
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
                            placeholder="Pesquisar matrícula, motorista, modelo..."
                            className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={
                                estado
                            }
                            onChange={event=>
                                setEstado(
                                    event.target
                                        .value as
                                        'todos'|
                                        ChecklistEstado
                                )
                            }
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"
                        >
                            <option value="todos">
                                Todos os estados
                            </option>

                            <option value="rascunho">
                                Pendentes
                            </option>

                            <option value="aguardando_assinaturas">
                                Aguardando assinaturas
                            </option>

                            <option value="finalizado">
                                Finalizados
                            </option>
                        </select>

                        {(
                            [
                                [
                                    'todos',
                                    'Todos',
                                ],
                                [
                                    'entrega',
                                    'Entregas',
                                ],
                                [
                                    'recolha',
                                    'Recolhas',
                                ],
                            ] as const
                        ).map(
                            ([
                                value,
                                label,
                            ]) => (
                                <button
                                    key={
                                        value
                                    }
                                    type="button"
                                    onClick={() =>
                                        setFilter(
                                            value
                                        )
                                    }
                                    className={[
                                        'h-10 px-4 rounded-xl text-sm font-semibold border',
                                        filter ===
                                        value
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-white border-slate-200 text-slate-500',
                                    ].join(
                                        ' '
                                    )}
                                >
                                    {
                                        label
                                    }
                                </button>
                            )
                        )}
                    </div>
                </div>

                {recordsQuery.isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : recordsQuery.isError ? (
                    <div className="py-16 text-center px-6">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                        <p className="mt-3 text-slate-700">
                            {apiError(
                                recordsQuery.error
                            )}
                        </p>
                    </div>
                ) : records.length ===
                  0 ? (
                    <div className="py-20 text-center px-6">
                        <ClipboardCheck className="w-11 h-11 mx-auto text-indigo-500" />

                        <h3 className="mt-4 font-semibold text-slate-900">
                            Nenhum checklist encontrado
                        </h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Operação
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Veículo
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Motorista
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        KM / combustível
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500">
                                        Penalização
                                    </th>

                                    <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-500 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {records.map(
                                    (
                                        record
                                    ) => (
                                        <tr
                                            key={
                                                record.id
                                            }
                                            className="hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <span
                                                    className={[
                                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                        record.tipo ===
                                                        'entrega'
                                                            ? 'bg-indigo-50 text-indigo-700'
                                                            : 'bg-amber-50 text-amber-700',
                                                    ].join(
                                                        ' '
                                                    )}
                                                >
                                                    {record.tipo ===
                                                    'entrega'
                                                        ? 'Entrega'
                                                        : 'Recolha'}
                                                </span>

                                                <div className="mt-2 text-xs text-slate-500">
                                                    {dateLabel(
                                                        record.data_operacao
                                                    )}

                                                    {record.hora_operacao &&
                                                        ` · ${record.hora_operacao.slice(
                                                            0,
                                                            5
                                                        )}`}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Car className="w-4 h-4 text-slate-400" />

                                                    <div>
                                                        <div className="font-semibold text-sm text-slate-900">
                                                            {record.matricula_snapshot ??
                                                                '—'}
                                                        </div>

                                                        <div className="text-xs text-slate-500">
                                                            {record.modelo_snapshot ??
                                                                '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <UserRound className="w-4 h-4 text-slate-400" />

                                                    {record.motorista_nome_snapshot ??
                                                        '—'}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="text-sm font-medium text-slate-800">
                                                    {record.quilometragem ??
                                                        '—'}{' '}
                                                    km
                                                </div>

                                                <div className="mt-1 text-xs text-slate-500">
                                                    {record.nivel_combustivel ??
                                                        '—'}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={[
                                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                                                        record.estado ===
                                                        'finalizado'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : record.estado ===
                                                              'aguardando_assinaturas'
                                                                ? 'bg-blue-50 text-blue-700'
                                                                : 'bg-slate-100 text-slate-600',
                                                    ].join(
                                                        ' '
                                                    )}
                                                >
                                                    {
                                                        record.estado ===
                                                        'finalizado'
                                                            ? 'Finalizado'
                                                            : record.estado ===
                                                              'aguardando_assinaturas'
                                                                ? 'Aguardando assinaturas'
                                                                : 'Rascunho'
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={
                                                        Number(
                                                            record.penalizacao_total
                                                        ) >
                                                        0
                                                            ? 'font-semibold text-red-600'
                                                            : 'text-sm text-slate-500'
                                                    }
                                                >
                                                    {currency(
                                                        record.penalizacao_total
                                                    )}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        title="Ver detalhes"
                                                        onClick={() =>
                                                            setViewing(
                                                                record
                                                            )
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {record.estado ===
                                                        'finalizado' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                title="Ver PDF"
                                                                onClick={async()=>{
                                                                    try{
                                                                        await openAuthenticatedFile(
                                                                            `/api/checklists/${record.id}/pdf`
                                                                        );
                                                                    }catch(error){
                                                                        window.alert(
                                                                            apiError(error)
                                                                        );
                                                                    }
                                                                }}
                                                                className="w-9 h-9 rounded-lg border border-indigo-200 text-indigo-600 flex items-center justify-center hover:bg-indigo-50"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                title="Baixar PDF"
                                                                onClick={async()=>{
                                                                    try{
                                                                        await downloadAuthenticatedFile(
                                                                            `/api/checklists/${record.id}/pdf/download`,
                                                                            `checklist-${record.tipo}-${record.matricula_snapshot??record.id}.pdf`
                                                                        );
                                                                    }catch(error){
                                                                        window.alert(
                                                                            apiError(error)
                                                                        );
                                                                    }
                                                                }}
                                                                className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 hover:text-indigo-600"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {record.estado ===
                                                        'rascunho' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                title="Editar"
                                                                onClick={() => {
                                                                    setEditing(
                                                                        record
                                                                    );
                                                                    setDeliveryForReturn(
                                                                        null
                                                                    );
                                                                    setFormTipo(
                                                                        record.tipo
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
                                                                        record
                                                                    )
                                                                }
                                                                className="w-9 h-9 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {record.tipo ===
                                                        'entrega' &&
                                                        record.estado ===
                                                            'finalizado' &&
                                                        !record.recolha && (
                                                            <button
                                                                type="button"
                                                                title="Registar recolha"
                                                                onClick={() => {
                                                                    setEditing(
                                                                        null
                                                                    );
                                                                    setDeliveryForReturn(
                                                                        record
                                                                    );
                                                                    setFormTipo(
                                                                        'recolha'
                                                                    );
                                                                    setFormOpen(
                                                                        true
                                                                    );
                                                                }}
                                                                className="w-9 h-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 flex items-center justify-center"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
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

            <ChecklistFormModal
                open={
                    formOpen
                }
                tipo={
                    formTipo
                }
                record={
                    editing
                }
                initialDelivery={
                    deliveryForReturn
                }
                records={
                    allRecords
                }
                motoristas={
                    optionsQuery.data?.motoristas ??
                    []
                }
                veiculos={
                    optionsQuery.data?.veiculos ??
                    []
                }
                onClose={() => {
                    setFormOpen(
                        false
                    );
                    setEditing(
                        null
                    );
                    setDeliveryForReturn(
                        null
                    );
                }}
                onSuccess={
                    refresh
                }
            />

            {viewing && (
                <DetailModal
                    record={
                        viewing
                    }
                    onClose={() =>
                        setViewing(
                            null
                        )
                    }
                />
            )}

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

                        <h2 className="mt-4 text-xl font-semibold text-slate-950">
                            Eliminar rascunho?
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            O checklist será removido permanentemente.
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

function DetailModal({
    record,
    onClose,
}: {
    record: ChecklistRecord;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                onClick={
                    onClose
                }
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <header className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-950">
                            {record.tipo ===
                            'entrega'
                                ? 'Checklist de entrega'
                                : 'Checklist de recolha'}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {
                                record.matricula_snapshot
                            }{' '}
                            ·{' '}
                            {dateLabel(
                                record.data_operacao
                            )}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className="p-6 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Info
                            label="Motorista"
                            value={
                                record.motorista_nome_snapshot ??
                                '—'
                            }
                        />

                        <Info
                            label="Veículo"
                            value={`${record.matricula_snapshot ?? '—'} · ${record.modelo_snapshot ?? '—'}`}
                        />

                        <Info
                            label="Quilometragem"
                            value={`${record.quilometragem ?? '—'} km`}
                        />

                        <Info
                            label="Combustível / carga"
                            value={
                                record.nivel_combustivel ??
                                '—'
                            }
                        />

                        <Info
                            label="Estado"
                            value={
                                record.estado ===
                                'finalizado'
                                    ? 'Finalizado'
                                    : record.estado ===
                                      'aguardando_assinaturas'
                                        ? 'Aguardando assinaturas'
                                        : 'Rascunho'
                            }
                        />

                        <Info
                            label="Penalização"
                            value={currency(
                                record.penalizacao_total
                            )}
                        />
                    </div>

                    {record.observacoes && (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">
                                Observações
                            </h3>

                            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 whitespace-pre-wrap">
                                {
                                    record.observacoes
                                }
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                            Itens
                        </h3>

                        <div className="grid sm:grid-cols-2 gap-2">
                            {Object.entries(
                                record.tipo ===
                                    'entrega'
                                    ? record.itens ??
                                          {}
                                    : record.itens_faltantes ??
                                          {}
                            ).map(
                                ([
                                    key,
                                    value,
                                ]) => (
                                    <div
                                        key={
                                            key
                                        }
                                        className="rounded-lg border border-slate-200 px-3 py-2 flex justify-between text-sm"
                                    >
                                        <span className="text-slate-600">
                                            {
                                                key
                                            }
                                        </span>

                                        <span
                                            className={
                                                value
                                                    ? record.tipo ===
                                                      'recolha'
                                                        ? 'text-red-600 font-medium'
                                                        : 'text-emerald-600 font-medium'
                                                    : 'text-slate-400'
                                            }
                                        >
                                            {value
                                                ? record.tipo ===
                                                  'recolha'
                                                    ? 'Em falta'
                                                    : 'Sim'
                                                : 'Não'}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                            Danos
                        </h3>

                        {(record.tipo ===
                        'entrega'
                            ? record.danos
                            : record.novos_danos
                        )?.length ? (
                            <div className="space-y-2">
                                {(record.tipo ===
                                'entrega'
                                    ? record.danos
                                    : record.novos_danos
                                ).map(
                                    (
                                        damage,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                index
                                            }
                                            className="rounded-xl border border-slate-200 p-3 flex justify-between gap-4"
                                        >
                                            <div>
                                                <div className="font-medium text-sm text-slate-800">
                                                    {
                                                        damage.part
                                                    }
                                                </div>

                                                <div className="mt-1 text-xs text-slate-500">
                                                    {damage.types.join(
                                                        ', '
                                                    )}
                                                </div>
                                            </div>

                                            <div className="font-semibold text-sm text-slate-800">
                                                {currency(
                                                    damage.value ??
                                                        0
                                                )}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">
                                Nenhum dano registado.
                            </p>
                        )}
                    </div>
                </div>
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
        <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
                {label}
            </div>

            <div className="mt-1.5 text-sm font-medium text-slate-800">
                {value}
            </div>
        </div>
    );
}
