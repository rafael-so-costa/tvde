import { describe, expect, it } from "vitest";
import {
  getRenderableProfileOrder,
  shouldRenderContractProfileSection,
} from "@/utils/contractDetailsRenderModel";
import { analyzeTemplateRequirements } from "@/utils/templatePlaceholderAnalyzer";
import type { ContractTemplate } from "@/types/contract";

const makeTemplate = (conteudo: string): ContractTemplate =>
  ({
    id: "prestacao",
    nome: "Prestação de Serviços",
    conteudo_original: conteudo,
    campos_detectados: [],
    campos_mapeados: {},
  }) as unknown as ContractTemplate;

describe("Detalhes tab - renderização dinâmica por requiredProfiles + dados guardados", () => {
  it("Prestação de Serviços mostra Empresa e Motorista quando ambos existem em campos_preenchidos", () => {
    const requirements = analyzeTemplateRequirements(
      makeTemplate("{{NOME_MOTORISTA}} {{NIF_MOTORISTA}} {{NOME_EMPRESA}} {{NIF_EMPRESA}}"),
    );
    const fieldValues = {
      NOME_MOTORISTA: "Ana Motorista",
      NIF_MOTORISTA: "123456789",
      NOME_EMPRESA: "Empresa TVDE Lda",
      NIF_EMPRESA: "500000000",
      DATA_INICIO_CONTRATO: "2026-01-01",
      VALOR_TOTAL: "1200",
      OBSERVACOES: "Contrato validado manualmente",
    };

    const order = getRenderableProfileOrder(requirements, (profile) =>
      shouldRenderContractProfileSection(profile, null, fieldValues, true),
    );

    expect(order).toEqual(["motorista", "empresa"]);
  });

  it("não limita a renderização ao primeiro perfil encontrado no template", () => {
    const requirements = analyzeTemplateRequirements(
      makeTemplate("{{NOME_MOTORISTA}} {{NOME_EMPRESA}} {{MATRICULA_VEICULO}}"),
    );
    const fieldValues = {
      NOME_MOTORISTA: "Ana Motorista",
      NOME_EMPRESA: "Empresa TVDE Lda",
      MATRICULA_VEICULO: "AA-00-AA",
    };

    const order = getRenderableProfileOrder(requirements, (profile) =>
      shouldRenderContractProfileSection(profile, null, fieldValues, true),
    );

    expect(order).toEqual(["motorista", "empresa", "veiculo"]);
  });
});