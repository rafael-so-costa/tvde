import {useQuery} from "@tanstack/react-query";
import {Link} from "react-router-dom";
import {
    AlertTriangle,Car,FileWarning,LoaderCircle,ReceiptText,
    ShieldAlert,TriangleAlert,Wrench,
} from "lucide-react";
import api from "../lib/api";
import {useTenant} from "../contexts/TenantContext";
import AdDisplay from "../components/ads/AdDisplay";

interface Documento{
    codigo:string;
    nome:string;
    origem:string;
    referencia:string|null;
    valid_until:string;
    dias_restantes:number;
    vencido:boolean;
}

interface Veiculo{
    id:string;
    matricula:string;
    marca:string|null;
    modelo:string|null;
    ativo:boolean;
    status_cadastro:string;
    km_atual:number|null;
    motoristas:{id:string;nome:string}[];
    multas_abertas:number;
    sinistros_abertos:number;
    manutencoes_abertas:number;
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

interface DashboardData{
    proprietario:{
        id:string;
        tipo:string;
        nome:string|null;
        ativo:boolean;
        status_cadastro:string;
    };
    frota:{
        total:number;
        ativos:number;
        inativos:number;
        incompletos:number;
        items:Veiculo[];
    };
    contratos:{
        ativos:number;
        motoristas_vinculados:number;
    };
    multas:{
        pendentes:number;
        contestadas:number;
        total_abertas:number;
    };
    sinistros:{
        abertos:number;
        em_andamento:number;
        total_abertos:number;
    };
    manutencoes:{
        abertas:number;
        criticas:number;
    };
    documentos:{
        vencidos:number;
        a_vencer_30_dias:number;
        proximo_vencimento:Documento|null;
        atencao:Documento[];
    };
    alertas:{
        total:number;
        nao_lidos:number;
        items:Alerta[];
    };
}

export default function ProprietarioDashboardPage(){
    const {tenant}=useTenant();

    const query=useQuery({
        queryKey:["proprietario-dashboard",tenant?.id],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get("/api/portal/proprietario/dashboard");
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
                <button type="button" onClick={()=>query.refetch()} className="mt-5 h-10 px-4 rounded-xl bg-indigo-600 text-sm font-semibold text-white">
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
                <h1 className="mt-1 text-2xl font-bold text-slate-950">Olá, {data.proprietario.nome||"Proprietário"}</h1>
                <p className="mt-1 text-sm text-slate-500">Resumo da sua frota, ocorrências e pendências.</p>
            </div>

            <AdDisplay surface="owner_portal"/>

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard icon={Car} label="Frota" value={String(data.frota.total)} detail={`${data.frota.ativos} veículo(s) ativo(s)`}/>
                <SummaryCard icon={ReceiptText} label="Multas" value={String(data.multas.total_abertas)} detail="em aberto" to="/portal/proprietario/multas" warning={data.multas.total_abertas>0}/>
                <SummaryCard icon={AlertTriangle} label="Sinistros" value={String(data.sinistros.total_abertos)} detail="em aberto" to="/portal/proprietario/sinistros" warning={data.sinistros.total_abertos>0}/>
                <SummaryCard icon={ShieldAlert} label="Alertas" value={String(data.alertas.total)} detail={`${data.alertas.nao_lidos} não lido(s)`} warning={data.alertas.total>0}/>
            </div>

            <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6">
                <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">Minha frota</h2>
                            <p className="mt-1 text-sm text-slate-500">{data.contratos.motoristas_vinculados} vínculo(s) ativo(s) com motorista</p>
                        </div>
                        <Car className="w-5 h-5 text-indigo-600"/>
                    </div>

                    {data.frota.items.length?(
                        <div className="divide-y divide-slate-100">
                            {data.frota.items.map(veiculo=>(
                                <div key={veiculo.id} className="p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900">{veiculo.matricula}</p>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${veiculo.ativo?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>
                                                    {veiculo.ativo?"Ativo":"Inativo"}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-500">{[veiculo.marca,veiculo.modelo].filter(Boolean).join(" ")||"Veículo"}</p>
                                        </div>

                                        <div className="flex gap-4 text-xs text-slate-500">
                                            <span>{veiculo.multas_abertas} multa(s)</span>
                                            <span>{veiculo.sinistros_abertos} sinistro(s)</span>
                                            <span>{veiculo.manutencoes_abertas} manutenção(ões)</span>
                                        </div>
                                    </div>

                                    {veiculo.motoristas.length>0&&(
                                        <div className="mt-3 text-xs text-slate-500">
                                            Motorista(s): {veiculo.motoristas.map(item=>item.nome).join(", ")}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ):(
                        <EmptyState icon={Car} text="Não existem veículos associados ao seu cadastro."/>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-3">
                        <Wrench className="w-5 h-5 text-indigo-600"/>
                        <h2 className="font-bold text-slate-900">Estado operacional</h2>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <Metric label="Veículos ativos" value={data.frota.ativos}/>
                        <Metric label="Cadastros incompletos" value={data.frota.incompletos} danger={data.frota.incompletos>0}/>
                        <Metric label="Manutenções abertas" value={data.manutencoes.abertas} danger={data.manutencoes.abertas>0}/>
                        <Metric label="Manutenções críticas" value={data.manutencoes.criticas} danger={data.manutencoes.criticas>0}/>
                    </div>

                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-400">Contratos/vínculos ativos</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{data.contratos.ativos}</p>
                    </div>
                </section>
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <FileWarning className="w-5 h-5 text-indigo-600"/>
                            <h2 className="font-bold text-slate-900">Documentos</h2>
                        </div>

                        {(data.documentos.vencidos>0||data.documentos.a_vencer_30_dias>0)&&(
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Requer atenção</span>
                        )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                        <Metric label="Vencidos" value={data.documentos.vencidos} danger={data.documentos.vencidos>0}/>
                        <Metric label="A vencer em 30 dias" value={data.documentos.a_vencer_30_dias} danger={data.documentos.a_vencer_30_dias>0}/>
                    </div>

                    {data.documentos.atencao.length>0&&(
                        <div className="mt-5 space-y-3">
                            {data.documentos.atencao.slice(0,5).map((documento,index)=>(
                                <div key={`${documento.codigo}-${documento.referencia??"proprietario"}-${index}`} className="rounded-xl bg-slate-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{documento.nome}</p>
                                            {documento.referencia&&<p className="mt-1 text-xs text-slate-400">{documento.referencia}</p>}
                                        </div>
                                        <span className={`text-xs font-semibold ${documento.vencido?"text-red-600":"text-amber-600"}`}>
                                            {documentLabel(documento)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-indigo-600"/>
                        <h2 className="font-bold text-slate-900">Alertas e pendências</h2>
                    </div>

                    {data.alertas.items.length?(
                        <div className="mt-5 space-y-3">
                            {data.alertas.items.map(alert=>(
                                <div key={alert.id} className="rounded-xl border border-slate-100 p-4">
                                    <div className="flex items-start gap-3">
                                        <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${severityClass(alert.severity)}`}/>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
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

            <div className="grid sm:grid-cols-2 gap-4">
                <QuickLink to="/portal/proprietario/multas" title="Multas" text={`${data.multas.total_abertas} ocorrência(s) em aberto.`}/>
                <QuickLink to="/portal/proprietario/sinistros" title="Sinistros" text={`${data.sinistros.total_abertos} processo(s) em aberto.`}/>
            </div>
        </div>
    );
}

function SummaryCard({icon:Icon,label,value,detail,to,warning=false}:{
    icon:typeof Car;
    label:string;
    value:string;
    detail:string;
    to?:string;
    warning?:boolean;
}){
    const card=(
        <div className="h-full rounded-2xl border border-slate-200 bg-white p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${warning?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600"}`}>
                <Icon className="w-5 h-5"/>
            </div>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
    );

    return to?<Link to={to} className="block hover:-translate-y-0.5 transition">{card}</Link>:card;
}

function Metric({label,value,danger=false}:{label:string;value:number;danger?:boolean}){
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${danger?"text-red-600":"text-slate-900"}`}>{value}</p>
        </div>
    );
}

function EmptyState({icon:Icon,text}:{icon:typeof Car;text:string}){
    return (
        <div className="py-10 text-center">
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

function documentLabel(documento:Documento){
    if(documento.vencido) return `Vencido há ${Math.abs(documento.dias_restantes)} dia(s)`;
    if(documento.dias_restantes===0) return "Vence hoje";
    return `Vence em ${documento.dias_restantes} dia(s)`;
}

function dateTimeLabel(value:string){
    return new Intl.DateTimeFormat("pt-PT",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
}

function severityClass(value:string){
    if(value==="critical") return "bg-red-600";
    if(value==="high") return "bg-orange-500";
    if(value==="medium") return "bg-amber-400";
    return "bg-slate-400";
}
