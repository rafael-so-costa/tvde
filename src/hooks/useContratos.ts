import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useMotoristaProfile } from "@/hooks/useMotoristaProfile";
import { useProprietarioProfile } from "@/hooks/useProprietarioProfile";
import { toast } from "sonner";
import type { Contract, ContractVersion, DigitalSignature, ContractAuditLog } from "@/types/contract";
import type { Json } from "@/integrations/supabase/types";
import { resolveSignatureMap } from "@/utils/signatureImageUrls";

export function useContratos() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { motoristaId, isMotorista } = useMotoristaProfile();
  const { proprietarioId, isProprietario } = useProprietarioProfile();
  const queryClient = useQueryClient();

  const { data: contratos = [], isLoading, error } = useQuery({
    queryKey: ["contratos", tenantId, motoristaId, isMotorista, proprietarioId, isProprietario],
    queryFn: async () => {
      if (!tenantId) return [];
      if (isMotorista && !motoristaId) return [];
      if (isProprietario && !proprietarioId) return [];
      
      let query = supabase
        .from("contratos")
        .select(`
          *,
          template:templates_contrato(*),
          motorista:motoristas(
            id, nome_completo, nif, email, telemovel, iban,
            endereco_rua, endereco_numero, endereco_complemento, endereco_cep, endereco_cidade,
            tipo_documento, numero_documento, documento_valid_until,
            certificado_tvde, carta_numero, carta_valid_until, data_nascimento
          ),
          proprietario:proprietarios(
            id, tipo, nome_completo, nome_empresa, nome_gerente, nif, email, telemovel, iban,
            endereco_rua, endereco_numero, endereco_complemento, endereco_cep, endereco_cidade,
            tipo_documento, numero_documento, documento_valid_until, capital_social
          ),
          veiculo:veiculos(
            id, matricula, marca, modelo, data_matricula, chassi, cilindrada, potencia,
            combustivel, lugares, portas, cor, valor_caucao, valor_aluguel
          )
        `)
        .eq("tenant_id", tenantId);

      if (isMotorista && motoristaId) {
        query = query.eq("motorista_id", motoristaId);
      }
      if (isProprietario && proprietarioId) {
        query = query.eq("proprietario_id", proprietarioId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to match Contract type
      return (data || []).map((item) => ({
        ...item,
        campos_preenchidos: item.campos_preenchidos as Record<string, any>,
        template: item.template ? {
          ...item.template,
          campos_detectados: (item.template.campos_detectados as any[]) || [],
          campos_mapeados: (item.template.campos_mapeados as Record<string, any>) || {},
        } : undefined,
      })) as Contract[];
    },
    enabled: !!tenantId,
  });

  const createContrato = useMutation({
    mutationFn: async (contrato: Partial<Contract>) => {
      if (!tenantId) throw new Error("Tenant não encontrado");

      const { data, error } = await supabase
        .from("contratos")
        .insert({
          tenant_id: tenantId,
          tipo: contrato.tipo || "aluguer",
          status: (contrato as any).status || "rascunho",
          versao_atual: 1,
          motorista_id: contrato.motorista_id,
          proprietario_id: contrato.proprietario_id,
          veiculo_id: contrato.veiculo_id,
          template_id: contrato.template_id,
          data_inicio: contrato.data_inicio,
          data_fim: contrato.data_fim,
          valor_semanal: contrato.valor_semanal,
          valor_diaria: contrato.valor_diaria,
          valor_caucao: contrato.valor_caucao,
          valor_total: contrato.valor_total,
          campos_preenchidos: (contrato.campos_preenchidos || {}) as Json,
          data_assinatura: (contrato as any).data_assinatura ?? null,
          assinatura_motorista_url: (contrato as any).assinatura_motorista_url ?? null,
          assinatura_proprietario_url: (contrato as any).assinatura_proprietario_url ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial version
      await supabase.from("versoes_contrato").insert({
        contrato_id: data.id,
        tenant_id: tenantId,
        versao_numero: 1,
        dados_campos: (contrato.campos_preenchidos || {}) as Json,
        observacoes: "Versão inicial",
      });

      // Log action
      await logAction(data.id, "criacao", { tipo: contrato.tipo });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar contrato: " + error.message);
    },
  });

  const updateContrato = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contract> & { id: string }) => {
      const { data: current } = await supabase
        .from("contratos")
        .select("versao_atual, bloqueado")
        .eq("id", id)
        .single();

      if (current?.bloqueado) {
        throw new Error("Contrato bloqueado para edição");
      }

      const newVersion = (current?.versao_atual || 0) + 1;

      const { data, error } = await supabase
        .from("contratos")
        .update({
          versao_atual: newVersion,
          updated_at: new Date().toISOString(),
          motorista_id: updates.motorista_id,
          proprietario_id: updates.proprietario_id,
          veiculo_id: updates.veiculo_id,
          template_id: updates.template_id,
          data_inicio: updates.data_inicio,
          data_fim: updates.data_fim,
          valor_semanal: updates.valor_semanal,
          valor_diaria: updates.valor_diaria,
          valor_caucao: updates.valor_caucao,
          valor_total: updates.valor_total,
          status: updates.status,
          campos_preenchidos: updates.campos_preenchidos as Json,
          bloqueado: updates.bloqueado,
          hash_documento: updates.hash_documento,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Create new version
      if (tenantId && updates.campos_preenchidos) {
        await supabase.from("versoes_contrato").insert({
          contrato_id: id,
          tenant_id: tenantId,
          versao_numero: newVersion,
          dados_campos: updates.campos_preenchidos as Json,
          observacoes: "Atualização de campos",
        });
      }

      // Log action
      await logAction(id, "edicao", { campos_alterados: Object.keys(updates) });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar contrato: " + error.message);
    },
  });

  const deleteContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contratos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir contrato: " + error.message);
    },
  });

  const logAction = async (
    contratoId: string,
    acao: ContractAuditLog["acao"],
    detalhes: Record<string, any> = {}
  ) => {
    if (!tenantId) return;

    try {
      await supabase.from("logs_auditoria_contratos").insert({
        contrato_id: contratoId,
        tenant_id: tenantId,
        acao,
        detalhes: detalhes as Json,
      });
    } catch (e) {
      console.error("Erro ao registrar log:", e);
    }
  };

  return {
    contratos,
    isLoading,
    error,
    createContrato,
    updateContrato,
    deleteContrato,
    logAction,
  };
}

export function useContratoVersions(contratoId: string | null) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["contrato-versions", contratoId],
    queryFn: async () => {
      if (!contratoId || !tenantId) return [];

      const { data, error } = await supabase
        .from("versoes_contrato")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("versao_numero", { ascending: false });

      if (error) throw error;
      return (data || []).map((item) => ({
        ...item,
        dados_campos: item.dados_campos as Record<string, any>,
      })) as ContractVersion[];
    },
    enabled: !!contratoId && !!tenantId,
  });
}

export function useContratoSignatures(contratoId: string | null) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const { data: assinaturas = [], isLoading } = useQuery({
    queryKey: ["contrato-signatures", contratoId],
    queryFn: async () => {
      if (!contratoId || !tenantId) return [];

      const { data, error } = await supabase
        .from("assinaturas_digitais")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return resolveSignatureMap((data as DigitalSignature[]) || []);
    },
    enabled: !!contratoId && !!tenantId,
  });

  const createSignatureRequest = useMutation({
    mutationFn: async (signature: Partial<DigitalSignature>) => {
      if (!tenantId || !contratoId) throw new Error("Dados incompletos");

      const token = crypto.randomUUID();
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      const { data, error } = await supabase
        .from("assinaturas_digitais")
        .insert({
          contrato_id: contratoId,
          tenant_id: tenantId,
          signatario_tipo: signature.signatario_tipo || "motorista",
          signatario_id: signature.signatario_id,
          signatario_nome: signature.signatario_nome || "",
          signatario_email: signature.signatario_email || "",
          token_verificacao: token,
          codigo_otp: otp,
          otp_expira_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, otp };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato-signatures"] });
      toast.success("Solicitação de assinatura criada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar solicitação: " + error.message);
    },
  });

  const confirmSignature = useMutation({
    mutationFn: async ({
      signatureId,
      otp,
      assinaturaUrl,
    }: {
      signatureId: string;
      otp: string;
      assinaturaUrl: string;
    }) => {
      // Verify OTP
      const { data: signature, error: fetchError } = await supabase
        .from("assinaturas_digitais")
        .select("*")
        .eq("id", signatureId)
        .single();

      if (fetchError) throw fetchError;

      if (signature.codigo_otp !== otp) {
        throw new Error("Código OTP inválido");
      }

      if (signature.otp_expira_em && new Date(signature.otp_expira_em) < new Date()) {
        throw new Error("Código OTP expirado");
      }

      // Generate document hash
      const hash = await generateHash(contratoId + signatureId + Date.now());

      const { data, error } = await supabase
        .from("assinaturas_digitais")
        .update({
          assinatura_url: assinaturaUrl,
          verificado: true,
          status: "assinado",
          assinado_em: new Date().toISOString(),
          hash_documento: hash,
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent,
        })
        .eq("id", signatureId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato-signatures"] });
      queryClient.invalidateQueries({ queryKey: ["contract-signatures-preview"] });
      queryClient.invalidateQueries({ queryKey: ["contract-full-data"] });
      toast.success("Assinatura registrada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro na assinatura: " + error.message);
    },
  });

  return {
    assinaturas,
    isLoading,
    createSignatureRequest,
    confirmSignature,
  };
}

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getClientIP(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch {
    return "unknown";
  }
}
