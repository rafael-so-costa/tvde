import {
    Camera,
    LoaderCircle,
    Paperclip,
} from "lucide-react";

import {
    useRef,
    useState,
} from "react";

import {
    useQueryClient,
} from "@tanstack/react-query";

import axios from "axios";
import api from "../../../lib/api";

interface Props {
    checklistId?:string|null;
    ensureChecklistId?:()=>Promise<string>;

    source:
        | "camera"
        | "file";

    contexto:string;
    titulo:string;

    metadata?:Record<
        string,
        string|null|undefined
    >;

    disabled?:boolean;
}

export default function ChecklistMediaCapture({
    checklistId,
    ensureChecklistId,
    source,
    contexto,
    titulo,
    metadata={},
    disabled=false,
}:Props){
    const inputRef=
        useRef<HTMLInputElement>(
            null,
        );

    const queryClient=
        useQueryClient();

    const[
        uploading,
        setUploading,
    ]=useState(false);

    const[
        message,
        setMessage,
    ]=useState<string|null>(
        null,
    );

    const[
        error,
        setError,
    ]=useState<string|null>(
        null,
    );

    async function upload(
        file?:File,
    ){
        if(
            !file ||
            disabled
        ){
            return;
        }

        setUploading(true);
        setMessage(null);
        setError(null);

        try{
            let id=
                checklistId ??
                null;

            if(
                !id &&
                ensureChecklistId
            ){
                id=
                    await ensureChecklistId();
            }

            if(!id){
                throw new Error(
                    "Não foi possível preparar o checklist para receber a fotografia.",
                );
            }

            const data=
                new FormData();

            data.append(
                "arquivo",
                file,
            );

            data.append(
                "tipo",
                "foto",
            );

            data.append(
                "contexto",
                contexto,
            );

            data.append(
                "titulo",
                titulo,
            );

            data.append(
                "capturado_em",
                new Date().toISOString(),
            );

            Object.entries(
                metadata,
            ).forEach(
                ([
                    key,
                    value,
                ])=>{
                    if(
                        value!==null &&
                        value!==undefined &&
                        value!==""
                    ){
                        data.append(
                            `metadados[${key}]`,
                            value,
                        );
                    }
                },
            );

            await api.post(
                `/api/checklists/${id}/media`,
                data,
                {
                    headers:{
                        "Content-Type":
                            "multipart/form-data",
                    },
                },
            );

            await queryClient.invalidateQueries({
                queryKey:[
                    "checklist-media",
                    id,
                ],
            });

            setMessage(
                source==="camera"
                    ?"Fotografia registada."
                    :"Fotografia anexada.",
            );
        }
        catch(exception){
            if(
                axios.isAxiosError(
                    exception,
                )
            ){
                const errors=
                    exception.response
                        ?.data
                        ?.errors;

                const first=
                    errors &&
                    typeof errors===
                        "object"
                        ?Object.values(
                            errors,
                        )
                            .flat()
                            .find(
                                value=>
                                    typeof value===
                                    "string",
                            )
                        :null;

                setError(
                    typeof first===
                    "string"
                        ?first
                        :exception
                            .response
                            ?.data
                            ?.message ??
                        "Não foi possível guardar a fotografia.",
                );
            }
            else{
                setError(
                    exception instanceof Error
                        ?exception.message
                        :"Não foi possível guardar a fotografia.",
                );
            }
        }
        finally{
            if(
                inputRef.current
            ){
                inputRef.current.value="";
            }

            setUploading(false);
        }
    }

    return(
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture={
                    source==="camera"
                        ?"environment"
                        :undefined
                }
                disabled={
                    disabled ||
                    uploading
                }
                onChange={
                    event=>
                        upload(
                            event
                                .target
                                .files?.[0],
                        )
                }
                className="hidden"
            />

            <button
                type="button"
                disabled={
                    disabled ||
                    uploading
                }
                onClick={()=>
                    inputRef
                        .current
                        ?.click()
                }
                className={[
                    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50",
                    source==="camera"
                        ?"bg-indigo-600 text-white hover:bg-indigo-700"
                        :"border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
            >
                {uploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin"/>
                ) : source==="camera" ? (
                    <Camera className="h-4 w-4"/>
                ) : (
                    <Paperclip className="h-4 w-4"/>
                )}

                {
                    source==="camera"
                        ?"Tirar foto"
                        :"Anexar foto"
                }
            </button>

            {message&&(
                <div className="mt-1 text-xs font-medium text-emerald-600">
                    {message}
                </div>
            )}

            {error&&(
                <div className="mt-1 text-xs font-medium text-red-600">
                    {error}
                </div>
            )}
        </div>
    );
}