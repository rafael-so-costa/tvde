@extends('site.layouts.site')

@php
    $articleSocialPath=
        $post->og_image_path
        ?: $post->imagem_destaque_path
        ?: $post->imagem_capa_path;
@endphp

@if($articleSocialPath)
    @section(
        'og_image',
        asset(
            'storage/'.
            ltrim(
                $articleSocialPath,
                '/'
            )
        )
    )
@endif

@section('title',$seo['titulo'])
@section('description',$seo['descricao'])
@section('robots',$seo['robots'])

@section('body_attributes')
data-analytics-content-id="{{ $post->id }}"
@endsection

@section('content')
<div class="min-h-screen bg-white">
    @include('site.partials.public-header',['active'=>'blog'])

    <main>
        <header class="border-b border-slate-200 bg-slate-50">
            <div class="mx-auto max-w-4xl px-5 py-12 sm:px-6 lg:py-16">
                <a
                    href="{{ route('site.blog.index') }}"
                    class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    ← Voltar ao Blog
                </a>

                <div class="mt-8 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                    <span class="text-indigo-600">
                        {{ $post->tipo==='noticia'?'Notícia':'Artigo' }}
                    </span>

                    @foreach($post->categorias as $categoria)
                        <span class="text-slate-300">•</span>

                        <a
                            href="{{ route('site.blog.index',['categoria'=>$categoria->slug]) }}"
                            class="text-slate-500 hover:text-indigo-600">
                            {{ $categoria->nome }}
                        </a>
                    @endforeach
                </div>

                <h1 class="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                    {{ $post->titulo }}
                </h1>

                @if($post->resumo)
                    <p class="mt-6 max-w-3xl text-xl leading-8 text-slate-600">
                        {{ $post->resumo }}
                    </p>
                @endif

                <div class="mt-7 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    @if($post->autor)
                        <span class="font-medium text-slate-700">
                            {{ $post->autor->name }}
                        </span>
                    @endif

                    <span>
                        {{ optional($post->publicado_em)->format('d/m/Y') }}
                    </span>

                    <span>
                        {{ $post->tempo_leitura }} min de leitura
                    </span>
                </div>
            </div>
        </header>

        @php
            $imagemCapa=$post->imagem_capa_path ?: $post->imagem_destaque_path;
        @endphp

        @if($imagemCapa)
            <div class="mx-auto max-w-5xl px-5 pt-10 sm:px-6">
                <img
                    src="{{ Storage::disk('public')->url($imagemCapa) }}"
                    alt="{{ $post->titulo }}"
                    class="aspect-[16/8] w-full rounded-3xl object-cover shadow-sm">
            </div>
        @endif

        <div class="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:px-8 lg:py-16">

            {{-- CORPO DO ARTIGO: NUNCA INSERIR PUBLICIDADE AQUI --}}
            <article class="min-w-0">
                <div class="
                    mx-auto max-w-3xl
                    text-[17px] leading-8 text-slate-700
                    [&_p]:my-5
                    [&_h2]:mb-4
                    [&_h2]:mt-10
                    [&_h2]:text-3xl
                    [&_h2]:font-bold
                    [&_h2]:tracking-tight
                    [&_h2]:text-slate-950
                    [&_h3]:mb-3
                    [&_h3]:mt-8
                    [&_h3]:text-2xl
                    [&_h3]:font-bold
                    [&_h3]:text-slate-950
                    [&_ul]:my-5
                    [&_ul]:list-disc
                    [&_ul]:pl-7
                    [&_ol]:my-5
                    [&_ol]:list-decimal
                    [&_ol]:pl-7
                    [&_blockquote]:my-8
                    [&_blockquote]:border-l-4
                    [&_blockquote]:border-indigo-300
                    [&_blockquote]:pl-6
                    [&_blockquote]:italic
                    [&_a]:font-semibold
                    [&_a]:text-indigo-600
                    [&_img]:my-8
                    [&_img]:w-full
                    [&_img]:rounded-2xl
                ">
                    {!! $post->conteudo !!}
                </div>

                @if($post->tags->count())
                    <div class="mx-auto mt-12 max-w-3xl border-t border-slate-200 pt-8">
                        <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Tags
                        </p>

                        <div class="flex flex-wrap gap-2">
                            @foreach($post->tags as $tag)
                                <span class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                    {{ $tag->nome }}
                                </span>
                            @endforeach
                        </div>
                    </div>
                @endif

                {{-- No mobile o anúncio lateral vem SOMENTE após o artigo --}}
                @if($sidebarAd)
                    <div class="mx-auto mt-10 max-w-3xl lg:hidden">
                        @include('site.partials.blog-ad',[
                            'ad'=>$sidebarAd,
                            'variant'=>'sidebar',
                        ])
                    </div>
                @endif
            </article>

            {{-- PUBLICIDADE LATERAL - DESKTOP --}}
            <aside class="hidden lg:block">
                @if($sidebarAd)
                    <div class="sticky top-28">
                        @include('site.partials.blog-ad',[
                            'ad'=>$sidebarAd,
                            'variant'=>'sidebar',
                        ])
                    </div>
                @endif
            </aside>
        </div>

        {{-- CONTEUDOS RELACIONADOS --}}
        @if($related->count())
            <section class="border-t border-slate-200 bg-slate-50">
                <div class="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
                    <div class="mb-7">
                        <p class="text-sm font-semibold text-indigo-600">
                            Continue a leitura
                        </p>

                        <h2 class="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                            Conteúdos relacionados
                        </h2>
                    </div>

                    <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        @foreach($related as $relatedPost)
                            <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-indigo-200 hover:shadow-lg">
                                <a href="{{ route('site.blog.show',$relatedPost->slug) }}">
                                    @if($relatedPost->imagem_destaque_path)
                                        <img
                                            src="{{ Storage::disk('public')->url($relatedPost->imagem_destaque_path) }}"
                                            alt="{{ $relatedPost->titulo }}"
                                            loading="lazy"
                                            class="aspect-[16/9] w-full object-cover">
                                    @else
                                        <div class="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 text-xl font-black text-indigo-200">
                                            FrotaPRO
                                        </div>
                                    @endif
                                </a>

                                <div class="p-5">
                                    @if($relatedPost->categorias->first())
                                        <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                            {{ $relatedPost->categorias->first()->nome }}
                                        </p>
                                    @endif

                                    <h3 class="mt-2 font-bold leading-snug text-slate-950">
                                        <a
                                            href="{{ route('site.blog.show',$relatedPost->slug) }}"
                                            class="hover:text-indigo-600">
                                            {{ $relatedPost->titulo }}
                                        </a>
                                    </h3>

                                    <div class="mt-4 text-xs text-slate-400">
                                        {{ $relatedPost->tempo_leitura }} min de leitura
                                    </div>
                                </div>
                            </article>
                        @endforeach
                    </div>
                </div>
            </section>
        @endif

        {{-- PUBLICIDADE DE RODAPE DO ARTIGO --}}
        @if($footerAd)
            <section class="border-t border-slate-200 bg-white">
                <div class="mx-auto max-w-5xl px-5 py-10 sm:px-6">
                    @include('site.partials.blog-ad',[
                        'ad'=>$footerAd,
                        'variant'=>'footer',
                    ])
                </div>
            </section>
        @endif
    </main>

    @include('site.partials.public-footer')
</div>

@vite('resources/js/public-ads-marketplace.ts')
@endsection