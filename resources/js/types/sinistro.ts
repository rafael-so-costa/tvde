export type SinistroStatus=
    |'aberto'
    |'em_andamento'
    |'encerrado';

export type SinistroDocumentoTipo=
    |'declaracao_amigavel'
    |'folha_peritagem'
    |'foto_acidente'
    |'boletim_ocorrencia'
    |'outro';

export interface SinistroDocumento {
    id:string;
    tenant_id:string;
    sinistro_id:string;
    tipo:SinistroDocumentoTipo;
    arquivo_nome:string;
    arquivo_path:string;
    arquivo_mime:string;
    arquivo_tamanho:number;
    hash_arquivo:string;
    created_by:string|null;
    created_at:string;
    updated_at:string;
}

export interface SinistroVeiculo {
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

export interface SinistroMotorista {
    id:string;
    nome_completo:string;
    nif:string|null;
    email:string|null;
    user_id:string|null;
}

export interface Sinistro {
    id:string;
    tenant_id:string;
    veiculo_id:string;
    motorista_id:string|null;
    data_sinistro:string;
    status:SinistroStatus;
    data_peritagem:string|null;
    peritagem_realizada:boolean;
    seguradora:string|null;
    apolice:string|null;
    numero_processo:string|null;
    itens_danificados:string[];
    descricao:string|null;
    teve_testemunha:boolean;
    nome_testemunha:string|null;
    telemovel_testemunha:string|null;
    created_by:string|null;
    updated_by:string|null;
    created_at:string;
    updated_at:string;
    veiculo?:SinistroVeiculo|null;
    motorista?:SinistroMotorista|null;
    documentos?:SinistroDocumento[];
}

export interface SinistroPayload {
    veiculo_id:string;
    motorista_id:string|null;
    data_sinistro:string;
    status:SinistroStatus;
    data_peritagem:string|null;
    peritagem_realizada:boolean;
    seguradora:string|null;
    apolice:string|null;
    numero_processo:string|null;
    itens_danificados:string[];
    descricao:string|null;
    teve_testemunha:boolean;
    nome_testemunha:string|null;
    telemovel_testemunha:string|null;
}
