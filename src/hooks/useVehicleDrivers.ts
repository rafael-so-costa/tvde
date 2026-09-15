import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MAX_ACTIVE_DRIVERS_PER_VEHICLE = 3;

/**
 * @deprecated Use useVehicleActiveDrivers — um veículo pode ter até 3 motoristas ativos.
 * Mantido por retrocompatibilidade: devolve o motorista ativo mais recente.
 */
export function useVehicleCurrentDriver(vehicleId: string | null) {
  return useQuery({
    queryKey: ["vehicle-current-driver", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data, error } = await supabase
        .from("contratos_ativos_veiculos")
        .select(`
          *,
          motoristas:motorista_id (id, nome_completo, foto_perfil_url, telemovel, email)
        `)
        .eq("veiculo_id", vehicleId)
        .eq("ativo", true)
        .order("data_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });
}

export function useVehicleActiveDrivers(vehicleId: string | null) {
  return useQuery({
    queryKey: ["vehicle-active-drivers", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("contratos_ativos_veiculos")
        .select(`
          *,
          motoristas:motorista_id (id, nome_completo, foto_perfil_url, telemovel, email)
        `)
        .eq("veiculo_id", vehicleId)
        .eq("ativo", true)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });
}

export function useVehicleDriverHistory(vehicleId: string | null) {
  return useQuery({
    queryKey: ["vehicle-driver-history", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("contratos_ativos_veiculos")
        .select(`
          *,
          motoristas:motorista_id (id, nome_completo, foto_perfil_url)
        `)
        .eq("veiculo_id", vehicleId)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });
}
