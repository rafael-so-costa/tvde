import {
    FormEvent,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";

import {
    CheckCircle2,
    LoaderCircle,
    LockKeyhole,
} from "lucide-react";

import {
    Link,
    useParams,
} from "react-router-dom";

import api from "../lib/api";

export default function FuncionarioInvitePage(){
    const {token}=useParams();

    const [password,setPassword]=
        useState("");

    const [
        confirmation,
        setConfirmation,
    ]=useState("");

    const query=useQuery({
        queryKey:[
            "funcionario-invite",
            token,
        ],

        enabled:Boolean(token),

        retry:false,

        queryFn:async()=>{
            const response=
                await api.get(
                    `/api/funcionario-convites/${token}`
                );

            return response.data.data as {
                funcionario:string;
                email:string;
                tenant:{
                    id:string;
                    nome:string;
                };
                expires_at:string;
            };
        },
    });

    const mutation=
        useMutation({
            mutationFn:async()=>{
                await api.post(
                    `/api/funcionario-convites/${token}/aceitar`,
                    {
                        password,
                        password_confirmation:
                            confirmation,
                    }
                );
            },
        });

    async function submit(
        event:FormEvent
    ){
        event.preventDefault();

        mutation.mutate();
    }

    if(query.isLoading){
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
            </div>
        );
    }

    if(query.isError){
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center">
                    <h1 className="text-xl font-semibold text-slate-900">
                        Convite indisponível
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        O convite pode ter expirado, sido revogado ou já utilizado.
                    </p>
                </div>
            </div>
        );
    }

    if(mutation.isSuccess){
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500"/>

                    <h1 className="mt-4 text-2xl font-semibold text-slate-950">
                        Conta ativada
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Já pode iniciar sessão no FrotaPRO.
                    </p>

                    <Link
                        to="/login"
                        className="mt-6 inline-flex h-11 items-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white"
                    >
                        Iniciar sessão
                    </Link>
                </div>
            </div>
        );
    }

    const data=query.data!;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <form
                onSubmit={submit}
                className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <LockKeyhole className="h-6 w-6"/>
                </div>

                <h1 className="mt-5 text-2xl font-semibold text-slate-950">
                    Ativar conta
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                    {data.funcionario}, foi convidado por{" "}
                    <strong>
                        {data.tenant.nome}
                    </strong>.
                </p>

                <p className="mt-2 text-sm text-slate-500">
                    {data.email}
                </p>

                <div className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Palavra-passe
                        </label>

                        <input
                            type="password"
                            minLength={8}
                            required
                            value={password}
                            onChange={event=>
                                setPassword(
                                    event.target.value
                                )
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Confirmar palavra-passe
                        </label>

                        <input
                            type="password"
                            minLength={8}
                            required
                            value={confirmation}
                            onChange={event=>
                                setConfirmation(
                                    event.target.value
                                )
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                {mutation.isError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Não foi possível ativar a conta. Confirme os dados ou solicite um novo convite.
                    </div>
                )}

                <button
                    type="submit"
                    disabled={
                        mutation.isPending ||
                        password.length<8 ||
                        password!==confirmation
                    }
                    className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {mutation.isPending && (
                        <LoaderCircle className="h-4 w-4 animate-spin"/>
                    )}

                    Ativar conta
                </button>
            </form>
        </div>
    );
}
