import { useState } from "react";

import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import {
    AlertTriangle,
    BarChart3,
    BellRing,
    BookOpenText,
    Building2,
    Car,
    CircleUserRound,
    ClipboardCheck,
    Clock3,
    FileText,
    History,
    LayoutDashboard,
    LifeBuoy,
    ListChecks,
    LoaderCircle,
    LogOut,
    Menu,
    MessageSquareText,
    ReceiptText,
    Settings2,
    ShieldCheck,
    Truck,
    UserCog,
    UserRound,
    UsersRound,
    Wrench,
    X,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";

import { useTenant } from "../contexts/TenantContext";

import { useCurrentPermissions } from "../hooks/useCurrentPermissions";

import AlertBell from "../components/alerts/AlertBell";

import { resolvePortalDestination } from "../lib/portal";

import ChatUnreadBadge from "../components/chat/ChatUnreadBadge";

import HelpdeskUnreadBadge from "../components/helpdesk/HelpdeskUnreadBadge";

const navigation = [
    {
        to: "/painel",
        label: "Dashboard",
        icon: LayoutDashboard,
    },
    {
        to: "/onboarding",
        label: "Primeiros passos",
        icon: ListChecks,
        managerOnly: true,
    },
    {
        to: "/alertas",
        label: "Notificações",
        icon: BellRing,
    },
    {
        to: "/mensagens",
        label: "Mensagens",
        icon: MessageSquareText,
    },
    {
        to: "/empresas",
        label: "Empresas",
        icon: Building2,
        permission: "empresas",
    },
    {
        to: "/proprietarios",
        label: "Proprietários",
        icon: UsersRound,
        permission: "proprietarios",
    },
    {
        to: "/motoristas",
        label: "Motoristas",
        icon: UserRound,
        permission: "motoristas",
    },
    {
        to: "/funcionarios",
        label: "Funcionários",
        icon: UserCog,
        permission: "funcionarios",
    },
    {
        to: "/registos-criminais",
        label: "Registos criminais",
        icon: ShieldCheck,
        permission: "registos_criminais",
    },
    {
        to: "/recibos-verdes",
        label: "Recibos verdes",
        icon: ReceiptText,
        permission: "recibos_verdes",
    },
    {
        to: "/expediente",
        label: "Expediente",
        icon: Clock3,
        permission: "expediente",
    },
    {
        to: "/multas",
        label: "Multas",
        icon: ReceiptText,
        permission: "multas",
    },
    {
        to: "/sinistros",
        label: "Sinistros",
        icon: AlertTriangle,
        permission: "sinistros",
    },
    {
        to: "/manutencao",
        label: "Manutenção",
        icon: Wrench,
        permission: "manutencao",
    },
    {
        to: "/veiculos",
        label: "Veículos",
        icon: Car,
        permission: "veiculos",
    },
    {
        to: "/alugueres",
        label: "Alugueres",
        icon: ReceiptText,
        permission: "alugueres",
    },
    {
        to: "/contratos",
        label: "Contratos",
        icon: FileText,
        permission: "contratos",
    },
    {
        to: "/checklists",
        label: "Checklists",
        icon: ClipboardCheck,
        permission: "checklist",
    },
    {
        to: "/configuracoes",
        label: "Configurações",
        icon: Settings2,
        permission: "configuracoes",
    },
    {
        to: "/relatorios",
        label: "Relatórios",
        icon: BarChart3,
        permission: "relatorios",
    },
    {
        to: "/helpdesk",
        label: "Helpdesk",
        icon: LifeBuoy,
        managerOnly: true,
    },
    {
        to: "/auditoria",
        label: "Auditoria",
        icon: History,
        permission: "auditoria",
    },
    {
        to: "/ajuda",
        label: "Central de Ajuda",
        icon: BookOpenText,
    },
    {
        to: "/minha-conta",
        label: "Minha Conta",
        icon: CircleUserRound,
    },
];

export default function AppShell() {
    const { user, logout } = useAuth();

    const {
        tenants,
        tenant,
        loading: tenantLoading,
        selectTenant,
        clearTenant,
    } = useTenant();

    const { can } = useCurrentPermissions();

    const location = useLocation();

    const navigate = useNavigate();

    const [mobileOpen, setMobileOpen] = useState(false);

    const [switchingTenant, setSwitchingTenant] = useState(false);

    async function handleLogout() {
        await logout();
    }

    async function handleTenantChange(tenantId: string) {
        setSwitchingTenant(true);

        try {
            if (!tenantId) {
                await clearTenant();
            } else {
                await selectTenant(tenantId);
            }

            const destination = await resolvePortalDestination("/painel");

            navigate(destination);
        } finally {
            setSwitchingTenant(false);
        }
    }

    const isTenantAdmin = Boolean(
        user?.super_admin ||
        user?.roles?.some(
            (role) =>
                role.codigo === "admin_empresa" &&
                role.pivot?.tenant_id === tenant?.id,
        ),
    );

    const isFleetManager = Boolean(
        tenant &&
        user?.roles?.some(
            (role) =>
                role.codigo === "admin_empresa" &&
                role.pivot?.tenant_id === tenant.id,
        ),
    );

    const visibleNavigation = navigation.filter((item) => {
        if ("managerOnly" in item && item.managerOnly) {
            return isFleetManager;
        }

        return isTenantAdmin || !item.permission || can(item.permission);
    });

    const visibleRoles =
        user?.roles?.filter(
            (role) =>
                role.codigo === "super_admin" ||
                role.pivot?.tenant_id === tenant?.id,
        ) ?? [];

    const sidebar = (
        <div className="h-full flex flex-col bg-slate-950 text-slate-300">
            <div className="h-20 px-6 flex items-center gap-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                </div>

                <div>
                    <div className="font-bold text-xl text-white tracking-tight">
                        FrotaPRO
                    </div>

                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Gestão TVDE
                    </div>
                </div>
            </div>

            <div className="px-4 pt-6 pb-3">
                <div className="px-3 text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-600">
                    Operação
                </div>
            </div>

            <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
                {visibleNavigation.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/painel"}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            [
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",

                                isActive
                                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-950/40"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                            ].join(" ")
                        }
                    >
                        <Icon className="w-5 h-5" />

                        {label}

                        {to === "/mensagens" && (
                            <ChatUnreadBadge mode="tenant" />
                        )}

                        {to === "/helpdesk" && (
                            <HelpdeskUnreadBadge mode="tenant" />
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="px-3 py-3 mb-2 rounded-xl bg-white/5">
                    <div className="text-sm font-medium text-white truncate">
                        {user?.name}
                    </div>

                    <div className="text-xs text-slate-500 truncate mt-0.5">
                        {tenant?.nome ?? "Sem organização selecionada"}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition"
                >
                    <LogOut className="w-5 h-5" />
                    Terminar sessão
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
                {sidebar}
            </aside>

            {mobileOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Fechar menu"
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
                    />

                    <aside className="lg:hidden fixed inset-y-0 left-0 w-72 z-50">
                        {sidebar}
                    </aside>
                </>
            )}

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 min-h-20 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-4 min-w-0">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="lg:hidden w-10 h-10 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600"
                        >
                            {mobileOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>

                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                Organização
                            </p>

                            {tenantLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                    A carregar...
                                </div>
                            ) : tenants.length > 1 || user?.super_admin ? (
                                <div className="relative">
                                    <select
                                        value={tenant?.id ?? ""}
                                        disabled={switchingTenant}
                                        onChange={(event) =>
                                            handleTenantChange(
                                                event.target.value,
                                            )
                                        }
                                        className="h-10 max-w-[240px] sm:max-w-[320px] rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
                                    >
                                        {user?.super_admin && (
                                            <option value="">
                                                Selecionar organização
                                            </option>
                                        )}

                                        {tenants.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.nome}
                                            </option>
                                        ))}
                                    </select>

                                    {switchingTenant && (
                                        <LoaderCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-600 pointer-events-none" />
                                    )}
                                </div>
                            ) : (
                                <h2 className="font-semibold text-slate-900 truncate">
                                    {tenant?.nome ?? "Sem organização"}
                                </h2>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <AlertBell />

                        <div className="hidden sm:flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-sm font-medium text-slate-900">
                                    {user?.name}
                                </div>

                                <div className="text-xs text-slate-500">
                                    {visibleRoles.length > 0
                                        ? visibleRoles
                                              .map((role) => role.nome)
                                              .join(" · ")
                                        : "Utilizador"}
                                </div>
                            </div>

                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <main key={location.pathname} className="p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
