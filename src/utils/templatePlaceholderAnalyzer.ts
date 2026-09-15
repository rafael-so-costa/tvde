/**
 * Template Placeholder Analyzer
 * Analyzes template content to determine which profiles and manual fields are required
 */

import type { ContractTemplate, ContractField } from "@/types/contract";

export type ProfileKind = "empresa" | "proprietario" | "motorista" | "veiculo";

export interface TemplateRequirements {
  needsEmpresa: boolean;
  needsProprietario: boolean;
  needsMotorista: boolean;
  needsVeiculo: boolean;
  /** Profiles required by the template, in first-occurrence order within the content. */
  orderedProfiles: ProfileKind[];
  manualFields: ManualFieldRequirement[];
}

export interface ManualFieldRequirement {
  id: string;
  name: string;
  label: string;
  type: "text" | "date" | "select";
  placeholder: string;
  options?: string[];
  required: boolean;
}

// Placeholders that indicate Empresa profile is needed
const EMPRESA_PLACEHOLDERS = [
  "NOME_EMPRESA",
  "NIF_EMPRESA",
  "MORADA_EMPRESA",
  "NOME_GERENTE_EMPRESA",
  "CAPITAL_SOCIAL_EMPRESA",
  "LICENCA_TVDE_EMPRESA",
  "CIDADE_EMPRESA",
  "EMAIL_EMPRESA",
  "TELEMOVEL_EMPRESA",
  "IBAN_EMPRESA",
];

// Placeholders that indicate Proprietário profile is needed
const PROPRIETARIO_PLACEHOLDERS = [
  "NOME_PROPRIETARIO",
  "NIF_PROPRIETARIO",
  "MORADA_PROPRIETARIO",
  "NOME_GERENTE_PROPRIETARIO",
  "CAPITAL_SOCIAL_PROPRIETARIO",
  "EMAIL_PROPRIETARIO",
  "TELEMOVEL_PROPRIETARIO",
  "IBAN_PROPRIETARIO",
  "DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
  "NUMERO_DOCUMENTO_PROPRIETARIO",
  "VALIDADE_DOCUMENTO_PROPRIETARIO",
  "NOME_DO_PROPRIETARIO",
  "NIF_DO_PROPRIETARIO",
  "MORADA_DO_PROPRIETARIO",
  // Variações com IDENTIFICACAO (Proprietário Particular)
  "NUMERO_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
  "NUMERO_DO_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
  "NUMERO_DO_DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO",
  "VALIDADE_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
  "VALIDADE_DO_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
  "VALIDADE_DO_DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO",
  "DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO",
  "DOCUMENTO_DE_IDENTIFICACAO_DO_PROPRIETARIO",
];

// Placeholders that indicate Motorista profile is needed
const MOTORISTA_PLACEHOLDERS = [
  "NOME_MOTORISTA",
  "NIF_MOTORISTA",
  "EMAIL_MOTORISTA",
  "MORADA_MOTORISTA",
  "DOCUMENTO_IDENTIFICACAO_MOTORISTA",
  "NUMERO_DOCUMENTO_MOTORISTA",
  "VALIDADE_DOCUMENTO_MOTORISTA",
  "LICENCA_TVDE_MOTORISTA",
  "CARTA_CONDUCAO_MOTORISTA",
  "VALIDADE_CARTA_MOTORISTA",
  "TELEMOVEL_MOTORISTA",
  "IBAN_MOTORISTA",
  "DATA_NASCIMENTO_MOTORISTA",
  "NOME_DO_MOTORISTA",
  "NIF_DO_MOTORISTA",
  "MORADA_DO_MOTORISTA",
];

// Placeholders that indicate Veículo profile is needed
const VEICULO_PLACEHOLDERS = [
  "MATRICULA",
  "MODELO",
  "MARCA",
  "DATA_MATRICULA",
  "CHASSI",
  "CILINDRADA",
  "POTENCIA",
  "COMBUSTIVEL",
  "LUGARES",
  "PORTAS",
  "COR",
  "CAUCAO_VEICULO",
  "ALUGUEL_VEICULO",
  "VALOR_CAUCAO",
  "VALOR_ALUGUEL",
  "MATRICULA_VEICULO",
  "MARCA_VEICULO",
  "MODELO_VEICULO",
];

// Mapping of manual field placeholders to their configuration
const MANUAL_FIELD_MAPPING: Record<string, ManualFieldRequirement> = {
  // BOLT (Proprietário) - campos manuais específicos
  // Nota: usamos a chave normalizada (CIDADE_EMPRESA) para capturar variações como CIDADE_DA_EMPRESA.
  CIDADE_EMPRESA: {
    id: "cidade_da_empresa",
    name: "cidade_da_empresa",
    label: "Cidade da Empresa",
    type: "text",
    // Mantém o placeholder "como está no template" quando possível
    placeholder: "CIDADE_DA_EMPRESA",
    required: true,
  },
  DATA_INICIO_CONTRATO: {
    id: "data_inicio_contrato",
    name: "data_inicio_contrato",
    label: "Data de Início do Contrato",
    type: "date",
    placeholder: "DATA_INICIO_CONTRATO",
    required: true,
  },
  DATA_FIM_CONTRATO: {
    id: "data_fim_contrato",
    name: "data_fim_contrato",
    label: "Data de Fim do Contrato",
    type: "date",
    placeholder: "DATA_FIM_CONTRATO",
    required: true,
  },
  DATA_INICIO_CONTRATO_PRESTACAO_SERVICO: {
    id: "data_inicio_contrato_prestacao_servico",
    name: "data_inicio_contrato",
    label: "Data de Início do Contrato de Prestação de Serviço",
    type: "date",
    placeholder: "DATA_INICIO_CONTRATO_PRESTACAO_SERVICO",
    required: true,
  },
  "DATA_ INICIO_CONTRATO_PRESTACAO_SERVICO": {
    id: "data_inicio_contrato_prestacao_servico",
    name: "data_inicio_contrato",
    label: "Data de Início do Contrato de Prestação de Serviço",
    type: "date",
    placeholder: "DATA_ INICIO_CONTRATO_PRESTACAO_SERVICO",
    required: true,
  },
  DATA_FIM_CONTRATO_PRESTACAO_SERVICO: {
    id: "data_fim_contrato_prestacao_servico",
    name: "data_fim_contrato",
    label: "Data de Fim do Contrato de Prestação de Serviço",
    type: "date",
    placeholder: "DATA_FIM_CONTRATO_PRESTACAO_SERVICO",
    required: true,
  },
  PERCENTAGEM_CONTRATO: {
    id: "percentagem_contrato",
    name: "percentagem_contrato",
    label: "Porcentagem do Contrato",
    type: "select",
    placeholder: "PERCENTAGEM_CONTRATO",
    options: ["6%", "10%"],
    required: true,
  },
  DURACAO_CONTRATO: {
    id: "duracao_contrato",
    name: "duracao_contrato",
    label: "Duração do Contrato",
    type: "select",
    placeholder: "DURACAO_CONTRATO",
    options: ["6 meses", "1 ano"],
    required: true,
  },
  DATA_PRIMEIRO_PAGAMENTO: {
    id: "data_primeiro_pagamento",
    name: "data_primeiro_pagamento",
    label: "Data do Primeiro Pagamento",
    type: "date",
    placeholder: "DATA_PRIMEIRO_PAGAMENTO",
    required: false,
  },
  DATA_ASSINATURA_CONTRATO: {
    id: "data_assinatura_contrato",
    name: "data_assinatura_contrato",
    label: "Data da Assinatura do Contrato",
    type: "date",
    placeholder: "DATA_ASSINATURA_CONTRATO",
    required: false,
  },
  DATA_ASSINATURA: {
    id: "data_assinatura",
    name: "data_assinatura_contrato",
    label: "Data da Assinatura",
    type: "date",
    placeholder: "DATA_ASSINATURA",
    required: false,
  },
  DATA_CONTRATO: {
    id: "data_contrato",
    name: "data_assinatura_contrato",
    label: "Data do Contrato",
    type: "date",
    placeholder: "DATA_CONTRATO",
    required: false,
  },
  DATA_DEVOLUCAO: {
    id: "data_devolucao",
    name: "data_devolucao",
    label: "Data da Devolução",
    type: "date",
    placeholder: "DATA_DEVOLUCAO",
    required: true,
  },
  DATA_ENTREGA: {
    id: "data_entrega",
    name: "data_entrega",
    label: "Data da Entrega",
    type: "date",
    placeholder: "DATA_ENTREGA",
    required: true,
  },
  VALOR_DANOS: {
    id: "valor_danos",
    name: "valor_danos",
    label: "Valor dos Danos",
    type: "text",
    placeholder: "VALOR_DANOS",
    required: true,
  },
  DESCRICAO_DANOS: {
    id: "descricao_danos",
    name: "descricao_danos",
    label: "Descrição dos Danos",
    type: "text",
    placeholder: "DESCRICAO_DANOS",
    required: true,
  },
  OBSERVACOES: {
    id: "observacoes",
    name: "observacoes",
    label: "Observações",
    type: "text",
    placeholder: "OBSERVACOES",
    required: false,
  },
  LOCAL_DEVOLUCAO: {
    id: "local_devolucao",
    name: "local_devolucao",
    label: "Local da Devolução",
    type: "text",
    placeholder: "LOCAL_DEVOLUCAO",
    required: false,
  },
  KM_DEVOLUCAO: {
    id: "km_devolucao",
    name: "km_devolucao",
    label: "Quilometragem na Devolução",
    type: "text",
    placeholder: "KM_DEVOLUCAO",
    required: false,
  },
};

// All known manual field placeholders
const ALL_MANUAL_PLACEHOLDERS = Object.keys(MANUAL_FIELD_MAPPING);

/**
 * Normalize placeholder for comparison
 * Handles variations in naming (with/without underscores, accents, spaces, etc.)
 */
function normalizePlaceholder(placeholder: unknown): string {
  // Defensive check: ensure we have a string
  if (placeholder === null || placeholder === undefined) {
    return "";
  }
  
  const str = typeof placeholder === "string" ? placeholder : String(placeholder);
  
  return str
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[ÁÀÃÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÕÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U")
    .replace(/Ç/g, "C")
    // Remove common Portuguese glue-words between tokens (keeps semantic meaning)
    // Examples: NOME_DA_EMPRESA -> NOME_EMPRESA, MATRICULA_DO_VEICULO -> MATRICULA_VEICULO
    .replace(/_(DA|DO|DE|DAS|DOS)_/g, "_")
    .replace(/^(DA|DO|DE|DAS|DOS)_/g, "")
    .replace(/_(DA|DO|DE|DAS|DOS)$/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Normalização específica para nomes de templates (remove acentos e símbolos como "/")
 * para permitir detecções estáveis via includes().
 */
function normalizeTemplateName(input: string): string {
  return input
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Extract all placeholders from template content
 * Supports multiple formats: {{FIELD}}, [[FIELD]], <<FIELD>>, __FIELD__
 * Handles internal spaces and special characters
 */
function extractPlaceholders(content: string): string[] {
  if (!content) return [];
  
  // More permissive patterns to capture placeholders with spaces and special chars
  const patterns = [
    /\{\{([A-Za-z_\s\u00C0-\u00FF]+)\}\}/gi,
    /\[\[([A-Za-z_\s\u00C0-\u00FF]+)\]\]/gi,
    /<<([A-Za-z_\s\u00C0-\u00FF]+)>>/gi,
    /__([A-Za-z_\s]+)__/gi,
    // Templates (ex: BOLT) podem vir com placeholders em parêntesis: (CAMPO_EDITAVEL)
    // Restrição: só capturamos tokens em MAIÚSCULAS/underscore/números para evitar texto comum.
    /\(([A-Z0-9_\s\u00C0-\u00FF]{2,})\)/g,
  ];

  const placeholders = new Set<string>();

  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      // Defensive: ensure match[1] is a string before calling trim
      const rawMatch = match[1];
      if (typeof rawMatch !== "string") continue;
      
      const original = rawMatch.trim();
      if (!original) continue;
      
      // Also add normalized version
      const normalized = normalizePlaceholder(original);
      placeholders.add(original.toUpperCase());
      if (normalized) placeholders.add(normalized);
    }
  }

  return Array.from(placeholders);
}

/**
 * Check if any placeholder matches the given list (with normalization)
 */
function hasMatchingPlaceholder(
  extractedPlaceholders: string[],
  targetPlaceholders: string[]
): boolean {
  const normalizedTargets = targetPlaceholders.map(normalizePlaceholder);
  
  // Strict equality only — substring matches caused false positives
  // (e.g. DOCUMENTO_IDENTIFICACAO matching DOCUMENTO_IDENTIFICACAO_PROPRIETARIO
  // and incorrectly requiring the Proprietário profile).
  return extractedPlaceholders.some((placeholder) => {
    const normalized = normalizePlaceholder(placeholder);
    return normalizedTargets.some((target) => normalized === target);
  });
}

/**
 * Find matching manual fields based on extracted placeholders
 */
function findManualFields(extractedPlaceholders: string[]): ManualFieldRequirement[] {
  const manualFields: ManualFieldRequirement[] = [];
  const seenIds = new Set<string>();

  for (const placeholder of extractedPlaceholders) {
    const normalized = normalizePlaceholder(placeholder);
    
    // Check direct match first
    if (MANUAL_FIELD_MAPPING[normalized] && !seenIds.has(MANUAL_FIELD_MAPPING[normalized].id)) {
      const field = MANUAL_FIELD_MAPPING[normalized];
      manualFields.push({ ...field, placeholder: field.placeholder || normalized });
      seenIds.add(field.id);
      continue;
    }

    // Check with original placeholder (with spaces)
    const withSpaces = placeholder.toUpperCase();
    if (MANUAL_FIELD_MAPPING[withSpaces] && !seenIds.has(MANUAL_FIELD_MAPPING[withSpaces].id)) {
      const field = MANUAL_FIELD_MAPPING[withSpaces];
      manualFields.push({ ...field, placeholder: field.placeholder || withSpaces });
      seenIds.add(field.id);
      continue;
    }

    // Check partial matches for similar field names
    for (const [key, fieldConfig] of Object.entries(MANUAL_FIELD_MAPPING)) {
      if (seenIds.has(fieldConfig.id)) continue;
      
      const normalizedKey = normalizePlaceholder(key);
      
      // Match if placeholders are similar (normalized versions match)
      if (normalized === normalizedKey) {
        manualFields.push({ ...fieldConfig, placeholder: fieldConfig.placeholder || normalized });
        seenIds.add(fieldConfig.id);
        break;
      }
      
      // Partial match: one contains the other (for variations)
      if (
        (normalized.length > 10 && normalizedKey.length > 10) &&
        (normalized.includes(normalizedKey) || normalizedKey.includes(normalized))
      ) {
        manualFields.push({ ...fieldConfig, placeholder: fieldConfig.placeholder || normalized });
        seenIds.add(fieldConfig.id);
        break;
      }
    }
  }

  return manualFields;
}

/**
 * Analyze a template to determine what profiles and fields it requires
 */
export function analyzeTemplateRequirements(
  template: ContractTemplate | null
): TemplateRequirements {
  if (!template) {
    return {
      needsEmpresa: false,
      needsProprietario: false,
      needsMotorista: false,
      needsVeiculo: false,
      orderedProfiles: [],
      manualFields: [],
    };
  }

  // Extract placeholders from template content
  const contentPlaceholders = extractPlaceholders(template.conteudo_original || "");
  
  // Also consider campos_detectados
  const detectedFieldNames = (template.campos_detectados || []).map(
    (field: ContractField) => normalizePlaceholder(field.name)
  );
  
  // Combine all placeholders
  const allPlaceholders = [...new Set([...contentPlaceholders, ...detectedFieldNames])];

  // Normalized set for prefix-based detection (cobre templates com convenções diferentes: DONO_/CARRO_/MOTORISTA_)
  const normalizedPlaceholders = allPlaceholders.map(normalizePlaceholder).filter(Boolean);
  const hasAnyPrefix = (prefixes: string[]) =>
    normalizedPlaceholders.some((p) => prefixes.some((pref) => p.startsWith(pref)));

  // Determine which profiles are needed
  let needsEmpresa =
    hasMatchingPlaceholder(allPlaceholders, EMPRESA_PLACEHOLDERS) ||
    hasAnyPrefix(["EMPRESA_", "CIDADE_EMPRESA"]);
  let needsProprietario =
    hasMatchingPlaceholder(allPlaceholders, PROPRIETARIO_PLACEHOLDERS) ||
    hasAnyPrefix(["PROPRIETARIO_", "DONO_"]);
  let needsMotorista =
    hasMatchingPlaceholder(allPlaceholders, MOTORISTA_PLACEHOLDERS) ||
    hasAnyPrefix(["MOTORISTA_"]);
  let needsVeiculo =
    hasMatchingPlaceholder(allPlaceholders, VEICULO_PLACEHOLDERS) ||
    hasAnyPrefix(["VEICULO_", "CARRO_"]);

  // Find required manual fields
  let manualFields = findManualFields(allPlaceholders);

  // Evita duplicação/ruído: se existir DATA_ASSINATURA_CONTRATO, não mostrar DATA_ASSINATURA
  const hasDataAssinaturaContrato = normalizedPlaceholders.includes("DATA_ASSINATURA_CONTRATO");
  if (hasDataAssinaturaContrato) {
    manualFields = manualFields.filter(
      (f) => normalizePlaceholder(f.placeholder) !== "DATA_ASSINATURA"
    );
  }

  // Regra específica para "BOLT Proprietário": garantir apenas os 2 campos manuais exigidos
  const templateNameNorm = normalizeTemplateName(template.nome || "");
  const isBoltProprietario =
    templateNameNorm.includes("BOLT") && templateNameNorm.includes("PROPRIETARIO");
  if (isBoltProprietario) {
    // Comportamento esperado para este template
    needsEmpresa = true;
    needsProprietario = true;
    needsVeiculo = true;
    needsMotorista = false;

    const allow = new Set(["CIDADE_EMPRESA", "DATA_ASSINATURA_CONTRATO"]);
    manualFields = manualFields.filter((f) => allow.has(normalizePlaceholder(f.placeholder)));
  }

  // Derive profile order from first-occurrence within template content.
  // Falls back to a stable default order if no positions are found.
  const orderedProfiles = computeOrderedProfiles(template.conteudo_original || "", {
    empresa: needsEmpresa,
    proprietario: needsProprietario,
    motorista: needsMotorista,
    veiculo: needsVeiculo,
  });

  return {
    needsEmpresa,
    needsProprietario,
    needsMotorista,
    needsVeiculo,
    orderedProfiles,
    manualFields,
  };
}

/**
 * Inspect the raw template content and return the profile kinds in the order
 * they first appear. Used to render the "Detalhes" tab sections in the same
 * order as defined by the contract template.
 */
function computeOrderedProfiles(
  content: string,
  needs: Record<ProfileKind, boolean>,
): ProfileKind[] {
  const upper = (content || "").toUpperCase();
  const firstIndexOf = (tokens: string[]): number => {
    let best = -1;
    for (const t of tokens) {
      const i = upper.indexOf(t);
      if (i !== -1 && (best === -1 || i < best)) best = i;
    }
    return best;
  };

  const profileTokens: Record<ProfileKind, string[]> = {
    empresa: ["EMPRESA"],
    proprietario: ["PROPRIETARIO", "PROPRIETÁRIO", "DONO_", "DO_PROPRIETARIO"],
    motorista: ["MOTORISTA"],
    veiculo: ["VEICULO", "VEÍCULO", "MATRICULA", "CARRO_"],
  };

  const defaultOrder: ProfileKind[] = ["empresa", "proprietario", "motorista", "veiculo"];

  const positions = defaultOrder
    .filter((p) => needs[p])
    .map((p) => ({ p, idx: firstIndexOf(profileTokens[p]) }));

  // Stable sort: by index asc; entries without a match keep default order at the end.
  positions.sort((a, b) => {
    if (a.idx === -1 && b.idx === -1) return defaultOrder.indexOf(a.p) - defaultOrder.indexOf(b.p);
    if (a.idx === -1) return 1;
    if (b.idx === -1) return -1;
    return a.idx - b.idx;
  });

  return positions.map((x) => x.p);
}

/**
 * Get a summary of what the template requires for display
 */
export function getTemplateSummary(requirements: TemplateRequirements): string {
  const parts: string[] = [];
  
  if (requirements.needsEmpresa) parts.push("Empresa");
  if (requirements.needsProprietario) parts.push("Proprietário");
  if (requirements.needsMotorista) parts.push("Motorista");
  if (requirements.needsVeiculo) parts.push("Veículo");
  
  if (requirements.manualFields.length > 0) {
    parts.push(`${requirements.manualFields.length} campo(s) manual(is)`);
  }

  return parts.join(", ") || "Nenhum campo detectado";
}

/**
 * Check if template has any requirements
 */
export function hasAnyRequirements(requirements: TemplateRequirements): boolean {
  return (
    requirements.needsEmpresa ||
    requirements.needsProprietario ||
    requirements.needsMotorista ||
    requirements.needsVeiculo ||
    requirements.manualFields.length > 0
  );
}
