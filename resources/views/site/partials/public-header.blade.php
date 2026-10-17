@php
    $active=$active??'';
    $homeUrl=route('site.home');
@endphp

<header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div class="flex h-20 items-center justify-between gap-4">
            <a href="{{ route('site.home') }}" class="flex shrink-0 items-center gap-3">
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

            <nav class="hidden items-center gap-7 lg:flex">
                <a
                    href="{{ route('site.home') }}"
                    class="text-sm font-semibold transition {{ $active==='home'?'text-indigo-600':'text-slate-600 hover:text-indigo-600' }}">
                    Início
                </a>

                <a
                    href="{{ route('site.home') }}#funcionalidades"
                    class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                    Funcionalidades
                </a>

                <a
                    href="{{ route('site.ads.index') }}"
                    class="text-sm font-semibold transition {{ $active==='ads'?'text-indigo-600':'text-slate-600 hover:text-indigo-600' }}">
                    Anúncios
                </a>

                <a
                    href="{{ route('site.blog.index') }}"
                    class="text-sm font-semibold transition {{ $active==='blog'?'text-indigo-600':'text-slate-600 hover:text-indigo-600' }}">
                    Blog
                </a>

                <a
                    href="{{ rtrim(config('app.url'), '/') . '/registo-expediente-publico' }}"
                    class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                    Expediente
                </a>

                <a
                    href="{{ route('site.home') }}#faq"
                    class="text-sm font-medium text-slate-600 transition hover:text-indigo-600">
                    FAQ
                </a>
            </nav>

            <div class="hidden items-center gap-3 lg:flex">
                <a
                    href="{{ route('login') }}"
                    class="text-sm font-semibold text-slate-700 transition hover:text-indigo-600">
                    Entrar
                </a>

                <a
                    href="{{ route('site.register') }}"
                    class="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                    Criar conta
                </a>
            </div>

            <details class="relative lg:hidden">
                <summary class="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                    <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="2" stroke-linecap="round">
                        <path d="M4 6h16" />
                        <path d="M4 12h16" />
                        <path d="M4 18h16" />
                    </svg>
                </summary>

                <div class="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10">
                    <nav class="space-y-1">
                        <a href="{{ route('site.home') }}" class="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Início
                        </a>

                        <a href="{{ route('site.home') }}#funcionalidades" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Funcionalidades
                        </a>

                        <a href="{{ route('site.ads.index') }}" class="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Anúncios
                        </a>

                        <a href="{{ route('site.blog.index') }}" class="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Blog
                        </a>

                        <a href="{{ rtrim(config('app.url'), '/') . '/registo-expediente-publico' }}" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Registo de expediente
                        </a>

                        <a href="{{ route('site.home') }}#faq" class="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            FAQ
                        </a>
                    </nav>

                    <div class="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                        <a href="{{ route('login') }}" class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                            Entrar
                        </a>

                        <a href="{{ route('site.register') }}" class="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white">
                            Criar conta
                        </a>
                    </div>
                </div>
            </details>
        </div>
    </div>
</header>