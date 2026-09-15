import { describe, it, expect } from "vitest";
import {
  hasProfileData,
  shouldRenderProfileSection,
} from "@/utils/contractDetailsVisibility";

describe("Detalhes tab - profile section visibility (data-driven)", () => {
  describe("hasProfileData", () => {
    it("returns false for null / undefined", () => {
      expect(hasProfileData(null)).toBe(false);
      expect(hasProfileData(undefined)).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(hasProfileData({})).toBe(false);
    });

    it("returns false when every value is empty/whitespace/null", () => {
      expect(
        hasProfileData({ nome: "", nif: null, email: "   ", telemovel: undefined }),
      ).toBe(false);
    });

    it("returns true when at least one string field is filled", () => {
      expect(hasProfileData({ nome: "Ana", nif: "" })).toBe(true);
    });

    it("returns true for numeric / boolean values", () => {
      expect(hasProfileData({ lugares: 5 })).toBe(true);
      expect(hasProfileData({ ativo: false })).toBe(true);
    });
  });

  describe("shouldRenderProfileSection (data is required)", () => {
    const motorista = { nome_completo: "Ana", nif: "123456789" };
    const empresa = { nome_empresa: "Focus Car", nif: "500000000" };

    it("does NOT render Motorista section when motorista data is missing, even if template requires it", () => {
      expect(shouldRenderProfileSection(null, true)).toBe(false);
      expect(shouldRenderProfileSection(undefined, true)).toBe(false);
      expect(shouldRenderProfileSection({}, true)).toBe(false);
    });

    it("does NOT render Empresa section when empresa data is missing, even if template requires it", () => {
      expect(shouldRenderProfileSection(null, true)).toBe(false);
      expect(shouldRenderProfileSection({ nome_empresa: "", nif: "" }, true)).toBe(false);
    });

    it("does NOT render Proprietário section when data is missing", () => {
      expect(shouldRenderProfileSection(null, true)).toBe(false);
    });

    it("does NOT render Veículo section when data is missing", () => {
      expect(shouldRenderProfileSection(null, true)).toBe(false);
    });

    it("renders the section when contract data exists, regardless of template", () => {
      expect(shouldRenderProfileSection(motorista, false)).toBe(true);
      expect(shouldRenderProfileSection(empresa, false)).toBe(true);
    });

    it("renders the section when contract data exists AND template requires it", () => {
      expect(shouldRenderProfileSection(motorista, true)).toBe(true);
      expect(shouldRenderProfileSection(empresa, true)).toBe(true);
    });

    it("does not render when data is an empty array / empty object", () => {
      expect(shouldRenderProfileSection({}, true)).toBe(false);
      // arrays are technically objects; treat empty arrays as no data
      expect(shouldRenderProfileSection([] as any, true)).toBe(false);
    });

    it("renders all four profile types independently based on their own data", () => {
      const cases: Array<[string, unknown, boolean]> = [
        ["motorista filled", motorista, true],
        ["empresa filled", empresa, true],
        ["proprietario empty", null, false],
        ["veiculo filled", { matricula: "AA-11-BB" }, true],
        ["veiculo empty", { matricula: "" }, false],
      ];
      for (const [label, data, expected] of cases) {
        expect(
          shouldRenderProfileSection(data as any, false),
          `${label} should be ${expected}`,
        ).toBe(expected);
      }
    });
  });
});
