export type EmpresaStatus =
    | 'pendente'
    | 'ativo'
    | 'incompleto'
    | 'inativo';

export interface Empresa {
    id: string;
    tenant_id: string;
    nome_empresa: string;
    nif: string;
    email: string | null;
    telemovel: string | null;
    nome_gerente: string | null;
    endereco_rua: string | null;
    endereco_numero: string | null;
    endereco_complemento: string | null;
    endereco_cep: string | null;
    endereco_cidade: string | null;
    iban: string | null;
    capital_social: string | null;
    certificado_tvde: string | null;
    certificado_tvde_valid_until: string | null;
    logo_url: string | null;
    ativo: boolean;
    status_cadastro: EmpresaStatus;
    created_at: string;
    updated_at: string;
}

export interface EmpresaPayload {
    nome_empresa: string;
    nif: string;
    email: string | null;
    telemovel: string | null;
    nome_gerente: string | null;
    endereco_rua: string | null;
    endereco_numero: string | null;
    endereco_complemento: string | null;
    endereco_cep: string | null;
    endereco_cidade: string | null;
    iban: string | null;
    capital_social: number | null;
    certificado_tvde: string | null;
    certificado_tvde_valid_until: string | null;
    logo_url: string | null;
    ativo: boolean;
    status_cadastro: EmpresaStatus;
}
