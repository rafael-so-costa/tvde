import {useMemo,useState} from "react";
import {
    AlertCircle,
    BarChart3,
    CalendarDays,
    Car,
    Download,
    FileWarning,
    LoaderCircle,
    Printer,
    RefreshCw,
    ShieldAlert,
    UsersRound,
    WalletCards,
} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import api from "../lib/api";
import {useTenant} from "../contexts/TenantContext";
import {useCurrentPermissions} from "../hooks/useCurrentPermissions";

type Tab=
    |"resumo"
    |"documentos"
    |"veiculos"
    |"motoristas"
    |"ocorrencias"
    |"alugueres";

interface ReportPayload {
    periodo?:{
        inicio:string;
        fim:string;
    };
    dias?:number;
    dias_documentos?:number;
    kpis:Record<string,number>;
    data?:any[];
}

interface MotoristaOption {
    id:string;
    nome_completo:string;
}

interface VeiculoOption {
    id:string;
    matricula:string;
    marca:string|null;
    modelo:string|null;
}

interface ProprietarioOption {
    id:string;
    tipo:string;
    nome_completo:string|null;
    nome_empresa:string|null;
}

const tabs=[
    {
        id:"resumo" as Tab,
        label:"Visão Geral",
        icon:BarChart3,
    },
    {
        id:"documentos" as Tab,
        label:"Documentação",
        icon:FileWarning,
    },
    {
        id:"veiculos" as Tab,
        label:"Veículos",
        icon:Car,
    },
    {
        id:"motoristas" as Tab,
        label:"Motoristas",
        icon:UsersRound,
    },
    {
        id:"ocorrencias" as Tab,
        label:"Ocorrências",
        icon:ShieldAlert,
    },
    {
        id:"alugueres" as Tab,
        label:"Alugueres",
        icon:WalletCards,
    },
];

export default function RelatoriosPage(){
    const {tenant}=useTenant();
    const permissions=useCurrentPermissions();

    const [tab,setTab]=useState<Tab>("resumo");

    const [inicio,setInicio]=useState(
        startOfMonth()
    );

    const [fim,setFim]=useState(
        today()
    );

    const [dias,setDias]=useState("30");
    const [entidade,setEntidade]=useState("");
    const [situacao,setSituacao]=useState("");

    const [ativo,setAtivo]=useState("");
    const [disponibilidade,setDisponibilidade]=useState("");
    const [statusCadastro,setStatusCadastro]=useState("");

    const [tipoOcorrencia,setTipoOcorrencia]=useState("");
    const [statusOcorrencia,setStatusOcorrencia]=useState("");

    const [statusAluguer,setStatusAluguer]=useState("");

    const [motoristaId,setMotoristaId]=useState("");
    const [veiculoId,setVeiculoId]=useState("");
    const [proprietarioId,setProprietarioId]=useState("");

    const canView=
        permissions.can(
            "relatorios",
            "visualizar"
        );

    const params=useMemo(
        ()=>buildParams(
            tab,
            {
                inicio,
                fim,
                dias,
                entidade,
                situacao,
                ativo,
                disponibilidade,
                statusCadastro,
                tipoOcorrencia,
                statusOcorrencia,
                statusAluguer,
                motoristaId,
                veiculoId,
                proprietarioId,
            }
        ),
        [
            tab,
            inicio,
            fim,
            dias,
            entidade,
            situacao,
            ativo,
            disponibilidade,
            statusCadastro,
            tipoOcorrencia,
            statusOcorrencia,
            statusAluguer,
            motoristaId,
            veiculoId,
            proprietarioId,
        ]
    );

    const reportQuery=useQuery({
        queryKey:[
            "relatorios",
            tenant?.id,
            tab,
            params,
        ],

        enabled:
            Boolean(tenant?.id) &&
            canView,

        queryFn:async()=>{
            const response=
                await api.get(
                    `/api/relatorios/${tab}`,
                    {
                        params,
                    }
                );

            return response.data
                .data as ReportPayload;
        },
    });

    const motoristasQuery=useQuery({
        queryKey:[
            "relatorios-opcoes-motoristas",
            tenant?.id,
        ],

        enabled:
            Boolean(tenant?.id) &&
            canView &&
            permissions.can(
                "motoristas",
                "visualizar"
            ),

        queryFn:async()=>{
            const response=
                await api.get(
                    "/api/motoristas"
                );

            return response.data
                .data as MotoristaOption[];
        },
    });

    const veiculosQuery=useQuery({
        queryKey:[
            "relatorios-opcoes-veiculos",
            tenant?.id,
        ],

        enabled:
            Boolean(tenant?.id) &&
            canView &&
            permissions.can(
                "veiculos",
                "visualizar"
            ),

        queryFn:async()=>{
            const response=
                await api.get(
                    "/api/veiculos"
                );

            return response.data
                .data as VeiculoOption[];
        },
    });

    const proprietariosQuery=useQuery({
        queryKey:[
            "relatorios-opcoes-proprietarios",
            tenant?.id,
        ],

        enabled:
            Boolean(tenant?.id) &&
            canView &&
            permissions.can(
                "proprietarios",
                "visualizar"
            ),

        queryFn:async()=>{
            const response=
                await api.get(
                    "/api/proprietarios"
                );

            return response.data
                .data as ProprietarioOption[];
        },
    });

    function clearFilters(){
        setInicio(
            startOfMonth()
        );

        setFim(
            today()
        );

        setDias("30");
        setEntidade("");
        setSituacao("");
        setAtivo("");
        setDisponibilidade("");
        setStatusCadastro("");
        setTipoOcorrencia("");
        setStatusOcorrencia("");
        setStatusAluguer("");
        setMotoristaId("");
        setVeiculoId("");
        setProprietarioId("");
    }

    function exportCsv(){
        if(
            !reportQuery.data
        ){
            return;
        }

        const result=
            csvForReport(
                tab,
                reportQuery.data
            );

        downloadCsv(
            `frotapro-${tab}-${today()}.csv`,
            result.headers,
            result.rows
        );
    }

    if(
        permissions.isLoading
    ){
        return (
            <Loading/>
        );
    }

    if(!tenant){
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
                    Selecione uma organização para consultar os relatórios.
                </div>
            </div>
        );
    }

    if(!canView){
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                    <AlertCircle className="h-6 w-6 text-red-500"/>

                    <h1 className="mt-3 font-semibold text-red-900">
                        Sem acesso aos relatórios
                    </h1>

                    <p className="mt-1 text-sm text-red-700">
                        O seu perfil não possui a permissão necessária para consultar este módulo.
                    </p>
                </div>
            </div>
        );
    }

    const report=
        reportQuery.data;

    return (
        <div className="mx-auto max-w-7xl print:max-w-none">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:mb-5">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600 print:hidden">
                        Análise operacional
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Relatórios
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Indicadores e dados consolidados de {tenant.nome}.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={()=>
                            reportQuery.refetch()
                        }
                        disabled={
                            reportQuery.isFetching
                        }
                        className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
                    >
                        <RefreshCw
                            className={[
                                "h-4 w-4",
                                reportQuery.isFetching
                                    ?"animate-spin"
                                    :"",
                            ].join(" ")}
                        />

                        Atualizar
                    </button>

                    <button
                        type="button"
                        onClick={exportCsv}
                        disabled={!report}
                        className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    >
                        <Download className="h-4 w-4"/>
                        CSV
                    </button>

                    <button
                        type="button"
                        onClick={()=>
                            window.print()
                        }
                        disabled={!report}
                        className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        <Printer className="h-4 w-4"/>
                        Imprimir / PDF
                    </button>
                </div>
            </div>

            <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 print:hidden">
                <div className="flex min-w-max gap-1">
                    {tabs.map(item=>{
                        const Icon=
                            item.icon;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={()=>
                                    setTab(
                                        item.id
                                    )
                                }
                                className={[
                                    "flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                                    tab===item.id
                                        ?"bg-indigo-600 text-white"
                                        :"text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                ].join(" ")}
                            >
                                <Icon className="h-4 w-4"/>
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <Filters
                tab={tab}
                inicio={inicio}
                fim={fim}
                dias={dias}
                entidade={entidade}
                situacao={situacao}
                ativo={ativo}
                disponibilidade={disponibilidade}
                statusCadastro={statusCadastro}
                tipoOcorrencia={tipoOcorrencia}
                statusOcorrencia={statusOcorrencia}
                statusAluguer={statusAluguer}
                motoristaId={motoristaId}
                veiculoId={veiculoId}
                proprietarioId={proprietarioId}
                motoristas={
                    motoristasQuery.data??
                    []
                }
                veiculos={
                    veiculosQuery.data??
                    []
                }
                proprietarios={
                    proprietariosQuery.data??
                    []
                }
                canMotoristas={
                    permissions.can(
                        "motoristas",
                        "visualizar"
                    )
                }
                canVeiculos={
                    permissions.can(
                        "veiculos",
                        "visualizar"
                    )
                }
                canProprietarios={
                    permissions.can(
                        "proprietarios",
                        "visualizar"
                    )
                }
                onInicio={setInicio}
                onFim={setFim}
                onDias={setDias}
                onEntidade={setEntidade}
                onSituacao={setSituacao}
                onAtivo={setAtivo}
                onDisponibilidade={setDisponibilidade}
                onStatusCadastro={setStatusCadastro}
                onTipoOcorrencia={setTipoOcorrencia}
                onStatusOcorrencia={setStatusOcorrencia}
                onStatusAluguer={setStatusAluguer}
                onMotoristaId={setMotoristaId}
                onVeiculoId={setVeiculoId}
                onProprietarioId={setProprietarioId}
                onClear={clearFilters}
            />

            <div className="hidden print:block mb-5 text-sm text-slate-500">
                Gerado em {dateLabel(today())}
                {report?.periodo&&(
                    <>
                        {" · "}Período:{" "}
                        {dateLabel(
                            report.periodo.inicio
                        )}
                        {" a "}
                        {dateLabel(
                            report.periodo.fim
                        )}
                    </>
                )}
            </div>

            {reportQuery.isLoading?(
                <Loading/>
            ):reportQuery.isError?(
                <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-500"/>

                    <p className="mt-3 text-sm text-red-700">
                        Não foi possível carregar este relatório.
                    </p>

                    <button
                        type="button"
                        onClick={()=>
                            reportQuery.refetch()
                        }
                        className="mt-4 h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white"
                    >
                        Tentar novamente
                    </button>
                </div>
            ):report?(
                <>
                    <Kpis
                        tab={tab}
                        data={report.kpis}
                    />

                    {tab==="resumo"&&(
                        <Resumo
                            report={report}
                        />
                    )}

                    {tab==="documentos"&&(
                        <DocumentosTable
                            rows={
                                report.data??
                                []
                            }
                        />
                    )}

                    {tab==="veiculos"&&(
                        <VeiculosTable
                            rows={
                                report.data??
                                []
                            }
                        />
                    )}

                    {tab==="motoristas"&&(
                        <MotoristasTable
                            rows={
                                report.data??
                                []
                            }
                        />
                    )}

                    {tab==="ocorrencias"&&(
                        <OcorrenciasTable
                            rows={
                                report.data??
                                []
                            }
                        />
                    )}

                    {tab==="alugueres"&&(
                        <AlugueresTable
                            rows={
                                report.data??
                                []
                            }
                        />
                    )}
                </>
            ):null}
        </div>
    );
}

function Filters({
    tab,
    inicio,
    fim,
    dias,
    entidade,
    situacao,
    ativo,
    disponibilidade,
    statusCadastro,
    tipoOcorrencia,
    statusOcorrencia,
    statusAluguer,
    motoristaId,
    veiculoId,
    proprietarioId,
    motoristas,
    veiculos,
    proprietarios,
    canMotoristas,
    canVeiculos,
    canProprietarios,
    onInicio,
    onFim,
    onDias,
    onEntidade,
    onSituacao,
    onAtivo,
    onDisponibilidade,
    onStatusCadastro,
    onTipoOcorrencia,
    onStatusOcorrencia,
    onStatusAluguer,
    onMotoristaId,
    onVeiculoId,
    onProprietarioId,
    onClear,
}:{
    tab:Tab;
    inicio:string;
    fim:string;
    dias:string;
    entidade:string;
    situacao:string;
    ativo:string;
    disponibilidade:string;
    statusCadastro:string;
    tipoOcorrencia:string;
    statusOcorrencia:string;
    statusAluguer:string;
    motoristaId:string;
    veiculoId:string;
    proprietarioId:string;
    motoristas:MotoristaOption[];
    veiculos:VeiculoOption[];
    proprietarios:ProprietarioOption[];
    canMotoristas:boolean;
    canVeiculos:boolean;
    canProprietarios:boolean;
    onInicio:(value:string)=>void;
    onFim:(value:string)=>void;
    onDias:(value:string)=>void;
    onEntidade:(value:string)=>void;
    onSituacao:(value:string)=>void;
    onAtivo:(value:string)=>void;
    onDisponibilidade:(value:string)=>void;
    onStatusCadastro:(value:string)=>void;
    onTipoOcorrencia:(value:string)=>void;
    onStatusOcorrencia:(value:string)=>void;
    onStatusAluguer:(value:string)=>void;
    onMotoristaId:(value:string)=>void;
    onVeiculoId:(value:string)=>void;
    onProprietarioId:(value:string)=>void;
    onClear:()=>void;
}){
    const hasPeriod=
        tab!=="documentos";

    return (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 print:hidden">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-indigo-600"/>

                    <h2 className="text-sm font-bold text-slate-900">
                        Filtros
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={onClear}
                    className="text-xs font-semibold text-indigo-600"
                >
                    Limpar
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {hasPeriod&&(
                    <>
                        <Filter label="Data inicial">
                            <input
                                type="date"
                                value={inicio}
                                onChange={event=>
                                    onInicio(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            />
                        </Filter>

                        <Filter label="Data final">
                            <input
                                type="date"
                                value={fim}
                                min={inicio}
                                onChange={event=>
                                    onFim(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            />
                        </Filter>
                    </>
                )}

                {tab==="documentos"&&(
                    <>
                        <Filter label="Antecedência">
                            <select
                                value={dias}
                                onChange={event=>
                                    onDias(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="7">7 dias</option>
                                <option value="15">15 dias</option>
                                <option value="30">30 dias</option>
                                <option value="60">60 dias</option>
                                <option value="90">90 dias</option>
                                <option value="180">180 dias</option>
                                <option value="365">365 dias</option>
                            </select>
                        </Filter>

                        <Filter label="Entidade">
                            <select
                                value={entidade}
                                onChange={event=>
                                    onEntidade(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">Todas</option>
                                <option value="empresa">Empresas</option>
                                <option value="proprietario">Proprietários</option>
                                <option value="motorista">Motoristas</option>
                                <option value="veiculo">Veículos</option>
                            </select>
                        </Filter>

                        <Filter label="Situação">
                            <select
                                value={situacao}
                                onChange={event=>
                                    onSituacao(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">Todas</option>
                                <option value="vencido">Vencido</option>
                                <option value="a_vencer">A vencer</option>
                                <option value="valido">Válido</option>
                            </select>
                        </Filter>
                    </>
                )}

                {tab==="veiculos"&&(
                    <>
                        <Filter label="Estado">
                            <select
                                value={ativo}
                                onChange={event=>
                                    onAtivo(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">Todos</option>
                                <option value="1">Ativos</option>
                                <option value="0">Inativos</option>
                            </select>
                        </Filter>

                        <Filter label="Disponibilidade">
                            <select
                                value={disponibilidade}
                                onChange={event=>
                                    onDisponibilidade(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">Todas</option>
                                <option value="disponivel">Disponível</option>
                                <option value="alugado">Alugado</option>
                                <option value="manutencao">Manutenção</option>
                                <option value="indisponivel">Indisponível</option>
                            </select>
                        </Filter>
                    </>
                )}

                {tab==="motoristas"&&(
                    <>
                        <Filter label="Estado">
                            <select
                                value={ativo}
                                onChange={event=>
                                    onAtivo(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">Todos</option>
                                <option value="1">Ativos</option>
                                <option value="0">Inativos</option>
                            </select>
                        </Filter>

                        <Filter label="Cadastro">
                            <select
                                value={statusCadastro}
                                onChange={event=>
                                    onStatusCadastro(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">Todos</option>
                                <option value="ativo">Ativo</option>
                                <option value="pendente">Pendente</option>
                                <option value="incompleto">Incompleto</option>
                            </select>
                        </Filter>
                    </>
                )}

                {tab==="ocorrencias"&&(
                    <>
                        <Filter label="Tipo">
                            <select
                                value={tipoOcorrencia}
                                onChange={event=>
                                    onTipoOcorrencia(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">Multas e sinistros</option>
                                <option value="multa">Multas</option>
                                <option value="sinistro">Sinistros</option>
                            </select>
                        </Filter>

                        <Filter label="Estado">
                            <select
                                value={statusOcorrencia}
                                onChange={event=>
                                    onStatusOcorrencia(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">Todos</option>

                                <optgroup label="Multas">
                                    <option value="pendente">Pendente</option>
                                    <option value="paga">Paga</option>
                                    <option value="contestada">Contestada</option>
                                </optgroup>

                                <optgroup label="Sinistros">
                                    <option value="aberto">Aberto</option>
                                    <option value="em_andamento">Em andamento</option>
                                    <option value="encerrado">Encerrado</option>
                                </optgroup>
                            </select>
                        </Filter>
                    </>
                )}

                {tab==="alugueres"&&(
                    <Filter label="Estado">
                        <select
                            value={statusAluguer}
                            onChange={event=>
                                onStatusAluguer(
                                    event.target.value
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">Todos</option>
                            <option value="rascunho">Rascunho</option>
                            <option value="ativo">Ativo</option>
                            <option value="finalizado">Finalizado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </Filter>
                )}

                {[
                    "documentos",
                    "motoristas",
                    "ocorrencias",
                    "alugueres",
                ].includes(tab)&&
                    canMotoristas&&(
                    <Filter label="Motorista">
                        <select
                            value={motoristaId}
                            onChange={event=>
                                onMotoristaId(
                                    event.target.value
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">Todos</option>

                            {motoristas.map(item=>(
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.nome_completo}
                                </option>
                            ))}
                        </select>
                    </Filter>
                )}

                {[
                    "documentos",
                    "veiculos",
                    "ocorrencias",
                    "alugueres",
                ].includes(tab)&&
                    canVeiculos&&(
                    <Filter label="Veículo">
                        <select
                            value={veiculoId}
                            onChange={event=>
                                onVeiculoId(
                                    event.target.value
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">Todos</option>

                            {veiculos.map(item=>(
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.matricula}
                                    {item.marca
                                        ?` · ${item.marca} ${item.modelo??""}`
                                        :""
                                    }
                                </option>
                            ))}
                        </select>
                    </Filter>
                )}

                {tab==="veiculos"&&
                    canProprietarios&&(
                    <Filter label="Proprietário">
                        <select
                            value={proprietarioId}
                            onChange={event=>
                                onProprietarioId(
                                    event.target.value
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">Todos</option>

                            {proprietarios.map(item=>(
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {proprietarioName(
                                        item
                                    )}
                                </option>
                            ))}
                        </select>
                    </Filter>
                )}
            </div>
        </div>
    );
}

function Kpis({
    tab,
    data,
}:{
    tab:Tab;
    data:Record<string,number>;
}){
    const config=
        kpiConfig(
            tab
        );

    return (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 print:grid-cols-4">
            {config.map(item=>(
                <div
                    key={item.key}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {item.label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                        {item.money
                            ?money(
                                Number(
                                    data[item.key]??
                                    0
                                )
                            )
                            :number(
                                Number(
                                    data[item.key]??
                                    0
                                )
                            )
                        }
                    </p>
                </div>
            ))}
        </div>
    );
}

function Resumo({
    report,
}:{
    report:ReportPayload;
}){
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard
                title="Estrutura da frota"
                description="Dimensão atual da organização."
            >
                <SummaryLine
                    label="Empresas"
                    value={
                        report.kpis
                            .empresas??
                        0
                    }
                />

                <SummaryLine
                    label="Proprietários"
                    value={
                        report.kpis
                            .proprietarios??
                        0
                    }
                />

                <SummaryLine
                    label="Motoristas ativos"
                    value={
                        report.kpis
                            .motoristas_ativos??
                        0
                    }
                />

                <SummaryLine
                    label="Veículos ativos"
                    value={
                        report.kpis
                            .veiculos_ativos??
                        0
                    }
                />

                <SummaryLine
                    label="Alugueres ativos"
                    value={
                        report.kpis
                            .alugueres_ativos??
                        0
                    }
                />

                <SummaryLine
                    label="Contratos ativos"
                    value={
                        report.kpis
                            .contratos_ativos??
                        0
                    }
                />
            </ReportCard>

            <ReportCard
                title="Risco operacional"
                description="Ocorrências e pendências que merecem acompanhamento."
            >
                <SummaryLine
                    label="Documentos vencidos"
                    value={
                        report.kpis
                            .documentos_vencidos??
                        0
                    }
                    alert={
                        (
                            report.kpis
                                .documentos_vencidos??
                            0
                        )>0
                    }
                />

                <SummaryLine
                    label="Documentos a vencer"
                    value={
                        report.kpis
                            .documentos_a_vencer??
                        0
                    }
                />

                <SummaryLine
                    label="Manutenções abertas"
                    value={
                        report.kpis
                            .manutencoes_abertas??
                        0
                    }
                />

                <SummaryLine
                    label="Sinistros no período"
                    value={
                        report.kpis
                            .sinistros_periodo??
                        0
                    }
                />

                <SummaryLine
                    label="Valor das multas"
                    value={money(
                        report.kpis
                            .valor_multas_periodo??
                        0
                    )}
                />

                <SummaryLine
                    label="Custo de manutenção"
                    value={money(
                        report.kpis
                            .custo_manutencoes_periodo??
                        0
                    )}
                />
            </ReportCard>
        </div>
    );
}

function DocumentosTable({
    rows,
}:{
    rows:any[];
}){
    return (
        <TableCard
            title="Documentos monitorizados"
            empty="Nenhum documento encontrado para os filtros selecionados."
        >
            {rows.length>0&&(
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <Th>Entidade</Th>
                            <Th>Nome</Th>
                            <Th>Documento</Th>
                            <Th>Validade</Th>
                            <Th>Dias</Th>
                            <Th>Situação</Th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row,index)=>(
                            <tr
                                key={`${row.entidade}-${row.entidade_id}-${row.documento}-${index}`}
                                className="border-t border-slate-100"
                            >
                                <Td>
                                    {entityLabel(
                                        row.entidade
                                    )}
                                </Td>

                                <Td strong>
                                    {row.nome}
                                </Td>

                                <Td>
                                    {row.documento_label}
                                </Td>

                                <Td>
                                    {dateLabel(
                                        row.validade
                                    )}
                                </Td>

                                <Td>
                                    {row.dias_restantes}
                                </Td>

                                <Td>
                                    <Status
                                        value={
                                            row.situacao
                                        }
                                    />
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </TableCard>
    );
}

function VeiculosTable({
    rows,
}:{
    rows:any[];
}){
    return (
        <TableCard
            title="Desempenho por veículo"
            empty="Nenhum veículo encontrado."
        >
            {rows.length>0&&(
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <Th>Veículo</Th>
                            <Th>Proprietário</Th>
                            <Th>KM</Th>
                            <Th>Disponibilidade</Th>
                            <Th>Manutenções</Th>
                            <Th>Custo manutenção</Th>
                            <Th>Multas</Th>
                            <Th>Sinistros</Th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map(row=>(
                            <tr
                                key={row.id}
                                className="border-t border-slate-100"
                            >
                                <Td strong>
                                    {row.matricula}

                                    <div className="mt-1 text-xs font-normal text-slate-400">
                                        {[
                                            row.marca,
                                            row.modelo,
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                    </div>
                                </Td>

                                <Td>
                                    {row.proprietario
                                        ?.nome??
                                        "—"
                                    }
                                </Td>

                                <Td>
                                    {row.km_atual!==null
                                        ?`${number(
                                            row.km_atual
                                        )} km`
                                        :"—"
                                    }
                                </Td>

                                <Td>
                                    <Status
                                        value={
                                            row.disponibilidade
                                        }
                                    />
                                </Td>

                                <Td>
                                    {row.manutencoes_periodo}
                                    {row.manutencoes_abertas>0&&(
                                        <div className="mt-1 text-xs text-amber-600">
                                            {row.manutencoes_abertas} abertas
                                        </div>
                                    )}
                                </Td>

                                <Td>
                                    {money(
                                        row.custo_manutencao_periodo
                                    )}
                                </Td>

                                <Td>
                                    {row.multas_periodo}
                                    {row.valor_multas_periodo>0&&(
                                        <div className="mt-1 text-xs text-slate-400">
                                            {money(
                                                row.valor_multas_periodo
                                            )}
                                        </div>
                                    )}
                                </Td>

                                <Td>
                                    {row.sinistros_periodo}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </TableCard>
    );
}

function MotoristasTable({
    rows,
}:{
    rows:any[];
}){
    return (
        <TableCard
            title="Situação dos motoristas"
            empty="Nenhum motorista encontrado."
        >
            {rows.length>0&&(
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <Th>Motorista</Th>
                            <Th>Cadastro</Th>
                            <Th>Documentos</Th>
                            <Th>Veículos ativos</Th>
                            <Th>Multas</Th>
                            <Th>Sinistros</Th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map(row=>(
                            <tr
                                key={row.id}
                                className="border-t border-slate-100"
                            >
                                <Td strong>
                                    {row.nome}

                                    <div className="mt-1 text-xs font-normal text-slate-400">
                                        {row.nif??"Sem NIF"}
                                    </div>
                                </Td>

                                <Td>
                                    <Status
                                        value={
                                            row.status_cadastro
                                        }
                                    />

                                    {!row.ativo&&(
                                        <div className="mt-1 text-xs text-red-500">
                                            Inativo
                                        </div>
                                    )}
                                </Td>

                                <Td>
                                    <div className="text-sm text-red-600">
                                        {row.documentos_vencidos} vencidos
                                    </div>

                                    <div className="mt-1 text-xs text-amber-600">
                                        {row.documentos_a_vencer} a vencer
                                    </div>
                                </Td>

                                <Td>
                                    {row.veiculos_ativos
                                        ?.length??
                                        0
                                    }

                                    {row.veiculos_ativos
                                        ?.length>0&&(
                                        <div className="mt-1 text-xs text-slate-400">
                                            {row.veiculos_ativos
                                                .map(
                                                    (
                                                        item:any
                                                    )=>
                                                        item.matricula
                                                )
                                                .filter(Boolean)
                                                .join(", ")
                                            }
                                        </div>
                                    )}
                                </Td>

                                <Td>
                                    {row.multas_periodo}

                                    {row.valor_multas_periodo>0&&(
                                        <div className="mt-1 text-xs text-slate-400">
                                            {money(
                                                row.valor_multas_periodo
                                            )}
                                        </div>
                                    )}
                                </Td>

                                <Td>
                                    {row.sinistros_periodo}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </TableCard>
    );
}

function OcorrenciasTable({
    rows,
}:{
    rows:any[];
}){
    return (
        <TableCard
            title="Multas e sinistros"
            empty="Nenhuma ocorrência encontrada."
        >
            {rows.length>0&&(
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <Th>Data</Th>
                            <Th>Tipo</Th>
                            <Th>Referência</Th>
                            <Th>Veículo</Th>
                            <Th>Motorista</Th>
                            <Th>Estado</Th>
                            <Th>Valor</Th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map(row=>(
                            <tr
                                key={`${row.tipo}-${row.id}`}
                                className="border-t border-slate-100"
                            >
                                <Td>
                                    {dateLabel(
                                        row.data
                                    )}
                                </Td>

                                <Td strong>
                                    {row.tipo==="multa"
                                        ?"Multa"
                                        :"Sinistro"
                                    }
                                </Td>

                                <Td>
                                    {row.referencia??"—"}
                                </Td>

                                <Td>
                                    {row.veiculo
                                        ?.matricula??
                                        "—"
                                    }
                                </Td>

                                <Td>
                                    {row.motorista
                                        ?.nome??
                                        "—"
                                    }
                                </Td>

                                <Td>
                                    <Status
                                        value={
                                            row.status
                                        }
                                    />
                                </Td>

                                <Td>
                                    {row.valor!==null
                                        ?money(
                                            row.valor
                                        )
                                        :"—"
                                    }
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </TableCard>
    );
}

function AlugueresTable({
    rows,
}:{
    rows:any[];
}){
    return (
        <TableCard
            title="Alugueres no período"
            empty="Nenhum aluguer encontrado."
        >
            {rows.length>0&&(
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <Th>Motorista</Th>
                            <Th>Veículo</Th>
                            <Th>Período</Th>
                            <Th>Estado</Th>
                            <Th>Contrato</Th>
                            <Th>Valor contrato</Th>
                            <Th>Devolução</Th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map(row=>(
                            <tr
                                key={row.id}
                                className="border-t border-slate-100"
                            >
                                <Td strong>
                                    {row.motorista
                                        ?.nome??
                                        "—"
                                    }
                                </Td>

                                <Td>
                                    {row.veiculo
                                        ?.matricula??
                                        "—"
                                    }

                                    <div className="mt-1 text-xs text-slate-400">
                                        {[
                                            row.veiculo
                                                ?.marca,
                                            row.veiculo
                                                ?.modelo,
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                    </div>
                                </Td>

                                <Td>
                                    {dateLabel(
                                        row.data_inicio
                                    )}
                                    {" → "}
                                    {dateLabel(
                                        row.data_fim
                                    )}
                                </Td>

                                <Td>
                                    <Status
                                        value={
                                            row.status
                                        }
                                    />
                                </Td>

                                <Td>
                                    <Status
                                        value={
                                            row.contrato
                                                ?.status??
                                            "sem_contrato"
                                        }
                                    />
                                </Td>

                                <Td>
                                    {row.contrato
                                        ?.valor_total!==null &&
                                    row.contrato
                                        ?.valor_total!==undefined
                                        ?money(
                                            row.contrato
                                                .valor_total
                                        )
                                        :"—"
                                    }
                                </Td>

                                <Td>
                                    {money(
                                        row.devolucao_total_pagar??
                                        0
                                    )}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </TableCard>
    );
}

function ReportCard({
    title,
    description,
    children,
}:{
    title:string;
    description:string;
    children:React.ReactNode;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-bold text-slate-950">
                {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
                {description}
            </p>

            <div className="mt-5 divide-y divide-slate-100">
                {children}
            </div>
        </div>
    );
}

function SummaryLine({
    label,
    value,
    alert=false,
}:{
    label:string;
    value:string|number;
    alert?:boolean;
}){
    return (
        <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">
                {label}
            </span>

            <span className={[
                "text-sm font-bold",
                alert
                    ?"text-red-600"
                    :"text-slate-900",
            ].join(" ")}>
                {value}
            </span>
        </div>
    );
}

function TableCard({
    title,
    empty,
    children,
}:{
    title:string;
    empty:string;
    children:React.ReactNode;
}){
    const hasContent=
        Boolean(
            children
        );

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-bold text-slate-950">
                    {title}
                </h2>
            </div>

            {hasContent?(
                <div className="overflow-x-auto">
                    {children}
                </div>
            ):(
                <div className="p-10 text-center text-sm text-slate-500">
                    {empty}
                </div>
            )}
        </div>
    );
}

function Filter({
    label,
    children,
}:{
    label:string;
    children:React.ReactNode;
}){
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </label>

            {children}
        </div>
    );
}

function Th({
    children,
}:{
    children:string;
}){
    return (
        <th className="whitespace-nowrap bg-slate-50 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {children}
        </th>
    );
}

function Td({
    children,
    strong=false,
}:{
    children:React.ReactNode;
    strong?:boolean;
}){
    return (
        <td className={[
            "whitespace-nowrap px-5 py-4 text-sm",
            strong
                ?"font-semibold text-slate-900"
                :"text-slate-600",
        ].join(" ")}>
            {children}
        </td>
    );
}

function Status({
    value,
}:{
    value:string;
}){
    const labels:Record<string,string>={
        vencido:"Vencido",
        a_vencer:"A vencer",
        valido:"Válido",

        disponivel:"Disponível",
        alugado:"Alugado",
        manutencao:"Manutenção",
        indisponivel:"Indisponível",

        ativo:"Ativo",
        inativo:"Inativo",
        pendente:"Pendente",
        incompleto:"Incompleto",

        paga:"Paga",
        contestada:"Contestada",

        aberto:"Aberto",
        em_andamento:"Em andamento",
        encerrado:"Encerrado",

        rascunho:"Rascunho",
        finalizado:"Finalizado",
        cancelado:"Cancelado",

        assinado:"Assinado",
        enviado:"Enviado",
        sem_contrato:"Sem contrato",
    };

    const danger=[
        "vencido",
        "indisponivel",
        "aberto",
    ].includes(value);

    const warning=[
        "a_vencer",
        "pendente",
        "contestada",
        "em_andamento",
        "manutencao",
        "incompleto",
        "rascunho",
    ].includes(value);

    const success=[
        "valido",
        "disponivel",
        "ativo",
        "paga",
        "encerrado",
        "finalizado",
        "assinado",
    ].includes(value);

    return (
        <span className={[
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
            danger
                ?"bg-red-50 text-red-700"
                :warning
                    ?"bg-amber-50 text-amber-700"
                    :success
                        ?"bg-emerald-50 text-emerald-700"
                        :"bg-slate-100 text-slate-600",
        ].join(" ")}>
            {labels[value]??value}
        </span>
    );
}

function Loading(){
    return (
        <div className="flex justify-center py-24">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}

function buildParams(
    tab:Tab,
    filters:{
        inicio:string;
        fim:string;
        dias:string;
        entidade:string;
        situacao:string;
        ativo:string;
        disponibilidade:string;
        statusCadastro:string;
        tipoOcorrencia:string;
        statusOcorrencia:string;
        statusAluguer:string;
        motoristaId:string;
        veiculoId:string;
        proprietarioId:string;
    }
){
    const params:Record<string,string>={};

    if(
        tab!=="documentos"
    ){
        params.inicio=
            filters.inicio;

        params.fim=
            filters.fim;
    }

    if(
        tab==="documentos"
    ){
        params.dias=
            filters.dias;

        add(
            params,
            "entidade",
            filters.entidade
        );

        add(
            params,
            "situacao",
            filters.situacao
        );

        add(
            params,
            "motorista_id",
            filters.motoristaId
        );

        add(
            params,
            "veiculo_id",
            filters.veiculoId
        );
    }

    if(
        tab==="veiculos"
    ){
        add(
            params,
            "ativo",
            filters.ativo
        );

        add(
            params,
            "disponibilidade",
            filters.disponibilidade
        );

        add(
            params,
            "veiculo_id",
            filters.veiculoId
        );

        add(
            params,
            "proprietario_id",
            filters.proprietarioId
        );
    }

    if(
        tab==="motoristas"
    ){
        params.dias=
            filters.dias;

        add(
            params,
            "ativo",
            filters.ativo
        );

        add(
            params,
            "status_cadastro",
            filters.statusCadastro
        );

        add(
            params,
            "motorista_id",
            filters.motoristaId
        );
    }

    if(
        tab==="ocorrencias"
    ){
        add(
            params,
            "tipo",
            filters.tipoOcorrencia
        );

        add(
            params,
            "status",
            filters.statusOcorrencia
        );

        add(
            params,
            "motorista_id",
            filters.motoristaId
        );

        add(
            params,
            "veiculo_id",
            filters.veiculoId
        );
    }

    if(
        tab==="alugueres"
    ){
        add(
            params,
            "status",
            filters.statusAluguer
        );

        add(
            params,
            "motorista_id",
            filters.motoristaId
        );

        add(
            params,
            "veiculo_id",
            filters.veiculoId
        );
    }

    return params;
}

function add(
    params:Record<string,string>,
    key:string,
    value:string
){
    if(value!==""){
        params[key]=value;
    }
}

function kpiConfig(
    tab:Tab
):{
    key:string;
    label:string;
    money?:boolean;
}[]{
    if(tab==="resumo"){
        return [
            {
                key:"motoristas_ativos",
                label:"Motoristas ativos",
            },
            {
                key:"veiculos_ativos",
                label:"Veículos ativos",
            },
            {
                key:"alugueres_ativos",
                label:"Alugueres ativos",
            },
            {
                key:"documentos_vencidos",
                label:"Docs. vencidos",
            },
            {
                key:"multas_periodo",
                label:"Multas no período",
            },
            {
                key:"valor_multas_periodo",
                label:"Valor das multas",
                money:true,
            },
            {
                key:"sinistros_periodo",
                label:"Sinistros",
            },
            {
                key:"custo_manutencoes_periodo",
                label:"Custo manutenção",
                money:true,
            },
        ];
    }

    if(tab==="documentos"){
        return [
            {
                key:"total",
                label:"Monitorizados",
            },
            {
                key:"vencidos",
                label:"Vencidos",
            },
            {
                key:"a_vencer",
                label:"A vencer",
            },
            {
                key:"validos",
                label:"Válidos",
            },
        ];
    }

    if(tab==="veiculos"){
        return [
            {
                key:"total",
                label:"Veículos",
            },
            {
                key:"ativos",
                label:"Ativos",
            },
            {
                key:"indisponiveis",
                label:"Indisponíveis",
            },
            {
                key:"custo_manutencao",
                label:"Custo manutenção",
                money:true,
            },
            {
                key:"valor_multas",
                label:"Multas",
                money:true,
            },
            {
                key:"sinistros",
                label:"Sinistros",
            },
        ];
    }

    if(tab==="motoristas"){
        return [
            {
                key:"total",
                label:"Motoristas",
            },
            {
                key:"ativos",
                label:"Ativos",
            },
            {
                key:"inativos",
                label:"Inativos",
            },
            {
                key:"cadastros_incompletos",
                label:"Cadastros incompletos",
            },
            {
                key:"documentos_vencidos",
                label:"Docs. vencidos",
            },
            {
                key:"documentos_a_vencer",
                label:"Docs. a vencer",
            },
            {
                key:"valor_multas",
                label:"Multas",
                money:true,
            },
            {
                key:"sinistros",
                label:"Sinistros",
            },
        ];
    }

    if(tab==="ocorrencias"){
        return [
            {
                key:"total",
                label:"Ocorrências",
            },
            {
                key:"multas",
                label:"Multas",
            },
            {
                key:"multas_pendentes",
                label:"Multas pendentes",
            },
            {
                key:"valor_multas",
                label:"Valor das multas",
                money:true,
            },
            {
                key:"sinistros",
                label:"Sinistros",
            },
            {
                key:"sinistros_abertos",
                label:"Sinistros abertos",
            },
        ];
    }

    return [
        {
            key:"total",
            label:"Alugueres",
        },
        {
            key:"ativos",
            label:"Ativos",
        },
        {
            key:"finalizados",
            label:"Finalizados",
        },
        {
            key:"rascunhos",
            label:"Rascunhos",
        },
        {
            key:"valor_contratado",
            label:"Valor contratado",
            money:true,
        },
        {
            key:"total_devolucoes",
            label:"Devoluções",
            money:true,
        },
    ];
}

function csvForReport(
    tab:Tab,
    report:ReportPayload
):{
    headers:string[];
    rows:(string|number|null)[][];
}{
    if(tab==="resumo"){
        return {
            headers:[
                "Indicador",
                "Valor",
            ],
            rows:
                Object.entries(
                    report.kpis
                ).map(
                    ([key,value])=>[
                        key,
                        value,
                    ]
                ),
        };
    }

    const rows=
        report.data??
        [];

    if(tab==="documentos"){
        return {
            headers:[
                "Entidade",
                "Nome",
                "Documento",
                "Validade",
                "Dias restantes",
                "Situação",
            ],
            rows:rows.map(row=>[
                entityLabel(
                    row.entidade
                ),
                row.nome,
                row.documento_label,
                row.validade,
                row.dias_restantes,
                row.situacao,
            ]),
        };
    }

    if(tab==="veiculos"){
        return {
            headers:[
                "Matrícula",
                "Marca",
                "Modelo",
                "Proprietário",
                "KM",
                "Disponibilidade",
                "Manutenções",
                "Custo manutenção",
                "Multas",
                "Valor multas",
                "Sinistros",
            ],
            rows:rows.map(row=>[
                row.matricula,
                row.marca,
                row.modelo,
                row.proprietario
                    ?.nome,
                row.km_atual,
                row.disponibilidade,
                row.manutencoes_periodo,
                row.custo_manutencao_periodo,
                row.multas_periodo,
                row.valor_multas_periodo,
                row.sinistros_periodo,
            ]),
        };
    }

    if(tab==="motoristas"){
        return {
            headers:[
                "Motorista",
                "NIF",
                "Ativo",
                "Cadastro",
                "Documentos vencidos",
                "Documentos a vencer",
                "Multas",
                "Valor multas",
                "Sinistros",
            ],
            rows:rows.map(row=>[
                row.nome,
                row.nif,
                row.ativo
                    ?"Sim"
                    :"Não",
                row.status_cadastro,
                row.documentos_vencidos,
                row.documentos_a_vencer,
                row.multas_periodo,
                row.valor_multas_periodo,
                row.sinistros_periodo,
            ]),
        };
    }

    if(tab==="ocorrencias"){
        return {
            headers:[
                "Data",
                "Tipo",
                "Referência",
                "Veículo",
                "Motorista",
                "Estado",
                "Valor",
            ],
            rows:rows.map(row=>[
                row.data,
                row.tipo,
                row.referencia,
                row.veiculo
                    ?.matricula,
                row.motorista
                    ?.nome,
                row.status,
                row.valor,
            ]),
        };
    }

    return {
        headers:[
            "Motorista",
            "Veículo",
            "Início",
            "Fim",
            "Estado",
            "Estado contrato",
            "Valor contrato",
            "Total devolução",
        ],
        rows:rows.map(row=>[
            row.motorista
                ?.nome,
            row.veiculo
                ?.matricula,
            row.data_inicio,
            row.data_fim,
            row.status,
            row.contrato
                ?.status,
            row.contrato
                ?.valor_total,
            row.devolucao_total_pagar,
        ]),
    };
}

function downloadCsv(
    filename:string,
    headers:string[],
    rows:(string|number|null)[][]
){
    const csv=[
        headers,
        ...rows,
    ]
        .map(
            row=>
                row
                    .map(
                        value=>
                            `"${String(
                                value??
                                ""
                            ).replace(
                                /"/g,
                                '""'
                            )}"`
                    )
                    .join(";")
        )
        .join("\r\n");

    const blob=
        new Blob(
            [
                "\uFEFF",
                csv,
            ],
            {
                type:
                    "text/csv;charset=utf-8;",
            }
        );

    const url=
        URL.createObjectURL(
            blob
        );

    const link=
        document.createElement(
            "a"
        );

    link.href=url;
    link.download=filename;

    document.body.appendChild(
        link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
        url
    );
}

function proprietorName(
    item:ProprietarioOption
):string {
    if(
        item.tipo==="empresa"
    ){
        return (
            item.nome_empresa??
            "Empresa"
        );
    }

    return (
        item.nome_completo??
        "Proprietário"
    );
}

function entityLabel(
    value:string
):string {
    const labels:Record<string,string>={
        empresa:"Empresa",
        proprietario:"Proprietário",
        motorista:"Motorista",
        veiculo:"Veículo",
    };

    return labels[value]??value;
}

function money(
    value:number
):string {
    return new Intl.NumberFormat(
        "pt-PT",
        {
            style:"currency",
            currency:"EUR",
        }
    ).format(
        value
    );
}

function number(
    value:number
):string {
    return new Intl.NumberFormat(
        "pt-PT"
    ).format(
        value
    );
}

function dateLabel(
    value:string|null
):string {
    if(!value){
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT"
    ).format(
        new Date(
            `${value.slice(
                0,
                10
            )}T12:00:00`
        )
    );
}

function today():string {
    const now=
        new Date();

    return localDate(
        now
    );
}

function startOfMonth():string {
    const now=
        new Date();

    return localDate(
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        )
    );
}

function localDate(
    value:Date
):string {
    const year=
        value.getFullYear();

    const month=
        String(
            value.getMonth()+1
        ).padStart(
            2,
            "0"
        );

    const day=
        String(
            value.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}

const inputClass=
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
