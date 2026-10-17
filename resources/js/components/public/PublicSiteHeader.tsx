import {
    appUrl,
} from "../../lib/runtime";

type PublicSiteHeaderProps={
    active?:
        |"home"
        |"ads"
        |"blog"
        |"expediente"
        |"register";
};

export default function PublicSiteHeader({
    active,
}:PublicSiteHeaderProps){
    function navClass(
        key:PublicSiteHeaderProps["active"],
    ):string{
        return [
            "text-sm font-medium transition",
            active===key
                ?"font-semibold text-indigo-600"
                :"text-slate-600 hover:text-indigo-600",
        ].join(" ");
    }

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    <a
                        href={appUrl("")}
                        className="flex items-center gap-3"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
                            <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5 fill-none stroke-white"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M3 17V8.5A2.5 2.5 0 0 1 5.5 6H14v11"/>
                                <path d="M14 10h3.3a2 2 0 0 1 1.7.94L21 14v3h-2"/>
                                <path d="M6 17h8"/>
                                <circle cx="5" cy="18" r="2"/>
                                <circle cx="17" cy="18" r="2"/>
                            </svg>
                        </span>

                        <span>
                            <span className="block text-xl font-bold tracking-tight text-slate-950">
                                Frota
                                <span className="text-indigo-600">
                                    PRO
                                </span>
                            </span>

                            <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Gestão TVDE
                            </span>
                        </span>
                    </a>

                    <nav className="hidden items-center gap-7 lg:flex">
                        <a
                            href={appUrl("")}
                            className={navClass("home")}
                        >
                            Início
                        </a>

                        <a
                            href={appUrl("#funcionalidades")}
                            className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                        >
                            Funcionalidades
                        </a>

                        <a
                            href={appUrl("anuncios")}
                            className={navClass("ads")}
                        >
                            Anúncios
                        </a>

                        <a
                            href={appUrl("blog")}
                            className={navClass("blog")}
                        >
                            Blog
                        </a>

                        <a
                            href={appUrl("registo-expediente-publico")}
                            className={navClass("expediente")}
                        >
                            Registo de expediente
                        </a>

                        <a
                            href={appUrl("#faq")}
                            className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                        >
                            FAQ
                        </a>
                    </nav>

                    <div className="hidden items-center gap-4 lg:flex">
                        <a
                            href={appUrl("login")}
                            className="text-sm font-semibold text-slate-700 transition hover:text-indigo-600"
                        >
                            Entrar
                        </a>

                        <a
                            href={appUrl("registar")}
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
                        >
                            Começar agora
                        </a>
                    </div>

                    <details className="relative lg:hidden">
                        <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                            <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5 fill-none stroke-current"
                                strokeWidth="2"
                                strokeLinecap="round"
                            >
                                <path d="M4 6h16"/>
                                <path d="M4 12h16"/>
                                <path d="M4 18h16"/>
                            </svg>
                        </summary>

                        <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10">
                            <nav className="space-y-1">
                                <MobileLink href={appUrl("")}>
                                    Início
                                </MobileLink>

                                <MobileLink href={appUrl("#funcionalidades")}>
                                    Funcionalidades
                                </MobileLink>

                                <MobileLink href={appUrl("anuncios")}>
                                    Anúncios
                                </MobileLink>

                                <MobileLink href={appUrl("blog")}>
                                    Blog
                                </MobileLink>

                                <MobileLink href={appUrl("registo-expediente-publico")}>
                                    Registo de expediente
                                </MobileLink>

                                <MobileLink href={appUrl("#faq")}>
                                    FAQ
                                </MobileLink>
                            </nav>

                            <div className="mt-3 border-t border-slate-100 pt-3">
                                <a
                                    href={appUrl("login")}
                                    className="flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-slate-700"
                                >
                                    Entrar
                                </a>

                                <a
                                    href={appUrl("registar")}
                                    className="mt-2 flex h-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white"
                                >
                                    Começar agora
                                </a>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </header>
    );
}

function MobileLink({
    href,
    children,
}:{
    href:string;
    children:string;
}){
    return (
        <a
            href={href}
            className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
            {children}
        </a>
    );
}