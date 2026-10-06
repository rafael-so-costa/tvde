export interface PlatformOption{
    value:string;
    label:string;
}

export interface PlatformTenant{
    id:string;
    name:string;
}

export interface PlatformNotification{
    id:string;
    type:string;
    type_label:string;
    title:string;
    message:string;
    severity:string;
    severity_label:string;

    target_scope:
        |"all"
        |"selected";

    audiences:string[];
    channels:string[];

    tenant_ids:string[];
    tenants:PlatformTenant[];

    action_url:string|null;

    active:boolean;

    published_at:string|null;
    expires_at:string|null;
    resolved_at:string|null;

    status:string;
    status_label:string;

    tenants_reached:number;
    recipients:number;

    created_at:string;
    updated_at:string;
}

export interface PlatformNotificationMeta{
    types:PlatformOption[];
    audiences:PlatformOption[];
    severities:PlatformOption[];
    scopes:PlatformOption[];
    channels:PlatformOption[];
    tenants:PlatformTenant[];
}
