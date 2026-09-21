export type ExpedienteTipo='entrada'|'saida';
export type ExpedienteOrigem='app'|'publico';

export interface ExpedienteMotorista {
    id:string;
    nome_completo:string;
    nif:string|null;
    email?:string|null;
    telemovel?:string|null;
    user_id?:string|null;
}

export interface ExpedienteCorretor {
    id:string;
    name:string;
}

export interface RegistoExpediente {
    id:string;
    tenant_id:string;
    motorista_id:string;
    data_hora:string;
    tipo:ExpedienteTipo;
    data_local:string;
    origem:ExpedienteOrigem;
    ip_address:string|null;
    user_agent:string|null;
    corrigido:boolean;
    corrigido_por:string|null;
    corrigido_em:string|null;
    observacoes_correcao:string|null;
    created_at:string;
    updated_at:string;
    motorista?:ExpedienteMotorista|null;
    corrigido_por_user?:ExpedienteCorretor|null;
    corrigido_por_relacao?:ExpedienteCorretor|null;
    corrigido_por_data?:ExpedienteCorretor|null;
    corrigidoPor?:ExpedienteCorretor|null;
}

export interface ExpedienteEstado {
    motorista_id:string;
    em_servico:boolean;
    desde:string|null;
    ultimo_registo:RegistoExpediente|null;
    registos_hoje:number;
}

export interface ExpedienteEstatistica {
    motorista_id:string;
    nome_completo:string;
    nif:string|null;
    ativo:boolean;
    segundos_trabalhados:number;
    dias_online:number;
    media_diaria_segundos:number;
    ultimo_registo:string|null;
    em_servico:boolean;
}
