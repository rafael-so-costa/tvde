import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ManutencaoGeral {
  id: string;
  tenant_id: string;
  proprietario_id: string | null;
  veiculo_id: string;
  km: number | null;
  data_servico: string;
  tipo_servico: string;
  km_proxima_revisao: number | null;
  valor: number | null;
  documentos: Array<{
    tipo: string;
    url: string;
    nome: string;
    uploaded_at: string;
  }>;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  proprietario?: {
    id: string;
    nome_completo: string | null;
    nome_empresa: string | null;
    tipo: string;
  } | null;
  veiculo?: {
    id: string;
    matricula: string;
    marca: string | null;
    modelo: string | null;
  } | null;
}

export interface ManutencaoGeralInsert {
  tenant_id: string;
  proprietario_id?: string | null;
  veiculo_id: string;
  km?: number | null;
  data_servico: string;
  tipo_servico: string;
  km_proxima_revisao?: number | null;
  valor?: number | null;
  documentos?: any[];
  observacoes?: string | null;
}

export interface ManutencaoGeralUpdate extends Partial<ManutencaoGeralInsert> {
  id: string;
}

export function useManutencaoGeral() {
  return useQuery({
    queryKey: ["manutencoes-geral"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select(`
          *,
          proprietario:proprietarios(id, nome_completo, nome_empresa, tipo),
          veiculo:veiculos(id, matricula, marca, modelo)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ManutencaoGeral[];
    },
  });
}

export function useManutencaoById(id: string | null) {
  return useQuery({
    queryKey: ["manutencoes-geral", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("manutencoes")
        .select(`
          *,
          proprietario:proprietarios(id, nome_completo, nome_empresa, tipo),
          veiculo:veiculos(id, matricula, marca, modelo)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ManutencaoGeral;
    },
    enabled: !!id,
  });
}

export function useManutencoesByProprietario(proprietarioId: string | null) {
  return useQuery({
    queryKey: ["manutencoes-geral", "proprietario", proprietarioId],
    queryFn: async () => {
      if (!proprietarioId) return [];
      const { data, error } = await supabase
        .from("manutencoes")
        .select(`
          *,
          proprietario:proprietarios(id, nome_completo, nome_empresa, tipo),
          veiculo:veiculos(id, matricula, marca, modelo)
        `)
        .eq("proprietario_id", proprietarioId)
        .order("data_servico", { ascending: false });

      if (error) throw error;
      return data as ManutencaoGeral[];
    },
    enabled: !!proprietarioId,
  });
}

export function useManutencoesByVeiculo(veiculoId: string | null) {
  return useQuery({
    queryKey: ["manutencoes-geral", "veiculo", veiculoId],
    queryFn: async () => {
      if (!veiculoId) return [];
      const { data, error } = await supabase
        .from("manutencoes")
        .select(`
          *,
          proprietario:proprietarios(id, nome_completo, nome_empresa, tipo),
          veiculo:veiculos(id, matricula, marca, modelo)
        `)
        .eq("veiculo_id", veiculoId)
        .order("data_servico", { ascending: false });

      if (error) throw error;
      return data as ManutencaoGeral[];
    },
    enabled: !!veiculoId,
  });
}

export function useCreateManutencaoGeral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (manutencao: ManutencaoGeralInsert) => {
      const { data, error } = await supabase
        .from("manutencoes")
        .insert(manutencao)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manutencoes-geral"] });
      toast.success("Manutenção criada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar manutenção: " + error.message);
    },
  });
}

export function useUpdateManutencaoGeral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...manutencao }: ManutencaoGeralUpdate) => {
      const { data, error } = await supabase
        .from("manutencoes")
        .update(manutencao)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manutencoes-geral"] });
      toast.success("Manutenção atualizada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar manutenção: " + error.message);
    },
  });
}

export function useDeleteManutencaoGeral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("manutencoes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manutencoes-geral"] });
      toast.success("Manutenção excluída com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir manutenção: " + error.message);
    },
  });
}
