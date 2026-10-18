import axios from "axios";
import {
    ArrowLeft,
    CheckCircle2,
    LoaderCircle,
    LockKeyhole,
    ShieldCheck,
    Truck,
} from "lucide-react";
import {
    FormEvent,
    useMemo,
    useState,
} from "react";
import {
    Link,
    useSearchParams,
} from "react-router-dom";

import api from "../lib/api";

export default function ResetPasswordPage() {
    const [searchParams]=
        useSearchParams();

    const token=
        searchParams.get(
            "token"
        ) ?? "";

    const email=
        searchParams.get(
            "email"
        ) ?? "";

    const validLink=
        useMemo(
            ()=>Boolean(
                token&&email
            ),
            [
                token,
                email,
            ],
        );

    const [password,setPassword]=
        useState("");

    const [
        passwordConfirmation,
        setPasswordConfirmation,
    ]=
        useState("");

    const [submitting,setSubmitting]=
        useState(false);

    const [success,setSuccess]=
        useState(false);

    const [error,setError]=
        useState("");

    async function handleSubmit(
        event:FormEvent
    ){
        event.preventDefault();

        setError("");

        if(
            password!==
            passwordConfirmation
        ){
            setError(
                "As palavras-passe não coincidem.",
            );

            return;
        }

        setSubmitting(true);

        try{
            await api.post(
                "/api/password/reset",
                {
                    email,
                    token,
                    password,
                    password_confirmation:
                        passwordConfirmation,
                },
            );

            setSuccess(true);
        }catch(exception){
            if(
                axios.isAxiosError(
                    exception
                )
            ){
                const errors=
                    exception
                        .response
                        ?.data
                        ?.errors;

                const firstError=
                    errors?.password?.[0] ??
                    errors?.email?.[0] ??
                    exception
                        .response
                        ?.data
                        ?.message;

                setError(
                    firstError ??
                    "Não foi possível alterar a palavra-passe.",
                );
            }else{
                setError(
                    "Não foi possível alterar a palavra-passe.",
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
                        Segurança da conta
                    </p>

                    <h1 className="text-5xl font-semibold leading-tight tracking-tight text-white">
                        Defina uma nova
                        <br/>
                        palavra-passe.
                    </h1>

                    <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
                        Após a alteração, as sessões anteriores da conta serão encerradas.
                    </p>
                </div>

                <div className="relative flex items-center gap-2 text-sm text-slate-500">
                    <ShieldCheck className="h-4 w-4"/>
                    Ligação protegida e token temporário.
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

                    {!validLink?(
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                                Link inválido
                            </h2>

                            <p className="mt-3 text-slate-500">
                                O link de recuperação está incompleto ou inválido.
                            </p>

                            <Link
                                to="/esqueci-senha"
                                className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white"
                            >
                                Solicitar novo link
                            </Link>
                        </div>
                    ):success?(
                        <div>
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="h-7 w-7"/>
                            </div>

                            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                                Palavra-passe alterada
                            </h2>

                            <p className="mt-3 text-slate-500">
                                A nova palavra-passe foi guardada. Já pode iniciar sessão novamente.
                            </p>

                            <Link
                                to="/login"
                                className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/20"
                            >
                                Iniciar sessão
                            </Link>
                        </div>
                    ):(
                        <>
                            <div className="mb-9">
                                <p className="mb-2 text-sm font-medium text-indigo-600">
                                    Nova palavra-passe
                                </p>

                                <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                                    Proteja a sua conta
                                </h2>

                                <p className="mt-2 text-slate-500">
                                    Conta:{" "}
                                    <span className="font-medium text-slate-700">
                                        {email}
                                    </span>
                                </p>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >
                                <div>
                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                    >
                                        Nova palavra-passe
                                    </label>

                                    <div className="relative">
                                        <LockKeyhole className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/>

                                        <input
                                            id="password"
                                            type="password"
                                            autoComplete="new-password"
                                            minLength={8}
                                            required
                                            value={password}
                                            onChange={event=>
                                                setPassword(
                                                    event.target.value
                                                )
                                            }
                                            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                        />
                                    </div>

                                    <p className="mt-2 text-xs text-slate-400">
                                        Mínimo de 8 caracteres, com letras maiúsculas, minúsculas e números.
                                    </p>
                                </div>

                                <div>
                                    <label
                                        htmlFor="password_confirmation"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                    >
                                        Confirmar palavra-passe
                                    </label>

                                    <div className="relative">
                                        <LockKeyhole className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/>

                                        <input
                                            id="password_confirmation"
                                            type="password"
                                            autoComplete="new-password"
                                            minLength={8}
                                            required
                                            value={passwordConfirmation}
                                            onChange={event=>
                                                setPasswordConfirmation(
                                                    event.target.value
                                                )
                                            }
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
                                            A guardar...
                                        </>
                                    ):(
                                        "Guardar nova palavra-passe"
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}