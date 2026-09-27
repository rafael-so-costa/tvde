import api from "./api";

export type PortalAreaCode=
    |"gestao"
    |"motorista"
    |"proprietario";

export interface PortalArea {
    code:PortalAreaCode;
    label:string;
    path:string;
}

export interface PortalLink {
    has_role:boolean;
    linked:boolean;
    id:string|null;
    ativo:boolean|null;
    status_cadastro:string|null;
}

export interface ProprietarioPortalLink
    extends PortalLink {
    tipo:string|null;
}

export interface PortalIdentity {
    tenant_id:string|null;
    roles:string[];

    links:{
        motorista:PortalLink;
        proprietario:ProprietarioPortalLink;
    };

    areas:PortalArea[];

    default_area:
        PortalAreaCode|null;

    default_path:
        string|null;
}

export async function getPortalIdentity():
Promise<PortalIdentity>{
    const response=
        await api.get(
            "/api/portal/identity"
        );

    return response.data
        .data as PortalIdentity;
}

export async function resolvePortalDestination(
    fallback="/"
):Promise<string>{
    try{
        const identity=
            await getPortalIdentity();

        return identity
            .default_path ??
            fallback;
    }catch{
        return fallback;
    }
}
