export interface DashboardMetrics {
    veiculos_ativos: number | null;
    motoristas_ativos: number | null;
    proprietarios: number | null;
    alugueres_ativos: number | null;
    contratos_pendentes: number | null;
    checklists_pendentes: number | null;
}

export interface DashboardPermissions {
    veiculos: boolean;
    motoristas: boolean;
    proprietarios: boolean;
    alugueres: boolean;
    contratos: boolean;
    checklist: boolean;
}

export interface DashboardContract {
    id: string;
    tipo: string;
    status: string;
    data_inicio: string | null;
    data_fim: string | null;
    valor_semanal: string | number | null;
    updated_at: string;

    template?: {
        id: string;
        nome: string;
    } | null;

    motorista?: {
        id: string;
        nome_completo: string;
    } | null;

    veiculo?: {
        id: string;
        matricula: string;
        marca: string;
        modelo: string;
    } | null;
}

export interface DashboardRental {
    id: string;
    status: string;
    data_inicio: string | null;
    data_fim: string | null;
    rascunho_passo: number;
    updated_at: string;

    motorista?: {
        id: string;
        nome_completo: string;
    } | null;

    veiculo?: {
        id: string;
        matricula: string;
        marca: string;
        modelo: string;
    } | null;
}

export interface DashboardData {
    metrics: DashboardMetrics;

    recent_contracts:
    DashboardContract[];

    recent_rentals:
    DashboardRental[];

    permissions:
    DashboardPermissions;
    setup: DashboardSetup | null;
}

export interface DashboardSetupStep {
    key: string;
    label: string;
    description: string;
    href: string;
    completed: boolean;
}

export interface DashboardSetup {
    completed: number;
    total: number;
    percentage: number;
    complete: boolean;
    next_step: DashboardSetupStep | null;
    steps: DashboardSetupStep[];
}
