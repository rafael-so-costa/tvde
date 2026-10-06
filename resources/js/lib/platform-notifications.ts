import api from "./api";

import type{
    PlatformNotification,
    PlatformNotificationMeta,
}from "../types/platform-notification";

export async function fetchPlatformNotificationMeta():
    Promise<PlatformNotificationMeta>
{
    const response=
        await api.get(
            "/api/backoffice/notificacoes/meta"
        );

    return response.data.data;
}

export async function fetchPlatformNotificationSummary(){
    const response=
        await api.get(
            "/api/backoffice/notificacoes/resumo"
        );

    return response.data.data;
}

export async function fetchPlatformNotifications(
    params:Record<string,unknown>
){
    const response=
        await api.get(
            "/api/backoffice/notificacoes",
            {
                params,
            }
        );

    return response.data;
}

export async function fetchPlatformNotification(
    id:string
):Promise<PlatformNotification>{
    const response=
        await api.get(
            `/api/backoffice/notificacoes/${id}`
        );

    return response.data.data;
}

export async function savePlatformNotification(
    id:string|null,
    data:Record<string,unknown>
):Promise<PlatformNotification>{
    const response=
        id
            ?await api.patch(
                `/api/backoffice/notificacoes/${id}`,
                data
            )
            :await api.post(
                "/api/backoffice/notificacoes",
                data
            );

    return response.data.data;
}

export async function resolvePlatformNotification(
    id:string
){
    const response=
        await api.post(
            `/api/backoffice/notificacoes/${id}/resolver`
        );

    return response.data.data;
}

export async function deletePlatformNotification(
    id:string
){
    await api.delete(
        `/api/backoffice/notificacoes/${id}`
    );
}
