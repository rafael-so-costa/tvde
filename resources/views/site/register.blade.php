@extends('site.layouts.site')
@section('robots','noindex,nofollow')
@section('title','Criar conta — FrotaPRO')

@section('description','Comece a configurar a sua empresa TVDE no FrotaPRO.')

@section('content')
@php
$companyErrors = $errors->hasAny([
'company_name',
'company_nif',
'company_email',
'company_phone',
]);

$initialStep = $companyErrors ? 2 : 1;
@endphp

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

        <div class="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">

            <section class="lg:sticky lg:top-12">

                <div class="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
                    <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
                    Comece no FrotaPRO
                </div>

                <h1 class="mt-6 text-4xl font-bold tracking-[-0.035em] text-slate-950 sm:text-5xl">
                    Comece a organizar a sua operação TVDE.
                </h1>

                <p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                    Crie a conta da sua empresa e o FrotaPRO prepara
                    automaticamente o seu ambiente de gestão.
                </p>


                <div class="mt-10 space-y-6">

                    <div class="flex gap-4">

                        <div data-step-indicator="1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                            1
                        </div>

                        <div>
                            <h2 class="font-semibold text-slate-950">
                                Crie a sua conta
                            </h2>

                            <p class="mt-1 text-sm leading-6 text-slate-500">
                                Dados do administrador da operação.
                            </p>
                        </div>

                    </div>


                    <div class="flex gap-4">

                        <div data-step-indicator="2" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                            2
                        </div>

                        <div>
                            <h2 class="font-semibold text-slate-950">
                                Identifique a empresa
                            </h2>

                            <p class="mt-1 text-sm leading-6 text-slate-500">
                                Os dados essenciais para criar a organização.
                            </p>
                        </div>

                    </div>


                    <div class="flex gap-4">

                        <div data-step-indicator="3" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                            3
                        </div>

                        <div>
                            <h2 class="font-semibold text-slate-950">
                                Confirme e entre
                            </h2>

                            <p class="mt-1 text-sm leading-6 text-slate-500">
                                Criamos o ambiente e iniciamos a sessão automaticamente.
                            </p>
                        </div>

                    </div>

                </div>

            </section>


            <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-9">

                @if($errors->any())

                <div class="mb-7 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">

                    <p class="text-sm font-semibold text-red-800">
                        Verifique os dados indicados.
                    </p>

                    <ul class="mt-2 space-y-1 text-sm text-red-700">
                        @foreach($errors->all() as $error)
                        <li>{{ $error }}</li>
                        @endforeach
                    </ul>

                </div>

                @endif


                <div class="mb-8">

                    <p id="register-step-label" class="text-sm font-semibold text-indigo-600">
                        Passo 1 de 3
                    </p>

                    <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div id="register-progress" class="h-full w-1/3 rounded-full bg-indigo-600 transition-all duration-300"></div>
                    </div>

                </div>


                <form
                    id="saas-register-form"
                    method="POST"
                    action="{{ route('site.register.store') }}"
                    data-initial-step="{{ $initialStep }}">

                    @csrf


                    <div data-step-panel="1">

                        <h2 class="text-2xl font-bold text-slate-950">
                            Criar conta
                        </h2>

                        <p class="mt-2 text-sm leading-6 text-slate-500">
                            Esta será a conta principal de administração da empresa.
                        </p>


                        <div class="mt-8 space-y-5">

                            <div>

                                <label for="name" class="mb-2 block text-sm font-medium text-slate-700">
                                    Nome completo
                                </label>

                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value="{{ old('name') }}"
                                    autocomplete="name"
                                    required
                                    maxlength="255"
                                    placeholder="O seu nome"
                                    class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">

                            </div>


                            <div>

                                <label for="email" class="mb-2 block text-sm font-medium text-slate-700">
                                    E-mail profissional
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value="{{ old('email') }}"
                                    autocomplete="email"
                                    required
                                    maxlength="190"
                                    placeholder="nome@empresa.pt"
                                    class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">

                            </div>


                            <div>

                                <label for="phone" class="mb-2 block text-sm font-medium text-slate-700">
                                    Telefone
                                </label>

                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value="{{ old('phone') }}"
                                    autocomplete="tel"
                                    required
                                    maxlength="30"
                                    placeholder="+351 900 000 000"
                                    class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">

                            </div>


                            <div class="grid gap-5 sm:grid-cols-2">

                                <div>

                                    <label for="password" class="mb-2 block text-sm font-medium text-slate-700">
                                        Palavra-passe
                                    </label>

                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autocomplete="new-password"
                                        required
                                        minlength="8"
                                        pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
                                        title="A palavra-passe deve ter pelo menos 8 caracteres, incluindo uma letra e um número."
                                        placeholder="8+ caracteres, letras e números"
                                        class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                                    <p class="mt-2 text-xs text-slate-400">
                                        Mínimo de 8 caracteres, com pelo menos uma letra e um número.
                                    </p>

                                </div>


                                <div>

                                    <label for="password_confirmation" class="mb-2 block text-sm font-medium text-slate-700">
                                        Confirmar
                                    </label>

                                    <input
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        autocomplete="new-password"
                                        required
                                        minlength="8"
                                        placeholder="Repita a palavra-passe"
                                        class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">

                                </div>

                            </div>


                            <button
                                type="button"
                                data-next-step
                                class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                                Continuar

                                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2" stroke-linecap="round">
                                    <path d="M5 12h14" />
                                    <path d="m13 6 6 6-6 6" />
                                </svg>
                            </button>

                        </div>

                    </div>


                    <div data-step-panel="2" class="hidden">

                        <h2 class="text-2xl font-bold text-slate-950">
                            A sua empresa
                        </h2>

                        <p class="mt-2 text-sm leading-6 text-slate-500">
                            Precisamos apenas dos dados essenciais. O restante poderá
                            ser completado depois no painel.
                        </p>


                        <div class="mt-8 space-y-5">

                            <div>

                                <label for="company_name" class="mb-2 block text-sm font-medium text-slate-700">
                                    Nome da empresa
                                </label>

                                <input
                                    id="company_name"
                                    name="company_name"
                                    type="text"
                                    value="{{ old('company_name') }}"
                                    required
                                    maxlength="255"
                                    placeholder="Ex.: Mobilidade Lisboa, Lda."
                                    class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">

                            </div>


                            <div>

                                <label for="company_nif" class="mb-2 block text-sm font-medium text-slate-700">
                                    NIF
                                </label>

                                <input
                                    id="company_nif"
                                    name="company_nif"
                                    type="text"
                                    inputmode="numeric"
                                    value="{{ old('company_nif') }}"
                                    required
                                    maxlength="20"
                                    placeholder="500000000"
                                    class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">

                            </div>


                            <div>

                                <label for="company_email" class="mb-2 block text-sm font-medium text-slate-700">
                                    E-mail da empresa
                                    <span class="font-normal text-slate-400">
                                        · opcional
                                    </span>
                                </label>

                                <input
                                    id="company_email"
                                    name="company_email"
                                    type="email"
                                    value="{{ old('company_email') }}"
                                    maxlength="190"
                                    placeholder="geral@empresa.pt"
                                    class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">

                                <p class="mt-2 text-xs text-slate-400">
                                    Se ficar vazio, utilizaremos o e-mail da conta.
                                </p>

                            </div>


                            <div>

                                <label for="company_phone" class="mb-2 block text-sm font-medium text-slate-700">
                                    Telefone da empresa
                                    <span class="font-normal text-slate-400">
                                        · opcional
                                    </span>
                                </label>

                                <input
                                    id="company_phone"
                                    name="company_phone"
                                    type="tel"
                                    value="{{ old('company_phone') }}"
                                    maxlength="30"
                                    placeholder="+351 210 000 000"
                                    class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">

                            </div>


                            <div class="grid gap-3 sm:grid-cols-2">

                                <button
                                    type="button"
                                    data-back-step
                                    class="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition hover:bg-slate-50">
                                    Voltar
                                </button>

                                <button
                                    type="button"
                                    data-next-step
                                    class="flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white transition hover:bg-indigo-700">
                                    Rever dados

                                    <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2" stroke-linecap="round">
                                        <path d="M5 12h14" />
                                        <path d="m13 6 6 6-6 6" />
                                    </svg>
                                </button>

                            </div>

                        </div>

                    </div>


                    <div data-step-panel="3" class="hidden">

                        <h2 class="text-2xl font-bold text-slate-950">
                            Tudo pronto para começar
                        </h2>

                        <p class="mt-2 text-sm leading-6 text-slate-500">
                            Confirme os dados. O ambiente da sua empresa será criado
                            automaticamente.
                        </p>


                        <div class="mt-8 overflow-hidden rounded-2xl border border-slate-200">

                            <div class="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Administrador
                            </div>

                            <div class="space-y-3 p-5 text-sm">

                                <div class="flex justify-between gap-6">
                                    <span class="text-slate-500">Nome</span>
                                    <span id="review-name" class="text-right font-medium text-slate-900"></span>
                                </div>

                                <div class="flex justify-between gap-6">
                                    <span class="text-slate-500">E-mail</span>
                                    <span id="review-email" class="text-right font-medium text-slate-900"></span>
                                </div>

                                <div class="flex justify-between gap-6">
                                    <span class="text-slate-500">Telefone</span>
                                    <span id="review-phone" class="text-right font-medium text-slate-900"></span>
                                </div>

                            </div>


                            <div class="border-y border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Empresa
                            </div>

                            <div class="space-y-3 p-5 text-sm">

                                <div class="flex justify-between gap-6">
                                    <span class="text-slate-500">Empresa</span>
                                    <span id="review-company" class="text-right font-medium text-slate-900"></span>
                                </div>

                                <div class="flex justify-between gap-6">
                                    <span class="text-slate-500">NIF</span>
                                    <span id="review-nif" class="text-right font-medium text-slate-900"></span>
                                </div>

                            </div>

                        </div>


                        <div class="mt-5 rounded-2xl bg-indigo-50 p-5">

                            <p class="text-sm font-semibold text-indigo-900">
                                O que acontece agora?
                            </p>

                            <p class="mt-2 text-sm leading-6 text-indigo-700">
                                O FrotaPRO criará a organização, a empresa, o seu acesso
                                de administrador e iniciará a sessão automaticamente.
                                Os dados adicionais da empresa poderão ser completados
                                depois.
                            </p>

                        </div>


                        <div class="mt-6 grid gap-3 sm:grid-cols-2">

                            <button
                                type="button"
                                data-back-step
                                class="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition hover:bg-slate-50">
                                Voltar
                            </button>

                            <button
                                type="submit"
                                class="flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                                Criar empresa e entrar

                                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2" stroke-linecap="round">
                                    <path d="M5 12h14" />
                                    <path d="m13 6 6 6-6 6" />
                                </svg>
                            </button>

                        </div>

                    </div>

                </form>

            </section>

        </div>

    </main>

</div>


<script>
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('saas-register-form');

        if (!form) {
            return;
        }

        const panels = [...form.querySelectorAll('[data-step-panel]')];
        const indicators = [...document.querySelectorAll('[data-step-indicator]')];
        const label = document.getElementById('register-step-label');
        const progress = document.getElementById('register-progress');

        let step = Number(form.dataset.initialStep || 1);

        const fields = {
            name: document.getElementById('name'),
            email: document.getElementById('email'),
            phone: document.getElementById('phone'),
            password: document.getElementById('password'),
            passwordConfirmation: document.getElementById('password_confirmation'),
            company: document.getElementById('company_name'),
            nif: document.getElementById('company_nif'),
        };

        const review = {
            name: document.getElementById('review-name'),
            email: document.getElementById('review-email'),
            phone: document.getElementById('review-phone'),
            company: document.getElementById('review-company'),
            nif: document.getElementById('review-nif'),
        };

        function render() {
            panels.forEach((panel) => {
                panel.classList.toggle(
                    'hidden',
                    Number(panel.dataset.stepPanel) !== step
                );
            });

            indicators.forEach((indicator) => {
                const indicatorStep = Number(indicator.dataset.stepIndicator);
                const active = indicatorStep <= step;

                indicator.classList.toggle('bg-indigo-600', active);
                indicator.classList.toggle('text-white', active);
                indicator.classList.toggle('bg-slate-100', !active);
                indicator.classList.toggle('text-slate-500', !active);
            });

            label.textContent = `Passo ${step} de 3`;
            progress.style.width = `${step * 33.333333}%`;

            if (step === 3) {
                review.name.textContent = fields.name.value;
                review.email.textContent = fields.email.value;
                review.phone.textContent = fields.phone.value;
                review.company.textContent = fields.company.value;
                review.nif.textContent = fields.nif.value;
            }

            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }

        function validateStep() {
            const panel = panels.find(
                (item) => Number(item.dataset.stepPanel) === step
            );

            if (!panel) {
                return true;
            }

            const inputs = [...panel.querySelectorAll('input')];

            for (const input of inputs) {
                if (!input.checkValidity()) {
                    input.reportValidity();

                    return false;
                }
            }

            if (
                step === 1 &&
                fields.password.value !==
                fields.passwordConfirmation.value
            ) {
                fields.passwordConfirmation.setCustomValidity(
                    'As palavras-passe não coincidem.'
                );

                fields.passwordConfirmation.reportValidity();

                return false;
            }

            fields.passwordConfirmation.setCustomValidity('');

            return true;
        }

        form.querySelectorAll('[data-next-step]').forEach((button) => {
            button.addEventListener('click', () => {
                if (!validateStep()) {
                    return;
                }

                if (step < 3) {
                    step++;
                    render();
                }
            });
        });

        form.querySelectorAll('[data-back-step]').forEach((button) => {
            button.addEventListener('click', () => {
                if (step > 1) {
                    step--;
                    render();
                }
            });
        });


        fields.passwordConfirmation.addEventListener(
            'input',
            () => {
                fields.passwordConfirmation.setCustomValidity('');
            }
        );
        render();
    });
</script>
@endsection
