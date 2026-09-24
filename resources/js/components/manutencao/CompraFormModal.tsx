import axios from 'axios';
import {useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {
    AlertCircle,
    LoaderCircle,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {
    Compra,
    CompraItemPayload,
    CompraPayload,
    CompraUpdatePayload,
    ManutencaoFornecedor,
    ManutencaoPeca,
} from '../../types/manutencao';

interface Props {
    editing:Compra|null;
    onClose:()=>void;
    onSaved:(compra:Compra)=>Promise<void>|void;
}

interface ItemForm {
    key:string;
    peca_id:string;
    descricao:string;
    quantidade:string;
    valor_unitario:string;
}

interface FormState {
    fornecedor_id:string;
    numero_documento:string;
    data_encomenda:string;
    data_prevista:string;
    impostos:string;
    observacoes:string;
    itens:ItemForm[];
}

const inputClass='w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

let itemSequence=0;

function newKey():string{
    itemSequence+=1;

    return `compra-item-${itemSequence}`;
}

function emptyItem():ItemForm{
    return {
        key:newKey(),
        peca_id:'',
        descricao:'',
        quantidade:'1',
        valor_unitario:'0',
    };
}

function emptyForm():FormState{
    return {
        fornecedor_id:'',
        numero_documento:'',
        data_encomenda:'',
        data_prevista:'',
        impostos:'0',
        observacoes:'',
        itens:[
            emptyItem(),
        ],
    };
}

function dateInput(
    value:string|null|undefined
):string{
    return value
        ? value.slice(0,10)
        : '';
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
            ?? 'Não foi possível guardar a compra.';
    }

    return 'Não foi possível guardar a compra.';
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

export default function CompraFormModal({
    editing,
    onClose,
    onSaved,
}:Props){
    const {tenant}=useTenant();

    const [form,setForm]=useState<FormState>(
        emptyForm()
    );

    useEffect(()=>{
        if(!editing){
            setForm(emptyForm());
            return;
        }

        setForm({
            fornecedor_id:
                editing.fornecedor_id ?? '',

            numero_documento:
                editing.numero_documento ?? '',

            data_encomenda:
                dateInput(editing.data_encomenda),

            data_prevista:
                dateInput(editing.data_prevista),

            impostos:String(
                editing.impostos ?? 0
            ),

            observacoes:
                editing.observacoes ?? '',

            itens:
                editing.itens?.length
                    ? editing.itens.map(item=>({
                        key:newKey(),
                        peca_id:item.peca_id ?? '',
                        descricao:item.descricao ?? '',
                        quantidade:String(item.quantidade),
                        valor_unitario:String(
                            item.valor_unitario
                        ),
                    }))
                    : [
                        emptyItem(),
                    ],
        });
    },[editing]);

    const fornecedoresQuery=useQuery({
        queryKey:[
            'fornecedores',
            tenant?.id,
            'compras',
        ],

        enabled:Boolean(tenant?.id),

        queryFn:async()=>{
            const response=await api.get(
                '/api/fornecedores',
                {
                    params:{
                        ativo:true,
                    },
                }
            );

            return response.data.data as ManutencaoFornecedor[];
        },
    });

    const pecasQuery=useQuery({
        queryKey:[
            'pecas',
            tenant?.id,
            'compras',
        ],

        enabled:Boolean(tenant?.id),

        queryFn:async()=>{
            const response=await api.get(
                '/api/pecas',
                {
                    params:{
                        ativo:true,
                    },
                }
            );

            return response.data.data as ManutencaoPeca[];
        },
    });

    function updateItem(
        key:string,
        field:keyof Omit<ItemForm,'key'>,
        value:string
    ){
        setForm(current=>({
            ...current,

            itens:current.itens.map(item=>
                item.key===key
                    ? {
                        ...item,
                        [field]:value,
                    }
                    : item
            ),
        }));
    }

    function selectPeca(
        key:string,
        pecaId:string
    ){
        const peca=(pecasQuery.data ?? [])
            .find(item=>item.id===pecaId);

        setForm(current=>({
            ...current,

            itens:current.itens.map(item=>{
                if(item.key!==key){
                    return item;
                }

                if(!peca){
                    return {
                        ...item,
                        peca_id:'',
                    };
                }

                return {
                    ...item,
                    peca_id:peca.id,
                    descricao:
                        item.descricao.trim()
                        || peca.nome,
                    valor_unitario:
                        Number(item.valor_unitario)===0
                            ? String(peca.custo_medio ?? 0)
                            : item.valor_unitario,
                };
            }),
        }));
    }

    function addItem(){
        setForm(current=>({
            ...current,

            itens:[
                ...current.itens,
                emptyItem(),
            ],
        }));
    }

    function removeItem(
        key:string
    ){
        setForm(current=>({
            ...current,

            itens:
                current.itens.length===1
                    ? current.itens
                    : current.itens.filter(
                        item=>item.key!==key
                    ),
        }));
    }

    const subtotal=useMemo(
        ()=>form.itens.reduce(
            (sum,item)=>
                sum+
                (
                    Number(item.quantidade) || 0
                )*
                (
                    Number(item.valor_unitario) || 0
                ),
            0
        ),
        [form.itens]
    );

    const total=
        subtotal+
        (
            Number(form.impostos) || 0
        );

    const saveMutation=useMutation({
        mutationFn:async()=>{
            const itens:CompraItemPayload[]=
                form.itens.map(item=>({
                    peca_id:
                        item.peca_id || null,

                    descricao:
                        item.descricao.trim() || null,

                    quantidade:
                        Number(item.quantidade),

                    valor_unitario:
                        Number(item.valor_unitario),
                }));

            const base:CompraUpdatePayload={
                fornecedor_id:
                    form.fornecedor_id || null,

                numero_documento:
                    form.numero_documento.trim()
                    || null,

                data_encomenda:
                    form.data_encomenda || null,

                data_prevista:
                    form.data_prevista || null,

                impostos:
                    Number(form.impostos),

                observacoes:
                    form.observacoes.trim()
                    || null,

                itens,
            };

            if(editing){
                const response=await api.patch(
                    `/api/compras/${editing.id}`,
                    base
                );

                return response.data.data as Compra;
            }

            const payload:CompraPayload={
                ...base,
                status:'rascunho',
            };

            const response=await api.post(
                '/api/compras',
                payload
            );

            return response.data.data as Compra;
        },

        onSuccess:async compra=>{
            await onSaved(compra);
        },
    });

    function submit(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();
        saveMutation.mutate();
    }

    const validItems=form.itens.every(
        item=>
            Number(item.quantidade)>0 &&
            Number(item.valor_unitario)>=0 &&
            (
                Boolean(item.peca_id) ||
                Boolean(item.descricao.trim())
            )
    );

    return (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            {editing
                                ? 'Editar compra'
                                : 'Nova compra'
                            }
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {editing
                                ? editing.numero_documento
                                    ?? 'Compra sem número'
                                : 'A compra será criada como rascunho.'
                            }
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                <form
                    onSubmit={submit}
                    className="p-6 space-y-6"
                >
                    {saveMutation.isError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                            <p className="text-sm text-red-700">
                                {apiError(saveMutation.error)}
                            </p>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Fornecedor
                            </span>

                            <select
                                value={form.fornecedor_id}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        fornecedor_id:
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
                        </label>

                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Nº documento
                            </span>

                            <input
                                maxLength={100}
                                value={form.numero_documento}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        numero_documento:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                                placeholder="Ex.: FT 2026/123"
                            />
                        </label>

                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Data da encomenda
                            </span>

                            <input
                                type="date"
                                value={form.data_encomenda}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        data_encomenda:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>

                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Data prevista
                            </span>

                            <input
                                type="date"
                                value={form.data_prevista}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        data_prevista:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <div>
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    Itens
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    Adicione uma ou mais peças ou itens da compra.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={addItem}
                                className="h-9 px-3 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold flex items-center gap-2 hover:bg-indigo-50"
                            >
                                <Plus className="w-4 h-4"/>
                                Adicionar item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {form.itens.map(
                                (item,index)=>(
                                    <div
                                        key={item.key}
                                        className="rounded-xl border border-slate-200 p-4"
                                    >
                                        <div className="flex justify-between gap-3 mb-4">
                                            <p className="text-sm font-semibold text-slate-700">
                                                Item {index+1}
                                            </p>

                                            {form.itens.length>1 && (
                                                <button
                                                    type="button"
                                                    onClick={()=>
                                                        removeItem(item.key)
                                                    }
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Remover item"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid lg:grid-cols-4 gap-3">
                                            <label className="block lg:col-span-2">
                                                <span className="block mb-1 text-xs font-medium text-slate-600">
                                                    Peça
                                                </span>

                                                <select
                                                    value={item.peca_id}
                                                    onChange={event=>
                                                        selectPeca(
                                                            item.key,
                                                            event.target.value
                                                        )
                                                    }
                                                    className={inputClass}
                                                >
                                                    <option value="">
                                                        Item sem peça vinculada
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

                                            <label className="block">
                                                <span className="block mb-1 text-xs font-medium text-slate-600">
                                                    Quantidade *
                                                </span>

                                                <input
                                                    required
                                                    type="number"
                                                    min="0.001"
                                                    step="0.001"
                                                    value={item.quantidade}
                                                    onChange={event=>
                                                        updateItem(
                                                            item.key,
                                                            'quantidade',
                                                            event.target.value
                                                        )
                                                    }
                                                    className={inputClass}
                                                />
                                            </label>

                                            <label className="block">
                                                <span className="block mb-1 text-xs font-medium text-slate-600">
                                                    Valor unitário *
                                                </span>

                                                <input
                                                    required
                                                    type="number"
                                                    min="0"
                                                    step="0.0001"
                                                    value={item.valor_unitario}
                                                    onChange={event=>
                                                        updateItem(
                                                            item.key,
                                                            'valor_unitario',
                                                            event.target.value
                                                        )
                                                    }
                                                    className={inputClass}
                                                />
                                            </label>

                                            <label className="block lg:col-span-3">
                                                <span className="block mb-1 text-xs font-medium text-slate-600">
                                                    Descrição *
                                                </span>

                                                <input
                                                    required={!item.peca_id}
                                                    maxLength={500}
                                                    value={item.descricao}
                                                    onChange={event=>
                                                        updateItem(
                                                            item.key,
                                                            'descricao',
                                                            event.target.value
                                                        )
                                                    }
                                                    className={inputClass}
                                                />
                                            </label>

                                            <div className="rounded-xl bg-slate-50 px-3 py-2 flex flex-col justify-center">
                                                <p className="text-xs text-slate-500">
                                                    Total do item
                                                </p>

                                                <p className="font-semibold text-slate-900">
                                                    {money(
                                                        Number(item.quantidade)*
                                                        Number(item.valor_unitario)
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Impostos *
                            </span>

                            <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.impostos}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        impostos:event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>

                        <div className="rounded-xl bg-slate-50 p-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">
                                    Subtotal estimado
                                </span>

                                <span className="font-semibold text-slate-800">
                                    {money(subtotal)}
                                </span>
                            </div>

                            <div className="mt-2 flex justify-between text-sm">
                                <span className="text-slate-500">
                                    Impostos
                                </span>

                                <span className="font-semibold text-slate-800">
                                    {money(form.impostos)}
                                </span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between">
                                <span className="font-semibold text-slate-900">
                                    Total estimado
                                </span>

                                <span className="font-bold text-slate-950">
                                    {money(total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <label className="block">
                        <span className="block mb-1 text-sm font-medium text-slate-700">
                            Observações
                        </span>

                        <textarea
                            rows={4}
                            maxLength={10000}
                            value={form.observacoes}
                            onChange={event=>
                                setForm(current=>({
                                    ...current,
                                    observacoes:event.target.value,
                                }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </label>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                saveMutation.isPending ||
                                !validItems
                            }
                            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {saveMutation.isPending && (
                                <LoaderCircle className="w-4 h-4 animate-spin"/>
                            )}

                            {editing
                                ? 'Guardar alterações'
                                : 'Criar rascunho'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
