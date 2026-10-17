import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Activity,
    BarChart3,
    Clock3,
    Eye,
    Filter,
    Gauge,
    Globe2,
    MonitorSmartphone,
    RefreshCw,
    UsersRound,
} from "lucide-react";

import api from "../lib/api";

import type {
    AnalyticsBreakdown,
    AnalyticsChanges,
    AnalyticsContentRow,
    AnalyticsDashboardData,
    AnalyticsDashboardResponse,
    AnalyticsEventRow,
    AnalyticsPageRow,
    AnalyticsTrendPoint,
} from "../types/analytics";

type FilterState = {
    period:"7"|"30"|"90"|"custom";
    from:string;
    to:string;
    device:string;
    source:string;
    medium:string;
};

const defaultFilters:FilterState={
    period:"30",
    from:"",
    to:"",
    device:"",
    source:"",
    medium:"",
};

export default function BackofficeAnalyticsPage(){
    const [
        filters,
        setFilters,
    ]=useState<FilterState>(
        defaultFilters,
    );

    const [
        appliedFilters,
        setAppliedFilters,
    ]=useState<FilterState>(
        defaultFilters,
    );

    const [
        data,
        setData,
    ]=useState<AnalyticsDashboardData|null>(
        null,
    );

    const [
        loading,
        setLoading,
    ]=useState(true);

    const [
        error,
        setError,
    ]=useState<string|null>(
        null,
    );

    useEffect(
        ()=>{
            let active=true;

            async function load(){
                setLoading(true);
                setError(null);

                try{
                    const params:Record<
                        string,
                        string|number
                    >={};

                    if(
                        appliedFilters.period===
                        "custom"
                    ){
                        if(appliedFilters.from){
                            params.from=
                                appliedFilters.from;
                        }

                        if(appliedFilters.to){
                            params.to=
                                appliedFilters.to;
                        }
                    }
                    else{
                        params.days=
                            Number(
                                appliedFilters.period,
                            );
                    }

                    if(appliedFilters.device){
                        params.device=
                            appliedFilters.device;
                    }

                    if(appliedFilters.source){
                        params.source=
                            appliedFilters.source;
                    }

                    if(appliedFilters.medium){
                        params.medium=
                            appliedFilters.medium;
                    }

                    const response=
                        await api.get<AnalyticsDashboardResponse>(
                            "/api/backoffice/analytics",
                            {
                                params,
                            },
                        );

                    if(active){
                        setData(
                            response.data.data,
                        );
                    }
                }
                catch{
                    if(active){
                        setError(
                            "Não foi possível carregar os dados de Analytics.",
                        );
                    }
                }
                finally{
                    if(active){
                        setLoading(false);
                    }
                }
            }

            void load();

            return ()=>{
                active=false;
            };
        },
        [
            appliedFilters,
        ],
    );

    const hasActiveFilters=
        appliedFilters.device!=="" ||
        appliedFilters.source!=="" ||
        appliedFilters.medium!=="" ||
        appliedFilters.period!=="30";

    function applyFilters(){
        setAppliedFilters({
            ...filters,
        });
    }

    function resetFilters(){
        setFilters({
            ...defaultFilters,
        });

        setAppliedFilters({
            ...defaultFilters,
        });
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                        Inteligência da plataforma
                    </div>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                        Analytics
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Acompanhe audiência, utilização das páginas públicas,
                        aquisição, dispositivos e desempenho dos conteúdos do
                        FrotaPRO.
                    </p>
                </div>

                {data && (
                    <div className="text-xs text-slate-400">
                        Atualizado{" "}
                        {formatDateTime(
                            data.generated_at,
                        )}
                    </div>
                )}
            </header>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Filter className="h-4 w-4 text-indigo-600" />
                    Filtros
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <Field label="Período">
                        <select
                            value={filters.period}
                            onChange={event=>
                                setFilters(
                                    current=>({
                                        ...current,
                                        period:
                                            event.target.value as
                                            FilterState["period"],
                                    }),
                                )
                            }
                            className={inputClass}
                        >
                            <option value="7">
                                Últimos 7 dias
                            </option>
                            <option value="30">
                                Últimos 30 dias
                            </option>
                            <option value="90">
                                Últimos 90 dias
                            </option>
                            <option value="custom">
                                Personalizado
                            </option>
                        </select>
                    </Field>

                    <Field label="Dispositivo">
                        <select
                            value={filters.device}
                            onChange={event=>
                                setFilters(
                                    current=>({
                                        ...current,
                                        device:
                                            event.target.value,
                                    }),
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">
                                Todos
                            </option>

                            {data?.filters.devices.map(
                                option=>(
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ),
                            )}
                        </select>
                    </Field>

                    <Field label="Origem">
                        <select
                            value={filters.source}
                            onChange={event=>
                                setFilters(
                                    current=>({
                                        ...current,
                                        source:
                                            event.target.value,
                                    }),
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">
                                Todas
                            </option>

                            {data?.filters.sources.map(
                                option=>(
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ),
                            )}
                        </select>
                    </Field>

                    <Field label="Medium">
                        <select
                            value={filters.medium}
                            onChange={event=>
                                setFilters(
                                    current=>({
                                        ...current,
                                        medium:
                                            event.target.value,
                                    }),
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">
                                Todos
                            </option>

                            {data?.filters.mediums.map(
                                option=>(
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ),
                            )}
                        </select>
                    </Field>

                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                            Aplicar
                        </button>

                        <button
                            type="button"
                            onClick={resetFilters}
                            disabled={!hasActiveFilters}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Limpar filtros"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {filters.period==="custom" && (
                    <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
                        <Field label="Data inicial">
                            <input
                                type="date"
                                value={filters.from}
                                onChange={event=>
                                    setFilters(
                                        current=>({
                                            ...current,
                                            from:
                                                event.target.value,
                                        }),
                                    )
                                }
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Data final">
                            <input
                                type="date"
                                value={filters.to}
                                onChange={event=>
                                    setFilters(
                                        current=>({
                                            ...current,
                                            to:
                                                event.target.value,
                                        }),
                                    )
                                }
                                className={inputClass}
                            />
                        </Field>
                    </div>
                )}
            </section>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading && !data ? (
                <LoadingState />
            ) : data ? (
                <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                        <MetricCard
                            label="Sessões"
                            value={formatNumber(
                                data.metrics.sessions,
                            )}
                            change={
                                data.comparison.changes
                                    .sessions
                            }
                            icon={
                                <Activity className="h-5 w-5" />
                            }
                        />

                        <MetricCard
                            label="Visitantes"
                            value={formatNumber(
                                data.metrics.visitors,
                            )}
                            change={
                                data.comparison.changes
                                    .visitors
                            }
                            icon={
                                <UsersRound className="h-5 w-5" />
                            }
                        />

                        <MetricCard
                            label="Pageviews"
                            value={formatNumber(
                                data.metrics.pageviews,
                            )}
                            change={
                                data.comparison.changes
                                    .pageviews
                            }
                            icon={
                                <Eye className="h-5 w-5" />
                            }
                        />

                        <MetricCard
                            label="Páginas / sessão"
                            value={formatDecimal(
                                data.metrics
                                    .pages_per_session,
                            )}
                            change={
                                data.comparison.changes
                                    .pages_per_session
                            }
                            icon={
                                <Globe2 className="h-5 w-5" />
                            }
                        />

                        <MetricCard
                            label="Tempo ativo médio"
                            value={formatDuration(
                                data.metrics
                                    .avg_active_seconds,
                            )}
                            change={
                                data.comparison.changes
                                    .avg_active_seconds
                            }
                            icon={
                                <Clock3 className="h-5 w-5" />
                            }
                        />

                        <MetricCard
                            label="Engagement"
                            value={`${formatDecimal(
                                data.metrics
                                    .engagement_rate,
                            )}%`}
                            change={
                                data.comparison.changes
                                    .engagement_rate
                            }
                            icon={
                                <Gauge className="h-5 w-5" />
                            }
                        />
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <SectionHeading
                            title="Evolução da audiência"
                            description={`${formatDate(
                                data.period.from,
                            )} a ${formatDate(
                                data.period.to,
                            )}`}
                        />

                        <TrendChart
                            data={data.evolution}
                        />
                    </section>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <SectionHeading
                                title="Origem das sessões"
                                description="Aquisição por UTM source."
                            />

                            <BreakdownList
                                rows={
                                    data.acquisition.sources
                                }
                                emptyText="Ainda não existem dados de origem."
                            />
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <SectionHeading
                                title="Dispositivos"
                                description="Distribuição das sessões por tipo de dispositivo."
                            />

                            <BreakdownList
                                rows={
                                    data.audience.devices
                                }
                                emptyText="Ainda não existem dados de dispositivos."
                            />
                        </section>
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="p-5 sm:p-6">
                            <SectionHeading
                                title="Páginas mais vistas"
                                description="Desempenho das páginas públicas no período selecionado."
                            />
                        </div>

                        <PagesTable
                            rows={data.pages}
                        />
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="p-5 sm:p-6">
                            <SectionHeading
                                title="Conteúdos"
                                description="Desempenho dos artigos associados aos eventos de Analytics."
                            />
                        </div>

                        <ContentTable
                            rows={data.content}
                        />
                    </section>

                    <div className="grid gap-6 xl:grid-cols-3">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                            <SectionHeading
                                title="Eventos"
                                description="Eventos registados pelo sistema de Analytics."
                            />

                            <EventsTable
                                rows={data.events}
                            />
                        </section>

                        <div className="space-y-6">
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <SectionHeading
                                    title="Navegadores"
                                />

                                <SimpleList
                                    rows={
                                        data.audience.browsers
                                    }
                                />
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <SectionHeading
                                    title="Sistemas operativos"
                                />

                                <SimpleList
                                    rows={
                                        data.audience
                                            .operating_systems
                                    }
                                />
                            </section>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <SectionHeading
                                title="Medium"
                                description="Distribuição por UTM medium."
                            />

                            <BreakdownList
                                rows={
                                    data.acquisition.mediums
                                }
                                emptyText="Ainda não existem dados de medium."
                            />
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <SectionHeading
                                title="Campanhas"
                                description="Sessões identificadas por UTM campaign."
                            />

                            <BreakdownList
                                rows={
                                    data.acquisition.campaigns
                                }
                                emptyText="Ainda não existem campanhas UTM registadas."
                            />
                        </section>
                    </div>
                </>
            ) : null}
        </div>
    );
}

const inputClass=
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

function Field({
    label,
    children,
}:{
    label:string;
    children:React.ReactNode;
}){
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </span>

            {children}
        </label>
    );
}

function MetricCard({
    label,
    value,
    change,
    icon,
}:{
    label:string;
    value:string;
    change:number|null;
    icon:React.ReactNode;
}){
    const positive=
        change!==null &&
        change>0;

    const negative=
        change!==null &&
        change<0;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                    </div>

                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                        {value}
                    </div>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {icon}
                </div>
            </div>

            <div
                className={[
                    "mt-4 text-xs font-medium",
                    positive
                        ? "text-emerald-600"
                        : negative
                            ? "text-red-600"
                            : "text-slate-400",
                ].join(" ")}
            >
                {change===null
                    ? "Sem base comparável"
                    : `${change>0 ? "+" : ""}${formatDecimal(
                        change,
                    )}% vs. período anterior`}
            </div>
        </div>
    );
}

function SectionHeading({
    title,
    description,
}:{
    title:string;
    description?:string;
}){
    return (
        <div>
            <h2 className="text-lg font-bold text-slate-950">
                {title}
            </h2>

            {description && (
                <p className="mt-1 text-sm text-slate-500">
                    {description}
                </p>
            )}
        </div>
    );
}

function TrendChart({
    data,
}:{
    data:AnalyticsTrendPoint[];
}){
    const width=900;
    const height=260;
    const padding=30;

    const maxValue=
        Math.max(
            1,
            ...data.flatMap(
                item=>[
                    item.sessions,
                    item.pageviews,
                ],
            ),
        );

    const points=
        (
            key:
                "sessions"|
                "pageviews",
        )=>
            data
                .map(
                    (
                        item,
                        index,
                    )=>{
                        const x=
                            data.length<=1
                                ? width/2
                                : padding+
                                  (
                                      index/
                                      (
                                          data.length-1
                                      )
                                  )*
                                  (
                                      width-
                                      padding*2
                                  );

                        const y=
                            height-
                            padding-
                            (
                                item[key]/
                                maxValue
                            )*
                            (
                                height-
                                padding*2
                            );

                        return `${x},${y}`;
                    },
                )
                .join(" ");

    if(data.length===0){
        return (
            <Empty text="Ainda não existem dados no período selecionado." />
        );
    }

    return (
        <div className="mt-6">
            <div className="mb-4 flex flex-wrap gap-5 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    Pageviews
                </span>

                <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Sessões
                </span>
            </div>

            <div className="overflow-x-auto">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="min-w-[42rem] w-full"
                    role="img"
                    aria-label="Evolução de sessões e pageviews"
                >
                    {[0,1,2,3,4].map(
                        step=>{
                            const y=
                                padding+
                                (
                                    step/4
                                )*
                                (
                                    height-
                                    padding*2
                                );

                            return (
                                <line
                                    key={step}
                                    x1={padding}
                                    x2={width-padding}
                                    y1={y}
                                    y2={y}
                                    stroke="#e2e8f0"
                                    strokeWidth="1"
                                />
                            );
                        },
                    )}

                    <polyline
                        points={points(
                            "pageviews",
                        )}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    <polyline
                        points={points(
                            "sessions",
                        )}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                </svg>
            </div>

            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                <span>
                    {formatShortDate(
                        data[0].date,
                    )}
                </span>

                <span>
                    {formatShortDate(
                        data[
                            data.length-1
                        ].date,
                    )}
                </span>
            </div>
        </div>
    );
}

function BreakdownList({
    rows,
    emptyText,
}:{
    rows:AnalyticsBreakdown[];
    emptyText:string;
}){
    const max=
        Math.max(
            1,
            ...rows.map(
                item=>item.sessions,
            ),
        );

    if(rows.length===0){
        return (
            <Empty text={emptyText} />
        );
    }

    return (
        <div className="mt-5 space-y-4">
            {rows.map(
                row=>(
                    <div key={row.value}>
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="min-w-0 truncate font-medium text-slate-700">
                                {row.label}
                            </span>

                            <span className="shrink-0 font-semibold text-slate-950">
                                {formatNumber(
                                    row.sessions,
                                )}
                            </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{
                                    width:
                                        `${
                                            (
                                                row.sessions/
                                                max
                                            )*100
                                        }%`,
                                }}
                            />
                        </div>
                    </div>
                ),
            )}
        </div>
    );
}

function SimpleList({
    rows,
}:{
    rows:AnalyticsBreakdown[];
}){
    if(rows.length===0){
        return (
            <Empty text="Sem dados." />
        );
    }

    return (
        <div className="mt-4 space-y-3">
            {rows.map(
                row=>(
                    <div
                        key={row.value}
                        className="flex items-center justify-between gap-3 text-sm"
                    >
                        <span className="truncate text-slate-600">
                            {row.label}
                        </span>

                        <span className="font-semibold text-slate-900">
                            {formatNumber(
                                row.sessions,
                            )}
                        </span>
                    </div>
                ),
            )}
        </div>
    );
}

function PagesTable({
    rows,
}:{
    rows:AnalyticsPageRow[];
}){
    if(rows.length===0){
        return (
            <Empty text="Ainda não existem pageviews para apresentar." />
        );
    }

    return (
        <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full">
                <thead className="bg-slate-50">
                    <tr>
                        <Th>Página</Th>
                        <Th>Views</Th>
                        <Th>Sessões</Th>
                        <Th>Tempo médio</Th>
                        <Th>Scroll</Th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {rows.map(
                        row=>(
                            <tr key={row.url}>
                                <Td>
                                    <div
                                        className="max-w-xl truncate font-medium text-slate-900"
                                        title={row.url}
                                    >
                                        {row.path}
                                    </div>
                                </Td>

                                <Td>
                                    {formatNumber(
                                        row.views,
                                    )}
                                </Td>

                                <Td>
                                    {formatNumber(
                                        row.sessions,
                                    )}
                                </Td>

                                <Td>
                                    {formatDuration(
                                        row.avg_active_seconds,
                                    )}
                                </Td>

                                <Td>
                                    {formatDecimal(
                                        row.avg_scroll_percent,
                                    )}%
                                </Td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}

function ContentTable({
    rows,
}:{
    rows:AnalyticsContentRow[];
}){
    if(rows.length===0){
        return (
            <Empty text="Ainda não existem eventos associados a conteúdos." />
        );
    }

    return (
        <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full">
                <thead className="bg-slate-50">
                    <tr>
                        <Th>Conteúdo</Th>
                        <Th>Views</Th>
                        <Th>Leituras</Th>
                        <Th>Taxa leitura</Th>
                        <Th>Tempo médio</Th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {rows.map(
                        row=>(
                            <tr key={row.id}>
                                <Td>
                                    <div className="max-w-xl font-medium text-slate-900">
                                        {row.title}
                                    </div>
                                </Td>

                                <Td>
                                    {formatNumber(
                                        row.views,
                                    )}
                                </Td>

                                <Td>
                                    {formatNumber(
                                        row.reads,
                                    )}
                                </Td>

                                <Td>
                                    {formatDecimal(
                                        row.read_rate,
                                    )}%
                                </Td>

                                <Td>
                                    {formatDuration(
                                        row.avg_active_seconds,
                                    )}
                                </Td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}

function EventsTable({
    rows,
}:{
    rows:AnalyticsEventRow[];
}){
    if(rows.length===0){
        return (
            <Empty text="Ainda não existem eventos no período selecionado." />
        );
    }

    return (
        <div className="mt-5 overflow-x-auto">
            <table className="min-w-full">
                <thead>
                    <tr className="border-b border-slate-100">
                        <Th>Evento</Th>
                        <Th>Total</Th>
                        <Th>Sessões</Th>
                        <Th>Tempo</Th>
                        <Th>Scroll</Th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {rows.map(
                        row=>(
                            <tr key={row.event}>
                                <Td>
                                    <span className="font-medium text-slate-900">
                                        {eventLabel(
                                            row.event,
                                        )}
                                    </span>
                                </Td>

                                <Td>
                                    {formatNumber(
                                        row.total,
                                    )}
                                </Td>

                                <Td>
                                    {formatNumber(
                                        row.sessions,
                                    )}
                                </Td>

                                <Td>
                                    {formatDuration(
                                        row.avg_active_seconds,
                                    )}
                                </Td>

                                <Td>
                                    {formatDecimal(
                                        row.avg_scroll_percent,
                                    )}%
                                </Td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}

function Th({
    children,
}:{
    children:React.ReactNode;
}){
    return (
        <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
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

function Empty({
    text,
}:{
    text:string;
}){
    return (
        <div className="px-6 py-10 text-center text-sm text-slate-400">
            {text}
        </div>
    );
}

function LoadingState(){
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({
                length:6,
            }).map(
                (_,index)=>(
                    <div
                        key={index}
                        className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
                    />
                ),
            )}
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

function formatDecimal(
    value:number,
):string{
    return new Intl.NumberFormat(
        "pt-PT",
        {
            maximumFractionDigits:1,
        },
    ).format(
        value,
    );
}

function formatDuration(
    seconds:number,
):string{
    const rounded=
        Math.max(
            0,
            Math.round(
                seconds,
            ),
        );

    if(rounded<60){
        return `${rounded}s`;
    }

    const minutes=
        Math.floor(
            rounded/60,
        );

    const remaining=
        rounded%60;

    if(minutes<60){
        return `${minutes}m ${remaining}s`;
    }

    const hours=
        Math.floor(
            minutes/60,
        );

    const min=
        minutes%60;

    return `${hours}h ${min}m`;
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
        new Date(
            `${value}T12:00:00`,
        ),
    );
}

function formatShortDate(
    value:string,
):string{
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            day:"2-digit",
            month:"2-digit",
        },
    ).format(
        new Date(
            `${value}T12:00:00`,
        ),
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
        new Date(
            value,
        ),
    );
}

function eventLabel(
    value:string,
):string{
    const labels:Record<
        string,
        string
    >={
        page_view:"Visualização de página",
        page_exit:"Saída de página",
        article_view:"Visualização de artigo",
        article_read:"Leitura de artigo",
        search:"Pesquisa",
    };

    return labels[value] ??
        value.replaceAll(
            "_",
            " ",
        );
}