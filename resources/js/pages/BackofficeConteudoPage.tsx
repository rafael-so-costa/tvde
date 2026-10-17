import {
    AlertTriangle,
    Archive,
    BookOpen,
    CalendarClock,
    ExternalLink,
    Eye,
    FileText,
    Gauge,
    Lightbulb,
    LoaderCircle,
    Pencil,
    Plus,
    Search,
    TrendingUp,
} from "lucide-react";

import {
    useState,
} from "react";

import type {
    FormEvent,
    ReactNode,
} from "react";

import {
    useQuery,
} from "@tanstack/react-query";

import {
    Link,
    useNavigate,
} from "react-router-dom";

import api from "../lib/api";
import {
    appUrl,
} from "../lib/runtime";

type Category={
    id:string;
    nome:string;
    slug?:string;
    posts_count?:number;
    conteudos_count?:number;
};

type Post={
    id:string;
    titulo:string;
    slug:string;
    tipo:string;
    status:string;
    publicado_em?:string|null;
    updated_at?:string|null;
    views_count?:number;
    reads_count?:number;
    last_view_at?:string|null;
    categorias?:Category[];
    categoria?:Category|null;
};

type PostsResponse={
    data:Post[];
    current_page:number;
    last_page:number;
    total:number;
    from?:number|null;
    to?:number|null;
};

type Dashboard={
    periodo_dias:number;
    periodo_inicio:string;
    metrics:{
        total:number;
        publicados:number;
        rascunhos:number;
        agendados:number;
        arquivados:number;
        views_total:number;
        reads_total:number;
        views_period:number;
        reads_period:number;
        read_rate_period:number;
        articles_with_views_period:number;
    };
    top_posts:Array<{
        id:string;
        titulo:string;
        slug:string;
        status:string;
        views:number;
        reads:number;
        read_rate:number;
        last_view_at?:string|null;
        categorias:Category[];
    }>;
};

type SearchStat={
    id:string;
    termo:string;
    termo_normalizado:string;
    total_buscas:number;
    buscas_sem_resultado:number;
    ultimo_resultado_count:number;
    primeira_busca_em:string;
    ultima_busca_em:string;
    conteudo_post_id?:string|null;
    pauta_criada_em?:string|null;
    pauta?:{
        id:string;
        titulo:string;
        slug:string;
        status:string;
    }|null;
};

type SearchAnalytics={
    periodo_dias:number;
    total_termos:number;
    total_buscas:number;
    top:SearchStat[];
    lacunas_conteudo:SearchStat[];
};

export default function BackofficeConteudoPage() {
    const navigate=useNavigate();

    const [creatingTopicId,setCreatingTopicId]=
        useState<string|null>(
            null,
        );

    const [topicError,setTopicError]=
        useState<string|null>(
            null,
        );

    const [draftQ,setDraftQ]=
        useState("");

    const [q,setQ]=
        useState("");

    const [status,setStatus]=
        useState("");

    const [tipo,setTipo]=
        useState("");

    const [categoryId,setCategoryId]=
        useState("");

    const [page,setPage]=
        useState(1);

    const dashboardQuery=
        useQuery({
            queryKey:[
                "backoffice",
                "conteudo",
                "dashboard",
            ],

            queryFn:async()=>{
                const response=
                    await api.get(
                        "/api/backoffice/conteudo/dashboard",
                        {
                            params:{
                                dias:30,
                            },
                        },
                    );

                return response.data
                    .data as Dashboard;
            },
        });

    const searchesQuery=
        useQuery({
            queryKey:[
                "backoffice",
                "conteudo",
                "buscas",
            ],

            queryFn:async()=>{
                const response=
                    await api.get(
                        "/api/backoffice/conteudo/buscas",
                        {
                            params:{
                                dias:90,
                            },
                        },
                    );

                return response
                    .data as SearchAnalytics;
            },
        });

    const categoriesQuery=
        useQuery({
            queryKey:[
                "backoffice",
                "conteudo",
                "categorias",
            ],

            queryFn:async()=>{
                const response=
                    await api.get(
                        "/api/backoffice/conteudo/categorias",
                    );

                return response.data
                    .data as Category[];
            },
        });

    const postsQuery=
        useQuery({
            queryKey:[
                "backoffice",
                "conteudo",
                "lista",
                q,
                status,
                tipo,
                categoryId,
                page,
            ],

            queryFn:async()=>{
                const response=
                    await api.get(
                        "/api/backoffice/conteudo",
                        {
                            params:{
                                q:q || undefined,
                                status:
                                    status ||
                                    undefined,
                                tipo:
                                    tipo ||
                                    undefined,
                                categoria_id:
                                    categoryId ||
                                    undefined,
                                page,
                            },
                        },
                    );

                return response
                    .data as PostsResponse;
            },
        });

    async function createTopic(
        item:SearchStat,
    ){
        if(
            creatingTopicId
        ){
            return;
        }

        setCreatingTopicId(
            item.id,
        );

        setTopicError(
            null,
        );

        try{
            const response=
                await api.post(
                    `/api/backoffice/conteudo/buscas/${item.id}/pauta`,
                );

            const post=
                response.data
                    .data as Post;

            navigate(
                `/backoffice/conteudo/${post.id}`,
            );
        }catch{
            setTopicError(
                "Não foi possível criar a pauta. Tente novamente.",
            );

            setCreatingTopicId(
                null,
            );
        }
    }

    function submitSearch(
        event:FormEvent,
    ){
        event.preventDefault();

        setPage(1);
        setQ(
            draftQ.trim(),
        );
    }

    function resetFilters(){
        setDraftQ("");
        setQ("");
        setStatus("");
        setTipo("");
        setCategoryId("");
        setPage(1);
    }

    const loading=
        dashboardQuery.isLoading ||
        searchesQuery.isLoading ||
        categoriesQuery.isLoading ||
        postsQuery.isLoading;

    if(
        loading &&
        !dashboardQuery.data
    ){
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
            </div>
        );
    }

    if(
        dashboardQuery.isError
    ){
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Não foi possível carregar o dashboard editorial.
            </div>
        );
    }

    const dashboard=
        dashboardQuery.data;

    const metrics=
        dashboard?.metrics;

    const searches=
        searchesQuery.data;

    const posts=
        postsQuery.data;

    const categories=
        categoriesQuery.data ?? [];

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-indigo-600">
                        Conteúdo e SEO
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        Dashboard editorial
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Acompanhe desempenho dos artigos, comportamento de leitura e aquilo que os visitantes procuram no Blog FrotaPRO.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/backoffice/seo"
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Gerir SEO
                    </Link>

                    <Link
                        to="/backoffice/conteudo/novo"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4"/>
                        Novo conteúdo
                    </Link>
                </div>
            </section>

            {metrics && (
                <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            label="Conteúdos"
                            value={metrics.total}
                            detail={`${metrics.publicados} publicados`}
                            icon={FileText}
                        />

                        <MetricCard
                            label="Views — 30 dias"
                            value={metrics.views_period}
                            detail={`${formatNumber(metrics.views_total)} desde o início`}
                            icon={Eye}
                        />

                        <MetricCard
                            label="Leituras — 30 dias"
                            value={metrics.reads_period}
                            detail={`${formatNumber(metrics.reads_total)} desde o início`}
                            icon={BookOpen}
                        />

                        <MetricCard
                            label="Taxa de leitura"
                            value={`${metrics.read_rate_period}%`}
                            detail="Leituras / visualizações"
                            icon={Gauge}
                        />
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatusCard
                            label="Publicados"
                            value={metrics.publicados}
                            className="text-emerald-700 bg-emerald-50"
                        />

                        <StatusCard
                            label="Rascunhos"
                            value={metrics.rascunhos}
                            className="text-slate-700 bg-slate-100"
                        />

                        <StatusCard
                            label="Agendados"
                            value={metrics.agendados}
                            className="text-amber-700 bg-amber-50"
                        />

                        <StatusCard
                            label="Arquivados"
                            value={metrics.arquivados}
                            className="text-slate-500 bg-slate-50"
                        />
                    </section>
                </>
            )}

            <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-slate-950">
                                Artigos mais vistos
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Ranking dos últimos 30 dias.
                            </p>
                        </div>

                        <TrendingUp className="h-5 w-5 text-indigo-500"/>
                    </div>

                    {!dashboard?.top_posts.length ? (
                        <Empty
                            text="Ainda não existem visualizações suficientes para formar um ranking."
                        />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {dashboard.top_posts.map(
                                (post,index)=>(
                                    <div
                                        key={post.id}
                                        className="flex gap-4 px-5 py-4"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                                            {index+1}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <Link
                                                        to={`/backoffice/conteudo/${post.id}`}
                                                        className="font-semibold leading-5 text-slate-900 hover:text-indigo-600"
                                                    >
                                                        {post.titulo}
                                                    </Link>

                                                    {!!post.categorias.length && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {post.categorias
                                                                .slice(0,3)
                                                                .map(category=>(
                                                                    <span
                                                                        key={category.id}
                                                                        className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500"
                                                                    >
                                                                        {category.nome}
                                                                    </span>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <a
                                                    href={appUrl(`blog/${post.slug}`)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="shrink-0 text-slate-400 hover:text-indigo-600"
                                                    title="Abrir artigo"
                                                >
                                                    <ExternalLink className="h-4 w-4"/>
                                                </a>
                                            </div>

                                            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                                                <MiniMetric
                                                    label="Views"
                                                    value={post.views}
                                                />

                                                <MiniMetric
                                                    label="Leituras"
                                                    value={post.reads}
                                                />

                                                <MiniMetric
                                                    label="Taxa"
                                                    value={`${post.read_rate}%`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-indigo-500"/>

                            <h2 className="font-semibold text-slate-950">
                                Pesquisas do Blog
                            </h2>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                            Interesse dos visitantes nos últimos 90 dias.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 border-b border-slate-100">
                        <div className="border-r border-slate-100 p-5">
                            <div className="text-2xl font-bold text-slate-950">
                                {formatNumber(
                                    searches?.total_buscas ?? 0,
                                )}
                            </div>

                            <div className="mt-1 text-xs font-medium text-slate-500">
                                pesquisas
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="text-2xl font-bold text-slate-950">
                                {formatNumber(
                                    searches?.total_termos ?? 0,
                                )}
                            </div>

                            <div className="mt-1 text-xs font-medium text-slate-500">
                                termos diferentes
                            </div>
                        </div>
                    </div>

                    {!searches?.top.length ? (
                        <Empty text="Ainda não existem pesquisas registadas."/>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {searches.top
                                .slice(0,8)
                                .map((item,index)=>(
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 px-5 py-3.5"
                                    >
                                        <span className="w-5 text-xs font-bold text-slate-300">
                                            {index+1}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-slate-800">
                                                {item.termo}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {item.ultimo_resultado_count} resultados na última pesquisa
                                            </div>
                                        </div>

                                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                                            {item.total_buscas}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-amber-600"/>

                            <h2 className="font-semibold text-slate-950">
                                Oportunidades de conteúdo
                            </h2>
                        </div>

                        <p className="mt-1 text-sm text-slate-600">
                            Assuntos pesquisados pelos visitantes para os quais o Blog ainda não devolve resultados.
                        </p>
                    </div>

                    <span className="self-start rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm">
                        {searches?.lacunas_conteudo.length ?? 0} oportunidades
                    </span>
                </div>

                {topicError && (
                    <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
                        {topicError}
                    </div>
                )}

                {!searches?.lacunas_conteudo.length ? (
                    <div className="px-6 py-10 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                            <BookOpen className="h-5 w-5 text-emerald-600"/>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-800">
                            Nenhuma lacuna identificada por enquanto.
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Novas pesquisas sem resultado aparecerão automaticamente aqui.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-100 bg-slate-50">
                                <tr>
                                    <Th>Termo pesquisado</Th>
                                    <Th>Buscas</Th>
                                    <Th>Sem resultado</Th>
                                    <Th>Última busca</Th>
                                    <Th>Prioridade</Th>
                                    <Th/>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {searches.lacunas_conteudo.map(
                                    item=>(
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/70"
                                        >
                                            <Td>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="font-semibold text-slate-900">
                                                        {item.termo}
                                                    </div>

                                                    {item.pauta && (
                                                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                                            Em produção
                                                        </span>
                                                    )}
                                                </div>
                                            </Td>

                                            <Td>
                                                {item.total_buscas}
                                            </Td>

                                            <Td>
                                                {item.buscas_sem_resultado}
                                            </Td>

                                            <Td>
                                                {formatDateTime(
                                                    item.ultima_busca_em,
                                                )}
                                            </Td>

                                            <Td>
                                                <OpportunityBadge
                                                    searches={item.total_buscas}
                                                />
                                            </Td>

                                            <Td>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={()=>{
                                                            void navigator.clipboard.writeText(
                                                                item.termo,
                                                            );
                                                        }}
                                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                                                    >
                                                        Copiar
                                                    </button>

                                                    {item.pauta ? (
                                                        <Link
                                                            to={`/backoffice/conteudo/${item.pauta.id}`}
                                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5"/>
                                                            Abrir pauta
                                                        </Link>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                creatingTopicId===
                                                                item.id
                                                            }
                                                            onClick={()=>
                                                                void createTopic(
                                                                    item,
                                                                )
                                                            }
                                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                                                        >
                                                            {creatingTopicId===item.id ? (
                                                                <>
                                                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin"/>
                                                                    Criando...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus className="h-3.5 w-3.5"/>
                                                                    Criar artigo
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </Td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-950">
                                Conteúdos
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Gestão completa dos artigos e notícias.
                            </p>
                        </div>

                        <form
                            onSubmit={submitSearch}
                            className="flex w-full gap-2 lg:max-w-md"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>

                                <input
                                    value={draftQ}
                                    onChange={event=>
                                        setDraftQ(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Pesquisar conteúdo..."
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
                                />
                            </div>

                            <button
                                type="submit"
                                className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
                            >
                                Buscar
                            </button>
                        </form>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <select
                            value={status}
                            onChange={event=>{
                                setStatus(
                                    event.target.value,
                                );
                                setPage(1);
                            }}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"
                        >
                            <option value="">
                                Todos os estados
                            </option>
                            <option value="rascunho">
                                Rascunhos
                            </option>
                            <option value="agendado">
                                Agendados
                            </option>
                            <option value="publicado">
                                Publicados
                            </option>
                            <option value="arquivado">
                                Arquivados
                            </option>
                        </select>

                        <select
                            value={tipo}
                            onChange={event=>{
                                setTipo(
                                    event.target.value,
                                );
                                setPage(1);
                            }}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"
                        >
                            <option value="">
                                Artigos e notícias
                            </option>
                            <option value="artigo">
                                Artigos
                            </option>
                            <option value="noticia">
                                Notícias
                            </option>
                        </select>

                        <select
                            value={categoryId}
                            onChange={event=>{
                                setCategoryId(
                                    event.target.value,
                                );
                                setPage(1);
                            }}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"
                        >
                            <option value="">
                                Todas as categorias
                            </option>

                            {categories.map(
                                category=>(
                                    <option
                                        key={category.id}
                                        value={category.id}
                                    >
                                        {category.nome}
                                    </option>
                                ),
                            )}
                        </select>

                        {(q ||
                            status ||
                            tipo ||
                            categoryId) && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500 hover:text-indigo-600"
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                </div>

                {postsQuery.isLoading ? (
                    <div className="flex justify-center py-16">
                        <LoaderCircle className="h-6 w-6 animate-spin text-indigo-600"/>
                    </div>
                ) : !posts?.data.length ? (
                    <Empty text="Nenhum conteúdo encontrado."/>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-left">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        <Th>Conteúdo</Th>
                                        <Th>Estado</Th>
                                        <Th>Categorias</Th>
                                        <Th>Views</Th>
                                        <Th>Leituras</Th>
                                        <Th>Taxa</Th>
                                        <Th>Publicação</Th>
                                        <Th/>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {posts.data.map(
                                        post=>{
                                            const views=
                                                Number(
                                                    post.views_count ??
                                                    0,
                                                );

                                            const reads=
                                                Number(
                                                    post.reads_count ??
                                                    0,
                                                );

                                            const rate=
                                                views>0
                                                    ? Math.min(
                                                        100,
                                                        Math.round(
                                                            (
                                                                reads/
                                                                views
                                                            )*
                                                            1000,
                                                        )/
                                                        10,
                                                    )
                                                    : 0;

                                            const postCategories=
                                                post.categorias?.length
                                                    ? post.categorias
                                                    : post.categoria
                                                      ? [post.categoria]
                                                      : [];

                                            return (
                                                <tr
                                                    key={post.id}
                                                    className="transition hover:bg-slate-50/70"
                                                >
                                                    <Td>
                                                        <div className="max-w-md">
                                                            <Link
                                                                to={`/backoffice/conteudo/${post.id}`}
                                                                className="font-semibold text-slate-900 hover:text-indigo-600"
                                                            >
                                                                {post.titulo}
                                                            </Link>

                                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                                <span>
                                                                    {post.tipo==="noticia"
                                                                        ? "Notícia"
                                                                        : "Artigo"}
                                                                </span>

                                                                <span>•</span>

                                                                <span className="truncate">
                                                                    /{post.slug}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Td>

                                                    <Td>
                                                        <StatusBadge
                                                            status={post.status}
                                                        />
                                                    </Td>

                                                    <Td>
                                                        <div className="flex max-w-xs flex-wrap gap-1">
                                                            {postCategories.length ? (
                                                                postCategories
                                                                    .slice(0,3)
                                                                    .map(category=>(
                                                                        <span
                                                                            key={category.id}
                                                                            className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                                                                        >
                                                                            {category.nome}
                                                                        </span>
                                                                    ))
                                                            ) : (
                                                                <span className="text-xs text-amber-600">
                                                                    Sem categoria
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Td>

                                                    <Td>
                                                        <strong className="text-slate-800">
                                                            {formatNumber(views)}
                                                        </strong>
                                                    </Td>

                                                    <Td>
                                                        {formatNumber(reads)}
                                                    </Td>

                                                    <Td>
                                                        <span
                                                            className={[
                                                                "font-semibold",
                                                                rate>=50
                                                                    ? "text-emerald-600"
                                                                    : rate>=25
                                                                      ? "text-amber-600"
                                                                      : "text-slate-500",
                                                            ].join(" ")}
                                                        >
                                                            {rate}%
                                                        </span>
                                                    </Td>

                                                    <Td>
                                                        <div className="text-sm text-slate-600">
                                                            {post.publicado_em
                                                                ? formatDate(post.publicado_em)
                                                                : "—"}
                                                        </div>
                                                    </Td>

                                                    <Td>
                                                        <div className="flex justify-end gap-1">
                                                            {post.status==="publicado" && (
                                                                <a
                                                                    href={appUrl(`blog/${post.slug}`)}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    title="Abrir artigo"
                                                                    className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                                                                >
                                                                    <ExternalLink className="h-4 w-4"/>
                                                                </a>
                                                            )}

                                                            <Link
                                                                to={`/backoffice/conteudo/${post.id}`}
                                                                title="Editar"
                                                                className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                                                            >
                                                                <Pencil className="h-4 w-4"/>
                                                            </Link>
                                                        </div>
                                                    </Td>
                                                </tr>
                                            );
                                        },
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                            <div className="text-sm text-slate-500">
                                {posts.total} conteúdos
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={posts.current_page<=1}
                                    onClick={()=>
                                        setPage(current=>
                                            Math.max(
                                                1,
                                                current-1,
                                            ),
                                        )
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Anterior
                                </button>

                                <span className="flex items-center px-2 text-sm text-slate-500">
                                    {posts.current_page} / {posts.last_page}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        posts.current_page>=
                                        posts.last_page
                                    }
                                    onClick={()=>
                                        setPage(current=>
                                            current+1,
                                        )
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function MetricCard({
    label,
    value,
    detail,
    icon:Icon,
}:{
    label:string;
    value:number|string;
    detail:string;
    icon:typeof Eye;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-medium text-slate-500">
                        {label}
                    </div>

                    <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                        {typeof value==="number"
                            ? formatNumber(value)
                            : value}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                        {detail}
                    </div>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5"/>
                </div>
            </div>
        </div>
    );
}

function StatusCard({
    label,
    value,
    className,
}:{
    label:string;
    value:number;
    className:string;
}){
    return (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {label}
                </div>

                <div className="mt-1 text-2xl font-bold text-slate-950">
                    {value}
                </div>
            </div>

            <div
                className={[
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    className,
                ].join(" ")}
            >
                {label==="Agendados" ? (
                    <CalendarClock className="h-4 w-4"/>
                ) : label==="Arquivados" ? (
                    <Archive className="h-4 w-4"/>
                ) : (
                    <FileText className="h-4 w-4"/>
                )}
            </div>
        </div>
    );
}

function MiniMetric({
    label,
    value,
}:{
    label:string;
    value:number|string;
}){
    return (
        <div>
            <div className="font-bold text-slate-800">
                {typeof value==="number"
                    ? formatNumber(value)
                    : value}
            </div>

            <div className="mt-0.5 text-slate-400">
                {label}
            </div>
        </div>
    );
}

function OpportunityBadge({
    searches,
}:{
    searches:number;
}){
    if(searches>=5){
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3"/>
                Alta
            </span>
        );
    }

    if(searches>=2){
        return (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                Média
            </span>
        );
    }

    return (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Baixa
        </span>
    );
}

function StatusBadge({
    status,
}:{
    status:string;
}){
    const map:Record<
        string,
        string
    >={
        publicado:
            "bg-emerald-50 text-emerald-700",

        rascunho:
            "bg-slate-100 text-slate-600",

        agendado:
            "bg-amber-50 text-amber-700",

        arquivado:
            "bg-slate-100 text-slate-500",
    };

    const labels:Record<
        string,
        string
    >={
        publicado:"Publicado",
        rascunho:"Rascunho",
        agendado:"Agendado",
        arquivado:"Arquivado",
    };

    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                map[status] ??
                    "bg-slate-100 text-slate-600",
            ].join(" ")}
        >
            {labels[status] ?? status}
        </span>
    );
}

function Th({
    children,
}:{
    children?:ReactNode;
}){
    return (
        <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}

function Td({
    children,
}:{
    children:ReactNode;
}){
    return (
        <td className="px-5 py-4 text-sm text-slate-600">
            {children}
        </td>
    );
}

function Empty({
    text,
}:{
    text:string;
}){
    return (
        <div className="px-6 py-14 text-center text-sm text-slate-400">
            {text}
        </div>
    );
}

function formatNumber(
    value:number,
):string{
    return new Intl.NumberFormat(
        "pt-PT",
    ).format(
        value,
    );
}

function formatDate(
    value:string,
):string{
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            day:"2-digit",
            month:"2-digit",
            year:"numeric",
        },
    ).format(
        new Date(value),
    );
}

function formatDateTime(
    value:string,
):string{
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            day:"2-digit",
            month:"2-digit",
            year:"numeric",
            hour:"2-digit",
            minute:"2-digit",
        },
    ).format(
        new Date(value),
    );
}