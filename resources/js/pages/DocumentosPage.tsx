import axios from "axios";

import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileArchive,
    FileCheck2,
    FileOutput,
    FilePlus2,
    FileText,
    Filter,
    LoaderCircle,
    Search,
    X,
} from "lucide-react";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import {
    useQuery,
} from "@tanstack/react-query";

import api from "../lib/api";

import {
    useTenant,
} from "../contexts/TenantContext";

import type {
    Documento,
    DocumentoMeta,
    DocumentoPagination,
    DocumentoSummary,
} from "../types/documento";

interface Filters {
    q: string;
    origem: string;
    categoria: string;
    tipo: string;
    status: string;
    data_inicio: string;
    data_fim: string;
}

const emptyFilters: Filters={
    q:"",
    origem:"",
    categoria:"",
    tipo:"",
    status:"",
    data_inicio:"",
    data_fim:"",
};

function errorMessage(
    error: unknown,
    fallback: string
): string {
    if(
        axios.isAxiosError(
            error
        )
    ){
        return (
            error.response
                ?.data
                ?.message ??
            fallback
        );
    }

    return fallback;
}

function dateTime(
    value:
        string |
        null |
        undefined
): string {
    if(!value){
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:"short",
            timeStyle:"short",
        }
    ).format(
        new Date(
            value
        )
    );
}

function fileSize(
    bytes:
        number |
        null |
        undefined
): string {
    if(
        bytes === null ||
        bytes === undefined
    ){
        return "—";
    }

    if(bytes < 1024){
        return `${bytes} B`;
    }

    if(bytes < 1024*1024){
        return `${(bytes/1024).toFixed(1)} KB`;
    }

    return `${(bytes/1024/1024).toFixed(1)} MB`;
}

function humanize(
    value:
        string |
        null |
        undefined
): string {
    if(!value){
        return "—";
    }

    const known:
        Record<string,string> = {
            gerado:"Gerado",
            anexado:"Anexado",
            contratos:"Contratos",
            declaracoes:"Declarações",
            checklists:"Checklists",
            motoristas:"Motoristas",
            financeiro:"Financeiro",
            multas:"Multas",
            sinistros:"Sinistros",
            manutencao:"Manutenção",
            ativo:"Ativo",
            rascunho:"Rascunho",
            enviado:"Enviado",
            assinado:"Assinado",
            encerrado:"Encerrado",
            emitida:"Emitida",
            pendente_validacao:
                "Pendente de validação",
            validado:"Validado",
            rejeitado:"Rejeitado",
            concluido:"Concluído",
        };

    if(known[value]){
        return known[value];
    }

    return value
        .replace(
            /_/g,
            " "
        )
        .replace(
            /\b\w/g,
            (character)=>
                character
                    .toUpperCase()
        );
}

function entitySummary(
    document: Documento
): string[] {
    const values:
        string[] = [];

    if(document.empresa){
        values.push(
            document
                .empresa
                .nome_empresa
        );
    }

    if(document.motorista?.nome_completo){
        values.push(
            document
                .motorista
                .nome_completo
        );
    }

    if(document.proprietario){
        const name=
            document
                .proprietario
                .nome_empresa ||
            document
                .proprietario
                .nome_completo;

        if(name){
            values.push(
                name
            );
        }
    }

    if(document.veiculo){
        values.push(
            [
                document
                    .veiculo
                    .matricula,

                document
                    .veiculo
                    .marca,

                document
                    .veiculo
                    .modelo,
            ]
                .filter(
                    Boolean
                )
                .join(
                    " · "
                )
        );
    }

    return [
        ...new Set(
            values
        ),
    ];
}

function statusClass(
    status: string
): string {
    if(
        [
            "assinado",
            "validado",
            "concluido",
            "emitida",
            "ativo",
        ].includes(
            status
        )
    ){
        return "bg-emerald-50 text-emerald-700";
    }

    if(
        [
            "rejeitado",
            "cancelado",
            "expirado",
        ].includes(
            status
        )
    ){
        return "bg-red-50 text-red-700";
    }

    if(
        [
            "rascunho",
            "pendente_validacao",
            "enviado",
        ].includes(
            status
        )
    ){
        return "bg-amber-50 text-amber-700";
    }

    return "bg-slate-100 text-slate-600";
}

export default function DocumentosPage() {
    const {
        tenant,
    }=useTenant();

    const [
        search,
        setSearch,
    ]=useState("");

    const [
        filters,
        setFilters,
    ]=
        useState<Filters>(
            emptyFilters
        );

    const [
        page,
        setPage,
    ]=
        useState(1);

    const [
        selectedId,
        setSelectedId,
    ]=
        useState<
            string |
            null
        >(null);

    const [
        fileAction,
        setFileAction,
    ]=
        useState<
            string |
            null
        >(null);

    const [
        actionError,
        setActionError,
    ]=
        useState<
            string |
            null
        >(null);

    useEffect(
        ()=>{
            setPage(1);
        },
        [
            tenant?.id,
            filters,
        ]
    );

    const summaryQuery=
        useQuery({
            queryKey:[
                "documentos-summary",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            "/api/documentos/resumo"
                        );

                    return response
                        .data
                        .data as DocumentoSummary;
                },
        });

    const metaQuery=
        useQuery({
            queryKey:[
                "documentos-meta",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            "/api/documentos/meta"
                        );

                    return response
                        .data
                        .data as DocumentoMeta;
                },
        });

    const listQuery=
        useQuery({
            queryKey:[
                "documentos",
                tenant?.id,
                filters,
                page,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async()=>{
                    const params:
                        Record<
                            string,
                            string |
                            number
                        > = {
                            page,
                            per_page:25,
                        };

                    for(
                        const [
                            key,
                            value,
                        ] of Object.entries(
                            filters
                        )
                    ){
                        if(value){
                            params[key]=
                                value;
                        }
                    }

                    const response=
                        await api.get(
                            "/api/documentos",
                            {
                                params,
                            }
                        );

                    return response
                        .data as DocumentoPagination;
                },
        });

    const detailQuery=
        useQuery({
            queryKey:[
                "documento-detail",
                selectedId,
                tenant?.id,
            ],

            enabled:
                Boolean(
                    selectedId &&
                    tenant?.id
                ),

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            `/api/documentos/${selectedId}`
                        );

                    return response
                        .data
                        .data as Documento;
                },
        });

    function submitSearch(
        event: FormEvent
    ){
        event.preventDefault();

        setFilters(
            current=>({
                ...current,
                q:
                    search
                        .trim(),
            })
        );
    }

    function patchFilter(
        key:
            keyof Filters,
        value: string
    ){
        setFilters(
            current=>({
                ...current,
                [key]:
                    value,
            })
        );
    }

    function clearFilters(){
        setSearch("");
        setFilters(
            emptyFilters
        );
    }

    async function openFile(
        document: Documento
    ){
        if(
            !document
                .arquivo_path
        ){
            return;
        }

        const popup=
            window.open(
                "about:blank",
                "_blank"
            );

        if(!popup){
            setActionError(
                "O navegador bloqueou a abertura do documento. Permita pop-ups para visualizar o ficheiro."
            );

            return;
        }

        popup.opener=null;

        setFileAction(
            `view:${document.id}`
        );

        setActionError(
            null
        );

        try{
            const response=
                await api.get(
                    `/api/documentos/${document.id}/arquivo`,
                    {
                        responseType:
                            "blob",
                    }
                );

            const url=
                URL.createObjectURL(
                    response.data
                );

            popup.location.href=
                url;

            window.setTimeout(
                ()=>
                    URL.revokeObjectURL(
                        url
                    ),
                60000
            );
        }catch(error){
            popup.close();

            setActionError(
                errorMessage(
                    error,
                    "Não foi possível abrir o documento."
                )
            );
        }finally{
            setFileAction(
                null
            );
        }
    }

    async function downloadFile(
        document: Documento
    ){
        if(
            !document
                .arquivo_path
        ){
            return;
        }

        setFileAction(
            `download:${document.id}`
        );

        setActionError(
            null
        );

        try{
            const response=
                await api.get(
                    `/api/documentos/${document.id}/download`,
                    {
                        responseType:
                            "blob",
                    }
                );

            const url=
                URL.createObjectURL(
                    response.data
                );

            const anchor=
                window.document
                    .createElement(
                        "a"
                    );

            anchor.href=url;

            anchor.download=
                document
                    .arquivo_nome ||
                `${document.codigo}.pdf`;


            window.document
                .body
                .appendChild(
                    anchor
                );

            anchor.click();
            anchor.remove();

            window.setTimeout(
                ()=>
                    URL.revokeObjectURL(
                        url
                    ),
                1000
            );
        }catch(error){
            setActionError(
                errorMessage(
                    error,
                    "Não foi possível descarregar o documento."
                )
            );
        }finally{
            setFileAction(
                null
            );
        }
    }

    const summary=
        summaryQuery.data;

    const meta=
        metaQuery.data;

    const pagination=
        listQuery.data;

    const documents=
        pagination
            ?.data ??
        [];

    const hasFilters=
        Object.values(
            filters
        ).some(
            Boolean
        );

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Arquivo documental
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Central de Documentos
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Consulte num único local documentos gerados pelo FrotaPro e ficheiros anexados à operação da frota.
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">
                        {summary?.ultimos_30_dias ?? 0}
                    </span>{" "}
                    novos nos últimos 30 dias
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Total"
                    value={
                        summary?.total ??
                        0
                    }
                    icon={
                        FileArchive
                    }
                />

                <SummaryCard
                    label="Gerados"
                    value={
                        summary?.gerados ??
                        0
                    }
                    icon={
                        FileOutput
                    }
                />

                <SummaryCard
                    label="Anexados"
                    value={
                        summary?.anexados ??
                        0
                    }
                    icon={
                        FilePlus2
                    }
                />

                <SummaryCard
                    label="Com ficheiro"
                    value={
                        summary?.com_arquivo ??
                        0
                    }
                    icon={
                        FileCheck2
                    }
                />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <form
                    onSubmit={
                        submitSearch
                    }
                    className="flex flex-col gap-3 lg:flex-row"
                >
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>

                        <input
                            value={
                                search
                            }
                            onChange={
                                event=>
                                    setSearch(
                                        event
                                            .target
                                            .value
                                    )
                            }
                            placeholder="Código, título, motorista, matrícula, empresa..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
                    >
                        <Search className="h-4 w-4"/>
                        Pesquisar
                    </button>

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                        >
                            <X className="h-4 w-4"/>
                            Limpar
                        </button>
                    )}
                </form>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <FilterSelect
                        label="Origem"
                        value={
                            filters
                                .origem
                        }
                        onChange={
                            value=>
                                patchFilter(
                                    "origem",
                                    value
                                )
                        }
                        options={
                            meta
                                ?.origens ??
                            []
                        }
                    />

                    <FilterSelect
                        label="Categoria"
                        value={
                            filters
                                .categoria
                        }
                        onChange={
                            value=>
                                patchFilter(
                                    "categoria",
                                    value
                                )
                        }
                        options={
                            meta
                                ?.categorias ??
                            []
                        }
                    />

                    <FilterSelect
                        label="Tipo"
                        value={
                            filters
                                .tipo
                        }
                        onChange={
                            value=>
                                patchFilter(
                                    "tipo",
                                    value
                                )
                        }
                        options={
                            meta
                                ?.tipos ??
                            []
                        }
                    />

                    <FilterSelect
                        label="Estado"
                        value={
                            filters
                                .status
                        }
                        onChange={
                            value=>
                                patchFilter(
                                    "status",
                                    value
                                )
                        }
                        options={
                            meta
                                ?.status ??
                            []
                        }
                    />

                    <DateFilter
                        label="Desde"
                        value={
                            filters
                                .data_inicio
                        }
                        onChange={
                            value=>
                                patchFilter(
                                    "data_inicio",
                                    value
                                )
                        }
                    />

                    <DateFilter
                        label="Até"
                        value={
                            filters
                                .data_fim
                        }
                        onChange={
                            value=>
                                patchFilter(
                                    "data_fim",
                                    value
                                )
                        }
                    />
                </div>
            </section>

            {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {actionError}
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400"/>

                        <span className="text-sm font-semibold text-slate-900">
                            Documentos
                        </span>
                    </div>

                    <span className="text-xs text-slate-400">
                        {pagination?.total ?? 0} registos
                    </span>
                </div>

                {listQuery.isLoading ? (
                    <Loading/>
                ) : listQuery.isError ? (
                    <div className="p-10 text-center text-sm text-red-600">
                        {errorMessage(
                            listQuery.error,
                            "Não foi possível carregar os documentos."
                        )}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-14 text-center">
                        <FileText className="mx-auto h-10 w-10 text-slate-300"/>

                        <p className="mt-3 font-semibold text-slate-700">
                            Nenhum documento encontrado
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Ajuste os filtros ou aguarde a criação de novos documentos.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <Th>
                                            Documento
                                        </Th>

                                        <Th>
                                            Categoria
                                        </Th>

                                        <Th>
                                            Entidades
                                        </Th>

                                        <Th>
                                            Estado
                                        </Th>

                                        <Th>
                                            Origem
                                        </Th>

                                        <Th>
                                            Data
                                        </Th>

                                        <Th>
                                            Ficheiro
                                        </Th>

                                        <Th>
                                            Ações
                                        </Th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {documents.map(
                                        document=>{
                                            const entities=
                                                entitySummary(
                                                    document
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        document.id
                                                    }
                                                    className="border-t border-slate-100 align-top hover:bg-slate-50/60"
                                                >
                                                    <Td>
                                                        <button
                                                            type="button"
                                                            onClick={()=>
                                                                setSelectedId(
                                                                    document.id
                                                                )
                                                            }
                                                            className="text-left"
                                                        >
                                                            <div className="font-mono text-xs font-bold text-indigo-600">
                                                                {
                                                                    document.codigo
                                                                }
                                                            </div>

                                                            <div className="mt-1 max-w-[280px] font-semibold text-slate-900">
                                                                {
                                                                    document.titulo
                                                                }
                                                            </div>

                                                            <div className="mt-1 text-xs text-slate-400">
                                                                {
                                                                    humanize(
                                                                        document.tipo
                                                                    )
                                                                }
                                                            </div>
                                                        </button>
                                                    </Td>

                                                    <Td>
                                                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                                            {
                                                                humanize(
                                                                    document.categoria
                                                                )
                                                            }
                                                        </span>
                                                    </Td>

                                                    <Td>
                                                        {entities.length ? (
                                                            <div className="max-w-[250px] space-y-1">
                                                                {entities.map(
                                                                    value=>(
                                                                        <div
                                                                            key={
                                                                                value
                                                                            }
                                                                            className="truncate text-xs text-slate-600"
                                                                        >
                                                                            {
                                                                                value
                                                                            }
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </Td>

                                                    <Td>
                                                        <span
                                                            className={[
                                                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                                statusClass(
                                                                    document.status
                                                                ),
                                                            ].join(
                                                                " "
                                                            )}
                                                        >
                                                            {
                                                                humanize(
                                                                    document.status
                                                                )
                                                            }
                                                        </span>
                                                    </Td>

                                                    <Td>
                                                        <span className="text-xs font-medium text-slate-600">
                                                            {
                                                                humanize(
                                                                    document.origem
                                                                )
                                                            }
                                                        </span>
                                                    </Td>

                                                    <Td>
                                                        <span className="whitespace-nowrap text-xs text-slate-500">
                                                            {
                                                                dateTime(
                                                                    document.created_at
                                                                )
                                                            }
                                                        </span>
                                                    </Td>

                                                    <Td>
                                                        {document.arquivo_path ? (
                                                            <div>
                                                                <div className="max-w-[180px] truncate text-xs font-medium text-slate-600">
                                                                    {
                                                                        document.arquivo_nome ??
                                                                        "Ficheiro"
                                                                    }
                                                                </div>

                                                                <div className="mt-1 text-[11px] text-slate-400">
                                                                    {
                                                                        fileSize(
                                                                            document.arquivo_tamanho
                                                                        )
                                                                    }
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">
                                                                Sem ficheiro
                                                            </span>
                                                        )}
                                                    </Td>

                                                    <Td>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                title="Detalhes"
                                                                onClick={()=>
                                                                    setSelectedId(
                                                                        document.id
                                                                    )
                                                                }
                                                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                            >
                                                                <Eye className="h-4 w-4"/>
                                                            </button>

                                                            {document.arquivo_path && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        title="Visualizar ficheiro"
                                                                        disabled={
                                                                            fileAction ===
                                                                            `view:${document.id}`
                                                                        }
                                                                        onClick={()=>
                                                                            void openFile(
                                                                                document
                                                                            )
                                                                        }
                                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                                                    >
                                                                        {fileAction ===
                                                                        `view:${document.id}` ? (
                                                                            <LoaderCircle className="h-4 w-4 animate-spin"/>
                                                                        ) : (
                                                                            <FileText className="h-4 w-4"/>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        title="Descarregar"
                                                                        disabled={
                                                                            fileAction ===
                                                                            `download:${document.id}`
                                                                        }
                                                                        onClick={()=>
                                                                            void downloadFile(
                                                                                document
                                                                            )
                                                                        }
                                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                                                    >
                                                                        {fileAction ===
                                                                        `download:${document.id}` ? (
                                                                            <LoaderCircle className="h-4 w-4 animate-spin"/>
                                                                        ) : (
                                                                            <Download className="h-4 w-4"/>
                                                                        )}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </Td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={
                                pagination?.current_page ??
                                1
                            }
                            lastPage={
                                pagination?.last_page ??
                                1
                            }
                            from={
                                pagination?.from ??
                                null
                            }
                            to={
                                pagination?.to ??
                                null
                            }
                            total={
                                pagination?.total ??
                                0
                            }
                            onPage={
                                setPage
                            }
                        />
                    </>
                )}
            </section>

            {selectedId && (
                <DocumentDetailModal
                    loading={
                        detailQuery.isLoading
                    }
                    error={
                        detailQuery.isError
                            ? errorMessage(
                                detailQuery.error,
                                "Não foi possível carregar o documento."
                            )
                            : null
                    }
                    document={
                        detailQuery.data ??
                        null
                    }
                    fileAction={
                        fileAction
                    }
                    onClose={()=>
                        setSelectedId(
                            null
                        )
                    }
                    onView={
                        openFile
                    }
                    onDownload={
                        downloadFile
                    }
                />
            )}
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
}:{
    label:string;
    value:number;
    icon:typeof FileText;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {label}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                        {value.toLocaleString(
                            "pt-PT"
                        )}
                    </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5"/>
                </div>
            </div>
        </div>
    );
}

function FilterSelect({
    label,
    value,
    options,
    onChange,
}:{
    label:string;
    value:string;
    options:Array<{
        value:string;
        label:string;
        total:number;
    }>;
    onChange:(value:string)=>void;
}){
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                {label}
            </span>

            <select
                value={
                    value
                }
                onChange={
                    event=>
                        onChange(
                            event
                                .target
                                .value
                        )
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
            >
                <option value="">
                    Todos
                </option>

                {options.map(
                    option=>(
                        <option
                            key={
                                option.value
                            }
                            value={
                                option.value
                            }
                        >
                            {option.label} ({option.total})
                        </option>
                    )
                )}
            </select>
        </label>
    );
}

function DateFilter({
    label,
    value,
    onChange,
}:{
    label:string;
    value:string;
    onChange:(value:string)=>void;
}){
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                {label}
            </span>

            <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>

                <input
                    type="date"
                    value={
                        value
                    }
                    onChange={
                        event=>
                            onChange(
                                event
                                    .target
                                    .value
                            )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                />
            </div>
        </label>
    );
}

function Pagination({
    page,
    lastPage,
    from,
    to,
    total,
    onPage,
}:{
    page:number;
    lastPage:number;
    from:number|null;
    to:number|null;
    total:number;
    onPage:(page:number)=>void;
}){
    return (
        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
            <div className="text-xs text-slate-500">
                {from ?? 0}–{to ?? 0} de {total}
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={
                        page <= 1
                    }
                    onClick={()=>
                        onPage(
                            page-1
                        )
                    }
                    className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
                >
                    <ChevronLeft className="h-4 w-4"/>
                    Anterior
                </button>

                <span className="px-2 text-xs font-medium text-slate-500">
                    {page} / {lastPage}
                </span>

                <button
                    type="button"
                    disabled={
                        page >=
                        lastPage
                    }
                    onClick={()=>
                        onPage(
                            page+1
                        )
                    }
                    className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
                >
                    Seguinte
                    <ChevronRight className="h-4 w-4"/>
                </button>
            </div>
        </div>
    );
}

function DocumentDetailModal({
    loading,
    error,
    document,
    fileAction,
    onClose,
    onView,
    onDownload,
}:{
    loading:boolean;
    error:string|null;
    document:Documento|null;
    fileAction:string|null;
    onClose:()=>void;
    onView:(document:Documento)=>Promise<void>;
    onDownload:(document:Documento)=>Promise<void>;
}){
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={
                    onClose
                }
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                            Central de Documentos
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            {document?.codigo ?? "Documento"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
                    >
                        <X className="h-4 w-4"/>
                    </button>
                </header>

                {loading ? (
                    <Loading/>
                ) : error ? (
                    <div className="p-6 text-sm text-red-600">
                        {error}
                    </div>
                ) : document ? (
                    <div className="space-y-6 p-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-950">
                                {document.titulo}
                            </h3>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                    {humanize(
                                        document.categoria
                                    )}
                                </span>

                                <span
                                    className={[
                                        "rounded-full px-3 py-1 text-xs font-semibold",
                                        statusClass(
                                            document.status
                                        ),
                                    ].join(
                                        " "
                                    )}
                                >
                                    {humanize(
                                        document.status
                                    )}
                                </span>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                    {humanize(
                                        document.origem
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Info
                                label="Código documental"
                                value={
                                    document.codigo
                                }
                            />

                            <Info
                                label="Número global"
                                value={
                                    String(
                                        document.numero_global
                                    )
                                }
                            />

                            <Info
                                label="Tipo"
                                value={
                                    humanize(
                                        document.tipo
                                    )
                                }
                            />

                            <Info
                                label="Criado em"
                                value={
                                    dateTime(
                                        document.created_at
                                    )
                                }
                            />

                            <Info
                                label="Finalizado em"
                                value={
                                    dateTime(
                                        document.finalizado_em
                                    )
                                }
                            />

                            <Info
                                label="Criado por"
                                value={
                                    document
                                        .criador
                                        ?.name ??
                                    "—"
                                }
                            />
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">
                                Entidades associadas
                            </h4>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <Info
                                    label="Empresa"
                                    value={
                                        document
                                            .empresa
                                            ?.nome_empresa ??
                                        "—"
                                    }
                                />

                                <Info
                                    label="Motorista"
                                    value={
                                        document
                                            .motorista
                                            ?.nome_completo ??
                                        "—"
                                    }
                                />

                                <Info
                                    label="Proprietário"
                                    value={
                                        document
                                            .proprietario
                                            ?.nome_empresa ||
                                        document
                                            .proprietario
                                            ?.nome_completo ||
                                        "—"
                                    }
                                />

                                <Info
                                    label="Veículo"
                                    value={
                                        document
                                            .veiculo
                                            ? [
                                                document
                                                    .veiculo
                                                    .matricula,
                                                document
                                                    .veiculo
                                                    .marca,
                                                document
                                                    .veiculo
                                                    .modelo,
                                            ]
                                                .filter(
                                                    Boolean
                                                )
                                                .join(
                                                    " · "
                                                )
                                            : "—"
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">
                                Ficheiro
                            </h4>

                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                {document.arquivo_path ? (
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                        <div>
                                            <div className="font-medium text-slate-800">
                                                {document.arquivo_nome ??
                                                    "Ficheiro"}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {document.arquivo_mime ??
                                                    "Tipo desconhecido"}
                                                {" · "}
                                                {fileSize(
                                                    document.arquivo_tamanho
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={
                                                    fileAction ===
                                                    `view:${document.id}`
                                                }
                                                onClick={()=>
                                                    void onView(
                                                        document
                                                    )
                                                }
                                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
                                            >
                                                <Eye className="h-4 w-4"/>
                                                Visualizar
                                            </button>

                                            <button
                                                type="button"
                                                disabled={
                                                    fileAction ===
                                                    `download:${document.id}`
                                                }
                                                onClick={()=>
                                                    void onDownload(
                                                        document
                                                    )
                                                }
                                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                                            >
                                                <Download className="h-4 w-4"/>
                                                Descarregar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500">
                                        Este registo documental ainda não possui um ficheiro associado.
                                    </div>
                                )}
                            </div>
                        </div>

                        {document.metadados &&
                            Object.keys(
                                document.metadados
                            ).length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900">
                                    Metadados
                                </h4>

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    {Object.entries(
                                        document.metadados
                                    ).map(
                                        ([
                                            key,
                                            value,
                                        ])=>(
                                            <Info
                                                key={
                                                    key
                                                }
                                                label={
                                                    humanize(
                                                        key
                                                    )
                                                }
                                                value={
                                                    typeof value ===
                                                    "object"
                                                        ? JSON.stringify(
                                                            value
                                                        )
                                                        : String(
                                                            value ??
                                                            "—"
                                                        )
                                                }
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {document.hash_arquivo && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900">
                                    Integridade
                                </h4>

                                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                                        <CheckCircle2 className="h-4 w-4"/>
                                        Hash SHA-256 registado
                                    </div>

                                    <div className="mt-2 break-all font-mono text-[11px] text-emerald-700/80">
                                        {document.hash_arquivo}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
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
        <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </div>

            <div className="mt-1 break-words text-sm font-medium text-slate-700">
                {value}
            </div>
        </div>
    );
}

function Th({
    children,
}:{
    children:React.ReactNode;
}){
    return (
        <th className="whitespace-nowrap bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
        <td className="px-5 py-4 text-sm text-slate-600">
            {children}
        </td>
    );
}

function Loading(){
    return (
        <div className="flex justify-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}