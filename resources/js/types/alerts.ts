export type AlertSeverity =
    | "low"
    | "medium"
    | "high"
    | "critical";

export type AlertStatus =
    | "open"
    | "resolved";

export interface AlertRuleSummary {
    id: string;
    code: string;
    name: string;
    category: string;
}

export interface AlertRecipientState {
    id: string;
    read_at: string | null;
    acknowledged_at: string | null;
    snoozed_until: string | null;
    active: boolean;
}

export interface AlertItem {
    id: string;
    rule_code: string;
    rule: AlertRuleSummary | null;

    source_type: string;
    source_id: string | null;

    category: string;
    severity: AlertSeverity;
    status: AlertStatus;

    title: string;
    message: string | null;

    due_at: string | null;
    triggered_at: string | null;
    resolved_at: string | null;

    resolution_type: string | null;
    resolution_note: string | null;

    action_url: string | null;

    metadata: Record<string, unknown> | null;

    recipient: AlertRecipientState | null;
}

export interface AlertSummary {
    total: number;
    unread: number;
    critical: number;
    high: number;
    snoozed: number;
    can_resolve: boolean;
    items: AlertItem[];
}

export interface AlertListMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface AlertListResponse {
    data: AlertItem[];
    meta: AlertListMeta;
}

export interface AlertFilters {
    status?: "open" | "resolved" | "all";
    severity?: AlertSeverity | "";
    category?: string;
    unread?: "" | "1" | "0";
    acknowledged?: "" | "1" | "0";
    include_snoozed?: boolean;
    search?: string;
    page?: number;
    per_page?: number;
}

export interface NotificationPreference {
    id?: string;
    tenant_id?: string;
    user_id?: string;

    category: string;
    channel: string;

    enabled: boolean;

    minimum_severity:
        | "low"
        | "medium"
        | "high"
        | "critical";

    delivery_mode:
        | "immediate"
        | "daily_digest";

    quiet_hours_start: string | null;
    quiet_hours_end: string | null;

    timezone: string | null;
}

export interface EffectiveEmailPreference
    extends NotificationPreference {
    source:
        | "category"
        | "global"
        | "default";
}

export interface NotificationPreferenceResponse {
    data: NotificationPreference[];

    effective_email: EffectiveEmailPreference[];

    options: {
        categories: string[];
        channels: string[];
        minimum_severities: string[];
        delivery_modes: string[];
    };
}

export interface SaveEmailPreferencePayload {
    category: string;
    enabled: boolean;

    minimum_severity:
        | "low"
        | "medium"
        | "high"
        | "critical";

    delivery_mode:
        | "immediate"
        | "daily_digest";

    quiet_hours_start: string | null;
    quiet_hours_end: string | null;

    timezone: string;
}
