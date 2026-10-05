@extends('site.layouts.site')

@section('title','FrotaPRO Ads — Serviços para o ecossistema TVDE')

@section('description','Encontre serviços, fornecedores, soluções e oportunidades para empresas, gestores, motoristas e proprietários TVDE.')

@section('content')
<div class="min-h-screen bg-slate-50">

    <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div class="flex h-20 items-center justify-between">

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

                <nav class="hidden items-center gap-8 lg:flex">
                    <a href="/" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        Início
                    </a>

                    <a href="{{ route('site.ads.index') }}" class="text-sm font-semibold text-indigo-600">
                        Anúncios
                    </a>

                    <a href="/#funcionalidades" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        Funcionalidades
                    </a>

                    <a href="/#faq" class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                        FAQ
                    </a>
                </nav>

                <div class="flex items-center gap-3">
                    <a href="/login" class="hidden text-sm font-semibold text-slate-700 transition hover:text-indigo-600 sm:block">
                        Entrar
                    </a>

                    <a href="{{ route('site.register') }}" class="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                        Começar agora
                    </a>
                </div>

            </div>
        </div>
    </header>


    <main>

        <section class="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-slate-50 py-16 sm:py-20">

            <div class="pointer-events-none absolute inset-0">
                <div class="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl"></div>
                <div class="absolute -right-40 top-10 h-96 w-96 rounded-full bg-violet-300/20 blur-3xl"></div>
            </div>

            <div class="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                <div class="max-w-3xl">

                    <div class="inline-flex items-center rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
                        FrotaPRO Ads
                    </div>

                    <h1 class="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                        Serviços e soluções para o ecossistema TVDE.
                    </h1>

                    <p class="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                        Descubra fornecedores, serviços, produtos e parceiros relevantes para gestores de frota, motoristas e proprietários.
                    </p>

                </div>

            </div>

        </section>


        <section class="border-y border-slate-200 bg-white">
            <div class="mx-auto max-w-7xl px-5 py-5 sm:px-6 lg:px-8">

                <div class="flex gap-2 overflow-x-auto pb-1">

                    <a
                        href="{{ route('site.ads.index') }}"
                        class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition {{ $selectedCategory===''?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200' }}">
                        Todos
                    </a>

                    @foreach($categories as $category)

                    <a
                        href="{{ route('site.ads.index',['categoria'=>$category->slug]) }}"
                        class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition {{ $selectedCategory===$category->slug?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200' }}">
                        {{ $category->name }}
                    </a>

                    @endforeach

                </div>

            </div>
        </section>


        <section class="py-10 sm:py-14">
            <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                @if($campaigns->count())

                <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                    @foreach($campaigns as $ad)

                    <article
                        data-public-ad
                        data-delivery-token="{{ $ad['delivery_token'] }}"
                        class="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-900/5">

                        @if($ad['media_type']==='image' && $ad['image_url'])

                        <div class="aspect-[16/9] overflow-hidden bg-slate-100">
                            <picture>

                                @if($ad['mobile_image_url'])
                                <source
                                    media="(max-width:640px)"
                                    srcset="{{ $ad['mobile_image_url'] }}">
                                @endif

                                <img
                                    src="{{ $ad['image_url'] }}"
                                    alt="{{ $ad['alt_text'] ?: $ad['title'] }}"
                                    loading="lazy"
                                    class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]">
                            </picture>
                        </div>

                        @elseif($ad['media_type']==='video' && $ad['video_url'])

                        <div class="aspect-[16/9] overflow-hidden bg-slate-950">
                            <video
                                src="{{ $ad['video_url'] }}"
                                controls
                                playsinline
                                preload="metadata"
                                class="h-full w-full object-cover">
                            </video>
                        </div>

                        @endif


                        <div class="flex flex-1 flex-col p-6">

                            <div class="flex flex-wrap items-center gap-2">

                                <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                    {{ $ad['category']['name'] }}
                                </span>

                                @if($ad['source']==='saas')
                                <span class="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                    FrotaPRO
                                </span>
                                @else
                                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                                    Publicidade
                                </span>
                                @endif

                            </div>


                            <p class="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                {{ $ad['advertiser'] }}
                            </p>

                            <h2 class="mt-2 text-xl font-bold leading-snug text-slate-950">
                                {{ $ad['title'] }}
                            </h2>

                            @if($ad['description'])
                            <p class="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">
                                {{ $ad['description'] }}
                            </p>
                            @endif


                            @if($ad['click_url'] && $ad['cta_label'])

                            <div class="mt-auto pt-6">
                                <a
                                    href="{{ $ad['click_url'] }}"
                                    @if($ad['destination_type']!=='phone' )
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    @endif
                                    class="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700">

                                    {{ $ad['cta_label'] }}

                                </a>
                            </div>

                            @endif

                        </div>

                    </article>

                    @endforeach

                </div>


                <div class="mt-10">
                    {{ $campaigns->links() }}
                </div>

                @else

                <div class="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center">

                    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <svg viewBox="0 0 24 24" class="h-7 w-7 fill-none stroke-current" stroke-width="1.8">
                            <path d="M4 5h16v14H4z" />
                            <path d="M8 9h8" />
                            <path d="M8 13h5" />
                        </svg>
                    </div>

                    <h2 class="mt-5 text-xl font-bold text-slate-950">
                        Ainda não existem anúncios nesta categoria.
                    </h2>

                    <p class="mt-2 text-sm text-slate-500">
                        Consulte todas as categorias para descobrir outros serviços.
                    </p>

                    <a
                        href="{{ route('site.ads.index') }}"
                        class="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white">
                        Ver todos
                    </a>

                </div>

                @endif

            </div>
        </section>

    </main>


    <footer class="bg-slate-950 text-slate-400">
        <div class="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">

            <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <a href="/" class="text-lg font-bold text-white">
                    Frota<span class="text-indigo-400">PRO</span>
                </a>

                <div class="flex flex-wrap gap-5 text-sm">
                    <a href="/" class="hover:text-white">Início</a>
                    <a href="{{ route('site.ads.index') }}" class="hover:text-white">Anúncios</a>
                    <a href="/#funcionalidades" class="hover:text-white">Funcionalidades</a>
                    <a href="/#faq" class="hover:text-white">FAQ</a>
                </div>

                <p class="text-xs">
                    &copy; {{ date('Y') }} FrotaPRO.
                </p>

            </div>

        </div>
    </footer>

</div>

@vite('resources/js/public-ads-marketplace.ts')
@endsection
