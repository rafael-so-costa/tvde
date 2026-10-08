@extends('site.layouts.site')

@section('title',$seo['titulo'])
@section('description',$seo['descricao'])
@section('robots',$seo['robots'])

@section('content')
<div class="min-h-screen bg-slate-50">
    <section class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Conteúdo FrotaPRO</p>
            <h1 class="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Informação para uma gestão TVDE mais eficiente.</h1>
            <p class="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Artigos, análises, novidades e informação útil para gestores, operadores e profissionais do ecossistema TVDE.</p>
        </div>
    </section>

    <section class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-5 sm:px-6 lg:px-8">
            <a href="{{ route('site.blog.index') }}" class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold {{ $selectedCategory===''?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600' }}">Todos</a>

            @foreach($categories as $category)
                <a href="{{ route('site.blog.index',['categoria'=>$category->slug]) }}" class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold {{ $selectedCategory===$category->slug?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600' }}">
                    {{ $category->name }} <span class="opacity-60">{{ $category->posts_count }}</span>
                </a>
            @endforeach
        </div>
    </section>

    <main class="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        @if($posts->count())
            <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                @foreach($posts as $post)
                    <article class="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                        @if($post->imagem_destaque_path)
                            <img src="{{ Storage::disk('public')->url($post->imagem_destaque_path) }}" alt="{{ $post->titulo }}" class="aspect-[16/9] w-full object-cover" loading="lazy">
                        @endif

                        <div class="flex flex-1 flex-col p-6">
                            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                                <span class="text-indigo-600">{{ $post->tipo==='noticia'?'Notícia':'Artigo' }}</span>

                                @if($post->categoria)
                                    <span class="text-slate-300">•</span>
                                    <span class="text-slate-500">{{ $post->categoria->nome }}</span>
                                @endif
                            </div>

                            <h2 class="mt-3 text-xl font-bold leading-snug text-slate-950">
                                <a href="{{ route('site.blog.show',$post->slug) }}">{{ $post->titulo }}</a>
                            </h2>

                            @if($post->resumo)
                                <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{{ $post->resumo }}</p>
                            @endif

                            <div class="mt-auto flex items-center justify-between pt-6 text-xs text-slate-400">
                                <span>{{ optional($post->publicado_em)->format('d/m/Y') }}</span>
                                <span>{{ $post->tempo_leitura }} min de leitura</span>
                            </div>
                        </div>
                    </article>
                @endforeach
            </div>

            <div class="mt-10">{{ $posts->links() }}</div>
        @else
            <div class="rounded-3xl border border-slate-200 bg-white py-20 text-center">
                <h2 class="text-xl font-bold text-slate-950">Ainda não existem conteúdos publicados nesta categoria.</h2>
            </div>
        @endif
    </main>
</div>
@endsection
