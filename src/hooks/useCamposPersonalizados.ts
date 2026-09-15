import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EntidadeTipo = "funcionario" | "motorista" | "veiculo" | "empresa" | "proprietario";

export interface CampoPersonalizado {
  id: string;
  tenant_id: string;
  entidade_tipo: EntidadeTipo;
  entidade_id: string;
  nome_campo: string;
  valor: string | null;
  data_vencimento: string | null;
  created_at: string;
  updated_at: string;
}

export function useCamposPersonalizados(entidadeTipo: EntidadeTipo, entidadeId: string | null) {
  return useQuery({
    queryKey: ["campos-personalizados", entidadeTipo, entidadeId],
    enabled: !!entidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campos_personalizados" as any)
        .select("*")
        .eq("entidade_tipo", entidadeTipo)
        .eq("entidade_id", entidadeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CampoPersonalizado[];
    },
  });
}

export function useCreateCampoPersonalizado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      entidade_tipo: EntidadeTipo;
      entidade_id: string;
      nome_campo: string;
      valor?: string | null;
      data_vencimento?: string | null;
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .maybeSingle();
      const tenant_id = profile?.tenant_id;
      if (!tenant_id) throw new Error("Tenant não identificado");

      const { error } = await supabase.from("campos_personalizados" as any).insert({
        tenant_id,
        entidade_tipo: input.entidade_tipo,
        entidade_id: input.entidade_id,
        nome_campo: input.nome_campo,
        valor: input.valor ?? null,
        data_vencimento: input.data_vencimento ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["campos-personalizados", vars.entidade_tipo, vars.entidade_id],
      });
      toast.success("Campo adicionado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateCampoPersonalizado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      entidade_tipo: EntidadeTipo;
      entidade_id: string;
      nome_campo?: string;
      valor?: string | null;
      data_vencimento?: string | null;
    }) => {
      const { id, entidade_tipo, entidade_id, ...updates } = input;
      const { error } = await supabase
        .from("campos_personalizados" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["campos-personalizados", vars.entidade_tipo, vars.entidade_id],
      });
      toast.success("Campo atualizado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteCampoPersonalizado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; entidade_tipo: EntidadeTipo; entidade_id: string }) => {
      const { error } = await supabase
        .from("campos_personalizados" as any)
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["campos-personalizados", vars.entidade_tipo, vars.entidade_id],
      });
      toast.success("Campo removido");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
