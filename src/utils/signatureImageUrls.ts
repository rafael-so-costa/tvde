import { supabase } from "@/integrations/supabase/client";

const SIGNED_SIGNATURE_TTL_SECONDS = 60 * 60;

function getSignatureStoragePath(value: string): string | null {
  if (!value || /^(data:image\/|blob:)/i.test(value)) return null;
  if (!/^https?:\/\//i.test(value)) return value.replace(/^signatures\//, "");

  const clean = value.split("?")[0];
  const markers = [
    "/storage/v1/object/public/signatures/",
    "/storage/v1/object/sign/signatures/",
    "/storage/v1/object/authenticated/signatures/",
  ];
  const marker = markers.find((m) => clean.includes(m));
  if (!marker) return null;
  return decodeURIComponent(clean.slice(clean.indexOf(marker) + marker.length));
}

export async function resolveSignatureImageUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^(data:image\/|blob:)/i.test(value)) return value;

  const path = getSignatureStoragePath(value);
  if (!path) return value;

  const { data, error } = await supabase.storage
    .from("signatures")
    .createSignedUrl(path, SIGNED_SIGNATURE_TTL_SECONDS);

  return error || !data?.signedUrl ? value : data.signedUrl;
}

export async function resolveSignatureMap<T extends { assinatura_url?: string | null }>(rows: T[]): Promise<T[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      assinatura_url: await resolveSignatureImageUrl(row.assinatura_url),
    })),
  );
}