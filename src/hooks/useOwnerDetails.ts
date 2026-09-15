import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOwnerVehicles(ownerId: string | null) {
  return useQuery({
    queryKey: ["owner-vehicles", ownerId],
    queryFn: async () => {
      if (!ownerId) return [];
      const { data, error } = await supabase
        .from("veiculos")
        .select("*")
        .eq("proprietario_id", ownerId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ownerId,
  });
}

export function useOwnerContracts(ownerId: string | null) {
  return useQuery({
    queryKey: ["owner-contracts", ownerId],
    queryFn: async () => {
      if (!ownerId) return [];
      const { data, error } = await supabase
        .from("contratos")
        .select(`
          *,
          templates_contrato:template_id (id, nome),
          motoristas:motorista_id (id, nome_completo),
          veiculos:veiculo_id (id, matricula, marca, modelo, foto_principal_url)
        `)
        .eq("proprietario_id", ownerId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ownerId,
  });
}
