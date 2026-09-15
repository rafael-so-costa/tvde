import { describe, it, expect } from "vitest";
import { analyzeTemplateRequirements } from "@/utils/templatePlaceholderAnalyzer";
import type { ContractTemplate } from "@/types/contract";

/**
 * Tests guaranteeing that the "Detalhes" tab in the contract viewer
 * shows ALL profiles required by each contract type.
 *
 * The Details tab renders a profile section when
 * `requirements.needsX === true` OR contract data for that profile exists.
 * These tests cover the template-driven side of that condition.
 */

function makeTemplate(nome: string, conteudo: string): ContractTemplate {
  return {
    id: "t1",
    nome,
    arquivo_url: null,
    tipo_arquivo: "text/html",
    conteudo_original: conteudo,
    campos_detectados: [],
    campos_mapeados: {},
    tenant_id: "tenant1",
    created_at: "",
    updated_at: "",
  };
}

describe("Detalhes tab - required profiles per contract type", () => {
  it("Aluguer: requires Empresa, Proprietário, Motorista, Veículo", () => {
    const tpl = makeTemplate(
      "Contrato de Aluguer",
      `Entre {{NOME_EMPRESA}} (NIF {{NIF_EMPRESA}}),
       o proprietário {{NOME_PROPRIETARIO}} ({{NIF_PROPRIETARIO}})
       e o motorista {{NOME_MOTORISTA}} ({{NIF_MOTORISTA}})
       relativo ao veículo {{MATRICULA}} {{MARCA}} {{MODELO}}.`
    );
    const req = analyzeTemplateRequirements(tpl);
    expect(req.needsEmpresa).toBe(true);
    expect(req.needsProprietario).toBe(true);
    expect(req.needsMotorista).toBe(true);
    expect(req.needsVeiculo).toBe(true);
  });

  it("Prestação de Serviço: requires Empresa and Motorista", () => {
    const tpl = makeTemplate(
      "Contrato de Prestação de Serviço",
      `Entre {{NOME_DA_EMPRESA}} (NIF {{NIF_DA_EMPRESA}}, sede em {{MORADA_DA_EMPRESA}})
       e o prestador {{NOME_DO_MOTORISTA}} (NIF {{NIF_DO_MOTORISTA}}).`
    );
    const req = analyzeTemplateRequirements(tpl);
    expect(req.needsEmpresa).toBe(true);
    expect(req.needsMotorista).toBe(true);
    expect(req.needsProprietario).toBe(false);
    expect(req.needsVeiculo).toBe(false);
  });

  it("Uber: requires Empresa, Motorista and Veículo", () => {
    const tpl = makeTemplate(
      "Contrato Uber",
      `A empresa {{NOME_EMPRESA}} cede ao motorista {{NOME_MOTORISTA}}
       o veículo {{MATRICULA}} ({{MARCA}}/{{MODELO}}) para uso na plataforma Uber.`
    );
    const req = analyzeTemplateRequirements(tpl);
    expect(req.needsEmpresa).toBe(true);
    expect(req.needsMotorista).toBe(true);
    expect(req.needsVeiculo).toBe(true);
  });

  it("BOLT Proprietário: requires Empresa, Proprietário and Veículo (no Motorista)", () => {
    const tpl = makeTemplate(
      "Contrato BOLT Proprietário",
      `Entre {{NOME_EMPRESA}} e o proprietário {{NOME_PROPRIETARIO}}
       relativo ao veículo {{MATRICULA}}.
       (CIDADE_DA_EMPRESA) (DATA_ASSINATURA_CONTRATO)`
    );
    const req = analyzeTemplateRequirements(tpl);
    expect(req.needsEmpresa).toBe(true);
    expect(req.needsProprietario).toBe(true);
    expect(req.needsVeiculo).toBe(true);
    expect(req.needsMotorista).toBe(false);
  });

  it("Devolução / Checklist: requires Motorista and Veículo", () => {
    const tpl = makeTemplate(
      "Termo de Devolução",
      `Recebemos do motorista {{NOME_MOTORISTA}} ({{NIF_MOTORISTA}})
       o veículo {{MATRICULA}} {{MARCA}} {{MODELO}}
       na data {{DATA_DEVOLUCAO}}, local {{LOCAL_DEVOLUCAO}}.`
    );
    const req = analyzeTemplateRequirements(tpl);
    expect(req.needsMotorista).toBe(true);
    expect(req.needsVeiculo).toBe(true);
  });

  it("returns empty requirements for null template (safe fallback)", () => {
    const req = analyzeTemplateRequirements(null);
    expect(req.needsEmpresa).toBe(false);
    expect(req.needsProprietario).toBe(false);
    expect(req.needsMotorista).toBe(false);
    expect(req.needsVeiculo).toBe(false);
    expect(req.manualFields).toEqual([]);
  });

  it("does not require Proprietário just because doc placeholder looks similar (no false positives)", () => {
    const tpl = makeTemplate(
      "Prestação de Serviço",
      `Motorista {{NOME_MOTORISTA}} portador do documento {{NUMERO_DOCUMENTO_MOTORISTA}}
       contratado por {{NOME_EMPRESA}}.`
    );
    const req = analyzeTemplateRequirements(tpl);
    expect(req.needsProprietario).toBe(false);
    expect(req.needsMotorista).toBe(true);
    expect(req.needsEmpresa).toBe(true);
  });
});

describe("Detalhes tab - profile order follows template", () => {
  function makeTpl(nome: string, c: string) {
    return {
      id: "t", nome, arquivo_url: null, tipo_arquivo: "text/html",
      conteudo_original: c, campos_detectados: [], campos_mapeados: {},
      tenant_id: "x", created_at: "", updated_at: "",
    } as any;
  }

  it("orders profiles by first occurrence in template content", () => {
    const tpl = makeTpl(
      "Prestação de Serviço",
      "Motorista {{NOME_MOTORISTA}} contratado pela empresa {{NOME_EMPRESA}}."
    );
    const req = analyzeTemplateRequirements(tpl);
    expect(req.orderedProfiles).toEqual(["motorista", "empresa"]);
  });

  it("Aluguer order: empresa, proprietario, motorista, veiculo", () => {
    const tpl = makeTpl(
      "Aluguer",
      "{{NOME_EMPRESA}} {{NOME_PROPRIETARIO}} {{NOME_MOTORISTA}} {{MATRICULA}}"
    );
    const req = analyzeTemplateRequirements(tpl);
    expect(req.orderedProfiles).toEqual(["empresa", "proprietario", "motorista", "veiculo"]);
  });
});
