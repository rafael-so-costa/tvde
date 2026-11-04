import type { BillingPaymentView } from "./billing";
export type AdCampaignStatus =
    | "draft"
    | "submitted"
    | "in_review"
    | "changes_requested"
    | "rejected"
    | "approved"
    | "awaiting_payment"
    | "scheduled"
    | "active"
    | "paused"
    | "completed"
    | "canceled"
    | "suspended";

export interface AdAdvertiser {
    id: string;
    tenant_id: string | null;
    type: "saas" | "tenant" | "external";
    name: string;
    legal_name: string | null;
    nif: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    status: "active" | "pending" | "suspended";
    campaigns_count?: number;
}

export interface AdCategory {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    active: boolean;
    allowed_on_public: boolean;
    requires_special_review: boolean;
    sort_order: number;
}

export interface AdZone {
    id: string;
    code: string;
    name: string;
    channel:
    | "driver_portal"
    | "owner_portal"
    | "manager_panel"
    | "public_marketplace";
    audience: "driver" | "owner" | "manager" | null;
    description: string | null;
    max_concurrent_campaigns: number;
    saas_reserved_percent: number;
    allowed_sources: string[] | null;
    active: boolean;
}

export interface AdPriceRule {
    id: string;
    name: string;
    zone_id: string | null;
    category_id: string | null;
    channel: string | null;
    audience: string | null;
    duration_days: number;
    price: string | number;
    currency: string;
    priority: number;
    active: boolean;
    zone?: {
        id: string;
        name: string;
        code: string;
    } | null;
    category?: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

export interface AdCampaignSummary {
    id: string;
    name: string;
    title: string;
    source: "saas" | "tenant" | "external";
    kind: "house" | "tenant_internal" | "commercial";
    status: AdCampaignStatus;
    quoted_price: number;
    currency: string;
    payment_required: boolean;
    payment_status: string;
    priority: number;
    start_at: string | null;
    end_at: string | null;
    advertiser: {
        id: string;
        name: string;
        type: string;
    } | null;
    category: {
        id: string;
        name: string;
        slug: string;
    } | null;
    tenant: {
        id: string;
        nome: string;
    } | null;
    created_at: string;
    updated_at: string;
}

export interface AdCreative {
    id: string;
    type: string;
    name: string;
    headline: string;
    body: string | null;
    cta_label: string | null;
    target_url: string | null;
    phone: string | null;
    whatsapp: string | null;
    image_url: string | null;
    mobile_image_url: string | null;
    active: boolean;
    sort_order: number;
}

export interface AdCampaignDetail extends AdCampaignSummary {
    description: string | null;
    pricing_model: string;
    weight: number;
    max_impressions: number | null;
    max_clicks: number | null;
    frequency_cap_daily: number | null;
    admin_notes: string | null;
    channels: string[];
    audiences: string[];
    metrics: AdMetrics;
    locations: Array<{
        id: string;
        country_code: string;
        district: string | null;
        municipality: string | null;
    }>;
    zones: AdZone[];
    creatives: AdCreative[];
    reviews: Array<{
        id: string;
        decision: string;
        reason: string | null;
        notes: string | null;
        reviewer: {
            id: string;
            name: string;
        } | null;
        created_at: string;
    }>;
    events: Array<{
        id: string;
        event_type: string;
        from_status: string | null;
        to_status: string | null;
        created_at: string;
    }>;
    orders: AdOrder[];
}

export interface AdOrder {
    id: string;
    number: string;
    status: string;
    subtotal: number;
    discount: number;
    total: number;
    currency: string;
    due_at: string | null;
    paid_at: string | null;

    billing_payment: BillingPaymentView | null;

    campaign: {
        id: string;
        name: string;
        title: string;
        status: string;
    };
    advertiser: {
        id: string;
        name: string;
        type: string;
    };
    tenant: {
        id: string;
        nome: string;
    } | null;
    payments: Array<{
        id: string;
        provider: string;
        provider_reference: string | null;
        status: string;
        amount: number;
        currency: string;
        paid_at: string | null;
    }>;
    created_at: string;
}

export interface AdSettings {
    id: string;
    tenant_internal_free_enabled: boolean;
    tenant_internal_requires_approval: boolean;
    tenant_internal_max_active: number;
    tenant_internal_max_days: number;
    tenant_internal_allow_partners: boolean;
    public_marketplace_enabled: boolean;
    commercial_ads_enabled: boolean;
    manager_panel_external_ads_enabled: boolean;
    saas_inventory_reserved_percent: number;
    default_frequency_cap_daily: number;
    currency: string;
}

export interface AdMetrics {
    impressions: number;
    viewable_impressions: number;
    unique_impressions: number;
    clicks: number;
    unique_clicks: number;
    ctr: number;
    viewability_rate?: number;
}

export interface AdCreative {
    id: string;
    type: string;

    media_type:
    | "image"
    | "video"
    | "none";

    name: string;
    headline: string;
    body: string | null;

    cta_label: string | null;

    destination_type:
    | "website"
    | "whatsapp"
    | "phone"
    | "none";

    target_url: string | null;

    phone: string | null;
    whatsapp: string | null;
    whatsapp_message: string | null;

    image_url: string | null;
    mobile_image_url: string | null;

    video_url: string | null;

    alt_text: string | null;

    active: boolean;
    sort_order: number;

    metrics: AdMetrics;
}
