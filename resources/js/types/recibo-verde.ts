export type ReciboVerdeStatus =
    | 'pendente_validacao'
    | 'validado'
    | 'rejeitado';

export interface ReciboVerdeAviso {
    codigo: string;
    campo: string;
    mensagem: string;
    valor_calculado?: string;
}

export interface ReciboVerdeMotorista {
    id: string;
    nome_completo: string;
    nif: string | null;
    email: string | null;
    telemovel: string | null;
    user_id: string | null;
}

export interface ReciboVerdeEmpresa {
    id: string;
    nome_empresa: string;
    nif: string;
}

export interface ReciboVerdeUser {
    id: string;
    name: string;
}

export interface ReciboVerdeDadosExtraidos {
    texto?: string | null;
    metodo?: string | null;
    confianca?: Record<string, number>;
}

export interface ReciboVerde {
    id: string;
    tenant_id: string;
    empresa_id: string | null;
    motorista_id: string;

    numero_documento: string;
    data_emissao: string;
    ano: number;
    mes: number;

    nif_emitente: string;
    nome_emitente: string | null;

    nif_adquirente: string;
    nome_adquirente: string | null;

    valor_base: string;
    valor_iva: string;
    retencao_irs: string;
    valor_total: string;

    arquivo_nome: string;
    arquivo_mime: string;
    arquivo_tamanho: number;
    hash_arquivo: string;

    status: ReciboVerdeStatus;

    dados_extraidos:
        | ReciboVerdeDadosExtraidos
        | null;

    avisos_validacao:
        | ReciboVerdeAviso[]
        | null;

    observacoes_empresa:
        | string
        | null;

    validado_em: string | null;
    rejeitado_em: string | null;

    created_at: string;
    updated_at: string;

    motorista?: ReciboVerdeMotorista;
    empresa?: ReciboVerdeEmpresa | null;

    created_by?: ReciboVerdeUser | null;
    validado_por?: ReciboVerdeUser | null;
    rejeitado_por?: ReciboVerdeUser | null;

    createdBy?: ReciboVerdeUser | null;
    validadoPor?: ReciboVerdeUser | null;
    rejeitadoPor?: ReciboVerdeUser | null;
}
