import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import type { Aluguer, AluguerRascunhoDados, StatusAluguer } from "@/types/aluguer";

const SELECT = `
  *,
  motorista:motoristas(id, nome_completo),
  veiculo:veiculos(id, matricula, marca, modelo),
  proprietario:proprietarios(id, tipo, nome_completo, nome_empresa),
  contrato_aluguer:contratos!alugueres_contrato_aluguer_id_fkey(id, status),
  contrato_prestacao:contratos!alugueres_contrato_prestacao_id_fkey(id, status)
`;

export function useAlugueres(status?: StatusAluguer) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const { data: alugueres = [], isLoading } = useQuery({
    queryKey: ["alugueres", tenantId, status ?? "all"],
    queryFn: async (): Promise<Aluguer[]> => {
      if (!tenantId) return [];
      let q = (supabase as any)
        .from("alugueres")
        .select(SELECT)
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Aluguer[];
    },
    enabled: !!tenantId,
  });

  const createRascunho = useMutation({
    mutationFn: async (dados: AluguerRascunhoDados = {}): Promise<Aluguer> => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("alugueres")
        .insert({
          tenant_id: tenantId,
          status: "rascunho",
          rascunho_passo: 1,
          rascunho_dados: dados,
          created_by: userData.user?.id ?? null,
          motorista_id: dados.motorista_id ?? null,
          veiculo_id: dados.veiculo_id ?? null,
          proprietario_id: dados.proprietario_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Aluguer;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alugueres"] }),
  });

  const updateAluguer = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Aluguer> & { rascunho_dados?: AluguerRascunhoDados } }) => {
      const { data, error } = await (supabase as any)
        .from("alugueres")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Aluguer;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alugueres"] }),
  });

  const ativarAluguer = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Aluguer> }) => {
      const { data, error } = await (supabase as any)
        .from("alugueres")
        .update({ ...patch, status: "ativo" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Aluguer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alugueres"] });
      toast.success("Aluguer ativado com sucesso");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao ativar aluguer"),
  });

  const finalizarAluguer = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).rpc("finalizar_aluguer", { _aluguer_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alugueres"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Aluguer finalizado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao finalizar aluguer"),
  });

  const finalizarDevolucao = useMutation({
    mutationFn: async (params: {
      aluguer_id: string;
      checklist_devolucao_id: string | null;
      contrato_prestacao_id: string | null;
      devolucao_tipo: "no_prazo" | "atraso";
      dias_atraso: number;
      valor_dia: number;
      multa_atraso: number;
      multas_adicionais: Array<{ nome: string; valor: number }>;
      penalizacoes_checklist: number;
      total_pagar: number;
      assinatura_motorista_url: string | null;
      assinatura_empresa_url: string | null;
      pdf_url: string | null;
      observacoes: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc("finalizar_devolucao_aluguer", {
        _aluguer_id: params.aluguer_id,
        _checklist_devolucao_id: params.checklist_devolucao_id,
        _contrato_prestacao_id: params.contrato_prestacao_id,
        _devolucao_tipo: params.devolucao_tipo,
        _dias_atraso: params.dias_atraso,
        _valor_dia: params.valor_dia,
        _multa_atraso: params.multa_atraso,
        _multas_adicionais: params.multas_adicionais,
        _penalizacoes_checklist: params.penalizacoes_checklist,
        _total_pagar: params.total_pagar,
        _assinatura_motorista_url: params.assinatura_motorista_url,
        _assinatura_empresa_url: params.assinatura_empresa_url,
        _pdf_url: params.pdf_url,
        _observacoes: params.observacoes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alugueres"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Devolução finalizada com sucesso");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao finalizar devolução"),
  });

  const removerAluguer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("alugueres").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alugueres"] });
      toast.success("Aluguer eliminado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao eliminar"),
  });

  return {
    alugueres,
    isLoading,
    createRascunho,
    updateAluguer,
    ativarAluguer,
    finalizarAluguer,
    finalizarDevolucao,
    removerAluguer,
  };
}
