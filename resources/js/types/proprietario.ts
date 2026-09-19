export type ProprietarioTipo =
    | 'pessoa_fisica'
    | 'empresa';

export type ProprietarioStatus =
    | 'pendente'
    | 'ativo'
    | 'incompleto'
    | 'inativo';

export type EstadoCivil =
    | 'solteiro'
    | 'casado'
    | 'divorciado'
    | 'viuvo'
    | 'uniao_facto';

export type TipoDocumento =
    | 'passaporte'
    | 'titulo_residencia'
    | 'cartao_cidadao';

export interface Proprietario {
    id: string;
    tenant_id: string;
    user_id: string | null;
    tipo: ProprietarioTipo;
    nome_completo: string | null;
    data_nascimento: string | null;
    filhos: number;
    estado_civil: EstadoCivil | null;
    tipo_documento: TipoDocumento | null;
    numero_documento: string | null;
    documento_valid_until: string | null;
    nome_empresa: string | null;
    nif: string | null;
    iban: string | null;
    certidao_permanente: string | null;
    certidao_valid_until: string | null;
    certificado_tvde: string | null;
    certificado_tvde_valid_until: string | null;
    capital_social: string | null;
    nome_gerente: string | null;
    email: string | null;
    telemovel: string | null;
    endereco: string | null;
    endereco_rua: string | null;
    endereco_numero: string | null;
    endereco_complemento: string | null;
    endereco_cidade: string | null;
    endereco_cep: string | null;
    foto_perfil_url: string | null;
    fotos_galeria: string[];
    cartao_frota: string | null;
    ativo: boolean;
    status_cadastro: ProprietarioStatus;
    created_at: string;
    updated_at: string;
}

export interface ProprietarioPayload {
    tipo: ProprietarioTipo;
    nome_completo: string | null;
    nome_empresa: string | null;
    nif: string | null;
    email: string | null;
    telemovel: string | null;
    data_nascimento: string | null;
    filhos: number;
    estado_civil: EstadoCivil | null;
    tipo_documento: TipoDocumento | null;
    numero_documento: string | null;
    documento_valid_until: string | null;
    iban: string | null;
    certidao_permanente: string | null;
    certidao_valid_until: string | null;
    certificado_tvde: string | null;
    certificado_tvde_valid_until: string | null;
    capital_social: number | null;
    nome_gerente: string | null;
    endereco_rua: string | null;
    endereco_numero: string | null;
    endereco_complemento: string | null;
    endereco_cidade: string | null;
    endereco_cep: string | null;
    foto_perfil_url: string | null;
    cartao_frota: string | null;
}
