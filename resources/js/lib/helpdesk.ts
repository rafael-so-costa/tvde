import api from "./api";

import type{
    HelpdeskDetail,
    HelpdeskListResponse,
    HelpdeskMeta,
    HelpdeskMode,
    HelpdeskSummary,
}from "../types/helpdesk";

function base(
    mode:HelpdeskMode
){
    return mode==="backoffice"
        ?"/api/backoffice/helpdesk"
        :"/api/helpdesk";
}

export async function fetchHelpdesk(
    mode:HelpdeskMode,
    params:Record<string,unknown>
):Promise<HelpdeskListResponse>{
    const response=await api.get(
        base(mode),
        {params}
    );

    return response.data;
}

export async function fetchHelpdeskSummary(
    mode:HelpdeskMode
):Promise<HelpdeskSummary>{
    const response=await api.get(
        `${base(mode)}/resumo`
    );

    return response.data.data;
}

export async function fetchHelpdeskMeta(
    mode:HelpdeskMode
):Promise<HelpdeskMeta>{
    const response=await api.get(
        `${base(mode)}/meta`
    );

    return response.data.data;
}

export async function fetchHelpdeskTicket(
    mode:HelpdeskMode,
    id:string
):Promise<HelpdeskDetail>{
    const response=await api.get(
        `${base(mode)}/${id}`
    );

    return response.data.data;
}

export async function createHelpdeskTicket(
    payload:{
        type:string;
        category:string;
        priority:string;
        subject:string;
        body:string;
        feature_key:string;
        origin_url:string;
        attachments:File[];
    }
):Promise<HelpdeskDetail>{
    const form=new FormData();

    form.append("type",payload.type);
    form.append(
        "category",
        payload.category
    );
    form.append(
        "priority",
        payload.priority
    );
    form.append(
        "subject",
        payload.subject
    );
    form.append(
        "body",
        payload.body
    );

    if(payload.feature_key){
        form.append(
            "feature_key",
            payload.feature_key
        );
    }

    if(payload.origin_url){
        form.append(
            "origin_url",
            payload.origin_url
        );
    }

    payload.attachments.forEach(
        file=>
            form.append(
                "attachments[]",
                file
            )
    );

    const response=await api.post(
        "/api/helpdesk",
        form
    );

    return response.data.data;
}

export async function sendHelpdeskMessage(
    mode:HelpdeskMode,
    id:string,
    body:string,
    attachments:File[]
):Promise<HelpdeskDetail>{
    const form=new FormData();

    if(body.trim()){
        form.append(
            "body",
            body.trim()
        );
    }

    attachments.forEach(
        file=>
            form.append(
                "attachments[]",
                file
            )
    );

    const response=await api.post(
        `${base(mode)}/${id}/mensagens`,
        form
    );

    return response.data.data;
}

export async function updateHelpdeskTicket(
    id:string,
    payload:Record<string,unknown>
):Promise<HelpdeskDetail>{
    const response=await api.patch(
        `/api/backoffice/helpdesk/${id}`,
        payload
    );

    return response.data.data;
}

export async function closeHelpdeskTicket(
    id:string
):Promise<HelpdeskDetail>{
    const response=await api.post(
        `/api/helpdesk/${id}/fechar`
    );

    return response.data.data;
}

export async function reopenHelpdeskTicket(
    id:string
):Promise<HelpdeskDetail>{
    const response=await api.post(
        `/api/helpdesk/${id}/reabrir`
    );

    return response.data.data;
}

export async function rateHelpdeskTicket(
    id:string,
    rating:number,
    comment:string
){
    const response=await api.post(
        `/api/helpdesk/${id}/avaliacao`,
        {
            rating,
            comment:
                comment.trim()||
                null,
        }
    );

    return response.data.data;
}
