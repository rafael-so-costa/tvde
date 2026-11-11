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
    privacidade_contacto_email?: string | null;
    privacidade_contacto_telefone?: string | null;
    privacidade_epd_nome?: string | null;
    privacidade_epd_email?: string | null;
    privacidade_destinatarios?: string | null;
    privacidade_subcontratantes?: string | null;
    privacidade_prazo_identificacao?: string | null;
    privacidade_prazo_contratos?: string | null;
    privacidade_prazo_fiscal?: string | null;
    privacidade_prazo_operacional?: string | null;
    privacidade_prazo_consentimentos?: string | null;
    privacidade_prazo_localizacao?: string | null;
    privacidade_transferencias_internacionais?: string | null;
    privacidade_decisoes_automatizadas?: string | null;
    privacidade_finalidade_localizacao?: string | null;
    privacidade_finalidade_dados_especiais?: string | null;
    privacidade_categorias_dados_especiais?: string | null;
    privacidade_condicao_artigo9?: string | null;
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
    privacidade_contacto_email?: string | null;
    privacidade_contacto_telefone?: string | null;
    privacidade_epd_nome?: string | null;
    privacidade_epd_email?: string | null;
    privacidade_destinatarios?: string | null;
    privacidade_subcontratantes?: string | null;
    privacidade_prazo_identificacao?: string | null;
    privacidade_prazo_contratos?: string | null;
    privacidade_prazo_fiscal?: string | null;
    privacidade_prazo_operacional?: string | null;
    privacidade_prazo_consentimentos?: string | null;
    privacidade_prazo_localizacao?: string | null;
    privacidade_transferencias_internacionais?: string | null;
    privacidade_decisoes_automatizadas?: string | null;
    privacidade_finalidade_localizacao?: string | null;
    privacidade_finalidade_dados_especiais?: string | null;
    privacidade_categorias_dados_especiais?: string | null;
    privacidade_condicao_artigo9?: string | null;
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


export interface EmpresaListMeta {
    multi_company_enabled: boolean;
    can_create: boolean;
    can_delete: boolean;
    rgpd_privacidade_disponivel?: boolean;
}

export interface EmpresaListResponse {
    data: Empresa[];
    meta: EmpresaListMeta;
}
