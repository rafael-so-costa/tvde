import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MenuKey =
  | "contratos" | "multas" | "sinistros" | "veiculos"
  | "motoristas" | "proprietarios" | "empresas" | "checklist"
  | "manutencao" | "chat" | "chat_interno" | "mensagens" | "mensagens_massa" | "templates" | "funcionarios";

export type PermissionLevel = "nenhum" | "visualizar" | "configurar";

export const ALL_MENUS: { key: MenuKey; label: string }[] = [
  { key: "contratos", label: "Contratos" },
  { key: "multas", label: "Multas" },
  { key: "sinistros", label: "Sinistros" },
  { key: "veiculos", label: "Veículos" },
  { key: "motoristas", label: "Motoristas" },
  { key: "proprietarios", label: "Proprietários" },
  { key: "empresas", label: "Empresas" },
  { key: "checklist", label: "Check-list" },
  { key: "manutencao", label: "Manutenção" },
  { key: "chat", label: "Chat Externo" },
  { key: "chat_interno", label: "Chat Interno" },
  { key: "mensagens", label: "Mensagens" },
  { key: "mensagens_massa", label: "Mensagens em Massa" },
  { key: "templates", label: "Templates" },
  { key: "funcionarios", label: "Funcionários" },
];

interface PermissionsState {
  permissions: Record<string, PermissionLevel>;
  isFuncionario: boolean;
  isOwnerAdmin: boolean; // tenant admin not tied to funcionarios row
  loading: boolean;
}

export function usePermissions() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [state, setState] = useState<PermissionsState>({
    permissions: {},
    isFuncionario: false,
    isOwnerAdmin: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setState({ permissions: {}, isFuncionario: false, isOwnerAdmin: false, loading: false });
        return;
      }
      // Check if user is in funcionarios table
      const { data: funcRow } = await supabase
        .from("funcionarios")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!funcRow) {
        if (!cancelled) {
          setState({ permissions: {}, isFuncionario: false, isOwnerAdmin: isAdmin, loading: false });
        }
        return;
      }

      const { data: perms } = await supabase
        .from("permissoes_funcionario")
        .select("menu_key, nivel")
        .eq("funcionario_id", funcRow.id);

      const map: Record<string, PermissionLevel> = {};
      (perms || []).forEach((p: { menu_key: string; nivel: PermissionLevel }) => {
        map[p.menu_key] = p.nivel;
      });

      if (!cancelled) {
        setState({ permissions: map, isFuncionario: true, isOwnerAdmin: false, loading: false });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, isAdmin]);

  const can = (menu: MenuKey, level: "visualizar" | "configurar" = "visualizar"): boolean => {
    if (isSuperAdmin) return true;
    // Owner admin (admin_empresa not in funcionarios) → full access
    if (state.isOwnerAdmin) return true;
    if (!state.isFuncionario) {
      // motorista/proprietario have their own access logic; permissions don't apply to them
      return true;
    }
    const current = state.permissions[menu] ?? "nenhum";
    if (level === "visualizar") return current === "visualizar" || current === "configurar";
    return current === "configurar";
  };

  return { ...state, can };
}
