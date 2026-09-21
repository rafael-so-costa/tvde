export type MultaTipo=
    |'excesso_velocidade'
    |'estacionamento'
    |'avanco_sinal'
    |'outro';

export type MultaStatus=
    |'pendente'
    |'paga'
    |'contestada';

export type MultaDocumentoTipo=
    |'comprovativo_transferencia_motorista'
    |'folha_multa'
    |'comprovativo_envio_correio'
    |'outro';

export interface MultaDocumento {
    id:string;
    tenant_id:string;
    multa_id:string;
    tipo:MultaDocumentoTipo;
    arquivo_nome:string;
    arquivo_path:string;
    arquivo_mime:string;
    arquivo_tamanho:number;
    hash_arquivo:string;
    created_by:string|null;
    created_at:string;
    updated_at:string;
    created_by_user?:{
        id:string;
        name:string;
    }|null;
}

export interface MultaVeiculo {
    id:string;
    proprietario_id:string|null;
    matricula:string;
    marca:string|null;
    modelo:string|null;
    proprietario?:{
        id:string;
        tipo:string;
        nome_completo:string|null;
        nome_empresa:string|null;
        user_id:string|null;
    }|null;
}

export interface MultaMotorista {
    id:string;
    nome_completo:string;
    nif:string|null;
    email:string|null;
    user_id:string|null;
}

export interface Multa {
    id:string;
    tenant_id:string;
    veiculo_id:string;
    motorista_id:string|null;
    numero_notificacao:string|null;
    data_multa:string;
    tipo:MultaTipo;
    valor:string;
    status:MultaStatus;
    localizacao:string|null;
    descricao:string|null;
    created_by:string|null;
    updated_by:string|null;
    created_at:string;
    updated_at:string;
    veiculo?:MultaVeiculo|null;
    motorista?:MultaMotorista|null;
    documentos?:MultaDocumento[];
    created_by_user?:{
        id:string;
        name:string;
    }|null;
    updated_by_user?:{
        id:string;
        name:string;
    }|null;
}

export interface MultaPayload {
    veiculo_id:string;
    motorista_id:string|null;
    numero_notificacao:string|null;
    data_multa:string;
    tipo:MultaTipo;
    valor:number;
    status:MultaStatus;
    localizacao:string|null;
    descricao:string|null;
}
