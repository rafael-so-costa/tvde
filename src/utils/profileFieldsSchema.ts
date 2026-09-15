/**
 * Single source of truth for profile-derived contract fields.
 *
 * Every dynamic placeholder used in contract templates is declared here per
 * profile (Motorista, Proprietário, Empresa, Veículo, Funcionário, Contrato).
 *
 * - The dynamic fields sidebar in the template editor reads this schema.
 * - The contract field mappers (contractFieldMappings.ts) read this schema
 *   to build the placeholder -> value object injected into contracts.
 *
 * To expose a new field in contracts/templates/PDFs/signatures, just add it
 * here. No other code change is required.
 */

export type ProfileKey =
  | "motorista"
  | "proprietario"
  | "empresa"
  | "veiculo"
  | "funcionario"
  | "contrato";

export interface ProfileFieldDef {
  /** User-facing label */
  label: string;
  /** Placeholder name without braces, e.g. "NOME_MOTORISTA" */
  placeholder: string;
  /** Direct DB column on the entity. Optional if `format` is provided. */
  dbColumn?: string;
  /** Custom extractor for computed/composed values. */
  format?: (entity: any) => string;
}

export interface ProfileSchemaDef {
  key: ProfileKey;
  label: string;
  description: string;
  /** Lucide icon name, resolved in the UI layer. */
  iconName: "User" | "Building2" | "Briefcase" | "Car" | "Users" | "FileText";
  fields: ProfileFieldDef[];
}

// ---------------- Helpers ----------------

const buildAddress = (entity: any): string => {
  if (!entity) return "";
  const parts = [
    entity.endereco_rua,
    entity.endereco_numero,
    entity.endereco_complemento,
    entity.endereco_cep,
    entity.endereco_cidade,
  ].filter(Boolean);
  return parts.join(", ") || entity.endereco || "";
};

const formatCurrency = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "" : `€${Number(v).toFixed(2)}`;

const getDocumentTypeLabel = (tipo: string | null | undefined): string => {
  switch (tipo) {
    case "passport":
      return "Passaporte";
    case "residencia":
      return "Título de Residência";
    case "cartao_cidadao":
      return "Cartão de Cidadão";
    default:
      return tipo || "";
  }
};

// ---------------- Schema ----------------

export const PROFILE_FIELDS_SCHEMA: ProfileSchemaDef[] = [
  {
    key: "motorista",
    label: "Motorista",
    description: "Dados do motorista associado ao contrato",
    iconName: "User",
    fields: [
      { label: "Nome completo", placeholder: "NOME_MOTORISTA", dbColumn: "nome_completo" },
      { label: "NIF", placeholder: "NIF_MOTORISTA", dbColumn: "nif" },
      { label: "Email", placeholder: "EMAIL_MOTORISTA", dbColumn: "email" },
      { label: "Telefone", placeholder: "TELEMOVEL_MOTORISTA", dbColumn: "telemovel" },
      { label: "Morada", placeholder: "MORADA_MOTORISTA", format: buildAddress },
      {
        label: "Tipo de Documento de Identificação",
        placeholder: "TIPO_DOCUMENTO_MOTORISTA",
        format: (m) => getDocumentTypeLabel(m?.tipo_documento),
      },
      {
        label: "Documento de Identificação (etiqueta)",
        placeholder: "DOCUMENTO_IDENTIFICACAO_MOTORISTA",
        format: (m) => getDocumentTypeLabel(m?.tipo_documento),
      },
      { label: "Nº do documento", placeholder: "NUMERO_DOCUMENTO_MOTORISTA", dbColumn: "numero_documento" },
      { label: "Validade do documento", placeholder: "VALIDADE_DOCUMENTO_MOTORISTA", dbColumn: "documento_valid_until" },
      { label: "Carta de condução (nº)", placeholder: "CARTA_CONDUCAO_MOTORISTA", dbColumn: "carta_numero" },
      { label: "Validade da carta", placeholder: "VALIDADE_CARTA_MOTORISTA", dbColumn: "carta_valid_until" },
      { label: "Data de nascimento", placeholder: "DATA_NASCIMENTO_MOTORISTA", dbColumn: "data_nascimento" },
      { label: "Estado civil", placeholder: "ESTADO_CIVIL_MOTORISTA", dbColumn: "estado_civil" },
      { label: "Filhos", placeholder: "FILHOS_MOTORISTA", dbColumn: "filhos" },
      { label: "IBAN", placeholder: "IBAN_MOTORISTA", dbColumn: "iban" },
      { label: "Certificado TVDE", placeholder: "LICENCA_TVDE_MOTORISTA", dbColumn: "certificado_tvde" },
      { label: "Validade certificado TVDE", placeholder: "VALIDADE_TVDE_MOTORISTA", dbColumn: "certificado_tvde_valid_until" },
      { label: "Validade registo criminal", placeholder: "VALIDADE_REGISTO_CRIMINAL_MOTORISTA", dbColumn: "registo_criminal_valid_until" },
      { label: "Cartão de frota", placeholder: "CARTAO_FROTA_MOTORISTA", dbColumn: "cartao_frota" },
      { label: "Email Bolt", placeholder: "BOLT_EMAIL_MOTORISTA", dbColumn: "bolt_email" },
      { label: "Telefone Bolt", placeholder: "BOLT_TELEMOVEL_MOTORISTA", dbColumn: "bolt_telemovel" },
      { label: "Email Uber", placeholder: "UBER_EMAIL_MOTORISTA", dbColumn: "uber_email" },
      { label: "Telefone Uber", placeholder: "UBER_TELEMOVEL_MOTORISTA", dbColumn: "uber_telemovel" },
      { label: "Contacto de urgência (nome)", placeholder: "CONTATO_URGENCIA_NOME_MOTORISTA", dbColumn: "contato_urgencia_nome" },
      { label: "Contacto de urgência (telefone)", placeholder: "CONTATO_URGENCIA_TELEMOVEL_MOTORISTA", dbColumn: "contato_urgencia_telemovel" },
    ],
  },
  {
    key: "proprietario",
    label: "Proprietário",
    description: "Dados do proprietário do veículo (particular ou empresa)",
    iconName: "Building2",
    fields: [
      {
        label: "Nome / Razão social",
        placeholder: "NOME_PROPRIETARIO",
        format: (p) => p?.nome_empresa || p?.nome_completo || "",
      },
      { label: "NIF", placeholder: "NIF_PROPRIETARIO", dbColumn: "nif" },
      { label: "Email", placeholder: "EMAIL_PROPRIETARIO", dbColumn: "email" },
      { label: "Telefone", placeholder: "TELEMOVEL_PROPRIETARIO", dbColumn: "telemovel" },
      { label: "Morada", placeholder: "MORADA_PROPRIETARIO", format: buildAddress },
      { label: "IBAN", placeholder: "IBAN_PROPRIETARIO", dbColumn: "iban" },
      {
        label: "Tipo de Documento de Identificação",
        placeholder: "TIPO_DOCUMENTO_PROPRIETARIO",
        format: (p) => getDocumentTypeLabel(p?.tipo_documento),
      },
      {
        label: "Documento de Identificação (etiqueta)",
        placeholder: "DOCUMENTO_IDENTIFICACAO_PROPRIETARIO",
        format: (p) => getDocumentTypeLabel(p?.tipo_documento),
      },
      { label: "Nº do documento", placeholder: "NUMERO_DOCUMENTO_PROPRIETARIO", dbColumn: "numero_documento" },
      { label: "Validade do documento", placeholder: "VALIDADE_DOCUMENTO_PROPRIETARIO", dbColumn: "documento_valid_until" },
      { label: "Nome do gerente", placeholder: "NOME_GERENTE_PROPRIETARIO", dbColumn: "nome_gerente" },
      {
        label: "Capital social",
        placeholder: "CAPITAL_SOCIAL_PROPRIETARIO",
        format: (p) => formatCurrency(p?.capital_social),
      },
    ],
  },
  {
    key: "empresa",
    label: "Empresa",
    description: "Dados da empresa gestora",
    iconName: "Briefcase",
    fields: [
      { label: "Nome da empresa", placeholder: "NOME_EMPRESA", dbColumn: "nome_empresa" },
      { label: "NIF", placeholder: "NIF_EMPRESA", dbColumn: "nif" },
      { label: "Email", placeholder: "EMAIL_EMPRESA", dbColumn: "email" },
      { label: "Telefone", placeholder: "TELEMOVEL_EMPRESA", dbColumn: "telemovel" },
      { label: "Morada", placeholder: "MORADA_EMPRESA", format: buildAddress },
      { label: "Cidade", placeholder: "CIDADE_EMPRESA", dbColumn: "endereco_cidade" },
      { label: "IBAN", placeholder: "IBAN_EMPRESA", dbColumn: "iban" },
      { label: "Nome do gerente", placeholder: "NOME_GERENTE_EMPRESA", dbColumn: "nome_gerente" },
      {
        label: "Capital social",
        placeholder: "CAPITAL_SOCIAL_EMPRESA",
        format: (e) => formatCurrency(e?.capital_social),
      },
      { label: "Certificado TVDE", placeholder: "LICENCA_TVDE_EMPRESA", dbColumn: "certificado_tvde" },
      { label: "Validade certificado TVDE", placeholder: "VALIDADE_TVDE_EMPRESA", dbColumn: "certificado_tvde_valid_until" },
    ],
  },
  {
    key: "veiculo",
    label: "Veículo",
    description: "Dados do veículo do contrato",
    iconName: "Car",
    fields: [
      { label: "Matrícula", placeholder: "MATRICULA", dbColumn: "matricula" },
      { label: "Marca", placeholder: "MARCA", dbColumn: "marca" },
      { label: "Modelo", placeholder: "MODELO", dbColumn: "modelo" },
      { label: "Data da matrícula", placeholder: "DATA_MATRICULA", dbColumn: "data_matricula" },
      { label: "Chassi", placeholder: "CHASSI", dbColumn: "chassi" },
      { label: "Cilindrada", placeholder: "CILINDRADA", dbColumn: "cilindrada" },
      { label: "Potência", placeholder: "POTENCIA", dbColumn: "potencia" },
      { label: "Combustível", placeholder: "COMBUSTIVEL", dbColumn: "combustivel" },
      { label: "Cor", placeholder: "COR", dbColumn: "cor" },
      {
        label: "Nº de lugares",
        placeholder: "LUGARES",
        format: (v) => (v?.lugares ? String(v.lugares) : ""),
      },
      {
        label: "Nº de portas",
        placeholder: "PORTAS",
        format: (v) => (v?.portas ? String(v.portas) : ""),
      },
      {
        label: "Valor da caução",
        placeholder: "CAUCAO_VEICULO",
        format: (v) => formatCurrency(v?.valor_caucao),
      },
      {
        label: "Valor do aluguer",
        placeholder: "ALUGUEL_VEICULO",
        format: (v) => formatCurrency(v?.valor_aluguel),
      },
      {
        label: "Valor da caução (alias)",
        placeholder: "VALOR_CAUCAO",
        format: (v) => formatCurrency(v?.valor_caucao),
      },
      {
        label: "Valor do aluguer (alias)",
        placeholder: "VALOR_ALUGUEL",
        format: (v) => formatCurrency(v?.valor_aluguel),
      },
      {
        label: "Valor semanal",
        placeholder: "VALOR_SEMANAL",
        format: (v) => formatCurrency(v?.valor_aluguel),
      },
    ],
  },
  {
    key: "funcionario",
    label: "Funcionário",
    description: "Dados do funcionário (gestor/colaborador)",
    iconName: "Users",
    fields: [
      {
        label: "Nome completo",
        placeholder: "NOME_FUNCIONARIO",
        format: (f) => [f?.nome, f?.sobrenome].filter(Boolean).join(" "),
      },
      { label: "Primeiro nome", placeholder: "PRIMEIRO_NOME_FUNCIONARIO", dbColumn: "nome" },
      { label: "Apelido", placeholder: "APELIDO_FUNCIONARIO", dbColumn: "sobrenome" },
      { label: "NIF", placeholder: "NIF_FUNCIONARIO", dbColumn: "nif" },
      { label: "Email", placeholder: "EMAIL_FUNCIONARIO", dbColumn: "email" },
      { label: "Telefone", placeholder: "TELEMOVEL_FUNCIONARIO", dbColumn: "telemovel" },
      { label: "Morada", placeholder: "MORADA_FUNCIONARIO", format: buildAddress },
      { label: "IBAN", placeholder: "IBAN_FUNCIONARIO", dbColumn: "iban" },
      { label: "Tipo", placeholder: "TIPO_FUNCIONARIO", dbColumn: "tipo" },
      { label: "Contacto de urgência (nome)", placeholder: "CONTATO_URGENCIA_NOME_FUNCIONARIO", dbColumn: "contato_urgencia_nome" },
      { label: "Contacto de urgência (telefone)", placeholder: "CONTATO_URGENCIA_TELEMOVEL_FUNCIONARIO", dbColumn: "contato_urgencia_telemovel" },
    ],
  },
  {
    key: "contrato",
    label: "Contrato",
    description: "Campos manuais do contrato (preenchidos no wizard)",
    iconName: "FileText",
    fields: [
      { label: "Data de início", placeholder: "DATA_INICIO_CONTRATO" },
      { label: "Data de fim", placeholder: "DATA_FIM_CONTRATO" },
      { label: "Data da assinatura", placeholder: "DATA_ASSINATURA_CONTRATO" },
      { label: "Duração", placeholder: "DURACAO_CONTRATO" },
      { label: "Percentagem", placeholder: "PERCENTAGEM_CONTRATO" },
      { label: "Data do 1º pagamento", placeholder: "DATA_PRIMEIRO_PAGAMENTO" },
      { label: "Valor da caução", placeholder: "VALOR_CAUCAO" },
      { label: "Valor do aluguer", placeholder: "VALOR_ALUGUEL" },
      { label: "Observações", placeholder: "OBSERVACOES" },
    ],
  },
];

/** Lookup a schema by profile key. */
export function getProfileSchema(key: ProfileKey): ProfileSchemaDef | undefined {
  return PROFILE_FIELDS_SCHEMA.find((p) => p.key === key);
}

/**
 * Build a `{PLACEHOLDER: value}` map by applying the schema to an entity.
 * Missing/empty values become "".
 */
export function buildFieldMapFromSchema(
  key: ProfileKey,
  entity: any
): Record<string, string> {
  const schema = getProfileSchema(key);
  if (!schema || !entity) return {};
  const out: Record<string, string> = {};
  for (const f of schema.fields) {
    let raw: unknown = "";
    if (f.format) {
      raw = f.format(entity);
    } else if (f.dbColumn) {
      raw = entity[f.dbColumn];
    }
    out[f.placeholder] = raw === null || raw === undefined ? "" : String(raw);
  }
  return out;
}
