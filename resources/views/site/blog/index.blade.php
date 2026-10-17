@extends('site.layouts.site')

@section('title',$seo['titulo'])
@section('description',$seo['descricao'])
@section('robots',$seo['robots'])

@section('content')
<div class="min-h-screen bg-slate-50">
    @include('site.partials.public-header',['active'=>'blog'])

    <main>
        <section class="relative overflow-hidden bg-slate-950">
            <div class="absolute inset-0">
                <div class="absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"></div>
                <div class="absolute right-0 top-0 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"></div>
            </div>

            <div class="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div class="mx-auto max-w-3xl text-center">
                    <p class="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                        Blog FrotaPRO
                    </p>

                    <h1 class="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Informação para gerir melhor a sua operação TVDE.
                    </h1>

                    <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                        Artigos, notícias, análises e conteúdos práticos para gestores, operadores, proprietários e motoristas.
                    </p>

                    <form
                        action="{{ route('site.blog.index') }}"
                        method="GET"
                        class="mx-auto mt-8 max-w-2xl">

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
                                maxlength="150"
                                placeholder="Pesquisar no Blog FrotaPRO..."
                                class="h-14 w-full rounded-2xl border border-white/10 bg-white pl-12 pr-28 text-base text-slate-900 shadow-2xl outline-none ring-4 ring-white/5 placeholder:text-slate-400 focus:ring-indigo-400/30">

                            <button
                                type="submit"
                                class="absolute right-2 top-2 inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700">
                                Pesquisar
                            </button>
                        </div>
                    </form>

                    @if($search!=='')
                        <div class="mt-4 text-sm text-slate-300">
                            {{ $posts->total() }}
                            {{ $posts->total()===1?'resultado':'resultados' }}
                            para
                            <strong class="text-white">
                                “{{ $search }}”
                            </strong>

                            <a
                                href="{{ route('site.blog.index',$selectedCategory!==''?['categoria'=>$selectedCategory]:[]) }}"
                                class="ml-2 font-semibold text-indigo-300 hover:text-white">
                                Limpar
                            </a>
                        </div>
                    @endif
                </div>
            </div>
        </section>

        @if($categories->count())
            <section class="border-b border-slate-200 bg-white">
                <div class="mx-auto max-w-7xl px-5 py-5 sm:px-6 lg:px-8">
                    <div class="flex gap-2 overflow-x-auto pb-1">
                        <a
                            href="{{ route('site.blog.index',array_filter(['q'=>$search])) }}"
                            class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition {{ $selectedCategory===''?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200' }}">
                            Todos
                        </a>

                        @foreach($categories as $category)
                            <a
                                href="{{ route('site.blog.index',array_filter([
                                    'categoria'=>$category->slug,
                                    'q'=>$search,
                                ])) }}"
                                class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition {{ $selectedCategory===$category->slug?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200' }}">
                                {{ $category->nome }}

                                <span class="ml-1 opacity-60">
                                    {{ $category->posts_count }}
                                </span>
                            </a>
                        @endforeach
                    </div>
                </div>
            </section>
        @endif

        <section class="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
            @if($posts->count())
                <div class="mb-7">
                    <p class="text-sm font-semibold text-indigo-600">
                        {{ $search!==''?'Pesquisa':'Conteúdo' }}
                    </p>

                    <h2 class="mt-1 text-2xl font-bold text-slate-950">
                        @if($search!=='')
                            Resultados encontrados
                        @elseif($selectedCategory!=='')
                            {{ optional($categories->firstWhere('slug',$selectedCategory))->nome }}
                        @else
                            Últimas publicações
                        @endif
                    </h2>
                </div>

                <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    @foreach($posts as $post)
                        <article class="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl">
                            <a
                                href="{{ route('site.blog.show',$post->slug) }}"
                                class="block aspect-[16/9] overflow-hidden bg-gradient-to-br from-indigo-50 to-slate-100">

                                @if($post->imagem_destaque_path)
                                    <img
                                        src="{{ Storage::disk('public')->url($post->imagem_destaque_path) }}"
                                        alt="{{ $post->titulo }}"
                                        loading="lazy"
                                        class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]">
                                @else
                                    <div class="flex h-full items-center justify-center text-2xl font-black text-indigo-200">
                                        FrotaPRO
                                    </div>
                                @endif
                            </a>

                            <div class="flex flex-1 flex-col p-6">
                                <div class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                                    <span class="text-indigo-600">
                                        {{ $post->tipo==='noticia'?'Notícia':'Artigo' }}
                                    </span>

                                    @foreach($post->categorias->take(2) as $categoria)
                                        <span class="text-slate-300">•</span>

                                        <span class="text-slate-500">
                                            {{ $categoria->nome }}
                                        </span>
                                    @endforeach
                                </div>

                                <h3 class="mt-3 text-xl font-bold leading-snug text-slate-950">
                                    <a
                                        href="{{ route('site.blog.show',$post->slug) }}"
                                        class="transition hover:text-indigo-600">
                                        {{ $post->titulo }}
                                    </a>
                                </h3>

                                @if($post->resumo)
                                    <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                                        {{ $post->resumo }}
                                    </p>
                                @endif

                                <div class="mt-auto flex items-center justify-between pt-6 text-xs text-slate-400">
                                    <span>
                                        {{ optional($post->publicado_em)->format('d/m/Y') }}
                                    </span>

                                    <span>
                                        {{ $post->tempo_leitura }} min
                                    </span>
                                </div>
                            </div>
                        </article>
                    @endforeach
                </div>

                <div class="mt-10">
                    {{ $posts->links() }}
                </div>
            @else
                <div class="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
                    <svg
                        viewBox="0 0 24 24"
                        class="mx-auto h-10 w-10 fill-none stroke-indigo-400"
                        stroke-width="1.7">
                        <circle cx="11" cy="11" r="7"></circle>
                        <path d="m20 20-3.5-3.5"></path>
                    </svg>

                    <h2 class="mt-5 text-xl font-bold text-slate-950">
                        Nenhum conteúdo encontrado.
                    </h2>

                    @if($search!=='')
                        <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                            Ainda não temos conteúdo para “{{ $search }}”.
                            Esta pesquisa foi registada para ajudar o FrotaPRO a identificar novos temas de interesse.
                        </p>
                    @endif

                    <a
                        href="{{ route('site.blog.index') }}"
                        class="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white">
                        Ver todos os artigos
                    </a>
                </div>
            @endif
        </section>
    </main>

    @include('site.partials.public-footer')
</div>
@endsection