export interface BillingMetrics {
    mrr: number;
    subscriptions_active: number;
    subscriptions_trialing: number;
    subscriptions_past_due: number;
    ads_pending_count: number;
    ads_pending_amount: number;
    ads_paid_30_days_count: number;
    ads_paid_30_days_amount: number;
}

export interface IfthenpayStatus {
    enabled: boolean;
    sandbox: boolean;
    configured: boolean;
    multibanco_ready: boolean;
    reconciliation_ready: boolean;
    callback_ready: boolean;
    mbway_ready: boolean;
    direct_debit_ready: boolean;
}

export interface BillingSubscription {
    id: string;
    status: string;
    billing_cycle: "monthly" | "yearly";
    price_amount: number | null;
    currency: string;

    tenant: {
        id: string;
        nome: string;
    } | null;

    plan: {
        id: string;
        codigo: string;
        nome: string;
    } | null;

    updated_at: string;
}

export interface BillingAdOrder {
    id: string;
    number: string;
    status: string;
    total: number;
    currency: string;
    due_at: string | null;
    paid_at: string | null;

    campaign: {
        id: string;
        name: string;
    } | null;

    advertiser: {
        id: string;
        name: string;
    } | null;

    payment: {
        provider: string;
        status: string;
        reference: string | null;
    } | null;

    created_at: string;
}

export interface BillingDashboardData {
    metrics: BillingMetrics;

    provider: {
        default: string;
        ifthenpay: IfthenpayStatus;
    };

    recent_subscriptions: BillingSubscription[];
    recent_ad_orders: BillingAdOrder[];
}

export interface BillingDashboardResponse {
    data: BillingDashboardData;
}
export interface BillingPaymentView {
    id: string;
    provider: string;
    method: string;
    status: string;
    amount: number;
    currency: string;
    entity: string | null;
    reference: string | null;
    provider_reference: string | null;
    external_id: string | null;
    sandbox: boolean;
    expires_at: string | null;
    paid_at: string | null;
    mock: boolean;
    warning: string | null;

    charge: {
        id: string;
        number: string;
        source_type: string;
        source_id: string;
        status: string;
        description: string | null;
        due_at: string | null;
    } | null;
}

export interface BillingPaymentMutationResponse {
    message: string;
    data: BillingPaymentView;
}
export interface BillingOrderListItem {
    id: string;
    number: string;
    source_type:
        | "saas_subscription"
        | "ad_order";
    source_id: string;
    status: string;
    description: string;
    total: number;
    currency: string;
    due_at: string | null;
    paid_at: string | null;
    created_at: string;
    is_overdue: boolean;

    tenant: {
        id: string;
        nome: string;
        nif: string | null;
        email: string | null;
    } | null;

    payment: {
        id: string;
        provider: string;
        method: string;
        status: string;
        entity: string | null;
        reference: string | null;
        provider_reference: string | null;
        external_id: string | null;
        expires_at: string | null;
        paid_at: string | null;
        mock: boolean;
    } | null;

    source: {
        type: string;
        id: string;
        status: string;
        number?: string;
        plan?: {
            id: string;
            codigo: string;
            nome: string;
        } | null;
        campaign?: {
            id: string;
            name: string;
        } | null;
        advertiser?: {
            id: string;
            name: string;
        } | null;
    } | null;
}

export interface BillingOrderListResponse {
    data: BillingOrderListItem[];

    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
}
