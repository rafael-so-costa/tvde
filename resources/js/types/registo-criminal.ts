import type { Motorista } from './motorista';

export type RegistoCriminalStatus =
    | 'pendente_validacao'
    | 'validado'
    | 'rejeitado';

export type RegistoCriminalValidade =
    | 'valido'
    | 'a_expirar'
    | 'expirado';

export interface RegistoCriminalDadosExtraidos {
    texto?: string | null;
    nome_titular?: string | null;
    codigo_consulta?: string | null;
    data_emissao?: string | null;
    data_validade?: string | null;
    confianca?: Record<string, number>;
}

export interface RegistoCriminal {
    id: string;
    tenant_id: string;
    motorista_id: string;
    codigo_consulta: string | null;
    data_emissao: string | null;
    data_validade: string;
    arquivo_nome: string;
    arquivo_mime: string;
    arquivo_tamanho: number;
    hash_arquivo: string;
    status: RegistoCriminalStatus;
    situacao_validade: RegistoCriminalValidade;
    dias_restantes: number;
    dados_extraidos: RegistoCriminalDadosExtraidos | null;
    observacoes_empresa: string | null;
    validado_em: string | null;
    rejeitado_em: string | null;
    created_at: string;
    updated_at: string;
    motorista?: Pick<
        Motorista,
        | 'id'
        | 'nome_completo'
        | 'nif'
        | 'email'
        | 'telemovel'
        | 'registo_criminal_valid_until'
        | 'user_id'
    >;
}
