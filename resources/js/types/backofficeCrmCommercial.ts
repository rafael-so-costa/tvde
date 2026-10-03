import type {
    BackofficePagination,
} from "./backoffice";

export type BackofficeCrmStageCategory =
    | "pipeline"
    | "won"
    | "lost";

export type BackofficeCrmLeadSource =
    | "manual"
    | "tvde"
    | "web"
    | "import"
    | "referral";

export type BackofficeCrmLeadPriority =
    | "low"
    | "normal"
    | "high"
    | "urgent";

export type BackofficeCrmActivityType =
    | "note"
    | "call"
    | "email"
    | "whatsapp"
    | "meeting"
    | "demo"
    | "proposal"
    | "task"
    | "follow_up";

export type BackofficeCrmActivityStatus =
    | "planned"
    | "completed"
    | "canceled";

export type BackofficeNifBatchStatus =
    | "pending"
    | "processing"
    | "completed"
    | "partial"
    | "error"
    | "canceled";

export type BackofficeNifBatchItemStatus =
    | "pending"
    | "processing"
    | "success"
    | "error"
    | "skipped";

export interface BackofficeCrmUserReference {
    id: string;
    name: string;
    email?: string;
}

export interface BackofficeCrmStage {
    id: string;
    code: string;
    name: string;
    category: BackofficeCrmStageCategory;
    color: string | null;
    position?: number;
    is_terminal?: boolean;
}

export interface BackofficeCrmPipelineStage
    extends BackofficeCrmStage {
    position: number;
    is_default: boolean;
    is_terminal: boolean;
    is_active: boolean;
    leads_count: number;
}

export interface BackofficeCrmTag {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    description?: string | null;
    is_active?: boolean;
    leads_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface BackofficeCrmTenantReference {
    id: string;
    nome: string;
    slug: string;
    nif: string | null;
    ativo: boolean;
}

export interface BackofficeCrmOperatorReference {
    id: string;
    nif: string;
    display_name: string;
}

export interface BackofficeCrmLead {
    id: string;
    nif: string | null;
    company_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    district: string | null;
    municipality: string | null;
    source: BackofficeCrmLeadSource;
    source_detail: string | null;
    priority: BackofficeCrmLeadPriority;
    last_contacted_at: string | null;
    next_follow_up_at: string | null;
    converted_at: string | null;
    created_at: string;
    updated_at: string;
    stage: BackofficeCrmStage;
    assigned_to:
        | BackofficeCrmUserReference
        | null;
    converted_tenant:
        | BackofficeCrmTenantReference
        | null;
    tvde_operator:
        | BackofficeCrmOperatorReference
        | null;
    tags: BackofficeCrmTag[];
}

export interface BackofficeCrmLeadStageHistory {
    id: string;
    from_stage:
        | BackofficeCrmStage
        | null;
    to_stage: BackofficeCrmStage;
    changed_by:
        | Pick<
              BackofficeCrmUserReference,
              "id" | "name"
          >
        | null;
    note: string | null;
    changed_at: string;
}

export interface BackofficeCrmActivityLeadReference {
    id: string;
    company_name: string;
    nif: string | null;

    stage?: {
        id: string;
        name: string;
        color: string | null;
    } | null;
}

export interface BackofficeCrmActivity {
    id: string;
    type: BackofficeCrmActivityType;
    status: BackofficeCrmActivityStatus;
    subject: string;
    description: string | null;
    outcome: string | null;
    metadata?: Record<
        string,
        unknown
    > | null;
    scheduled_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at?: string;

    lead?:
        | BackofficeCrmActivityLeadReference
        | null;

    assigned_to:
        | BackofficeCrmUserReference
        | null;

    created_by:
        | Pick<
              BackofficeCrmUserReference,
              "id" | "name"
          >
        | null;
}

export interface BackofficeCrmLeadDetail
    extends BackofficeCrmLead {
    website: string | null;
    notes: string | null;
    lost_reason: string | null;

    metadata:
        | Record<string, unknown>
        | null;

    created_by:
        | BackofficeCrmUserReference
        | null;

    stage_history:
        BackofficeCrmLeadStageHistory[];

    activities:
        BackofficeCrmActivity[];
}

export interface BackofficeCrmLeadListResponse {
    data: BackofficeCrmLead[];
    meta: BackofficePagination;
}

export interface BackofficeCrmLeadResponse {
    data: BackofficeCrmLeadDetail;
}

export interface BackofficeCrmLeadMutationResponse {
    message: string;
    data: BackofficeCrmLeadDetail;
}

export interface BackofficeCrmPipelineResponse {
    data: BackofficeCrmPipelineStage[];
}

export interface BackofficeCrmActivityListResponse {
    data: BackofficeCrmActivity[];
    meta: BackofficePagination;
}

export interface BackofficeCrmActivityMutationResponse {
    message: string;
    data: BackofficeCrmActivity;
}

export interface BackofficeCrmTagListResponse {
    data: BackofficeCrmTag[];
}

export interface BackofficeCrmTagMutationResponse {
    message: string;
    data: BackofficeCrmTag;
}

export interface BackofficeCrmProspectResult {
    operator_id: string;
    nif: string;
    company_name: string;
    lead_id?: string;
}

export interface BackofficeCrmProspectCreationResponse {
    message: string;

    data: {
        created:
            BackofficeCrmProspectResult[];

        existing:
            BackofficeCrmProspectResult[];

        customers:
            BackofficeCrmProspectResult[];

        counts: {
            requested: number;
            created: number;
            existing: number;
            customers: number;
        };
    };
}

export interface BackofficeCrmConversionPlan {
    id: string;
    codigo: string;
    nome: string;
}

export interface BackofficeCrmConversionResponse {
    message: string;

    data: {
        lead_id: string;
        tenant_created: boolean;
        trial_started: boolean;

        tenant: {
            id: string;
            nome: string;
            slug: string;
            nif: string | null;
            email: string | null;
            telefone: string | null;
            ativo: boolean;
        };

        subscription: {
            id: string;
            status: string;
            billing_cycle: string;
            trial_ends_at:
                | string
                | null;

            plan:
                | BackofficeCrmConversionPlan
                | null;
        };
    };
}

export interface BackofficeNifBatchCreatedBy {
    id: string;
    name: string;
    email: string;
}

export interface BackofficeNifBatchSummary {
    id: string;
    name: string | null;
    status: BackofficeNifBatchStatus;
    force_refresh: boolean;

    total_items: number;
    pending_items: number;
    processing_items: number;
    success_items: number;
    error_items: number;
    skipped_items: number;

    cache_hits: number;
    external_lookups: number;

    started_at: string | null;
    last_processed_at:
        | string
        | null;
    completed_at: string | null;
    canceled_at: string | null;
    created_at: string;

    created_by:
        | BackofficeNifBatchCreatedBy
        | null;
}

export interface BackofficeNifBatchItemOperator {
    id: string;
    nif: string;
    display_name: string;
}

export interface BackofficeNifBatchItemEnrichment {
    id: string;
    lookup_status: string;
    title: string | null;
    city: string | null;
    cae: string | null;
    last_success_at:
        | string
        | null;
}

export interface BackofficeNifBatchLookupAttempt {
    id: string;
    status: string;
    http_status: number | null;
    duration_ms: number | null;
    error_message: string | null;
    requested_at: string;
}

export interface BackofficeNifBatchItem {
    id: string;
    nif: string;
    status: BackofficeNifBatchItemStatus;
    used_cache: boolean;
    external_lookup: boolean;
    attempt_count: number;
    error_message: string | null;
    started_at: string | null;
    processed_at: string | null;

    operator:
        | BackofficeNifBatchItemOperator
        | null;

    enrichment:
        | BackofficeNifBatchItemEnrichment
        | null;

    lookup_attempt:
        | BackofficeNifBatchLookupAttempt
        | null;
}

export interface BackofficeNifBatchDetail
    extends BackofficeNifBatchSummary {
    metadata:
        | Record<string, unknown>
        | null;

    error_message: string | null;

    items: BackofficeNifBatchItem[];
}

export interface BackofficeNifBatchListResponse {
    data: BackofficeNifBatchSummary[];
    meta: BackofficePagination;
}

export interface BackofficeNifBatchResponse {
    data: BackofficeNifBatchDetail;
}

export interface BackofficeNifBatchMutationResponse
    extends BackofficeNifBatchResponse {
    message: string;
}

export interface BackofficeCrmCommercialMetrics {
    leads_total: number;
    open_leads: number;
    won_leads: number;
    lost_leads: number;
    conversion_rate: number;
    new_leads_30d: number;
    converted_30d: number;
    overdue_follow_ups: number;
    planned_activities_today: number;
    overdue_activities: number;
}

export interface BackofficeCrmEnrichmentMetrics {
    successful: number;
    errors: number;
    active_batches: number;
    not_queried: number;
}

export interface BackofficeCrmDashboardActivity {
    id: string;
    type: BackofficeCrmActivityType;
    status: BackofficeCrmActivityStatus;
    subject: string;
    scheduled_at: string | null;
    completed_at: string | null;
    created_at: string;

    lead: {
        id: string;
        company_name: string;
        nif: string | null;
    } | null;

    created_by: {
        id: string;
        name: string;
    } | null;
}
