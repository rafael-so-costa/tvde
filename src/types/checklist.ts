export interface ChecklistItem {
  id: string;
  name: string;
  category: "documentacao" | "equipamento" | "acessorio" | "outro";
  replacementValue: number;
  damageValue: number;
  required: boolean;
  active?: boolean; // false = arquivado (não aparece em novos check-lists, mantido em histórico)
  // Special field options for specific items
  specialFields?: {
    type: "document_type" | "expiry_date" | "card_number";
    label: string;
    options?: string[]; // For document_type selections
  }[];
}

export interface VehiclePart {
  id: string;
  name: string;
  damageValue: number;
  active?: boolean;
}

export type PartStatus = "ok" | "riscado" | "amassado" | "quebrado";

export interface DamageRecord {
  part: string;
  types: ("amassado" | "riscado" | "quebrado")[];
  status?: PartStatus;
  value?: number;
}

export type OperationType = "entrega" | "recolha";
export type FuelLevel = "1/4" | "1/2" | "3/4" | "cheio";

export interface FuelLevelConfig {
  level: FuelLevel;
  label: string;
  penaltyValue: number;
}

export const DEFAULT_FUEL_LEVELS: FuelLevelConfig[] = [
  { level: "1/4", label: "1/4 tanque", penaltyValue: 45 },
  { level: "1/2", label: "1/2 tanque", penaltyValue: 30 },
  { level: "3/4", label: "3/4 tanque", penaltyValue: 15 },
  { level: "cheio", label: "Cheio", penaltyValue: 0 },
];

export interface SecurityMetadata {
  timestamp: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  userAgent: string;
  deviceType: string;
  operatorEmail: string | null;
  operatorName: string | null;
}

export interface MediaFile {
  id: string;
  type: "photo" | "video" | "file";
  name: string;
  dataUrl: string;
  timestamp: string;
}

export interface ChecklistFormData {
  // Driver info
  driverId: string;
  driverName: string;
  driverDocument: string;
  driverContact: string;
  driverEmail: string;
  // Vehicle info
  vehicleId: string;
  plate: string;
  model: string;
  year: string;
  kmInitial: string;
  fuelLevel: FuelLevel;
  operationDate: string;
  // Items
  checkedItems: Record<string, boolean>;
  // Special field values
  specialFieldValues: Record<string, string>;
  // Damages
  damages: DamageRecord[];
  // Return-specific
  missingItems: Record<string, boolean>;
  newDamages: DamageRecord[];
  // Media files keyed by context (e.g., "general", "item_xxx", "damage_xxx")
  mediaFiles: Record<string, MediaFile[]>;
}

export interface ChecklistRecord {
  id: string;
  type: OperationType;
  driverName: string;
  driverId: string;
  driverNif?: string;
  driverAddress?: string;
  driverEmail?: string;
  driverContact?: string;
  plate: string;
  model: string;
  vehicleId: string;
  date: string;
  time: string;
  kmInitial: string;
  fuelLevel: FuelLevel;
  totalPenalty: number;
  checkedItems: Record<string, boolean>;
  specialFieldValues: Record<string, string>;
  damages: DamageRecord[];
  missingItems: Record<string, boolean>;
  newDamages: DamageRecord[];
  companySignature: string | null;
  driverSignature: string | null;
  createdAt: string;
  linkedDeliveryId?: string;
  mediaFiles?: Record<string, MediaFile[]>;
  securityMetadata?: SecurityMetadata;
}

export const DEFAULT_ITEMS: ChecklistItem[] = [
  { 
    id: "doc_carro", name: "Documento do Carro", category: "documentacao", replacementValue: 50, damageValue: 0, required: true,
    specialFields: [
      { type: "document_type", label: "Tipo de Documento", options: ["Documento Único Automóvel (DUA)", "Declaração Aduaneira do Veículo (DAV)", "Cópia do Documento", "Não apresentado"] }
    ]
  },
  { 
    id: "carta_verde", name: "Carta Verde", category: "documentacao", replacementValue: 30, damageValue: 0, required: true,
    specialFields: [
      { type: "expiry_date", label: "Data de Validade" }
    ]
  },
  { 
    id: "inspecao_tvde", name: "Inspeção TVDE", category: "documentacao", replacementValue: 100, damageValue: 0, required: true,
    specialFields: [
      { type: "expiry_date", label: "Data de Validade" }
    ]
  },
  { id: "declaracao_amigavel", name: "Declaração Amigável", category: "documentacao", replacementValue: 5, damageValue: 0, required: true },
  { id: "colete", name: "Colete Refletor", category: "equipamento", replacementValue: 15, damageValue: 10, required: true },
  { id: "triangulo", name: "Triângulo", category: "equipamento", replacementValue: 20, damageValue: 15, required: true },
  { id: "kit_socorros", name: "Kit Primeiros Socorros", category: "equipamento", replacementValue: 25, damageValue: 0, required: true },
  { 
    id: "extintor", name: "Extintor", category: "equipamento", replacementValue: 40, damageValue: 30, required: true,
    specialFields: [
      { type: "expiry_date", label: "Data de Vencimento do Extintor" }
    ]
  },
  { id: "placa_tvde_1", name: "Placa TVDE (frente)", category: "equipamento", replacementValue: 15, damageValue: 10, required: true },
  { id: "placa_tvde_2", name: "Placa TVDE (traseira)", category: "equipamento", replacementValue: 15, damageValue: 10, required: true },
  { id: "placa_nao_fumar_1", name: "Placa Proibido Fumar 1", category: "equipamento", replacementValue: 5, damageValue: 0, required: true },
  { id: "placa_nao_fumar_2", name: "Placa Proibido Fumar 2", category: "equipamento", replacementValue: 5, damageValue: 0, required: true },
  { 
    id: "cartao_abastecimento", name: "Cartão Abastecimento", category: "acessorio", replacementValue: 20, damageValue: 0, required: false,
    specialFields: [
      { type: "card_number", label: "Matrícula do Cartão" }
    ]
  },
  { id: "tampa_malas", name: "Tampa Porta-Malas", category: "acessorio", replacementValue: 150, damageValue: 100, required: false },
  { id: "carregador_eletrico", name: "Carregador Elétrico", category: "acessorio", replacementValue: 80, damageValue: 50, required: false },
  { id: "carregador_tomada", name: "Carregador Tomada", category: "acessorio", replacementValue: 30, damageValue: 20, required: false },
  { id: "compressor_ar", name: "Compressor de Ar", category: "acessorio", replacementValue: 50, damageValue: 35, required: false },
];

export const DEFAULT_VEHICLE_PARTS: VehiclePart[] = [
  { id: "para_choque_dianteiro", name: "Para-choque Dianteiro", damageValue: 300 },
  { id: "capo", name: "Capô", damageValue: 400 },
  { id: "para_lama_de", name: "Para-lama Dianteiro Esquerdo", damageValue: 250 },
  { id: "para_lama_dd", name: "Para-lama Dianteiro Direito", damageValue: 250 },
  { id: "porta_de", name: "Porta Dianteira Esquerda", damageValue: 350 },
  { id: "porta_dd", name: "Porta Dianteira Direita", damageValue: 350 },
  { id: "porta_te", name: "Porta Traseira Esquerda", damageValue: 350 },
  { id: "porta_td", name: "Porta Traseira Direita", damageValue: 350 },
  { id: "para_lama_te", name: "Para-lama Traseiro Esquerdo", damageValue: 250 },
  { id: "para_lama_td", name: "Para-lama Traseiro Direito", damageValue: 250 },
  { id: "para_choque_traseiro", name: "Para-choque Traseiro", damageValue: 300 },
  { id: "porta_malas", name: "Porta-Malas", damageValue: 400 },
  { id: "teto", name: "Teto", damageValue: 500 },
  { id: "para_brisa_d", name: "Para-brisa Dianteiro", damageValue: 350 },
  { id: "para_brisa_t", name: "Para-brisa Traseiro", damageValue: 300 },
  { id: "retrovisor_e", name: "Retrovisor Esquerdo", damageValue: 120 },
  { id: "retrovisor_d", name: "Retrovisor Direito", damageValue: 120 },
  { id: "farol_de", name: "Farol Dianteiro Esquerdo", damageValue: 200 },
  { id: "farol_dd", name: "Farol Dianteiro Direito", damageValue: 200 },
  { id: "lanterna_te", name: "Lanterna Traseira Esquerda", damageValue: 150 },
  { id: "lanterna_td", name: "Lanterna Traseira Direita", damageValue: 150 },
  { id: "jante_de", name: "Jante Dianteira Esquerda", damageValue: 180 },
  { id: "jante_dd", name: "Jante Dianteira Direita", damageValue: 180 },
  { id: "jante_te", name: "Jante Traseira Esquerda", damageValue: 180 },
  { id: "jante_td", name: "Jante Traseira Direita", damageValue: 180 },
];

export const VEHICLE_PARTS = DEFAULT_VEHICLE_PARTS.map(p => p.name);

export const CATEGORY_LABELS: Record<string, string> = {
  documentacao: "Documentação",
  equipamento: "Equipamento Obrigatório",
  acessorio: "Acessório",
  outro: "Outro",
};
