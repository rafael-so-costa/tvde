import api from "./api";

export type ChatMode="tenant"|"backoffice";

export interface ChatAttachment{
    id:string;
    kind:"image"|"pdf";
    name:string;
    mime:string;
    size:number;
    url:string;
    download_url:string;
}

export interface ChatUser{
    id:string;
    name:string;
    email:string;
}

export interface ChatMessage{
    id:string;
    body:string|null;
    kind:string;
    sent_at:string;
    sender:ChatUser|null;
    attachments:ChatAttachment[];
}

export interface ChatConversation{
    id:string;
    tenant_id:string|null;
    source:"saas"|"tenant";
    type:"direct"|"broadcast";
    audience:string|null;
    subject:string;
    reply_enabled:boolean;
    status:string;
    last_message_at:string|null;
    created_at:string|null;
    unread_count:number;
    participants:Array<ChatUser&{
        role:string|null;
        last_read_at:string|null;
    }>;
    last_message?:ChatMessage|null;
    messages?:ChatMessage[];
}

export interface ChatRecipient{
    id:string;
    name:string;
    email:string;
    roles:string[];
}

export function chatBase(mode:ChatMode){
    return mode==="backoffice"
        ?"/api/backoffice/chat"
        :"/api/chat";
}

export async function fetchChat(mode:ChatMode,page=1){
    const {data}=await api.get(
        chatBase(mode),
        {params:{page}},
    );

    return data;
}

export async function fetchChatConversation(
    mode:ChatMode,
    id:string,
){
    const {data}=await api.get(
        `${chatBase(mode)}/${id}`,
    );

    return data.data as ChatConversation;
}

export async function fetchChatSummary(mode:ChatMode){
    const {data}=await api.get(
        `${chatBase(mode)}/resumo`,
    );

    return data as {unread:number};
}

export async function fetchChatRecipients(
    mode:ChatMode,
    search="",
){
    const {data}=await api.get(
        `${chatBase(mode)}/destinatarios`,
        {params:{search}},
    );

    return data.data;
}

export async function createChatConversation(
    mode:ChatMode,
    payload:{
        type:"direct"|"broadcast";
        subject:string;
        audience?:string;
        recipient_ids?:string[];
        body?:string;
        attachments?:File[];
    },
){
    const form=new FormData();

    form.append("type",payload.type);
    form.append("subject",payload.subject);

    if(payload.audience){
        form.append(
            "audience",
            payload.audience,
        );
    }

    payload.recipient_ids?.forEach(
        id=>form.append(
            "recipient_ids[]",
            id,
        ),
    );

    if(payload.body){
        form.append(
            "body",
            payload.body,
        );
    }

    payload.attachments?.forEach(
        file=>form.append(
            "attachments[]",
            file,
        ),
    );

    const {data}=await api.post(
        chatBase(mode),
        form,
    );

    return data.data as ChatConversation;
}

export async function sendChatMessage(
    mode:ChatMode,
    conversationId:string,
    body:string,
    attachments:File[],
){
    const form=new FormData();

    if(body){
        form.append("body",body);
    }

    attachments.forEach(
        file=>form.append(
            "attachments[]",
            file,
        ),
    );

    const {data}=await api.post(
        `${chatBase(mode)}/${conversationId}/mensagens`,
        form,
    );

    return data.data as ChatMessage;
}
