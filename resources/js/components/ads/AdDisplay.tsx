import {useEffect,useRef} from "react";
import {useQuery} from "@tanstack/react-query";
import {ExternalLink,Megaphone} from "lucide-react";
import api from "../../lib/api";
import {useTenant} from "../../contexts/TenantContext";

export type AdSurface=
    |"manager_panel"
    |"driver_portal"
    |"owner_portal"
    |"public";

interface AdCreative{
    type:string;
    media_type:"image"|"video"|"none";
    headline:string|null;
    body:string|null;
    cta_label:string|null;
    destination_type:"website"|"whatsapp"|"phone"|"none";
    click_url:string|null;
    image_url:string|null;
    mobile_image_url:string|null;
    video_url:string|null;
    alt_text:string|null;
}

interface AdDelivery{
    delivery_token:string;
    campaign_id:string;
    creative_id:string;
    surface:AdSurface;
    source:"saas"|"tenant"|"external";
    kind:"house"|"tenant_internal"|"commercial";
    advertiser:{
        name:string;
        type:string;
    };
    creative:AdCreative;
}

interface AdDisplayProps{
    surface:AdSurface;
    className?:string;
}

export default function AdDisplay({
    surface,
    className="",
}:AdDisplayProps){
    const {tenant}=useTenant();

    const containerRef=useRef<HTMLDivElement|null>(null);
    const trackedTokenRef=useRef<string|null>(null);

    const query=useQuery({
        queryKey:[
            "ad-delivery",
            surface,
            surface==="public"?"public":tenant?.id,
        ],
        enabled:
            surface==="public"||
            Boolean(tenant?.id),
        staleTime:5*60*1000,
        gcTime:10*60*1000,
        retry:false,
        refetchOnWindowFocus:false,
        refetchOnReconnect:false,
        queryFn:async()=>{
            const response=
                surface==="public"
                    ?await api.get("/api/ads/serve/public")
                    :await api.get(
                        "/api/ads/serve",
                        {
                            params:{
                                surface,
                            },
                        }
                    );

            return (
                response.data.data??null
            ) as AdDelivery|null;
        },
    });

    const ad=query.data;

    useEffect(()=>{
        const node=
            containerRef.current;

        const token=
            ad?.delivery_token;

        if(
            !node||
            !token
        ){
            return;
        }

        let timer:number|null=null;

        const clearTimer=()=>{
            if(timer!==null){
                window.clearTimeout(
                    timer
                );

                timer=null;
            }
        };

        const observer=
            new IntersectionObserver(
                entries=>{
                    const entry=
                        entries[0];

                    const visible=
                        entry.isIntersecting&&
                        entry.intersectionRatio>=0.5;

                    if(!visible){
                        clearTimer();

                        return;
                    }

                    if(
                        trackedTokenRef.current===token||
                        timer!==null
                    ){
                        return;
                    }

                    timer=
                        window.setTimeout(
                            ()=>{
                                timer=null;

                                if(
                                    trackedTokenRef.current===token
                                ){
                                    return;
                                }

                                trackedTokenRef.current=
                                    token;

                                void api
                                    .post(
                                        "/api/ads/view",
                                        {
                                            delivery_token:
                                                token,
                                        }
                                    )
                                    .catch(()=>{
                                        if(
                                            trackedTokenRef.current===token
                                        ){
                                            trackedTokenRef.current=
                                                null;
                                        }
                                    });

                                observer.disconnect();
                            },
                            1000
                        );
                },
                {
                    threshold:[
                        0,
                        0.5,
                        1,
                    ],
                }
            );

        observer.observe(
            node
        );

        return ()=>{
            clearTimer();
            observer.disconnect();
        };
    },[
        ad?.delivery_token,
    ]);

    /*
     * Publicidade nunca deve impedir o carregamento
     * do dashboard.
     *
     * Sem anúncio elegível, erro de rede ou loading:
     * simplesmente não renderizamos nada.
     */
    if(
        query.isLoading||
        query.isError||
        !ad
    ){
        return null;
    }

    const hasMedia=
        ad.creative.media_type!=="none"&&
        Boolean(
            ad.creative.image_url||
            ad.creative.video_url
        );

    const label=
        ad.kind==="tenant_internal"
            ?"Comunicado da sua frota"
            :ad.source==="saas"
              ?"FrotaPro"
              :"Publicidade";

    const isBanner=
        ad.creative.type==="banner";

    return (
        <div
            ref={containerRef}
            className={[
                "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
                className,
            ].join(" ")}
        >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Megaphone className="h-4 w-4 shrink-0 text-indigo-500"/>

                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {label}
                    </span>
                </div>

                <span className="truncate text-xs font-medium text-slate-400">
                    {ad.advertiser.name}
                </span>
            </div>

            <div
                className={
                    hasMedia&&!isBanner
                        ?"grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
                        :""
                }
            >
                {hasMedia&&(
                    <AdMedia
                        creative={ad.creative}
                        banner={isBanner}
                        advertiser={ad.advertiser.name}
                    />
                )}

                <div className="flex flex-col justify-center p-5 sm:p-6">
                    {ad.creative.headline&&(
                        <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                            {ad.creative.headline}
                        </h2>
                    )}

                    {ad.creative.body&&(
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            {ad.creative.body}
                        </p>
                    )}

                    {ad.creative.click_url&&
                        ad.creative.cta_label&&(
                            <div className="mt-5">
                                <a
                                    href={ad.creative.click_url}
                                    target={
                                        ad.creative.destination_type==="phone"
                                            ?"_self"
                                            :"_blank"
                                    }
                                    rel="noopener noreferrer"
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                                >
                                    {ad.creative.cta_label}

                                    {ad.creative.destination_type!=="phone"&&(
                                        <ExternalLink className="h-4 w-4"/>
                                    )}
                                </a>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

function AdMedia({
    creative,
    banner,
    advertiser,
}:{
    creative:AdCreative;
    banner:boolean;
    advertiser:string;
}){
    const wrapperClass=
        banner
            ?"aspect-[4/1] min-h-[130px] w-full bg-slate-100"
            :"aspect-video min-h-[220px] w-full bg-slate-100 lg:h-full lg:min-h-[260px]";

    if(
        creative.media_type==="video"&&
        creative.video_url
    ){
        return (
            <div className={wrapperClass}>
                <video
                    src={creative.video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                />
            </div>
        );
    }

    if(
        creative.media_type==="image"&&
        creative.image_url
    ){
        return (
            <div className={wrapperClass}>
                <picture>
                    {creative.mobile_image_url&&(
                        <source
                            media="(max-width: 640px)"
                            srcSet={creative.mobile_image_url}
                        />
                    )}

                    <img
                        src={creative.image_url}
                        alt={
                            creative.alt_text||
                            `Publicidade de ${advertiser}`
                        }
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                </picture>
            </div>
        );
    }

    return null;
}
