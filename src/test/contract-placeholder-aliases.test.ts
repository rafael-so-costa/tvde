import { describe, it, expect } from "vitest";
import {
  createPlaceholderAliases,
  generateContractFieldMappings,
  renderContractContent,
} from "@/hooks/useContractFullData";

describe("contract placeholder aliasing", () => {
  it("fills owner id number even with template typo (DOCUEMNTO)", () => {
    const template = "{{NUMERO_DO_DOCUEMNTO_DE_IDENTIFICACAO_PROPRIETARIO}}";
    const fields = createPlaceholderAliases({
      NUMERO_DOCUMENTO_PROPRIETARIO: "ABC123",
    });

    const html = renderContractContent(template, fields);
    expect(html).toContain("filled-field");
    expect(html).toContain("ABC123");
  });

  it("cleans editor wrapper HTML from final generated contract", () => {
    const template = '<p><span class="template-field" data-field="NOME_EMPRESA" contenteditable="false">{{NOME_EMPRESA}}</span></p>';
    const html = renderContractContent(template, { NOME_EMPRESA: "Focus Car" }, undefined, { cleanFinal: true });

    expect(html).toBe("Focus Car");
    expect(html).not.toContain("span");
    expect(html).not.toContain("template-field");
    expect(html).not.toContain("{{NOME_EMPRESA}}");
  });

  it("removes escaped editor HTML and unknown placeholders in final output", () => {
    const template = '&lt;span class=&quot;template-field&quot; data-field=&quot;NOME_EMPRESA&quot; contenteditable=&quot;false&quot;&gt;{{NOME_EMPRESA}}&lt;/span&gt; {{CAMPO_DESCONHECIDO}}';
    const html = renderContractContent(template, { NOME_EMPRESA: "Focus Car" }, undefined, { cleanFinal: true });

    expect(html).toBe("Focus Car");
    expect(html).not.toContain("&lt;span");
    expect(html).not.toContain("CAMPO_DESCONHECIDO");
  });

  it("substitutes dynamic fields before final cleanup and preserves contract body", () => {
    const template = '<h1>Contrato</h1><p>Cláusula 1: <span class="template-field" data-field="NOME_EMPRESA">{{NOME_EMPRESA}}</span></p><p>Cláusula 2: veículo <span class="template-field" contenteditable="false">{{MATRICULA}}</span>.</p>';
    const html = renderContractContent(template, { NOME_EMPRESA: "Focus Car", MATRICULA: "AA-33-AA" }, undefined, { cleanFinal: true });

    expect(html).toContain("Contrato");
    expect(html).toContain("Cláusula 1: Focus Car");
    expect(html).toContain("Cláusula 2: veículo AA-33-AA.");
    expect(html).not.toContain("template-field");
    expect(html).not.toContain("{{NOME_EMPRESA}}");
  });

  it("does not let empty saved campos_preenchidos override profile data", () => {
    const mappings = generateContractFieldMappings({
      empresa: null,
      motorista: null,
      veiculo: null,
      proprietario: {
        tipo: "particular",
        tipo_documento: "cartao_cidadao",
        numero_documento: "999999",
        documento_valid_until: "2030-01-01",
        endereco_rua: "Rua X",
        nif: "123",
        nome_completo: "Fulano",
        email: "a@b.com",
        telemovel: "999",
        iban: "PT50",
      },
      camposPreenchidos: {
        // vazio não deve apagar o valor do perfil
        NUMERO_DOCUMENTO_PROPRIETARIO: "",
      },
    });

    expect(mappings.NUMERO_DOCUMENTO_PROPRIETARIO).toBe("999999");
  });
});
