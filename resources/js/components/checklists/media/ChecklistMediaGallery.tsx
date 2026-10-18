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
    partId:string;
}

export default function ChecklistMediaGallery({
    checklistId,
    partId,
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
                A carregar fotografias...
            </div>
        );
    }

    const items=
        (
            query.data ??
            []
        ).filter(
            item=>
                item.contexto==="dano" &&
                item.metadados
                    ?.parte_id===
                    partId,
        );

    if(
        items.length===
        0
    ){
        return null;
    }

    return(
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {items.map(
                item=>(
                    <MediaImage
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

function MediaImage({
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
            let objectUrl:string|null=null;

            api.get(
                `/api/checklists/${checklistId}/media/${item.id}/arquivo`,
                {
                    responseType:"blob",
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="aspect-[4/3] bg-slate-100">
                {url ? (
                    <img
                        src={url}
                        alt={
                            item.titulo ??
                            "Fotografia da inspeção"
                        }
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <LoaderCircle className="h-5 w-5 animate-spin text-slate-300"/>
                    </div>
                )}
            </div>

            <div className="truncate px-2 py-2 text-[11px] text-slate-500">
                {
                    item.titulo ??
                    item.arquivo_nome
                }
            </div>
        </div>
    );
}