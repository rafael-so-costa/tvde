export type FuncionarioEstado=
    | "ativo"
    | "inativo"
    | "suspenso"
    | "desligado";

export type PermissionLevel=
    | "nenhum"
    | "visualizar"
    | "configurar";

export interface FuncionarioInvitation {
    id:string;
    expires_at:string | null;
    sent_at:string | null;
}

export interface FuncionarioAccess {
    linked:boolean;
    user_id:string | null;
    user_email:string | null;
    global_active:boolean | null;
    tenant_status:string | null;
    last_login_at:string | null;

    pending_invitation:
        FuncionarioInvitation | null;
}

export interface Funcionario {
    id:string;
    numero_funcionario:string | null;
    nome:string;
    nif:string | null;
    email:string | null;
    telefone:string | null;
    data_nascimento:string | null;
    cargo:string | null;
    departamento:string | null;
    data_admissao:string;
    data_saida:string | null;
    estado:FuncionarioEstado;
    observacoes:string | null;
    access:FuncionarioAccess;
    created_at:string | null;
    updated_at:string | null;
}

export interface FuncionarioPayload {
    numero_funcionario:string | null;
    nome:string;
    nif:string | null;
    email:string | null;
    telefone:string | null;
    data_nascimento:string | null;
    cargo:string | null;
    departamento:string | null;
    data_admissao:string | null;
    observacoes:string | null;
}

export interface FuncionarioPermission {
    id:string;
    codigo:string;
    modulo:string;
    nome:string;
    descricao:string | null;

    nivel_direto:
        PermissionLevel | null;

    nivel_efetivo:
        PermissionLevel;
}
