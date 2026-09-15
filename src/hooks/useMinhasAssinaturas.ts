import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AssinaturaPendente {
  id: string;
  contrato_id: string;
  tenant_id: string;
  signatario_tipo: string;
  signatario_user_id: string | null;
  signatario_nome: string;
  signatario_email: string;
  placeholder: string | null;
  status: string;
  verificado: boolean;
  assinado_em: string | null;
  assinatura_url: string | null;
  solicitado_por: string | null;
  solicitado_em: string | null;
  created_at: string;
  contrato?: {
    id: string;
    tipo: string;
    status: string;
    created_at: string;
    template?: { nome: string } | null;
  } | null;
}

/**
 * Returns all digital signature requests that belong to the current user
 * (matched by email). Works for every role: motorista, proprietário,
 * funcionário, admin, etc.
 */
export function useMinhasAssinaturas() {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase();
  const userId = user?.id;

  return useQuery({
    queryKey: ["minhas-assinaturas", userId, email],
    queryFn: async (): Promise<AssinaturaPendente[]> => {
      if (!userId || !email) return [];
      const { data, error } = await supabase
        .from("assinaturas_digitais")
        .select(`
          *,
          contrato:contratos(id, tipo, status, created_at, template:templates_contrato(nome))
        `)
        .or(`signatario_user_id.eq.${userId},signatario_email.eq.${email}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!userId && !!email,
    staleTime: 1000 * 30,
  });
}

export function useAssinaturasPendentesCount() {
  const { data = [] } = useMinhasAssinaturas();
  return data.filter((a) => a.status !== "assinado" || !a.verificado).length;
}

export function useConfirmarAssinatura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      signatureId,
      assinaturaUrl,
    }: {
      signatureId: string;
      assinaturaUrl: string;
    }) => {
      const ipResp = await fetch("https://api.ipify.org?format=json").catch(() => null);
      const ip = ipResp ? (await ipResp.json().catch(() => null))?.ip : null;

      const { data, error } = await supabase
        .from("assinaturas_digitais")
        .update({
          assinatura_url: assinaturaUrl,
          verificado: true,
          status: "assinado",
          assinado_em: new Date().toISOString(),
          ip_address: ip ?? null,
          user_agent: navigator.userAgent,
        })
        .eq("id", signatureId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-assinaturas"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["contract-full-data"] });
      toast.success("Assinatura registrada com sucesso");
    },
    onError: (e: Error) => toast.error("Erro ao assinar: " + e.message),
  });
}
