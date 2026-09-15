import { describe, it, expect } from "vitest";
import { analyzeTemplateRequirements } from "@/utils/templatePlaceholderAnalyzer";
import type { ContractTemplate } from "@/types/contract";

function tpl(nome: string, conteudo: string): ContractTemplate {
  return {
    id: "t",
    nome,
    arquivo_url: null,
    tipo_arquivo: "text/html",
    conteudo_original: conteudo,
    campos_detectados: [],
    campos_mapeados: {},
    tenant_id: "x",
    created_at: "",
    updated_at: "",
  };
}

/**
 * Regression suite: section order in the "Detalhes" tab must match the
 * first-occurrence order of each profile in the template content.
 * Includes legacy templates (DONO_/CARRO_), templates with mixed casing,
 * partial templates with only some placeholders, and templates that
 * reference no profile at all.
 */
describe("Detalhes tab - profile order regression", () => {
  it("standard aluguer order: empresa → proprietario → motorista → veiculo", () => {
    const req = analyzeTemplateRequirements(
      tpl(
        "Aluguer",
        "{{NOME_EMPRESA}} cede a {{NOME_PROPRIETARIO}} via motorista {{NOME_MOTORISTA}} o {{MATRICULA}}",
      ),
    );
    expect(req.orderedProfiles).toEqual([
      "empresa",
      "proprietario",
      "motorista",
      "veiculo",
    ]);
  });

  it("reversed order in template is preserved", () => {
    const req = analyzeTemplateRequirements(
      tpl(
        "Reverse",
        "Veículo {{MATRICULA}}, motorista {{NOME_MOTORISTA}}, proprietário {{NOME_PROPRIETARIO}}, empresa {{NOME_EMPRESA}}.",
      ),
    );
    expect(req.orderedProfiles).toEqual([
      "veiculo",
      "motorista",
      "proprietario",
      "empresa",
    ]);
  });

  it("prestação de serviço: motorista appears before empresa", () => {
    const req = analyzeTemplateRequirements(
      tpl(
        "Prestação",
        "O prestador {{NOME_MOTORISTA}} executa serviços para {{NOME_EMPRESA}}.",
      ),
    );
    expect(req.orderedProfiles).toEqual(["motorista", "empresa"]);
  });

  it("legacy template with DONO_ / CARRO_ aliases is detected and ordered", () => {
    const req = analyzeTemplateRequirements(
      tpl(
        "Legacy",
        "Carro {{CARRO_MATRICULA}} entregue ao dono {{DONO_NOME}} pelo motorista {{MOTORISTA_NOME}}.",
      ),
    );
    // veiculo (carro) appears first, then proprietario (dono), then motorista
    expect(req.orderedProfiles).toEqual(["veiculo", "proprietario", "motorista"]);
  });

  it("template without any profile placeholders returns empty order", () => {
    const req = analyzeTemplateRequirements(
      tpl("Generic", "Contrato sem campos dinâmicos relevantes."),
    );
    expect(req.orderedProfiles).toEqual([]);
    expect(req.needsEmpresa).toBe(false);
    expect(req.needsMotorista).toBe(false);
  });

  it("partial template (only motorista) returns only that profile", () => {
    const req = analyzeTemplateRequirements(
      tpl("Só motorista", "Motorista {{NOME_MOTORISTA}} ({{NIF_MOTORISTA}})."),
    );
    expect(req.orderedProfiles).toEqual(["motorista"]);
  });

  it("mixed casing / variants ({{ nome da empresa }}) still detected in order", () => {
    const req = analyzeTemplateRequirements(
      tpl(
        "Variants",
        "Empresa {{nome_da_empresa}}, motorista {{NOME_DO_MOTORISTA}}, veículo {{matricula}}.",
      ),
    );
    expect(req.orderedProfiles).toEqual(["empresa", "motorista", "veiculo"]);
  });

  it("BOLT proprietário template keeps explicit order rule (empresa+proprietario+veiculo)", () => {
    const req = analyzeTemplateRequirements(
      tpl(
        "BOLT Proprietário",
        "Entre {{NOME_PROPRIETARIO}} e {{NOME_EMPRESA}} relativo a {{MATRICULA}}.",
      ),
    );
    // Order driven by appearance in content
    expect(req.orderedProfiles[0]).toBe("proprietario");
    expect(req.orderedProfiles).toContain("empresa");
    expect(req.orderedProfiles).toContain("veiculo");
    expect(req.orderedProfiles).not.toContain("motorista");
  });

  it("duplicate placeholders only count first occurrence", () => {
    const req = analyzeTemplateRequirements(
      tpl(
        "Repeated",
        "{{NOME_MOTORISTA}} ... {{NOME_EMPRESA}} ... {{NOME_MOTORISTA}} again.",
      ),
    );
    expect(req.orderedProfiles).toEqual(["motorista", "empresa"]);
  });

  it("checklist-style template: motorista then veiculo", () => {
    const req = analyzeTemplateRequirements(
      tpl(
        "Devolução",
        "Motorista {{NOME_MOTORISTA}} devolve veículo {{MATRICULA}} em {{DATA_DEVOLUCAO}}.",
      ),
    );
    expect(req.orderedProfiles).toEqual(["motorista", "veiculo"]);
  });

  it("template with empty content returns empty profile order (no crash)", () => {
    const req = analyzeTemplateRequirements(tpl("Empty", ""));
    expect(req.orderedProfiles).toEqual([]);
  });

  it("null template returns empty order safely", () => {
    const req = analyzeTemplateRequirements(null);
    expect(req.orderedProfiles).toEqual([]);
  });
});
