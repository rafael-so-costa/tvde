import axios from 'axios';
import {useState} from 'react';
import type {FormEvent} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Clipboard,
    Clock3,
    ExternalLink,
    LoaderCircle,
    Send,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {
    ManutencaoAprovacao,
    ManutencaoAprovacaoPayload,
    ManutencaoAprovacaoRespostaPayload,
} from '../../types/manutencao';

interface Props {
    manutencaoId:string;
    numeroOrdem:string;
    status:string;
    aprovacaoObrigatoria:boolean;
    valorOrcamento:number|string|null;
}

interface ManutencaoDetail {
    id:string;
    status:string;
    valor_orcamento:number|string|null;
    aprovacoes?:ManutencaoAprovacao[];
}

interface RequestForm {
    valor_orcamento:string;
    aprovador_nome:string;
    aprovador_email:string;
    validade_dias:string;
    observacoes:string;
}

const inputClass='w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

const statusLabels={
    pendente:'Pendente',
    aprovada:'Aprovada',
    rejeitada:'Rejeitada',
    expirada:'Expirada',
} as const;

const statusClasses={
    pendente:'bg-amber-50 text-amber-700',
    aprovada:'bg-emerald-50 text-emerald-700',
    rejeitada:'bg-red-50 text-red-700',
    expirada:'bg-slate-100 text-slate-600',
} as const;

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

function dateTime(value:string|null|undefined):string{
    if(!value){
        return '—';
    }

    const date=new Date(value);

    if(Number.isNaN(date.getTime())){
        return value;
    }

    return new Intl.DateTimeFormat('pt-PT',{
        dateStyle:'short',
        timeStyle:'short',
    }).format(date);
}

export default function AprovacoesManutencaoSection({
    manutencaoId,
    numeroOrdem,
    status,
    aprovacaoObrigatoria,
    valorOrcamento,
}:Props){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const [showForm,setShowForm]=useState(false);
    const [responseId,setResponseId]=useState<string|null>(null);
    const [responseNotes,setResponseNotes]=useState('');
    const [generatedLink,setGeneratedLink]=useState<string|null>(null);
    const [copied,setCopied]=useState(false);

    const [form,setForm]=useState<RequestForm>({
        valor_orcamento:
            valorOrcamento!==null
                ? String(valorOrcamento)
                : '',
        aprovador_nome:'',
        aprovador_email:'',
        validade_dias:'7',
        observacoes:'',
    });

    const detailQuery=useQuery({
        queryKey:[
            'manutencao',
            tenant?.id,
            manutencaoId,
            'aprovacoes',
        ],
        enabled:Boolean(
            tenant?.id &&
            manutencaoId
        ),
        queryFn:async()=>{
            const response=await api.get(
                `/api/manutencoes/${manutencaoId}`
            );

            return response.data.data as ManutencaoDetail;
        },
    });

    const refresh=async()=>{
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey:[
                    'manutencoes',
                    tenant?.id,
                ],
            }),
            queryClient.invalidateQueries({
                queryKey:[
                    'manutencao',
                    tenant?.id,
                    manutencaoId,
                ],
            }),
            queryClient.invalidateQueries({
                queryKey:[
                    'manutencao',
                    tenant?.id,
                    manutencaoId,
                    'aprovacoes',
                ],
            }),
        ]);
    };

    const requestMutation=useMutation({
        mutationFn:async()=>{
            const payload:ManutencaoAprovacaoPayload={
                valor_orcamento:
                    form.valor_orcamento.trim()
                        ? Number(form.valor_orcamento)
                        : null,

                aprovador_nome:
                    form.aprovador_nome.trim()
                    || null,

                aprovador_email:
                    form.aprovador_email.trim()
                    || null,

                validade_dias:
                    form.validade_dias.trim()
                        ? Number(form.validade_dias)
                        : null,

                observacoes:
                    form.observacoes.trim()
                    || null,
            };

            const response=await api.post(
                `/api/manutencoes/${manutencaoId}/aprovacoes`,
                payload
            );

            return {
                approval:
                    response.data.data as ManutencaoAprovacao,
                token:
                    response.data.token as string,
            };
        },

        onSuccess:async result=>{
            const link=
                `${window.location.origin}`+
                `/aprovacao-manutencao/${result.token}`;

            setGeneratedLink(link);
            setShowForm(false);

            await refresh();
        },
    });

    const responseMutation=useMutation({
        mutationFn:async({
            approval,
            decision,
        }:{
            approval:ManutencaoAprovacao;
            decision:'aprovar'|'rejeitar';
        })=>{
            const payload:ManutencaoAprovacaoRespostaPayload={
                decisao:decision,
                observacoes:
                    responseNotes.trim()
                    || null,
            };

            const response=await api.post(
                `/api/manutencoes/${manutencaoId}/aprovacoes/${approval.id}/responder`,
                payload
            );

            return response.data.data as ManutencaoAprovacao;
        },

        onSuccess:async()=>{
            setResponseId(null);
            setResponseNotes('');

            await refresh();
        },
    });

    async function copyLink(){
        if(!generatedLink){
            return;
        }

        await navigator.clipboard.writeText(
            generatedLink
        );

        setCopied(true);

        window.setTimeout(
            ()=>setCopied(false),
            1500
        );
    }

    function submitRequest(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();
        requestMutation.mutate();
    }

    const approvals=
        detailQuery.data?.aprovacoes
        ?? [];

    const pending=
        approvals.find(
            approval=>
                approval.status==='pendente'
        );

    const currentStatus=
        detailQuery.data?.status
        ?? status;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600"/>

                        <h3 className="font-semibold text-slate-950">
                            Aprovação do orçamento
                        </h3>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        {aprovacaoObrigatoria
                            ? 'Esta ordem exige aprovação antes do início.'
                            : 'A aprovação não é obrigatória, mas pode ser solicitada.'
                        }
                    </p>
                </div>

                {!pending &&
                    ['rascunho','aguardando_aprovacao']
                        .includes(currentStatus) && (
                        <button
                            type="button"
                            onClick={()=>
                                setShowForm(
                                    current=>!current
                                )
                            }
                            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                        >
                            <Send className="w-4 h-4"/>
                            Solicitar aprovação
                        </button>
                    )}
            </div>

            {generatedLink && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"/>

                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-amber-900">
                                Guarde este link agora
                            </p>

                            <p className="mt-1 text-sm text-amber-700">
                                O token não poderá ser recuperado novamente depois desta resposta.
                            </p>

                            <div className="mt-3 flex gap-2">
                                <input
                                    readOnly
                                    value={generatedLink}
                                    className="flex-1 min-w-0 h-10 rounded-xl border border-amber-200 bg-white px-3 text-xs"
                                />

                                <button
                                    type="button"
                                    onClick={copyLink}
                                    className="h-10 px-3 rounded-xl border border-amber-300 bg-white text-amber-800 text-sm font-semibold flex items-center gap-2"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4"/>
                                    ) : (
                                        <Clipboard className="w-4 h-4"/>
                                    )}

                                    {copied
                                        ? 'Copiado'
                                        : 'Copiar'
                                    }
                                </button>

                                <a
                                    href={generatedLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-10 h-10 rounded-xl border border-amber-300 bg-white flex items-center justify-center text-amber-800"
                                >
                                    <ExternalLink className="w-4 h-4"/>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <form
                    onSubmit={submitRequest}
                    className="mt-5 rounded-xl border border-slate-200 p-4 space-y-4"
                >
                    {requestMutation.isError && (
                        <ErrorBox
                            message={apiError(
                                requestMutation.error
                            )}
                        />
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Valor do orçamento
                            </span>

                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.valor_orcamento}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        valor_orcamento:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>

                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Validade em dias
                            </span>

                            <input
                                type="number"
                                min="1"
                                max="90"
                                step="1"
                                value={form.validade_dias}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        validade_dias:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>

                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Nome do aprovador
                            </span>

                            <input
                                maxLength={255}
                                value={form.aprovador_nome}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        aprovador_nome:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>

                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                E-mail do aprovador
                            </span>

                            <input
                                type="email"
                                maxLength={255}
                                value={form.aprovador_email}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        aprovador_email:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="block mb-1 text-sm font-medium text-slate-700">
                            Observações
                        </span>

                        <textarea
                            rows={3}
                            maxLength={5000}
                            value={form.observacoes}
                            onChange={event=>
                                setForm(current=>({
                                    ...current,
                                    observacoes:
                                        event.target.value,
                                }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </label>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={()=>
                                setShowForm(false)
                            }
                            className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                requestMutation.isPending
                            }
                            className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {requestMutation.isPending && (
                                <LoaderCircle className="w-4 h-4 animate-spin"/>
                            )}

                            Solicitar
                        </button>
                    </div>
                </form>
            )}

            {detailQuery.isLoading ? (
                <div className="py-8 flex justify-center">
                    <LoaderCircle className="w-6 h-6 animate-spin text-indigo-600"/>
                </div>
            ) : approvals.length===0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 py-8 text-center">
                    <Clock3 className="mx-auto w-8 h-8 text-slate-300"/>

                    <p className="mt-2 text-sm text-slate-500">
                        Nenhuma solicitação de aprovação.
                    </p>
                </div>
            ) : (
                <div className="mt-5 space-y-3">
                    {approvals.map(approval=>(
                        <div
                            key={approval.id}
                            className="rounded-xl border border-slate-200 p-4"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                            className={[
                                                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                statusClasses[
                                                    approval.status
                                                ],
                                            ].join(' ')}
                                        >
                                            {statusLabels[
                                                approval.status
                                            ]}
                                        </span>

                                        <span className="text-sm font-semibold text-slate-900">
                                            {money(
                                                approval.valor_orcamento
                                            )}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm text-slate-600">
                                        {approval.aprovador_nome
                                            || 'Aprovador não identificado'
                                        }
                                    </p>

                                    {approval.aprovador_email && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            {approval.aprovador_email}
                                        </p>
                                    )}

                                    <p className="mt-2 text-xs text-slate-500">
                                        Validade: {dateTime(approval.expires_at)}
                                    </p>

                                    {approval.respondido_em && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Respondido: {dateTime(approval.respondido_em)}
                                        </p>
                                    )}

                                    {approval.observacoes && (
                                        <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                                            {approval.observacoes}
                                        </p>
                                    )}
                                </div>

                                {approval.status==='pendente' && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={()=>
                                                setResponseId(
                                                    approval.id
                                                )
                                            }
                                            className="h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                                        >
                                            Responder
                                        </button>
                                    </div>
                                )}
                            </div>

                            {responseId===approval.id && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    {responseMutation.isError && (
                                        <ErrorBox
                                            message={apiError(
                                                responseMutation.error
                                            )}
                                        />
                                    )}

                                    <textarea
                                        rows={3}
                                        maxLength={5000}
                                        value={responseNotes}
                                        onChange={event=>
                                            setResponseNotes(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Observações da decisão..."
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500"
                                    />

                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={()=>{
                                                setResponseId(null);
                                                setResponseNotes('');
                                            }}
                                            className="h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                responseMutation.isPending
                                            }
                                            onClick={()=>
                                                responseMutation.mutate({
                                                    approval,
                                                    decision:'rejeitar',
                                                })
                                            }
                                            className="h-9 px-3 rounded-xl border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4"/>
                                            Rejeitar
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                responseMutation.isPending
                                            }
                                            onClick={()=>
                                                responseMutation.mutate({
                                                    approval,
                                                    decision:'aprovar',
                                                })
                                            }
                                            className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="w-4 h-4"/>
                                            Aprovar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function ErrorBox({
    message,
}:{
    message:string;
}){
    return (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

            <p className="text-sm text-red-700">
                {message}
            </p>
        </div>
    );
}
