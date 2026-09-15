import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Layers,
  FileText,
  Wallet,
  Users,
  Settings,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSaasAcesso } from "@/hooks/useSaas";

const entries = [
  { icon: LayoutDashboard, label: "Visão Geral", path: "/gestao-interna-9f4c" },
  { icon: Building2, label: "Clientes", path: "/gestao-interna-9f4c/clientes" },
  { icon: Layers, label: "Planos", path: "/gestao-interna-9f4c/planos" },
  { icon: FileText, label: "Faturas", path: "/gestao-interna-9f4c/faturas" },
  { icon: Wallet, label: "Pagamentos", path: "/gestao-interna-9f4c/pagamentos" },
  { icon: Users, label: "Equipa Interna", path: "/gestao-interna-9f4c/equipa" },
  { icon: Settings, label: "Configurações", path: "/gestao-interna-9f4c/configuracoes" },
];

interface SaasLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function SaasLayout({ children, title, subtitle, actions }: SaasLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { papel } = useSaasAcesso();

  const papelLabel =
    papel === "owner" ? "Administrador" : papel === "financeiro" ? "Financeiro" : "Suporte";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar flex flex-col">
        <div className="flex items-center gap-3 h-16 px-4 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-accent-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sidebar-foreground">Gestão SaaS</p>
            <p className="text-xs text-sidebar-foreground/60">{papelLabel}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <ul className="space-y-1">
            {entries.map((entry) => {
              const isActive =
                entry.path === "/gestao-interna-9f4c"
                  ? location.pathname === "/gestao-interna-9f4c"
                  : location.pathname.startsWith(entry.path);
              return (
                <li key={entry.path}>
                  <Link
                    to={entry.path}
                    className={cn("sidebar-item", isActive && "sidebar-item-active")}
                  >
                    <entry.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{entry.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
            Voltar à aplicação
          </Button>
        </div>
      </aside>

      <div className="pl-64">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
