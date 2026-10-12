@extends('site.layouts.site')

@section('title','FrotaPRO — Gestão completa da sua frota TVDE')

@section('description','Motoristas, veículos, contratos, alugueres, documentação, manutenção e operação da sua frota TVDE numa única plataforma.')

@section('content')
<div class="min-h-screen bg-white">

    <header class="absolute inset-x-0 top-0 z-50">

        <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

            <div class="flex h-20 items-center justify-between">

                <a href="{{ route('site.home') }}" class="flex items-center gap-3">

                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
                        <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 17V8.5A2.5 2.5 0 0 1 5.5 6H14v11" />
                            <path d="M14 10h3.3a2 2 0 0 1 1.7.94L21 14v3h-2" />
                            <path d="M6 17h8" />
                            <circle cx="5" cy="18" r="2" />
                            <circle cx="17" cy="18" r="2" />
                        </svg>
                    </span>

                    <span>
                        <span class="block text-xl font-bold tracking-tight text-slate-950">
                            Frota<span class="text-indigo-600">PRO</span>
                        </span>

                        <span class="block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Gestão TVDE
                        </span>
                    </span>

                </a>


                <nav class="hidden items-center gap-8 lg:flex">

                    <a href="#funcionalidades" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        Funcionalidades
                    </a>

                    <a href="#como-funciona" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        Como funciona
                    </a>

                    <a href="#integracoes" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        Integrações
                    </a>

                    <a href="{{ route('site.ads.index') }}" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        Anúncios
                    </a>

                    <a href="{{ (config('app.web_base_path') ?: '') . '/registo-expediente-publico' }}" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        Registo de expediente
                    </a>

                    <a href="#faq" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        FAQ
                    </a>

                </nav>


                <div class="hidden items-center gap-4 lg:flex">

                    <a href="{{ route('login') }}" class="text-sm font-semibold text-slate-700 transition hover:text-indigo-600">
                        Entrar
                    </a>

                    <a href="{{ route('site.register') }}" class="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                        Começar agora
                    </a>

                </div>


                <details class="relative lg:hidden">

                    <summary class="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">

                        <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="2" stroke-linecap="round">
                            <path d="M4 6h16" />
                            <path d="M4 12h16" />
                            <path d="M4 18h16" />
                        </svg>

                    </summary>


                    <div class="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10">

                        <nav class="space-y-1">

                            <a href="#funcionalidades" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Funcionalidades
                            </a>

                            <a href="#como-funciona" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Como funciona
                            </a>

                            <a href="#integracoes" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Integrações
                            </a>

                            <a href="{{ route('site.ads.index') }}" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Anúncios
                            </a>

                            <a href="{{ (config('app.web_base_path') ?: '') . '/registo-expediente-publico' }}" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
    Registo de expediente
</a>

                            <a href="#faq" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                FAQ
                            </a>

                        </nav>


                        <div class="mt-3 border-t border-slate-100 pt-3">

                            <a href="{{ route('login') }}" class="flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-slate-700">
                                Entrar
                            </a>

                            <a href="{{ route('site.register') }}" class="mt-2 flex h-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white">
                                Começar agora
                            </a>

                        </div>

                    </div>

                </details>

            </div>

        </div>

    </header>


    <main>

        <section class="relative overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-white pt-36 sm:pt-40 lg:pt-44">

            <div class="pointer-events-none absolute inset-0">
                <div class="absolute -left-40 top-20 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl"></div>
                <div class="absolute -right-40 top-32 h-96 w-96 rounded-full bg-violet-300/20 blur-3xl"></div>
            </div>

            <div class="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                <div class="mx-auto max-w-4xl text-center">

                    <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur">
                        <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
                        Plataforma de gestão para operadores e frotas TVDE
                    </div>

                    <h1 class="text-5xl font-bold leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
                        Toda a sua operação TVDE.
                        <span class="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            Num único lugar.
                        </span>
                    </h1>

                    <p class="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                        Motoristas, veículos, contratos, alugueres, documentos,
                        manutenção e operação da sua frota centralizados numa
                        plataforma criada para o setor TVDE.
                    </p>

                    <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">

                        <a href="{{ route('site.register') }}" class="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 text-base font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-700 sm:w-auto">
                            Quero conhecer o FrotaPRO

                            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M5 12h14" />
                                <path d="m13 6 6 6-6 6" />
                            </svg>
                        </a>

                        <a href="#funcionalidades" class="inline-flex h-13 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-7 text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto">
                            Ver funcionalidades
                        </a>

                    </div>

                    <div class="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">

                        <span class="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-emerald-500" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m5 12 4 4L19 6" />
                            </svg>
                            Multiempresa
                        </span>

                        <span class="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-emerald-500" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m5 12 4 4L19 6" />
                            </svg>
                            Gestão documental
                        </span>

                        <span class="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-emerald-500" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m5 12 4 4L19 6" />
                            </svg>
                            Portais dedicados
                        </span>

                        <span class="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-emerald-500" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m5 12 4 4L19 6" />
                            </svg>
                            Alertas automáticos
                        </span>

                    </div>

                </div>


                <div class="relative mx-auto mt-16 max-w-6xl">

                    <div class="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 blur-2xl"></div>

                    <div class="relative overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">

                        <div class="overflow-hidden rounded-[1.3rem] border border-slate-200 bg-slate-50">

                            <div class="flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-5">
                                <span class="h-2.5 w-2.5 rounded-full bg-red-400"></span>
                                <span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                                <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>

                                <div class="ml-4 h-7 flex-1 rounded-lg bg-slate-100"></div>
                            </div>

                            <div class="grid min-h-[460px] lg:grid-cols-[220px_1fr]">

                                <aside class="hidden bg-slate-950 p-5 lg:block">

                                    <div class="flex items-center gap-3 border-b border-white/10 pb-6">
                                        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
                                            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-white" stroke-width="1.8">
                                                <path d="M3 17V8.5A2.5 2.5 0 0 1 5.5 6H14v11" />
                                                <path d="M14 10h3.3a2 2 0 0 1 1.7.94L21 14v3h-2" />
                                                <circle cx="5" cy="18" r="2" />
                                                <circle cx="17" cy="18" r="2" />
                                            </svg>
                                        </span>

                                        <span class="font-bold text-white">
                                            FrotaPRO
                                        </span>
                                    </div>

                                    <div class="mt-7 space-y-2">
                                        <div class="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white">
                                            Dashboard
                                        </div>

                                        <div class="rounded-xl px-4 py-3 text-sm text-slate-400">
                                            Motoristas
                                        </div>

                                        <div class="rounded-xl px-4 py-3 text-sm text-slate-400">
                                            Veículos
                                        </div>

                                        <div class="rounded-xl px-4 py-3 text-sm text-slate-400">
                                            Contratos
                                        </div>

                                        <div class="rounded-xl px-4 py-3 text-sm text-slate-400">
                                            Manutenção
                                        </div>

                                        <div class="rounded-xl px-4 py-3 text-sm text-slate-400">
                                            Alertas
                                        </div>
                                    </div>

                                </aside>


                                <div class="p-5 sm:p-7">

                                    <div class="flex items-start justify-between gap-5">

                                        <div>
                                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                Visão geral
                                            </p>

                                            <h2 class="mt-1 text-xl font-bold text-slate-950">
                                                Operação da frota
                                            </h2>
                                        </div>

                                        <span class="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                            Operação ativa
                                        </span>

                                    </div>


                                    <div class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                                        <div class="rounded-2xl border border-slate-200 bg-white p-5">
                                            <p class="text-xs font-medium text-slate-500">
                                                Veículos
                                            </p>
                                            <p class="mt-2 text-2xl font-bold text-slate-950">
                                                24
                                            </p>
                                            <p class="mt-1 text-xs text-emerald-600">
                                                22 ativos
                                            </p>
                                        </div>

                                        <div class="rounded-2xl border border-slate-200 bg-white p-5">
                                            <p class="text-xs font-medium text-slate-500">
                                                Motoristas
                                            </p>
                                            <p class="mt-2 text-2xl font-bold text-slate-950">
                                                31
                                            </p>
                                            <p class="mt-1 text-xs text-slate-400">
                                                27 em operação
                                            </p>
                                        </div>

                                        <div class="rounded-2xl border border-slate-200 bg-white p-5">
                                            <p class="text-xs font-medium text-slate-500">
                                                Contratos
                                            </p>
                                            <p class="mt-2 text-2xl font-bold text-slate-950">
                                                27
                                            </p>
                                            <p class="mt-1 text-xs text-slate-400">
                                                ativos
                                            </p>
                                        </div>

                                        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                            <p class="text-xs font-medium text-amber-700">
                                                Alertas
                                            </p>
                                            <p class="mt-2 text-2xl font-bold text-amber-900">
                                                3
                                            </p>
                                            <p class="mt-1 text-xs text-amber-600">
                                                requerem atenção
                                            </p>
                                        </div>

                                    </div>


                                    <div class="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">

                                        <div class="rounded-2xl border border-slate-200 bg-white p-5">

                                            <div class="flex items-center justify-between">
                                                <h3 class="font-semibold text-slate-900">
                                                    Estado da frota
                                                </h3>

                                                <span class="text-xs text-slate-400">
                                                    Hoje
                                                </span>
                                            </div>

                                            <div class="mt-6 space-y-5">

                                                <div>
                                                    <div class="mb-2 flex justify-between text-xs">
                                                        <span class="text-slate-500">
                                                            Em operação
                                                        </span>
                                                        <span class="font-semibold text-slate-700">
                                                            79%
                                                        </span>
                                                    </div>

                                                    <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                                                        <div class="h-full w-[79%] rounded-full bg-indigo-500"></div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div class="mb-2 flex justify-between text-xs">
                                                        <span class="text-slate-500">
                                                            Documentação válida
                                                        </span>
                                                        <span class="font-semibold text-slate-700">
                                                            92%
                                                        </span>
                                                    </div>

                                                    <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                                                        <div class="h-full w-[92%] rounded-full bg-emerald-500"></div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div class="mb-2 flex justify-between text-xs">
                                                        <span class="text-slate-500">
                                                            Veículos disponíveis
                                                        </span>
                                                        <span class="font-semibold text-slate-700">
                                                            88%
                                                        </span>
                                                    </div>

                                                    <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                                                        <div class="h-full w-[88%] rounded-full bg-violet-500"></div>
                                                    </div>
                                                </div>

                                            </div>

                                        </div>


                                        <div class="rounded-2xl border border-slate-200 bg-white p-5">

                                            <h3 class="font-semibold text-slate-900">
                                                Próximas ações
                                            </h3>

                                            <div class="mt-5 space-y-3">

                                                <div class="flex gap-3 rounded-xl bg-slate-50 p-3">
                                                    <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500"></span>

                                                    <div>
                                                        <p class="text-sm font-medium text-slate-700">
                                                            Documento a expirar
                                                        </p>
                                                        <p class="mt-1 text-xs text-slate-400">
                                                            Motorista · 8 dias
                                                        </p>
                                                    </div>
                                                </div>

                                                <div class="flex gap-3 rounded-xl bg-slate-50 p-3">
                                                    <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500"></span>

                                                    <div>
                                                        <p class="text-sm font-medium text-slate-700">
                                                            Manutenção preventiva
                                                        </p>
                                                        <p class="mt-1 text-xs text-slate-400">
                                                            Veículo · 450 km
                                                        </p>
                                                    </div>
                                                </div>

                                                <div class="flex gap-3 rounded-xl bg-slate-50 p-3">
                                                    <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>

                                                    <div>
                                                        <p class="text-sm font-medium text-slate-700">
                                                            Contrato atualizado
                                                        </p>
                                                        <p class="mt-1 text-xs text-slate-400">
                                                            Concluído
                                                        </p>
                                                    </div>
                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    <p class="mt-4 text-center text-xs text-slate-400">
                        Representação ilustrativa do painel FrotaPRO
                    </p>

                </div>

            </div>

        </section>


        <section class="py-24 sm:py-28">

            <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                <div class="mx-auto max-w-3xl text-center">

                    <p class="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                        Porque FrotaPRO
                    </p>

                    <h2 class="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                        Menos tarefas administrativas.
                        <br class="hidden sm:block">
                        Mais controlo da operação.
                    </h2>

                    <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                        Deixe de gerir informação espalhada por folhas de cálculo,
                        mensagens, documentos e diferentes plataformas.
                    </p>

                </div>


                <div class="mt-14 grid gap-6 lg:grid-cols-3">

                    <article class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2v4" />
                                <path d="M12 18v4" />
                                <path d="m4.93 4.93 2.83 2.83" />
                                <path d="m16.24 16.24 2.83 2.83" />
                                <path d="M2 12h4" />
                                <path d="M18 12h4" />
                                <path d="m4.93 19.07 2.83-2.83" />
                                <path d="m16.24 7.76 2.83-2.83" />
                            </svg>
                        </div>

                        <h3 class="mt-6 text-xl font-bold text-slate-950">
                            Menos burocracia
                        </h3>

                        <p class="mt-3 leading-7 text-slate-600">
                            Centralize processos, documentos e rotinas operacionais
                            para reduzir trabalho repetitivo e informação dispersa.
                        </p>

                    </article>


                    <article class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 3v18h18" />
                                <path d="m7 16 4-5 3 3 5-7" />
                            </svg>
                        </div>

                        <h3 class="mt-6 text-xl font-bold text-slate-950">
                            Mais controlo
                        </h3>

                        <p class="mt-3 leading-7 text-slate-600">
                            Acompanhe motoristas, veículos, contratos, documentos,
                            manutenção, alertas e ocorrências numa visão integrada.
                        </p>

                    </article>


                    <article class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="7" height="7" rx="2" />
                                <rect x="14" y="3" width="7" height="7" rx="2" />
                                <rect x="3" y="14" width="7" height="7" rx="2" />
                                <rect x="14" y="14" width="7" height="7" rx="2" />
                            </svg>
                        </div>

                        <h3 class="mt-6 text-xl font-bold text-slate-950">
                            Uma única plataforma
                        </h3>

                        <p class="mt-3 leading-7 text-slate-600">
                            Gestão, motorista e proprietário ligados ao mesmo
                            ecossistema, com acessos e informação adequados a cada perfil.
                        </p>

                    </article>

                </div>

            </div>

        </section>


        <section id="integracoes" class="border-y border-slate-200 bg-slate-50 py-14">

            <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

                    <div class="max-w-lg">

                        <div class="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                            Integrações em desenvolvimento
                        </div>

                        <h2 class="mt-4 text-2xl font-bold text-slate-950">
                            Preparado para ligar toda a sua operação.
                        </h2>

                        <p class="mt-2 leading-7 text-slate-600">
                            O FrotaPRO está a ser preparado para centralizar dados
                            das principais plataformas e serviços utilizados pelas
                            empresas TVDE.
                        </p>

                    </div>


                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">

                        @foreach([
                        'Uber',
                        'Bolt',
                        'Via Verde',
                        'Combustíveis',
                        'Mobilidade elétrica',
                        'Outras plataformas'
                        ] as $integration)

                        <div class="flex min-h-16 min-w-36 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-center text-sm font-semibold text-slate-600 shadow-sm">
                            {{ $integration }}
                        </div>

                        @endforeach

                    </div>

                </div>

            </div>

        </section>

        <section id="funcionalidades" class="relative overflow-hidden bg-slate-50 py-24 sm:py-28">

            <div class="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl"></div>

            <div class="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                <div class="max-w-3xl">

                    <p class="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                        Gestão completa
                    </p>

                    <h2 class="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                        Tudo o que precisa para gerir uma operação TVDE.
                    </h2>

                    <p class="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                        Do primeiro cadastro à operação diária da frota, o FrotaPRO
                        reúne processos que normalmente ficam espalhados por folhas de
                        cálculo, documentos, mensagens e diferentes sistemas.
                    </p>

                </div>


                <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                    @php
                    $features = [
                    [
                    'title' => 'Motoristas',
                    'description' => 'Cadastros, acessos, documentação, estado operacional e histórico centralizados.',
                    'icon' => 'user'
                    ],
                    [
                    'title' => 'Veículos',
                    'description' => 'Controle a frota, proprietários, disponibilidade, documentação e vínculos.',
                    'icon' => 'car'
                    ],
                    [
                    'title' => 'Contratos',
                    'description' => 'Criação, versões, PDFs, assinaturas e acompanhamento do ciclo contratual.',
                    'icon' => 'document'
                    ],
                    [
                    'title' => 'Alugueres',
                    'description' => 'Entrega, devolução, períodos de utilização e associação entre motorista e veículo.',
                    'icon' => 'key'
                    ],
                    [
                    'title' => 'Checklists',
                    'description' => 'Registe o estado do veículo na entrega e devolução com processos padronizados.',
                    'icon' => 'check'
                    ],
                    [
                    'title' => 'Manutenção',
                    'description' => 'Ordens, planos preventivos, peças, estoque, fornecedores e diagnósticos.',
                    'icon' => 'tool'
                    ],
                    [
                    'title' => 'Multas e sinistros',
                    'description' => 'Ocorrências, documentos, responsabilidades e acompanhamento centralizado.',
                    'icon' => 'alert'
                    ],
                    [
                    'title' => 'Documentação',
                    'description' => 'Registos criminais, recibos verdes e documentos operacionais num só local.',
                    'icon' => 'folder'
                    ],
                    [
                    'title' => 'Alertas automáticos',
                    'description' => 'Antecipe prazos, vencimentos, manutenções e situações que exigem atenção.',
                    'icon' => 'bell'
                    ],
                    ];
                    @endphp

                    @foreach($features as $feature)

                    <article class="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-900/5">

                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">

                            @switch($feature['icon'])

                            @case('user')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 21a8 8 0 0 1 16 0" />
                            </svg>
                            @break

                            @case('car')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 17h14" />
                                <path d="M6 17v2" />
                                <path d="M18 17v2" />
                                <path d="m4 12 2-5h12l2 5" />
                                <rect x="3" y="11" width="18" height="6" rx="2" />
                            </svg>
                            @break

                            @case('document')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 2h9l4 4v16H6z" />
                                <path d="M14 2v5h5" />
                                <path d="M9 13h6" />
                                <path d="M9 17h6" />
                            </svg>
                            @break

                            @case('key')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="8" cy="15" r="4" />
                                <path d="m11 12 9-9" />
                                <path d="m17 6 2 2" />
                                <path d="m14 9 2 2" />
                            </svg>
                            @break

                            @case('check')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="5" y="3" width="14" height="18" rx="2" />
                                <path d="m8 12 2.5 2.5L16 9" />
                            </svg>
                            @break

                            @case('tool')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-3 3-3-3z" />
                            </svg>
                            @break

                            @case('alert')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 3 2 21h20z" />
                                <path d="M12 9v5" />
                                <path d="M12 18h.01" />
                            </svg>
                            @break

                            @case('folder')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h6l2 2h10v11H3z" />
                            </svg>
                            @break

                            @case('bell')
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                                <path d="M10 21h4" />
                            </svg>
                            @break

                            @endswitch

                        </div>

                        <h3 class="mt-6 text-xl font-bold text-slate-950">
                            {{ $feature['title'] }}
                        </h3>

                        <p class="mt-3 leading-7 text-slate-600">
                            {{ $feature['description'] }}
                        </p>

                    </article>

                    @endforeach

                </div>

            </div>

        </section>


        <section id="como-funciona" class="bg-white py-24 sm:py-28">

            <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                <div class="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">

                    <div>

                        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                            Uma operação conectada
                        </p>

                        <h2 class="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                            Da entrada do motorista à operação diária.
                        </h2>

                        <p class="mt-5 text-lg leading-8 text-slate-600">
                            Cada etapa comunica com a seguinte. O objetivo é eliminar
                            informação duplicada e transformar processos separados num
                            único fluxo operacional.
                        </p>

                        <div class="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">

                            <p class="text-sm font-semibold text-indigo-900">
                                Menos informação repetida
                            </p>

                            <p class="mt-2 text-sm leading-6 text-indigo-700">
                                Os dados introduzidos durante o cadastro podem acompanhar
                                contratos, alugueres, checklists e outros processos da
                                operação.
                            </p>

                        </div>

                    </div>


                    <div class="relative">

                        <div class="absolute bottom-8 left-[23px] top-8 w-px bg-gradient-to-b from-indigo-200 via-indigo-300 to-slate-200 sm:left-[27px]"></div>

                        @php
                        $flow = [
                        ['01', 'Cadastro', 'Registe motorista, proprietário, empresa e veículo.'],
                        ['02', 'Documentação', 'Organize documentos e acompanhe o estado de cada cadastro.'],
                        ['03', 'Contrato', 'Gere o contrato e conduza o processo de assinatura.'],
                        ['04', 'Entrega', 'Associe o veículo e execute o checklist de entrega.'],
                        ['05', 'Operação', 'Acompanhe aluguer, expediente, multas, sinistros e documentação.'],
                        ['06', 'Manutenção e alertas', 'Antecipe necessidades da frota e situações que exigem intervenção.'],
                        ];
                        @endphp

                        <div class="space-y-4">

                            @foreach($flow as [$number, $title, $description])

                            <div class="relative flex gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:gap-6">

                                <div class="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 sm:h-14 sm:w-14">
                                    {{ $number }}
                                </div>

                                <div class="pt-1">

                                    <h3 class="font-bold text-slate-950 sm:text-lg">
                                        {{ $title }}
                                    </h3>

                                    <p class="mt-1 text-sm leading-6 text-slate-600">
                                        {{ $description }}
                                    </p>

                                </div>

                            </div>

                            @endforeach

                        </div>

                    </div>

                </div>

            </div>

        </section>


        <section class="overflow-hidden bg-slate-950 py-24 text-white sm:py-28">

            <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                <div class="mx-auto max-w-3xl text-center">

                    <p class="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">
                        Um sistema. Diferentes experiências.
                    </p>

                    <h2 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                        Cada pessoa vê exatamente o que precisa.
                    </h2>

                    <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                        A operação permanece centralizada, mas cada perfil utiliza uma
                        área própria adequada às suas responsabilidades.
                    </p>

                </div>


                <div class="mt-14 grid gap-6 lg:grid-cols-3">

                    <article class="rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur">

                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white">
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="3" />
                                <path d="M8 17v-4" />
                                <path d="M12 17V7" />
                                <path d="M16 17v-7" />
                            </svg>
                        </div>

                        <p class="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
                            Gestão
                        </p>

                        <h3 class="mt-2 text-2xl font-bold">
                            Painel da empresa
                        </h3>

                        <p class="mt-4 leading-7 text-slate-300">
                            A visão completa da operação: frota, motoristas, contratos,
                            documentos, manutenção, ocorrências e indicadores.
                        </p>

                        <div class="mt-7 space-y-3 text-sm text-slate-300">
                            <p>✓ Gestão operacional</p>
                            <p>✓ Permissões por utilizador</p>
                            <p>✓ Dashboard centralizado</p>
                        </div>

                    </article>


                    <article class="rounded-3xl border border-indigo-400/30 bg-gradient-to-b from-indigo-500/15 to-white/[0.05] p-8 backdrop-blur">

                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white">
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 21a8 8 0 0 1 16 0" />
                            </svg>
                        </div>

                        <p class="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
                            Motorista
                        </p>

                        <h3 class="mt-2 text-2xl font-bold">
                            Portal do Motorista
                        </h3>

                        <p class="mt-4 leading-7 text-slate-300">
                            Uma área simples para o motorista consultar a sua operação e
                            tratar dos processos que lhe dizem respeito.
                        </p>

                        <div class="mt-7 space-y-3 text-sm text-slate-300">
                            <p>✓ Expediente</p>
                            <p>✓ Multas e sinistros</p>
                            <p>✓ Registo criminal e recibos verdes</p>
                        </div>

                    </article>


                    <article class="rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur">

                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 text-white">
                            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 21V9l9-6 9 6v12" />
                                <path d="M9 21v-6h6v6" />
                            </svg>
                        </div>

                        <p class="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
                            Proprietário
                        </p>

                        <h3 class="mt-2 text-2xl font-bold">
                            Portal do Proprietário
                        </h3>

                        <p class="mt-4 leading-7 text-slate-300">
                            O proprietário acompanha os veículos ligados à sua conta e as
                            ocorrências relevantes sem acesso à gestão interna da empresa.
                        </p>

                        <div class="mt-7 space-y-3 text-sm text-slate-300">
                            <p>✓ Frota vinculada</p>
                            <p>✓ Multas</p>
                            <p>✓ Sinistros</p>
                        </div>

                    </article>

                </div>

            </div>

        </section>

        <section id="faq" class="bg-white py-24 sm:py-28">

            <div class="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">

                <div class="text-center">

                    <p class="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                        Perguntas frequentes
                    </p>

                    <h2 class="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                        Antes de começar.
                    </h2>

                    <p class="mt-4 text-lg text-slate-600">
                        Algumas respostas sobre o funcionamento do FrotaPRO.
                    </p>

                </div>


                <div class="mt-12 space-y-4">

                    @php
                    $faqs = [
                    [
                    'question' => 'Para quem é o FrotaPRO?',
                    'answer' => 'O FrotaPRO foi desenvolvido para operadores e gestores de empresas e frotas TVDE que precisam centralizar a gestão operacional num único sistema.'
                    ],
                    [
                    'question' => 'Posso gerir vários veículos e motoristas?',
                    'answer' => 'Sim. A plataforma foi desenhada para operações com múltiplos veículos, motoristas, proprietários e utilizadores.'
                    ],
                    [
                    'question' => 'Os motoristas têm acesso ao sistema?',
                    'answer' => 'Sim. Cada motorista pode ter uma área própria com acesso apenas aos processos e informações associados à sua atividade.'
                    ],
                    [
                    'question' => 'Os proprietários dos veículos também podem ter acesso?',
                    'answer' => 'Sim. O FrotaPRO possui um portal específico para proprietários, separado da área interna de gestão da empresa.'
                    ],
                    [
                    'question' => 'O FrotaPRO controla documentos e prazos?',
                    'answer' => 'Sim. A plataforma já possui gestão documental e alertas para acompanhar situações que exigem atenção da operação.'
                    ],
                    [
                    'question' => 'Existirão integrações com Uber, Bolt e outros serviços?',
                    'answer' => 'As integrações com plataformas TVDE, portagens, combustíveis e mobilidade elétrica fazem parte da evolução prevista do FrotaPRO.'
                    ],
                    [
                    'question' => 'Os dados de uma empresa ficam separados dos dados das restantes empresas?',
                    'answer' => 'Sim. O FrotaPRO foi construído com arquitetura multiempresa e isolamento dos dados por organização.'
                    ],
                    ];
                    @endphp


                    @foreach($faqs as $faq)

                    <details class="group rounded-2xl border border-slate-200 bg-white">

                        <summary class="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5">

                            <span class="font-semibold text-slate-900">
                                {{ $faq['question'] }}
                            </span>

                            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-45 group-open:bg-indigo-100 group-open:text-indigo-600">
                                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2" stroke-linecap="round">
                                    <path d="M12 5v14" />
                                    <path d="M5 12h14" />
                                </svg>
                            </span>

                        </summary>

                        <div class="px-6 pb-6 pr-16 text-sm leading-7 text-slate-600">
                            {{ $faq['answer'] }}
                        </div>

                    </details>

                    @endforeach

                </div>

            </div>

        </section>


        <section class="relative overflow-hidden bg-indigo-600 py-20 text-white">

            <div class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
            <div class="pointer-events-none absolute -bottom-48 right-0 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl"></div>

            <div class="relative mx-auto max-w-4xl px-5 text-center sm:px-6 lg:px-8">

                <p class="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-200">
                    Comece com o FrotaPRO
                </p>

                <h2 class="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                    Menos ferramentas.
                    <br>
                    Mais controlo da sua frota.
                </h2>

                <p class="mx-auto mt-6 max-w-2xl text-lg leading-8 text-indigo-100">
                    Centralize a operação da sua empresa TVDE e tenha a informação
                    importante disponível no momento certo.
                </p>

                <div class="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

                    <a href="{{ route('site.register') }}" class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 font-semibold text-indigo-700 shadow-xl shadow-indigo-950/20 transition hover:bg-indigo-50">
                        Começar agora

                        <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2" stroke-linecap="round">
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                        </svg>
                    </a>

                    <a href="{{ route('login') }}" class="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-7 font-semibold text-white transition hover:bg-white/15">
                        Já sou cliente
                    </a>

                </div>

            </div>

        </section>


        <footer class="bg-slate-950 text-slate-400">

            <div class="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">

                <div class="grid gap-12 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-5">

                    <div class="lg:col-span-2">

                        <a href="{{ route('site.home') }}" class="inline-flex items-center gap-3">

                            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
                                <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 17V8.5A2.5 2.5 0 0 1 5.5 6H14v11" />
                                    <path d="M14 10h3.3a2 2 0 0 1 1.7.94L21 14v3h-2" />
                                    <path d="M6 17h8" />
                                    <circle cx="5" cy="18" r="2" />
                                    <circle cx="17" cy="18" r="2" />
                                </svg>
                            </span>

                            <span class="text-xl font-bold text-white">
                                Frota<span class="text-indigo-400">PRO</span>
                            </span>

                        </a>

                        <p class="mt-5 max-w-sm text-sm leading-7 text-slate-400">
                            Plataforma de gestão criada para centralizar a operação de
                            empresas e frotas TVDE.
                        </p>

                    </div>


                    <div>

                        <h3 class="text-sm font-semibold text-white">
                            Produto
                        </h3>

                        <div class="mt-5 space-y-3 text-sm">

                            <a href="#funcionalidades" class="block hover:text-white">
                                Funcionalidades
                            </a>

                            <a href="#integracoes" class="block hover:text-white">
                                Integrações
                            </a>

                            <a href="#como-funciona" class="block hover:text-white">
                                Como funciona
                            </a>
                            <a href="{{ route('site.ads.index') }}" class="block hover:text-white">
                                Anúncios
                            </a>

                        </div>

                    </div>


                    <div>

                        <h3 class="text-sm font-semibold text-white">
                            FrotaPRO
                        </h3>

                        <div class="mt-5 space-y-3 text-sm">

                            <a href="{{ route('site.register') }}" class="block hover:text-white">
                                Criar conta
                            </a>

                            <a href="{{ route('login') }}" class="block hover:text-white">
                                Entrar
                            </a>

                            <a href="#faq" class="block hover:text-white">
                                FAQ
                            </a>

                        </div>

                    </div>


                    <div>

                        <h3 class="text-sm font-semibold text-white">
                            Legal
                        </h3>

                        <div class="mt-5 space-y-3 text-sm">

                            <span class="block text-slate-600">
                                Termos de utilização
                            </span>

                            <span class="block text-slate-600">
                                Política de privacidade
                            </span>

                            <span class="block text-slate-600">
                                Cookies
                            </span>

                        </div>

                    </div>

                </div>


                <div class="flex flex-col gap-4 pt-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">

                    <p>
                        &copy; {{ date('Y') }} FrotaPRO. Todos os direitos reservados.
                    </p>

                    <p>
                        Plataforma de gestão TVDE.
                    </p>

                </div>

            </div>

        </footer>

    </main>

</div>
@endsection