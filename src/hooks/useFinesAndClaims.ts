import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDeleteFine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fineId: string) => {
      const { error } = await supabase
        .from("multas")
        .delete()
        .eq("id", fineId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-fines"] });
      queryClient.invalidateQueries({ queryKey: ["driver-fines"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-fines"] });
      toast.success("Multa excluída com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir multa: " + error.message);
    },
  });
}

export function useUpdateFine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("multas")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-fines"] });
      queryClient.invalidateQueries({ queryKey: ["driver-fines"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-fines"] });
      toast.success("Multa atualizada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar multa: " + error.message);
    },
  });
}

export function useDeleteClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimId: string) => {
      const { error } = await supabase
        .from("sinistros")
        .delete()
        .eq("id", claimId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-claims"] });
      queryClient.invalidateQueries({ queryKey: ["driver-claims"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-claims"] });
      toast.success("Sinistro excluído com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir sinistro: " + error.message);
    },
  });
}

export function useUpdateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("sinistros")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-claims"] });
      queryClient.invalidateQueries({ queryKey: ["driver-claims"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-claims"] });
      toast.success("Sinistro atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar sinistro: " + error.message);
    },
  });
}
