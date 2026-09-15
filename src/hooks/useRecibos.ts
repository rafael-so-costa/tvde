import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Recibo {
  id: string;
  tenant_id: string;
  funcionario_id: string;
  ano: number;
  mes: number;
  arquivo_url: string;
  arquivo_nome: string | null;
  created_at: string;
}

export function useRecibos(funcionarioId: string | null, ano: number) {
  return useQuery({
    queryKey: ["recibos", funcionarioId, ano],
    enabled: !!funcionarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recibos_vencimento")
        .select("*")
        .eq("funcionario_id", funcionarioId!)
        .eq("ano", ano)
        .order("mes");
      if (error) throw error;
      return data as Recibo[];
    },
  });
}

export function useUploadRecibo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      funcionarioId,
      tenantId,
      ano,
      mes,
      file,
    }: {
      funcionarioId: string;
      tenantId: string;
      ano: number;
      mes: number;
      file: File;
    }) => {
      const path = `recibos/${funcionarioId}/${ano}/${mes}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("recibos_vencimento")
        .upsert(
          {
            funcionario_id: funcionarioId,
            tenant_id: tenantId,
            ano,
            mes,
            arquivo_url: path,
            arquivo_nome: file.name,
            uploaded_by: userData.user?.id,
          },
          { onConflict: "funcionario_id,ano,mes" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recibos", vars.funcionarioId, vars.ano] });
      toast.success("Recibo enviado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteRecibo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recibo: Recibo) => {
      await supabase.storage.from("documents").remove([recibo.arquivo_url]);
      const { error } = await supabase
        .from("recibos_vencimento")
        .delete()
        .eq("id", recibo.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recibos", vars.funcionario_id, vars.ano] });
      toast.success("Recibo removido");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export async function getReciboSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
