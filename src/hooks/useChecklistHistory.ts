import { useState, useEffect, useCallback } from "react";
import { ChecklistRecord, MediaFile } from "@/types/checklist";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const BUCKET = "checklist-media";

function base64ToBlob(base64: string): Blob {
  const [header, data] = base64.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function uploadBase64ToStorage(
  base64: string,
  path: string
): Promise<string | null> {
  if (!base64 || base64 === "[signature]" || !base64.startsWith("data:")) return null;
  try {
    const blob = base64ToBlob(base64);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: blob.type || "image/png" });
    if (error) {
      console.error("Storage upload error:", error.message, "path:", path);
      throw error;
    }
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);
    return urlData.publicUrl;
  } catch (e) {
    console.error("Failed to upload to storage:", e);
    return null;
  }
}

async function uploadSignature(
  base64: string | null,
  recordId: string,
  type: "company" | "driver",
  tenantId: string
): Promise<string | null> {
  if (!base64 || base64 === "[signature]") return null;
  // Already a URL (not base64) — keep as-is
  if (!base64.startsWith("data:")) return base64;
  const path = `${tenantId}/${recordId}/${type}_signature.png`;
  return uploadBase64ToStorage(base64, path);
}

async function uploadMediaFiles(
  mediaFiles: Record<string, MediaFile[]>,
  recordId: string,
  tenantId: string
): Promise<Record<string, MediaFile[]>> {
  const result: Record<string, MediaFile[]> = {};

  for (const [key, files] of Object.entries(mediaFiles)) {
    const uploadedFiles: MediaFile[] = [];
    for (const file of files) {
      if (!file.dataUrl || !file.dataUrl.startsWith("data:")) {
        // Already a URL or empty — keep as-is
        uploadedFiles.push(file);
        continue;
      }
      const ext = file.type === "photo" ? "jpg" : file.type === "video" ? "mp4" : "bin";
      const path = `${tenantId}/${recordId}/media/${key}/${file.id}.${ext}`;
      const url = await uploadBase64ToStorage(file.dataUrl, path);
      uploadedFiles.push({
        ...file,
        dataUrl: url || "", // store storage URL instead of base64
      });
    }
    result[key] = uploadedFiles;
  }

  return result;
}

function recordToDbRow(
  record: ChecklistRecord,
  tenantId: string,
  companySigUrl?: string | null,
  driverSigUrl?: string | null,
  uploadedMedia?: Record<string, MediaFile[]>
) {
  const { companySignature, driverSignature, mediaFiles, securityMetadata, ...rest } = record;

  return {
    tenant_id: tenantId,
    record_id: record.id,
    type: record.type,
    driver_name: record.driverName,
    driver_id: record.driverId || null,
    vehicle_id: record.vehicleId || null,
    plate: record.plate,
    model: record.model,
    operation_date: record.date,
    operation_time: record.time || null,
    total_penalty: record.totalPenalty || 0,
    linked_delivery_record_id: record.linkedDeliveryId || null,
    company_signature_url: companySigUrl || null,
    driver_signature_url: driverSigUrl || null,
    security_metadata: securityMetadata || null,
    data: { ...rest, mediaFiles: uploadedMedia || {} } as Record<string, unknown>,
  };
}

function dbRowToRecord(row: any): ChecklistRecord {
  const data = row.data || {};
  return {
    ...data,
    id: row.record_id,
    type: row.type,
    driverName: row.driver_name || data.driverName,
    driverId: row.driver_id || data.driverId,
    vehicleId: row.vehicle_id || data.vehicleId,
    plate: row.plate || data.plate,
    model: row.model || data.model,
    date: row.operation_date || data.date,
    time: row.operation_time || data.time,
    totalPenalty: row.total_penalty ?? data.totalPenalty ?? 0,
    linkedDeliveryId: row.linked_delivery_record_id || data.linkedDeliveryId,
    companySignature: row.company_signature_url || null,
    driverSignature: row.driver_signature_url || null,
    securityMetadata: row.security_metadata || data.securityMetadata,
    createdAt: row.created_at || data.createdAt,
    checkedItems: data.checkedItems || {},
    specialFieldValues: data.specialFieldValues || {},
    damages: data.damages || [],
    missingItems: data.missingItems || {},
    newDamages: data.newDamages || [],
    fuelLevel: data.fuelLevel || "1/2",
    kmInitial: data.kmInitial || "",
    mediaFiles: data.mediaFiles || {},
  } as ChecklistRecord;
}

export function useChecklistHistory() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [records, setRecords] = useState<ChecklistRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checklist_records")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords((data || []).map(dbRowToRecord));
    } catch (e) {
      console.error("Failed to fetch checklist records:", e);
      toast.error("Erro ao carregar histórico de checklists");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(
    async (record: ChecklistRecord) => {
      if (!tenantId) {
        toast.error("Tenant não encontrado");
        return;
      }

      // Upload signatures and media files to storage in parallel
      const [companySigUrl, driverSigUrl, uploadedMedia] = await Promise.all([
        uploadSignature(record.companySignature, record.id, "company", tenantId),
        uploadSignature(record.driverSignature, record.id, "driver", tenantId),
        uploadMediaFiles(record.mediaFiles || {}, record.id, tenantId),
      ]);

      const row = recordToDbRow(record, tenantId, companySigUrl, driverSigUrl, uploadedMedia);

      const { error } = await supabase.from("checklist_records").insert(row as any);

      if (error) {
        console.error("Failed to save checklist record:", error);
        toast.error("Erro ao salvar registo de checklist");
        return;
      }

      // Optimistically add to local state with storage URLs
      const savedRecord: ChecklistRecord = {
        ...record,
        companySignature: companySigUrl || record.companySignature,
        driverSignature: driverSigUrl || record.driverSignature,
        mediaFiles: uploadedMedia,
      };
      setRecords((prev) => [savedRecord, ...prev]);
    },
    [tenantId]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      if (!tenantId) return;
      const { error } = await supabase
        .from("checklist_records")
        .delete()
        .eq("record_id", id)
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Failed to delete checklist record:", error);
        toast.error("Erro ao eliminar registo");
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
    },
    [tenantId]
  );

  const updateRecord = useCallback(
    async (id: string, updates: Partial<ChecklistRecord>) => {
      if (!tenantId) return;
      const existing = records.find((r) => r.id === id);
      if (!existing) return;
      const merged = { ...existing, ...updates };
      const row = recordToDbRow(merged, tenantId, merged.companySignature, merged.driverSignature, merged.mediaFiles);
      const { data: dbData, ...rowWithoutData } = row;

      const { error } = await supabase
        .from("checklist_records")
        .update({ data: row.data, ...rowWithoutData } as any)
        .eq("record_id", id)
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Failed to update checklist record:", error);
        toast.error("Erro ao atualizar registo");
        return;
      }
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? merged : r))
      );
    },
    [tenantId, records]
  );

  return { records, addRecord, removeRecord, updateRecord, loading };
}
