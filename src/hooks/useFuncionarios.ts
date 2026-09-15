import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MenuKey, PermissionLevel } from "./usePermissions";

export interface Funcionario {
  id: string;
  user_id: string | null;
  nome: string;
  sobrenome: string | null;
  email: string | null;
  nif: string | null;
  tipo: string;
  ativo: boolean;
  tenant_id: string;
  foto_perfil_url: string | null;
  fotos_galeria: string[] | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_cidade: string | null;
  endereco_cep: string | null;
  iban: string | null;
  telemovel: string | null;
  contato_urgencia_nome: string | null;
  contato_urgencia_telemovel: string | null;
  substituicao_ativa?: boolean;
  substituto_id?: string | null;
  substituicao_inicio?: string | null;
  substituicao_fim?: string | null;
}

/**
 * Verifica se a substituição está ativa hoje (entre as datas configuradas).
 */
export function isSubstituicaoAtivaHoje(f: Pick<Funcionario, "substituicao_ativa" | "substituto_id" | "substituicao_inicio" | "substituicao_fim">): boolean {
  if (!f.substituicao_ativa || !f.substituto_id) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (f.substituicao_inicio && f.substituicao_inicio > today) return false;
  if (f.substituicao_fim && f.substituicao_fim < today) return false;
  return true;
}

export interface FuncionarioPermissao {
  menu_key: string;
  nivel: PermissionLevel;
}

export function useFuncionarios() {
  return useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data as any[]).map((f) => ({
        ...f,
        fotos_galeria: Array.isArray(f.fotos_galeria) ? f.fotos_galeria : [],
      })) as Funcionario[];
    },
  });
}

export function useFuncionarioById(id: string | null) {
  return useQuery({
    queryKey: ["funcionario", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        fotos_galeria: Array.isArray((data as any).fotos_galeria) ? (data as any).fotos_galeria : [],
      } as Funcionario;
    },
  });
}

export function useFuncionarioAssuntos(funcionarioId: string | null) {
  return useQuery({
    queryKey: ["funcionario-assuntos", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assunto_responsaveis")
        .select("assuntos_chat(id, nome, ativo)")
        .eq("funcionario_id", funcionarioId!);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => r.assuntos_chat)
        .filter(Boolean) as { id: string; nome: string; ativo: boolean }[];
    },
  });
}

export function useFuncionarioPermissoes(funcionarioId: string | null) {
  return useQuery({
    queryKey: ["funcionario-permissoes", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissoes_funcionario")
        .select("menu_key, nivel")
        .eq("funcionario_id", funcionarioId!);
      if (error) throw error;
      return data as FuncionarioPermissao[];
    },
  });
}

export interface SaveFuncionarioInput {
  funcionario_id?: string;
  nome: string;
  email: string;
  password?: string;
  tipo: string;
  permissoes: { menu_key: MenuKey; nivel: PermissionLevel }[];
}

export function useSaveFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveFuncionarioInput) => {
      const { data, error } = await supabase.functions.invoke("create-employee-account", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário guardado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateFuncionarioProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Funcionario> }) => {
      const { error } = await supabase.from("funcionarios").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      queryClient.invalidateQueries({ queryKey: ["funcionario", vars.id] });
      toast.success("Perfil atualizado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useToggleFuncionarioAtivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("funcionarios").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["funcionarios"] }),
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funcionarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário removido");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
