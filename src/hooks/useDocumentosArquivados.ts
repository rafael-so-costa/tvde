import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DocumentoArquivado {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  tipo_documento: string;
  arquivo_url: string;
  data_validade: string | null;
  uploaded_at: string | null;
}

export function useDocumentosArquivados(entidadeTipo: string, entidadeId: string | null | undefined) {
  return useQuery({
    queryKey: ["documentos_arquivados", entidadeTipo, entidadeId],
    queryFn: async () => {
      if (!entidadeId) return [] as DocumentoArquivado[];
      const { data, error } = await supabase
        .from("documentos_arquivados")
        .select("*")
        .eq("entidade_tipo", entidadeTipo)
        .eq("entidade_id", entidadeId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DocumentoArquivado[];
    },
    enabled: !!entidadeId,
  });
}

export function useCreateDocumentoArquivado() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      entidade_tipo: string;
      entidade_id: string;
      tipo_documento: string;
      arquivo_url: string;
      data_validade?: string | null;
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant não definido");
      const { data, error } = await supabase
        .from("documentos_arquivados")
        .insert({
          tenant_id: profile.tenant_id,
          entidade_tipo: input.entidade_tipo,
          entidade_id: input.entidade_id,
          tipo_documento: input.tipo_documento,
          arquivo_url: input.arquivo_url,
          data_validade: input.data_validade || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DocumentoArquivado;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["documentos_arquivados", vars.entidade_tipo, vars.entidade_id],
      });
      toast.success("Documento adicionado");
    },
    onError: (err: Error) => toast.error("Erro ao guardar documento: " + err.message),
  });
}

export function useDeleteDocumentoArquivado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: { id: string; entidade_tipo: string; entidade_id: string }) => {
      const { error } = await supabase
        .from("documentos_arquivados")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
      return doc;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({
        queryKey: ["documentos_arquivados", doc.entidade_tipo, doc.entidade_id],
      });
      toast.success("Documento removido");
    },
    onError: (err: Error) => toast.error("Erro ao remover: " + err.message),
  });
}
