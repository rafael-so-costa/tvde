@extends('site.layouts.site')

@section('title','Criar conta — FrotaPRO')

@section('description','Comece a configurar a sua empresa TVDE no FrotaPRO.')

@section('content')
<div class="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">

    <header class="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">

            <a href="/" class="flex items-center gap-3">
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

            <div class="flex items-center gap-4">
                <span class="hidden text-sm text-slate-500 sm:block">
                    Já tem conta?
                </span>

                <a href="/login" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    Entrar
                </a>
            </div>

        </div>
    </header>


    <main class="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">

        <div class="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">

            <section>

                <div class="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
                    <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
                    Comece no FrotaPRO
                </div>

                <h1 class="mt-6 text-4xl font-bold tracking-[-0.035em] text-slate-950 sm:text-5xl">
                    Comece a organizar a sua operação TVDE.
                </h1>

                <p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                    Crie a conta da sua empresa e configure o ambiente FrotaPRO
                    para gerir motoristas, veículos, contratos e toda a operação.
                </p>


                <div class="mt-10 space-y-6">

                    <div class="flex gap-4">

                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                            1
                        </div>

                        <div>
                            <h2 class="font-semibold text-slate-950">
                                Crie a sua conta
                            </h2>

                            <p class="mt-1 text-sm leading-6 text-slate-500">
                                Dados do administrador responsável pela empresa.
                            </p>
                        </div>

                    </div>


                    <div class="flex gap-4">

                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                            2
                        </div>

                        <div>
                            <h2 class="font-semibold text-slate-950">
                                Configure a empresa
                            </h2>

                            <p class="mt-1 text-sm leading-6 text-slate-500">
                                Identificação e dados essenciais da operação.
                            </p>
                        </div>

                    </div>


                    <div class="flex gap-4">

                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                            3
                        </div>

                        <div>
                            <h2 class="font-semibold text-slate-950">
                                Entre no seu painel
                            </h2>

                            <p class="mt-1 text-sm leading-6 text-slate-500">
                                O ambiente da empresa será criado automaticamente.
                            </p>
                        </div>

                    </div>

                </div>

            </section>


            <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-9">

                <p class="text-sm font-semibold text-indigo-600">
                    Passo 1 de 3
                </p>

                <h2 class="mt-2 text-2xl font-bold text-slate-950">
                    Criar conta
                </h2>

                <p class="mt-2 text-sm leading-6 text-slate-500">
                    Esta será a conta principal de administração da sua empresa.
                </p>


                <div class="mt-8 space-y-5">

                    <div>
                        <label for="register-name" class="mb-2 block text-sm font-medium text-slate-700">
                            Nome completo
                        </label>

                        <input
                            id="register-name"
                            type="text"
                            autocomplete="name"
                            placeholder="O seu nome"
                            class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                    </div>


                    <div>
                        <label for="register-email" class="mb-2 block text-sm font-medium text-slate-700">
                            E-mail profissional
                        </label>

                        <input
                            id="register-email"
                            type="email"
                            autocomplete="email"
                            placeholder="nome@empresa.pt"
                            class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                    </div>


                    <div>
                        <label for="register-phone" class="mb-2 block text-sm font-medium text-slate-700">
                            Telefone
                        </label>

                        <input
                            id="register-phone"
                            type="tel"
                            autocomplete="tel"
                            placeholder="+351 900 000 000"
                            class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                    </div>


                    <div>
                        <label for="register-password" class="mb-2 block text-sm font-medium text-slate-700">
                            Palavra-passe
                        </label>

                        <input
                            id="register-password"
                            type="password"
                            autocomplete="new-password"
                            placeholder="Mínimo de 8 caracteres"
                            class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                    </div>


                    <button
                        type="button"
                        class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                        Continuar

                        <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                        </svg>
                    </button>

                </div>


                <p class="mt-6 text-center text-xs leading-5 text-slate-400">
                    Ao criar uma conta aceitará os Termos de Utilização e a
                    Política de Privacidade do FrotaPRO.
                </p>

            </section>

        </div>

    </main>

</div>
@endsection
