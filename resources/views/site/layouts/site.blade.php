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
</body>
</html>
