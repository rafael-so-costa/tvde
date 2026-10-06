export type HelpdeskMode=
    |"tenant"
    |"backoffice";

export interface HelpdeskOption{
    value:string;
    label:string;
    workflow?:string;
}

export interface HelpdeskUser{
    id:string;
    name:string|null;
    email?:string|null;
}

export interface HelpdeskTenant{
    id:string|null;
    name:string;
}

export interface HelpdeskAttachment{
    id:string;
    name:string;
    mime_type:string;
    size:number;
    kind:"image"|"pdf"|"file";
    inline_url:string;
    download_url:string;
}

export interface HelpdeskMessage{
    id:string;
    sender_side:"tenant"|"saas";
    sender:HelpdeskUser|null;
    body:string|null;
    system:boolean;
    attachments:HelpdeskAttachment[];
    created_at:string;
}

export interface HelpdeskRating{
    id:string;
    rating:number;
    comment:string|null;
    submitted_by:HelpdeskUser|null;
    created_at:string;
}

export interface HelpdeskTicket{
    id:string;
    number:string;
    tenant:HelpdeskTenant;
    opened_by:HelpdeskUser|null;
    assigned_to:HelpdeskUser|null;
    subject:string;
    type:string;
    type_label:string;
    category:string;
    category_label:string;
    priority:string;
    priority_label:string;
    status:string;
    status_label:string;
    workflow:"support"|"idea";
    feature_key:string|null;
    feature_label:string|null;
    origin_url:string|null;
    unread_count:number;
    messages_count:number;
    first_response_at:string|null;
    last_message_at:string|null;
    resolved_at:string|null;
    closed_at:string|null;
    reopened_at:string|null;
    created_at:string;
    updated_at:string;
    rating:HelpdeskRating|null;
}

export interface HelpdeskDetail
    extends HelpdeskTicket{
    messages:HelpdeskMessage[];
}

export interface HelpdeskSummary{
    total:number;
    active:number;
    waiting_customer:number;
    resolved:number;
    closed:number;
    unread:number;
}

export interface HelpdeskMeta{
    types:HelpdeskOption[];
    categories:HelpdeskOption[];
    priorities:HelpdeskOption[];
    statuses:HelpdeskOption[];
    features:HelpdeskOption[];
    assignees:HelpdeskUser[];
    tenants:{
        id:string;
        name:string;
        active:boolean;
    }[];
}

export interface HelpdeskListResponse{
    data:HelpdeskTicket[];
    summary:HelpdeskSummary;
    meta:{
        current_page:number;
        last_page:number;
        per_page:number;
        total:number;
        from:number|null;
        to:number|null;
    };
}
