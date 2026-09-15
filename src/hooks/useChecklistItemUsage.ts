import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Verifica se um item ou parte do veículo já foi utilizado em algum check-list
 * registado em `checklist_records`. Procura o id no JSON `data` por substring
 * (cobre checkedItems[id], specialFieldValues[id], damages[].part, etc.).
 */
export function useChecklistItemUsage() {
  const isItemUsed = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("checklist_records")
        .select("id, data")
        .or(`data.cs.{"checkedItems":{"${itemId}":true}},data.cs.{"checkedItems":{"${itemId}":false}}`)
        .limit(1);
      if (!error && data && data.length > 0) return true;

      // Fallback: scan by JSON text contains (limit small)
      const { data: rows } = await supabase
        .from("checklist_records")
        .select("id, data")
        .limit(500);
      if (!rows) return false;
      return rows.some((r: any) => {
        try {
          return JSON.stringify(r.data || {}).includes(itemId);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }, []);

  const isPartUsed = useCallback(async (partName: string): Promise<boolean> => {
    try {
      const { data: rows } = await supabase
        .from("checklist_records")
        .select("id, data")
        .limit(500);
      if (!rows) return false;
      return rows.some((r: any) => {
        try {
          return JSON.stringify(r.data || {}).includes(partName);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }, []);

  return { isItemUsed, isPartUsed };
}
