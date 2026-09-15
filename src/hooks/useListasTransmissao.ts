import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ListaTransmissao {
  id: string;
  tenant_id: string;
  nome: string;
  destinatarios_ids: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ListaTransmissaoInput = {
  nome: string;
  destinatarios_ids: string[];
};

export function useListasTransmissao() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["listas-transmissao"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listas_transmissao" as any)
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ListaTransmissao[];
    },
  });
}

export function useCreateListaTransmissao() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ListaTransmissaoInput) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!profile?.tenant_id) throw new Error("Tenant não encontrado");

      const { data, error } = await supabase
        .from("listas_transmissao" as any)
        .insert({ ...input, tenant_id: profile.tenant_id, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listas-transmissao"] });
      toast.success("Lista criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateListaTransmissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ListaTransmissaoInput>) => {
      const { error } = await supabase
        .from("listas_transmissao" as any)
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listas-transmissao"] });
      toast.success("Lista atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteListaTransmissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("listas_transmissao" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listas-transmissao"] });
      toast.success("Lista eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
