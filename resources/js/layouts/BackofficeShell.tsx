import {
    Building2,
    LayoutDashboard,
    LogOut,
    ShieldCheck,
    Truck,
} from "lucide-react";
import {
    Link,
    NavLink,
    Outlet,
} from "react-router-dom";

import {
    useAuth,
} from "../contexts/AuthContext";

export default function BackofficeShell() {
    const {
        user,
        logout,
    } = useAuth();

    return (
        <div className="min-h-screen bg-slate-100">
            <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-950 lg:flex">
                <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
                        <Truck className="h-5 w-5 text-white" />
                    </div>

                    <div>
                        <div className="text-xl font-bold tracking-tight text-white">
                            FrotaPRO
                        </div>

                        <div className="text-[10px] uppercase tracking-[0.18em] text-indigo-300">
                            SaaS Backoffice
                        </div>
                    </div>
                </div>

                <div className="px-4 pb-3 pt-6">
                    <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Administração
                    </div>
                </div>

                <nav className="flex-1 space-y-1 px-3">
                    <NavLink
                        to="/backoffice"
                        end
                        className={({
                            isActive,
                        }) =>
                            [
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                                isActive
                                    ? "bg-indigo-500 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                            ].join(" ")
                        }
                    >
                        <LayoutDashboard className="h-5 w-5" />

                        Dashboard
                    </NavLink>
                </nav>

                <div className="border-t border-white/10 p-4">
                    <div className="mb-2 rounded-xl bg-white/5 px-3 py-3">
                        <div className="truncate text-sm font-medium text-white">
                            {user?.name}
                        </div>

                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Super Administrador
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            logout()
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                    >
                        <LogOut className="h-5 w-5" />
                        Terminar sessão
                    </button>
                </div>
            </aside>

            <div className="lg:pl-64">
                <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 sm:px-8">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                            Administração FrotaPRO
                        </div>

                        <div className="mt-1 font-semibold text-slate-900">
                            Backoffice SaaS
                        </div>
                    </div>

                    <Link
                        to="/painel"
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        <Building2 className="h-4 w-4" />
                        Gestão de organizações
                    </Link>
                </header>

                <main className="p-5 sm:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
