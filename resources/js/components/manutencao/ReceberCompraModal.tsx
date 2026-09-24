import axios from 'axios';
import {useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import {useMutation} from '@tanstack/react-query';
import {
    AlertCircle,
    LoaderCircle,
    PackageCheck,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import type {
    Compra,
    CompraRecebimentoPayload,
} from '../../types/manutencao';

interface Props {
    compra:Compra;
    onClose:()=>void;
    onReceived:(compra:Compra)=>Promise<void>|void;
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
            ?? 'Não foi possível registar o recebimento.';
    }

    return 'Não foi possível registar o recebimento.';
}

function qty(
    value:number|string|null|undefined
):string{
    const number=Number(value ?? 0);

    return Number.isFinite(number)
        ? number.toLocaleString('pt-PT',{
            maximumFractionDigits:3,
        })
        : '0';
}

export default function ReceberCompraModal({
    compra,
    onClose,
    onReceived,
}:Props){
    const itens=compra.itens ?? [];

    const [quantidades,setQuantidades]=useState<
        Record<string,string>
    >(
        Object.fromEntries(
            itens.map(item=>[
                item.id,
                String(
                    Math.max(
                        0,
                        Number(item.quantidade)-
                        Number(item.quantidade_recebida)
                    )
                ),
            ])
        )
    );

    const pendentes=useMemo(
        ()=>itens.map(item=>({
            item,
            restante:Math.max(
                0,
                Number(item.quantidade)-
                Number(item.quantidade_recebida)
            ),
        })).filter(entry=>entry.restante>0),
        [itens]
    );

    const selected=pendentes.filter(
        ({item,restante})=>{
            const quantidade=
                Number(
                    quantidades[item.id] ?? 0
                );

            return (
                quantidade>0 &&
                quantidade<=restante
            );
        }
    );

    const mutation=useMutation({
        mutationFn:async()=>{
            const payload:CompraRecebimentoPayload={
                itens:selected.map(
                    ({item})=>({
                        item_id:item.id,
                        quantidade:Number(
                            quantidades[item.id]
                        ),
                    })
                ),
            };

            const response=await api.post(
                `/api/compras/${compra.id}/receber`,
                payload
            );

            return response.data.data as Compra;
        },

        onSuccess:async updated=>{
            await onReceived(updated);
        },
    });

    function submit(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();

        if(selected.length===0){
            return;
        }

        mutation.mutate();
    }

    return (
        <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            Receber mercadoria
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {compra.numero_documento
                                ?? 'Compra sem número'
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
                    className="p-6 space-y-5"
                >
                    {mutation.isError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                            <p className="text-sm text-red-700">
                                {apiError(mutation.error)}
                            </p>
                        </div>
                    )}

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                        Para itens associados a peças, o recebimento atualiza automaticamente o estoque e o custo médio.
                    </div>

                    {pendentes.length===0 ? (
                        <div className="py-12 text-center">
                            <PackageCheck className="w-10 h-10 mx-auto text-emerald-500"/>

                            <p className="mt-3 font-semibold text-slate-800">
                                Todos os itens já foram recebidos.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendentes.map(
                                ({item,restante})=>(
                                    <div
                                        key={item.id}
                                        className="rounded-xl border border-slate-200 p-4"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {item.descricao}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    Encomendado: {qty(item.quantidade)}
                                                    {' · '}
                                                    Recebido: {qty(item.quantidade_recebida)}
                                                    {' · '}
                                                    Pendente: {qty(restante)}
                                                </p>

                                                {item.peca && (
                                                    <p className="mt-1 text-xs text-indigo-600">
                                                        {item.peca.codigo} · {item.peca.nome}
                                                    </p>
                                                )}
                                            </div>

                                            <label className="block w-full sm:w-40">
                                                <span className="block mb-1 text-xs font-medium text-slate-600">
                                                    Receber agora
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={restante}
                                                    step="0.001"
                                                    value={
                                                        quantidades[item.id]
                                                        ?? ''
                                                    }
                                                    onChange={event=>
                                                        setQuantidades(
                                                            current=>({
                                                                ...current,
                                                                [item.id]:
                                                                    event.target.value,
                                                            })
                                                        )
                                                    }
                                                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}

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
                                mutation.isPending ||
                                selected.length===0
                            }
                            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? (
                                <LoaderCircle className="w-4 h-4 animate-spin"/>
                            ) : (
                                <PackageCheck className="w-4 h-4"/>
                            )}

                            Registar recebimento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
