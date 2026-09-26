export interface Tenant {
    id:string;
    nome:string;
    slug:string;
    ativo:boolean;
}

export interface RolePivot {
    id:string;
    tenant_id:string | null;
}

export interface Role {
    id:string;
    codigo:string;
    nome:string;
    pivot?:RolePivot;
}

export interface AuthUser {
    id:string;
    name:string;
    email:string;
    ativo:boolean;
    last_login_at:string | null;
    tenants:Tenant[];
    roles:Role[];
    super_admin:boolean;
    profile?:Record<string,unknown> | null;
}

export interface LoginPayload {
    email:string;
    password:string;
    remember:boolean;
}
