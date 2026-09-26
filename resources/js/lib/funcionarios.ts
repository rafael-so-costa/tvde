import api from "./api";

import type {
    Funcionario,
    FuncionarioPayload,
    FuncionarioPermission,
    FuncionarioEstado,
    PermissionLevel,
} from "../types/funcionario";

export async function fetchFuncionarios(){
    const response=
        await api.get(
            "/api/funcionarios"
        );

    return response.data as {
        data:Funcionario[];

        meta:{
            current_page:number;
            last_page:number;
            per_page:number;
            total:number;
            can_manage_permissions:
                boolean;
        };
    };
}

export async function createFuncionario(
    payload:FuncionarioPayload,
){
    const response=
        await api.post(
            "/api/funcionarios",
            payload
        );

    return response.data
        .data as Funcionario;
}

export async function updateFuncionario(
    id:string,
    payload:FuncionarioPayload,
){
    const response=
        await api.patch(
            `/api/funcionarios/${id}`,
            payload
        );

    return response.data
        .data as Funcionario;
}

export async function updateFuncionarioEstado(
    id:string,
    estado:FuncionarioEstado,
    data_saida?:string | null,
){
    await api.patch(
        `/api/funcionarios/${id}/estado`,
        {
            estado,
            data_saida:
                data_saida ??
                null,
        }
    );
}

export async function provisionFuncionarioAccess(
    id:string,
    confirmExisting=false,
){
    const response=
        await api.post(
            `/api/funcionarios/${id}/acesso`,
            {
                confirm_existing_user:
                    confirmExisting,
            }
        );

    return response.data;
}

export async function resendFuncionarioInvite(
    id:string,
){
    return api.post(
        `/api/funcionarios/${id}/acesso/reenviar`
    );
}

export async function updateFuncionarioAccess(
    id:string,
    ativo:boolean,
){
    return api.patch(
        `/api/funcionarios/${id}/acesso`,
        {
            ativo,
        }
    );
}

export async function fetchFuncionarioPermissions(
    id:string,
){
    const response=
        await api.get(
            `/api/funcionarios/${id}/permissoes`
        );

    return response.data
        .data as FuncionarioPermission[];
}

export async function saveFuncionarioPermissions(
    id:string,
    permissions:Record<
        string,
        PermissionLevel | null
    >,
){
    return api.put(
        `/api/funcionarios/${id}/permissoes`,
        {
            permissions,
        }
    );
}
