import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Veiculo = Tables<"veiculos">;
export type VeiculoInsert = TablesInsert<"veiculos">;
export type VeiculoUpdate = TablesUpdate<"veiculos">;

export type Manutencao = Tables<"manutencoes_veiculo">;
export type ManutencaoInsert = TablesInsert<"manutencoes_veiculo">;

export function useVeiculos() {
  return useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos")
        .select(`
          *,
          proprietario:proprietarios(id, nome_completo, nome_empresa, tipo)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useVeiculo(id: string | null) {
  return useQuery({
    queryKey: ["veiculos", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("veiculos")
        .select(`
          *,
          proprietario:proprietarios(id, nome_completo, nome_empresa, tipo)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateVeiculo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (veiculo: VeiculoInsert) => {
      const { data, error } = await supabase
        .from("veiculos")
        .insert(veiculo)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Veículo criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar veículo: " + error.message);
    },
  });
}

export function useUpdateVeiculo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, showToast = true, ...veiculo }: VeiculoUpdate & { id: string; showToast?: boolean }) => {
      const { data, error } = await supabase
        .from("veiculos")
        .update(veiculo)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, showToast };
    },
    onSuccess: ({ showToast }) => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      if (showToast) {
        toast.success("Veículo atualizado com sucesso");
      }
    },
    onError: (error) => {
      toast.error("Erro ao atualizar veículo: " + error.message);
    },
  });
}

export function useDeleteVeiculo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("veiculos")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Veículo excluído com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir veículo: " + error.message);
    },
  });
}

export function useToggleVeiculoStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from("veiculos")
        .update({ ativo })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success(data.ativo ? "Veículo ativado" : "Veículo inativado");
    },
    onError: (error) => {
      toast.error("Erro ao alterar status: " + error.message);
    },
  });
}

// Manutenções - usando a tabela manutencoes (nova)
export function useManutencoes(veiculoId: string | null) {
  return useQuery({
    queryKey: ["manutencoes-veiculo", veiculoId],
    queryFn: async () => {
      if (!veiculoId) return [];
      const { data, error } = await supabase
        .from("manutencoes")
        .select(`
          *,
          proprietario:proprietarios(id, nome_completo, nome_empresa, tipo)
        `)
        .eq("veiculo_id", veiculoId)
        .order("data_servico", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!veiculoId,
  });
}
