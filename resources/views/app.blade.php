<!DOCTYPE html>
<html lang="pt-PT">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- FROTAPRO_PUBLIC_META --}}
    @php
        $appSeo=app(\App\Services\SeoService::class)->resolve('global');

        $isPublicExpediente=
            request()->is('*registo-expediente-publico');

        $faviconPath=
            $appSeo['favicon_path'] ?? null;

        $socialPath=
            $appSeo['social_image_path']
            ?? $appSeo['og_image_path']
            ?? null;

        $faviconUrl=
            $faviconPath
                ? asset('storage/'.ltrim($faviconPath,'/'))
                : asset('favicon.svg');

        $socialUrl=
            $socialPath
                ? asset('storage/'.ltrim($socialPath,'/'))
                : null;
    @endphp

    <link
        rel="icon"
        href="{{ $faviconUrl }}"
    >

    <link
        rel="shortcut icon"
        href="{{ $faviconUrl }}"
    >
    <meta name="robots" content="noindex,nofollow">
    <title>{{ $isPublicExpediente ? 'Registo de Expediente — FrotaPRO' : 'FrotaPRO' }}</title>

    @if($isPublicExpediente)
        <meta
            name="description"
            content="Registe de forma simples e segura a entrada e saída do expediente no FrotaPRO."
        >

        <meta
            property="og:type"
            content="website"
        >

        <meta
            property="og:title"
            content="Registo de Expediente — FrotaPRO"
        >

        <meta
            property="og:description"
            content="Registo de entrada e saída de expediente para motoristas e operadores TVDE."
        >

        <meta
            property="og:url"
            content="{{ url()->current() }}"
        >

        @if($socialUrl)
            <meta
                property="og:image"
                content="{{ $socialUrl }}"
            >

            <meta
                name="twitter:image"
                content="{{ $socialUrl }}"
            >
        @endif

        <meta
            name="twitter:card"
            content="summary_large_image"
        >
    @endif
    @viteReactRefresh
    @vite(['resources/css/app.css','resources/js/main.tsx'])
    <script>
        window.__FROTAPRO__ = @json([
            'basePath' => config('app.web_base_path') ? : '',
        ]);
    </script>
</head>

<body>
    <div id="app"></div>
</body>

</html>
