import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  mapEmpresaFields,
  mapProprietarioFields,
  mapMotoristaFields,
  mapVeiculoFields,
  mapManualFields,
  type ManualFieldValues,
} from "@/utils/contractFieldMappings";
import { applySignaturesToContent, SIGNATURE_FIELDS } from "@/utils/contractSignatures";

/**
 * Hook to fetch full contract data including all related profiles
 * and generate complete field mappings for preview
 */
export function useContractFullData(contractId: string | null) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["contract-full-data", tenantId, contractId],
    queryFn: async () => {
      if (!contractId || !tenantId) return null;

      // Fetch contract with all relations
      const { data: contract, error } = await supabase
        .from("contratos")
        .select(`
          *,
          template:templates_contrato(*),
          motorista:motoristas(*),
          proprietario:proprietarios(*),
          veiculo:veiculos(*)
        `)
        .eq("id", contractId)
        .single();

      if (error) throw error;

      // Fetch empresa data (the tenant's main company)
      const { data: empresa } = await supabase
        .from("empresas")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      return {
        contract,
        empresa,
        motorista: contract?.motorista,
        proprietario: contract?.proprietario,
        veiculo: contract?.veiculo,
        template: contract?.template,
      };
    },
    enabled: !!contractId && !!tenantId,
  });
}

/**
 * Generate complete field mappings from contract data
 */
export function generateContractFieldMappings(data: {
  empresa: any;
  proprietario: any;
  motorista: any;
  veiculo: any;
  camposPreenchidos?: Record<string, any>;
}): Record<string, string> {
  const empresaFields = mapEmpresaFields(data.empresa);
  const proprietarioFields = mapProprietarioFields(data.proprietario);
  const motoristaFields = mapMotoristaFields(data.motorista);
  const veiculoFields = mapVeiculoFields(data.veiculo);

  // Extract manual fields from campos_preenchidos
  const manual: ManualFieldValues = {
    percentagem_contrato: data.camposPreenchidos?.PERCENTAGEM_CONTRATO || "",
    data_inicio_contrato: data.camposPreenchidos?.DATA_INICIO_CONTRATO || "",
    data_fim_contrato: data.camposPreenchidos?.DATA_FIM_CONTRATO || "",
    duracao_contrato: data.camposPreenchidos?.DURACAO_CONTRATO || "",
    data_primeiro_pagamento: data.camposPreenchidos?.DATA_PRIMEIRO_PAGAMENTO || "",
    data_assinatura_contrato: data.camposPreenchidos?.DATA_ASSINATURA_CONTRATO || "",
  };
  const manualFields = mapManualFields(manual);

  // IMPORTANT:
  // Some templates and flows may have stored empty strings in campos_preenchidos.
  // We must NOT let empty saved values overwrite real profile-derived values.
  const savedNonEmpty: Record<string, string> = {};
  Object.entries(data.camposPreenchidos || {}).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined) return;
    const value = typeof rawValue === "string" ? rawValue : String(rawValue);
    if (!value.trim()) return;
    savedNonEmpty[key] = value;
  });

  // Combine all mappings, with non-empty saved campos_preenchidos taking priority
  return {
    ...empresaFields,
    ...proprietarioFields,
    ...motoristaFields,
    ...veiculoFields,
    ...manualFields,
    ...savedNonEmpty,
  };
}

/**
 * Create a mapping of placeholder aliases to handle different naming conventions
 * Template placeholders like {{NOME_DO_PROPRIETARIO}} map to NOME_PROPRIETARIO
 */
export function createPlaceholderAliases(fieldValues: Record<string, string>): Record<string, string> {
  const aliases: Record<string, string> = {};
  
  // Direct mappings for common variations
  const placeholderMappings: Record<string, string[]> = {
    // Proprietário
    "NOME_PROPRIETARIO": [
      "NOME_DO_PROPRIETARIO",
      "NOME DO PROPRIETARIO",
      "NOME PROPRIETARIO",
      // Convenções alternativas (ex: templates BOLT)
      "DONO_NOME",
      "NOME_DONO",
    ],
    "MORADA_PROPRIETARIO": [
      "MORADA_DO_PROPRIETARIO",
      "MORADA DO PROPRIETARIO",
      "ENDERECO_PROPRIETARIO",
      "DONO_MORADA",
      "ENDERECO_DONO",
    ],
    "NIF_PROPRIETARIO": ["NIF_DO_PROPRIETARIO", "NIF DO PROPRIETARIO", "DONO_NIF", "NIF_DONO"],
    "EMAIL_PROPRIETARIO": ["EMAIL_DO_PROPRIETARIO", "EMAIL DO PROPRIETARIO"],
    "TELEMOVEL_PROPRIETARIO": ["TELEMOVEL_DO_PROPRIETARIO", "TELEFONE_PROPRIETARIO"],
    
    // Proprietário - Documentos de Identificação (Particular)
    "NUMERO_DOCUMENTO_PROPRIETARIO": [
      "NUMERO_DO_DOCUMENTO_PROPRIETARIO",
      "NUMERO_DO_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
      "NUMERO_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
      "NUMERO_DO_DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO",
      "NUM_DOCUMENTO_PROPRIETARIO",
      // Typos comuns em templates (ex: PARTICULAR)
      "NUMERO_DO_DOCUEMNTO_DE_IDENTIFICACAO_PROPRIETARIO",
      // Convenções BOLT
      "DONO_NUMERO_DOCUMENTO",
      "DONO_DOCUMENTO_NUMERO",
    ],
    "VALIDADE_DOCUMENTO_PROPRIETARIO": [
      "VALIDADE_DO_DOCUMENTO_PROPRIETARIO",
      "VALIDADE_DO_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
      "VALIDADE_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
      "VALIDADE_DO_DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO",
      "DATA_VALIDADE_DOCUMENTO_PROPRIETARIO",
      // Convenções BOLT
      "DONO_DOCUMENTO_VALIDADE",
    ],
    "DOCUMENTO_IDENTIFICACAO_PROPRIETARIO": [
      "DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO",
      "DOCUMENTO_DE_IDENTIFICACAO_DO_PROPRIETARIO",
      "TIPO_DOCUMENTO_PROPRIETARIO",
      // Convenções BOLT
      "DONO_TIPO_DOCUMENTO",
      "DONO_DOCUMENTO_TIPO",
    ],
    
    // Motorista
    "NOME_MOTORISTA": ["NOME_DO_MOTORISTA", "NOME DO MOTORISTA"],
    "MORADA_MOTORISTA": ["MORADA_DO_MOTORISTA", "MORADA DO MOTORISTA", "MORADA_DO_ MOTORISTA", "ENDERECO_MOTORISTA"],
    "EMAIL_MOTORISTA": ["EMAIL_DO_MOTORISTA", "EMAIL DO MOTORISTA"],
    "DOCUMENTO_IDENTIFICACAO_MOTORISTA": ["DOCUMENTO_DE_IDENTIFICACAO_MOTORISTA", "TIPO_DOCUMENTO_MOTORISTA"],
    "NUMERO_DOCUMENTO_MOTORISTA": ["NUMERO_DO_DOCUMENTO_IDENTIFICACAO_MOTORISTA", "NUM_DOCUMENTO_MOTORISTA"],
    "VALIDADE_DOCUMENTO_MOTORISTA": ["VALIDADE_DO_DOCUMENTO_IDENTIFICAÇAO_MOTORISTA", "VALIDADE_DOCUMENTO_IDENTIFICACAO_MOTORISTA", "VALIDADE_DO_DOCUMENTO_IDENTIFICACAO_MOTORISTA"],
    "LICENCA_TVDE_MOTORISTA": ["LICENÇA_TVDE_DO_MOTORISTA", "CERTIFICADO_TVDE_MOTORISTA"],
    "CARTA_CONDUCAO_MOTORISTA": [
      "CARTA_DE_CONDUCAO_MOTORISTA",
      "CARTA CONDUCAO MOTORISTA",
      // Convenções alternativas (ex: templates BOLT)
      "MOTORISTA_CARTA_CONDUCAO",
      "MOTORISTA_CARTA_CONDUÇÃO",
    ],
    
    // Empresa
    "NOME_EMPRESA": ["NOME_DA_EMPRESA", "NOME DA EMPRESA"],
    "MORADA_EMPRESA": ["MORADA_DA_EMPRESA", "SEDE_EMPRESA", "ENDERECO_EMPRESA"],
    "LICENCA_TVDE_EMPRESA": ["LICENÇA_TVDE_DA_EMPRESA", "LICENÇA_TVDE_DA_ EMPRESA", "LICENCA_TVDE_DA_EMPRESA", "LICENÇA TVDE DA EMPRESA"],
    "NIF_EMPRESA": ["NIF_DA_EMPRESA", "NIF DA EMPRESA"],
    "CIDADE_EMPRESA": ["CIDADE_DA_EMPRESA", "CIDADE DA EMPRESA"],
    
    // Veículo
    "MATRICULA": [
      "MATRICULA_DO_VEICULO",
      "MATRICULA DO VEICULO",
      "MATRICULA_VEICULO",
      // Convenções alternativas (ex: templates BOLT)
      "CARRO_MATRICULA",
      "VEICULO_MATRICULA",
    ],
    "MARCA": ["MARCA_DO_VEICULO", "MARCA DO VEICULO", "MARCA_VEICULO", "CARRO_MARCA", "VEICULO_MARCA"],
    "MODELO": ["MODELO_DO_VEICULO", "MODELO DO VEICULO", "MODELO_VEICULO", "CARRO_MODELO", "VEICULO_MODELO"],
    "DATA_MATRICULA": ["DATA_DO_VEICULO", "DATA_MATRICULA_VEICULO", "DATA DO VEICULO"],
    "CHASSI": ["CHASSI_DO_VEICULO", "CHASSI_VEICULO"],
    "COR": ["COR_DO_VEICULO", "COR_VEICULO"],
    
    // Campos técnicos do veículo
    "CILINDRADA": ["CILINDRADA_DO_VEICULO", "CILINDRADA_VEICULO", "CARRO_CILINDRADA", "VEICULO_CILINDRADA"],
    "POTENCIA": ["POTENCIA_DO_VEICULO", "POTENCIA_VEICULO", "CARRO_POTENCIA", "VEICULO_POTENCIA"],
    "COMBUSTIVEL": ["COMBUSTIVEL_DO_VEICULO", "COMBUSTIVEL_VEICULO", "CARRO_COMBUSTIVEL", "VEICULO_COMBUSTIVEL", "TIPO_COMBUSTIVEL"],
    "LUGARES": ["LUGARES_DO_VEICULO", "LUGARES_VEICULO", "CARRO_LUGARES", "VEICULO_LUGARES", "NUM_LUGARES"],
    "PORTAS": ["PORTAS_DO_VEICULO", "PORTAS_VEICULO", "CARRO_PORTAS", "VEICULO_PORTAS", "NUM_PORTAS"],
    
    // Valor Semanal - maps from vehicle rental value
    "VALOR_SEMANAL": ["VALOR_SEMANAL_VEICULO", "VALOR_SEMANAL_DO_VEICULO", "ALUGUEL_SEMANAL", "VALOR_ALUGUEL_SEMANAL"],
    
    // Datas e outros
    "DATA_ASSINATURA_CONTRATO": ["DATA_DA_ASSINATURA_CONTRATO", "DATA DA ASSINATURA", "DATA_ASSINATURA"],
    "DATA_INICIO_CONTRATO": ["DATA_DE_INICIO_CONTRATO", "DATA INICIO"],
    "DATA_FIM_CONTRATO": ["DATA_DE_FIM_CONTRATO", "DATA FIM"],
  };
  
  // For each field value, add all its aliases
  Object.entries(fieldValues as Record<string, unknown>).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined) return;
    const value = typeof rawValue === "string" ? rawValue : String(rawValue);
    if (!value.trim()) return;
    
    // Add the original key
    aliases[key] = value;
    aliases[key.toUpperCase()] = value;
    aliases[key.toLowerCase()] = value;
    
    // Add variations with underscores replaced by spaces
    aliases[key.replace(/_/g, " ")] = value;
    aliases[key.replace(/_/g, "_")] = value;

    // Add normalized variant (handles DO/DA/DE glue words, extra spaces, accents)
    aliases[normalizePlaceholder(key)] = value;
    
    // Add mapped aliases
    const mappedAliases = placeholderMappings[key] || placeholderMappings[key.toUpperCase()];
    if (mappedAliases) {
      mappedAliases.forEach(alias => {
        aliases[alias] = value;
        aliases[alias.toUpperCase()] = value;
        aliases[alias.toLowerCase()] = value;
        aliases[normalizePlaceholder(alias)] = value;
      });
    }
  });
  
  return aliases;
}

/**
 * Normalize a placeholder name by removing extra spaces and standardizing format
 */
function normalizePlaceholder(placeholder: string): string {
  return placeholder
    .toUpperCase()
    .replace(/\s+/g, "_")
    // Common OCR/template typos
    .replace(/DOCUEMNTO/g, "DOCUMENTO")
    .replace(/[ÁÀÃÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÕÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U")
    .replace(/Ç/g, "C")
    // Remove common Portuguese glue-words between tokens
    .replace(/_(DA|DO|DE|DAS|DOS)_/g, "_")
    .replace(/^(DA|DO|DE|DAS|DOS)_/g, "")
    .replace(/_(DA|DO|DE|DAS|DOS)$/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function isSignaturePlaceholderName(placeholder: string): boolean {
  return SIGNATURE_FIELDS.some((field) => field.placeholder === normalizePlaceholder(placeholder));
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeFinalFieldValue(input: string): string {
  return escapeHtml(finalFieldValueToPlainText(input));
}

function finalFieldValueToPlainText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/\u00a0/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanPlaceholderName(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/\u00a0/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/[{}\[\]<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripEditorOnlyMarkup(input: string): string {
  let content = input;
  let previous = "";

  while (previous !== content) {
    previous = content;
    content = content
      .replace(
        /<span\b(?:(?!>)[\s\S])*(?:template-field|data-field|contenteditable)(?:(?!>)[\s\S])*>([\s\S]*?)<\/span>/gi,
        "$1"
      )
      .replace(
        /&lt;span\b(?:(?!&gt;)[\s\S])*(?:template-field|data-field|contenteditable)(?:(?!&gt;)[\s\S])*&gt;([\s\S]*?)&lt;\/span&gt;/gi,
        "$1"
      );
  }

  return content
    .replace(/\s+(data-field|data-category|contenteditable)=["'][^"']*["']/gi, "")
    .replace(/\s+(data-field|data-category|contenteditable)=&quot;[^&]*&quot;/gi, "")
    .replace(/\s+class=["'][^"']*\btemplate-field\b[^"']*["']/gi, "")
    .replace(/\s+class=&quot;[^&]*\btemplate-field\b[^&]*&quot;/gi, "");
}

function decodeHtmlEntitiesOnce(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = parseInt(code, 10);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/&amp;/gi, "&");
}

function decodeHtmlEntities(input: string): string {
  // Iteratively decode to handle double-escaped entities (e.g. &amp;nbsp;)
  let prev = "";
  let current = input;
  let safety = 5;
  while (prev !== current && safety-- > 0) {
    prev = current;
    current = decodeHtmlEntitiesOnce(current);
  }
  return current;
}

function htmlToPlainText(input: string): string {
  let content = stripEditorOnlyMarkup(input);
  const signatureImages: Record<string, string> = {};

  content = content.replace(/<img\b[^>]*\bsrc=["']((?:data:image\/|blob:|https?:\/\/)[^"']+)["'][^>]*>/gi, (_, src: string) => {
    const token = `\u0002SIG${Object.keys(signatureImages).length}\u0002`;
    signatureImages[token] = `<img src="${escapeHtml(src)}" alt="Assinatura" style="max-height:80px;display:inline-block;vertical-align:middle;" />`;
    return `\n${token}\n`;
  });

  content = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\/(p|div|h[1-6]|li|table|section|article)>/gi, "\n")
    .replace(/<[^>]*>/g, "");

  content = decodeHtmlEntities(content)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  let safe = escapeHtml(content);
  // After escapeHtml, any residual entity-like sequences (from double-escaped
  // sources) would now look like "&amp;nbsp;", "&amp;amp;" etc. Render those
  // as the original characters so no entity text leaks into the final output.
  safe = safe
    .replace(/&amp;nbsp;/gi, " ")
    .replace(/&amp;(lt|gt|quot|amp|#0?39);/gi, (_, e: string) => {
      const map: Record<string, string> = { lt: "<", gt: ">", quot: '"', amp: "&", "39": "'", "039": "'" };
      const key = e.toLowerCase();
      return map[key] ?? "";
    });
  Object.entries(signatureImages).forEach(([token, img]) => {
    safe = safe.split(token).join(img);
  });
  return safe;
}

function removeResidualPlaceholders(input: string): string {
  return input
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/<<[^>]+>>/g, "")
    .replace(/__[^_]+__/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Replace all placeholders in template content with field values
 */
export function renderContractContent(
  templateContent: string,
  fieldValues: Record<string, string>,
  signatures?: Record<string, string | null | undefined>,
  options: { cleanFinal?: boolean; highlightMissing?: boolean } = {}
): string {
  const { cleanFinal = false, highlightMissing = !cleanFinal } = options;
  let content = templateContent || "";
  const rawFallback = htmlToPlainText(templateContent || "");
  const finalValueTokens: Record<string, string> = {};

  const effectiveSignatures: Record<string, string | null | undefined> = { ...(signatures || {}) };
  for (const field of SIGNATURE_FIELDS) {
    if (!effectiveSignatures[field.placeholder] && fieldValues[field.placeholder]?.startsWith("data:image")) {
      effectiveSignatures[field.placeholder] = fieldValues[field.placeholder];
    }
  }

  if (Object.keys(effectiveSignatures).length > 0) {
    content = applySignaturesToContent(content, effectiveSignatures, { hideMissing: cleanFinal });
  }

  const aliases = createPlaceholderAliases(fieldValues);

  const replacePatterns: RegExp[] = [
    /\{\{([\s\S]*?)\}\}/g,
    /\[\[([\s\S]*?)\]\]/g,
    /<<([\s\S]*?)>>/g,
    /__([^_]+)__/g,
    /\(([A-Za-z0-9_\s\u00C0-\u00FF]{2,})\)/g,
  ];

  const highlightPatterns: RegExp[] = [
    /\{\{([^}]+)\}\}/g,
    /\[\[([^\]]+)\]\]/g,
    /<<([^>]+)>>/g,
    /__([^_]+)__/g,
  ];

  for (const pattern of replacePatterns) {
    content = content.replace(pattern, (fullMatch, rawName: unknown) => {
      const placeholderName = typeof rawName === "string" ? cleanPlaceholderName(rawName) : "";
      if (!placeholderName) return fullMatch;
      if (isSignaturePlaceholderName(placeholderName)) return cleanFinal ? "" : fullMatch;

      const normalizedName = normalizePlaceholder(placeholderName);
      const value =
        aliases[placeholderName] ||
        aliases[placeholderName.toUpperCase()] ||
        aliases[normalizedName] ||
        fieldValues[placeholderName] ||
        fieldValues[normalizedName] ||
        fieldValues[placeholderName.toUpperCase()] ||
        fieldValues[normalizedName.toUpperCase()];

      const safe = typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
      if (safe && safe.trim()) {
        if (cleanFinal) {
          const token = `\u0001CFV${Object.keys(finalValueTokens).length}\u0001`;
          finalValueTokens[token] = escapeFinalFieldValue(safe);
          return token;
        }
        return `<span class="filled-field">${escapeHtml(safe)}</span>`;
      }

      return cleanFinal || isSignaturePlaceholderName(placeholderName) ? "" : fullMatch;
    });
  }

  if (highlightMissing) {
    for (const pattern of highlightPatterns) {
      content = content.replace(pattern, (fullMatch) => {
        return `<span class="missing-field">${escapeHtml(fullMatch)}</span>`;
      });
    }
  }

  content = stripEditorOnlyMarkup(content);

  if (!cleanFinal) return content;

  let finalContent = htmlToPlainText(content);
  Object.entries(finalValueTokens).forEach(([token, value]) => {
    finalContent = finalContent.split(token).join(value);
  });
  return removeResidualPlaceholders(finalContent).trim() || removeResidualPlaceholders(rawFallback);
}

export type ContractSegment =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt?: string };

/**
 * Final-stage renderer that returns clean plain-text segments + signature
 * images, ready to be rendered by React as text nodes + <img> (NOT via
 * dangerouslySetInnerHTML). Guarantees no HTML/entities leak into the UI.
 */
export function renderContractSegments(
  templateContent: string,
  fieldValues: Record<string, string>,
  signatures?: Record<string, string | null | undefined>,
): ContractSegment[] {
  let content = templateContent || "";

  // 1. Capture signature data URLs as sentinels BEFORE any escaping/cleaning,
  //    so they survive the plain-text pass.
  const sigTokens: Record<string, string> = {};
  const effective: Record<string, string | null | undefined> = { ...(signatures || {}) };
  for (const field of SIGNATURE_FIELDS) {
    const v = effective[field.placeholder] || fieldValues[field.placeholder];
    if (v && typeof v === "string" && v.startsWith("data:image")) {
      effective[field.placeholder] = v;
    } else if (v && typeof v === "string" && v.startsWith("http")) {
      effective[field.placeholder] = v;
    }
  }

  // Replace signature placeholders directly with sentinel tokens
  Object.entries(effective).forEach(([placeholder, url]) => {
    if (!url) return;
    const token = `\u0003SIG${Object.keys(sigTokens).length}\u0003`;
    sigTokens[token] = url as string;
    // Match {{PH}}, [[PH]], <<PH>>, __PH__ wrappers and any HTML around them
    const escName = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$1");
    const variants = [
      new RegExp(`\\{\\{\\s*${escName}\\s*\\}\\}`, "gi"),
      new RegExp(`\\[\\[\\s*${escName}\\s*\\]\\]`, "gi"),
      new RegExp(`<<\\s*${escName}\\s*>>`, "gi"),
      new RegExp(`__\\s*${escName}\\s*__`, "gi"),
    ];
    variants.forEach((rx) => { content = content.replace(rx, `\n${token}\n`); });
  });

  // 2. Run the standard cleanFinal pipeline for everything else (which already
  //    returns plain text, no HTML).
  const plain = renderContractContent(content, fieldValues, {}, { cleanFinal: true });

  // 3. Split on signature sentinels and emit segments.
  const segments: ContractSegment[] = [];
  const parts = plain.split(/(\u0003SIG\d+\u0003)/g);
  for (const part of parts) {
    if (!part) continue;
    if (/^\u0003SIG\d+\u0003$/.test(part)) {
      const src = sigTokens[part];
      if (src) segments.push({ type: "image", src, alt: "Assinatura" });
    } else {
      segments.push({ type: "text", value: part });
    }
  }
  if (segments.length === 0) segments.push({ type: "text", value: plain });
  return segments;
}
