import axios from 'axios';
import {useState} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';
import {
    AlertCircle,
    CheckCircle2,
    LoaderCircle,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import api from '../lib/api';
import type {
    ManutencaoAprovacaoPublica,
    ManutencaoAprovacaoRespostaPayload,
} from '../types/manutencao';

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

function money(value:number|string|null):string{
    return new Intl.NumberFormat('pt-PT',{
        style:'currency',
        currency:'EUR',
    }).format(Number(value ?? 0));
}

function dateTime(value:string|null):string{
    if(!value){
        return '—';
    }

    const date=new Date(value);

    return new Intl.DateTimeFormat('pt-PT',{
        dateStyle:'long',
        timeStyle:'short',
    }).format(date);
}

export default function AprovacaoManutencaoPublicaPage(){
    const {token}=useParams();
    const [notes,setNotes]=useState('');

    const query=useQuery({
        queryKey:[
            'aprovacao-manutencao-publica',
            token,
        ],
        enabled:Boolean(token),
        queryFn:async()=>{
            const response=await api.get(
                `/api/manutencoes/aprovacoes/${token}`
            );

            return response.data.data as ManutencaoAprovacaoPublica;
        },
    });

    const mutation=useMutation({
        mutationFn:async(
            decision:'aprovar'|'rejeitar'
        )=>{
            const payload:ManutencaoAprovacaoRespostaPayload={
                decisao:decision,
                observacoes:
                    notes.trim()
                    || null,
            };

            await api.post(
                `/api/manutencoes/aprovacoes/${token}/responder`,
                payload
            );
        },

        onSuccess:async()=>{
            await query.refetch();
        },
    });

    const approval=query.data;

    return (
        <div className="min-h-screen bg-slate-100 px-4 py-10">
            <div className="mx-auto max-w-2xl">
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-6 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6"/>
                            </div>

                            <div>
                                <h1 className="text-xl font-bold text-slate-950">
                                    Aprovação de manutenção
                                </h1>

                                <p className="mt-1 text-sm text-slate-500">
                                    FrotaPro
                                </p>
                            </div>
                        </div>
                    </div>

                    {query.isLoading ? (
                        <div className="py-20 flex justify-center">
                            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
                        </div>
                    ) : query.isError || !approval ? (
                        <div className="p-8 text-center">
                            <AlertCircle className="w-10 h-10 mx-auto text-red-500"/>

                            <h2 className="mt-4 font-semibold text-slate-900">
                                Não foi possível abrir esta aprovação.
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                {apiError(query.error)}
                            </p>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-semibold text-slate-400">
                                    Ordem
                                </p>

                                <p className="mt-1 text-lg font-bold text-slate-950">
                                    {approval.manutencao.numero_ordem}
                                </p>

                                <p className="mt-1 text-sm text-slate-600">
                                    {approval.manutencao.tipo_servico}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-5">
                                <p className="text-sm text-slate-500">
                                    Valor do orçamento
                                </p>

                                <p className="mt-1 text-3xl font-bold text-slate-950">
                                    {money(
                                        approval.valor_orcamento
                                    )}
                                </p>
                            </div>

                            {approval.manutencao.problema_reportado && (
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        Problema reportado
                                    </h3>

                                    <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                                        {approval.manutencao.problema_reportado}
                                    </p>
                                </div>
                            )}

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Info
                                    label="Aprovador"
                                    value={
                                        approval.aprovador_nome
                                        ?? '—'
                                    }
                                />

                                <Info
                                    label="Validade"
                                    value={dateTime(
                                        approval.expires_at
                                    )}
                                />
                            </div>

                            {approval.status==='pendente' ? (
                                <>
                                    {mutation.isError && (
                                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                            {apiError(
                                                mutation.error
                                            )}
                                        </div>
                                    )}

                                    <label className="block">
                                        <span className="block mb-1 text-sm font-medium text-slate-700">
                                            Observações
                                        </span>

                                        <textarea
                                            rows={4}
                                            maxLength={5000}
                                            value={notes}
                                            onChange={event=>
                                                setNotes(
                                                    event.target.value
                                                )
                                            }
                                            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-500"
                                        />
                                    </label>

                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            disabled={
                                                mutation.isPending
                                            }
                                            onClick={()=>
                                                mutation.mutate(
                                                    'rejeitar'
                                                )
                                            }
                                            className="h-12 rounded-xl border border-red-200 text-red-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <XCircle className="w-5 h-5"/>
                                            Rejeitar
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                mutation.isPending
                                            }
                                            onClick={()=>
                                                mutation.mutate(
                                                    'aprovar'
                                                )
                                            }
                                            className="h-12 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {mutation.isPending ? (
                                                <LoaderCircle className="w-5 h-5 animate-spin"/>
                                            ) : (
                                                <CheckCircle2 className="w-5 h-5"/>
                                            )}

                                            Aprovar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div
                                    className={[
                                        'rounded-xl p-5 text-center',
                                        approval.status==='aprovada'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : approval.status==='rejeitada'
                                                ? 'bg-red-50 text-red-700'
                                                : 'bg-slate-100 text-slate-600',
                                    ].join(' ')}
                                >
                                    <p className="font-bold">
                                        {approval.status==='aprovada'
                                            ? 'Orçamento aprovado'
                                            : approval.status==='rejeitada'
                                                ? 'Orçamento rejeitado'
                                                : 'Solicitação expirada'
                                        }
                                    </p>

                                    {approval.respondido_em && (
                                        <p className="mt-1 text-sm">
                                            {dateTime(
                                                approval.respondido_em
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
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
        <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">
                {label}
            </p>

            <p className="mt-1 font-semibold text-slate-900">
                {value}
            </p>
        </div>
    );
}
