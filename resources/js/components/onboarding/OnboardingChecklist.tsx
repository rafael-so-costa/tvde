import {
    BellRing,
    BookOpenText,
    Building2,
    Car,
    CheckCircle2,
    Circle,
    FileText,
    ListChecks,
    LoaderCircle,
    PlayCircle,
    RefreshCw,
    UserCog,
    UserRound,
    UsersRound,
}from "lucide-react";

import {
    useQuery,
}from "@tanstack/react-query";

import {
    Link,
}from "react-router-dom";

import {
    fetchOnboardingProgress,
}from "../../lib/onboarding";

import type{
    OnboardingStep,
}from "../../types/onboarding";

export default function OnboardingChecklist(){
    const query=
        useQuery({
            queryKey:[
                "onboarding-progress",
            ],

            queryFn:
                fetchOnboardingProgress,

            staleTime:0,

            refetchOnMount:
                "always",
        });

    if(query.isLoading){
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
            </div>
        );
    }

    if(
        query.isError ||
        !query.data
    ){
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center">
                    <p className="font-semibold text-slate-900">
                        Não foi possível carregar os primeiros passos.
                    </p>

                    <button
                        type="button"
                        onClick={()=>
                            query.refetch()
                        }
                        className="mt-5 h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    const progress=
        query.data;

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
                            <ListChecks className="h-5 w-5 text-white"/>
                        </div>

                        <div>
                            <div className="text-xl font-bold text-slate-950">
                                Primeiros passos
                            </div>

                            <div className="text-xs text-slate-400">
                                Implantação da sua operação no FrotaPro
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={()=>
                            query.refetch()
                        }
                        disabled={
                            query.isFetching
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                "h-4 w-4",
                                query.isFetching
                                    ?"animate-spin"
                                    :"",
                            ].join(" ")}
                        />

                        Atualizar
                    </button>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:py-10">
                <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
                    <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <p className="text-sm font-semibold text-indigo-300">
                                Configuração da sua frota
                            </p>

                            <h1 className="mt-2 text-3xl font-bold tracking-tight">
                                {progress.fully_complete
                                    ?"Tudo pronto."
                                    :progress.base_ready
                                        ?"A base da sua operação está pronta."
                                        :"Prepare a sua operação passo a passo."
                                }
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                                O FrotaPro verifica automaticamente o que já foi configurado. Não é necessário marcar etapas manualmente.
                            </p>

                            <div className="mt-6">
                                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                                    <span>
                                        Progresso geral
                                    </span>

                                    <span>
                                        {progress.completed}/{progress.total}
                                        {" · "}
                                        {progress.progress}%
                                    </span>
                                </div>

                                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-indigo-500 transition-all"
                                        style={{
                                            width:
                                                `${progress.progress}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
                            <Stat
                                label="Progresso"
                                value={`${progress.progress}%`}
                            />

                            <Stat
                                label="Etapas"
                                value={`${progress.completed}/${progress.total}`}
                            />

                            <Stat
                                label="Base operacional"
                                value={`${progress.core_progress}%`}
                            />

                            <Stat
                                label="Estado"
                                value={
                                    progress.base_ready
                                        ?"Pronta"
                                        :"Em preparação"
                                }
                            />
                        </div>
                    </div>
                </section>

                {progress.base_ready&&(
                    <section className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"/>

                        <div>
                            <p className="font-semibold text-emerald-950">
                                Base operacional concluída
                            </p>

                            <p className="mt-1 text-sm text-emerald-700">
                                Empresa, proprietário, veículo e motorista já estão configurados. As restantes etapas ajudam a aproveitar melhor o FrotaPro.
                            </p>
                        </div>
                    </section>
                )}

                <section className="mt-8">
                    <div className="mb-5">
                        <h2 className="text-xl font-bold text-slate-950">
                            Checklist de implantação
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            As etapas são atualizadas automaticamente conforme utiliza o sistema.
                        </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {progress.steps.map(
                            step=>(
                                <StepCard
                                    key={
                                        step.key
                                    }
                                    step={
                                        step
                                    }
                                />
                            )
                        )}
                    </div>
                </section>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-start gap-3">
                        <BookOpenText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600"/>

                        <div>
                            <h2 className="font-semibold text-slate-950">
                                Precisa de ajuda durante a configuração?
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Os tutoriais e artigos apresentados em cada etapa vêm diretamente da Central de Ajuda e respeitam as funcionalidades disponíveis para o seu perfil.
                            </p>

                            <Link
                                to="/ajuda"
                                className="mt-4 inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                            >
                                Abrir Central de Ajuda
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

function StepCard({
    step,
}:{
    step:OnboardingStep;
}){
    const Icon=
        stepIcon(
            step.key
        );

    return (
        <article
            className={[
                "rounded-2xl border bg-white p-5 transition",
                step.completed
                    ?"border-emerald-200"
                    :"border-slate-200",
            ].join(" ")}
        >
            <div className="flex items-start gap-4">
                <div
                    className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        step.completed
                            ?"bg-emerald-50 text-emerald-600"
                            :"bg-indigo-50 text-indigo-600",
                    ].join(" ")}
                >
                    <Icon className="h-5 w-5"/>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">
                            {step.title}
                        </h3>

                        {step.optional&&(
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Recomendado
                            </span>
                        )}

                        {step.completed?(
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                <CheckCircle2 className="h-4 w-4"/>
                                Concluído
                            </span>
                        ):(
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                <Circle className="h-4 w-4"/>
                                Pendente
                            </span>
                        )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {step.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                            to={
                                step.action_url
                            }
                            className={[
                                "inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold",
                                step.completed
                                    ?"border border-slate-200 bg-white text-slate-600"
                                    :"bg-indigo-600 text-white",
                            ].join(" ")}
                        >
                            {step.action_label}
                        </Link>

                        {step.help.map(
                            item=>(
                                <Link
                                    key={
                                        item.id
                                    }
                                    to={
                                        item.url
                                    }
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700"
                                >
                                    {item.type==="video"?(
                                        <PlayCircle className="h-4 w-4"/>
                                    ):(
                                        <BookOpenText className="h-4 w-4"/>
                                    )}

                                    {item.title}
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}

function Stat({
    label,
    value,
}:{
    label:string;
    value:string;
}){
    return (
        <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-xl font-bold text-white">
                {value}
            </div>
        </div>
    );
}

function stepIcon(
    key:OnboardingStep["key"]
){
    return {
        company:Building2,
        owner:UsersRound,
        vehicle:Car,
        driver:UserRound,
        contract:FileText,
        employee:UserCog,
        notifications:BellRing,
        help_center:BookOpenText,
    }[key];
}
