@extends('site.layouts.site')

@section('title',$seo['titulo'])
@section('description',$seo['descricao'])
@section('robots',$seo['robots'])

@section('body_attributes')
data-analytics-content-id="{{ $post->id }}"
@endsection

@section('content')
<article class="bg-white">
    <header class="border-b border-slate-200 bg-slate-50">
        <div class="mx-auto max-w-4xl px-5 py-14 sm:px-6 lg:py-20">
            <div class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <span class="text-indigo-600">{{ $post->tipo==='noticia'?'Notícia':'Artigo' }}</span>

                @if($post->categoria)
                    <span class="text-slate-300">•</span>
                    <span class="text-slate-500">{{ $post->categoria->nome }}</span>
                @endif
            </div>

            <h1 class="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">{{ $post->titulo }}</h1>

            @if($post->resumo)
                <p class="mt-6 text-xl leading-8 text-slate-600">{{ $post->resumo }}</p>
            @endif

            <div class="mt-7 flex flex-wrap gap-4 text-sm text-slate-500">
                @if($post->autor)<span>{{ $post->autor->name }}</span>@endif
                <span>{{ optional($post->publicado_em)->format('d/m/Y') }}</span>
                <span>{{ $post->tempo_leitura }} min de leitura</span>
            </div>
        </div>
    </header>

    @if($post->imagem_destaque_path)
        <div class="mx-auto max-w-5xl px-5 pt-10 sm:px-6">
            <img src="{{ Storage::disk('public')->url($post->imagem_destaque_path) }}" alt="{{ $post->titulo }}" class="w-full rounded-3xl object-cover">
        </div>
    @endif

    <div class="mx-auto max-w-3xl px-5 py-12 sm:px-6 lg:py-16">
        <div class="whitespace-pre-line text-[17px] leading-8 text-slate-700">{{ $post->conteudo }}</div>

        @if($post->tags->count())
            <div class="mt-12 flex flex-wrap gap-2 border-t border-slate-200 pt-8">
                @foreach($post->tags as $tag)
                    <span class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{{ $tag->nome }}</span>
                @endforeach
            </div>
        @endif
    </div>
</article>
@endsection
