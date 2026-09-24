import axios from 'axios';
import {useEffect,useState} from 'react';
import type {FormEvent,ReactNode} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {AlertCircle,LoaderCircle,X} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {Veiculo} from '../../types/veiculo';
import type {Motorista} from '../../types/motorista';
import type {
    Manutencao,
    ManutencaoFornecedor,
    ManutencaoOrigem,
    ManutencaoPayload,
    ManutencaoPrioridade,
    ManutencaoUpdatePayload,
} from '../../types/manutencao';

interface Props {
    editing:Manutencao|null;
    onClose:()=>void;
    onSaved:(manutencao:Manutencao)=>Promise<void>|void;
}

interface FormState {
    veiculo_id:string;
    motorista_id:string;
    fornecedor_id:string;
    origem:ManutencaoOrigem;
    tipo_servico:string;
    prioridade:ManutencaoPrioridade;
    problema_reportado:string;
    km:string;
    data_solicitacao:string;
    data_agendada:string;
    aprovacao_obrigatoria:boolean;
    indisponibiliza_veiculo:boolean;
    valor_orcamento:string;
    proxima_revisao_km:string;
    proxima_revisao_data:string;
    observacoes:string;
}

const inputClass='w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

function localToday():string{
    const now=new Date();
    return new Date(now.getTime()-now.getTimezoneOffset()*60000)
        .toISOString()
        .slice(0,10);
}

function dateInput(value:string|null|undefined):string{
    return value ? value.slice(0,10) : '';
}

function emptyForm():FormState{
    return {
        veiculo_id:'',
        motorista_id:'',
        fornecedor_id:'',
        origem:'manual',
        tipo_servico:'',
        prioridade:'normal',
        problema_reportado:'',
        km:'',
        data_solicitacao:localToday(),
        data_agendada:'',
        aprovacao_obrigatoria:false,
        indisponibiliza_veiculo:true,
        valor_orcamento:'',
        proxima_revisao_km:'',
        proxima_revisao_data:'',
        observacoes:'',
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
            ?? 'Não foi possível guardar a manutenção.';
    }

    return 'Não foi possível guardar a manutenção.';
}

export default function ManutencaoFormModal({
    editing,
    onClose,
    onSaved,
}:Props){
    const {tenant}=useTenant();
    const [form,setForm]=useState<FormState>(emptyForm());

    function update<K extends keyof FormState>(
        field:K,
        value:FormState[K]
    ){
        setForm(current=>({
            ...current,
            [field]:value,
        }));
    }

    useEffect(()=>{
        if(!editing){
            setForm(emptyForm());
            return;
        }

        setForm({
            veiculo_id:editing.veiculo_id,
            motorista_id:editing.motorista_id ?? '',
            fornecedor_id:editing.fornecedor_id ?? '',
            origem:editing.origem,
            tipo_servico:editing.tipo_servico,
            prioridade:editing.prioridade,
            problema_reportado:editing.problema_reportado ?? '',
            km:editing.km===null ? '' : String(editing.km),
            data_solicitacao:
                dateInput(editing.data_solicitacao) || localToday(),
            data_agendada:dateInput(editing.data_agendada),
            aprovacao_obrigatoria:editing.aprovacao_obrigatoria,
            indisponibiliza_veiculo:editing.indisponibiliza_veiculo,
            valor_orcamento:
                editing.valor_orcamento===null
                    ? ''
                    : String(editing.valor_orcamento),
            proxima_revisao_km:
                editing.proxima_revisao_km===null
                    ? ''
                    : String(editing.proxima_revisao_km),
            proxima_revisao_data:
                dateInput(editing.proxima_revisao_data),
            observacoes:editing.observacoes ?? '',
        });
    },[editing]);

    const veiculosQuery=useQuery({
        queryKey:['veiculos',tenant?.id],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get('/api/veiculos');
            return response.data.data as Veiculo[];
        },
    });

    const motoristasQuery=useQuery({
        queryKey:['motoristas',tenant?.id],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get('/api/motoristas');
            return response.data.data as Motorista[];
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

    const saveMutation=useMutation({
        mutationFn:async()=>{
            const base:ManutencaoUpdatePayload={
                veiculo_id:form.veiculo_id,
                motorista_id:form.motorista_id || null,
                fornecedor_id:form.fornecedor_id || null,
                tipo_servico:form.tipo_servico.trim(),
                prioridade:form.prioridade,
                problema_reportado:
                    form.problema_reportado.trim() || null,
                km:form.km==='' ? null : Number(form.km),
                data_solicitacao:form.data_solicitacao || null,
                data_agendada:form.data_agendada || null,
                aprovacao_obrigatoria:form.aprovacao_obrigatoria,
                indisponibiliza_veiculo:form.indisponibiliza_veiculo,
                valor_orcamento:
                    form.valor_orcamento===''
                        ? null
                        : Number(form.valor_orcamento),
                proxima_revisao_km:
                    form.proxima_revisao_km===''
                        ? null
                        : Number(form.proxima_revisao_km),
                proxima_revisao_data:
                    form.proxima_revisao_data || null,
                observacoes:form.observacoes.trim() || null,
            };

            if(editing){
                const response=await api.patch(
                    `/api/manutencoes/${editing.id}`,
                    base
                );

                return response.data.data as Manutencao;
            }

            const payload:ManutencaoPayload={
                ...base,
                origem:form.origem,
            };

            const response=await api.post(
                '/api/manutencoes',
                payload
            );

            return response.data.data as Manutencao;
        },
        onSuccess:async manutencao=>{
            await onSaved(manutencao);
        },
    });

    function submit(event:FormEvent<HTMLFormElement>){
        event.preventDefault();
        saveMutation.mutate();
    }

    const loadingLookups=
        veiculosQuery.isLoading ||
        motoristasQuery.isLoading ||
        fornecedoresQuery.isLoading;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            {editing ? 'Editar manutenção' : 'Nova manutenção'}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {editing
                                ? editing.numero_ordem
                                : 'Registe uma nova ordem de manutenção.'
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

                <form onSubmit={submit} className="p-6 space-y-6">
                    {saveMutation.isError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                            <p className="text-sm text-red-700">
                                {apiError(saveMutation.error)}
                            </p>
                        </div>
                    )}

                    {loadingLookups && (
                        <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3 text-sm text-slate-500">
                            <LoaderCircle className="w-4 h-4 animate-spin"/>
                            A carregar dados auxiliares...
                        </div>
                    )}

                    <section>
                        <h3 className="font-semibold text-slate-900">
                            Identificação
                        </h3>

                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                            <Field label="Veículo *">
                                <select
                                    required
                                    value={form.veiculo_id}
                                    onChange={event=>
                                        update('veiculo_id',event.target.value)
                                    }
                                    className={inputClass}
                                >
                                    <option value="">
                                        Selecione...
                                    </option>

                                    {(veiculosQuery.data ?? []).map(veiculo=>(
                                        <option
                                            key={veiculo.id}
                                            value={veiculo.id}
                                        >
                                            {veiculo.matricula} · {veiculo.marca} {veiculo.modelo}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Motorista">
                                <select
                                    value={form.motorista_id}
                                    onChange={event=>
                                        update('motorista_id',event.target.value)
                                    }
                                    className={inputClass}
                                >
                                    <option value="">
                                        Sem motorista
                                    </option>

                                    {(motoristasQuery.data ?? []).map(motorista=>(
                                        <option
                                            key={motorista.id}
                                            value={motorista.id}
                                        >
                                            {motorista.nome_completo}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Fornecedor / oficina">
                                <select
                                    value={form.fornecedor_id}
                                    onChange={event=>
                                        update('fornecedor_id',event.target.value)
                                    }
                                    className={inputClass}
                                >
                                    <option value="">
                                        Sem fornecedor
                                    </option>

                                    {(fornecedoresQuery.data ?? []).map(fornecedor=>(
                                        <option
                                            key={fornecedor.id}
                                            value={fornecedor.id}
                                        >
                                            {fornecedor.nome}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Origem *">
                                <select
                                    required
                                    disabled={Boolean(editing)}
                                    value={form.origem}
                                    onChange={event=>
                                        update(
                                            'origem',
                                            event.target.value as ManutencaoOrigem
                                        )
                                    }
                                    className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                                >
                                    <option value="manual">
                                        Manual
                                    </option>

                                    <option value="avaria">
                                        Avaria
                                    </option>

                                    <option value="preventiva">
                                        Preventiva
                                    </option>

                                    <option value="checklist" disabled={!editing}>
                                        Checklist
                                    </option>

                                    <option value="sinistro" disabled={!editing}>
                                        Sinistro
                                    </option>

                                    <option value="diagnostico" disabled={!editing}>
                                        Diagnóstico
                                    </option>
                                </select>
                            </Field>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-semibold text-slate-900">
                            Serviço
                        </h3>

                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                            <Field label="Tipo de serviço *">
                                <input
                                    required
                                    maxLength={150}
                                    value={form.tipo_servico}
                                    onChange={event=>
                                        update('tipo_servico',event.target.value)
                                    }
                                    className={inputClass}
                                    placeholder="Ex.: Revisão geral"
                                />
                            </Field>

                            <Field label="Prioridade *">
                                <select
                                    required
                                    value={form.prioridade}
                                    onChange={event=>
                                        update(
                                            'prioridade',
                                            event.target.value as ManutencaoPrioridade
                                        )
                                    }
                                    className={inputClass}
                                >
                                    <option value="baixa">
                                        Baixa
                                    </option>

                                    <option value="normal">
                                        Normal
                                    </option>

                                    <option value="alta">
                                        Alta
                                    </option>

                                    <option value="critica">
                                        Crítica
                                    </option>
                                </select>
                            </Field>

                            <div className="md:col-span-2">
                                <Field label="Problema reportado">
                                    <textarea
                                        value={form.problema_reportado}
                                        onChange={event=>
                                            update(
                                                'problema_reportado',
                                                event.target.value
                                            )
                                        }
                                        maxLength={10000}
                                        rows={4}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    />
                                </Field>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-semibold text-slate-900">
                            Datas e quilometragem
                        </h3>

                        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Field label="Data da solicitação">
                                <input
                                    type="date"
                                    value={form.data_solicitacao}
                                    onChange={event=>
                                        update(
                                            'data_solicitacao',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Data agendada">
                                <input
                                    type="date"
                                    value={form.data_agendada}
                                    onChange={event=>
                                        update(
                                            'data_agendada',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Quilometragem">
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.km}
                                    onChange={event=>
                                        update('km',event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Próxima revisão (km)">
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.proxima_revisao_km}
                                    onChange={event=>
                                        update(
                                            'proxima_revisao_km',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Próxima revisão (data)">
                                <input
                                    type="date"
                                    value={form.proxima_revisao_data}
                                    onChange={event=>
                                        update(
                                            'proxima_revisao_data',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-semibold text-slate-900">
                            Orçamento e operação
                        </h3>

                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                            <Field label="Valor do orçamento">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.valor_orcamento}
                                    onChange={event=>
                                        update(
                                            'valor_orcamento',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                    placeholder="0,00"
                                />
                            </Field>

                            <div className="space-y-4 pt-6">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.aprovacao_obrigatoria}
                                        onChange={event=>
                                            update(
                                                'aprovacao_obrigatoria',
                                                event.target.checked
                                            )
                                        }
                                        className="mt-1 w-4 h-4 rounded border-slate-300"
                                    />

                                    <span>
                                        <span className="block text-sm font-medium text-slate-800">
                                            Aprovação obrigatória
                                        </span>

                                        <span className="block text-xs text-slate-500">
                                            A ordem deverá ser aprovada antes de avançar.
                                        </span>
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.indisponibiliza_veiculo}
                                        onChange={event=>
                                            update(
                                                'indisponibiliza_veiculo',
                                                event.target.checked
                                            )
                                        }
                                        className="mt-1 w-4 h-4 rounded border-slate-300"
                                    />

                                    <span>
                                        <span className="block text-sm font-medium text-slate-800">
                                            Indisponibilizar veículo
                                        </span>

                                        <span className="block text-xs text-slate-500">
                                            O veículo ficará indisponível quando a manutenção iniciar.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </section>

                    <Field label="Observações">
                        <textarea
                            value={form.observacoes}
                            onChange={event=>
                                update('observacoes',event.target.value)
                            }
                            maxLength={20000}
                            rows={4}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </Field>

                    <div className="sticky bottom-0 -mx-6 -mb-6 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                saveMutation.isPending ||
                                !form.veiculo_id ||
                                !form.tipo_servico.trim()
                            }
                            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {saveMutation.isPending && (
                                <LoaderCircle className="w-4 h-4 animate-spin"/>
                            )}

                            {editing
                                ? 'Guardar alterações'
                                : 'Criar manutenção'
                            }
                        </button>
                    </div>
                </form>
            </div>
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
