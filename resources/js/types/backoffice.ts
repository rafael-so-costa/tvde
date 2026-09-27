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
