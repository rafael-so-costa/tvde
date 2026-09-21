import axios from 'axios';
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    ExternalLink,
    LoaderCircle,
    Pencil,
    Play,
    RefreshCw,
    Search,
    Square,
    Timer,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import {useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import api from '../lib/api';
import {useTenant} from '../contexts/TenantContext';
import type {
    ExpedienteEstado,
    ExpedienteEstatistica,
    RegistoExpediente,
} from '../types/expediente';

interface Props {
    mode:'management'|'motorista';
}

type EstadoFilter='todos'|'em_servico'|'fora';

function apiError(error:unknown):string{
    if(axios.isAxiosError(error)){
        const errors=error.response?.data?.errors;

        if(errors){
            const first=Object.values(errors)[0];

            if(Array.isArray(first) && first.length){
                return String(first[0]);
            }
        }

        return error.response?.data?.message ?? 'Não foi possível concluir a operação.';
    }

    return 'Não foi possível concluir a operação.';
}

function lisboaDate(date=new Date()):string{
    return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Europe/Lisbon',
        year:'numeric',
        month:'2-digit',
        day:'2-digit',
    }).format(date);
}

function daysAgo(days:number):string{
    const date=new Date();
    date.setDate(date.getDate()-days);
    return lisboaDate(date);
}

function formatDate(value:string):string{
    return new Intl.DateTimeFormat('pt-PT',{
        timeZone:'Europe/Lisbon',
        weekday:'short',
        day:'2-digit',
        month:'2-digit',
        year:'numeric',
    }).format(new Date(`${value.slice(0,10)}T12:00:00`));
}

function formatDateTime(value:string|null):string{
    if(!value){
        return '—';
    }

    return new Intl.DateTimeFormat('pt-PT',{
        timeZone:'Europe/Lisbon',
        day:'2-digit',
        month:'2-digit',
        year:'numeric',
        hour:'2-digit',
        minute:'2-digit',
    }).format(new Date(value));
}

function formatTime(value:string):string{
    return new Intl.DateTimeFormat('pt-PT',{
        timeZone:'Europe/Lisbon',
        hour:'2-digit',
        minute:'2-digit',
    }).format(new Date(value));
}

function formatDuration(seconds:number):string{
    const value=Math.max(0,Math.round(Number(seconds)||0));
    const hours=Math.floor(value/3600);
    const minutes=Math.floor((value%3600)/60);

    if(hours===0){
        return `${minutes} min`;
    }

    return `${hours}h ${String(minutes).padStart(2,'0')}min`;
}

function toInputDateTime(value:string):string{
    const parts=new Intl.DateTimeFormat('en-GB',{
        timeZone:'Europe/Lisbon',
        year:'numeric',
        month:'2-digit',
        day:'2-digit',
        hour:'2-digit',
        minute:'2-digit',
        hourCycle:'h23',
    }).formatToParts(new Date(value));

    const get=(type:string)=>parts.find(part=>part.type===type)?.value ?? '';

    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function secondsForRecords(records:RegistoExpediente[]):number{
    let total=0;
    let entrada:Date|null=null;

    [...records]
        .sort((a,b)=>new Date(a.data_hora).getTime()-new Date(b.data_hora).getTime())
        .forEach(record=>{
            if(record.tipo==='entrada'){
                entrada=new Date(record.data_hora);
                return;
            }

            if(record.tipo==='saida' && entrada){
                total+=Math.max(
                    0,
                    (new Date(record.data_hora).getTime()-entrada.getTime())/1000
                );

                entrada=null;
            }
        });

    return Math.round(total);
}

function secondsPerDay(records:RegistoExpediente[]):Map<string,number>{
    const groups=new Map<string,Map<string,RegistoExpediente[]>>();

    records.forEach(record=>{
        if(!groups.has(record.data_local)){
            groups.set(record.data_local,new Map());
        }

        const motorists=groups.get(record.data_local)!;

        if(!motorists.has(record.motorista_id)){
            motorists.set(record.motorista_id,[]);
        }

        motorists.get(record.motorista_id)!.push(record);
    });

    const result=new Map<string,number>();

    groups.forEach((motorists,day)=>{
        let total=0;

        motorists.forEach(items=>{
            total+=secondsForRecords(items);
        });

        result.set(day,total);
    });

    return result;
}

export default function ExpedientePage({mode}:Props){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const motoristaMode=mode==='motorista';

    const [dataInicio,setDataInicio]=useState(daysAgo(motoristaMode?44:29));
    const [dataFim,setDataFim]=useState(lisboaDate());
    const [search,setSearch]=useState('');
    const [estadoFilter,setEstadoFilter]=useState<EstadoFilter>('todos');
    const [editing,setEditing]=useState<RegistoExpediente|null>(null);
    const [correctionDate,setCorrectionDate]=useState('');
    const [correctionReason,setCorrectionReason]=useState('');
    const [message,setMessage]=useState<string|null>(null);
    const [error,setError]=useState<string|null>(null);

    const recordsQuery=useQuery({
        queryKey:['expediente-records',tenant?.id,dataInicio,dataFim,mode],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const params=new URLSearchParams({
                data_inicio:dataInicio,
                data_fim:dataFim,
            });

            const response=await api.get(`/api/expediente?${params.toString()}`);

            return response.data.data as RegistoExpediente[];
        },
    });

    const stateQuery=useQuery({
        queryKey:['expediente-state',tenant?.id],
        enabled:Boolean(tenant?.id && motoristaMode),
        queryFn:async()=>{
            const response=await api.get('/api/expediente/estado');
            return response.data.data as ExpedienteEstado;
        },
    });

    const statisticsQuery=useQuery({
        queryKey:['expediente-statistics',tenant?.id,dataInicio,dataFim],
        enabled:Boolean(tenant?.id && !motoristaMode),
        queryFn:async()=>{
            const params=new URLSearchParams({
                data_inicio:dataInicio,
                data_fim:dataFim,
            });

            const response=await api.get(
                `/api/expediente-estatisticas?${params.toString()}`
            );

            return response.data.data as ExpedienteEstatistica[];
        },
    });

    async function refresh(){
        setMessage(null);
        setError(null);

        await Promise.all([
            queryClient.invalidateQueries({
                queryKey:['expediente-records',tenant?.id],
            }),
            queryClient.invalidateQueries({
                queryKey:['expediente-state',tenant?.id],
            }),
            queryClient.invalidateQueries({
                queryKey:['expediente-statistics',tenant?.id],
            }),
        ]);
    }

    const markMutation=useMutation({
        mutationFn:async()=>{
            const response=await api.post('/api/expediente/marcar');
            return response.data;
        },
        onSuccess:async response=>{
            setError(null);
            setMessage(response.message);
            await refresh();
        },
        onError:exception=>{
            setMessage(null);
            setError(apiError(exception));
        },
    });

    const correctionMutation=useMutation({
        mutationFn:async()=>{
            if(!editing || !correctionDate){
                return;
            }

            const iso=new Date(correctionDate).toISOString();

            await api.patch(`/api/expediente/${editing.id}`,{
                data_hora:iso,
                observacoes_correcao:correctionReason.trim() || null,
            });
        },
        onSuccess:async()=>{
            setEditing(null);
            setCorrectionDate('');
            setCorrectionReason('');
            setError(null);
            setMessage('Registo corrigido com sucesso.');
            await refresh();
        },
        onError:exception=>{
            setError(apiError(exception));
        },
    });

    function openCorrection(record:RegistoExpediente){
        setEditing(record);
        setCorrectionDate(toInputDateTime(record.data_hora));
        setCorrectionReason(record.observacoes_correcao ?? '');
        setError(null);
    }

    const records=recordsQuery.data ?? [];
    const statistics=statisticsQuery.data ?? [];

    const driverDays=useMemo(()=>{
        const grouped=new Map<string,RegistoExpediente[]>();

        records.forEach(record=>{
            const list=grouped.get(record.data_local) ?? [];
            list.push(record);
            grouped.set(record.data_local,list);
        });

        return Array.from(grouped.entries())
            .sort((a,b)=>b[0].localeCompare(a[0]))
            .map(([day,items])=>({
                day,
                items:[...items].sort(
                    (a,b)=>new Date(a.data_hora).getTime()-new Date(b.data_hora).getTime()
                ),
                seconds:secondsForRecords(items),
            }));
    },[records]);

    const filteredStatistics=useMemo(()=>{
        const term=search.trim().toLocaleLowerCase('pt-PT');

        return statistics.filter(item=>{
            if(estadoFilter==='em_servico' && !item.em_servico){
                return false;
            }

            if(estadoFilter==='fora' && item.em_servico){
                return false;
            }

            if(!term){
                return true;
            }

            return [item.nome_completo,item.nif]
                .filter(Boolean)
                .some(value=>
                    String(value)
                        .toLocaleLowerCase('pt-PT')
                        .includes(term)
                );
        });
    },[statistics,search,estadoFilter]);

    const filteredRecords=useMemo(()=>{
        const term=search.trim().toLocaleLowerCase('pt-PT');

        if(!term){
            return records;
        }

        return records.filter(record=>
            [
                record.motorista?.nome_completo,
                record.motorista?.nif,
            ]
                .filter(Boolean)
                .some(value=>
                    String(value)
                        .toLocaleLowerCase('pt-PT')
                        .includes(term)
                )
        );
    },[records,search]);

    const totalSeconds=statistics.reduce(
        (total,item)=>total+Number(item.segundos_trabalhados || 0),
        0
    );

    const activeNow=statistics.filter(item=>item.em_servico).length;

    const mostHours=[...statistics]
        .sort((a,b)=>b.segundos_trabalhados-a.segundos_trabalhados)[0];

    const mostDays=[...statistics]
        .sort((a,b)=>b.dias_online-a.dias_online)[0];

    const chart=useMemo(()=>{
        const map=secondsPerDay(records);

        return Array.from(map.entries())
            .sort((a,b)=>a[0].localeCompare(b[0]))
            .map(([day,seconds])=>({
                day,
                seconds,
                hours:seconds/3600,
            }));
    },[records]);

    const maxChart=Math.max(1,...chart.map(item=>item.hours));

    if(!tenant){
        return (
            <div className="max-w-7xl mx-auto">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0"/>

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Selecione uma organização antes de consultar o expediente.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if(motoristaMode){
        const state=stateQuery.data;

        return (
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <p className="text-sm font-medium text-indigo-600 mb-2">
                            Jornada de trabalho
                        </p>

                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Registo de Expediente
                        </h1>

                        <p className="mt-2 text-slate-500">
                            Registe o início e o fim da sua jornada e consulte o histórico.
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={recordsQuery.isFetching || stateQuery.isFetching}
                        onClick={refresh}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                'w-4 h-4',
                                recordsQuery.isFetching || stateQuery.isFetching
                                    ? 'animate-spin'
                                    : '',
                            ].join(' ')}
                        />
                        Atualizar
                    </button>
                </div>

                {message && (
                    <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 text-sm text-emerald-800">
                        <CheckCircle2 className="w-5 h-5 shrink-0"/>
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-700">
                        <AlertCircle className="w-5 h-5 shrink-0"/>
                        {error}
                    </div>
                )}

                <div className="rounded-2xl bg-slate-950 text-white p-6 sm:p-8 mb-6">
                    {stateQuery.isLoading ? (
                        <div className="py-8 flex justify-center">
                            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-400"/>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div>
                                <p className="text-sm text-slate-400">
                                    Situação atual
                                </p>

                                <div className="mt-3 flex items-center gap-3">
                                    <span
                                        className={[
                                            'w-3 h-3 rounded-full',
                                            state?.em_servico
                                                ? 'bg-emerald-400'
                                                : 'bg-slate-500',
                                        ].join(' ')}
                                    />

                                    <h2 className="text-2xl font-bold">
                                        {state?.em_servico
                                            ? 'Em serviço'
                                            : 'Fora de serviço'
                                        }
                                    </h2>
                                </div>

                                <p className="mt-3 text-sm text-slate-400">
                                    {state?.em_servico && state.desde
                                        ? `Desde ${formatDateTime(state.desde)}`
                                        : state?.registos_hoje
                                            ? `${state.registos_hoje} registo(s) efetuado(s) hoje`
                                            : 'Ainda não existem registos hoje.'
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={markMutation.isPending}
                                onClick={()=>markMutation.mutate()}
                                className={[
                                    'h-14 px-7 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition disabled:opacity-50',
                                    state?.em_servico
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-emerald-500 hover:bg-emerald-600',
                                ].join(' ')}
                            >
                                {markMutation.isPending ? (
                                    <LoaderCircle className="w-5 h-5 animate-spin"/>
                                ) : state?.em_servico ? (
                                    <Square className="w-5 h-5"/>
                                ) : (
                                    <Play className="w-5 h-5"/>
                                )}

                                {state?.em_servico
                                    ? 'Terminar expediente'
                                    : 'Iniciar expediente'
                                }
                            </button>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-indigo-950">
                                Registo público
                            </h3>

                            <p className="mt-1 text-sm text-indigo-700">
                                Também pode marcar entrada ou saída utilizando o NIF na página pública.
                            </p>
                        </div>

                        <a
                            href={`/registo-expediente-publico?tenant=${tenant.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4"/>
                            Abrir
                        </a>
                    </div>
                </div>

                <div className="flex items-end gap-3 mb-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Desde
                        </label>

                        <input
                            type="date"
                            value={dataInicio}
                            onChange={event=>setDataInicio(event.target.value)}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Até
                        </label>

                        <input
                            type="date"
                            value={dataFim}
                            onChange={event=>setDataFim(event.target.value)}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {recordsQuery.isLoading ? (
                        <div className="py-16 flex justify-center">
                            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
                        </div>
                    ) : driverDays.length===0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                            <Clock3 className="w-10 h-10 mx-auto text-slate-300"/>

                            <p className="mt-3 font-semibold text-slate-700">
                                Sem registos no período
                            </p>
                        </div>
                    ) : driverDays.map(day=>(
                        <div
                            key={day.day}
                            className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                        >
                            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <div className="font-semibold text-slate-900">
                                        {formatDate(day.day)}
                                    </div>

                                    <div className="mt-1 text-xs text-slate-500">
                                        {day.items.length} registo(s)
                                    </div>
                                </div>

                                <span className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold">
                                    {formatDuration(day.seconds)}
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {day.items.map(record=>(
                                    <div
                                        key={record.id}
                                        className="px-5 py-4 flex items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={[
                                                    'w-9 h-9 rounded-xl flex items-center justify-center',
                                                    record.tipo==='entrada'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-red-50 text-red-600',
                                                ].join(' ')}
                                            >
                                                {record.tipo==='entrada'
                                                    ? <Play className="w-4 h-4"/>
                                                    : <Square className="w-4 h-4"/>
                                                }
                                            </div>

                                            <div>
                                                <div className="font-medium text-slate-900">
                                                    {record.tipo==='entrada'
                                                        ? 'Início'
                                                        : 'Fim'
                                                    } · {formatTime(record.data_hora)}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-500">
                                                    {record.origem==='publico'
                                                        ? 'Página pública'
                                                        : 'Aplicação'
                                                    }

                                                    {record.corrigido && ' · Corrigido'}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={()=>openCorrection(record)}
                                            className="w-9 h-9 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center"
                                            title="Corrigir"
                                        >
                                            <Pencil className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {renderCorrectionModal()}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        Operação
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Expediente
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Acompanhe jornadas, horas trabalhadas e motoristas em serviço.
                    </p>
                </div>

                <div className="flex gap-3">
                    <a
                        href={`/registo-expediente-publico?tenant=${tenant.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2"
                    >
                        <ExternalLink className="w-4 h-4"/>
                        Registo público
                    </a>

                    <button
                        type="button"
                        disabled={recordsQuery.isFetching || statisticsQuery.isFetching}
                        onClick={refresh}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                'w-4 h-4',
                                recordsQuery.isFetching || statisticsQuery.isFetching
                                    ? 'animate-spin'
                                    : '',
                            ].join(' ')}
                        />
                        Atualizar
                    </button>
                </div>
            </div>

            {message && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 text-sm text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 shrink-0"/>
                    {message}
                </div>
            )}

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-700">
                    <AlertCircle className="w-5 h-5 shrink-0"/>
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    icon={Timer}
                    label="Total de horas"
                    value={formatDuration(totalSeconds)}
                />

                <Stat
                    icon={Users}
                    label="Em serviço agora"
                    value={String(activeNow)}
                />

                <Stat
                    icon={Trophy}
                    label="Mais horas"
                    value={mostHours?.nome_completo ?? '—'}
                    detail={mostHours ? formatDuration(mostHours.segundos_trabalhados) : undefined}
                />

                <Stat
                    icon={CalendarDays}
                    label="Mais dias"
                    value={mostDays?.nome_completo ?? '—'}
                    detail={mostDays ? `${mostDays.dias_online} dia(s)` : undefined}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
                <div className="grid lg:grid-cols-[160px_160px_1fr_auto] gap-3 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                            De
                        </label>

                        <input
                            type="date"
                            value={dataInicio}
                            onChange={event=>setDataInicio(event.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Até
                        </label>

                        <input
                            type="date"
                            value={dataFim}
                            onChange={event=>setDataFim(event.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        />
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3.5 bottom-3.5 w-4 h-4 text-slate-400"/>

                        <input
                            value={search}
                            onChange={event=>setSearch(event.target.value)}
                            placeholder="Pesquisar motorista ou NIF..."
                            className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm"
                        />
                    </div>

                    <select
                        value={estadoFilter}
                        onChange={event=>setEstadoFilter(event.target.value as EstadoFilter)}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                        <option value="todos">Todos</option>
                        <option value="em_servico">Em serviço</option>
                        <option value="fora">Fora de serviço</option>
                    </select>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
                <h2 className="font-semibold text-slate-900">
                    Horas por dia
                </h2>

                {chart.length===0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                        Sem dados para o período selecionado.
                    </p>
                ) : (
                    <div className="mt-6 flex items-end gap-2 h-48 overflow-x-auto">
                        {chart.map(item=>(
                            <div
                                key={item.day}
                                className="min-w-10 flex-1 h-full flex flex-col justify-end items-center gap-2"
                            >
                                <span className="text-[10px] text-slate-500">
                                    {item.hours.toFixed(1)}h
                                </span>

                                <div
                                    className="w-full max-w-10 rounded-t-lg bg-indigo-500 min-h-1"
                                    style={{
                                        height:`${Math.max(3,(item.hours/maxChart)*130)}px`,
                                    }}
                                />

                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                    {item.day.slice(5).split('-').reverse().join('/')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-slate-200">
                    <h2 className="font-semibold text-slate-900">
                        Resumo por motorista
                    </h2>
                </div>

                {statisticsQuery.isLoading ? (
                    <div className="py-16 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <Th>Motorista</Th>
                                    <Th>Dias</Th>
                                    <Th>Total</Th>
                                    <Th>Média</Th>
                                    <Th>Último registo</Th>
                                    <Th>Estado</Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredStatistics.map(item=>(
                                    <tr key={item.motorista_id}>
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-slate-900">
                                                {item.nome_completo}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {item.nif ?? 'Sem NIF'}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {item.dias_online}
                                        </td>

                                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                                            {formatDuration(item.segundos_trabalhados)}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {formatDuration(item.media_diaria_segundos)}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                                            {formatDateTime(item.ultimo_registo)}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    'inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold',
                                                    item.em_servico
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600',
                                                ].join(' ')}
                                            >
                                                {item.em_servico
                                                    ? 'Em serviço'
                                                    : 'Fora'
                                                }
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {filteredStatistics.length===0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-12 text-center text-sm text-slate-500"
                                        >
                                            Nenhum motorista encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                    <h2 className="font-semibold text-slate-900">
                        Registos do período
                    </h2>
                </div>

                {recordsQuery.isLoading ? (
                    <div className="py-16 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <Th>Motorista</Th>
                                    <Th>Data</Th>
                                    <Th>Tipo</Th>
                                    <Th>Origem</Th>
                                    <Th>Correção</Th>
                                    <Th>Ações</Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredRecords.map(record=>(
                                    <tr key={record.id}>
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-slate-900">
                                                {record.motorista?.nome_completo ?? '—'}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {record.motorista?.nif ?? ''}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                                            {formatDateTime(record.data_hora)}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    'inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold',
                                                    record.tipo==='entrada'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-red-50 text-red-700',
                                                ].join(' ')}
                                            >
                                                {record.tipo==='entrada' ? 'Entrada' : 'Saída'}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {record.origem==='publico'
                                                ? 'Público'
                                                : 'App'
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {record.corrigido
                                                ? 'Corrigido'
                                                : 'Original'
                                            }
                                        </td>

                                        <td className="px-5 py-4">
                                            <button
                                                type="button"
                                                title="Corrigir"
                                                onClick={()=>openCorrection(record)}
                                                className="w-9 h-9 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 flex items-center justify-center"
                                            >
                                                <Pencil className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {filteredRecords.length===0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-12 text-center text-sm text-slate-500"
                                        >
                                            Nenhum registo encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {renderCorrectionModal()}
        </div>
    );

    function renderCorrectionModal(){
        if(!editing){
            return null;
        }

        return (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                    <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Corrigir registo
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                {editing.tipo==='entrada' ? 'Entrada' : 'Saída'} · {formatDateTime(editing.data_hora)}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={()=>setEditing(null)}
                            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                        >
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nova data e hora
                            </label>

                            <input
                                type="datetime-local"
                                value={correctionDate}
                                onChange={event=>setCorrectionDate(event.target.value)}
                                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Motivo
                            </label>

                            <textarea
                                rows={3}
                                value={correctionReason}
                                onChange={event=>setCorrectionReason(event.target.value)}
                                placeholder="Ex.: esqueci-me de marcar a saída."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={()=>setEditing(null)}
                            className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            disabled={!correctionDate || correctionMutation.isPending}
                            onClick={()=>correctionMutation.mutate()}
                            className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {correctionMutation.isPending && (
                                <LoaderCircle className="w-4 h-4 animate-spin"/>
                            )}

                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

function Stat({
    icon:Icon,
    label,
    value,
    detail,
}:{
    icon:typeof Clock3;
    label:string;
    value:string;
    detail?:string;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-950 truncate">
                        {value}
                    </p>

                    {detail && (
                        <p className="mt-1 text-xs text-slate-500">
                            {detail}
                        </p>
                    )}
                </div>

                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5"/>
                </div>
            </div>
        </div>
    );
}

function Th({children}:{children:string}){
    return (
        <th className="px-5 py-3 text-xs uppercase tracking-wide font-semibold text-slate-500">
            {children}
        </th>
    );
}
