import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Tenant {
  id: string;
  nome_empresa: string;
  nif: string;
  iban: string | null;
  email: string | null;
  telemovel: string | null;
  nome_gerente: string | null;
  endereco: string | null;
  logo_url: string | null;
  ativo: boolean;
  capital_social: number | null;
  certificado_tvde: string | null;
  certificado_tvde_valid_until: string | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refetchTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async () => {
    if (!profile?.tenant_id) {
      setTenant(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setTenant(data);
        setError(null);
      }
    } catch (err) {
      setError("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchTenant();
    }
  }, [profile?.tenant_id, authLoading]);

  const refetchTenant = async () => {
    await fetchTenant();
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refetchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
