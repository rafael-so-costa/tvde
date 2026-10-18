import {
    LoaderCircle,
} from "lucide-react";

import {
    useEffect,
    useState,
} from "react";

import {
    useQuery,
} from "@tanstack/react-query";

import api from "../../../lib/api";

import type {
    ChecklistMediaRecord,
} from "../../../types/checklist";

interface Props {
    checklistId?:string|null;
    partId?:string;
    contexto?:string;
    disabled?:boolean;
}

export default function ChecklistMediaGallery({
    checklistId,
    partId,
    contexto,
}:Props){
    const query=
        useQuery({
            queryKey:[
                "checklist-media",
                checklistId,
            ],

            enabled:
                Boolean(
                    checklistId,
                ),

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            `/api/checklists/${checklistId}/media`,
                        );

                    return response
                        .data
                        .data as ChecklistMediaRecord[];
                },
        });

    if(!checklistId){
        return null;
    }

    if(query.isLoading){
        return(
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <LoaderCircle className="h-4 w-4 animate-spin"/>
                A carregar evidências...
            </div>
        );
    }

    const items=
        (
            query.data ??
            []
        ).filter(
            item=>{
                if(
                    contexto &&
                    item.contexto!==
                    contexto
                ){
                    return false;
                }

                if(
                    partId &&
                    item.metadados
                        ?.parte_id!==
                    partId
                ){
                    return false;
                }

                return true;
            },
        );

    if(
        items.length===
        0
    ){
        return null;
    }

    return(
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(
                item=>(
                    <MediaItem
                        key={
                            item.id
                        }
                        checklistId={
                            checklistId
                        }
                        item={
                            item
                        }
                    />
                ),
            )}
        </div>
    );
}

function MediaItem({
    checklistId,
    item,
}:{
    checklistId:string;
    item:ChecklistMediaRecord;
}){
    const[
        url,
        setUrl,
    ]=useState<string|null>(
        null,
    );

    useEffect(
        ()=>{
            let active=true;
            let objectUrl:
                string|null=null;

            api.get(
                `/api/checklists/${checklistId}/media/${item.id}/arquivo`,
                {
                    responseType:
                        "blob",
                },
            )
                .then(
                    response=>{
                        objectUrl=
                            URL.createObjectURL(
                                response.data,
                            );

                        if(active){
                            setUrl(
                                objectUrl,
                            );
                        }
                    },
                )
                .catch(
                    ()=>{
                        if(active){
                            setUrl(
                                null,
                            );
                        }
                    },
                );

            return()=>{
                active=false;

                if(objectUrl){
                    URL.revokeObjectURL(
                        objectUrl,
                    );
                }
            };
        },
        [
            checklistId,
            item.id,
        ],
    );

    return(
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="aspect-video bg-slate-100">
                {!url ? (
                    <div className="flex h-full items-center justify-center">
                        <LoaderCircle className="h-5 w-5 animate-spin text-slate-300"/>
                    </div>
                ) : item.tipo==="video" ? (
                    <video
                        src={url}
                        controls
                        playsInline
                        preload="metadata"
                        className="h-full w-full bg-black object-contain"
                    />
                ) : (
                    <img
                        src={url}
                        alt={
                            item.titulo ??
                            "Fotografia da inspeção"
                        }
                        className="h-full w-full object-cover"
                    />
                )}
            </div>

            <div className="p-3">
                <div className="truncate text-xs font-semibold text-slate-700">
                    {
                        item.titulo ??
                        item.arquivo_nome
                    }
                </div>

                <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                    {
                        item.tipo==="video"
                            ?"Vídeo"
                            :"Fotografia"
                    }
                </div>
            </div>
        </article>
    );
}