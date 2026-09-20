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
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useTenant } from "../contexts/TenantContext";
import type {
    DashboardAlert,
    DashboardContract,
    DashboardData,
    DashboardRental,
} from "../types/dashboard";
import { ReactNode } from "react";

export default function DashboardPage() {
    const { user }=useAuth();
    const { tenant,loading }=useTenant();

    const dashboardQuery=useQuery({
        queryKey:["dashboard",tenant?.id],
        enabled:Boolean(tenant),
        queryFn:async()=>{
            const response=await api.get("/api/dashboard");
            return response.data.data as DashboardData;
        },
    });

    if(!loading && !tenant && user?.super_admin){
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
                            Utilize o seletor no topo para carregar os indicadores da organização.
                        </p>
                    </div>
                </section>
            </div>
        );
    }

    const data=dashboardQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">Dashboard</p>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Olá, {user?.name}
                        </h1>
                        <p className="mt-2 text-slate-500">
                            {tenant ? `Visão geral de ${tenant.nome}.` : "Bem-vindo ao FrotaPRO."}
                        </p>
                    </div>

                    {dashboardQuery.isFetching && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            A atualizar
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
                        <Alerts items={data.alerts} />
                    </section>
                </>
            )}
        </div>
    );
}

function MetricCard({
    title,value,href,icon:Icon,description,
}: {
    title:string;
    value:number | null;
    href:string;
    icon:typeof Car;
    description:string;
}) {
    if(value===null) return null;

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

function RecentContracts({ items }: { items:DashboardContract[] }) {
    return (
        <Panel title="Contratos recentes" href="/contratos">
            {items.length===0 ? (
                <Empty text="Nenhum contrato registado." />
            ) : (
                <div className="divide-y divide-slate-100">
                    {items.map((item)=>(
                        <Link
                            key={item.id}
                            to="/contratos"
                            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">
                                    {item.template?.nome ?? contractType(item.tipo)}
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-400">
                                    {item.motorista?.nome_completo ?? "Sem motorista"}
                                    {item.veiculo ? ` · ${item.veiculo.matricula}` : ""}
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

function RecentRentals({ items }: { items:DashboardRental[] }) {
    return (
        <Panel title="Alugueres recentes" href="/alugueres">
            {items.length===0 ? (
                <Empty text="Nenhum aluguer registado." />
            ) : (
                <div className="divide-y divide-slate-100">
                    {items.map((item)=>(
                        <Link
                            key={item.id}
                            to="/alugueres"
                            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">
                                    {item.motorista?.nome_completo ?? "Aluguer sem motorista"}
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

function Alerts({ items }: { items:DashboardAlert[] }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h2 className="font-semibold text-slate-900">Alertas e vencimentos</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    {items.length}
                </span>
            </div>

            {items.length===0 ? (
                <Empty text="Nenhum vencimento próximo." />
            ) : (
                <div className="divide-y divide-slate-100">
                    {items.map((item)=>(
                        <Link
                            key={item.id}
                            to={item.href}
                            className="block px-5 py-4 transition hover:bg-slate-50"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-800">
                                        {item.document}
                                    </div>
                                    <div className="mt-1 truncate text-xs text-slate-400">
                                        {item.entity_name}
                                    </div>
                                </div>
                                <AlertBadge alert={item} />
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                                {dateLabel(item.expires_at)}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function Panel({
    title,href,children,
}: {
    title:string;
    href:string;
    children:ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">{title}</h2>
                <Link to={href} className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                    Ver todos
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
            {children}
        </div>
    );
}

function StatusBadge({ status }: { status:string }) {
    const classes=
        status==="ativo" || status==="assinado" || status==="finalizado"
            ? "bg-emerald-50 text-emerald-700"
            : status==="enviado"
              ? "bg-blue-50 text-blue-700"
              : status==="cancelado" || status==="expirado"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700";

    return (
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
            {statusLabel(status)}
        </span>
    );
}

function AlertBadge({ alert }: { alert:DashboardAlert }) {
    if(alert.status==="expired"){
        return (
            <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                {Math.abs(alert.days)}d vencido
            </span>
        );
    }

    if(alert.status==="today"){
        return (
            <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                Hoje
            </span>
        );
    }

    return (
        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {alert.days}d
        </span>
    );
}

function Empty({ text }: { text:string }) {
    return <div className="px-5 py-8 text-center text-sm text-slate-400">{text}</div>;
}

function LoadingDashboard() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length:6 }).map((_,index)=>(
                <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
        </div>
    );
}

function contractType(value:string):string {
    return {
        aluguer:"Contrato de aluguer",
        prestacao_servico:"Prestação de serviços",
        checklist_entrega:"Checklist de entrega",
        checklist_devolucao:"Checklist de devolução",
    }[value] ?? value;
}

function statusLabel(value:string):string {
    return {
        rascunho:"Rascunho",
        ativo:"Ativo",
        enviado:"Enviado",
        assinado:"Assinado",
        finalizado:"Finalizado",
        cancelado:"Cancelado",
        expirado:"Expirado",
        encerrado:"Encerrado",
        renovado:"Renovado",
    }[value] ?? value;
}

function dateLabel(value:string):string {
    return new Intl.DateTimeFormat("pt-PT").format(
        new Date(`${value.slice(0,10)}T12:00:00`),
    );
}
