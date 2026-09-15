import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProprietarioProfile() {
  const { user, activeRole } = useAuth();
  const isProprietario = activeRole === "proprietario";

  const { data: proprietarioId, isLoading } = useQuery({
    queryKey: ["proprietario-record-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("proprietarios")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!user?.id && isProprietario,
  });

  // Also fetch vehicle IDs owned by this proprietário for filtering fines/claims
  const { data: vehicleIds = [] } = useQuery({
    queryKey: ["proprietario-vehicle-ids", proprietarioId],
    queryFn: async () => {
      if (!proprietarioId) return [];
      const { data, error } = await supabase
        .from("veiculos")
        .select("id")
        .eq("proprietario_id", proprietarioId);
      if (error) throw error;
      return (data || []).map(v => v.id);
    },
    enabled: !!proprietarioId,
  });

  return {
    proprietarioId: isProprietario ? proprietarioId : null,
    vehicleIds: isProprietario ? vehicleIds : [],
    isProprietario,
    isLoading,
  };
}
