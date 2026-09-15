import { useEffect, useState } from "react";
import { resolveSignatureImageUrl } from "@/utils/signatureImageUrls";

/**
 * Resolves a map of signature placeholder → URL (potentially private storage
 * URLs) into browser-loadable URLs (signed URLs for private buckets, or the
 * original value for data:/blob:/public URLs).
 *
 * Used by every contract preview so signature images render consistently
 * across the wizard, the editor, the Assinaturas tab and the PDF export.
 */
export function useResolvedSignatures(
  raw: Record<string, string | null | undefined> | null | undefined,
): Record<string, string> {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const key = JSON.stringify(raw || {});

  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(raw || {}).filter(([, v]) => !!v) as [string, string][];

    if (entries.length === 0) {
      setResolved({});
      return;
    }

    (async () => {
      const out: Record<string, string> = {};
      await Promise.all(
        entries.map(async ([k, v]) => {
          const url = await resolveSignatureImageUrl(v);
          if (url) out[k] = url;
        }),
      );
      if (!cancelled) setResolved(out);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return resolved;
}
