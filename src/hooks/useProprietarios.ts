import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Proprietario = Tables<"proprietarios">;
export type ProprietarioInsert = TablesInsert<"proprietarios">;
export type ProprietarioUpdate = TablesUpdate<"proprietarios">;

export function useProprietarios() {
  return useQuery({
    queryKey: ["proprietarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proprietarios")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useProprietario(id: string | null) {
  return useQuery({
    queryKey: ["proprietarios", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("proprietarios")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProprietario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (proprietario: ProprietarioInsert) => {
      const { data, error } = await supabase
        .from("proprietarios")
        .insert(proprietario)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietarios"] });
      toast.success("Proprietário criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar proprietário: " + error.message);
    },
  });
}

export function useUpdateProprietario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, showToast = true, ...proprietario }: ProprietarioUpdate & { id: string; showToast?: boolean }) => {
      const { data, error } = await supabase
        .from("proprietarios")
        .update(proprietario)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, showToast };
    },
    onSuccess: ({ showToast }) => {
      queryClient.invalidateQueries({ queryKey: ["proprietarios"] });
      if (showToast) {
        toast.success("Proprietário atualizado com sucesso");
      }
    },
    onError: (error) => {
      toast.error("Erro ao atualizar proprietário: " + error.message);
    },
  });
}

export function useDeleteProprietario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proprietarios")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietarios"] });
      toast.success("Proprietário excluído com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir proprietário: " + error.message);
    },
  });
}

export function useToggleProprietarioStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from("proprietarios")
        .update({ ativo })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proprietarios"] });
      toast.success(data.ativo ? "Proprietário ativado" : "Proprietário inativado");
    },
    onError: (error) => {
      toast.error("Erro ao alterar status: " + error.message);
    },
  });
}
