export type AnalyticsMetrics = {
    sessions:number;
    visitors:number;
    pageviews:number;
    pages_per_session:number;
    avg_active_seconds:number;
    engaged_sessions:number;
    engagement_rate:number;
};

export type AnalyticsChanges = {
    sessions:number|null;
    visitors:number|null;
    pageviews:number|null;
    pages_per_session:number|null;
    avg_active_seconds:number|null;
    engagement_rate:number|null;
};

export type AnalyticsTrendPoint = {
    date:string;
    sessions:number;
    visitors:number;
    pageviews:number;
    avg_active_seconds:number;
};

export type AnalyticsBreakdown = {
    value:string;
    label:string;
    sessions:number;
    visitors?:number;
    pageviews?:number;
};

export type AnalyticsPageRow = {
    url:string;
    path:string;
    views:number;
    sessions:number;
    avg_active_seconds:number;
    avg_scroll_percent:number;
};

export type AnalyticsContentRow = {
    id:string;
    title:string;
    slug:string;
    views:number;
    reads:number;
    read_rate:number;
    avg_active_seconds:number;
};

export type AnalyticsEventRow = {
    event:string;
    total:number;
    sessions:number;
    avg_active_seconds:number;
    avg_scroll_percent:number;
};

export type AnalyticsFilterOption = {
    value:string;
    label:string;
};

export type AnalyticsDashboardData = {
    period:{
        from:string;
        to:string;
        days:number;
    };

    metrics:AnalyticsMetrics;

    comparison:{
        previous:AnalyticsMetrics;
        changes:AnalyticsChanges;
    };

    evolution:AnalyticsTrendPoint[];

    acquisition:{
        sources:AnalyticsBreakdown[];
        mediums:AnalyticsBreakdown[];
        campaigns:AnalyticsBreakdown[];
        referrers:AnalyticsBreakdown[];
    };

    audience:{
        devices:AnalyticsBreakdown[];
        browsers:AnalyticsBreakdown[];
        operating_systems:AnalyticsBreakdown[];
    };

    pages:AnalyticsPageRow[];
    content:AnalyticsContentRow[];
    events:AnalyticsEventRow[];

    filters:{
        devices:AnalyticsFilterOption[];
        sources:AnalyticsFilterOption[];
        mediums:AnalyticsFilterOption[];
    };

    generated_at:string;
};

export type AnalyticsDashboardResponse = {
    data:AnalyticsDashboardData;
};