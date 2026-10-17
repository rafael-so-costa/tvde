<footer class="bg-slate-950 text-slate-400">
    <div class="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
        <div class="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-2 lg:grid-cols-5">
            <div class="lg:col-span-2">
                <a href="{{ route('site.home') }}" class="inline-flex items-center gap-3">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
                        <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-white" stroke-width="1.8">
                            <path d="M3 17V8.5A2.5 2.5 0 0 1 5.5 6H14v11" />
                            <path d="M14 10h3.3a2 2 0 0 1 1.7.94L21 14v3h-2" />
                            <path d="M6 17h8" />
                            <circle cx="5" cy="18" r="2" />
                            <circle cx="17" cy="18" r="2" />
                        </svg>
                    </span>

                    <span class="text-xl font-bold text-white">
                        Frota<span class="text-indigo-400">PRO</span>
                    </span>
                </a>

                <p class="mt-5 max-w-sm text-sm leading-7 text-slate-400">
                    Plataforma para centralizar a gestão e operação de empresas e frotas TVDE.
                </p>
            </div>

            <div>
                <h3 class="text-sm font-semibold text-white">
                    Plataforma
                </h3>

                <div class="mt-5 space-y-3 text-sm">
                    <a href="{{ route('site.home') }}#funcionalidades" class="block hover:text-white">
                        Funcionalidades
                    </a>

                    <a href="{{ route('site.ads.index') }}" class="block hover:text-white">
                        Anúncios
                    </a>

                    <a href="{{ route('site.blog.index') }}" class="block hover:text-white">
                        Blog
                    </a>
                </div>
            </div>

            <div>
                <h3 class="text-sm font-semibold text-white">
                    FrotaPRO
                </h3>

                <div class="mt-5 space-y-3 text-sm">
                    <a href="{{ route('site.register') }}" class="block hover:text-white">
                        Criar conta
                    </a>

                    <a href="{{ route('login') }}" class="block hover:text-white">
                        Entrar
                    </a>

                    <a href="{{ rtrim(config('app.url'), '/') . '/registo-expediente-publico' }}" class="block hover:text-white">
                        Registo de expediente
                    </a>
                </div>
            </div>

            <div>
                <h3 class="text-sm font-semibold text-white">
                    Legal
                </h3>

                <div class="mt-5 space-y-3 text-sm">
                    <a href="{{ route('site.legal.terms') }}" class="block hover:text-white">
                        Termos
                    </a>

                    <a href="{{ route('site.legal.privacy') }}" class="block hover:text-white">
                        Privacidade
                    </a>

                    <a href="{{ route('site.legal.cookies') }}" class="block hover:text-white">
                        Cookies
                    </a>
                </div>
            </div>
        </div>

        <div class="flex flex-col gap-3 pt-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
                &copy; {{ date('Y') }} FrotaPRO. Todos os direitos reservados.
            </p>

            <p>
                Gestão profissional para operações TVDE.
            </p>
        </div>
    </div>
</footer>