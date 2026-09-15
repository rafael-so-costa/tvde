/**
 * Categoria visual e metadados derivados do nome do placeholder dinâmico.
 * Usado apenas para destacar campos no editor de templates (não afeta o PDF/impressão).
 */

export type FieldCategory =
  | "driver"
  | "owner"
  | "vehicle"
  | "company"
  | "contract"
  | "signature";

export interface FieldMeta {
  category: FieldCategory;
  entityLabel: string;
  fieldLabel: string;
  tooltip: string;
}

const VEHICLE_FIELDS = new Set([
  "MATRICULA",
  "MARCA",
  "MODELO",
  "DATA_MATRICULA",
  "CHASSI",
  "CILINDRADA",
  "POTENCIA",
  "COMBUSTIVEL",
  "COR",
  "LUGARES",
  "PORTAS",
]);

const CONTRACT_FIELDS = new Set([
  "VALOR_CAUCAO",
  "VALOR_ALUGUEL",
  "DATA_PRIMEIRO_PAGAMENTO",
  "OBSERVACOES",
]);

function prettify(part: string): string {
  return part
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getFieldMeta(placeholder: string): FieldMeta {
  const p = placeholder.toUpperCase();
  let category: FieldCategory = "contract";
  let entityLabel = "Contrato";
  let fieldPart = p;

  if (p.startsWith("ASSINATURA_")) {
    category = "signature";
    entityLabel = "Assinatura";
    fieldPart = p.replace(/^ASSINATURA_/, "");
  } else if (p.endsWith("_MOTORISTA")) {
    category = "driver";
    entityLabel = "Motorista";
    fieldPart = p.replace(/_MOTORISTA$/, "");
  } else if (p.endsWith("_PROPRIETARIO")) {
    category = "owner";
    entityLabel = "Proprietário";
    fieldPart = p.replace(/_PROPRIETARIO$/, "");
  } else if (p.endsWith("_EMPRESA")) {
    category = "company";
    entityLabel = "Empresa";
    fieldPart = p.replace(/_EMPRESA$/, "");
  } else if (p.endsWith("_CONTRATO")) {
    category = "contract";
    entityLabel = "Contrato";
    fieldPart = p.replace(/_CONTRATO$/, "");
  } else if (VEHICLE_FIELDS.has(p)) {
    category = "vehicle";
    entityLabel = "Veículo";
  } else if (CONTRACT_FIELDS.has(p)) {
    category = "contract";
    entityLabel = "Contrato";
  }

  const fieldLabel = prettify(fieldPart) || prettify(p);
  return {
    category,
    entityLabel,
    fieldLabel,
    tooltip: `${entityLabel} → ${fieldLabel}`,
  };
}
