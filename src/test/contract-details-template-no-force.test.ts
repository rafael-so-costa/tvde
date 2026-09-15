import { describe, it, expect } from "vitest";
import { analyzeTemplateRequirements, type ProfileKind } from "@/utils/templatePlaceholderAnalyzer";
import { shouldRenderProfileSection } from "@/utils/contractDetailsVisibility";
import type { ContractTemplate } from "@/types/contract";

/**
 * Regression: independentemente do que o template exige (requiredProfiles),
 * a aba "Detalhes" NÃO deve renderizar uma seção quando o contrato não
 * possui dados reais para esse perfil. O template não pode "forçar" a UI.
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

const CONTRACT_TEMPLATES: Record<string, string> = {
  aluguer: `
    Empresa: {{NOME_EMPRESA}} - NIF {{NIF_EMPRESA}}
    Proprietário: {{NOME_PROPRIETARIO}} - NIF {{NIF_PROPRIETARIO}}
    Motorista: {{NOME_MOTORISTA}} - NIF {{NIF_MOTORISTA}}
    Veículo: {{MATRICULA_VEICULO}} {{MARCA_VEICULO}}
  `,
  prestacao_servico: `
    Motorista: {{NOME_MOTORISTA}} - {{NIF_MOTORISTA}}
    Empresa: {{NOME_EMPRESA}} - {{NIF_EMPRESA}}
  `,
  uber: `
    Empresa: {{NOME_EMPRESA}}
    Motorista UBER: {{NOME_MOTORISTA}} - {{EMAIL_MOTORISTA}}
    Veículo: {{MATRICULA_VEICULO}}
  `,
  bolt: `
    Proprietário: {{NOME_PROPRIETARIO}}
    Motorista BOLT: {{NOME_MOTORISTA}}
    Veículo: {{MATRICULA_VEICULO}} {{MODELO_VEICULO}}
  `,
  devolucao: `
    Motorista: {{NOME_MOTORISTA}}
    Veículo devolvido: {{MATRICULA_VEICULO}}
  `,
};

const ALL_KINDS: ProfileKind[] = ["empresa", "proprietario", "motorista", "veiculo"];

describe("Detalhes tab - template never forces empty sections", () => {
  for (const [tipo, conteudo] of Object.entries(CONTRACT_TEMPLATES)) {
    describe(`tipo: ${tipo}`, () => {
      const requirements = analyzeTemplateRequirements(makeTemplate(conteudo));

      it("template lists at least one required profile", () => {
        expect(requirements.orderedProfiles.length).toBeGreaterThan(0);
      });

      it("with NO data, nenhuma seção é renderizada mesmo sendo exigida pelo template", () => {
        const flags = {
          empresa: requirements.needsEmpresa,
          proprietario: requirements.needsProprietario,
          motorista: requirements.needsMotorista,
          veiculo: requirements.needsVeiculo,
        };

        for (const kind of ALL_KINDS) {
          // Sem dados: null, undefined e objetos vazios/whitespace
          expect(shouldRenderProfileSection(null, flags[kind])).toBe(false);
          expect(shouldRenderProfileSection(undefined, flags[kind])).toBe(false);
          expect(shouldRenderProfileSection({}, flags[kind])).toBe(false);
          expect(
            shouldRenderProfileSection({ nome: "", nif: null, email: "  " }, flags[kind]),
          ).toBe(false);
        }
      });

      it("com dados, a seção é renderizada (independente da flag do template)", () => {
        // Mesmo que o template NÃO exija (flag false), a presença de dados
        // ainda permite mostrar a seção — i.e., a regra é orientada a dados.
        const data = { nome: "Valor Real" };
        expect(shouldRenderProfileSection(data, true)).toBe(true);
        expect(shouldRenderProfileSection(data, false)).toBe(true);
      });
    });
  }

  it("template que exige todos os perfis + contrato vazio => 0 seções", () => {
    const req = analyzeTemplateRequirements(makeTemplate(CONTRACT_TEMPLATES.aluguer));
    const rendered = ALL_KINDS.filter((k) =>
      shouldRenderProfileSection(null, (req as any)[`needs${k[0].toUpperCase()}${k.slice(1)}`]),
    );
    expect(rendered).toEqual([]);
  });
});
