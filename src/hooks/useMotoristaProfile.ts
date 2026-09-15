import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMotoristaProfile() {
  const { user, activeRole } = useAuth();
  const isMotorista = activeRole === "motorista";

  const { data: motoristaId, isLoading } = useQuery({
    queryKey: ["motorista-record-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("motoristas")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!user?.id && isMotorista,
  });

  return { motoristaId: isMotorista ? motoristaId : null, isMotorista, isLoading };
}
