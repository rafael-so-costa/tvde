export type BackofficeNifLookupStatus =
    | "pending"
    | "success"
    | "not_found"
    | "invalid"
    | "error";

export interface BackofficeNifLastAttempt {
    id: string;
    status: string;
    http_status: number | null;
    credit_type: string | null;
    duration_ms: number | null;
    error_message: string | null;
    requested_at: string;
}

export interface BackofficeNifEnrichment {
    id: string;
    nif: string;
    provider: string;
    lookup_status: BackofficeNifLookupStatus;

    title: string | null;
    seo_url: string | null;

    address: string | null;
    pc4: string | null;
    pc3: string | null;
    city: string | null;

    activity: string | null;
    company_status: string | null;
    cae: string | null;

    contacts: Record<string, unknown> | null;
    structure: Record<string, unknown> | null;
    geo: Record<string, unknown> | null;
    place: Record<string, unknown> | null;

    alias: string | null;
    racius_url: string | null;
    portugalio_url: string | null;

    nif_validation: boolean | null;
    is_nif: boolean | null;

    provider_credits:
        | Record<string, unknown>
        | null;

    last_error: string | null;

    lookup_count: number;

    last_looked_up_at: string | null;
    last_success_at: string | null;

    cache_days: number;
    cache_is_fresh: boolean;
    cache_expires_at: string | null;

    last_attempt:
        | BackofficeNifLastAttempt
        | null;

    created_at: string;
    updated_at: string;
}

export interface BackofficeNifEnrichmentData {
    configured: boolean;

    enrichment:
        | BackofficeNifEnrichment
        | null;
}

export interface BackofficeNifEnrichmentResponse {
    data: BackofficeNifEnrichmentData;
}

export interface BackofficeNifEnrichmentMutationResponse
    extends BackofficeNifEnrichmentResponse {
    message: string;
}
