import axios from "axios";
import {
    ArrowLeft,
    CheckCircle2,
    LoaderCircle,
    Mail,
    ShieldCheck,
    Truck,
} from "lucide-react";
import {
    FormEvent,
    useState,
} from "react";
import {
    Link,
} from "react-router-dom";

import api from "../lib/api";

export default function ForgotPasswordPage() {
    const [email,setEmail]=
        useState("");

    const [submitting,setSubmitting]=
        useState(false);

    const [message,setMessage]=
        useState("");

    const [error,setError]=
        useState("");

    async function handleSubmit(
        event:FormEvent
    ){
        event.preventDefault();

        setError("");
        setMessage("");
        setSubmitting(true);

        try{
            const response=
                await api.post(
                    "/api/password/forgot",
                    {
                        email,
                    },
                );

            setMessage(
                response.data.message ??
                "Se existir uma conta associada a este e-mail, receberá as instruções para recuperar a palavra-passe.",
            );
        }catch(exception){
            if(
                axios.isAxiosError(
                    exception
                )
            ){
                const validation=
                    exception
                        .response
                        ?.data
                        ?.errors
                        ?.email?.[0];

                setError(
                    validation ??
                    exception
                        .response
                        ?.data
                        ?.message ??
                    "Não foi possível processar o pedido.",
                );
            }else{
                setError(
                    "Não foi possível processar o pedido.",
                );
            }
        }finally{
            setSubmitting(false);
        }
    }

    return(
        <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-2">
            <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-14 lg:flex lg:flex-col lg:justify-between">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"/>

                <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl"/>

                <div className="relative">
                    <div className="inline-flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-950">
                            <Truck className="h-6 w-6 text-white"/>
                        </div>

                        <div>
                            <div className="text-2xl font-bold tracking-tight text-white">
                                FrotaPRO
                            </div>

                            <div className="text-xs uppercase tracking-[0.22em] text-indigo-300">
                                Gestão TVDE
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative max-w-xl">
                    <p className="mb-4 text-sm font-medium text-indigo-300">
                        Recuperação segura de acesso
                    </p>

                    <h1 className="text-5xl font-semibold leading-tight tracking-tight text-white">
                        Recupere o acesso
                        <br/>
                        à sua conta.
                    </h1>

                    <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
                        Enviaremos um link temporário para o e-mail associado à sua conta FrotaPRO.
                    </p>

                    <div className="mt-10 space-y-4">
                        <div className="flex items-center gap-3 text-slate-300">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400"/>
                            Link de utilização única
                        </div>

                        <div className="flex items-center gap-3 text-slate-300">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400"/>
                            Validade limitada a 60 minutos
                        </div>
                    </div>
                </div>

                <div className="relative flex items-center gap-2 text-sm text-slate-500">
                    <ShieldCheck className="h-4 w-4"/>
                    O sistema não revela se um e-mail possui conta.
                </div>
            </section>

            <section className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="mb-12 flex items-center gap-3 lg:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
                            <Truck className="h-5 w-5 text-white"/>
                        </div>

                        <span className="text-2xl font-bold text-slate-950">
                            FrotaPRO
                        </span>
                    </div>

                    <Link
                        to="/login"
                        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
                    >
                        <ArrowLeft className="h-4 w-4"/>
                        Voltar ao login
                    </Link>

                    <div className="mb-9">
                        <p className="mb-2 text-sm font-medium text-indigo-600">
                            Recuperar acesso
                        </p>

                        <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                            Esqueceu a palavra-passe?
                        </h2>

                        <p className="mt-2 text-slate-500">
                            Introduza o seu e-mail para receber as instruções de recuperação.
                        </p>
                    </div>

                    {message ?(
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"/>

                                    <div>
                                        <div className="font-semibold text-emerald-900">
                                            Pedido recebido
                                        </div>

                                        <p className="mt-1 text-sm leading-relaxed text-emerald-700">
                                            {message}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={()=>{
                                    setMessage("");
                                    setEmail("");
                                }}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Enviar para outro e-mail
                            </button>

                            <Link
                                to="/login"
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
                            >
                                Voltar ao login
                            </Link>
                        </div>
                    ):(
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    E-mail
                                </label>

                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/>

                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={event=>
                                            setEmail(
                                                event.target.value
                                            )
                                        }
                                        placeholder="nome@empresa.pt"
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    />
                                </div>
                            </div>

                            {error&&(
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {submitting?(
                                    <>
                                        <LoaderCircle className="h-5 w-5 animate-spin"/>
                                        A enviar...
                                    </>
                                ):(
                                    "Enviar instruções"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}