import axios from 'axios';
import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    Play,
    Square,
    Truck,
} from 'lucide-react';
import {FormEvent,useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import api from '../lib/api';
import PublicSiteFooter from '../components/public/PublicSiteFooter';
import PublicSiteHeader from '../components/public/PublicSiteHeader';
import type {RegistoExpediente} from '../types/expediente';

const NIF_KEY='frotapro_expediente_nif';

function apiError(error:unknown):string{
    if(axios.isAxiosError(error)){
        const errors=error.response?.data?.errors;

        if(errors){
            const first=Object.values(errors)[0];

            if(Array.isArray(first) && first.length){
                return String(first[0]);
            }
        }

        return error.response?.data?.message ?? 'Não foi possível efetuar o registo.';
    }

    return 'Não foi possível efetuar o registo.';
}

function dateTime(value:string):string{
    return new Intl.DateTimeFormat('pt-PT',{
        timeZone:'Europe/Lisbon',
        day:'2-digit',
        month:'2-digit',
        year:'numeric',
        hour:'2-digit',
        minute:'2-digit',
    }).format(new Date(value));
}

export default function ExpedientePublicPage(){
    const [params]=useSearchParams();
    const tenantId=params.get('tenant');

    const [nif,setNif]=useState('');
    const [loading,setLoading]=useState(false);
    const [error,setError]=useState<string|null>(null);
    const [last,setLast]=useState<RegistoExpediente|null>(null);

    useEffect(()=>{
        const stored=localStorage.getItem(NIF_KEY);

        if(stored){
            setNif(stored);
        }
    },[]);

    async function submit(event:FormEvent){
        event.preventDefault();

        const clean=nif.replace(/\D/g,'');

        if(clean.length!==9){
            setError('Introduza os 9 dígitos do NIF.');
            return;
        }

        setLoading(true);
        setError(null);
        setLast(null);

        try{
            const response=await api.post('/api/expediente/publico/marcar',{
                nif:clean,
                tenant_id:tenantId || null,
            });

            localStorage.setItem(NIF_KEY,clean);
            setNif(clean);
            setLast(response.data.data);
        }catch(exception){
            setError(apiError(exception));
        }finally{
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-950">
            <PublicSiteHeader active="expediente"/>

            <main className="flex flex-1 items-center justify-center p-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-950">
                        <Truck className="w-7 h-7 text-white"/>
                    </div>

                    <h1 className="mt-4 text-2xl font-bold text-white">
                        FrotaPRO
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                        Registo de Expediente
                    </p>
                </div>

                <div className="rounded-3xl bg-white shadow-2xl p-6 sm:p-8">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                            <Clock3 className="w-6 h-6"/>
                        </div>

                        <h2 className="mt-4 text-xl font-bold text-slate-950">
                            Entrada / Saída
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Introduza o seu NIF para marcar automaticamente o início ou o fim do expediente.
                        </p>
                    </div>

                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <div>
                            <label
                                htmlFor="nif"
                                className="block text-sm font-medium text-slate-700 mb-1"
                            >
                                NIF
                            </label>

                            <input
                                id="nif"
                                inputMode="numeric"
                                autoComplete="off"
                                value={nif}
                                onChange={event=>setNif(event.target.value)}
                                maxLength={9}
                                placeholder="000000000"
                                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-lg tracking-wider outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-2 text-sm text-red-700">
                                <AlertCircle className="w-5 h-5 shrink-0"/>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading && (
                                <LoaderCircle className="w-5 h-5 animate-spin"/>
                            )}

                            Registar
                        </button>
                    </form>

                    {last && (
                        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                                <CheckCircle2 className="w-5 h-5"/>
                                Registo efetuado
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                <div
                                    className={[
                                        'w-10 h-10 rounded-xl flex items-center justify-center',
                                        last.tipo==='entrada'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-red-500 text-white',
                                    ].join(' ')}
                                >
                                    {last.tipo==='entrada'
                                        ? <Play className="w-5 h-5"/>
                                        : <Square className="w-5 h-5"/>
                                    }
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-900">
                                        {last.tipo==='entrada'
                                            ? 'Início do expediente'
                                            : 'Fim do expediente'
                                        }
                                    </p>

                                    <p className="text-sm text-slate-500">
                                        {dateTime(last.data_hora)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-5 text-center text-xs text-slate-500">
                    Os registos são associados à empresa e ao motorista identificado pelo NIF.
                </p>
            </div>
            </main>

            <PublicSiteFooter/>
        </div>
    );
}
