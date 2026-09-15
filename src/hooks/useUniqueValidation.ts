import { supabase } from "@/integrations/supabase/client";

export async function checkNifExists(
  nif: string,
  excludeId?: string,
  table: "motoristas" | "proprietarios" = "motoristas"
): Promise<boolean> {
  if (!nif || nif.trim() === "") return false;
  
  let query = supabase
    .from(table)
    .select("id")
    .eq("nif", nif.trim());
  
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  
  const { data, error } = await query.limit(1);
  
  if (error) {
    console.error("Error checking NIF:", error);
    return false;
  }
  
  return data && data.length > 0;
}

export async function checkMatriculaExists(
  matricula: string,
  excludeId?: string
): Promise<boolean> {
  if (!matricula || matricula.trim() === "") return false;
  
  let query = supabase
    .from("veiculos")
    .select("id")
    .eq("matricula", matricula.trim().toUpperCase());
  
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  
  const { data, error } = await query.limit(1);
  
  if (error) {
    console.error("Error checking matricula:", error);
    return false;
  }
  
  return data && data.length > 0;
}

export async function checkEmailExists(email: string): Promise<boolean> {
  if (!email || email.trim() === "") return false;
  
  // Check in profiles table (covers all authenticated users)
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .limit(1);
  
  if (profileError) {
    console.error("Error checking email in profiles:", profileError);
  }
  
  if (profileData && profileData.length > 0) {
    return true;
  }
  
  // Also check in tenants table (for company emails)
  const { data: tenantData, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .limit(1);
  
  if (tenantError) {
    console.error("Error checking email in tenants:", tenantError);
  }
  
  return tenantData && tenantData.length > 0;
}
