import axios from "axios";

import {
    ReactNode,
    useState,
} from "react";

import {
    useParams,
} from "react-router-dom";

import {
    AlertCircle,
    CheckCircle2,
    ClipboardCheck,
    LoaderCircle,
    ShieldCheck,
} from "lucide-react";

import {
    useQuery,
} from "@tanstack/react-query";

import api from "../lib/api";
import SignaturePad from "../components/checklists/SignaturePad";

interface Preview {
    assinatura:{
        id:string;
        papel:string;
        signatario_nome:string;
        signatario_email:string|null;
        status:string;
        expirado:boolean;
        otp_expira_em:string|null;
    };

    checklist:{
        id:string;
        tipo:
            |"entrega"
            |"recolha";

        estado:string;

        data_operacao:string|null;

        motorista_nome:string|null;

        matricula:string|null;

        modelo:string|null;

        quilometragem:number|null;

        nivel_combustivel:string|null;

        observacoes:string|null;
    };
}

function apiError(
    exception:unknown,
):string{
    if(
        axios.isAxiosError(
            exception,
        )
    ){
        const errors=
            exception
                .response
                ?.data
                ?.errors;

        if(
            errors &&
            typeof errors===
                "object"
        ){
            const first=
                Object
                    .values(
                        errors,
                    )
                    .flat()
                    .find(
                        value=>
                            typeof value===
                            "string",
                    );

            if(
                typeof first===
                "string"
            ){
                return first;
            }
        }

        return (
            exception
                .response
                ?.data
                ?.message ??
            "Não foi possível concluir a assinatura."
        );
    }

    return "Não foi possível concluir a assinatura.";
}

export default function ChecklistRemoteSignaturePage(){
    const{
        token,
    }=useParams<{
        token:string;
    }>();

    const[
        otp,
        setOtp,
    ]=useState("");

    const[
        signature,
        setSignature,
    ]=useState("");

    const[
        accepted,
        setAccepted,
    ]=useState(false);

    const[
        submitting,
        setSubmitting,
    ]=useState(false);

    const[
        completed,
        setCompleted,
    ]=useState(false);

    const[
        finalized,
        setFinalized,
    ]=useState(false);

    const[
        error,
        setError,
    ]=useState<string|null>(
        null,
    );

    const query=
        useQuery({
            queryKey:[
                "checklist-remote-signature",
                token,
            ],

            enabled:
                Boolean(
                    token,
                ),

            retry:false,

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            `/api/checklists/assinaturas/remotas/${token}`,
                        );

                    return response
                        .data
                        .data as Preview;
                },
        });

    async function submit(){
        if(
            otp.length!==
            6
        ){
            setError(
                "Introduza o código de 6 dígitos enviado por e-mail.",
            );

            return;
        }

        if(!accepted){
            setError(
                "É necessário confirmar a leitura e aceitação antes de assinar.",
            );

            return;
        }

        if(!signature){
            setError(
                "Preencha a sua assinatura.",
            );

            return;
        }

        setSubmitting(
            true,
        );

        setError(
            null,
        );

        try{
            const response=
                await api.post(
                    `/api/checklists/assinaturas/remotas/${token}/confirmar`,
                    {
                        codigo_otp:
                            otp,

                        aceite:
                            true,

                        assinatura:
                            signature,
                    },
                );

            setFinalized(
                Boolean(
                    response
                        .data
                        .data
                        ?.checklist_finalizado,
                ),
            );

            setCompleted(
                true,
            );
        }
        catch(exception){
            setError(
                apiError(
                    exception,
                ),
            );
        }
        finally{
            setSubmitting(
                false,
            );
        }
    }

    if(query.isLoading){
        return(
            <PublicShell>
                <LoaderCircle className="h-10 w-10 animate-spin text-indigo-600"/>
            </PublicShell>
        );
    }

    if(
        query.isError ||
        !query.data
    ){
        return(
            <PublicShell>
                <div className="max-w-md text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500"/>

                    <h1 className="mt-4 text-xl font-bold text-slate-950">
                        Solicitação inválida
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Este link não existe, expirou ou já foi utilizado.
                    </p>
                </div>
            </PublicShell>
        );
    }

    if(completed){
        return(
            <PublicShell>
                <div className="max-w-lg text-center">
                    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600"/>

                    <h1 className="mt-5 text-2xl font-bold text-slate-950">
                        Assinatura concluída
                    </h1>

                    <p className="mt-3 text-slate-500">
                        {
                            finalized
                                ?"Todas as assinaturas foram concluídas. O checklist foi finalizado e o PDF definitivo foi gerado."
                                :"A sua assinatura foi registada. O checklist continua aguardando as restantes assinaturas."
                        }
                    </p>

                    <p className="mt-5 text-sm text-slate-400">
                        Pode fechar esta página.
                    </p>
                </div>
            </PublicShell>
        );
    }

    const data=
        query.data;

    if(
        data
            .assinatura
            .expirado
    ){
        return(
            <PublicShell>
                <div className="max-w-md text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-amber-500"/>

                    <h1 className="mt-4 text-xl font-bold text-slate-950">
                        Código expirado
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        O código OTP expirou. Solicite ao gestor uma nova solicitação de assinatura.
                    </p>
                </div>
            </PublicShell>
        );
    }

    return(
        <PublicShell>
            <div className="w-full max-w-5xl">
                <header className="mb-7 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <ClipboardCheck className="h-7 w-7"/>
                    </div>

                    <h1 className="mt-4 text-2xl font-bold text-slate-950">
                        Assinatura de checklist
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Checklist de {
                            data
                                .checklist
                                .tipo===
                            "entrega"
                                ?"entrega"
                                :"recolha"
                        }
                    </p>
                </header>

                {error&&(
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h2 className="font-semibold text-slate-900">
                                Dados do checklist
                            </h2>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <Info
                                    label="Signatário"
                                    value={
                                        data
                                            .assinatura
                                            .signatario_nome
                                    }
                                />

                                <Info
                                    label="Assinatura"
                                    value={
                                        data
                                            .assinatura
                                            .papel===
                                        "empresa"
                                            ?"Empresa / Gestor"
                                            :"Motorista"
                                    }
                                />

                                <Info
                                    label="Motorista"
                                    value={
                                        data
                                            .checklist
                                            .motorista_nome ??
                                        "—"
                                    }
                                />

                                <Info
                                    label="Veículo"
                                    value={
                                        [
                                            data
                                                .checklist
                                                .matricula,
                                            data
                                                .checklist
                                                .modelo,
                                        ]
                                            .filter(
                                                Boolean,
                                            )
                                            .join(
                                                " · ",
                                            ) ||
                                        "—"
                                    }
                                />

                                <Info
                                    label="Data"
                                    value={
                                        dateLabel(
                                            data
                                                .checklist
                                                .data_operacao,
                                        )
                                    }
                                />

                                <Info
                                    label="Quilometragem"
                                    value={
                                        data
                                            .checklist
                                            .quilometragem!==null
                                            ?`${data.checklist.quilometragem.toLocaleString("pt-PT")} km`
                                            :"—"
                                    }
                                />

                                <Info
                                    label="Combustível / carga"
                                    value={
                                        data
                                            .checklist
                                            .nivel_combustivel ??
                                        "—"
                                    }
                                />

                                <Info
                                    label="E-mail"
                                    value={
                                        data
                                            .assinatura
                                            .signatario_email ??
                                        "—"
                                    }
                                />
                            </div>
                        </section>

                        {data.checklist.observacoes&&(
                            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                                <h2 className="font-semibold text-slate-900">
                                    Observações
                                </h2>

                                <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                                    {
                                        data
                                            .checklist
                                            .observacoes
                                    }
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="space-y-5">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-indigo-600"/>

                                <h2 className="font-semibold text-slate-900">
                                    Confirmar identidade
                                </h2>
                            </div>

                            <label className="mt-5 block text-sm font-medium text-slate-700">
                                Código recebido por e-mail
                            </label>

                            <input
                                value={otp}
                                inputMode="numeric"
                                maxLength={6}
                                onChange={
                                    event=>
                                        setOtp(
                                            event
                                                .target
                                                .value
                                                .replace(
                                                    /\D/g,
                                                    "",
                                                )
                                                .slice(
                                                    0,
                                                    6,
                                                ),
                                        )
                                }
                                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-center text-xl font-bold tracking-[0.35em] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />

                            <p className="mt-2 text-xs text-slate-400">
                                O código possui 6 dígitos e tem validade limitada.
                            </p>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <SignaturePad
                                label="A sua assinatura"
                                onChange={
                                    setSignature
                                }
                                disabled={
                                    submitting
                                }
                            />
                        </section>

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                            <input
                                type="checkbox"
                                checked={
                                    accepted
                                }
                                onChange={
                                    event=>
                                        setAccepted(
                                            event
                                                .target
                                                .checked,
                                        )
                                }
                                className="mt-1"
                            />

                            <span className="text-sm leading-6 text-slate-600">
                                Confirmo que conferi os dados deste checklist e aceito registar esta assinatura eletronicamente.
                            </span>
                        </label>

                        <button
                            type="button"
                            disabled={
                                submitting
                            }
                            onClick={
                                submit
                            }
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {submitting&&(
                                <LoaderCircle className="h-5 w-5 animate-spin"/>
                            )}

                            Assinar checklist
                        </button>
                    </div>
                </div>
            </div>
        </PublicShell>
    );
}

function PublicShell({
    children,
}:{
    children:ReactNode;
}){
    return(
        <div className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
                {children}
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
    return(
        <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-800">
                {value}
            </div>
        </div>
    );
}

function dateLabel(
    value:string|null,
):string{
    if(!value){
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
    ).format(
        new Date(
            `${value.slice(0,10)}T12:00:00`,
        ),
    );
}