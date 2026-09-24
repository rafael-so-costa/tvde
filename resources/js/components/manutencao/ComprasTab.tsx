import axios from 'axios';
import {useMemo,useState} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    Ban,
    Eye,
    LoaderCircle,
    PackageCheck,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Send,
    ShoppingCart,
    Trash2,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import CompraFormModal from './CompraFormModal';
import ReceberCompraModal from './ReceberCompraModal';
import type {
    Compra,
    CompraStatus,
} from '../../types/manutencao';

type StatusFilter='todos'|CompraStatus;

const statusLabels:Record<CompraStatus,string>={
    rascunho:'Rascunho',
    encomendada:'Encomendada',
    parcialmente_recebida:'Parcialmente recebida',
    recebida:'Recebida',
    cancelada:'Cancelada',
};

const statusClasses:Record<CompraStatus,string>={
    rascunho:'bg-slate-100 text-slate-700',
    encomendada:'bg-blue-50 text-blue-700',
    parcialmente_recebida:'bg-amber-50 text-amber-700',
    recebida:'bg-emerald-50 text-emerald-700',
    cancelada:'bg-red-50 text-red-700',
};

function apiError(error:unknown):string{
    if(axios.isAxiosError(error)){
        const errors=error.response?.data?.errors;

        if(errors){
            const first=Object.values(errors)[0];

            if(Array.isArray(first) && first.length){
                return String(first[0]);
            }
        }

        return error.response?.data?.message
            ?? 'Não foi possível concluir a operação.';
    }

    return 'Não foi possível concluir a operação.';
}

function money(
    value:number|string|null|undefined
):string{
    const number=Number(value ?? 0);

    return new Intl.NumberFormat('pt-PT',{
        style:'currency',
        currency:'EUR',
    }).format(
        Number.isFinite(number)
            ? number
            : 0
    );
}

function date(
    value:string|null|undefined
):string{
    if(!value){
        return '—';
    }

    const raw=value.slice(0,10);
    const [year,month,day]=raw.split('-');

    if(year && month && day){
        return `${day}/${month}/${year}`;
    }

    return value;
}

function qty(
    value:number|string|null|undefined
):string{
    const number=Number(value ?? 0);

    return number.toLocaleString(
        'pt-PT',
        {
            maximumFractionDigits:3,
        }
    );
}

export default function ComprasTab(){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const [search,setSearch]=useState('');
    const [status,setStatus]=useState<StatusFilter>('todos');

    const [selectedId,setSelectedId]=
        useState<string|null>(null);

    const [formOpen,setFormOpen]=
        useState(false);

    const [editing,setEditing]=
        useState<Compra|null>(null);

    const [receiving,setReceiving]=
        useState<Compra|null>(null);

    const [error,setError]=
        useState<string|null>(null);

    const listQuery=useQuery({
        queryKey:[
            'compras',
            tenant?.id,
        ],

        enabled:Boolean(tenant?.id),

        queryFn:async()=>{
            const response=await api.get(
                '/api/compras'
            );

            return response.data.data as Compra[];
        },
    });

    const detailQuery=useQuery({
        queryKey:[
            'compra',
            tenant?.id,
            selectedId,
        ],

        enabled:Boolean(
            tenant?.id &&
            selectedId
        ),

        queryFn:async()=>{
            const response=await api.get(
                `/api/compras/${selectedId}`
            );

            return response.data.data as Compra;
        },
    });

    async function refresh(
        id?:string|null
    ){
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey:[
                    'compras',
                    tenant?.id,
                ],
            }),

            queryClient.invalidateQueries({
                queryKey:[
                    'estoque',
                    tenant?.id,
                ],
            }),

            queryClient.invalidateQueries({
                queryKey:[
                    'estoque-movimentos',
                    tenant?.id,
                ],
            }),

            queryClient.invalidateQueries({
                queryKey:[
                    'pecas',
                    tenant?.id,
                ],
            }),
        ]);

        if(id){
            await queryClient.invalidateQueries({
                queryKey:[
                    'compra',
                    tenant?.id,
                    id,
                ],
            });
        }
    }

    const workflowMutation=useMutation({
        mutationFn:async({
            compra,
            action,
        }:{
            compra:Compra;
            action:'encomendar'|'cancelar';
        })=>{
            const message=
                action==='encomendar'
                    ? 'Marcar esta compra como encomendada? Depois disso o rascunho deixa de poder ser editado.'
                    : 'Cancelar esta compra?';

            if(!window.confirm(message)){
                throw new Error('__cancelled__');
            }

            const response=await api.post(
                `/api/compras/${compra.id}/${action}`
            );

            return response.data.data as Compra;
        },

        onMutate:()=>{
            setError(null);
        },

        onSuccess:async compra=>{
            await refresh(compra.id);
        },

        onError:error=>{
            if(
                error instanceof Error &&
                error.message==='__cancelled__'
            ){
                return;
            }

            setError(apiError(error));
        },
    });

    const deleteMutation=useMutation({
        mutationFn:async(
            compra:Compra
        )=>{
            if(
                !window.confirm(
                    `Eliminar a compra "${compra.numero_documento ?? 'sem número'}"?`
                )
            ){
                throw new Error('__cancelled__');
            }

            await api.delete(
                `/api/compras/${compra.id}`
            );
        },

        onMutate:()=>{
            setError(null);
        },

        onSuccess:async()=>{
            setSelectedId(null);
            await refresh();
        },

        onError:error=>{
            if(
                error instanceof Error &&
                error.message==='__cancelled__'
            ){
                return;
            }

            setError(apiError(error));
        },
    });

    const compras=listQuery.data ?? [];

    const filtered=useMemo(()=>{
        const term=search
            .trim()
            .toLocaleLowerCase('pt-PT');

        return compras.filter(compra=>{
            if(
                status!=='todos' &&
                compra.status!==status
            ){
                return false;
            }

            if(!term){
                return true;
            }

            return [
                compra.numero_documento,
                compra.fornecedor?.nome,
                compra.fornecedor?.nif,
            ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('pt-PT')
                .includes(term);
        });
    },[
        compras,
        search,
        status,
    ]);

    const stats=useMemo(()=>({
        total:compras.length,

        abertas:compras.filter(
            compra=>[
                'rascunho',
                'encomendada',
                'parcialmente_recebida',
            ].includes(compra.status)
        ).length,

        pendentes:compras.filter(
            compra=>[
                'encomendada',
                'parcialmente_recebida',
            ].includes(compra.status)
        ).length,

        valor:compras
            .filter(
                compra=>
                    compra.status!=='cancelada'
            )
            .reduce(
                (sum,compra)=>
                    sum+
                    Number(compra.total ?? 0),
                0
            ),
    }),[compras]);

    const selected=
        detailQuery.data ?? null;

    async function saved(
        compra:Compra
    ){
        setFormOpen(false);
        setEditing(null);
        setSelectedId(compra.id);
        await refresh(compra.id);
    }

    async function received(
        compra:Compra
    ){
        setReceiving(null);
        setSelectedId(compra.id);
        await refresh(compra.id);
    }

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={()=>{
                        setEditing(null);
                        setFormOpen(true);
                    }}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5"/>
                    Nova compra
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                    <p className="text-sm text-red-700">
                        {error}
                    </p>
                </div>
            )}

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Stat
                    label="Compras"
                    value={String(stats.total)}
                />

                <Stat
                    label="Em aberto"
                    value={String(stats.abertas)}
                />

                <Stat
                    label="A receber"
                    value={String(stats.pendentes)}
                />

                <Stat
                    label="Valor registado"
                    value={money(stats.valor)}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid md:grid-cols-[1fr_220px_auto] gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>

                        <input
                            value={search}
                            onChange={event=>
                                setSearch(event.target.value)
                            }
                            placeholder="Pesquisar documento ou fornecedor..."
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={event=>
                            setStatus(
                                event.target.value as StatusFilter
                            )
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    >
                        <option value="todos">
                            Todos os estados
                        </option>

                        {Object.entries(statusLabels)
                            .map(([value,label])=>(
                                <option
                                    key={value}
                                    value={value}
                                >
                                    {label}
                                </option>
                            ))
                        }
                    </select>

                    <button
                        type="button"
                        onClick={()=>
                            listQuery.refetch()
                        }
                        disabled={listQuery.isFetching}
                        className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                'w-4 h-4',
                                listQuery.isFetching
                                    ? 'animate-spin'
                                    : '',
                            ].join(' ')}
                        />

                        Atualizar
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {listQuery.isLoading ? (
                    <Loader/>
                ) : listQuery.isError ? (
                    <ErrorState
                        message={apiError(listQuery.error)}
                    />
                ) : filtered.length===0 ? (
                    <div className="py-16 text-center">
                        <ShoppingCart className="mx-auto w-10 h-10 text-slate-300"/>

                        <p className="mt-3 font-semibold text-slate-700">
                            Nenhuma compra encontrada.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[950px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <Th>Documento</Th>
                                    <Th>Fornecedor</Th>
                                    <Th>Estado</Th>
                                    <Th>Encomenda</Th>
                                    <Th>Prevista</Th>
                                    <Th>Itens</Th>
                                    <Th>Total</Th>
                                    <th className="w-16"/>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(compra=>(
                                    <tr
                                        key={compra.id}
                                        className="hover:bg-slate-50/60"
                                    >
                                        <td className="px-5 py-4 font-semibold text-slate-900">
                                            {compra.numero_documento
                                                ?? 'Sem número'
                                            }
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium text-slate-800">
                                                {compra.fornecedor?.nome
                                                    ?? 'Sem fornecedor'
                                                }
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                {compra.fornecedor?.nif ?? ''}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                    statusClasses[compra.status],
                                                ].join(' ')}
                                            >
                                                {statusLabels[compra.status]}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {date(compra.data_encomenda)}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {date(compra.data_prevista)}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {compra.itens_count ?? 0}
                                        </td>

                                        <td className="px-5 py-4 font-semibold text-slate-900">
                                            {money(compra.total)}
                                        </td>

                                        <td className="px-5 py-4">
                                            <button
                                                type="button"
                                                onClick={()=>{
                                                    setError(null);
                                                    setSelectedId(compra.id);
                                                }}
                                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                            >
                                                <Eye className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedId && (
                <div className="fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-950">
                                    Compra
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {selected?.numero_documento
                                        ?? 'Sem número'
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={()=>
                                    setSelectedId(null)
                                }
                                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        {detailQuery.isLoading ? (
                            <Loader/>
                        ) : detailQuery.isError || !selected ? (
                            <ErrorState
                                message={apiError(detailQuery.error)}
                            />
                        ) : (
                            <div className="p-6 space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    {selected.status==='rascunho' && (
                                        <>
                                            <Action
                                                icon={Pencil}
                                                label="Editar"
                                                onClick={()=>{
                                                    setEditing(selected);
                                                    setFormOpen(true);
                                                }}
                                            />

                                            <Action
                                                icon={Send}
                                                label="Encomendar"
                                                onClick={()=>
                                                    workflowMutation.mutate({
                                                        compra:selected,
                                                        action:'encomendar',
                                                    })
                                                }
                                            />

                                            <button
                                                type="button"
                                                onClick={()=>
                                                    deleteMutation.mutate(
                                                        selected
                                                    )
                                                }
                                                className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-semibold flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                                Eliminar
                                            </button>
                                        </>
                                    )}

                                    {[
                                        'encomendada',
                                        'parcialmente_recebida',
                                    ].includes(selected.status) && (
                                        <Action
                                            icon={PackageCheck}
                                            label="Receber"
                                            onClick={()=>
                                                setReceiving(selected)
                                            }
                                        />
                                    )}

                                    {[
                                        'rascunho',
                                        'encomendada',
                                    ].includes(selected.status) && (
                                        <Action
                                            icon={Ban}
                                            label="Cancelar"
                                            onClick={()=>
                                                workflowMutation.mutate({
                                                    compra:selected,
                                                    action:'cancelar',
                                                })
                                            }
                                        />
                                    )}
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Info
                                        label="Estado"
                                        value={
                                            statusLabels[selected.status]
                                        }
                                    />

                                    <Info
                                        label="Subtotal"
                                        value={money(selected.subtotal)}
                                    />

                                    <Info
                                        label="Impostos"
                                        value={money(selected.impostos)}
                                    />

                                    <Info
                                        label="Total"
                                        value={money(selected.total)}
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <Info
                                        label="Fornecedor"
                                        value={
                                            selected.fornecedor?.nome
                                            ?? 'Sem fornecedor'
                                        }
                                    />

                                    <Info
                                        label="NIF"
                                        value={
                                            selected.fornecedor?.nif
                                            ?? '—'
                                        }
                                    />

                                    <Info
                                        label="Data encomenda"
                                        value={date(
                                            selected.data_encomenda
                                        )}
                                    />

                                    <Info
                                        label="Data prevista"
                                        value={date(
                                            selected.data_prevista
                                        )}
                                    />

                                    <Info
                                        label="Data recebimento"
                                        value={date(
                                            selected.data_recebimento
                                        )}
                                    />
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-3">
                                        Itens
                                    </h3>

                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="divide-y divide-slate-100">
                                            {(selected.itens ?? []).map(
                                                item=>{
                                                    const restante=Math.max(
                                                        0,
                                                        Number(item.quantidade)-
                                                        Number(item.quantidade_recebida)
                                                    );

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="p-4 flex flex-col lg:flex-row lg:items-center gap-4"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="font-medium text-slate-900">
                                                                    {item.descricao}
                                                                </p>

                                                                {item.peca && (
                                                                    <p className="mt-1 text-xs text-indigo-600">
                                                                        {item.peca.codigo} · {item.peca.nome}
                                                                    </p>
                                                                )}

                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    Encomendado: {qty(item.quantidade)}
                                                                    {' · '}
                                                                    Recebido: {qty(item.quantidade_recebida)}
                                                                    {' · '}
                                                                    Pendente: {qty(restante)}
                                                                </p>
                                                            </div>

                                                            <div className="text-right">
                                                                <p className="text-xs text-slate-500">
                                                                    {money(item.valor_unitario)} / un.
                                                                </p>

                                                                <p className="font-semibold text-slate-900">
                                                                    {money(item.valor_total)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-5">
                                    <h3 className="font-semibold text-slate-900">
                                        Observações
                                    </h3>

                                    <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                                        {selected.observacoes
                                            || 'Sem observações.'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {formOpen && (
                <CompraFormModal
                    editing={editing}
                    onClose={()=>{
                        setFormOpen(false);
                        setEditing(null);
                    }}
                    onSaved={saved}
                />
            )}

            {receiving && (
                <ReceberCompraModal
                    compra={receiving}
                    onClose={()=>
                        setReceiving(null)
                    }
                    onReceived={received}
                />
            )}
        </div>
    );
}

function Action({
    icon:Icon,
    label,
    onClick,
}:{
    icon:typeof ShoppingCart;
    label:string;
    onClick:()=>void;
}){
    return (
        <button
            type="button"
            onClick={onClick}
            className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold flex items-center gap-2 hover:bg-slate-50"
        >
            <Icon className="w-4 h-4"/>
            {label}
        </button>
    );
}

function Stat({
    label,
    value,
}:{
    label:string;
    value:string;
}){
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

function Info({
    label,
    value,
}:{
    label:string;
    value:string;
}){
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
                {label}
            </p>

            <p className="mt-1 font-semibold text-slate-900">
                {value}
            </p>
        </div>
    );
}

function Loader(){
    return (
        <div className="py-20 flex justify-center">
            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
        </div>
    );
}

function ErrorState({
    message,
}:{
    message:string;
}){
    return (
        <div className="py-16 text-center">
            <AlertCircle className="mx-auto w-9 h-9 text-red-500"/>

            <p className="mt-3 font-semibold text-slate-800">
                Não foi possível carregar os dados.
            </p>

            <p className="mt-1 text-sm text-slate-500">
                {message}
            </p>
        </div>
    );
}

function Th({
    children,
}:{
    children:string;
}){
    return (
        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
