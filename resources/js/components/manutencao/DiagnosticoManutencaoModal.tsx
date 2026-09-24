import axios from 'axios';
import {useState} from 'react';
import type {FormEvent} from 'react';
import {
    AlertCircle,
    LoaderCircle,
    Wrench,
    X,
} from 'lucide-react';
import {useMutation} from '@tanstack/react-query';
import api from '../../lib/api';
import type {
    Manutencao,
    ManutencaoPrioridade,
    VeiculoDiagnostico,
} from '../../types/manutencao';

interface Props {
    diagnostic:VeiculoDiagnostico;
    onClose:()=>void;
    onCreated:(manutencao:Manutencao)=>Promise<void>|void;
}

interface FormState {
    tipo_servico:string;
    prioridade:''|ManutencaoPrioridade;
    problema_reportado:string;
    km:string;
    data_solicitacao:string;
    data_agendada:string;
    aprovacao_obrigatoria:boolean;
    indisponibiliza_veiculo:boolean;
    valor_orcamento:string;
    observacoes:string;
}

const inputClass='w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

const priorityLabels:Record<ManutencaoPrioridade,string>={
    baixa:'Baixa',
    normal:'Normal',
    alta:'Alta',
    critica:'Crítica',
};

function today():string{
    const now=new Date();
    const offset=now.getTimezoneOffset()*60000;

    return new Date(now.getTime()-offset)
        .toISOString()
        .slice(0,10);
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
            ?? 'Não foi possível gerar a ordem de manutenção.';
    }

    return 'Não foi possível gerar a ordem de manutenção.';
}

export default function DiagnosticoManutencaoModal({
    diagnostic,
    onClose,
    onCreated,
}:Props){
    const [form,setForm]=useState<FormState>({
        tipo_servico:
            `Diagnóstico - ${diagnostic.titulo}`
                .slice(0,150),

        prioridade:'',
        problema_reportado:'',
        km:
            diagnostic.veiculo?.km_atual!==null &&
            diagnostic.veiculo?.km_atual!==undefined
                ? String(diagnostic.veiculo.km_atual)
                : '',
        data_solicitacao:today(),
        data_agendada:'',
        aprovacao_obrigatoria:false,
        indisponibiliza_veiculo:false,
        valor_orcamento:'',
        observacoes:'',
    });

    const mutation=useMutation({
        mutationFn:async()=>{
            const payload:Record<string,unknown>={
                tipo_servico:
                    form.tipo_servico.trim(),

                aprovacao_obrigatoria:
                    form.aprovacao_obrigatoria,

                indisponibiliza_veiculo:
                    form.indisponibiliza_veiculo,
            };

            if(form.prioridade){
                payload.prioridade=
                    form.prioridade;
            }

            if(form.problema_reportado.trim()){
                payload.problema_reportado=
                    form.problema_reportado.trim();
            }

            if(form.km.trim()){
                payload.km=
                    Number(form.km);
            }

            if(form.data_solicitacao){
                payload.data_solicitacao=
                    form.data_solicitacao;
            }

            if(form.data_agendada){
                payload.data_agendada=
                    form.data_agendada;
            }

            if(form.valor_orcamento.trim()){
                payload.valor_orcamento=
                    Number(form.valor_orcamento);
            }

            if(form.observacoes.trim()){
                payload.observacoes=
                    form.observacoes.trim();
            }

            const response=await api.post(
                `/api/diagnosticos/${diagnostic.id}/manutencao`,
                payload
            );

            return response.data.data as Manutencao;
        },

        onSuccess:async manutencao=>{
            await onCreated(manutencao);
        },
    });

    function submit(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();

        if(!form.tipo_servico.trim()){
            return;
        }

        mutation.mutate();
    }

    return (
        <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-indigo-600"/>

                            <h2 className="text-lg font-bold text-slate-950">
                                Gerar ordem de manutenção
                            </h2>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                            {diagnostic.veiculo?.matricula ?? 'Veículo'} · {diagnostic.titulo}
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

                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                        <p className="text-sm font-semibold text-indigo-900">
                            Origem: diagnóstico
                        </p>

                        <p className="mt-1 text-sm text-indigo-700">
                            O veículo e o vínculo com este diagnóstico serão definidos automaticamente pelo servidor.
                        </p>
                    </div>

                    <label className="block">
                        <span className="block mb-1 text-sm font-medium text-slate-700">
                            Tipo de serviço *
                        </span>

                        <input
                            required
                            maxLength={150}
                            value={form.tipo_servico}
                            onChange={event=>
                                setForm(current=>({
                                    ...current,
                                    tipo_servico:
                                        event.target.value,
                                }))
                            }
                            className={inputClass}
                        />
                    </label>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Prioridade
                            </span>

                            <select
                                value={form.prioridade}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        prioridade:
                                            event.target.value as
                                                ''|ManutencaoPrioridade,
                                    }))
                                }
                                className={inputClass}
                            >
                                <option value="">
                                    Automática pela severidade
                                </option>

                                {Object.entries(
                                    priorityLabels
                                ).map(([value,label])=>(
                                    <option
                                        key={value}
                                        value={value}
                                    >
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Quilometragem
                            </span>

                            <input
                                type="number"
                                min="0"
                                max="999999999"
                                step="1"
                                value={form.km}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        km:event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="block mb-1 text-sm font-medium text-slate-700">
                            Problema reportado
                        </span>

                        <textarea
                            rows={4}
                            maxLength={10000}
                            value={form.problema_reportado}
                            onChange={event=>
                                setForm(current=>({
                                    ...current,
                                    problema_reportado:
                                        event.target.value,
                                }))
                            }
                            placeholder="Deixe vazio para usar automaticamente o código DTC, título e descrição do diagnóstico."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />

                        <p className="mt-1 text-xs text-slate-500">
                            Se ficar vazio, o backend utiliza automaticamente os dados deste diagnóstico.
                        </p>
                    </label>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Data de solicitação
                            </span>

                            <input
                                type="date"
                                value={form.data_solicitacao}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        data_solicitacao:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>

                        <label className="block">
                            <span className="block mb-1 text-sm font-medium text-slate-700">
                                Data agendada
                            </span>

                            <input
                                type="date"
                                value={form.data_agendada}
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        data_agendada:
                                            event.target.value,
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="block mb-1 text-sm font-medium text-slate-700">
                            Valor do orçamento
                        </span>

                        <input
                            type="number"
                            min="0"
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

                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="rounded-xl border border-slate-200 p-4 flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={
                                    form.aprovacao_obrigatoria
                                }
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        aprovacao_obrigatoria:
                                            event.target.checked,
                                    }))
                                }
                                className="mt-1"
                            />

                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Exigir aprovação
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    A ordem precisará de aprovação antes de avançar.
                                </p>
                            </div>
                        </label>

                        <label className="rounded-xl border border-slate-200 p-4 flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={
                                    form.indisponibiliza_veiculo
                                }
                                onChange={event=>
                                    setForm(current=>({
                                        ...current,
                                        indisponibiliza_veiculo:
                                            event.target.checked,
                                    }))
                                }
                                className="mt-1"
                            />

                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Indisponibilizar veículo
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Marca o veículo como indisponível durante o fluxo de manutenção.
                                </p>
                            </div>
                        </label>
                    </div>

                    <label className="block">
                        <span className="block mb-1 text-sm font-medium text-slate-700">
                            Observações
                        </span>

                        <textarea
                            rows={4}
                            maxLength={20000}
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

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={mutation.isPending}
                            className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                mutation.isPending ||
                                !form.tipo_servico.trim()
                            }
                            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? (
                                <LoaderCircle className="w-4 h-4 animate-spin"/>
                            ) : (
                                <Wrench className="w-4 h-4"/>
                            )}

                            Gerar ordem
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
