@extends('site.layouts.site')

@section('title','Política de Cookies — FrotaPRO')
@section('description','Informação sobre cookies e tecnologias semelhantes utilizadas pelo FrotaPRO.')

@section('content')
<div class="min-h-screen bg-slate-50">
@include('site.legal._header')

<main class="mx-auto max-w-4xl px-5 py-14 sm:px-6 lg:px-8">
    <p class="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Privacidade</p>
    <h1 class="mt-3 text-4xl font-bold tracking-tight text-slate-950">Política de Cookies</h1>
    <p class="mt-4 text-sm text-slate-500">Última atualização: {{ config('legal.last_updated') }}</p>

    <div class="mt-10 space-y-10 text-[15px] leading-7 text-slate-600">

        <section>
            <h2 class="text-xl font-bold text-slate-900">1. O que são cookies</h2>
            <p class="mt-3">
                Cookies são pequenos elementos de informação utilizados pelo navegador para manter sessões, memorizar preferências e, quando autorizado, permitir medição estatística da utilização do serviço.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">2. Cookies estritamente necessários</h2>
            <p class="mt-3">
                São utilizados cookies técnicos necessários ao funcionamento do website e da aplicação, incluindo proteção contra pedidos indevidos, autenticação, sessão e segurança.
                Estes cookies não são utilizados para publicidade comportamental.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">3. Cookies analíticos</h2>
            <p class="mt-3">
                Mediante autorização do utilizador, o FrotaPRO utiliza medição estatística própria para compreender visitas, sessões e utilização do conteúdo público.
            </p>

            <div class="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div class="grid grid-cols-[1.2fr_1fr_1fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Cookie</span>
                    <span>Finalidade</span>
                    <span>Duração</span>
                </div>

                <div class="grid grid-cols-[1.2fr_1fr_1fr] px-4 py-4 text-sm">
                    <span class="font-medium text-slate-800">fp_analytics_visitor</span>
                    <span>Visitante estatístico</span>
                    <span>Até 12 meses</span>
                </div>

                <div class="grid grid-cols-[1.2fr_1fr_1fr] border-t border-slate-100 px-4 py-4 text-sm">
                    <span class="font-medium text-slate-800">fp_analytics_session</span>
                    <span>Sessão estatística</span>
                    <span>30 minutos</span>
                </div>
            </div>

            <p class="mt-4">
                Estes cookies analíticos apenas são utilizados quando o utilizador aceita a respetiva categoria.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">4. Prestadores externos</h2>
            <p class="mt-3">
                Algumas funcionalidades, como pagamentos, poderão redirecionar o utilizador para serviços externos.
                Esses prestadores poderão utilizar cookies próprios de acordo com as respetivas políticas e apenas no contexto da interação com o serviço externo.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">5. Alterar a preferência</h2>
            <p class="mt-3">
                Pode alterar a decisão relativa aos cookies analíticos a qualquer momento.
            </p>

            <button
                type="button"
                onclick="localStorage.removeItem('frotapro_cookie_consent_v1'); window.location.reload();"
                class="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">
                Alterar preferências de cookies
            </button>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">6. Contacto</h2>
            <p class="mt-3">
                Para questões relacionadas com privacidade consulte a
                <a href="{{ route('site.legal.privacy') }}" class="font-semibold text-indigo-600">Política de Privacidade</a>.
            </p>
        </section>
    </div>
</main>

@include('site.legal._footer')
</div>
@endsection