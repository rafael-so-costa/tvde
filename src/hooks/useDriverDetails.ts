import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDriverContracts(driverId: string | null) {
  return useQuery({
    queryKey: ["driver-contracts", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from("contratos")
        .select(`
          *,
          templates_contrato:template_id (id, nome),
          proprietarios:proprietario_id (id, nome_empresa, nome_completo, tipo),
          veiculos:veiculo_id (id, matricula, marca, modelo, foto_principal_url)
        `)
        .eq("motorista_id", driverId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!driverId,
  });
}

export function useDriverCurrentVehicle(driverId: string | null) {
  return useQuery({
    queryKey: ["driver-current-vehicle", driverId],
    queryFn: async () => {
      if (!driverId) return null;
      
      // Get current active assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("contratos_ativos_veiculos")
        .select(`
          *,
          veiculos:veiculo_id (id, matricula, marca, modelo, foto_principal_url)
        `)
        .eq("motorista_id", driverId)
        .eq("ativo", true)
        .maybeSingle();
      
      if (assignmentError) throw assignmentError;
      return assignment;
    },
    enabled: !!driverId,
  });
}

export function useDriverVehicleHistory(driverId: string | null) {
  return useQuery({
    queryKey: ["driver-vehicle-history", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from("contratos_ativos_veiculos")
        .select(`
          *,
          veiculos:veiculo_id (id, matricula, marca, modelo, foto_principal_url)
        `)
        .eq("motorista_id", driverId)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!driverId,
  });
}

export class DriverLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriverLimitError";
  }
}

export function useAssignVehicleToDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driverId,
      vehicleId,
      replaceDriverId,
    }: {
      driverId: string;
      vehicleId: string;
      tenantId?: string;
      contractId?: string;
      /** ID do motorista que deve ser substituído (opcional) */
      replaceDriverId?: string;
    }) => {
      const { data, error } = await supabase.rpc("atribuir_motorista_veiculo", {
        _motorista_id: driverId,
        _veiculo_id: vehicleId,
        _substituir_motorista_id: replaceDriverId ?? null,
      });

      if (error) {
        if (error.message?.includes("LIMITE_MOTORISTAS_ATIVOS")) {
          throw new DriverLimitError(
            "Este veículo já possui 3 motoristas ativos. Para adicionar um novo, é necessário substituir um dos atuais."
          );
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["driver-current-vehicle", variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ["driver-vehicle-history", variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-active-drivers", variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-current-driver", variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-driver-history", variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Veículo atribuído com sucesso");
    },
    onError: (error: Error) => {
      if (error instanceof DriverLimitError) {
        // Não mostrar toast — UI vai abrir diálogo de substituição
        return;
      }
      toast.error(error.message || "Erro ao atribuir veículo");
    },
  });
}

export function useUnassignVehicleFromDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("contratos_ativos_veiculos")
        .update({ 
          ativo: false, 
          data_fim: new Date().toISOString() 
        })
        .eq("id", assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-current-vehicle"] });
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Atribuição removida com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao remover atribuição: " + (error as Error).message);
    },
  });
}
