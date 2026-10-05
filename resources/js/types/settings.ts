export type CustomFieldEntity=
    |"empresa"
    |"proprietario"
    |"motorista"
    |"veiculo";

export type CustomFieldType=
    |"text"
    |"textarea"
    |"number"
    |"date"
    |"boolean"
    |"select";

export interface FleetSettings {
    general:{
        commercial_name:string|null;
        website:string|null;
        address:string|null;
        postal_code:string|null;
        city:string|null;
        district:string|null;
        contact_name:string|null;
    };
    operation:{
        base_city:string|null;
        platforms:string[];
        operation_types:string[];
    };
    alerts:{
        insurance_days:number;
        inspection_days:number;
        iuc_days:number;
        criminal_record_days:number;
        driver_documents_days:number;
    };
    vehicles:{
        revision_interval_km:number;
        revision_alert_km:number;
    };
    rentals:{
        periodicity:string;
        due_weekday:number;
        default_deposit:number|null;
        included_km:number|null;
    };
    regional:{
        timezone:string;
        currency:string;
        date_format:string;
        language:string;
    };
}

export interface FleetSettingsData {
    tenant:{
        id:string;
        nome:string;
        nif:string|null;
        email:string|null;
        telefone:string|null;
    };
    settings:FleetSettings;
}

export interface FleetSettingsOptions {
    platforms:Record<string,string>;
    operation_types:Record<string,string>;
    rental_periodicities:Record<string,string>;
    weekdays:Record<string,string>;
}

export interface FleetSettingsResponse {
    data:FleetSettingsData;
    options:FleetSettingsOptions;
}

export interface TenantCustomField {
    id:string;
    tenant_id:string;
    entity:CustomFieldEntity;
    key:string;
    label:string;
    type:CustomFieldType;
    required:boolean;
    active:boolean;
    options:string[]|null;
    placeholder:string|null;
    help_text:string|null;
    default_value:string|null;
    sort_order:number;
    created_at:string;
    updated_at:string;
}

export interface CustomFieldsResponse {
    data:TenantCustomField[];
    options:{
        entities:Record<CustomFieldEntity,string>;
        types:Record<CustomFieldType,string>;
    };
}

export interface CustomFieldPayload {
    entity:CustomFieldEntity;
    key:string|null;
    label:string;
    type:CustomFieldType;
    required:boolean;
    active:boolean;
    options:string[]|null;
    placeholder:string|null;
    help_text:string|null;
    default_value:string|null;
    sort_order:number;
}
