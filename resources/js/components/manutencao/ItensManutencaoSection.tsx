import axios from 'axios';
import {useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import {
    useMutation,
    useQuery,
} from '@tanstack/react-query';
import {
    AlertCircle,
    Boxes,
    LoaderCircle,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {
    Manutencao,
    ManutencaoItem,
    ManutencaoItemPayload,
    ManutencaoItemTipo,
    ManutencaoPeca,
} from '../../types/manutencao';

interface Props {
    manutencao:Manutencao;
    editable:boolean;
    onChanged:()=>Promise<void>|void;
}

interface FormState {
    peca_id:string;
    tipo:ManutencaoItemTipo;
    descricao:string;
    quantidade:string;
    unidade:string;
    valor_unitario:string;
    consome_estoque:boolean;
    garantia_meses:string;
    garantia_km:string;
}

const inputClass='w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

function emptyForm():FormState{
    return {
        peca_id:'',
        tipo:'peca',
        descricao:'',
        quantidade:'1',
        unidade:'un',
        valor_unitario:'0',
        consome_estoque:true,
        garantia_meses:'',
        garantia_km:'',
    };
}

function fromItem(
    item:ManutencaoItem
):FormState{
    return {
        peca_id:item.peca_id ?? '',
        tipo:item.tipo,
        descricao:item.descricao ?? '',
        quantidade:String(item.quantidade),
        unidade:item.unidade ?? 'un',
        valor_unitario:String(item.valor_unitario ?? 0),
        consome_estoque:item.consome_estoque,
        garantia_meses:
            item.garantia_meses===null
                ? ''
                : String(item.garantia_meses),
        garantia_km:
            item.garantia_km===null
                ? ''
                : String(item.garantia_km),
    };
}

function apiError(
    error:unknown
):string{
    if(axios.isAxiosError(error)){
        const errors=
            error.response
                ?.data
                ?.errors;

        if(errors){
            const first=
                Object.values(
                    errors
                )[0];

            if(
                Array.isArray(first) &&
                first.length
            ){
                return String(first[0]);
            }
        }

        return error.response
            ?.data
            ?.message
            ?? 'Não foi possível concluir a operação.';
    }

    return 'Não foi possível concluir a operação.';
}

function money(
    value:number|string|null|undefined
):string{
    const number=Number(
        value ?? 0
    );

    return new Intl.NumberFormat(
        'pt-PT',
        {
            style:'currency',
            currency:'EUR',
        }
    ).format(
        Number.isFinite(number)
            ? number
            : 0
    );
}

function quantity(
    value:number|string|null|undefined
):string{
    const number=Number(
        value ?? 0
    );

    return Number.isFinite(number)
        ? number.toLocaleString(
            'pt-PT',
            {
                maximumFractionDigits:3,
            }
        )
        : '0';
}

export default function ItensManutencaoSection({
    manutencao,
    editable,
    onChanged,
}:Props){
    const {tenant}=useTenant();

    const [formOpen,setFormOpen]=
        useState(false);

    const [editing,setEditing]=
        useState<ManutencaoItem|null>(
            null
        );

    const [form,setForm]=
        useState<FormState>(
            emptyForm()
        );

    const [error,setError]=
        useState<string|null>(
            null
        );

    const pecasQuery=useQuery({
        queryKey:[
            'pecas',
            tenant?.id,
            'ativas',
        ],

        enabled:Boolean(
            tenant?.id
        ),

        queryFn:async()=>{
            const response=
                await api.get(
                    '/api/pecas',
                    {
                        params:{
                            ativo:true,
                        },
                    }
                );

            return response
                .data
                .data as ManutencaoPeca[];
        },
    });

    useEffect(()=>{
        if(editing){
            setForm(
                fromItem(
                    editing
                )
            );

            return;
        }

        if(formOpen){
            setForm(
                emptyForm()
            );
        }
    },[
        editing,
        formOpen,
    ]);

    const selectedPeca=
        useMemo(
            ()=>{
                if(
                    !form.peca_id
                ){
                    return null;
                }

                return (
                    pecasQuery.data
                    ?? []
                ).find(
                    item=>
                        item.id===
                        form.peca_id
                ) ?? null;
            },
            [
                form.peca_id,
                pecasQuery.data,
            ]
        );

    function update<
        K extends keyof FormState
    >(
        field:K,
        value:FormState[K]
    ){
        setForm(
            current=>({
                ...current,
                [field]:value,
            })
        );
    }

    function selectPeca(
        id:string
    ){
        if(!id){
            setForm(
                current=>({
                    ...current,
                    peca_id:'',
                    consome_estoque:
                        false,
                })
            );

            return;
        }

        const peca=
            (
                pecasQuery.data
                ?? []
            ).find(
                item=>
                    item.id===id
            );

        if(!peca){
            return;
        }

        setForm(
            current=>({
                ...current,
                peca_id:
                    peca.id,

                tipo:'peca',

                descricao:
                    peca.nome,

                unidade:
                    peca.unidade
                    || 'un',

                valor_unitario:
                    String(
                        peca.custo_medio
                        ?? 0
                    ),

                consome_estoque:
                    true,
            })
        );
    }

    function changeTipo(
        tipo:ManutencaoItemTipo
    ){
        setForm(
            current=>({
                ...current,
                tipo,

                peca_id:
                    tipo==='peca'
                        ? current.peca_id
                        : '',

                consome_estoque:
                    tipo==='peca'
                        ? current
                            .consome_estoque
                        : false,

                unidade:
                    tipo==='mao_obra'
                        ? 'h'
                        : (
                            current.unidade
                            || 'un'
                        ),
            })
        );
    }

    const saveMutation=
        useMutation({
            mutationFn:async()=>{
                const payload:
                    ManutencaoItemPayload={
                        peca_id:
                            form.peca_id
                            || null,

                        tipo:
                            form.tipo,

                        descricao:
                            form
                                .descricao
                                .trim()
                            || null,

                        quantidade:
                            Number(
                                form.quantidade
                            ),

                        unidade:
                            form
                                .unidade
                                .trim()
                            || null,

                        valor_unitario:
                            form
                                .valor_unitario===
                                ''
                                ? null
                                : Number(
                                    form
                                        .valor_unitario
                                ),

                        consome_estoque:
                            form
                                .consome_estoque,

                        garantia_meses:
                            form
                                .garantia_meses===
                                ''
                                ? null
                                : Number(
                                    form
                                        .garantia_meses
                                ),

                        garantia_km:
                            form
                                .garantia_km===
                                ''
                                ? null
                                : Number(
                                    form
                                        .garantia_km
                                ),
                    };

                if(editing){
                    await api.patch(
                        `/api/manutencoes/${manutencao.id}/itens/${editing.id}`,
                        payload
                    );

                    return;
                }

                await api.post(
                    `/api/manutencoes/${manutencao.id}/itens`,
                    payload
                );
            },

            onMutate:()=>{
                setError(
                    null
                );
            },

            onSuccess:async()=>{
                setFormOpen(
                    false
                );

                setEditing(
                    null
                );

                await onChanged();
            },

            onError:error=>{
                setError(
                    apiError(
                        error
                    )
                );
            },
        });

    const deleteMutation=
        useMutation({
            mutationFn:async(
                item:ManutencaoItem
            )=>{
                if(
                    !window.confirm(
                        `Eliminar o item "${item.descricao}"?`
                    )
                ){
                    throw new Error(
                        '__cancelled__'
                    );
                }

                await api.delete(
                    `/api/manutencoes/${manutencao.id}/itens/${item.id}`
                );
            },

            onMutate:()=>{
                setError(
                    null
                );
            },

            onSuccess:async()=>{
                await onChanged();
            },

            onError:error=>{
                if(
                    error
                        instanceof
                        Error &&
                    error.message===
                        '__cancelled__'
                ){
                    return;
                }

                setError(
                    apiError(
                        error
                    )
                );
            },
        });

    function submit(
        event:
            FormEvent<HTMLFormElement>
    ){
        event.preventDefault();

        saveMutation.mutate();
    }

    const items=
        manutencao.itens
        ?? [];

    const quantidadePedida=
        Number(
            form.quantidade
            || 0
        );

    const estoqueAtual=
        Number(
            selectedPeca
                ?.estoque_atual
            ?? 0
        );

    const estoqueInsuficiente=
        form.consome_estoque &&
        Boolean(
            selectedPeca
        ) &&
        quantidadePedida>
            estoqueAtual;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-slate-900">
                        Itens
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                        Peças, mão de obra e outros custos da ordem.
                    </p>
                </div>

                {editable && (
                    <button
                        type="button"
                        onClick={()=>{
                            setError(
                                null
                            );

                            setEditing(
                                null
                            );

                            setFormOpen(
                                true
                            );
                        }}
                        className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4"/>
                        Adicionar
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                    <p className="text-sm text-red-700">
                        {error}
                    </p>
                </div>
            )}

            {items.length===0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                    <Boxes className="w-8 h-8 mx-auto text-slate-300"/>

                    <p className="mt-3 text-sm font-medium text-slate-700">
                        Nenhum item associado.
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Adicione peças, mão de obra ou outros custos.
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {items.map(
                            item=>(
                                <div
                                    key={item.id}
                                    className="p-4 flex flex-col lg:flex-row lg:items-center gap-4"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-slate-900">
                                                {item.descricao}
                                            </p>

                                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                {item.tipo===
                                                    'peca'
                                                    ? 'Peça'
                                                    : item.tipo===
                                                        'mao_obra'
                                                        ? 'Mão de obra'
                                                        : 'Outro'
                                                }
                                            </span>

                                            {item.consome_estoque && (
                                                <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                                    Consome estoque
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-1 flex gap-x-4 gap-y-1 flex-wrap text-xs text-slate-500">
                                            <span>
                                                {quantity(
                                                    item.quantidade
                                                )}{' '}
                                                {item.unidade}
                                            </span>

                                            <span>
                                                {money(
                                                    item.valor_unitario
                                                )} / {item.unidade}
                                            </span>

                                            {item.peca && (
                                                <>
                                                    <span>
                                                        {item.peca.codigo}
                                                    </span>

                                                    <span>
                                                        Saldo atual:{' '}
                                                        {quantity(
                                                            item.peca
                                                                .estoque_atual
                                                        )}{' '}
                                                        {item.peca
                                                            .unidade}
                                                    </span>
                                                </>
                                            )}

                                            {item.garantia_meses && (
                                                <span>
                                                    Garantia: {item.garantia_meses} meses
                                                </span>
                                            )}

                                            {item.garantia_km && (
                                                <span>
                                                    Garantia: {Number(
                                                        item.garantia_km
                                                    ).toLocaleString(
                                                        'pt-PT'
                                                    )} km
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between lg:justify-end gap-3">
                                        <p className="font-semibold text-slate-900 min-w-24 text-right">
                                            {money(
                                                item.valor_total
                                            )}
                                        </p>

                                        {editable && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={()=>{
                                                        setError(
                                                            null
                                                        );

                                                        setEditing(
                                                            item
                                                        );

                                                        setFormOpen(
                                                            true
                                                        );
                                                    }}
                                                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200"
                                                    title="Editar item"
                                                >
                                                    <Pencil className="w-4 h-4"/>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        deleteMutation
                                                            .isPending
                                                    }
                                                    onClick={()=>
                                                        deleteMutation
                                                            .mutate(
                                                                item
                                                            )
                                                    }
                                                    className="w-9 h-9 rounded-lg border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-50"
                                                    title="Eliminar item"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {formOpen && (
                <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-950">
                                    {editing
                                        ? 'Editar item'
                                        : 'Adicionar item'
                                    }
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    {manutencao.numero_ordem}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={()=>{
                                    setFormOpen(
                                        false
                                    );

                                    setEditing(
                                        null
                                    );
                                }}
                                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <form
                            onSubmit={submit}
                            className="p-6 space-y-5"
                        >
                            {saveMutation.isError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                                    <p className="text-sm text-red-700">
                                        {apiError(
                                            saveMutation.error
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="grid sm:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="block mb-1 text-sm font-medium text-slate-700">
                                        Tipo *
                                    </span>

                                    <select
                                        value={form.tipo}
                                        onChange={event=>
                                            changeTipo(
                                                event.target.value as ManutencaoItemTipo
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        <option value="peca">
                                            Peça
                                        </option>

                                        <option value="mao_obra">
                                            Mão de obra
                                        </option>

                                        <option value="outro">
                                            Outro
                                        </option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="block mb-1 text-sm font-medium text-slate-700">
                                        Peça
                                    </span>

                                    <select
                                        disabled={
                                            form.tipo!==
                                            'peca'
                                        }
                                        value={form.peca_id}
                                        onChange={event=>
                                            selectPeca(
                                                event.target.value
                                            )
                                        }
                                        className={`${inputClass} disabled:bg-slate-100`}
                                    >
                                        <option value="">
                                            Sem peça vinculada
                                        </option>

                                        {(pecasQuery.data ?? []).map(
                                            peca=>(
                                                <option
                                                    key={peca.id}
                                                    value={peca.id}
                                                >
                                                    {peca.codigo} · {peca.nome}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>
                            </div>

                            {form.tipo==='peca' && selectedPeca && (
                                <div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
                                    <MiniInfo
                                        label="Saldo atual"
                                        value={`${quantity(
                                            selectedPeca.estoque_atual
                                        )} ${selectedPeca.unidade ?? ''}`}
                                    />

                                    <MiniInfo
                                        label="Custo médio"
                                        value={money(
                                            selectedPeca.custo_medio
                                        )}
                                    />

                                    <MiniInfo
                                        label="Código"
                                        value={
                                            selectedPeca.codigo
                                            || '—'
                                        }
                                    />
                                </div>
                            )}

                            {estoqueInsuficiente && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0"/>

                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">
                                            Saldo atual insuficiente
                                        </p>

                                        <p className="mt-1 text-xs text-amber-700">
                                            A ordem pode ser guardada, mas não poderá consumir esta quantidade se o saldo continuar insuficiente no momento da conclusão.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <label className="block">
                                <span className="block mb-1 text-sm font-medium text-slate-700">
                                    Descrição *
                                </span>

                                <input
                                    required
                                    maxLength={500}
                                    value={form.descricao}
                                    onChange={event=>
                                        update(
                                            'descricao',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />
                            </label>

                            <div className="grid sm:grid-cols-3 gap-4">
                                <label className="block">
                                    <span className="block mb-1 text-sm font-medium text-slate-700">
                                        Quantidade *
                                    </span>

                                    <input
                                        required
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={form.quantidade}
                                        onChange={event=>
                                            update(
                                                'quantidade',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </label>

                                <label className="block">
                                    <span className="block mb-1 text-sm font-medium text-slate-700">
                                        Unidade *
                                    </span>

                                    <input
                                        required
                                        maxLength={30}
                                        value={form.unidade}
                                        onChange={event=>
                                            update(
                                                'unidade',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </label>

                                <label className="block">
                                    <span className="block mb-1 text-sm font-medium text-slate-700">
                                        Valor unitário
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.0001"
                                        value={form.valor_unitario}
                                        onChange={event=>
                                            update(
                                                'valor_unitario',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </label>
                            </div>

                            <div className="rounded-xl border border-slate-200 p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        disabled={
                                            form.tipo!==
                                            'peca' ||
                                            !form.peca_id
                                        }
                                        checked={form.consome_estoque}
                                        onChange={event=>
                                            update(
                                                'consome_estoque',
                                                event.target.checked
                                            )
                                        }
                                        className="mt-1 w-4 h-4 rounded border-slate-300 disabled:opacity-50"
                                    />

                                    <span>
                                        <span className="block text-sm font-medium text-slate-800">
                                            Consumir do estoque
                                        </span>

                                        <span className="block mt-1 text-xs text-slate-500">
                                            O saldo será baixado quando a manutenção for concluída.
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-slate-800">
                                    Garantia
                                </h4>

                                <div className="mt-3 grid sm:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="block mb-1 text-sm font-medium text-slate-700">
                                            Meses
                                        </span>

                                        <input
                                            type="number"
                                            min="1"
                                            max="600"
                                            step="1"
                                            value={form.garantia_meses}
                                            onChange={event=>
                                                update(
                                                    'garantia_meses',
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="block mb-1 text-sm font-medium text-slate-700">
                                            Quilómetros
                                        </span>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={form.garantia_km}
                                            onChange={event=>
                                                update(
                                                    'garantia_km',
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={()=>{
                                        setFormOpen(
                                            false
                                        );

                                        setEditing(
                                            null
                                        );
                                    }}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saveMutation.isPending ||
                                        !form.descricao.trim() ||
                                        Number(
                                            form.quantidade
                                        )<=0
                                    }
                                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saveMutation.isPending && (
                                        <LoaderCircle className="w-4 h-4 animate-spin"/>
                                    )}

                                    {editing
                                        ? 'Guardar item'
                                        : 'Adicionar item'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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

            <p className="mt-1 text-sm font-semibold text-slate-900">
                {value}
            </p>
        </div>
    );
}
