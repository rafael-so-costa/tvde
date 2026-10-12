<header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <a href="{{ route('site.home') }}" class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">F</span>
            <span class="text-xl font-bold text-slate-950">Frota<span class="text-indigo-600">PRO</span></span>
        </a>

        <div class="flex items-center gap-5 text-sm font-semibold">
            <a href="{{ route('site.home') }}" class="text-slate-500 hover:text-indigo-600">Início</a>
            <a href="{{ route('login') }}" class="text-indigo-600 hover:text-indigo-700">Entrar</a>
        </div>
    </div>
</header>