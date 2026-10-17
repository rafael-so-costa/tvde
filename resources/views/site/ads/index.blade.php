@extends('site.layouts.site')

@php
    $seoOgImage=$seo['og_image_path']??null;

    if(
        $seoOgImage &&
        !\Illuminate\Support\Str::startsWith(
            $seoOgImage,
            ['http://','https://']
        )
    ){
        $seoOgImage=
            \Illuminate\Support\Facades\Storage::disk(
                'public'
            )->url(
                $seoOgImage
            );
    }

    $selectedCategoryModel=
        $selectedCategory!==''
            ? $categories->firstWhere(
                'slug',
                $selectedCategory
            )
            : null;
@endphp

@section('title',$seo['titulo'])
@section('description',$seo['descricao'])
@section('robots',$seo['robots'])
@section('canonical',$seo['canonical_url']?:route('site.ads.index'))
@section('og_title',$seo['og_title'])
@section('og_description',$seo['og_description'])
@section('twitter_card',$seo['twitter_card'])

@if($seoOgImage)
@section('og_image',$seoOgImage)
@endif

@section('content')
<div class="min-h-screen bg-slate-50">
    @include('site.partials.public-header',['active'=>'ads'])

    <main>
        <section class="relative overflow-visible bg-slate-950">
            <div class="absolute inset-0 overflow-hidden">
                <div class="absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"></div>
                <div class="absolute right-0 top-0 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"></div>
            </div>

            <div class="relative mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
                <div class="mx-auto max-w-3xl text-center">
                    <div class="inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-200">
                        Marketplace FrotaPRO
                    </div>

                    <h1 class="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Encontre soluções para a sua operação TVDE.
                    </h1>

                    <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                        Pesquise serviços, fornecedores, produtos e parceiros especializados no ecossistema TVDE.
                    </p>

                    <form
                        action="{{ route('site.ads.index') }}"
                        method="GET"
                        class="relative mx-auto mt-8 max-w-2xl"
                        data-ad-search-form>

                        @if($selectedCategory!=='')
                            <input
                                type="hidden"
                                name="categoria"
                                value="{{ $selectedCategory }}">
                        @endif

                        <div class="relative">
                            <svg
                                viewBox="0 0 24 24"
                                class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-slate-400"
                                stroke-width="2">
                                <circle cx="11" cy="11" r="7"></circle>
                                <path d="m20 20-3.5-3.5"></path>
                            </svg>

                            <input
                                type="search"
                                name="q"
                                value="{{ $search }}"
                                autocomplete="off"
                                placeholder="Pesquise oficinas, seguros, carregamento, serviços..."
                                data-ad-search
                                class="h-14 w-full rounded-2xl border border-white/10 bg-white pl-12 pr-28 text-base text-slate-900 shadow-2xl outline-none ring-4 ring-white/5 placeholder:text-slate-400 focus:ring-indigo-400/30">

                            <button
                                type="submit"
                                class="absolute right-2 top-2 inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700">
                                Pesquisar
                            </button>
                        </div>

                        <div
                            data-ad-suggestions
                            class="absolute inset-x-0 top-full z-50 mt-2 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl">
                        </div>
                    </form>

                    @if($search!=='')
                        <div class="mt-4 text-sm text-slate-300">
                            Resultados para
                            <strong class="text-white">
                                “{{ $search }}”
                            </strong>

                            <a
                                href="{{ route('site.ads.index',$selectedCategory!==''?['categoria'=>$selectedCategory]:[]) }}"
                                class="ml-2 font-semibold text-indigo-300 hover:text-white">
                                Limpar pesquisa
                            </a>
                        </div>
                    @endif
                </div>
            </div>
        </section>

        @if($categories->count())
            <section class="border-b border-slate-200 bg-white">
                <div class="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
                    <div class="mb-5 flex items-end justify-between gap-4">
                        <div>
                            <p class="text-sm font-semibold text-indigo-600">
                                Explorar
                            </p>

                            <h2 class="mt-1 text-xl font-bold text-slate-950">
                                Categorias com anúncios disponíveis
                            </h2>
                        </div>

                        @if($selectedCategory!=='')
                            <a
                                href="{{ route('site.ads.index',$search!==''?['q'=>$search]:[]) }}"
                                class="text-sm font-semibold text-indigo-600">
                                Ver todas
                            </a>
                        @endif
                    </div>

                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        @foreach($categories as $category)
                            <a
                                href="{{ route('site.ads.index',array_filter([
                                    'categoria'=>$category->slug,
                                    'q'=>$search,
                                ])) }}"
                                class="group flex items-center justify-between gap-4 rounded-2xl border p-4 transition {{ $selectedCategory===$category->slug?'border-indigo-300 bg-indigo-50':'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40' }}">

                                <div class="min-w-0">
                                    <div class="truncate text-sm font-bold {{ $selectedCategory===$category->slug?'text-indigo-700':'text-slate-900' }}">
                                        {{ $category->name }}
                                    </div>

                                    <div class="mt-1 text-xs text-slate-400">
                                        {{ $category->campaigns_count }}
                                        {{ $category->campaigns_count===1?'anúncio':'anúncios' }}
                                    </div>
                                </div>

                                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition group-hover:bg-indigo-100 group-hover:text-indigo-600">
                                    →
                                </span>
                            </a>
                        @endforeach
                    </div>
                </div>
            </section>
        @endif

        <section class="py-10 sm:py-14">
            <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                <div class="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p class="text-sm font-semibold text-indigo-600">
                            Marketplace
                        </p>

                        <h2 class="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                            @if($selectedCategoryModel)
                                {{ $selectedCategoryModel->name }}
                            @elseif($search!=='')
                                Resultados da pesquisa
                            @else
                                Todos os anúncios
                            @endif
                        </h2>
                    </div>

                    <p class="text-sm text-slate-500">
                        {{ $campaigns->total() }}
                        {{ $campaigns->total()===1?'resultado':'resultados' }}
                    </p>
                </div>

                @if($campaigns->count())
                    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        @foreach($campaigns as $ad)
                            <article
                                data-public-ad
                                data-delivery-token="{{ $ad['delivery_token'] }}"
                                class="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-900/5">

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
                                                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]">
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
                                @else
                                    <div class="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100">
                                        <svg viewBox="0 0 24 24" class="h-14 w-14 fill-none stroke-indigo-300" stroke-width="1.5">
                                            <path d="M4 5h16v14H4z" />
                                            <path d="M8 9h8" />
                                            <path d="M8 13h5" />
                                        </svg>
                                    </div>
                                @endif

                                <div class="flex flex-1 flex-col p-6">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <a
                                            href="{{ route('site.ads.index',['categoria'=>$ad['category']['slug']]) }}"
                                            class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
                                            {{ $ad['category']['name'] }}
                                        </a>

                                        <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            {{ $ad['source']==='saas'?'FrotaPRO':'Publicidade' }}
                                        </span>
                                    </div>

                                    <p class="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        {{ $ad['advertiser'] }}
                                    </p>

                                    <h3 class="mt-2 text-xl font-bold leading-snug text-slate-950">
                                        {{ $ad['title'] }}
                                    </h3>

                                    @if($ad['description'])
                                        <p class="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">
                                            {{ $ad['description'] }}
                                        </p>
                                    @endif

                                    @if($ad['click_url'] && $ad['cta_label'])
                                        <div class="mt-auto pt-6">
                                            <a
                                                href="{{ $ad['click_url'] }}"
                                                @if($ad['destination_type']!=='phone')
                                                    target="_blank"
                                                    rel="noopener noreferrer sponsored"
                                                @endif
                                                class="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-600">
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
                    <div class="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
                        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <svg viewBox="0 0 24 24" class="h-7 w-7 fill-none stroke-current" stroke-width="1.8">
                                <circle cx="11" cy="11" r="7"></circle>
                                <path d="m20 20-3.5-3.5"></path>
                            </svg>
                        </div>

                        <h2 class="mt-5 text-xl font-bold text-slate-950">
                            Nenhum anúncio encontrado.
                        </h2>

                        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Tente outra pesquisa ou consulte as categorias que possuem anúncios disponíveis.
                        </p>

                        <a
                            href="{{ route('site.ads.index') }}"
                            class="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white">
                            Ver todos os anúncios
                        </a>
                    </div>
                @endif
            </div>
        </section>
    </main>

    @include('site.partials.public-footer')
</div>

<script
    id="ad-search-suggestions"
    type="application/json">@json($suggestions)</script>

@vite('resources/js/public-ads-marketplace.ts')
@endsection