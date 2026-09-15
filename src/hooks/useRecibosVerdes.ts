import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import type { AvisoValidacao } from "@/utils/greenReceiptParser";

const BUCKET = "recibos-verdes";

export type ReciboVerdeStatus = "pendente_validacao" | "validado" | "rejeitado";

export interface ReciboVerde {
  id: string;
  tenant_id: string;
  motorista_id: string;
  numero_documento: string | null;
  data_emissao: string | null;
  ano: number | null;
  mes: number | null;
  nif_emitente: string | null;
  nome_emitente: string | null;
  nif_adquirente: string | null;
  nome_adquirente: string | null;
  valor_base: number | null;
  valor_iva: number | null;
  retencao_irs: number | null;
  valor_total: number | null;
  arquivo_url: string;
  arquivo_path: string | null;
  arquivo_nome: string | null;
  arquivo_mime: string | null;
  status: ReciboVerdeStatus;
  dados_extraidos: Record<string, unknown>;
  avisos_validacao: AvisoValidacao[];
  observacoes_empresa: string | null;
  validado_por: string | null;
  validado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReciboVerdeComMotorista extends ReciboVerde {
  motorista: { id: string; nome_completo: string; email: string | null; nif: string | null } | null;
}

/** Recibos verdes de um motorista. */
export function useRecibosVerdesMotorista(motoristaId: string | null | undefined) {
  return useQuery({
    queryKey: ["recibos-verdes", "motorista", motoristaId],
    queryFn: async () => {
      if (!motoristaId) return [] as ReciboVerde[];
      const { data, error } = await supabase
        .from("recibos_verdes")
        .select("*")
        .eq("motorista_id", motoristaId)
        .order("data_emissao", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as ReciboVerde[];
    },
    enabled: !!motoristaId,
  });
}

/** Todos os recibos verdes do tenant (gestão da empresa). */
export function useRecibosVerdesTenant() {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ["recibos-verdes", "tenant", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [] as ReciboVerdeComMotorista[];
      const { data, error } = await supabase
        .from("recibos_verdes")
        .select("*, motorista:motoristas(id, nome_completo, email, nif)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReciboVerdeComMotorista[];
    },
    enabled: !!tenant?.id,
  });
}

export interface NovoReciboVerde {
  motoristaId: string;
  tenantId: string;
  file: File;
  numeroDocumento: string | null;
  dataEmissao: string | null;
  nifEmitente: string | null;
  nomeEmitente: string | null;
  nifAdquirente: string | null;
  nomeAdquirente: string | null;
  valorBase: number | null;
  valorIva: number | null;
  retencaoIrs: number | null;
  valorTotal: number | null;
  avisos: AvisoValidacao[];
  dadosExtraidos: Record<string, unknown>;
}

export function useCriarReciboVerde() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: NovoReciboVerde) => {
      const ext = input.file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${input.tenantId}/${input.motoristaId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const data = input.dataEmissao ? new Date(input.dataEmissao + "T00:00:00") : null;

      const { data: row, error } = await supabase
        .from("recibos_verdes")
        .insert({
          tenant_id: input.tenantId,
          motorista_id: input.motoristaId,
          numero_documento: input.numeroDocumento,
          data_emissao: input.dataEmissao,
          ano: data ? data.getFullYear() : null,
          mes: data ? data.getMonth() + 1 : null,
          nif_emitente: input.nifEmitente,
          nome_emitente: input.nomeEmitente,
          nif_adquirente: input.nifAdquirente,
          nome_adquirente: input.nomeAdquirente,
          valor_base: input.valorBase,
          valor_iva: input.valorIva,
          retencao_irs: input.retencaoIrs,
          valor_total: input.valorTotal,
          arquivo_url: path,
          arquivo_path: path,
          arquivo_nome: input.file.name,
          arquivo_mime: input.file.type || null,
          avisos_validacao: input.avisos as never,
          dados_extraidos: input.dadosExtraidos as never,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return row as unknown as ReciboVerde;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recibos-verdes"] });
      toast.success("Recibo enviado. Aguarda validação da empresa.");
    },
    onError: (err: Error) => toast.error("Não foi possível enviar: " + err.message),
  });
}

export function useValidarReciboVerde() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: ReciboVerdeStatus;
      observacoes?: string | null;
      valorTotal?: number | null;
      numeroDocumento?: string | null;
    }) => {
      const { error } = await supabase
        .from("recibos_verdes")
        .update({
          status: input.status,
          observacoes_empresa: input.observacoes ?? null,
          ...(input.valorTotal !== undefined ? { valor_total: input.valorTotal } : {}),
          ...(input.numeroDocumento !== undefined ? { numero_documento: input.numeroDocumento } : {}),
          validado_por: user?.id ?? null,
          validado_em: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recibos-verdes"] });
      toast.success(vars.status === "validado" ? "Recibo validado" : "Recibo rejeitado");
    },
    onError: (err: Error) => toast.error("Erro ao atualizar: " + err.message),
  });
}

/** Link temporário para abrir o PDF guardado. */
export async function obterLinkReciboVerde(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export function formatarEuros(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(valor));
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
