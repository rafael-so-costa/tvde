/**
 * Template Grouping Utilities
 * Groups similar templates and auto-selects the correct variant based on owner type
 */

import type { ContractTemplate } from "@/types/contract";

/**
 * Template group configuration
 * Maps display names to their variants
 */
interface TemplateGroupConfig {
  displayName: string;
  variants: {
    particular: string[];
    empresa: string[];
  };
}

/**
 * Define template grouping rules
 * Templates that match these patterns will be grouped together
 */
const TEMPLATE_GROUPS: TemplateGroupConfig[] = [
  {
    displayName: "BOLT PROPRIETARIO",
    variants: {
      particular: [
        "BOLT PROPRIETARIO / PARTICULAR",
        "BOLT PROPRIETARIO/PARTICULAR",
        "BOLT PROPRIETARIO/ PARTICULAR",
        "BOLT PROPRIETARIO /PARTICULAR",
      ],
      empresa: [
        "BOLT PROPRIETARIO / EMPRESA",
        "BOLT PROPRIETARIO/EMPRESA",
        "BOLT PROPRIETARIO/ EMPRESA",
        "BOLT PROPRIETARIO /EMPRESA",
      ],
    },
  },
  {
    displayName: "ALUGUER DE VEICULOS",
    variants: {
      particular: [
        "ALUGUER DE VEICULOS PROPRIETARIO / PARTICULAR",
        "ALUGUER DE VEICULOS PROPRIETARIO/PARTICULAR",
        "ALUGUER DE VEICULOS PROPRIETARIO/ PARTICULAR",
        "ALUGUER DE VEICULOS PROPRIETARIO /PARTICULAR",
      ],
      empresa: [
        "ALUGUER DE VEICULOS PROPRIETARIO / EMPRESA",
        "ALUGUER DE VEICULOS PROPRIETARIO/EMPRESA",
        "ALUGUER DE VEICULOS PROPRIETARIO/ EMPRESA",
        "ALUGUER DE VEICULOS PROPRIETARIO /EMPRESA",
      ],
    },
  },
  {
    displayName: "DEVOLUCAO SEM DANOS",
    variants: {
      particular: [
        "DEVOLUCAO SEM DANOS PARTICULAR",
        "DEVOLUCAO SEM DANOS / PARTICULAR",
        "DEVOLUCAO SEM DANOS/PARTICULAR",
      ],
      empresa: [
        "DEVOLUCAO SEM DANOS EMPRESA",
        "DEVOLUCAO SEM DANOS / EMPRESA",
        "DEVOLUCAO SEM DANOS/EMPRESA",
      ],
    },
  },
  {
    displayName: "DEVOLUCAO COM DANOS",
    variants: {
      particular: [
        "DEVOLUCAO COM DANOS PARTICULAR",
        "DEVOLUCAO COM DANOS / PARTICULAR",
        "DEVOLUCAO COM DANOS/PARTICULAR",
      ],
      empresa: [
        "DEVOLUCAO COM DANOS EMPRESA",
        "DEVOLUCAO COM DANOS / EMPRESA",
        "DEVOLUCAO COM DANOS/EMPRESA",
      ],
    },
  },
  {
    displayName: "UBER PROPRIETARIO",
    variants: {
      particular: ["UBER PROPRIETARIO"],
      empresa: ["UBER PROPRIETARIO"],
    },
  },
];

export interface GroupedTemplate {
  displayName: string;
  templateParticular: ContractTemplate | null;
  templateEmpresa: ContractTemplate | null;
  // Template to show in UI (uses particular as fallback)
  representativeTemplate: ContractTemplate;
  isGrouped: boolean;
}

/**
 * Groups templates based on predefined rules
 * Returns a simplified list with grouped templates appearing once
 */
export function groupTemplates(templates: ContractTemplate[]): GroupedTemplate[] {
  const result: GroupedTemplate[] = [];
  const processedIds = new Set<string>();

  // First, check each template against grouping rules
  for (const group of TEMPLATE_GROUPS) {
    const particularTemplate = templates.find((t) =>
      group.variants.particular.some(
        (v) => normalizeTemplateName(t.nome) === normalizeTemplateName(v)
      )
    );
    const empresaTemplate = templates.find((t) =>
      group.variants.empresa.some(
        (v) => normalizeTemplateName(t.nome) === normalizeTemplateName(v)
      )
    );

    // Only create a group if at least one variant exists
    if (particularTemplate || empresaTemplate) {
      const representativeTemplate = particularTemplate || empresaTemplate;
      if (representativeTemplate) {
        result.push({
          displayName: group.displayName,
          templateParticular: particularTemplate || null,
          templateEmpresa: empresaTemplate || null,
          representativeTemplate,
          isGrouped: !!(particularTemplate && empresaTemplate),
        });

        if (particularTemplate) processedIds.add(particularTemplate.id);
        if (empresaTemplate) processedIds.add(empresaTemplate.id);
      }
    }
  }

  // Add any templates that weren't matched to a group
  for (const template of templates) {
    if (!processedIds.has(template.id)) {
      result.push({
        displayName: template.nome,
        templateParticular: template,
        templateEmpresa: template,
        representativeTemplate: template,
        isGrouped: false,
      });
    }
  }

  return result;
}

/**
 * Normalize template name for comparison
 */
function normalizeTemplateName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

/**
 * Selects the appropriate template variant based on owner type
 */
export function selectTemplateVariant(
  group: GroupedTemplate,
  ownerType: "particular" | "empresa" | null
): ContractTemplate {
  if (!ownerType) {
    // If no owner selected yet, return the representative template
    return group.representativeTemplate;
  }

  if (ownerType === "empresa" && group.templateEmpresa) {
    return group.templateEmpresa;
  }

  if (ownerType === "particular" && group.templateParticular) {
    return group.templateParticular;
  }

  // Fallback to representative template
  return group.representativeTemplate;
}

/**
 * Get owner type from proprietario object
 */
export function getOwnerType(proprietario: any): "particular" | "empresa" | null {
  if (!proprietario) return null;
  const t = (proprietario.tipo ?? "").toLowerCase().trim();
  if (t === "empresa" || t === "pessoa_juridica" || t === "pj") return "empresa";
  return "particular";
}
