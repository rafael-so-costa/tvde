import {useQuery} from "@tanstack/react-query";
import {Link} from "react-router-dom";
import {
    AlertTriangle,CalendarClock,Car,Clock3,FileText,LoaderCircle,
    ReceiptText,ShieldAlert,TriangleAlert,
} from "lucide-react";
import api from "../lib/api";
import {useTenant} from "../contexts/TenantContext";
import AdDisplay from "../components/ads/AdDisplay";

interface DashboardData{
    motorista:{id:string;nome:string;ativo:boolean;status_cadastro:string};
    expediente:{
        em_servico:boolean;
        desde:string|null;
        registos_hoje:number;
        ultimo_registo:{id:string;tipo:string;data_hora:string|null}|null;
    };
    veiculo:{
        id:string;matricula:string;marca:string|null;modelo:string|null;
        ativo:boolean;status_cadastro:string;
    }|null;
    contrato:{
        id:string;tipo:string;status:string;data_inicio:string|null;
        data_fim:string|null;pdf_disponivel:boolean;
    }|null;
    documentos:{
        vencidos:number;
        a_vencer_30_dias:number;
        proximo:Documento|null;
        items:Documento[];
    };
    multas:{pendentes:number;contestadas:number;total_abertas:number};
    manutencoes:{abertas:number;proxima:Manutencao|null};
    alertas:{total:number;nao_lidos:number;items:Alerta[]};
}

interface Documento{
    codigo:string;
    nome:string;
    origem:string;
    valid_until:string;
    dias_restantes:number;
    vencido:boolean;
}

interface Manutencao{
    id:string;
    numero_ordem:string|null;
    tipo_servico:string;
    status:string;
    prioridade:string;
    data_agendada:string|null;
}

interface Alerta{
    id:string;
    severity:string;
    category:string;
    title:string;
    message:string|null;
    due_at:string|null;
    action_url:string|null;
}

export default function MotoristaDashboardPage(){
    const {tenant}=useTenant();

    const query=useQuery({
        queryKey:["motorista-dashboard",tenant?.id],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get("/api/portal/motorista/dashboard");
            return response.data.data as DashboardData;
        },
    });

    if(query.isLoading){
        return <div className="py-24 flex justify-center"><LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/></div>;
    }

    if(query.isError||!query.data){
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <TriangleAlert className="w-10 h-10 mx-auto text-red-500"/>
                <h1 className="mt-4 font-bold text-slate-900">Não foi possível carregar o dashboard</h1>
                <button type="button" onClick={()=>query.refetch()} className="mt-5 h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                    Tentar novamente
                </button>
            </div>
        );
    }

    const data=query.data;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <p className="text-sm text-slate-500">{tenant?.nome}</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-950">Olá, {data.motorista.nome}</h1>
                <p className="mt-1 text-sm text-slate-500">Aqui está o resumo da sua atividade e das pendências que precisam da sua atenção.</p>
            </div>
            <AdDisplay surface="driver_portal"/>

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard
                    icon={Clock3}
                    label="Expediente"
                    value={data.expediente.em_servico?"Em serviço":"Fora de serviço"}
                    detail={data.expediente.em_servico&&data.expediente.desde?`Desde ${timeLabel(data.expediente.desde)}`:`${data.expediente.registos_hoje} registo(s) hoje`}
                    href="/portal/motorista/expediente"
                    tone={data.expediente.em_servico?"success":"neutral"}
                />

                <SummaryCard
                    icon={ReceiptText}
                    label="Multas"
                    value={String(data.multas.total_abertas)}
                    detail={data.multas.total_abertas===1?"multa em aberto":"multas em aberto"}
                    href="/portal/motorista/multas"
                    tone={data.multas.total_abertas>0?"warning":"neutral"}
                />

                <SummaryCard
                    icon={CalendarClock}
                    label="Manutenções"
                    value={String(data.manutencoes.abertas)}
                    detail={data.manutencoes.abertas===1?"manutenção em aberto":"manutenções em aberto"}
                    tone={data.manutencoes.abertas>0?"warning":"neutral"}
                />

                <SummaryCard
                    icon={ShieldAlert}
                    label="Alertas"
                    value={String(data.alertas.total)}
                    detail={`${data.alertas.nao_lidos} não lido(s)`}
                    tone={data.alertas.total>0?"danger":"neutral"}
                />
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <Car className="w-5 h-5 text-indigo-600"/>
                        <h2 className="font-bold text-slate-900">Veículo atual</h2>
                    </div>

                    {data.veiculo?(
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <p className="text-2xl font-bold text-slate-950">{data.veiculo.matricula}</p>
                                    <p className="mt-1 text-sm text-slate-500">{[data.veiculo.marca,data.veiculo.modelo].filter(Boolean).join(" ")||"Veículo"}</p>
                                </div>
                                <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${data.veiculo.ativo?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>
                                    {data.veiculo.ativo?"Ativo":"Inativo"}
                                </span>
                            </div>

                            {data.contrato&&(
                                <div className="mt-6 border-t border-slate-100 pt-5">
                                    <p className="text-xs uppercase tracking-wider text-slate-400">Contrato associado</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                        <span className="font-medium text-slate-800">{contractType(data.contrato.tipo)}</span>
                                        <span className="text-slate-500">Estado: {statusLabel(data.contrato.status)}</span>
                                        {data.contrato.data_fim&&<span className="text-slate-500">Até {dateLabel(data.contrato.data_fim)}</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ):(
                        <EmptyState icon={Car} text="Não existe veículo ativo associado à sua conta."/>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-indigo-600"/>
                            <h2 className="font-bold text-slate-900">Documentos</h2>
                        </div>
                        {(data.documentos.vencidos>0||data.documentos.a_vencer_30_dias>0)&&(
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                Requer atenção
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <Metric label="Vencidos" value={data.documentos.vencidos} danger={data.documentos.vencidos>0}/>
                        <Metric label="A vencer em 30 dias" value={data.documentos.a_vencer_30_dias} danger={data.documentos.a_vencer_30_dias>0}/>
                    </div>

                    {data.documentos.proximo?(
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-wider text-slate-400">Próximo vencimento</p>
                            <p className="mt-2 font-semibold text-slate-900">{data.documentos.proximo.nome}</p>
                            <p className={`mt-1 text-sm ${data.documentos.proximo.vencido?"text-red-600":"text-slate-500"}`}>
                                {documentStatus(data.documentos.proximo)}
                            </p>
                        </div>
                    ):(
                        <EmptyState icon={FileText} text="Não existem documentos com validade registada."/>
                    )}
                </section>
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <CalendarClock className="w-5 h-5 text-indigo-600"/>
                        <h2 className="font-bold text-slate-900">Manutenção</h2>
                    </div>

                    {data.manutencoes.proxima?(
                        <div>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-slate-900">{data.manutencoes.proxima.tipo_servico}</p>
                                    {data.manutencoes.proxima.numero_ordem&&<p className="mt-1 text-xs text-slate-400">Ordem {data.manutencoes.proxima.numero_ordem}</p>}
                                </div>
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    {statusLabel(data.manutencoes.proxima.status)}
                                </span>
                            </div>

                            <div className="mt-4 text-sm text-slate-500 space-y-1">
                                <p>Prioridade: {statusLabel(data.manutencoes.proxima.prioridade)}</p>
                                {data.manutencoes.proxima.data_agendada&&<p>Agendada para {dateLabel(data.manutencoes.proxima.data_agendada)}</p>}
                            </div>
                        </div>
                    ):(
                        <EmptyState icon={CalendarClock} text="Não existem manutenções em aberto."/>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <AlertTriangle className="w-5 h-5 text-indigo-600"/>
                        <h2 className="font-bold text-slate-900">Alertas e pendências</h2>
                    </div>

                    {data.alertas.items.length?(
                        <div className="space-y-3">
                            {data.alertas.items.map(alert=>(
                                <div key={alert.id} className="rounded-xl border border-slate-100 p-4">
                                    <div className="flex items-start gap-3">
                                        <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${severityClass(alert.severity)}`}/>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-slate-900">{alert.title}</p>
                                            {alert.message&&<p className="mt-1 text-sm text-slate-500">{alert.message}</p>}
                                            {alert.due_at&&<p className="mt-2 text-xs text-slate-400">Prazo: {dateTimeLabel(alert.due_at)}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ):(
                        <EmptyState icon={AlertTriangle} text="Não existem alertas pendentes."/>
                    )}
                </section>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                <QuickLink to="/portal/motorista/expediente" title="Expediente" text="Consultar e registar o seu horário."/>
                <QuickLink to="/portal/motorista/registo-criminal" title="Registo criminal" text="Consultar validade e enviar documentos."/>
                <QuickLink to="/portal/motorista/recibos-verdes" title="Recibos verdes" text="Consultar e enviar os seus recibos."/>
            </div>
        </div>
    );
}

function SummaryCard({icon:Icon,label,value,detail,href,tone="neutral"}:{
    icon:typeof Clock3;
    label:string;
    value:string;
    detail:string;
    href?:string;
    tone?:"neutral"|"success"|"warning"|"danger";
}){
    const styles={
        neutral:"bg-slate-100 text-slate-600",
        success:"bg-emerald-100 text-emerald-700",
        warning:"bg-amber-100 text-amber-700",
        danger:"bg-red-100 text-red-700",
    };

    const content=(
        <div className="rounded-2xl border border-slate-200 bg-white p-5 h-full">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles[tone]}`}><Icon className="w-5 h-5"/></div>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
    );

    return href?<Link to={href} className="block hover:-translate-y-0.5 transition">{content}</Link>:content;
}

function Metric({label,value,danger}:{label:string;value:number;danger:boolean}){
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${danger?"text-red-600":"text-slate-900"}`}>{value}</p>
        </div>
    );
}

function EmptyState({icon:Icon,text}:{icon:typeof Car;text:string}){
    return (
        <div className="py-8 text-center">
            <Icon className="w-8 h-8 mx-auto text-slate-300"/>
            <p className="mt-3 text-sm text-slate-500">{text}</p>
        </div>
    );
}

function QuickLink({to,title,text}:{to:string;title:string;text:string}){
    return (
        <Link to={to} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition">
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
        </Link>
    );
}

function dateLabel(value:string){
    return new Intl.DateTimeFormat("pt-PT",{dateStyle:"medium"}).format(new Date(`${value}T12:00:00`));
}

function dateTimeLabel(value:string){
    return new Intl.DateTimeFormat("pt-PT",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
}

function timeLabel(value:string){
    return new Intl.DateTimeFormat("pt-PT",{hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}

function statusLabel(value:string){
    return value.replaceAll("_"," ").replace(/\b\w/g,char=>char.toUpperCase());
}

function contractType(value:string){
    if(value==="aluguer") return "Contrato de aluguer";
    if(value==="prestacao_servico") return "Prestação de serviço";
    return statusLabel(value);
}

function documentStatus(documento:Documento){
    if(documento.vencido) return `Vencido há ${Math.abs(documento.dias_restantes)} dia(s)`;
    if(documento.dias_restantes===0) return "Vence hoje";
    return `Vence em ${documento.dias_restantes} dia(s) · ${dateLabel(documento.valid_until)}`;
}

function severityClass(value:string){
    if(value==="critical") return "bg-red-600";
    if(value==="high") return "bg-orange-500";
    if(value==="medium") return "bg-amber-400";
    return "bg-slate-400";
}
