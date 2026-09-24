import axios from 'axios';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {
    Manutencao,
    ManutencaoGarantia,
} from '../../types/manutencao';

interface Props {
    manutencao:Manutencao;
    onChanged:()=>Promise<void>|void;
}

const statusLabels:Record<
    ManutencaoGarantia['status'],
    string
>={
    ativa:'Ativa',
    expirada:'Expirada',
    utilizada:'Utilizada',
    cancelada:'Cancelada',
};

const statusClasses:Record<
    ManutencaoGarantia['status'],
    string
>={
    ativa:'bg-emerald-50 text-emerald-700',
    expirada:'bg-slate-100 text-slate-600',
    utilizada:'bg-indigo-50 text-indigo-700',
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

function date(
    value:string|null
):string{
    if(!value){
        return '—';
    }

    return new Intl.DateTimeFormat(
        'pt-PT'
    ).format(
        new Date(value)
    );
}

export default function GarantiasManutencaoSection({
    manutencao,
    onChanged,
}:Props){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const mutation=useMutation({
        mutationFn:async(
            garantia:ManutencaoGarantia
        )=>{
            const observacoes=
                window.prompt(
                    'Observações sobre a utilização da garantia:',
                    ''
                );

            if(observacoes===null){
                throw new Error('__cancelled__');
            }

            const response=await api.post(
                `/api/manutencoes/${manutencao.id}/garantias/${garantia.id}/utilizar`,
                {
                    observacoes:
                        observacoes.trim()
                        || null,
                }
            );

            return response.data.data as ManutencaoGarantia;
        },

        onSuccess:async()=>{
            await queryClient.invalidateQueries({
                queryKey:[
                    'manutencao',
                    tenant?.id,
                    manutencao.id,
                ],
            });

            await onChanged();
        },
    });

    const garantias=
        manutencao.garantias ?? [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600"/>

                <div>
                    <h3 className="font-semibold text-slate-950">
                        Garantias
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Garantias geradas pelos itens concluídos desta manutenção.
                    </p>
                </div>
            </div>

            {mutation.isError &&
                !(
                    mutation.error instanceof Error &&
                    mutation.error.message==='__cancelled__'
                ) && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                    <p className="text-sm text-red-700">
                        {apiError(mutation.error)}
                    </p>
                </div>
            )}

            {garantias.length===0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 py-10 text-center">
                    <ShieldCheck className="mx-auto w-9 h-9 text-slate-300"/>

                    <p className="mt-2 text-sm text-slate-500">
                        Nenhuma garantia registada.
                    </p>
                </div>
            ) : (
                <div className="mt-5 space-y-3">
                    {garantias.map(garantia=>(
                        <div
                            key={garantia.id}
                            className="rounded-xl border border-slate-200 p-4"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                            className={[
                                                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                statusClasses[
                                                    garantia.status
                                                ],
                                            ].join(' ')}
                                        >
                                            {statusLabels[
                                                garantia.status
                                            ]}
                                        </span>

                                        <p className="font-semibold text-slate-900">
                                            {garantia.descricao}
                                        </p>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                                        <span>
                                            Início: {date(
                                                garantia.data_inicio
                                            )}
                                        </span>

                                        <span>
                                            Fim: {date(
                                                garantia.data_fim
                                            )}
                                        </span>

                                        <span>
                                            Limite:{' '}
                                            {garantia.km_limite===null
                                                ? '—'
                                                : `${Number(
                                                    garantia.km_limite
                                                ).toLocaleString(
                                                    'pt-PT'
                                                )} km`
                                            }
                                        </span>
                                    </div>
                                </div>

                                {garantia.status==='ativa' && (
                                    <button
                                        type="button"
                                        disabled={
                                            mutation.isPending
                                        }
                                        onClick={()=>
                                            mutation.mutate(
                                                garantia
                                            )
                                        }
                                        className="h-10 px-4 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-4 h-4"/>
                                        Utilizar garantia
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
