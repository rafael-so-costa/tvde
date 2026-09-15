import {
  type ProfileKind,
  type TemplateRequirements,
} from "@/utils/templatePlaceholderAnalyzer";
import { hasProfileData, type ProfileData } from "@/utils/contractDetailsVisibility";

export const DEFAULT_PROFILE_ORDER: ProfileKind[] = [
  "empresa",
  "proprietario",
  "motorista",
  "veiculo",
];

export const CONTRACT_PROFILE_FIELD_KEYS: Record<ProfileKind, string[]> = {
  empresa: [
    "NOME_EMPRESA",
    "NIF_EMPRESA",
    "EMAIL_EMPRESA",
    "TELEMOVEL_EMPRESA",
    "MORADA_EMPRESA",
    "CIDADE_EMPRESA",
    "IBAN_EMPRESA",
    "NOME_GERENTE_EMPRESA",
    "CAPITAL_SOCIAL_EMPRESA",
    "LICENCA_TVDE_EMPRESA",
  ],
  proprietario: [
    "NOME_PROPRIETARIO",
    "NIF_PROPRIETARIO",
    "EMAIL_PROPRIETARIO",
    "TELEMOVEL_PROPRIETARIO",
    "MORADA_PROPRIETARIO",
    "IBAN_PROPRIETARIO",
    "NUMERO_DOCUMENTO_PROPRIETARIO",
    "VALIDADE_DOCUMENTO_PROPRIETARIO",
    "NOME_GERENTE_PROPRIETARIO",
  ],
  motorista: [
    "NOME_MOTORISTA",
    "NIF_MOTORISTA",
    "EMAIL_MOTORISTA",
    "TELEMOVEL_MOTORISTA",
    "MORADA_MOTORISTA",
    "IBAN_MOTORISTA",
    "NUMERO_DOCUMENTO_MOTORISTA",
    "VALIDADE_DOCUMENTO_MOTORISTA",
    "CARTA_CONDUCAO_MOTORISTA",
    "LICENCA_TVDE_MOTORISTA",
  ],
  veiculo: [
    "MATRICULA",
    "MATRICULA_VEICULO",
    "MARCA",
    "MARCA_VEICULO",
    "MODELO",
    "MODELO_VEICULO",
    "CHASSI",
    "COR",
    "DATA_MATRICULA",
  ],
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value === "string" ? value.trim().length > 0 : true;
}

export function getFieldValue(
  fieldValues: Record<string, string>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = fieldValues[key] ?? fieldValues[key.toUpperCase()];
    if (hasValue(value)) return String(value);
  }
  return undefined;
}

export function hasProfileFieldValues(
  kind: ProfileKind,
  fieldValues: Record<string, string>,
): boolean {
  return CONTRACT_PROFILE_FIELD_KEYS[kind].some((key) => hasValue(fieldValues[key]));
}

export function shouldRenderContractProfileSection(
  kind: ProfileKind,
  data: ProfileData,
  fieldValues: Record<string, string>,
  _requiredByTemplate = false,
): boolean {
  return hasProfileData(data) || hasProfileFieldValues(kind, fieldValues);
}

export function getRequiredProfileOrder(
  requirements: TemplateRequirements,
): ProfileKind[] {
  const flags: Record<ProfileKind, boolean> = {
    empresa: requirements.needsEmpresa,
    proprietario: requirements.needsProprietario,
    motorista: requirements.needsMotorista,
    veiculo: requirements.needsVeiculo,
  };

  const explicitOrDetected = (requirements.orderedProfiles || []).filter(
    (profile, index, arr) => flags[profile] && arr.indexOf(profile) === index,
  );

  const missingRequired = DEFAULT_PROFILE_ORDER.filter(
    (profile) => flags[profile] && !explicitOrDetected.includes(profile),
  );

  return [...explicitOrDetected, ...missingRequired];
}

export function getRenderableProfileOrder(
  requirements: TemplateRequirements,
  canRender: (profile: ProfileKind) => boolean,
): ProfileKind[] {
  const requiredOrder = getRequiredProfileOrder(requirements);
  const associatedButNotRequired = DEFAULT_PROFILE_ORDER.filter(
    (profile) => canRender(profile) && !requiredOrder.includes(profile),
  );

  return [...requiredOrder.filter(canRender), ...associatedButNotRequired];
}