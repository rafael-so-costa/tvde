import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const BUCKET = "criminal-records";

export type RegistoCriminalStatus = "pendente_validacao" | "validado" | "rejeitado";

export interface RegistoCriminal {
  id: string;
  tenant_id: string;
  motorista_id: string;
  codigo_consulta: string | null;
  data_validade: string | null;
  data_emissao: string | null;
  nome_titular: string | null;
  arquivo_url: string;
  arquivo_path: string | null;
  arquivo_nome: string | null;
  arquivo_mime: string | null;
  status: RegistoCriminalStatus;
  dados_extraidos: Record<string, unknown>;
  observacoes_empresa: string | null;
  validado_por: string | null;
  validado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistoCriminalComMotorista extends RegistoCriminal {
  motorista: { id: string; nome_completo: string; email: string | null; ativo: boolean | null } | null;
}

/** Motorista associado ao utilizador autenticado. */
export function useMotoristaAtual() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["motorista-atual", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, tenant_id, nome_completo, email, registo_criminal_valid_until")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

/** Histórico de registos criminais de um motorista. */
export function useRegistosCriminaisMotorista(motoristaId: string | null | undefined) {
  return useQuery({
    queryKey: ["registos-criminais", "motorista", motoristaId],
    queryFn: async () => {
      if (!motoristaId) return [] as RegistoCriminal[];
      const { data, error } = await supabase
        .from("registos_criminais")
        .select("*")
        .eq("motorista_id", motoristaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RegistoCriminal[];
    },
    enabled: !!motoristaId,
  });
}

/** Todos os registos criminais do tenant (gestão da empresa). */
export function useRegistosCriminaisTenant() {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ["registos-criminais", "tenant", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [] as RegistoCriminalComMotorista[];
      const { data, error } = await supabase
        .from("registos_criminais")
        .select("*, motorista:motoristas(id, nome_completo, email, ativo)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RegistoCriminalComMotorista[];
    },
    enabled: !!tenant?.id,
  });
}

/** Motoristas ativos do tenant, para identificar quem ainda não enviou nada. */
export function useMotoristasAtivos() {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ["motoristas-ativos-registo-criminal", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, nome_completo, email, registo_criminal_valid_until")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome_completo");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });
}

export interface NovoRegistoCriminal {
  motoristaId: string;
  tenantId: string;
  file: File;
  codigoConsulta: string | null;
  dataValidade: string | null;
  dataEmissao: string | null;
  nomeTitular: string | null;
  dadosExtraidos: Record<string, unknown>;
}

export function useCriarRegistoCriminal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: NovoRegistoCriminal) => {
      const ext = input.file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${input.tenantId}/${input.motoristaId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("registos_criminais")
        .insert({
          tenant_id: input.tenantId,
          motorista_id: input.motoristaId,
          codigo_consulta: input.codigoConsulta,
          data_validade: input.dataValidade,
          data_emissao: input.dataEmissao,
          nome_titular: input.nomeTitular,
          arquivo_url: path,
          arquivo_path: path,
          arquivo_nome: input.file.name,
          arquivo_mime: input.file.type || null,
          dados_extraidos: input.dadosExtraidos as never,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as RegistoCriminal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registos-criminais"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-admin"] });
      toast.success("Registo criminal enviado. Aguarda validação da empresa.");
    },
    onError: (err: Error) => toast.error("Não foi possível enviar: " + err.message),
  });
}

export function useValidarRegistoCriminal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: RegistoCriminalStatus;
      observacoes?: string | null;
      codigoConsulta?: string | null;
      dataValidade?: string | null;
    }) => {
      const { error } = await supabase
        .from("registos_criminais")
        .update({
          status: input.status,
          observacoes_empresa: input.observacoes ?? null,
          ...(input.codigoConsulta !== undefined ? { codigo_consulta: input.codigoConsulta } : {}),
          ...(input.dataValidade !== undefined ? { data_validade: input.dataValidade } : {}),
          validado_por: user?.id ?? null,
          validado_em: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["registos-criminais"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-admin"] });
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
      toast.success(vars.status === "validado" ? "Registo validado" : "Registo rejeitado");
    },
    onError: (err: Error) => toast.error("Erro ao atualizar: " + err.message),
  });
}

/** Link temporário para abrir/descarregar o ficheiro guardado. */
export async function obterLinkRegistoCriminal(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export function diasParaVencer(validade: string | null | undefined) {
  if (!validade) return null;
  const diff = new Date(validade + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
