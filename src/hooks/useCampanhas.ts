import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Frequencia = "unica" | "diario" | "semanal" | "mensal" | "personalizado";
export type PublicoTipo = "motoristas" | "proprietarios" | "ambos" | "funcionarios" | "todos" | "especificos" | "lista";
export type TipoEnvio = "imediato" | "agendado";
export type EscopoCampanha = "externo" | "interno";

export interface Campanha {
  id: string;
  tenant_id: string;
  created_by: string | null;
  nome: string;
  conteudo: string;
  publico_tipo: PublicoTipo;
  filtro_ativo: boolean | null;
  destinatarios_ids: string[];
  tipo_envio: TipoEnvio;
  frequencia: Frequencia;
  dias_semana: number[];
  dias_mes: number[];
  hora_envio: string;
  data_inicio: string | null;
  data_fim: string | null;
  ativo: boolean;
  escopo: EscopoCampanha;
  somente_leitura: boolean;
  ultima_execucao_at: string | null;
  total_enviado: number;
  created_at: string;
  updated_at: string;
}

export type CampanhaInput = Omit<
  Campanha,
  "id" | "tenant_id" | "created_by" | "ultima_execucao_at" | "total_enviado" | "created_at" | "updated_at"
>;

export function useCampanhas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campanhas-chat"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campanhas_chat" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Campanha[];
    },
  });
}

export function useCreateCampanha() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CampanhaInput) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!profile?.tenant_id) throw new Error("Tenant não encontrado");

      const { data, error } = await supabase
        .from("campanhas_chat" as any)
        .insert({ ...input, tenant_id: profile.tenant_id, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanhas-chat"] });
      toast.success("Campanha criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<CampanhaInput> & { ativo?: boolean }) => {
      const { error } = await supabase.from("campanhas_chat" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanhas-chat"] });
      toast.success("Campanha atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campanhas_chat" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanhas-chat"] });
      toast.success("Campanha eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useExecutarCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("executar_campanha" as any, { _campanha_id: id });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["campanhas-chat"] });
      qc.invalidateQueries({ queryKey: ["conversas"] });
      toast.success(`${count} mensagem(ns) enviada(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Audiência: lista motoristas + proprietários + funcionários do tenant para seleção
export function useAudienciaUsers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["audiencia-users"],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: motoristas }, { data: proprietarios }, { data: funcionarios }] = await Promise.all([
        supabase.from("motoristas").select("id, user_id, nome_completo, ativo").not("user_id", "is", null),
        supabase
          .from("proprietarios")
          .select("id, user_id, nome_completo, nome_empresa, tipo, ativo")
          .not("user_id", "is", null),
        supabase.from("funcionarios").select("id, user_id, nome, sobrenome, ativo").not("user_id", "is", null),
      ]);
      const m = (motoristas ?? []).map((r) => ({
        user_id: r.user_id as string,
        nome: r.nome_completo,
        tipo: "motorista" as const,
        ativo: r.ativo ?? true,
      }));
      const p = (proprietarios ?? []).map((r) => ({
        user_id: r.user_id as string,
        nome: r.tipo === "empresa" ? r.nome_empresa ?? r.nome_completo ?? "Empresa" : r.nome_completo ?? "Proprietário",
        tipo: "proprietario" as const,
        ativo: r.ativo ?? true,
      }));
      const f = (funcionarios ?? []).map((r) => ({
        user_id: r.user_id as string,
        nome: [r.nome, r.sobrenome].filter(Boolean).join(" ") || "Funcionário",
        tipo: "funcionario" as const,
        ativo: r.ativo ?? true,
      }));
      return [...m, ...p, ...f];
    },
  });
}
