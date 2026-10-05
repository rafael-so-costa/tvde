import {
    Boxes,
    Building2,
    LayoutDashboard,
    Megaphone,
    ReceiptText,
    Settings,
    ShieldCheck,
} from "lucide-react";
import {
    NavLink,
    Outlet,
} from "react-router-dom";

export default function BackofficeAdsRouterPage() {
    const navClass = ({
        isActive,
    }: {
        isActive: boolean;
    }) =>
        [
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
            isActive
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700",
        ].join(" ");

    return (
        <div className="space-y-6">
            <header>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                        <Megaphone className="h-5 w-5" />
                    </div>

                    <div>
                        <p className="text-sm font-medium text-indigo-600">
                            Monetização e parceiros
                        </p>

                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            FrotaPro Ads
                        </h1>
                    </div>
                </div>

                <p className="mt-3 max-w-3xl text-slate-500">
                    Gestão centralizada de campanhas, inventário, preços,
                    anunciantes, aprovações e pagamentos.
                </p>
            </header>

            <nav className="flex flex-wrap gap-2">
                <NavLink
                    to="/backoffice/ads"
                    end
                    className={navClass}
                >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                </NavLink>

                <NavLink
                    to="/backoffice/ads/campanhas"
                    className={navClass}
                >
                    <Megaphone className="h-4 w-4" />
                    Campanhas
                </NavLink>

                <NavLink
                    to="/backoffice/ads/aprovacoes"
                    className={navClass}
                >
                    <ShieldCheck className="h-4 w-4" />
                    Aprovações
                </NavLink>

                <NavLink
                    to="/backoffice/ads/anunciantes"
                    className={navClass}
                >
                    <Building2 className="h-4 w-4" />
                    Anunciantes
                </NavLink>

                <NavLink
                    to="/backoffice/ads/inventario"
                    className={navClass}
                >
                    <Boxes className="h-4 w-4" />
                    Inventário
                </NavLink>

                <NavLink
                    to="/backoffice/ads/pedidos"
                    className={navClass}
                >
                    <ReceiptText className="h-4 w-4" />
                    Pagamentos
                </NavLink>

                <NavLink
                    to="/backoffice/ads/configuracoes"
                    className={navClass}
                >
                    <Settings className="h-4 w-4" />
                    Configurações
                </NavLink>
            </nav>

            <Outlet />
        </div>
    );
}
