import { useEffect, useState } from "react";

import {
    Activity,
    BellRing,
    BookOpenText,
    Building2,
    CreditCard,
    Database,
    DatabaseZap,
    FileClock,
    FileText,
    LayoutDashboard,
    Layers3,
    LifeBuoy,
    LogOut,
    Megaphone,
    Menu,
    MessageSquareText,
    Rows3,
    ShieldCheck,
    Tag,
    Truck,
    UsersRound,
    X,
} from "lucide-react";

import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

import ChatUnreadBadge from "../components/chat/ChatUnreadBadge";

import HelpdeskUnreadBadge from "../components/helpdesk/HelpdeskUnreadBadge";

export default function BackofficeShell() {
    const { user, logout } = useAuth();

    const location = useLocation();

    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!mobileOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMobileOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;

            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [mobileOpen]);

    const navClass = ({ isActive }: { isActive: boolean }) =>
        [
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",

            isActive
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-950/40"
                : "text-slate-400 hover:bg-white/5 hover:text-white",
        ].join(" ");

    async function handleLogout() {
        setMobileOpen(false);

        await logout();
    }

    const sidebar = (
        <div className="flex h-full flex-col bg-slate-950 text-slate-300">
            <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-5 sm:px-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500">
                    <Truck className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0">
                    <div className="truncate text-xl font-bold tracking-tight text-white">
                        FrotaPRO
                    </div>

                    <div className="truncate text-[10px] uppercase tracking-[0.18em] text-indigo-300">
                        SaaS Backoffice
                    </div>
                </div>

                <button
                    type="button"
                    aria-label="Fechar menu"
                    onClick={() => setMobileOpen(false)}
                    className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <nav
                className="flex-1 overflow-y-auto px-3 pb-5"
                onClick={(event) => {
                    const target = event.target as HTMLElement;

                    if (target.closest("a")) {
                        setMobileOpen(false);
                    }
                }}
            >
                <div className="px-1 pb-3 pt-6">
                    <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Administração
                    </div>
                </div>

                <div className="space-y-1">
                    <NavLink to="/backoffice" end className={navClass}>
                        <LayoutDashboard className="h-5 w-5 shrink-0" />
                        Dashboard
                    </NavLink>

                    <NavLink to="/backoffice/clientes" className={navClass}>
                        <UsersRound className="h-5 w-5 shrink-0" />
                        Clientes
                    </NavLink>

                    <NavLink to="/backoffice/mensagens" className={navClass}>
                        <MessageSquareText className="h-5 w-5 shrink-0" />
                        Mensagens
                        <ChatUnreadBadge mode="backoffice" />
                    </NavLink>

                    <NavLink to="/backoffice/helpdesk" className={navClass}>
                        <LifeBuoy className="h-5 w-5 shrink-0" />
                        Helpdesk
                        <HelpdeskUnreadBadge mode="backoffice" />
                    </NavLink>

                    <NavLink to="/backoffice/ajuda" className={navClass}>
                        <BookOpenText className="h-5 w-5 shrink-0" />
                        Central de Ajuda
                    </NavLink>

                    <NavLink
                        to="/backoffice/modelos-documento"
                        className={navClass}
                    >
                        <FileText className="h-5 w-5 shrink-0" />
                        Modelos recomendados
                    </NavLink>

                    <NavLink to="/backoffice/notificacoes" className={navClass}>
                        <BellRing className="h-5 w-5 shrink-0" />
                        Notificações
                    </NavLink>

                    <NavLink to="/backoffice/planos" className={navClass}>
                        <Layers3 className="h-5 w-5 shrink-0" />
                        Planos
                    </NavLink>

                    <NavLink to="/backoffice/assinaturas" className={navClass}>
                        <CreditCard className="h-5 w-5 shrink-0" />
                        Assinaturas
                    </NavLink>
                </div>

                <div className="px-1 pb-3 pt-7">
                    <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Monetização
                    </div>
                </div>

                <div className="space-y-1">
                    <NavLink to="/backoffice/ads" className={navClass}>
                        <Megaphone className="h-5 w-5 shrink-0" />
                        FrotaPro Ads
                    </NavLink>
                </div>

                <div className="px-1 pb-3 pt-7">
                    <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        CRM
                    </div>
                </div>

                <div className="space-y-1">
                    <NavLink to="/backoffice/crm" end className={navClass}>
                        <LayoutDashboard className="h-5 w-5 shrink-0" />
                        Dashboard CRM
                    </NavLink>

                    <NavLink to="/backoffice/crm/leads" className={navClass}>
                        <UsersRound className="h-5 w-5 shrink-0" />
                        Leads
                    </NavLink>

                    <NavLink to="/backoffice/crm/pipeline" className={navClass}>
                        <Rows3 className="h-5 w-5 shrink-0" />
                        Pipeline
                    </NavLink>

                    <NavLink
                        to="/backoffice/crm/atividades"
                        className={navClass}
                    >
                        <Activity className="h-5 w-5 shrink-0" />
                        Atividades
                    </NavLink>

                    <NavLink to="/backoffice/crm/tags" className={navClass}>
                        <Tag className="h-5 w-5 shrink-0" />
                        Tags
                    </NavLink>

                    <NavLink
                        to="/backoffice/crm/operadores"
                        className={navClass}
                    >
                        <Database className="h-5 w-5 shrink-0" />
                        Base TVDE
                    </NavLink>

                    <NavLink
                        to="/backoffice/crm/enriquecimento/lotes"
                        className={navClass}
                    >
                        <DatabaseZap className="h-5 w-5 shrink-0" />
                        Lotes NIF.PT
                    </NavLink>

                    <NavLink
                        to="/backoffice/crm/importacoes"
                        className={navClass}
                    >
                        <FileClock className="h-5 w-5 shrink-0" />
                        Importações
                    </NavLink>
                </div>
            </nav>

            <div className="shrink-0 border-t border-white/10 p-4">
                <div className="mb-2 rounded-xl bg-white/5 px-3 py-3">
                    <div className="truncate text-sm font-medium text-white">
                        {user?.name}
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Super Administrador</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    Terminar sessão
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
                {sidebar}
            </aside>

            {mobileOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Fechar menu"
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
                    />

                    <aside
                        id="backoffice-mobile-menu"
                        className="fixed inset-y-0 left-0 z-50 w-[min(18rem,calc(100vw-2rem))] lg:hidden"
                    >
                        {sidebar}
                    </aside>
                </>
            )}

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:gap-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <button
                            type="button"
                            aria-label={
                                mobileOpen ? "Fechar menu" : "Abrir menu"
                            }
                            aria-expanded={mobileOpen}
                            aria-controls="backoffice-mobile-menu"
                            onClick={() => setMobileOpen((open) => !open)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 lg:hidden"
                        >
                            {mobileOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </button>

                        <div className="min-w-0">
                            <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-indigo-600 sm:text-xs">
                                Administração FrotaPRO
                            </div>

                            <div className="mt-1 truncate text-sm font-semibold text-slate-900 sm:text-base">
                                Backoffice SaaS
                            </div>
                        </div>
                    </div>

                    <Link
                        to="/painel"
                        aria-label="Gestão de organizações"
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 sm:px-4"
                    >
                        <Building2 className="h-4 w-4 shrink-0" />

                        <span className="hidden sm:inline">
                            Gestão de organizações
                        </span>
                    </Link>
                </header>

                <main className="p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
