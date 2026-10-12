<!DOCTYPE html>
<html lang="pt-PT" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="app-base-path" content="{{ config('app.web_base_path','') }}">

    <title>@yield('title','FrotaPRO — Gestão completa para operadores TVDE')</title>

    <meta name="description" content="@yield('description','Centralize motoristas, veículos, contratos, alugueres, documentação, manutenção e operação da sua frota TVDE no FrotaPRO.')">
    <meta name="robots" content="@yield('robots','index,follow')">

    <link rel="canonical" href="@yield('canonical',url()->current())">

    <meta property="og:type" content="website">
    <meta property="og:title" content="@yield('title','FrotaPRO — Gestão completa para operadores TVDE')">
    <meta property="og:description" content="@yield('description','Uma plataforma para gerir toda a operação da sua frota TVDE.')">
    <meta property="og:url" content="{{ url()->current() }}">

    @hasSection('og_image')
        <meta property="og:image" content="@yield('og_image')">
    @endif

    <meta name="twitter:card" content="summary_large_image">

    @vite([
        'resources/css/app.css',
        'resources/js/public-analytics.ts',
    ])
</head>

<body class="bg-white text-slate-950 antialiased" @yield('body_attributes')>
    @yield('content')

    <div id="cookie-consent" class="fixed inset-x-4 bottom-4 z-[100] hidden max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:left-auto sm:right-6 sm:w-[30rem]">
        <p class="font-semibold text-slate-900">
            Cookies no FrotaPRO
        </p>

        <p class="mt-2 text-sm leading-6 text-slate-500">
            Utilizamos cookies necessários ao funcionamento do serviço.
            Com a sua autorização, utilizamos também cookies analíticos próprios para compreender a utilização do website.
            <a href="{{ route('site.legal.cookies') }}" class="font-semibold text-indigo-600">Saber mais</a>.
        </p>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button id="cookie-essential" type="button" class="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Apenas necessários
            </button>

            <button id="cookie-all" type="button" class="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">
                Aceitar analíticos
            </button>
        </div>
    </div>

    <script>
        (() => {
            const key = 'frotapro_cookie_consent_v1';
            const banner = document.getElementById('cookie-consent');

            if (!banner) {
                return;
            }

            const preference = window.localStorage.getItem(key);

            if (!preference) {
                banner.classList.remove('hidden');
            }

            document.getElementById('cookie-essential')?.addEventListener('click', () => {
                window.localStorage.setItem(key, 'essential');
                banner.classList.add('hidden');
            });

            document.getElementById('cookie-all')?.addEventListener('click', () => {
                window.localStorage.setItem(key, 'all');
                window.location.reload();
            });
        })();
    </script>
</body>
</html>
