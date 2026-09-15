import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SaasPapel = "owner" | "financeiro" | "suporte";

export interface SaasAdmin {
  id: string;
  user_id: string;
  email: string;
  nome: string | null;
  papel: SaasPapel;
  ativo: boolean;
  created_at: string;
}

export interface SaasPlano {
  id: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number | null;
  limite_veiculos: number | null;
  limite_motoristas: number | null;
  funcionalidades: string[];
  ativo: boolean;
  ordem: number;
}

export interface SaasSubscricao {
  id: string;
  tenant_id: string;
  plano_id: string | null;
  ciclo: "mensal" | "anual";
  estado: "trial" | "ativa" | "suspensa" | "cancelada";
  preco: number;
  desconto_percent: number;
  data_inicio: string;
  data_fim: string | null;
  proxima_renovacao: string | null;
  dia_vencimento: number;
  metodo_cobranca: string;
  provedor_externo: string | null;
  referencia_externa: string | null;
  notas: string | null;
}

export interface SaasFatura {
  id: string;
  numero: string;
  tenant_id: string;
  subscricao_id: string | null;
  cliente_nome: string | null;
  cliente_nif: string | null;
  cliente_endereco: string | null;
  cliente_email: string | null;
  data_emissao: string;
  data_vencimento: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  descricao: string | null;
  subtotal: number;
  taxa_iva: number;
  valor_iva: number;
  total: number;
  moeda: string;
  estado: "rascunho" | "emitida" | "paga" | "vencida" | "anulada";
  provedor: string | null;
  referencia_externa: string | null;
  url_fatura_provedor: string | null;
  notas: string | null;
  created_at: string;
}

export interface SaasPagamento {
  id: string;
  fatura_id: string | null;
  tenant_id: string;
  valor: number;
  data_pagamento: string;
  metodo: string;
  referencia: string | null;
  provedor: string | null;
  estado: "registado" | "confirmado" | "devolvido";
  notas: string | null;
  created_at: string;
}

export interface SaasConfigFaturacao {
  id: string;
  emitente_nome: string;
  emitente_nif: string | null;
  emitente_endereco: string | null;
  emitente_email: string | null;
  emitente_telefone: string | null;
  iban: string | null;
  logo_url: string | null;
  prefixo_numero: string;
  proximo_numero: number;
  taxa_iva: number;
  prazo_pagamento_dias: number;
  rodape: string | null;
}

export interface SaasCliente {
  id: string;
  nome_empresa: string;
  nif: string;
  email: string | null;
  telemovel: string | null;
  nome_gerente: string | null;
  ativo: boolean | null;
  created_at: string | null;
  subscricao: SaasSubscricao | null;
  plano_nome: string | null;
  total_faturado: number;
  total_pago: number;
}

export const formatEuro = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-PT") : "—";

/** Acesso do utilizador atual à área de gestão do SaaS. */
export function useSaasAcesso() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["saas-acesso", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_admins")
        .select("*")
        .eq("user_id", user!.id)
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw error;
      return (data as SaasAdmin | null) ?? null;
    },
  });

  const registo = query.data ?? null;
  const papel: SaasPapel | null = registo?.papel ?? (isSuperAdmin ? "owner" : null);

  return {
    loading: authLoading || (!!user?.id && query.isLoading),
    isSaasAdmin: !!registo || isSuperAdmin,
    isOwner: papel === "owner",
    podeFaturar: papel === "owner" || papel === "financeiro",
    papel,
    registo,
  };
}

export function useSaasMetricas() {
  return useQuery({
    queryKey: ["saas-metricas"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("saas_metricas");
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, number> | undefined;
      return {
        clientes_total: Number(row?.clientes_total ?? 0),
        clientes_ativos: Number(row?.clientes_ativos ?? 0),
        subscricoes_trial: Number(row?.subscricoes_trial ?? 0),
        subscricoes_suspensas: Number(row?.subscricoes_suspensas ?? 0),
        subscricoes_canceladas: Number(row?.subscricoes_canceladas ?? 0),
        novos_mes: Number(row?.novos_mes ?? 0),
        mrr: Number(row?.mrr ?? 0),
        arr: Number(row?.arr ?? 0),
        receita_mes: Number(row?.receita_mes ?? 0),
        em_divida: Number(row?.em_divida ?? 0),
        faturas_vencidas: Number(row?.faturas_vencidas ?? 0),
      };
    },
  });
}

export function useSaasClientes() {
  return useQuery({
    queryKey: ["saas-clientes"],
    queryFn: async (): Promise<SaasCliente[]> => {
      const [tenantsRes, subsRes, planosRes, faturasRes, pagamentosRes] = await Promise.all([
        supabase.from("tenants").select("*").order("nome_empresa"),
        supabase.from("saas_subscricoes").select("*"),
        supabase.from("saas_planos").select("id, nome"),
        supabase.from("saas_faturas").select("tenant_id, total, estado"),
        supabase.from("saas_pagamentos").select("tenant_id, valor, estado"),
      ]);
      if (tenantsRes.error) throw tenantsRes.error;
      if (subsRes.error) throw subsRes.error;

      const subs = (subsRes.data ?? []) as unknown as SaasSubscricao[];
      const planos = (planosRes.data ?? []) as { id: string; nome: string }[];
      const faturas = (faturasRes.data ?? []) as { tenant_id: string; total: number; estado: string }[];
      const pagamentos = (pagamentosRes.data ?? []) as { tenant_id: string; valor: number; estado: string }[];

      return (tenantsRes.data ?? []).map((t) => {
        const sub = subs.find((s) => s.tenant_id === t.id) ?? null;
        return {
          id: t.id,
          nome_empresa: t.nome_empresa,
          nif: t.nif,
          email: t.email,
          telemovel: t.telemovel,
          nome_gerente: t.nome_gerente,
          ativo: t.ativo,
          created_at: t.created_at,
          subscricao: sub,
          plano_nome: planos.find((p) => p.id === sub?.plano_id)?.nome ?? null,
          total_faturado: faturas
            .filter((f) => f.tenant_id === t.id && f.estado !== "anulada" && f.estado !== "rascunho")
            .reduce((acc, f) => acc + Number(f.total), 0),
          total_pago: pagamentos
            .filter((p) => p.tenant_id === t.id && p.estado === "confirmado")
            .reduce((acc, p) => acc + Number(p.valor), 0),
        };
      });
    },
  });
}

export function useSaasPlanos() {
  return useQuery({
    queryKey: ["saas-planos"],
    queryFn: async (): Promise<SaasPlano[]> => {
      const { data, error } = await supabase
        .from("saas_planos")
        .select("*")
        .order("ordem")
        .order("preco_mensal");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        funcionalidades: Array.isArray(p.funcionalidades) ? (p.funcionalidades as string[]) : [],
      })) as SaasPlano[];
    },
  });
}

export function useGuardarPlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plano: Partial<SaasPlano> & { nome: string }) => {
      const payload = {
        nome: plano.nome,
        descricao: plano.descricao ?? null,
        preco_mensal: plano.preco_mensal ?? 0,
        preco_anual: plano.preco_anual ?? null,
        limite_veiculos: plano.limite_veiculos ?? null,
        limite_motoristas: plano.limite_motoristas ?? null,
        funcionalidades: plano.funcionalidades ?? [],
        ativo: plano.ativo ?? true,
        ordem: plano.ordem ?? 0,
      };
      if (plano.id) {
        const { error } = await supabase.from("saas_planos").update(payload).eq("id", plano.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saas_planos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas-planos"] });
      qc.invalidateQueries({ queryKey: ["saas-clientes"] });
      toast.success("Plano guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEliminarPlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saas_planos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas-planos"] });
      toast.success("Plano eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGuardarSubscricao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: Partial<SaasSubscricao> & { tenant_id: string }) => {
      const payload = {
        tenant_id: sub.tenant_id,
        plano_id: sub.plano_id ?? null,
        ciclo: sub.ciclo ?? "mensal",
        estado: sub.estado ?? "trial",
        preco: sub.preco ?? 0,
        desconto_percent: sub.desconto_percent ?? 0,
        data_inicio: sub.data_inicio ?? new Date().toISOString().slice(0, 10),
        data_fim: sub.data_fim || null,
        proxima_renovacao: sub.proxima_renovacao || null,
        dia_vencimento: sub.dia_vencimento ?? 1,
        metodo_cobranca: sub.metodo_cobranca ?? "manual",
        referencia_externa: sub.referencia_externa || null,
        notas: sub.notas || null,
      };
      if (sub.id) {
        const { error } = await supabase.from("saas_subscricoes").update(payload).eq("id", sub.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saas_subscricoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas-clientes"] });
      qc.invalidateQueries({ queryKey: ["saas-metricas"] });
      toast.success("Subscrição guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaasFaturas() {
  return useQuery({
    queryKey: ["saas-faturas"],
    queryFn: async (): Promise<SaasFatura[]> => {
      const { data, error } = await supabase
        .from("saas_faturas")
        .select("*")
        .order("data_emissao", { ascending: false })
        .order("numero", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SaasFatura[];
    },
  });
}

export interface NovaFaturaInput {
  tenant_id: string;
  subscricao_id?: string | null;
  descricao: string;
  subtotal: number;
  taxa_iva: number;
  data_emissao: string;
  data_vencimento: string;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  provedor?: string | null;
  referencia_externa?: string | null;
  url_fatura_provedor?: string | null;
  notas?: string | null;
  emitir?: boolean;
}

export function useCriarFatura() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: NovaFaturaInput) => {
      const { data: numero, error: numeroError } = await supabase.rpc("saas_proximo_numero_fatura");
      if (numeroError) throw numeroError;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("nome_empresa, nif, endereco, email")
        .eq("id", input.tenant_id)
        .maybeSingle();

      const valorIva = Number(((input.subtotal * input.taxa_iva) / 100).toFixed(2));
      const total = Number((input.subtotal + valorIva).toFixed(2));

      const { data, error } = await supabase
        .from("saas_faturas")
        .insert({
          numero: numero as string,
          tenant_id: input.tenant_id,
          subscricao_id: input.subscricao_id ?? null,
          cliente_nome: tenant?.nome_empresa ?? null,
          cliente_nif: tenant?.nif ?? null,
          cliente_endereco: tenant?.endereco ?? null,
          cliente_email: tenant?.email ?? null,
          data_emissao: input.data_emissao,
          data_vencimento: input.data_vencimento,
          periodo_inicio: input.periodo_inicio || null,
          periodo_fim: input.periodo_fim || null,
          descricao: input.descricao,
          subtotal: input.subtotal,
          taxa_iva: input.taxa_iva,
          valor_iva: valorIva,
          total,
          estado: input.emitir === false ? "rascunho" : "emitida",
          provedor: input.provedor || null,
          referencia_externa: input.referencia_externa || null,
          url_fatura_provedor: input.url_fatura_provedor || null,
          notas: input.notas || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SaasFatura;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas-faturas"] });
      qc.invalidateQueries({ queryKey: ["saas-clientes"] });
      qc.invalidateQueries({ queryKey: ["saas-metricas"] });
      qc.invalidateQueries({ queryKey: ["saas-config-faturacao"] });
      toast.success("Fatura criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAtualizarFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SaasFatura> & { id: string }) => {
      const { error } = await supabase.from("saas_faturas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas-faturas"] });
      qc.invalidateQueries({ queryKey: ["saas-metricas"] });
      toast.success("Fatura atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaasPagamentos() {
  return useQuery({
    queryKey: ["saas-pagamentos"],
    queryFn: async (): Promise<SaasPagamento[]> => {
      const { data, error } = await supabase
        .from("saas_pagamentos")
        .select("*")
        .order("data_pagamento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SaasPagamento[];
    },
  });
}

export function useRegistarPagamento() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      fatura_id?: string | null;
      valor: number;
      data_pagamento: string;
      metodo: string;
      referencia?: string | null;
      notas?: string | null;
    }) => {
      const { error } = await supabase.from("saas_pagamentos").insert({
        tenant_id: input.tenant_id,
        fatura_id: input.fatura_id || null,
        valor: input.valor,
        data_pagamento: input.data_pagamento,
        metodo: input.metodo,
        referencia: input.referencia || null,
        notas: input.notas || null,
        estado: "confirmado",
        registado_por: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas-pagamentos"] });
      qc.invalidateQueries({ queryKey: ["saas-faturas"] });
      qc.invalidateQueries({ queryKey: ["saas-clientes"] });
      qc.invalidateQueries({ queryKey: ["saas-metricas"] });
      toast.success("Pagamento registado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaasEquipa() {
  return useQuery({
    queryKey: ["saas-equipa"],
    queryFn: async (): Promise<SaasAdmin[]> => {
      const { data, error } = await supabase
        .from("saas_admins")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as SaasAdmin[];
    },
  });
}

export function useGuardarMembroEquipa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (membro: { id?: string; email: string; nome?: string; papel: SaasPapel; ativo?: boolean; user_id?: string }) => {
      if (membro.id) {
        const { error } = await supabase
          .from("saas_admins")
          .update({ nome: membro.nome ?? null, papel: membro.papel, ativo: membro.ativo ?? true })
          .eq("id", membro.id);
        if (error) throw error;
        return;
      }

      const email = membro.email.trim().toLowerCase();
      const { data: perfil, error: perfilError } = await supabase
        .from("profiles")
        .select("user_id, nome_completo")
        .ilike("email", email)
        .maybeSingle();
      if (perfilError) throw perfilError;
      if (!perfil?.user_id) {
        throw new Error("Não existe nenhuma conta com este email. Crie primeiro a conta de utilizador.");
      }

      const { error } = await supabase.from("saas_admins").insert({
        user_id: perfil.user_id,
        email,
        nome: membro.nome || perfil.nome_completo || null,
        papel: membro.papel,
        ativo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas-equipa"] });
      toast.success("Equipa atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaasConfigFaturacao() {
  return useQuery({
    queryKey: ["saas-config-faturacao"],
    queryFn: async (): Promise<SaasConfigFaturacao | null> => {
      const { data, error } = await supabase
        .from("saas_config_faturacao")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as SaasConfigFaturacao) ?? null;
    },
  });
}

export function useGuardarConfigFaturacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: Partial<SaasConfigFaturacao>) => {
      const payload = {
        emitente_nome: cfg.emitente_nome ?? "",
        emitente_nif: cfg.emitente_nif || null,
        emitente_endereco: cfg.emitente_endereco || null,
        emitente_email: cfg.emitente_email || null,
        emitente_telefone: cfg.emitente_telefone || null,
        iban: cfg.iban || null,
        prefixo_numero: cfg.prefixo_numero || "FAT",
        proximo_numero: cfg.proximo_numero ?? 1,
        taxa_iva: cfg.taxa_iva ?? 23,
        prazo_pagamento_dias: cfg.prazo_pagamento_dias ?? 8,
        rodape: cfg.rodape || null,
      };
      if (cfg.id) {
        const { error } = await supabase.from("saas_config_faturacao").update(payload).eq("id", cfg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saas_config_faturacao").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas-config-faturacao"] });
      toast.success("Dados de faturação guardados");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
