/**
 * Contract Field Mappings
 *
 * Thin wrapper around `profileFieldsSchema.ts` (single source of truth).
 * Adding a new placeholder = add it to the schema, nothing to change here.
 */

import {
  buildFieldMapFromSchema,
  type ProfileKey,
} from "./profileFieldsSchema";

export interface EntitySelection {
  empresa: boolean;
  proprietario: boolean;
  motorista: boolean;
  veiculo: boolean;
  funcionario?: boolean;
}

export interface ManualFieldValues {
  percentagem_contrato: string;
  data_inicio_contrato: string;
  data_fim_contrato: string;
  duracao_contrato: string;
  data_primeiro_pagamento: string;
  data_assinatura_contrato: string;
}

const mapByKey = (key: ProfileKey, entity: any) =>
  buildFieldMapFromSchema(key, entity);

const isProprietarioEmpresa = (p: any) => {
  const t = typeof p?.tipo === "string" ? p.tipo.toLowerCase().trim() : "";
  return t === "empresa" || t === "pessoa_juridica" || t === "pj";
};

export const mapEmpresaFields = (empresa: any) => mapByKey("empresa", empresa);
export const mapProprietarioFields = (proprietario: any) =>
  mapByKey("proprietario", proprietario);
export const mapProprietarioEmpresaFields = (proprietario: any) =>
  isProprietarioEmpresa(proprietario) ? mapByKey("proprietario", proprietario) : {};
export const mapProprietarioParticularFields = (proprietario: any) =>
  proprietario && !isProprietarioEmpresa(proprietario)
    ? mapByKey("proprietario", proprietario)
    : {};
export const mapMotoristaFields = (motorista: any) =>
  mapByKey("motorista", motorista);
export const mapVeiculoFields = (veiculo: any) => mapByKey("veiculo", veiculo);
export const mapFuncionarioFields = (funcionario: any) =>
  mapByKey("funcionario", funcionario);

/**
 * Maps manual fields to contract fields
 */
export function mapManualFields(values: ManualFieldValues): Record<string, string> {
  return {
    PERCENTAGEM_CONTRATO: values.percentagem_contrato || "",
    DATA_INICIO_CONTRATO: values.data_inicio_contrato || "",
    DATA_FIM_CONTRATO: values.data_fim_contrato || "",
    DURACAO_CONTRATO: values.duracao_contrato || "",
    DATA_PRIMEIRO_PAGAMENTO: values.data_primeiro_pagamento || "",
    DATA_ASSINATURA_CONTRATO: values.data_assinatura_contrato || "",
  };
}

/**
 * Combines all field mappings based on selected entities.
 */
export function combineFieldMappings(
  selection: EntitySelection,
  empresa: any,
  proprietario: any,
  motorista: any,
  veiculo: any,
  manualFields: ManualFieldValues,
  funcionario?: any
): Record<string, string> {
  let mappings: Record<string, string> = {};
  if (selection.empresa) mappings = { ...mappings, ...mapEmpresaFields(empresa) };
  if (selection.proprietario) mappings = { ...mappings, ...mapProprietarioFields(proprietario) };
  if (selection.motorista) mappings = { ...mappings, ...mapMotoristaFields(motorista) };
  if (selection.veiculo) mappings = { ...mappings, ...mapVeiculoFields(veiculo) };
  if (selection.funcionario && funcionario) {
    mappings = { ...mappings, ...mapFuncionarioFields(funcionario) };
  }
  mappings = { ...mappings, ...mapManualFields(manualFields) };
  return mappings;
}

/**
 * List of manual fields that appear at the end of the form
 */
export const MANUAL_FIELDS = [
  {
    id: "percentagem_contrato",
    name: "percentagem_contrato",
    label: "Porcentagem do Contrato",
    type: "select" as const,
    options: ["6%", "10%"],
    required: false,
  },
  {
    id: "data_inicio_contrato",
    name: "data_inicio_contrato",
    label: "Data de Início do Contrato",
    type: "date" as const,
    required: false,
  },
  {
    id: "data_fim_contrato",
    name: "data_fim_contrato",
    label: "Data de Fim do Contrato",
    type: "date" as const,
    required: false,
  },
  {
    id: "duracao_contrato",
    name: "duracao_contrato",
    label: "Duração do Contrato",
    type: "select" as const,
    options: ["6 meses", "1 ano"],
    required: false,
  },
  {
    id: "data_primeiro_pagamento",
    name: "data_primeiro_pagamento",
    label: "Data do Primeiro Pagamento",
    type: "date" as const,
    required: false,
  },
  {
    id: "data_assinatura_contrato",
    name: "data_assinatura_contrato",
    label: "Data da Assinatura do Contrato",
    type: "date" as const,
    required: false,
  },
];

/**
 * Entity type configuration for the wizard
 */
export const ENTITY_TYPES = [
  {
    id: "empresa",
    label: "Empresa",
    description: "Dados da empresa (tenant)",
    icon: "Building2",
  },
  {
    id: "proprietario",
    label: "Proprietário",
    description: "Dados do proprietário do veículo",
    icon: "Building",
  },
  {
    id: "motorista",
    label: "Motorista",
    description: "Dados do motorista",
    icon: "User",
  },
  {
    id: "veiculo",
    label: "Veículo",
    description: "Dados do veículo",
    icon: "Car",
  },
] as const;
