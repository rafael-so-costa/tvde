<footer class="mt-16 border-t border-slate-200 bg-slate-950 text-slate-400">
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-6 lg:px-8">
        <div class="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <a href="{{ route('site.legal.terms') }}" class="hover:text-white">Termos de utilização</a>
            <a href="{{ route('site.legal.privacy') }}" class="hover:text-white">Política de privacidade</a>
            <a href="{{ route('site.legal.cookies') }}" class="hover:text-white">Política de cookies</a>
        </div>

        <div class="text-xs text-slate-500">
            &copy; {{ date('Y') }} FrotaPRO. Todos os direitos reservados.
        </div>
    </div>
</footer>