import type { BackofficePagination } from "./backoffice";

export type BackofficeTvdeSource =
    | "imt_continental"
    | "ram";

export type BackofficeTvdeChangeType =
    | "created"
    | "updated"
    | "removed"
    | "restored";

export interface BackofficeTvdeCustomer {
    id: string;
    nome: string;
    slug: string;
    ativo: boolean;
}

export interface BackofficeTvdeCustomerDetail
    extends BackofficeTvdeCustomer {
    nif: string | null;
    email: string | null;
    telefone: string | null;
    created_at: string;
}

export interface BackofficeTvdeRegistration {
    id: string;
    source: BackofficeTvdeSource;
    jurisdiction: string;
    source_key: string;
    denomination: string;
    license_number: string | null;
    district: string | null;
    municipality: string | null;
    postal_locality: string | null;
    active: boolean;
    first_seen_at: string | null;
    last_seen_at: string | null;
    removed_at: string | null;
}

export interface BackofficeTvdeRegistrationDetail
    extends BackofficeTvdeRegistration {
    first_seen_import_id: string | null;
    last_seen_import_id: string | null;
    removed_in_import_id: string | null;
    raw_data: Record<string, unknown> | null;
}

export interface BackofficeTvdeOperator {
    id: string;
    nif: string;
    display_name: string;
    active: boolean;
    is_customer: boolean;
    customers: BackofficeTvdeCustomer[];
    sources: BackofficeTvdeSource[];
    registrations: BackofficeTvdeRegistration[];
    created_at: string;
    updated_at: string;
}

export interface BackofficeTvdeOperatorListResponse {
    data: BackofficeTvdeOperator[];
    meta: BackofficePagination;
}

export interface BackofficeTvdeOperatorChange {
    id: string;
    change_type: BackofficeTvdeChangeType;
    changed_fields: string[] | null;
    before_data: Record<string, unknown> | null;
    after_data: Record<string, unknown> | null;
    created_at: string;

    import: {
        id: string;
        source: BackofficeTvdeSource;
        reference_date: string;
    } | null;
}

export interface BackofficeTvdeOperatorDetail {
    id: string;
    nif: string;
    display_name: string;
    active: boolean;
    is_customer: boolean;

    sources: BackofficeTvdeSource[];

    source_presence: {
        imt: boolean;
        ram: boolean;
    };

    customers: BackofficeTvdeCustomerDetail[];
    registrations: BackofficeTvdeRegistrationDetail[];
    changes: BackofficeTvdeOperatorChange[];

    created_at: string;
    updated_at: string;
}

export interface BackofficeTvdeOperatorResponse {
    data: BackofficeTvdeOperatorDetail;
}

export interface BackofficeTvdeImportSummary {
    id: string;
    source: BackofficeTvdeSource;
    reference_date: string;
    status: string;
    total_records: number;
    new_records: number;
    changed_records: number;
    removed_records: number;
    restored_records: number;
    unchanged_records: number;
    created_at: string;
}

export interface BackofficeTvdeImportedBy {
    id: string;
    name: string;
    email: string;
}

export interface BackofficeTvdeImportListItem
    extends BackofficeTvdeImportSummary {
    original_filename: string;
    imported_by: BackofficeTvdeImportedBy | null;
}

export interface BackofficeTvdeImportListResponse {
    data: BackofficeTvdeImportListItem[];
    meta: BackofficePagination;
}

export interface BackofficeTvdeImportChange {
    id: string;
    change_type: BackofficeTvdeChangeType;
    changed_fields: string[] | null;
    before_data: Record<string, unknown> | null;
    after_data: Record<string, unknown> | null;
    created_at: string;

    operator: {
        id: string;
        nif: string;
        display_name: string;
    } | null;

    registration: {
        id: string;
        source: BackofficeTvdeSource;
        jurisdiction: string;
        license_number: string | null;
        district: string | null;
        municipality: string | null;
        postal_locality: string | null;
    } | null;
}

export interface BackofficeTvdeImportDetail
    extends BackofficeTvdeImportListItem {
    metadata: Record<string, unknown> | null;
    file_hash: string;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;

    change_counts: {
        created: number;
        updated: number;
        removed: number;
        restored: number;
    };

    changes: {
        data: BackofficeTvdeImportChange[];
        meta: BackofficePagination;
    };
}

export interface BackofficeTvdeImportResponse {
    data: BackofficeTvdeImportDetail;
}

export interface BackofficeCrmMetrics {
    operators_historical: number;
    operators_active: number;
    operators_inactive: number;
    registrations_active: number;
    imt_active: number;
    ram_active: number;
    both_sources: number;
    customers: number;
    prospects: number;
}

export interface BackofficeCrmDashboardData {
    metrics: BackofficeCrmMetrics;

    latest_import:
        | BackofficeTvdeImportSummary
        | null;

    latest_sources: {
        imt:
            | BackofficeTvdeImportSummary
            | null;

        ram:
            | BackofficeTvdeImportSummary
            | null;
    };

    recent_imports:
        BackofficeTvdeImportSummary[];
}
