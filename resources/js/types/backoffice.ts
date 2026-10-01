export interface BackofficeMetrics {
    tenants_total: number;
    tenants_active: number;
    tenants_last_30_days: number;
    users_active: number;
    empresas_active: number;
    veiculos_total: number;
    motoristas_total: number;
}

export interface BackofficeRecentTenant {
    id: string;
    nome: string;
    slug: string;
    nif: string | null;
    email: string | null;
    telefone: string | null;
    ativo: boolean;
    created_at: string;
    onboarding_required: boolean;
    users_count: number;
    empresas_count: number;
    veiculos_count: number;
    motoristas_count: number;
}

export interface BackofficeDashboardData {
    metrics: BackofficeMetrics;
    recent_tenants: BackofficeRecentTenant[];
}

export interface BackofficeClient {
    id: string;
    nome: string;
    slug: string;
    nif: string | null;
    email: string | null;
    telefone: string | null;
    ativo: boolean;
    created_at: string;
    updated_at: string;
    onboarding_required: boolean;
    onboarding_completed_at: string | null;
    multi_company_enabled: boolean;
    users_count: number;
    empresas_count: number;
    proprietarios_count: number;
    veiculos_count: number;
    motoristas_count: number;
    funcionarios_count: number;
}

export interface BackofficePagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface BackofficeClientListResponse {
    data: BackofficeClient[];
    meta: BackofficePagination;
}

export interface BackofficeClientCompany {
    id: string;
    tenant_id: string;
    nome_empresa: string;
    nif: string;
    email: string | null;
    telemovel: string | null;
    nome_gerente: string | null;
    endereco_cidade: string | null;
    ativo: boolean;
    status_cadastro: string;
    created_at: string;
}

export interface BackofficeClientUserRole {
    codigo: string;
    nome: string;
}

export interface BackofficeClientUser {
    id: string;
    name: string;
    email: string;
    ativo: boolean;
    membership_status: string;
    principal: boolean;
    last_login_at: string | null;
    created_at: string;
    roles: BackofficeClientUserRole[];
}

export interface BackofficeSaasPlan {
    id: string;
    codigo: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
}

export interface BackofficeResourceUsage {
    used: number;
    limit: number | null;
    remaining: number | null;
    can_create: boolean;
}

export interface BackofficeClientUsage {
    empresas: BackofficeResourceUsage;
    veiculos: BackofficeResourceUsage;
    motoristas: BackofficeResourceUsage;
    utilizadores: BackofficeResourceUsage;
}

export interface BackofficeClientFeatures {
    multi_company: boolean;
    integracoes: boolean;
    relatorios_avancados: boolean;
}

export interface BackofficeClientFeatureOverrides {
    multi_company: boolean | null;
}

export interface BackofficeClientDetail extends BackofficeClient {
    settings: Record<string, unknown>;

    plan: BackofficeSaasPlan | null;

    usage: BackofficeClientUsage;

    features: BackofficeClientFeatures;

    feature_overrides: BackofficeClientFeatureOverrides;

    companies: BackofficeClientCompany[];

    users: BackofficeClientUser[];
}

export interface BackofficePlanLimits {
    empresas: number | null;
    veiculos: number | null;
    motoristas: number | null;
    utilizadores: number | null;
}

export interface BackofficePlanFeatures {
    multi_company: boolean;
    integracoes: boolean;
    relatorios_avancados: boolean;
}

export interface BackofficePlan {
    id: string;
    codigo: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    ordem: number;
    limits: BackofficePlanLimits;
    features: BackofficePlanFeatures;
    tenants_count: number;
    created_at: string;
    updated_at: string;
}

export interface BackofficePlanListResponse {
    data: BackofficePlan[];
}


export interface BackofficePlanImpactWarning {
    resource: string;
    used: number;
    limit: number;
    excess: number;
}

export interface BackofficePlanImpact {
    usage: BackofficeClientUsage;
    features: BackofficeClientFeatures;
    warnings: BackofficePlanImpactWarning[];
}

export interface BackofficeClientPlanPreview {
    current_plan: BackofficeSaasPlan | null;
    selected_plan: BackofficeSaasPlan;
    impact: BackofficePlanImpact;
}

export interface BackofficeClientPlanChangeResponse {
    message: string;

    data: {
        id: string;
        previous_plan: BackofficeSaasPlan | null;
        plan: BackofficeSaasPlan;
        impact: BackofficePlanImpact;
    };
}

export type BackofficeSubscriptionStatus =
    | "trialing"
    | "active"
    | "past_due"
    | "suspended"
    | "canceled";

export type BackofficeBillingCycle =
    | "monthly"
    | "yearly";

export interface BackofficeSubscriptionTenant {
    id: string;
    nome: string;
    slug: string;
    nif: string | null;
    email: string | null;
    telefone: string | null;
    ativo: boolean;
}

export interface BackofficeSubscription {
    id: string;
    status: BackofficeSubscriptionStatus;
    billing_cycle: BackofficeBillingCycle;
    price_amount: number | null;
    currency: string;

    starts_at: string;
    trial_ends_at: string | null;

    current_period_starts_at: string | null;
    current_period_ends_at: string | null;

    cancels_at: string | null;
    canceled_at: string | null;
    cancel_scheduled: boolean;

    external_provider: string | null;
    external_subscription_id: string | null;

    tenant: BackofficeSubscriptionTenant | null;
    plan: BackofficeSaasPlan | null;

    created_at: string;
    updated_at: string;
}

export interface BackofficeSubscriptionListResponse {
    data: BackofficeSubscription[];
    meta: BackofficePagination;
}

export interface BackofficeSubscriptionResponse {
    data: BackofficeSubscription;
}

export interface BackofficeSubscriptionMutationResponse {
    message: string;
    data: BackofficeSubscription;
}
