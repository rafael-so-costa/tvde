import axios from 'axios';
import {useMemo,useState} from 'react';
import type {FormEvent,ReactNode} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    Boxes,
    CircleDollarSign,
    History,
    LoaderCircle,
    PackagePlus,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {
    EstoqueMovimento,
    ManutencaoFornecedor,
    ManutencaoPeca,
    PecaPayload,
} from '../../types/manutencao';

type View='pecas'|'movimentos';

interface PecaFormState {
    fornecedor_preferencial_id:string;
    codigo:string;
    nome:string;
    fabricante:string;
    unidade:string;
    estoque_minimo:string;
    ativo:boolean;
}

interface AjusteState {
    estoque:string;
    observacoes:string;
}

const inputClass='w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

function emptyPeca():PecaFormState{
    return {
        fornecedor_preferencial_id:'',
        codigo:'',
        nome:'',
        fabricante:'',
        unidade:'un',
        estoque_minimo:'0',
        ativo:true,
    };
}

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

function money(value:number|string|null|undefined):string{
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

function qty(value:number|string|null|undefined):string{
    const number=Number(value ?? 0);

    return Number.isFinite(number)
        ? number.toLocaleString('pt-PT',{
            maximumFractionDigits:3,
        })
        : '0';
}

function dateTime(value:string|null|undefined):string{
    if(!value){
        return '—';
    }

    const date=new Date(value);

    if(Number.isNaN(date.getTime())){
        return value;
    }

    return new Intl.DateTimeFormat('pt-PT',{
        day:'2-digit',
        month:'2-digit',
        year:'numeric',
        hour:'2-digit',
        minute:'2-digit',
    }).format(date);
}

export default function EstoqueTab(){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const [view,setView]=useState<View>('pecas');
    const [search,setSearch]=useState('');
    const [lowOnly,setLowOnly]=useState(false);
    const [formOpen,setFormOpen]=useState(false);
    const [editing,setEditing]=useState<ManutencaoPeca|null>(null);
    const [form,setForm]=useState<PecaFormState>(emptyPeca());
    const [adjusting,setAdjusting]=useState<ManutencaoPeca|null>(null);
    const [ajuste,setAjuste]=useState<AjusteState>({
        estoque:'',
        observacoes:'',
    });
    const [error,setError]=useState<string|null>(null);

    const estoqueQuery=useQuery({
        queryKey:['estoque',tenant?.id],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get('/api/estoque');
            return response.data.data as ManutencaoPeca[];
        },
    });

    const movimentosQuery=useQuery({
        queryKey:['estoque-movimentos',tenant?.id],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get(
                '/api/estoque/movimentos'
            );

            return response.data.data as EstoqueMovimento[];
        },
    });

    const fornecedoresQuery=useQuery({
        queryKey:['fornecedores',tenant?.id],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get('/api/fornecedores');
            return response.data.data as ManutencaoFornecedor[];
        },
    });

    async function refresh(){
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey:['estoque',tenant?.id],
            }),
            queryClient.invalidateQueries({
                queryKey:['estoque-movimentos',tenant?.id],
            }),
            queryClient.invalidateQueries({
                queryKey:['pecas',tenant?.id],
            }),
        ]);
    }

    function openCreate(){
        setError(null);
        setEditing(null);
        setForm(emptyPeca());
        setFormOpen(true);
    }

    function openEdit(peca:ManutencaoPeca){
        setError(null);
        setEditing(peca);

        setForm({
            fornecedor_preferencial_id:
                peca.fornecedor_preferencial_id ?? '',
            codigo:peca.codigo,
            nome:peca.nome,
            fabricante:peca.fabricante ?? '',
            unidade:peca.unidade,
            estoque_minimo:String(peca.estoque_minimo),
            ativo:peca.ativo,
        });

        setFormOpen(true);
    }

    function openAdjust(peca:ManutencaoPeca){
        setError(null);
        setAdjusting(peca);

        setAjuste({
            estoque:String(peca.estoque_atual),
            observacoes:'',
        });
    }

    const saveMutation=useMutation({
        mutationFn:async()=>{
            const payload:PecaPayload={
                fornecedor_preferencial_id:
                    form.fornecedor_preferencial_id || null,
                codigo:form.codigo.trim(),
                nome:form.nome.trim(),
                fabricante:form.fabricante.trim() || null,
                unidade:form.unidade.trim(),
                estoque_minimo:Number(form.estoque_minimo),
                ativo:form.ativo,
            };

            if(editing){
                await api.patch(
                    `/api/pecas/${editing.id}`,
                    payload
                );

                return;
            }

            await api.post(
                '/api/pecas',
                payload
            );
        },
        onMutate:()=>{
            setError(null);
        },
        onSuccess:async()=>{
            setFormOpen(false);
            setEditing(null);
            await refresh();
        },
        onError:error=>{
            setError(apiError(error));
        },
    });

    const deleteMutation=useMutation({
        mutationFn:async(peca:ManutencaoPeca)=>{
            if(
                !window.confirm(
                    `Eliminar a peça "${peca.nome}"?`
                )
            ){
                throw new Error('__cancelled__');
            }

            await api.delete(
                `/api/pecas/${peca.id}`
            );
        },
        onMutate:()=>{
            setError(null);
        },
        onSuccess:async()=>{
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

    const adjustMutation=useMutation({
        mutationFn:async()=>{
            if(!adjusting){
                return;
            }

            await api.post(
                `/api/estoque/${adjusting.id}/ajustar`,
                {
                    estoque:Number(ajuste.estoque),
                    observacoes:
                        ajuste.observacoes.trim() || null,
                }
            );
        },
        onMutate:()=>{
            setError(null);
        },
        onSuccess:async()=>{
            setAdjusting(null);

            setAjuste({
                estoque:'',
                observacoes:'',
            });

            await refresh();
        },
        onError:error=>{
            setError(apiError(error));
        },
    });

    function submitPeca(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();
        saveMutation.mutate();
    }

    function submitAjuste(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();
        adjustMutation.mutate();
    }

    const pecas=estoqueQuery.data ?? [];

    const filtered=useMemo(()=>{
        const term=search
            .trim()
            .toLocaleLowerCase('pt-PT');

        return pecas.filter(peca=>{
            if(
                lowOnly &&
                Number(peca.estoque_atual)>
                Number(peca.estoque_minimo)
            ){
                return false;
            }

            if(!term){
                return true;
            }

            return [
                peca.codigo,
                peca.nome,
                peca.fabricante,
                peca.fornecedor_preferencial?.nome,
            ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('pt-PT')
                .includes(term);
        });
    },[
        pecas,
        search,
        lowOnly,
    ]);

    const stats=useMemo(()=>{
        const low=pecas.filter(
            peca=>
                Number(peca.estoque_atual)<=
                Number(peca.estoque_minimo)
        ).length;

        const value=pecas.reduce(
            (sum,peca)=>
                sum+
                Number(peca.estoque_atual)*
                Number(peca.custo_medio),
            0
        );

        return {
            total:pecas.length,
            low,
            active:pecas.filter(
                peca=>peca.ativo
            ).length,
            value,
        };
    },[pecas]);

    const movimentos=
        movimentosQuery.data ?? [];

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start">
                    <button
                        type="button"
                        onClick={()=>setView('pecas')}
                        className={[
                            'h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2',
                            view==='pecas'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500',
                        ].join(' ')}
                    >
                        <Boxes className="w-4 h-4"/>
                        Peças
                    </button>

                    <button
                        type="button"
                        onClick={()=>setView('movimentos')}
                        className={[
                            'h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2',
                            view==='movimentos'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500',
                        ].join(' ')}
                    >
                        <History className="w-4 h-4"/>
                        Movimentos
                    </button>
                </div>

                {view==='pecas' && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5"/>
                        Nova peça
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                    <p className="text-sm text-red-700">
                        {error}
                    </p>
                </div>
            )}

            {view==='pecas' ? (
                <>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <Stat
                            label="Peças cadastradas"
                            value={String(stats.total)}
                            icon={Boxes}
                        />

                        <Stat
                            label="Peças ativas"
                            value={String(stats.active)}
                            icon={PackagePlus}
                        />

                        <Stat
                            label="Estoque baixo"
                            value={String(stats.low)}
                            icon={AlertCircle}
                        />

                        <Stat
                            label="Valor em estoque"
                            value={money(stats.value)}
                            icon={CircleDollarSign}
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>

                                <input
                                    value={search}
                                    onChange={event=>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Pesquisar código, peça, fabricante ou fornecedor..."
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={()=>
                                    setLowOnly(value=>!value)
                                }
                                className={[
                                    'h-11 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2',
                                    lowOnly
                                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                                ].join(' ')}
                            >
                                <SlidersHorizontal className="w-4 h-4"/>
                                Estoque baixo
                            </button>

                            <button
                                type="button"
                                onClick={()=>
                                    estoqueQuery.refetch()
                                }
                                disabled={estoqueQuery.isFetching}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw
                                    className={[
                                        'w-4 h-4',
                                        estoqueQuery.isFetching
                                            ? 'animate-spin'
                                            : '',
                                    ].join(' ')}
                                />

                                Atualizar
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        {estoqueQuery.isLoading ? (
                            <Loader/>
                        ) : estoqueQuery.isError ? (
                            <ErrorState
                                message={apiError(estoqueQuery.error)}
                            />
                        ) : filtered.length===0 ? (
                            <Empty/>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1050px]">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <Th>Código</Th>
                                            <Th>Peça</Th>
                                            <Th>Fornecedor</Th>
                                            <Th>Saldo</Th>
                                            <Th>Mínimo</Th>
                                            <Th>Custo médio</Th>
                                            <Th>Valor</Th>
                                            <Th>Estado</Th>
                                            <th className="w-36"/>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {filtered.map(peca=>{
                                            const low=
                                                Number(peca.estoque_atual)<=
                                                Number(peca.estoque_minimo);

                                            return (
                                                <tr
                                                    key={peca.id}
                                                    className="hover:bg-slate-50/60"
                                                >
                                                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                                                        {peca.codigo}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <p className="font-medium text-slate-900">
                                                            {peca.nome}
                                                        </p>

                                                        <p className="text-xs text-slate-500">
                                                            {peca.fabricante || 'Sem fabricante'}
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-4 text-sm text-slate-600">
                                                        {peca.fornecedor_preferencial?.nome
                                                            ?? '—'
                                                        }
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={[
                                                                'font-semibold',
                                                                low
                                                                    ? 'text-amber-700'
                                                                    : 'text-slate-900',
                                                            ].join(' ')}
                                                        >
                                                            {qty(peca.estoque_atual)} {peca.unidade}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4 text-sm text-slate-600">
                                                        {qty(peca.estoque_minimo)} {peca.unidade}
                                                    </td>

                                                    <td className="px-5 py-4 text-sm text-slate-700">
                                                        {money(peca.custo_medio)}
                                                    </td>

                                                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                                                        {money(
                                                            Number(peca.estoque_atual)*
                                                            Number(peca.custo_medio)
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={[
                                                                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                                !peca.ativo
                                                                    ? 'bg-slate-100 text-slate-500'
                                                                    : low
                                                                        ? 'bg-amber-50 text-amber-700'
                                                                        : 'bg-emerald-50 text-emerald-700',
                                                            ].join(' ')}
                                                        >
                                                            {!peca.ativo
                                                                ? 'Inativa'
                                                                : low
                                                                    ? 'Estoque baixo'
                                                                    : 'Normal'
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={()=>
                                                                    openAdjust(peca)
                                                                }
                                                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                                title="Ajustar estoque"
                                                            >
                                                                <SlidersHorizontal className="w-4 h-4"/>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={()=>
                                                                    openEdit(peca)
                                                                }
                                                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                                title="Editar peça"
                                                            >
                                                                <Pencil className="w-4 h-4"/>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={()=>
                                                                    deleteMutation.mutate(peca)
                                                                }
                                                                disabled={deleteMutation.isPending}
                                                                className="w-9 h-9 rounded-lg border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-50"
                                                                title="Eliminar peça"
                                                            >
                                                                <Trash2 className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <Movimentos
                    movimentos={movimentos}
                    loading={movimentosQuery.isLoading}
                    error={
                        movimentosQuery.isError
                            ? apiError(movimentosQuery.error)
                            : null
                    }
                    onRefresh={()=>
                        movimentosQuery.refetch()
                    }
                    refreshing={movimentosQuery.isFetching}
                />
            )}

            {formOpen && (
                <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title={
                                editing
                                    ? 'Editar peça'
                                    : 'Nova peça'
                            }
                            onClose={()=>{
                                setFormOpen(false);
                                setEditing(null);
                            }}
                        />

                        <form
                            onSubmit={submitPeca}
                            className="p-6 space-y-5"
                        >
                            {saveMutation.isError && (
                                <ErrorBox
                                    message={apiError(saveMutation.error)}
                                />
                            )}

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Código *">
                                    <input
                                        required
                                        maxLength={100}
                                        value={form.codigo}
                                        onChange={event=>
                                            setForm(current=>({
                                                ...current,
                                                codigo:event.target.value,
                                            }))
                                        }
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Unidade *">
                                    <input
                                        required
                                        maxLength={30}
                                        value={form.unidade}
                                        onChange={event=>
                                            setForm(current=>({
                                                ...current,
                                                unidade:event.target.value,
                                            }))
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Nome *">
                                <input
                                    required
                                    maxLength={255}
                                    value={form.nome}
                                    onChange={event=>
                                        setForm(current=>({
                                            ...current,
                                            nome:event.target.value,
                                        }))
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Fabricante">
                                    <input
                                        maxLength={255}
                                        value={form.fabricante}
                                        onChange={event=>
                                            setForm(current=>({
                                                ...current,
                                                fabricante:event.target.value,
                                            }))
                                        }
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Fornecedor preferencial">
                                    <select
                                        value={form.fornecedor_preferencial_id}
                                        onChange={event=>
                                            setForm(current=>({
                                                ...current,
                                                fornecedor_preferencial_id:
                                                    event.target.value,
                                            }))
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">
                                            Sem fornecedor
                                        </option>

                                        {(fornecedoresQuery.data ?? []).map(
                                            fornecedor=>(
                                                <option
                                                    key={fornecedor.id}
                                                    value={fornecedor.id}
                                                >
                                                    {fornecedor.nome}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </Field>
                            </div>

                            <Field label="Estoque mínimo *">
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    value={form.estoque_minimo}
                                    onChange={event=>
                                        setForm(current=>({
                                            ...current,
                                            estoque_minimo:event.target.value,
                                        }))
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            {editing && (
                                <div className="grid sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                                    <MiniInfo
                                        label="Saldo atual"
                                        value={`${qty(editing.estoque_atual)} ${editing.unidade}`}
                                    />

                                    <MiniInfo
                                        label="Custo médio"
                                        value={money(editing.custo_medio)}
                                    />
                                </div>
                            )}

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.ativo}
                                    onChange={event=>
                                        setForm(current=>({
                                            ...current,
                                            ativo:event.target.checked,
                                        }))
                                    }
                                    className="mt-1 w-4 h-4 rounded border-slate-300"
                                />

                                <span>
                                    <span className="block text-sm font-medium text-slate-800">
                                        Peça ativa
                                    </span>

                                    <span className="block text-xs text-slate-500">
                                        Peças inativas deixam de aparecer para novas operações.
                                    </span>
                                </span>
                            </label>

                            {!editing && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                                    A nova peça será criada sem alterar o estoque. O saldo deve ser registado através de ajuste ou recebimento de compra.
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={()=>{
                                        setFormOpen(false);
                                        setEditing(null);
                                    }}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saveMutation.isPending ||
                                        !form.codigo.trim() ||
                                        !form.nome.trim() ||
                                        !form.unidade.trim()
                                    }
                                    className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saveMutation.isPending && (
                                        <LoaderCircle className="w-4 h-4 animate-spin"/>
                                    )}

                                    {editing
                                        ? 'Guardar alterações'
                                        : 'Criar peça'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {adjusting && (
                <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title="Ajustar estoque"
                            onClose={()=>
                                setAdjusting(null)
                            }
                        />

                        <form
                            onSubmit={submitAjuste}
                            className="p-6 space-y-5"
                        >
                            {adjustMutation.isError && (
                                <ErrorBox
                                    message={apiError(adjustMutation.error)}
                                />
                            )}

                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="font-semibold text-slate-900">
                                    {adjusting.codigo} · {adjusting.nome}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    Saldo atual: {qty(adjusting.estoque_atual)} {adjusting.unidade}
                                </p>
                            </div>

                            <Field label="Novo saldo *">
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    value={ajuste.estoque}
                                    onChange={event=>
                                        setAjuste(current=>({
                                            ...current,
                                            estoque:event.target.value,
                                        }))
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Observações">
                                <textarea
                                    rows={3}
                                    value={ajuste.observacoes}
                                    onChange={event=>
                                        setAjuste(current=>({
                                            ...current,
                                            observacoes:event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    placeholder="Ex.: contagem física de estoque"
                                />
                            </Field>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                Informe o saldo final encontrado. O sistema calcula automaticamente a diferença e cria o movimento de ajuste.
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={()=>
                                        setAdjusting(null)
                                    }
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        adjustMutation.isPending ||
                                        ajuste.estoque==='' ||
                                        Number(ajuste.estoque)<0
                                    }
                                    className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {adjustMutation.isPending && (
                                        <LoaderCircle className="w-4 h-4 animate-spin"/>
                                    )}

                                    Ajustar estoque
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function Movimentos({
    movimentos,
    loading,
    error,
    onRefresh,
    refreshing,
}:{
    movimentos:EstoqueMovimento[];
    loading:boolean;
    error:string|null;
    onRefresh:()=>void;
    refreshing:boolean;
}){
    const tipoLabels={
        entrada:'Entrada',
        saida:'Saída',
        ajuste_entrada:'Ajuste +',
        ajuste_saida:'Ajuste -',
    };

    const origemLabels={
        compra:'Compra',
        manutencao:'Manutenção',
        ajuste:'Ajuste',
        devolucao:'Devolução',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-900">
                        Histórico de movimentos
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                        Entradas, saídas e ajustes do estoque.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50"
                >
                    <RefreshCw
                        className={[
                            'w-4 h-4',
                            refreshing
                                ? 'animate-spin'
                                : '',
                        ].join(' ')}
                    />
                </button>
            </div>

            {loading ? (
                <Loader/>
            ) : error ? (
                <ErrorState message={error}/>
            ) : movimentos.length===0 ? (
                <Empty/>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <Th>Data</Th>
                                <Th>Peça</Th>
                                <Th>Tipo</Th>
                                <Th>Origem</Th>
                                <Th>Quantidade</Th>
                                <Th>Saldo</Th>
                                <Th>Valor unit.</Th>
                                <Th>Referência</Th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {movimentos.map(movimento=>(
                                <tr key={movimento.id}>
                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {dateTime(movimento.created_at)}
                                    </td>

                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-900">
                                            {movimento.peca?.nome ?? '—'}
                                        </p>

                                        <p className="text-xs text-slate-500">
                                            {movimento.peca?.codigo ?? ''}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className={[
                                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                            movimento.tipo==='entrada' ||
                                            movimento.tipo==='ajuste_entrada'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-red-50 text-red-700',
                                        ].join(' ')}>
                                            {tipoLabels[movimento.tipo]}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {origemLabels[movimento.origem]}
                                    </td>

                                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                                        {qty(movimento.quantidade)} {movimento.peca?.unidade ?? ''}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {qty(movimento.saldo_anterior)}
                                        {' → '}
                                        {qty(movimento.saldo_posterior)}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {money(movimento.valor_unitario)}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {movimento.compra?.numero_documento
                                            ?? movimento.manutencao?.numero_ordem
                                            ?? movimento.observacoes
                                            ?? '—'
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function ModalHeader({
    title,
    onClose,
}:{
    title:string;
    onClose:()=>void;
}){
    return (
        <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-950">
                {title}
            </h3>

            <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
            >
                <X className="w-5 h-5"/>
            </button>
        </div>
    );
}

function Field({
    label,
    children,
}:{
    label:string;
    children:ReactNode;
}){
    return (
        <label className="block">
            <span className="block mb-1 text-sm font-medium text-slate-700">
                {label}
            </span>

            {children}
        </label>
    );
}

function Stat({
    label,
    value,
    icon:Icon,
}:{
    label:string;
    value:string;
    icon:typeof Boxes;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon className="w-5 h-5"/>
                </div>
            </div>
        </div>
    );
}

function MiniInfo({
    label,
    value,
}:{
    label:string;
    value:string;
}){
    return (
        <div>
            <p className="text-xs text-slate-500">
                {label}
            </p>

            <p className="mt-1 font-semibold text-slate-900">
                {value}
            </p>
        </div>
    );
}

function ErrorBox({
    message,
}:{
    message:string;
}){
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

            <p className="text-sm text-red-700">
                {message}
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

function Empty(){
    return (
        <div className="py-16 text-center">
            <Boxes className="mx-auto w-10 h-10 text-slate-300"/>

            <p className="mt-3 font-semibold text-slate-700">
                Nenhum registo encontrado.
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
