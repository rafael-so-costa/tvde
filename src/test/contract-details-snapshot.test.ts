import { describe, it, expect } from "vitest";
import {
  analyzeTemplateRequirements,
  type ProfileKind,
} from "@/utils/templatePlaceholderAnalyzer";
import { shouldRenderProfileSection } from "@/utils/contractDetailsVisibility";
import type { ContractTemplate } from "@/types/contract";

/**
 * Snapshot tests para a aba "Detalhes":
 * - Garante que seções vazias não aparecem.
 * - Garante que a ordem das seções permanece estável por tipo de contrato.
 *
 * Não renderizamos o DOM completo (DetailSection depende de muitos dados);
 * usamos uma representação determinística: lista ordenada de
 * { kind, hasData } => render?, exatamente como a UI decide.
 */

const makeTemplate = (conteudo: string): ContractTemplate =>
  ({
    id: "t",
    nome: "Template",
    tipo: "aluguer",
    conteudo_original: conteudo,
    conteudo_processado: conteudo,
    campos: [],
    ativo: true,
    criado_em: new Date().toISOString(),
  }) as unknown as ContractTemplate;

const TEMPLATES: Record<string, string> = {
  aluguer: `
    {{NOME_EMPRESA}} {{NIF_EMPRESA}}
    {{NOME_PROPRIETARIO}} {{NIF_PROPRIETARIO}}
    {{NOME_MOTORISTA}} {{NIF_MOTORISTA}}
    {{MATRICULA_VEICULO}} {{MARCA_VEICULO}}
  `,
  prestacao_servico: `
    {{NOME_MOTORISTA}} {{NIF_MOTORISTA}}
    {{NOME_EMPRESA}} {{NIF_EMPRESA}}
  `,
  uber: `
    {{NOME_EMPRESA}}
    {{NOME_MOTORISTA}} {{EMAIL_MOTORISTA}}
    {{MATRICULA_VEICULO}}
  `,
  bolt: `
    {{NOME_PROPRIETARIO}}
    {{NOME_MOTORISTA}}
    {{MATRICULA_VEICULO}} {{MODELO_VEICULO}}
  `,
  devolucao: `
    {{NOME_MOTORISTA}}
    {{MATRICULA_VEICULO}}
  `,
};

type DataSet = Partial<Record<ProfileKind, Record<string, unknown> | null>>;

function renderSections(templateContent: string, data: DataSet) {
  const requirements = analyzeTemplateRequirements(makeTemplate(templateContent));
  const flags: Record<ProfileKind, boolean> = {
    empresa: requirements.needsEmpresa,
    proprietario: requirements.needsProprietario,
    motorista: requirements.needsMotorista,
    veiculo: requirements.needsVeiculo,
  };

  const defaultOrder: ProfileKind[] = ["empresa", "proprietario", "motorista", "veiculo"];
  const order: ProfileKind[] = [
    ...requirements.orderedProfiles,
    ...defaultOrder.filter((k) => !requirements.orderedProfiles.includes(k)),
  ];

  return order
    .filter((kind) => shouldRenderProfileSection(data[kind] ?? null, flags[kind]))
    .map((kind) => ({ kind }));
}

const FULL_DATA: DataSet = {
  empresa: { nome: "Empresa X", nif: "500000000" },
  proprietario: { nome: "Owner", nif: "200000000" },
  motorista: { nome: "Driver", nif: "100000000" },
  veiculo: { matricula: "AA-00-AA", marca: "VW" },
};

describe("Detalhes tab - snapshot por tipo de contrato (todos os perfis preenchidos)", () => {
  for (const [tipo, conteudo] of Object.entries(TEMPLATES)) {
    it(`${tipo}: ordem estável das seções`, () => {
      expect(renderSections(conteudo, FULL_DATA)).toMatchSnapshot();
    });
  }
});

describe("Detalhes tab - snapshot sem dados (nenhuma seção deve aparecer)", () => {
  for (const [tipo, conteudo] of Object.entries(TEMPLATES)) {
    it(`${tipo}: snapshot vazio`, () => {
      expect(renderSections(conteudo, {})).toEqual([]);
      expect(renderSections(conteudo, {})).toMatchSnapshot();
    });
  }
});

describe("Detalhes tab - snapshot com dados parciais (só renderiza preenchidos, mantendo ordem)", () => {
  it("aluguer: apenas empresa + veículo", () => {
    expect(
      renderSections(TEMPLATES.aluguer, {
        empresa: FULL_DATA.empresa,
        veiculo: FULL_DATA.veiculo,
      }),
    ).toMatchSnapshot();
  });

  it("prestacao_servico: apenas motorista", () => {
    expect(
      renderSections(TEMPLATES.prestacao_servico, { motorista: FULL_DATA.motorista }),
    ).toMatchSnapshot();
  });

  it("bolt: motorista + veículo (sem proprietário)", () => {
    expect(
      renderSections(TEMPLATES.bolt, {
        motorista: FULL_DATA.motorista,
        veiculo: FULL_DATA.veiculo,
      }),
    ).toMatchSnapshot();
  });
});
