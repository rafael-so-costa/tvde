import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoAusencia = "ferias" | "doenca" | "folga" | "outro";

export interface FuncionarioAusencia {
  id: string;
  tenant_id: string;
  funcionario_id: string;
  tipo: TipoAusencia;
  data_inicio: string;
  data_fim: string;
  substituto_id: string | null;
  substituicao_ativa: boolean;
  bloquear_acesso: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type AusenciaInput = Omit<
  FuncionarioAusencia,
  "id" | "tenant_id" | "created_at" | "updated_at"
>;

export const TIPO_AUSENCIA_LABEL: Record<TipoAusencia, string> = {
  ferias: "Férias",
  doenca: "Doença",
  folga: "Folga",
  outro: "Outro",
};

export function useAusencias(funcionarioId?: string) {
  return useQuery({
    queryKey: ["funcionario-ausencias", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionario_ausencias" as any)
        .select("*")
        .eq("funcionario_id", funcionarioId)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FuncionarioAusencia[];
    },
  });
}

export function useCreateAusencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AusenciaInput) => {
      const { data: func } = await supabase
        .from("funcionarios").select("tenant_id").eq("id", input.funcionario_id).maybeSingle();
      if (!func?.tenant_id) throw new Error("Funcionário não encontrado");
      const { data, error } = await supabase
        .from("funcionario_ausencias" as any)
        .insert({ ...input, tenant_id: func.tenant_id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["funcionario-ausencias", v.funcionario_id] });
      toast.success("Ausência registada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAusencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, funcionario_id, ...patch }: { id: string } & Partial<AusenciaInput> & { funcionario_id: string }) => {
      const { error } = await supabase.from("funcionario_ausencias" as any).update(patch).eq("id", id);
      if (error) throw error;
      return funcionario_id;
    },
    onSuccess: (funcionarioId) => {
      qc.invalidateQueries({ queryKey: ["funcionario-ausencias", funcionarioId] });
      toast.success("Ausência atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAusencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; funcionario_id: string }) => {
      const { error } = await supabase.from("funcionario_ausencias" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["funcionario-ausencias", v.funcionario_id] });
      toast.success("Ausência removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function isAusenciaAtivaHoje(a: FuncionarioAusencia, today = new Date()): boolean {
  const d = today.toISOString().slice(0, 10);
  return a.data_inicio <= d && a.data_fim >= d;
}
