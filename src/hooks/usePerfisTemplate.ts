import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface PerfilTemplate {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export function usePerfisTemplate() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ["perfis-template", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("perfis_template" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PerfilTemplate[];
    },
    enabled: !!tenantId,
  });

  const createPerfil = useMutation({
    mutationFn: async (nome: string) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      const trimmed = nome.trim();
      if (!trimmed) throw new Error("Nome do perfil é obrigatório");
      const { data, error } = await supabase
        .from("perfis_template" as any)
        .insert({ tenant_id: tenantId, nome: trimmed })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis-template"] });
      toast.success("Perfil criado com sucesso");
    },
    onError: (err: Error) => toast.error("Erro ao criar perfil: " + err.message),
  });

  const updatePerfil = useMutation({
    mutationFn: async ({ id, nome, descricao }: { id: string; nome?: string; descricao?: string | null }) => {
      const updates: Record<string, any> = {};
      if (nome !== undefined) updates.nome = nome.trim();
      if (descricao !== undefined) updates.descricao = descricao;
      const { error } = await supabase.from("perfis_template" as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis-template"] });
      toast.success("Perfil atualizado");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const deletePerfil = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("perfis_template" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis-template"] });
      queryClient.invalidateQueries({ queryKey: ["templates-contrato"] });
      toast.success("Perfil excluído");
    },
    onError: (err: Error) => toast.error("Erro ao excluir: " + err.message),
  });

  return { perfis, isLoading, createPerfil, updatePerfil, deletePerfil };
}
