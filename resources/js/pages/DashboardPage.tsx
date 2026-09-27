import { useQuery } from "@tanstack/react-query";

import {
    AlertTriangle,
    ArrowRight,
    Car,
    ClipboardCheck,
    FileText,
    KeyRound,
    LoaderCircle,
    UserRound,
    UsersRound,
    Building2,
    CheckCircle2,
    FileStack,
    Sparkles,
} from "lucide-react";

import { Link } from "react-router-dom";

import type { ReactNode } from "react";

import api from "../lib/api";

import { alertKeys, fetchAlertSummary } from "../lib/alerts";

import { useAuth } from "../contexts/AuthContext";

import { useTenant } from "../contexts/TenantContext";

import type {
    DashboardContract,
    DashboardData,
    DashboardRental,
    DashboardSetup,
} from "../types/dashboard";

import type { AlertItem, AlertSeverity, AlertSummary } from "../types/alerts";

export default function DashboardPage() {
    const { user } = useAuth();

    const { tenant, loading } = useTenant();

    const dashboardQuery = useQuery({
        queryKey: ["dashboard", tenant?.id],

        enabled: Boolean(tenant),

        queryFn: async () => {
            const response = await api.get("/api/dashboard");

            return response.data.data as DashboardData;
        },
    });

    const alertSummaryQuery = useQuery({
        queryKey: alertKeys.summary(tenant?.id),

        enabled: Boolean(tenant),

        queryFn: fetchAlertSummary,

        refetchInterval: 60_000,
    });

    if (!loading && !tenant && user?.super_admin) {
        return (
            <div className="mx-auto max-w-7xl">
                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-7 sm:p-10">
                    <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

                    <div className="relative max-w-2xl">
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500">
                            <KeyRound className="h-6 w-6 text-white" />
                        </div>

                        <p className="mb-3 text-sm font-medium text-indigo-300">
                            Super Administrador
                        </p>

                        <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                            Selecione uma organização para começar.
                        </h2>

                        <p className="mt-4 leading-relaxed text-slate-400">
                            Utilize o seletor no topo para carregar os
                            indicadores da organização.
                        </p>
                    </div>
                </section>
            </div>
        );
    }

    const data = dashboardQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    Dashboard
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Olá, {user?.name}
                        </h1>

                        <p className="mt-2 text-slate-500">
                            {tenant
                                ? `Visão geral de ${tenant.nome}.`
                                : "Bem-vindo ao FrotaPRO."}
                        </p>
                    </div>

                    {(dashboardQuery.isFetching ||
                        alertSummaryQuery.isFetching) && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <LoaderCircle className="h-4 w-4 animate-spin" />A
                            atualizar
                        </div>
                    )}
                </div>
            </section>

            {dashboardQuery.isLoading ? (
                <LoadingDashboard />
            ) : dashboardQuery.isError || !data ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Não foi possível carregar os indicadores do dashboard.
                </div>
            ) : (
                <>
                    {data.setup && !data.setup.complete && (
                        <SetupProgress setup={data.setup} />
                    )}
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <MetricCard
                            title="Veículos ativos"
                            value={data.metrics.veiculos_ativos}
                            href="/veiculos"
                            icon={Car}
                            description="Disponíveis na frota"
                        />

                        <MetricCard
                            title="Motoristas ativos"
                            value={data.metrics.motoristas_ativos}
                            href="/motoristas"
                            icon={UserRound}
                            description="Cadastros ativos"
                        />

                        <MetricCard
                            title="Proprietários"
                            value={data.metrics.proprietarios}
                            href="/proprietarios"
                            icon={UsersRound}
                            description="Registados na organização"
                        />

                        <MetricCard
                            title="Alugueres ativos"
                            value={data.metrics.alugueres_ativos}
                            href="/alugueres"
                            icon={KeyRound}
                            description="Operações em curso"
                        />

                        <MetricCard
                            title="Contratos pendentes"
                            value={data.metrics.contratos_pendentes}
                            href="/contratos"
                            icon={FileText}
                            description="Rascunhos ou enviados"
                        />

                        <MetricCard
                            title="Checklists pendentes"
                            value={data.metrics.checklists_pendentes}
                            href="/checklists"
                            icon={ClipboardCheck}
                            description="Ainda não finalizados"
                        />
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
                        <div className="space-y-6">
                            <RecentContracts items={data.recent_contracts} />

                            <RecentRentals items={data.recent_rentals} />
                        </div>

                        <Alerts
                            summary={alertSummaryQuery.data}
                            loading={alertSummaryQuery.isLoading}
                        />
                    </section>
                </>
            )}
        </div>
    );
}

function SetupProgress({
    setup,
}: {
    setup: DashboardSetup;
}) {
    const icons: Record<
        string,
        typeof Building2
    > = {
        empresa: Building2,
        proprietario: UsersRound,
        veiculo: Car,
        motorista: UserRound,
        template: FileStack,
        contrato: FileText,
        aluguer: KeyRound,
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
            <div className="p-6 sm:p-7">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
                            <Sparkles className="h-4 w-4" />
                            Primeiros passos
                        </div>

                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                            Prepare a sua operação no FrotaPRO
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Complete estes passos para deixar a sua empresa preparada
                            para gerir a frota no dia a dia.
                        </p>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                        <div className="text-3xl font-bold text-indigo-600">
                            {setup.percentage}%
                        </div>

                        <div className="mt-1 text-xs font-medium text-slate-400">
                            {setup.completed} de {setup.total} concluídos
                        </div>
                    </div>
                </div>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-indigo-100">
                    <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{
                            width: `${setup.percentage}%`,
                        }}
                    />
                </div>

                <div className="mt-7 grid gap-3 md:grid-cols-2">
                    {setup.steps.map(
                        (step) => {
                            const Icon =
                                icons[
                                    step.key
                                ] ??
                                CheckCircle2;

                            const isNext =
                                setup
                                    .next_step
                                    ?.key ===
                                step.key;

                            return (
                                <Link
                                    key={
                                        step.key
                                    }
                                    to={
                                        step.href
                                    }
                                    className={[
                                        "group flex items-start gap-4 rounded-xl border p-4 transition",
                                        step.completed
                                            ? "border-emerald-200 bg-emerald-50/60"
                                            : isNext
                                              ? "border-indigo-300 bg-white shadow-sm"
                                              : "border-slate-200 bg-white/70 hover:border-indigo-200",
                                    ].join(
                                        " "
                                    )}
                                >
                                    <div
                                        className={[
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                            step.completed
                                                ? "bg-emerald-100 text-emerald-600"
                                                : isNext
                                                  ? "bg-indigo-100 text-indigo-600"
                                                  : "bg-slate-100 text-slate-500",
                                        ].join(
                                            " "
                                        )}
                                    >
                                        {step.completed ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            <Icon className="h-5 w-5" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p
                                                className={[
                                                    "text-sm font-semibold",
                                                    step.completed
                                                        ? "text-emerald-800"
                                                        : "text-slate-900",
                                                ].join(
                                                    " "
                                                )}
                                            >
                                                {
                                                    step.label
                                                }
                                            </p>

                                            {isNext &&
                                                !step.completed && (
                                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                                                        Próximo
                                                    </span>
                                                )}
                                        </div>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {
                                                step.description
                                            }
                                        </p>
                                    </div>

                                    {!step.completed && (
                                        <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
                                    )}
                                </Link>
                            );
                        }
                    )}
                </div>

                {setup.next_step && (
                    <div className="mt-6 flex justify-end">
                        <Link
                            to={
                                setup
                                    .next_step
                                    .href
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
                        >
                            Continuar configuração
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}

function MetricCard({
    title,
    value,
    href,
    icon: Icon,
    description,
}: {
    title: string;
    value: number | null;
    href: string;
    icon: typeof Car;
    description: string;
}) {
    if (value === null) {
        return null;
    }

    return (
        <Link
            to={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/60"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                </div>

                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
            </div>

            <div className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                {value}
            </div>

            <div className="mt-1 font-semibold text-slate-800">{title}</div>

            <div className="mt-1 text-sm text-slate-400">{description}</div>
        </Link>
    );
}

function RecentContracts({ items }: { items: DashboardContract[] }) {
    return (
        <Panel title="Contratos recentes" href="/contratos">
            {items.length === 0 ? (
                <Empty text="Nenhum contrato registado." />
            ) : (
                <div className="divide-y divide-slate-100">
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            to="/contratos"
                            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">
                                    {item.template?.nome ??
                                        contractType(item.tipo)}
                                </div>

                                <div className="mt-1 truncate text-xs text-slate-400">
                                    {item.motorista?.nome_completo ??
                                        "Sem motorista"}

                                    {item.veiculo
                                        ? ` · ${item.veiculo.matricula}`
                                        : ""}
                                </div>
                            </div>

                            <StatusBadge status={item.status} />
                        </Link>
                    ))}
                </div>
            )}
        </Panel>
    );
}

function RecentRentals({ items }: { items: DashboardRental[] }) {
    return (
        <Panel title="Alugueres recentes" href="/alugueres">
            {items.length === 0 ? (
                <Empty text="Nenhum aluguer registado." />
            ) : (
                <div className="divide-y divide-slate-100">
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            to="/alugueres"
                            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">
                                    {item.motorista?.nome_completo ??
                                        "Aluguer sem motorista"}
                                </div>

                                <div className="mt-1 truncate text-xs text-slate-400">
                                    {item.veiculo
                                        ? `${item.veiculo.matricula} · ${item.veiculo.marca} ${item.veiculo.modelo}`
                                        : `Passo ${item.rascunho_passo}`}
                                </div>
                            </div>

                            <StatusBadge status={item.status} />
                        </Link>
                    ))}
                </div>
            )}
        </Panel>
    );
}

function Alerts({
    summary,
    loading,
}: {
    summary: AlertSummary | undefined;
    loading: boolean;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />

                    <h2 className="font-semibold text-slate-900">Alertas</h2>
                </div>

                <Link
                    to="/alertas"
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600"
                >
                    Ver todos
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-400">
                    <LoaderCircle className="h-4 w-4 animate-spin" />A
                    carregar...
                </div>
            ) : !summary || summary.items.length === 0 ? (
                <Empty text="Nenhum alerta ativo." />
            ) : (
                <>
                    <div className="grid grid-cols-3 border-b border-slate-100">
                        <AlertMetric label="Ativos" value={summary.total} />

                        <AlertMetric label="Não lidos" value={summary.unread} />

                        <AlertMetric
                            label="Críticos"
                            value={summary.critical}
                        />
                    </div>

                    <div className="divide-y divide-slate-100">
                        {summary.items.slice(0, 6).map((item) => (
                            <DashboardAlert key={item.id} item={item} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function AlertMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="px-3 py-3 text-center">
            <div className="text-lg font-bold text-slate-900">{value}</div>

            <div className="text-[11px] text-slate-400">{label}</div>
        </div>
    );
}

function DashboardAlert({ item }: { item: AlertItem }) {
    return (
        <Link
            to="/alertas"
            className="block px-5 py-4 transition hover:bg-slate-50"
        >
            <div className="flex items-start gap-3">
                <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot(item.severity)}`}
                />

                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">
                        {item.title}
                    </div>

                    {item.message && (
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                            {item.message}
                        </div>
                    )}

                    {item.due_at && (
                        <div className="mt-2 text-xs text-slate-400">
                            {formatDateTime(item.due_at)}
                        </div>
                    )}
                </div>

                <SeverityBadge severity={item.severity} />
            </div>
        </Link>
    );
}

function Panel({
    title,
    href,
    children,
}: {
    title: string;
    href: string;
    children: ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">{title}</h2>

                <Link
                    to={href}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600"
                >
                    Ver todos
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {children}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const classes =
        status === "ativo" || status === "assinado" || status === "finalizado"
            ? "bg-emerald-50 text-emerald-700"
            : status === "enviado"
              ? "bg-blue-50 text-blue-700"
              : status === "cancelado" || status === "expirado"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
        >
            {statusLabel(status)}
        </span>
    );
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
    const classes = {
        critical: "bg-red-50 text-red-700",
        high: "bg-orange-50 text-orange-700",
        medium: "bg-amber-50 text-amber-700",
        low: "bg-blue-50 text-blue-700",
    }[severity];

    const labels = {
        critical: "Crítico",
        high: "Alta",
        medium: "Média",
        low: "Baixa",
    }[severity];

    return (
        <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${classes}`}
        >
            {labels}
        </span>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
            {text}
        </div>
    );
}

function LoadingDashboard() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({
                length: 6,
            }).map((_, index) => (
                <div
                    key={index}
                    className="h-40 animate-pulse rounded-2xl bg-slate-100"
                />
            ))}
        </div>
    );
}

function contractType(value: string): string {
    return (
        {
            aluguer: "Contrato de aluguer",

            prestacao_servico: "Prestação de serviços",

            checklist_entrega: "Checklist de entrega",

            checklist_devolucao: "Checklist de devolução",
        }[value] ?? value
    );
}

function statusLabel(value: string): string {
    return (
        {
            rascunho: "Rascunho",
            ativo: "Ativo",
            enviado: "Enviado",
            assinado: "Assinado",
            finalizado: "Finalizado",
            cancelado: "Cancelado",
            expirado: "Expirado",
            encerrado: "Encerrado",
            renovado: "Renovado",
        }[value] ?? value
    );
}

function severityDot(severity: AlertSeverity): string {
    return {
        critical: "bg-red-500",
        high: "bg-orange-500",
        medium: "bg-amber-400",
        low: "bg-blue-400",
    }[severity];
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "short",
    }).format(new Date(value));
}
