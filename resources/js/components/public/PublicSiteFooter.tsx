import {
    appUrl,
} from "../../lib/runtime";

export default function PublicSiteFooter(){
    return (
        <footer className="bg-slate-950 text-slate-400">
            <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <a
                            href={appUrl("")}
                            className="text-lg font-bold text-white"
                        >
                            Frota
                            <span className="text-indigo-400">
                                PRO
                            </span>
                        </a>

                        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                            Gestão operacional para empresas e frotas TVDE.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                        <a
                            href={appUrl("")}
                            className="hover:text-white"
                        >
                            Início
                        </a>

                        <a
                            href={appUrl("anuncios")}
                            className="hover:text-white"
                        >
                            Anúncios
                        </a>

                        <a
                            href={appUrl("blog")}
                            className="hover:text-white"
                        >
                            Blog
                        </a>

                        <a
                            href={appUrl("registo-expediente-publico")}
                            className="hover:text-white"
                        >
                            Registo de expediente
                        </a>

                        <a
                            href={appUrl("termos")}
                            className="hover:text-white"
                        >
                            Termos
                        </a>

                        <a
                            href={appUrl("privacidade")}
                            className="hover:text-white"
                        >
                            Privacidade
                        </a>

                        <a
                            href={appUrl("cookies")}
                            className="hover:text-white"
                        >
                            Cookies
                        </a>
                    </div>

                    <p className="text-xs text-slate-500">
                        © {new Date().getFullYear()} FrotaPRO.
                    </p>
                </div>
            </div>
        </footer>
    );
}