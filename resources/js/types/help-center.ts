export interface HelpOption{
    value:string;
    label:string;
}

export interface HelpCategory{
    id:string;
    name:string;
    slug:string;
    description:string|null;
    position:number;
    active:boolean;
    contents_count?:number;
}

export interface HelpAudience extends HelpOption{}

export interface HelpContent{
    id:string;
    title:string;
    slug:string;
    type:"article"|"video";
    type_label:string;
    excerpt:string|null;
    body?:string|null;
    category:{
        id:string;
        name:string;
        slug:string;
    };
    feature_key:string|null;
    feature_label:string|null;
    featured:boolean;
    position:number;
    youtube_video_id:string|null;
    youtube_thumbnail_url:string|null;
    youtube_url?:string|null;
    youtube_embed_url?:string|null;
    published_at:string|null;
    views:number;
    viewed?:boolean;
    audiences?:HelpAudience[];
    active?:boolean;
    status?:string;
    status_label?:string;
    unique_viewers?:number;
    created_at?:string;
    updated_at?:string;
    related?:HelpContent[];
}

export interface HelpMeta{
    types:HelpOption[];
    features:HelpOption[];
    categories:HelpCategory[];
    audiences?:HelpOption[]|string[];
    statuses?:HelpOption[];
}

export interface HelpSummary{
    contents:number;
    published:number;
    articles:number;
    videos:number;
    categories:number;
    views:number;
    unique_viewers:number;
}

export interface Pagination{
    current_page:number;
    last_page:number;
    per_page:number;
    total:number;
    from:number|null;
    to:number|null;
}

export interface HelpListResponse{
    data:HelpContent[];
    meta:Pagination;
}
