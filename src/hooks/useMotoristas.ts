import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Motorista = Tables<"motoristas">;
export type MotoristaInsert = TablesInsert<"motoristas">;
export type MotoristaUpdate = TablesUpdate<"motoristas">;

export function useMotoristas() {
  return useQuery({
    queryKey: ["motoristas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motoristas")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useMotorista(id: string | null) {
  return useQuery({
    queryKey: ["motoristas", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("motoristas")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMotorista() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (motorista: MotoristaInsert) => {
      const { data, error } = await supabase
        .from("motoristas")
        .insert(motorista)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motoristas"] });
      toast.success("Motorista criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar motorista: " + error.message);
    },
  });
}

export function useUpdateMotorista() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, showToast = true, ...motorista }: MotoristaUpdate & { id: string; showToast?: boolean }) => {
      const { data, error } = await supabase
        .from("motoristas")
        .update(motorista)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, showToast };
    },
    onSuccess: ({ showToast }) => {
      queryClient.invalidateQueries({ queryKey: ["motoristas"] });
      if (showToast) {
        toast.success("Motorista atualizado com sucesso");
      }
    },
    onError: (error) => {
      toast.error("Erro ao atualizar motorista: " + error.message);
    },
  });
}

export function useDeleteMotorista() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("motoristas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motoristas"] });
      toast.success("Motorista excluído com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir motorista: " + error.message);
    },
  });
}

export function useToggleMotoristaStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from("motoristas")
        .update({ ativo })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["motoristas"] });
      toast.success(data.ativo ? "Motorista ativado" : "Motorista inativado");
    },
    onError: (error) => {
      toast.error("Erro ao alterar status: " + error.message);
    },
  });
}
