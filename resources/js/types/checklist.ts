export type ChecklistTipo =
    | 'entrega'
    | 'recolha';

export type ChecklistEstado =
    | 'rascunho'
    | 'finalizado';

export type FuelLevel =
    | '1/4'
    | '1/2'
    | '3/4'
    | 'cheio';

export type DamageType =
    | 'amassado'
    | 'riscado'
    | 'quebrado';

export type PartStatus =
    | 'ok'
    | 'riscado'
    | 'amassado'
    | 'quebrado';

export interface ChecklistItemDefinition {
    id: string;
    name: string;
    category:
        | 'documentacao'
        | 'equipamento'
        | 'acessorio';
    replacementValue: number;
    required: boolean;
    specialField?: {
        key: string;
        label: string;
        type: 'text' | 'date';
    };
}

export interface VehiclePartDefinition {
    id: string;
    name: string;
    damageValue: number;
}

export interface DamageRecord {
    part: string;
    types: DamageType[];
    status?: PartStatus | null;
    value?: number | null;
}

export interface ChecklistMotorista {
    id: string;
    nome_completo: string;
}

export interface ChecklistVeiculo {
    id: string;
    matricula: string;
    marca: string;
    modelo: string;
}

export interface ChecklistRecord {
    id: string;
    tenant_id: string;
    tipo: ChecklistTipo;

    motorista_id: string | null;
    veiculo_id: string | null;
    entrega_vinculada_id: string | null;

    motorista_nome_snapshot: string | null;
    matricula_snapshot: string | null;
    modelo_snapshot: string | null;

    data_operacao: string | null;
    hora_operacao: string | null;

    quilometragem: number | null;
    nivel_combustivel: FuelLevel | null;

    penalizacao_total: string | number;

    itens: Record<string, boolean>;
    campos_especiais: Record<string, string>;
    danos: DamageRecord[];
    itens_faltantes: Record<string, boolean>;
    novos_danos: DamageRecord[];

    media: Record<string, unknown[]>;
    metadados_seguranca:
        | Record<string, unknown>
        | null;

    assinatura_empresa_path: string | null;
    assinatura_motorista_path: string | null;

    observacoes: string | null;

    estado: ChecklistEstado;
    finalizado_em: string | null;
    realizado_por: string | null;

    motorista?: ChecklistMotorista | null;
    veiculo?: ChecklistVeiculo | null;

    entrega_vinculada?: ChecklistRecord | null;
    recolha?: ChecklistRecord | null;

    created_at: string;
    updated_at: string;
}

export interface ChecklistPayload {
    tipo: ChecklistTipo;
    motorista_id: string;
    veiculo_id: string;
    entrega_vinculada_id?: string | null;

    data_operacao: string;
    hora_operacao: string | null;

    quilometragem: number;
    nivel_combustivel: FuelLevel;

    penalizacao_total?: number;

    itens?: Record<string, boolean>;
    campos_especiais?: Record<string, string>;
    danos?: DamageRecord[];

    itens_faltantes?: Record<string, boolean>;
    novos_danos?: DamageRecord[];

    observacoes?: string | null;
}

export const CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
    {
        id: 'doc_carro',
        name: 'Documento do Carro',
        category: 'documentacao',
        replacementValue: 50,
        required: true,
        specialField: {
            key: 'doc_carro_tipo',
            label: 'Tipo de documento',
            type: 'text',
        },
    },
    {
        id: 'carta_verde',
        name: 'Carta Verde',
        category: 'documentacao',
        replacementValue: 30,
        required: true,
        specialField: {
            key: 'carta_verde_validade',
            label: 'Validade',
            type: 'date',
        },
    },
    {
        id: 'inspecao_tvde',
        name: 'Inspeção TVDE',
        category: 'documentacao',
        replacementValue: 100,
        required: true,
        specialField: {
            key: 'inspecao_tvde_validade',
            label: 'Validade',
            type: 'date',
        },
    },
    {
        id: 'declaracao_amigavel',
        name: 'Declaração Amigável',
        category: 'documentacao',
        replacementValue: 5,
        required: true,
    },
    {
        id: 'colete',
        name: 'Colete Refletor',
        category: 'equipamento',
        replacementValue: 15,
        required: true,
    },
    {
        id: 'triangulo',
        name: 'Triângulo',
        category: 'equipamento',
        replacementValue: 20,
        required: true,
    },
    {
        id: 'kit_socorros',
        name: 'Kit Primeiros Socorros',
        category: 'equipamento',
        replacementValue: 25,
        required: true,
    },
    {
        id: 'extintor',
        name: 'Extintor',
        category: 'equipamento',
        replacementValue: 40,
        required: true,
        specialField: {
            key: 'extintor_validade',
            label: 'Validade',
            type: 'date',
        },
    },
    {
        id: 'placa_tvde_1',
        name: 'Placa TVDE — frente',
        category: 'equipamento',
        replacementValue: 15,
        required: true,
    },
    {
        id: 'placa_tvde_2',
        name: 'Placa TVDE — traseira',
        category: 'equipamento',
        replacementValue: 15,
        required: true,
    },
    {
        id: 'placa_nao_fumar_1',
        name: 'Placa Proibido Fumar 1',
        category: 'equipamento',
        replacementValue: 5,
        required: true,
    },
    {
        id: 'placa_nao_fumar_2',
        name: 'Placa Proibido Fumar 2',
        category: 'equipamento',
        replacementValue: 5,
        required: true,
    },
    {
        id: 'cartao_abastecimento',
        name: 'Cartão de Abastecimento',
        category: 'acessorio',
        replacementValue: 20,
        required: false,
        specialField: {
            key: 'cartao_abastecimento_numero',
            label: 'Número / matrícula',
            type: 'text',
        },
    },
    {
        id: 'tampa_malas',
        name: 'Tampa Porta-Malas',
        category: 'acessorio',
        replacementValue: 150,
        required: false,
    },
    {
        id: 'carregador_eletrico',
        name: 'Carregador Elétrico',
        category: 'acessorio',
        replacementValue: 80,
        required: false,
    },
    {
        id: 'carregador_tomada',
        name: 'Carregador de Tomada',
        category: 'acessorio',
        replacementValue: 30,
        required: false,
    },
    {
        id: 'compressor_ar',
        name: 'Compressor de Ar',
        category: 'acessorio',
        replacementValue: 50,
        required: false,
    },
];

export const VEHICLE_PARTS: VehiclePartDefinition[] = [
    {
        id: 'para_choque_dianteiro',
        name: 'Para-choque Dianteiro',
        damageValue: 300,
    },
    {
        id: 'capo',
        name: 'Capô',
        damageValue: 400,
    },
    {
        id: 'para_lama_de',
        name: 'Para-lama Dianteiro Esquerdo',
        damageValue: 250,
    },
    {
        id: 'para_lama_dd',
        name: 'Para-lama Dianteiro Direito',
        damageValue: 250,
    },
    {
        id: 'porta_de',
        name: 'Porta Dianteira Esquerda',
        damageValue: 350,
    },
    {
        id: 'porta_dd',
        name: 'Porta Dianteira Direita',
        damageValue: 350,
    },
    {
        id: 'porta_te',
        name: 'Porta Traseira Esquerda',
        damageValue: 350,
    },
    {
        id: 'porta_td',
        name: 'Porta Traseira Direita',
        damageValue: 350,
    },
    {
        id: 'para_lama_te',
        name: 'Para-lama Traseiro Esquerdo',
        damageValue: 250,
    },
    {
        id: 'para_lama_td',
        name: 'Para-lama Traseiro Direito',
        damageValue: 250,
    },
    {
        id: 'para_choque_traseiro',
        name: 'Para-choque Traseiro',
        damageValue: 300,
    },
    {
        id: 'porta_malas',
        name: 'Porta-Malas',
        damageValue: 400,
    },
    {
        id: 'teto',
        name: 'Teto',
        damageValue: 500,
    },
    {
        id: 'para_brisa_d',
        name: 'Para-brisa Dianteiro',
        damageValue: 350,
    },
    {
        id: 'para_brisa_t',
        name: 'Para-brisa Traseiro',
        damageValue: 300,
    },
    {
        id: 'retrovisor_e',
        name: 'Retrovisor Esquerdo',
        damageValue: 120,
    },
    {
        id: 'retrovisor_d',
        name: 'Retrovisor Direito',
        damageValue: 120,
    },
    {
        id: 'farol_de',
        name: 'Farol Dianteiro Esquerdo',
        damageValue: 200,
    },
    {
        id: 'farol_dd',
        name: 'Farol Dianteiro Direito',
        damageValue: 200,
    },
    {
        id: 'lanterna_te',
        name: 'Lanterna Traseira Esquerda',
        damageValue: 150,
    },
    {
        id: 'lanterna_td',
        name: 'Lanterna Traseira Direita',
        damageValue: 150,
    },
    {
        id: 'jante_de',
        name: 'Jante Dianteira Esquerda',
        damageValue: 180,
    },
    {
        id: 'jante_dd',
        name: 'Jante Dianteira Direita',
        damageValue: 180,
    },
    {
        id: 'jante_te',
        name: 'Jante Traseira Esquerda',
        damageValue: 180,
    },
    {
        id: 'jante_td',
        name: 'Jante Traseira Direita',
        damageValue: 180,
    },
];

export const CATEGORY_LABELS = {
    documentacao: 'Documentação',
    equipamento: 'Equipamento obrigatório',
    acessorio: 'Acessórios',
};
