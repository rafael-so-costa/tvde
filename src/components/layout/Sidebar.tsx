import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  CarFront,
  FileText,
  Settings,
  Building2,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Users,
  MessageSquare,
  Shield,
  Receipt,
  Wrench,
  User,
  ClipboardCheck,
  MessageCircle,
  PenLine,
  ShieldCheck,
  Clock,
  ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, MenuKey } from "@/hooks/usePermissions";
import { useUnreadChatCount } from "@/hooks/useChat";
import { useAssinaturasPendentesCount } from "@/hooks/useMinhasAssinaturas";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  roles?: ("super_admin" | "admin_empresa" | "motorista" | "proprietario")[];
  permissionKey?: MenuKey;
}

interface MenuGroup {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles?: ("super_admin" | "admin_empresa" | "motorista" | "proprietario")[];
  children: MenuItem[];
}

type MenuEntry = MenuItem | MenuGroup;

function isGroup(entry: MenuEntry): entry is MenuGroup {
  return "children" in entry;
}

const adminMenuEntries: MenuEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  {
    icon: User,
    label: "Perfil",
    roles: ["super_admin", "admin_empresa", "proprietario"],
    children: [
      { icon: UserCircle, label: "Motoristas", path: "/drivers", roles: ["super_admin", "admin_empresa"], permissionKey: "motoristas" },
      { icon: Car, label: "Veículos", path: "/vehicles", roles: ["super_admin", "admin_empresa", "proprietario"], permissionKey: "veiculos" },
      { icon: Building2, label: "Empresas", path: "/companies", roles: ["super_admin", "admin_empresa"], permissionKey: "empresas" },
      { icon: UserCircle, label: "Proprietários", path: "/owners", roles: ["super_admin", "admin_empresa"], permissionKey: "proprietarios" },
      { icon: ShieldCheck, label: "Registos Criminais", path: "/registos-criminais", roles: ["super_admin", "admin_empresa"], permissionKey: "motoristas" },
    ],
  },
  {
    icon: FileText,
    label: "Contratos",
    roles: ["super_admin", "admin_empresa", "proprietario"],
    children: [
      { icon: FileText, label: "Contratos", path: "/contracts", roles: ["super_admin", "admin_empresa", "proprietario"], permissionKey: "contratos" },
      { icon: ClipboardCheck, label: "Check-list", path: "/checklist", roles: ["super_admin", "admin_empresa"], permissionKey: "checklist" },
      { icon: Car, label: "Aluguer de Carro", path: "/alugueres", roles: ["super_admin", "admin_empresa"], permissionKey: "contratos" },
    ],
  },
  { icon: Receipt, label: "Multas", path: "/fines", roles: ["super_admin", "admin_empresa", "proprietario"], permissionKey: "multas" },
  { icon: CarFront, label: "Sinistros", path: "/claims", roles: ["super_admin", "admin_empresa", "proprietario"], permissionKey: "sinistros" },
  { icon: Wrench, label: "Manutenção", path: "/maintenance", roles: ["super_admin", "admin_empresa", "proprietario"], permissionKey: "manutencao" },
  { icon: PenLine, label: "Assinaturas", path: "/assinaturas" },
  { icon: MessageCircle, label: "Chat", path: "/chat", permissionKey: "chat" },
  { icon: AlertTriangle, label: "Alertas", path: "/alerts", roles: ["super_admin", "admin_empresa"] },
  { icon: Users, label: "Funcionários", path: "/employees", roles: ["super_admin", "admin_empresa"], permissionKey: "funcionarios" },
  { icon: Clock, label: "Expediente", path: "/gestao-expediente", roles: ["super_admin", "admin_empresa"], permissionKey: "motoristas" },
  { icon: ReceiptText, label: "Recibos Verdes", path: "/gestao-recibos-verdes", roles: ["super_admin", "admin_empresa"], permissionKey: "motoristas" },
  { icon: Shield, label: "Gestão", path: "/tenants", roles: ["super_admin"] },
  { icon: Building2, label: "Gestão SaaS", path: "/gestao-interna-9f4c", roles: ["super_admin"] },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const motoristaMenuEntries: MenuEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: UserCircle, label: "Perfil", path: "/profile" },
  { icon: Car, label: "Veículos", path: "/vehicles" },
  { icon: Receipt, label: "Multas", path: "/fines" },
  { icon: CarFront, label: "Sinistros", path: "/claims" },
  { icon: FileText, label: "Contratos", path: "/contracts" },
  { icon: ClipboardCheck, label: "Check-list", path: "/portal-checklist" },
  { icon: ShieldCheck, label: "Registo Criminal", path: "/registo-criminal" },
  { icon: Clock, label: "Registo de Expediente", path: "/registo-expediente" },
  { icon: ReceiptText, label: "Recibos Verdes", path: "/recibos-verdes" },
  { icon: PenLine, label: "Assinaturas", path: "/assinaturas" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Settings, label: "Configuração", path: "/settings" },
];

const proprietarioMenuEntries: MenuEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: UserCircle, label: "Perfil", path: "/profile" },
  { icon: Car, label: "Veículos", path: "/vehicles" },
  { icon: Receipt, label: "Multas", path: "/fines" },
  { icon: CarFront, label: "Sinistros", path: "/claims" },
  { icon: FileText, label: "Contratos", path: "/contracts" },
  { icon: ClipboardCheck, label: "Check-list", path: "/portal-checklist" },
  { icon: PenLine, label: "Assinaturas", path: "/assinaturas" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Settings, label: "Configuração", path: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { roles, isSuperAdmin, activeRole, loading: authLoading } = useAuth();
  const { can, isFuncionario, loading: permsLoading } = usePermissions();
  const { data: unreadChat = 0 } = useUnreadChatCount();
  const unreadChatLabel = unreadChat > 99 ? "99+" : String(unreadChat);
  const pendingSignatures = useAssinaturasPendentesCount();
  const pendingSignaturesLabel = pendingSignatures > 99 ? "99+" : String(pendingSignatures);

  // Wait for auth + permissions to load before rendering menu items.
  // Prevents flash of admin menu for funcionarios while permissions are loading.
  const ready = !authLoading && !permsLoading && !!activeRole;

  const menuEntries = activeRole === "motorista"
    ? motoristaMenuEntries
    : activeRole === "proprietario"
    ? proprietarioMenuEntries
    : adminMenuEntries;

  const hasAccess = (entryRoles?: ("super_admin" | "admin_empresa" | "motorista" | "proprietario")[]) => {
    if (!entryRoles) return true;
    if (isSuperAdmin) return true;
    return entryRoles.some((role) => roles.includes(role));
  };

  const hasPermission = (entry: MenuItem) => {
    if (!isFuncionario) return true;
    if (!entry.permissionKey) return true;
    return can(entry.permissionKey, "visualizar");
  };

  const filteredEntries = menuEntries.filter((entry) => {
    if (!hasAccess(isGroup(entry) ? entry.roles : entry.roles)) return false;
    if (isGroup(entry)) {
      return entry.children.some((child) => hasAccess(child.roles) && hasPermission(child));
    }
    return hasPermission(entry);
  });

  const isGroupActive = (group: MenuGroup) =>
    group.children.some((child) => location.pathname === child.path);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
              <Car className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">TVDE Pro</span>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center mx-auto">
            <Car className="w-6 h-6 text-accent-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        {!ready ? (
          <ul className="space-y-2 px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-9 rounded-md bg-sidebar-accent/40 animate-pulse" />
            ))}
          </ul>
        ) : (
        <ul className="space-y-1">
          {filteredEntries.map((entry) => {
            if (isGroup(entry)) {
              const groupActive = isGroupActive(entry);
              const visibleChildren = entry.children.filter((c) => hasAccess(c.roles) && hasPermission(c));

              if (collapsed) {
                // In collapsed mode, show only the group icon
                return visibleChildren.map((child) => {
                  const isActive = location.pathname === child.path;
                  return (
                    <li key={child.path}>
                      <Link
                        to={child.path}
                        className={cn("sidebar-item", isActive && "sidebar-item-active")}
                        title={child.label}
                      >
                        <child.icon className="w-5 h-5 flex-shrink-0" />
                      </Link>
                    </li>
                  );
                });
              }

              return (
                <li key={entry.label}>
                  <Collapsible defaultOpen={groupActive}>
                    <CollapsibleTrigger className="sidebar-item w-full justify-between group">
                      <span className="flex items-center gap-3">
                        <entry.icon className="w-5 h-5 flex-shrink-0" />
                        <span>{entry.label}</span>
                      </span>
                      <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                        {visibleChildren.map((child) => {
                          const isActive = location.pathname === child.path;
                          return (
                            <li key={child.path}>
                              <Link
                                to={child.path}
                                className={cn("sidebar-item text-sm", isActive && "sidebar-item-active")}
                              >
                                <child.icon className="w-4 h-4 flex-shrink-0" />
                                <span>{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            }

            const isActive = location.pathname === entry.path;
            const isChat = entry.path === "/chat";
            const isAssinaturas = entry.path === "/assinaturas";
            const badgeCount = isChat ? unreadChat : isAssinaturas ? pendingSignatures : 0;
            const badgeLabel = isChat ? unreadChatLabel : isAssinaturas ? pendingSignaturesLabel : "";
            const showBadge = badgeCount > 0;
            return (
              <li key={entry.path}>
                <Link
                  to={entry.path}
                  className={cn("sidebar-item relative", isActive && "sidebar-item-active")}
                  title={collapsed ? entry.label : undefined}
                >
                  <span className="relative flex-shrink-0">
                    <entry.icon className="w-5 h-5" />
                    {showBadge && collapsed && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                        {badgeLabel}
                      </span>
                    )}
                  </span>
                  {!collapsed && (
                    <span className="flex-1 flex items-center justify-between">
                      <span>{entry.label}</span>
                      {showBadge && (
                        <span className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                          {badgeLabel}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-item w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
