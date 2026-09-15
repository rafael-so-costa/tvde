/**
 * Helpers para deteção e renderização de campos de assinatura em contratos.
 *
 * Convenção de placeholders (compatível com o analisador {{[A-Z_]+}}):
 *   {{ASSINATURA_MOTORISTA}}
 *   {{ASSINATURA_PROPRIETARIO}}
 *   {{ASSINATURA_EMPRESA}}
 *   {{ASSINATURA_TESTEMUNHA}}
 */

export type SignatureKind =
  | "motorista"
  | "proprietario"
  | "empresa"
  | "testemunha";

export interface SignatureFieldDef {
  kind: SignatureKind;
  placeholder: string; // ex: ASSINATURA_MOTORISTA
  label: string;
}

export const SIGNATURE_FIELDS: SignatureFieldDef[] = [
  { kind: "motorista", placeholder: "ASSINATURA_MOTORISTA", label: "Assinatura do Motorista" },
  { kind: "proprietario", placeholder: "ASSINATURA_PROPRIETARIO", label: "Assinatura do Proprietário" },
  { kind: "empresa", placeholder: "ASSINATURA_EMPRESA", label: "Assinatura da Empresa" },
  { kind: "testemunha", placeholder: "ASSINATURA_TESTEMUNHA", label: "Assinatura de Testemunha" },
];

const SIGNATURE_PLACEHOLDER_SET = new Set(
  SIGNATURE_FIELDS.map((f) => f.placeholder.toUpperCase())
);

function normalizeSignatureName(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;[^&]*&gt;/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[{}\[\]<>]/g, "")
    .trim()
    .toUpperCase();
}

export function isSignaturePlaceholder(name: string): boolean {
  if (!name) return false;
  return SIGNATURE_PLACEHOLDER_SET.has(normalizeSignatureName(name));
}

export function getSignatureFieldByPlaceholder(
  placeholder: string
): SignatureFieldDef | undefined {
  const up = placeholder.trim().toUpperCase();
  return SIGNATURE_FIELDS.find((f) => f.placeholder === up);
}

/**
 * Returns the unique list of signature fields detected in raw template HTML/text.
 */
export function detectSignatureFields(content: string | null | undefined): SignatureFieldDef[] {
  if (!content) return [];
  const found = new Set<string>();
  const pattern = /\{\{\s*([A-Z_]+)\s*\}\}|\[\[\s*([A-Z_]+)\s*\]\]|<<\s*([A-Z_]+)\s*>>/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    const name = (m[1] || m[2] || m[3] || "").toUpperCase();
    if (isSignaturePlaceholder(name)) found.add(name);
  }
  return SIGNATURE_FIELDS.filter((f) => found.has(f.placeholder));
}

/**
 * Replace signature placeholders in the contract content with rendered <img>
 * elements (when a signature data URL exists) or a visible placeholder box.
 *
 * Runs BEFORE the generic placeholder substitution so signatures are never
 * HTML-escaped.
 */
export function applySignaturesToContent(
  content: string,
  signatures: Record<string, string | null | undefined>,
  options: { hideMissing?: boolean } = {}
): string {
  if (!content) return content;

  const isRenderableSignature = (src: string) =>
    /^(data:image\/|blob:|https?:\/\/)/i.test(src);

  const escapeAttribute = (src: string) =>
    src.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const replaceFor = (placeholder: string): string => {
    const imageSrc = signatures[placeholder] || signatures[normalizeSignatureName(placeholder)];
    if (imageSrc && isRenderableSignature(imageSrc)) {
      return `<img src="${escapeAttribute(imageSrc)}" alt="${placeholder}" class="signature-img" style="max-height:80px;display:inline-block;vertical-align:middle;" />`;
    }
    if (options.hideMissing) return "";
    return `<span class="missing-field">[${placeholder} — pendente]</span>`;
  };

  let out = content;
  for (const pattern of [/\{\{([\s\S]*?)\}\}/g, /\[\[([\s\S]*?)\]\]/g, /<<([\s\S]*?)>>/g, /__([^_]+)__/g]) {
    out = out.replace(pattern, (full, raw) => {
      const normalized = normalizeSignatureName(String(raw || ""));
      return SIGNATURE_PLACEHOLDER_SET.has(normalized) ? replaceFor(normalized) : full;
    });
  }
  return out;
}
