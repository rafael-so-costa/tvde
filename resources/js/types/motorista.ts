export type MotoristaStatus =
    | 'pendente'
    | 'ativo'
    | 'incompleto'
    | 'inativo';

export type MotoristaEstadoCivil =
    | 'solteiro'
    | 'casado'
    | 'divorciado'
    | 'viuvo'
    | 'uniao_facto';

export type MotoristaTipoDocumento =
    | 'passaporte'
    | 'titulo_residencia'
    | 'cartao_cidadao';

export interface Motorista {
    id: string;
    tenant_id: string;
    user_id: string | null;
    nome_completo: string;
    data_nascimento: string | null;
    filhos: number | null;
    estado_civil: MotoristaEstadoCivil | null;
    tipo_documento: MotoristaTipoDocumento | null;
    numero_documento: string | null;
    documento_valid_until: string | null;
    carta_numero: string | null;
    carta_valid_until: string | null;
    registo_criminal_valid_until: string | null;
    nif: string | null;
    email: string | null;
    telemovel: string | null;
    endereco: string | null;
    endereco_rua: string | null;
    endereco_numero: string | null;
    endereco_complemento: string | null;
    endereco_cidade: string | null;
    endereco_cep: string | null;
    iban: string | null;
    foto_perfil_url: string | null;
    fotos_galeria: string[];
    bolt_email: string | null;
    bolt_telemovel: string | null;
    uber_email: string | null;
    uber_telemovel: string | null;
    certificado_tvde: string | null;
    certificado_tvde_valid_until: string | null;
    cartao_frota: string | null;
    contato_urgencia_nome: string | null;
    contato_urgencia_telemovel: string | null;
    documentos_upload: {
        url: string;
        tipo: string;
        nome_arquivo: string;
        data_validade: string | null;
    }[];
    ativo: boolean;
    status_cadastro: MotoristaStatus;
    created_at: string;
    updated_at: string;
}

export interface MotoristaPayload {
    nome_completo: string;
    data_nascimento: string | null;
    filhos: number | null;
    estado_civil: MotoristaEstadoCivil | null;
    tipo_documento: MotoristaTipoDocumento | null;
    numero_documento: string | null;
    documento_valid_until: string | null;
    carta_numero: string | null;
    carta_valid_until: string | null;
    registo_criminal_valid_until: string | null;
    nif: string | null;
    email: string | null;
    telemovel: string | null;
    endereco_rua: string | null;
    endereco_numero: string | null;
    endereco_complemento: string | null;
    endereco_cidade: string | null;
    endereco_cep: string | null;
    iban: string | null;
    foto_perfil_url: string | null;
    bolt_email: string | null;
    bolt_telemovel: string | null;
    uber_email: string | null;
    uber_telemovel: string | null;
    certificado_tvde: string | null;
    certificado_tvde_valid_until: string | null;
    cartao_frota: string | null;
    contato_urgencia_nome: string | null;
    contato_urgencia_telemovel: string | null;
}
