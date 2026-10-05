import {useMemo,useState} from "react";
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Database,
    Eye,
    History,
    LoaderCircle,
    RefreshCw,
    Search,
    UserRound,
    X,
} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import api from "../lib/api";
import {useTenant} from "../contexts/TenantContext";
import {useCurrentPermissions} from "../hooks/useCurrentPermissions";

interface Option {
    value:string;
    label:string;
}

interface UserOption {
    id:string;
    name:string|null;
    email:string|null;
}

interface AuditRow {
    id:string;
    module:string;
    module_label:string;
    action:string;
    action_label:string;
    source:string;
    subject_type:string;
    subject_id:string;
    subject_label:string|null;
    description:string|null;
    changes_count:number;
    actor:{
        id:string;
        name:string|null;
        email:string|null;
    }|null;
    ip_address:string|null;
    created_at:string;
}

interface AuditDetail extends AuditRow {
    old_values:Record<string,unknown>;
    new_values:Record<string,unknown>;
    request:{
        method:string|null;
        path:string|null;
        ip:string|null;
        user_agent:string|null;
    };
}

interface ListResponse {
    data:AuditRow[];
    kpis:{
        total:number;
        created:number;
        updated:number;
        deleted:number;
    };
    meta:{
        current_page:number;
        last_page:number;
        per_page:number;
        total:number;
        from:number|null;
        to:number|null;
    };
    filters:{
        modules:Option[];
        actions:Option[];
        sources:Option[];
        users:UserOption[];
    };
}

export default function AuditoriaPage(){
    const {tenant}=useTenant();
    const permissions=useCurrentPermissions();

    const [inicio,setInicio]=useState("");
    const [fim,setFim]=useState("");
    const [module,setModule]=useState("");
    const [action,setAction]=useState("");
    const [source,setSource]=useState("");
    const [userId,setUserId]=useState("");
    const [search,setSearch]=useState("");
    const [page,setPage]=useState(1);
    const [perPage,setPerPage]=useState("25");
    const [selectedId,setSelectedId]=useState<string|null>(null);

    const canView=
        permissions.can(
            "auditoria",
            "visualizar"
        );

    const params=useMemo(()=>{
        const result:Record<string,string|number>={
            page,
            per_page:perPage,
        };

        if(inicio){
            result.inicio=inicio;
        }

        if(fim){
            result.fim=fim;
        }

        if(module){
            result.module=module;
        }

        if(action){
            result.action=action;
        }

        if(source){
            result.source=source;
        }

        if(userId){
            result.user_id=userId;
        }

        if(search.trim()){
            result.search=search.trim();
        }

        return result;
    },[
        inicio,
        fim,
        module,
        action,
        source,
        userId,
        search,
        page,
        perPage,
    ]);

    const listQuery=useQuery({
        queryKey:[
            "auditoria",
            tenant?.id,
            params,
        ],

        enabled:
            Boolean(tenant?.id)&&
            canView,

        queryFn:async()=>{
            const response=
                await api.get(
                    "/api/auditoria",
                    {params}
                );

            return response.data as ListResponse;
        },
    });

    const detailQuery=useQuery({
        queryKey:[
            "auditoria-detalhe",
            tenant?.id,
            selectedId,
        ],

        enabled:
            Boolean(
                tenant?.id&&
                selectedId&&
                canView
            ),

        queryFn:async()=>{
            const response=
                await api.get(
                    `/api/auditoria/${selectedId}`
                );

            return response.data
                .data as AuditDetail;
        },
    });

    function resetPage(){
        setPage(1);
    }

    function clearFilters(){
        setInicio("");
        setFim("");
        setModule("");
        setAction("");
        setSource("");
        setUserId("");
        setSearch("");
        setPage(1);
    }

    if(permissions.isLoading){
        return <Loading/>;
    }

    if(!tenant){
        return (
            <Message
                tone="warning"
                title="Selecione uma organização"
                text="É necessário selecionar uma organização para consultar a auditoria."
            />
        );
    }

    if(!canView){
        return (
            <Message
                tone="danger"
                title="Sem acesso à auditoria"
                text="O seu perfil não possui permissão para consultar este módulo."
            />
        );
    }

    const response=
        listQuery.data;

    const rows=
        response?.data??
        [];

    const kpis=
        response?.kpis??{
            total:0,
            created:0,
            updated:0,
            deleted:0,
        };

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Rastreabilidade
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Auditoria
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Histórico imutável de alterações realizadas em {tenant.nome}.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={()=>
                        listQuery.refetch()
                    }
                    disabled={
                        listQuery.isFetching
                    }
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"
                >
                    <RefreshCw
                        className={[
                            "h-4 w-4",
                            listQuery.isFetching
                                ?"animate-spin"
                                :"",
                        ].join(" ")}
                    />
                    Atualizar
                </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                    label="Eventos"
                    value={kpis.total}
                />

                <Kpi
                    label="Criações"
                    value={kpis.created}
                />

                <Kpi
                    label="Alterações"
                    value={kpis.updated}
                />

                <Kpi
                    label="Eliminações"
                    value={kpis.deleted}
                />
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-indigo-600"/>

                        <h2 className="text-sm font-bold text-slate-900">
                            Filtros
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-semibold text-indigo-600"
                    >
                        Limpar
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Filter label="Pesquisar">
                        <input
                            value={search}
                            onChange={event=>{
                                setSearch(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            placeholder="Registo, utilizador, IP..."
                            className={inputClass}
                        />
                    </Filter>

                    <Filter label="Data inicial">
                        <input
                            type="date"
                            value={inicio}
                            onChange={event=>{
                                setInicio(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            className={inputClass}
                        />
                    </Filter>

                    <Filter label="Data final">
                        <input
                            type="date"
                            value={fim}
                            min={inicio||undefined}
                            onChange={event=>{
                                setFim(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            className={inputClass}
                        />
                    </Filter>

                    <Filter label="Módulo">
                        <select
                            value={module}
                            onChange={event=>{
                                setModule(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            className={inputClass}
                        >
                            <option value="">
                                Todos
                            </option>

                            {(response?.filters.modules??[]).map(item=>(
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </Filter>

                    <Filter label="Ação">
                        <select
                            value={action}
                            onChange={event=>{
                                setAction(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            className={inputClass}
                        >
                            <option value="">
                                Todas
                            </option>

                            {(response?.filters.actions??[]).map(item=>(
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </Filter>

                    <Filter label="Origem">
                        <select
                            value={source}
                            onChange={event=>{
                                setSource(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            className={inputClass}
                        >
                            <option value="">
                                Todas
                            </option>

                            {(response?.filters.sources??[]).map(item=>(
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </Filter>

                    <Filter label="Utilizador">
                        <select
                            value={userId}
                            onChange={event=>{
                                setUserId(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            className={inputClass}
                        >
                            <option value="">
                                Todos
                            </option>

                            {(response?.filters.users??[]).map(item=>(
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.name??item.email??item.id}
                                </option>
                            ))}
                        </select>
                    </Filter>

                    <Filter label="Por página">
                        <select
                            value={perPage}
                            onChange={event=>{
                                setPerPage(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            className={inputClass}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </Filter>
                </div>
            </div>

            {listQuery.isLoading?(
                <Loading/>
            ):listQuery.isError?(
                <Message
                    tone="danger"
                    title="Não foi possível carregar a auditoria"
                    text="Ocorreu um erro ao consultar os registos."
                />
            ):(
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-slate-950">
                                Histórico
                            </h2>

                            <span className="text-xs text-slate-400">
                                {response?.meta.total??0} registos
                            </span>
                        </div>
                    </div>

                    {rows.length===0?(
                        <div className="p-12 text-center">
                            <History className="mx-auto h-10 w-10 text-slate-300"/>

                            <p className="mt-3 text-sm text-slate-500">
                                Nenhum evento de auditoria encontrado.
                            </p>
                        </div>
                    ):(
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <Th>Data</Th>
                                        <Th>Utilizador</Th>
                                        <Th>Módulo</Th>
                                        <Th>Ação</Th>
                                        <Th>Registo</Th>
                                        <Th>Alterações</Th>
                                        <Th>Origem</Th>
                                        <Th></Th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map(row=>(
                                        <tr
                                            key={row.id}
                                            className="border-t border-slate-100 hover:bg-slate-50/60"
                                        >
                                            <Td>
                                                <div className="flex items-center gap-2">
                                                    <Clock3 className="h-4 w-4 text-slate-300"/>
                                                    {dateTime(
                                                        row.created_at
                                                    )}
                                                </div>
                                            </Td>

                                            <Td>
                                                <div className="font-medium text-slate-800">
                                                    {row.actor?.name??"Sistema"}
                                                </div>

                                                {row.actor?.email&&(
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {row.actor.email}
                                                    </div>
                                                )}
                                            </Td>

                                            <Td>
                                                {row.module_label}
                                            </Td>

                                            <Td>
                                                <ActionBadge
                                                    action={row.action}
                                                    label={row.action_label}
                                                />
                                            </Td>

                                            <Td>
                                                <div className="font-medium text-slate-800">
                                                    {row.subject_label??row.subject_type}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {row.subject_type}
                                                </div>
                                            </Td>

                                            <Td>
                                                {row.changes_count}
                                            </Td>

                                            <Td>
                                                {row.source==="web"
                                                    ?"Utilizador"
                                                    :"Sistema"
                                                }
                                            </Td>

                                            <Td>
                                                <button
                                                    type="button"
                                                    onClick={()=>
                                                        setSelectedId(
                                                            row.id
                                                        )
                                                    }
                                                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Eye className="h-4 w-4"/>
                                                    Ver
                                                </button>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {response&&
                    response.meta.last_page>1&&(
                        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-slate-500">
                                {response.meta.from??0}
                                {" – "}
                                {response.meta.to??0}
                                {" de "}
                                {response.meta.total}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={
                                        page<=1
                                    }
                                    onClick={()=>
                                        setPage(
                                            current=>
                                                Math.max(
                                                    1,
                                                    current-1
                                                )
                                        )
                                    }
                                    className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4"/>
                                    Anterior
                                </button>

                                <span className="px-2 text-xs text-slate-500">
                                    Página {response.meta.current_page} de {response.meta.last_page}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        page>=
                                        response.meta.last_page
                                    }
                                    onClick={()=>
                                        setPage(
                                            current=>
                                                Math.min(
                                                    response.meta.last_page,
                                                    current+1
                                                )
                                        )
                                    }
                                    className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
                                >
                                    Seguinte
                                    <ChevronRight className="h-4 w-4"/>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedId&&(
                <DetailModal
                    loading={
                        detailQuery.isLoading
                    }
                    detail={
                        detailQuery.data??
                        null
                    }
                    onClose={()=>
                        setSelectedId(
                            null
                        )
                    }
                />
            )}
        </div>
    );
}

function DetailModal({
    loading,
    detail,
    onClose,
}:{
    loading:boolean;
    detail:AuditDetail|null;
    onClose:()=>void;
}){
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            Detalhe da auditoria
                        </h2>

                        {detail&&(
                            <p className="mt-1 text-sm text-slate-500">
                                {detail.description}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                {loading||!detail?(
                    <Loading/>
                ):(
                    <div className="space-y-6 p-6">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Info
                                label="Data"
                                value={dateTime(
                                    detail.created_at
                                )}
                            />

                            <Info
                                label="Utilizador"
                                value={
                                    detail.actor?.name??
                                    "Sistema"
                                }
                            />

                            <Info
                                label="Módulo"
                                value={
                                    detail.module_label
                                }
                            />

                            <Info
                                label="Ação"
                                value={
                                    detail.action_label
                                }
                            />

                            <Info
                                label="Registo"
                                value={
                                    detail.subject_label??
                                    detail.subject_type
                                }
                            />

                            <Info
                                label="Tipo"
                                value={
                                    detail.subject_type
                                }
                            />

                            <Info
                                label="Origem"
                                value={
                                    detail.source==="web"
                                        ?"Utilizador"
                                        :"Sistema"
                                }
                            />

                            <Info
                                label="IP"
                                value={
                                    detail.request.ip??
                                    "—"
                                }
                            />
                        </div>

                        <div>
                            <h3 className="mb-3 font-bold text-slate-950">
                                Alterações
                            </h3>

                            <Changes
                                oldValues={
                                    detail.old_values
                                }
                                newValues={
                                    detail.new_values
                                }
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-950">
                                <Database className="h-4 w-4 text-indigo-600"/>
                                Contexto técnico
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Info
                                    label="Método"
                                    value={
                                        detail.request.method??
                                        "—"
                                    }
                                />

                                <Info
                                    label="Caminho"
                                    value={
                                        detail.request.path
                                            ?`/${detail.request.path}`
                                            :"—"
                                    }
                                />

                                <Info
                                    label="ID do registo"
                                    value={
                                        detail.subject_id
                                    }
                                />

                                <Info
                                    label="E-mail do utilizador"
                                    value={
                                        detail.actor?.email??
                                        "—"
                                    }
                                />
                            </div>

                            {detail.request.user_agent&&(
                                <div className="mt-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        User-Agent
                                    </p>

                                    <p className="mt-1 break-all text-xs text-slate-600">
                                        {detail.request.user_agent}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Changes({
    oldValues,
    newValues,
}:{
    oldValues:Record<string,unknown>;
    newValues:Record<string,unknown>;
}){
    const keys=
        Array.from(
            new Set([
                ...Object.keys(
                    oldValues
                ),
                ...Object.keys(
                    newValues
                ),
            ])
        );

    if(keys.length===0){
        return (
            <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                Nenhuma alteração de campo registada.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <Th>Campo</Th>
                            <Th>Antes</Th>
                            <Th>Depois</Th>
                        </tr>
                    </thead>

                    <tbody>
                        {keys.map(key=>(
                            <tr
                                key={key}
                                className="border-t border-slate-100 align-top"
                            >
                                <Td>
                                    <span className="font-semibold text-slate-800">
                                        {fieldLabel(
                                            key
                                        )}
                                    </span>
                                </Td>

                                <Td>
                                    <AuditValue
                                        value={
                                            oldValues[
                                                key
                                            ]
                                        }
                                    />
                                </Td>

                                <Td>
                                    <AuditValue
                                        value={
                                            newValues[
                                                key
                                            ]
                                        }
                                    />
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AuditValue({
    value,
}:{
    value:unknown;
}){
    if(
        value===null ||
        value===undefined
    ){
        return (
            <span className="text-slate-300">
                —
            </span>
        );
    }

    if(
        typeof value==="boolean"
    ){
        return (
            <span>
                {value
                    ?"Sim"
                    :"Não"
                }
            </span>
        );
    }

    if(
        typeof value==="object"
    ){
        return (
            <pre className="max-w-md whitespace-pre-wrap break-words text-xs text-slate-600">
                {JSON.stringify(
                    value,
                    null,
                    2
                )}
            </pre>
        );
    }

    return (
        <span className="break-words">
            {String(
                value
            )}
        </span>
    );
}

function Kpi({
    label,
    value,
}:{
    label:string;
    value:number;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
                {new Intl.NumberFormat(
                    "pt-PT"
                ).format(
                    value
                )}
            </p>
        </div>
    );
}

function ActionBadge({
    action,
    label,
}:{
    action:string;
    label:string;
}){
    const className=
        action==="created"
            ?"bg-emerald-50 text-emerald-700"
            :action==="deleted"
                ?"bg-red-50 text-red-700"
                :"bg-amber-50 text-amber-700";

    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                className,
            ].join(" ")}
        >
            {label}
        </span>
    );
}

function Info({
    label,
    value,
}:{
    label:string;
    value:string;
}){
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-medium text-slate-800">
                {value}
            </p>
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
    children:React.ReactNode;
}){
    return (
        <th className="whitespace-nowrap bg-slate-50 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {children}
        </th>
    );
}

function Td({
    children,
}:{
    children:React.ReactNode;
}){
    return (
        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
            {children}
        </td>
    );
}

function Loading(){
    return (
        <div className="flex justify-center py-20">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}

function Message({
    tone,
    title,
    text,
}:{
    tone:"warning"|"danger";
    title:string;
    text:string;
}){
    const classes=
        tone==="danger"
            ?"border-red-200 bg-red-50 text-red-700"
            :"border-amber-200 bg-amber-50 text-amber-700";

    return (
        <div
            className={[
                "mx-auto max-w-7xl rounded-2xl border p-6",
                classes,
            ].join(" ")}
        >
            <AlertCircle className="h-6 w-6"/>

            <h1 className="mt-3 font-semibold">
                {title}
            </h1>

            <p className="mt-1 text-sm">
                {text}
            </p>
        </div>
    );
}

function dateTime(
    value:string
):string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:"short",
            timeStyle:"medium",
        }
    ).format(
        new Date(
            value
        )
    );
}

function fieldLabel(
    value:string
):string {
    const labels:Record<string,string>={
        ativo:"Ativo",
        status:"Estado",
        status_cadastro:"Estado do cadastro",
        disponibilidade:"Disponibilidade",
        km_atual:"Quilometragem",
        nome:"Nome",
        nome_empresa:"Nome da empresa",
        nome_completo:"Nome completo",
        nif:"NIF",
        email:"E-mail",
        telemovel:"Telemóvel",
        motorista_id:"Motorista",
        veiculo_id:"Veículo",
        proprietario_id:"Proprietário",
        settings:"Configurações",
    };

    if(labels[value]){
        return labels[value];
    }

    const text=
        value
            .replace(
                /_/g,
                " "
            );

    return text.charAt(0)
        .toUpperCase()+
        text.slice(1);
}

const inputClass=
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
