import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import type { ContractTemplate, ContractField } from "@/types/contract";
import type { Json } from "@/integrations/supabase/types";

export function useTemplatesContrato(perfilId?: string | null) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["templates-contrato", tenantId, perfilId ?? "all"],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const baseQuery: any = supabase
        .from("templates_contrato")
        .select("*")
        .eq("tenant_id", tenantId);

      const finalQuery = perfilId ? baseQuery.eq("perfil_id", perfilId) : baseQuery;
      const { data, error } = await finalQuery.order("created_at", { ascending: false });

      if (error) throw error;
      
      return ((data as any[]) || []).map((item) => ({
        ...item,
        campos_detectados: (item.campos_detectados as any[]) || [],
        campos_mapeados: (item.campos_mapeados as Record<string, any>) || {},
      })) as ContractTemplate[];
    },
    enabled: !!tenantId,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<ContractTemplate> & { perfil_id?: string | null }) => {
      if (!tenantId) throw new Error("Tenant não encontrado");

      const { data, error } = await supabase
        .from("templates_contrato")
        .insert({
          nome: template.nome || "Novo Template",
          tenant_id: tenantId,
          arquivo_url: template.arquivo_url,
          tipo_arquivo: template.tipo_arquivo || "pdf",
          conteudo_original: template.conteudo_original,
          campos_detectados: (template.campos_detectados || []) as unknown as Json,
          campos_mapeados: (template.campos_mapeados || {}) as Json,
          ...(template.perfil_id ? { perfil_id: template.perfil_id } as any : {}),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates-contrato"] });
      toast.success("Template criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractTemplate> & { id: string }) => {
      const updateData: Record<string, any> = {};
      
      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.arquivo_url !== undefined) updateData.arquivo_url = updates.arquivo_url;
      if (updates.tipo_arquivo !== undefined) updateData.tipo_arquivo = updates.tipo_arquivo;
      if (updates.conteudo_original !== undefined) updateData.conteudo_original = updates.conteudo_original;
      if (updates.campos_detectados !== undefined) {
        updateData.campos_detectados = updates.campos_detectados as unknown as Json;
      }
      if (updates.campos_mapeados !== undefined) {
        updateData.campos_mapeados = updates.campos_mapeados as Json;
      }

      const { data, error } = await supabase
        .from("templates_contrato")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates-contrato"] });
      toast.success("Template atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar template: " + error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("templates_contrato")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates-contrato"] });
      toast.success("Template excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir template: " + error.message);
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

// Field detection utilities
export function detectFields(content: string): ContractField[] {
  const fieldPattern = /\{\{([A-Z_]+)\}\}/g;
  const matches = content.matchAll(fieldPattern);
  const fields: ContractField[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);

    fields.push({
      id: crypto.randomUUID(),
      name,
      label: formatFieldLabel(name),
      type: inferFieldType(name),
      required: isRequiredField(name),
    });
  }

  return fields;
}

function formatFieldLabel(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function inferFieldType(name: string): ContractField["type"] {
  const lowered = name.toLowerCase();
  
  if (lowered.includes("data") || lowered.includes("date")) return "date";
  if (lowered.includes("valor") || lowered.includes("preco") || lowered.includes("montante")) return "currency";
  if (lowered.includes("cpf") || lowered.includes("cnpj") || lowered.includes("nif")) return "cpf_cnpj";
  if (lowered.includes("email")) return "email";
  if (lowered.includes("telefone") || lowered.includes("telemovel") || lowered.includes("phone")) return "phone";
  if (lowered.includes("numero") || lowered.includes("quantidade") || lowered.includes("qtd")) return "number";
  
  return "text";
}

function isRequiredField(name: string): boolean {
  const requiredFields = [
    "NOME",
    "NIF",
    "DATA",
    "VALOR",
    "ENDERECO",
    "MATRICULA",
  ];
  
  return requiredFields.some((f) => name.includes(f));
}
