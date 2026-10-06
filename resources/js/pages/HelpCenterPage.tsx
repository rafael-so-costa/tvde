import {useMemo,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {BookOpenText,LoaderCircle,PlayCircle,Search,Sparkles} from "lucide-react";
import {Link} from "react-router-dom";
import {fetchHelpContents,fetchHelpMeta} from "../lib/help-center";
import type{HelpContent}from "../types/help-center";

export default function HelpCenterPage({
    basePath="/ajuda",
}:{
    basePath?:string;
}){
    const [search,setSearch]=useState("");
    const [categoryId,setCategoryId]=useState("");
    const [type,setType]=useState("");
    const [feature,setFeature]=useState("");
    const [page,setPage]=useState(1);

    const metaQuery=useQuery({
        queryKey:["help-center","meta"],
        queryFn:fetchHelpMeta,
    });

    const params=useMemo(()=>{
        const result:Record<string,unknown>={
            page,
            per_page:12,
        };

        if(search.trim()) result.search=search.trim();
        if(categoryId) result.category_id=categoryId;
        if(type) result.type=type;
        if(feature) result.feature_key=feature;

        return result;
    },[search,categoryId,type,feature,page]);

    const listQuery=useQuery({
        queryKey:["help-center","list",params],
        queryFn:()=>fetchHelpContents(params),
    });

    const meta=metaQuery.data;
    const data=listQuery.data;

    return (
        <div className="mx-auto max-w-7xl">
            <section className="mb-8 overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10">
                <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-300">
                        <BookOpenText className="h-5 w-5"/>
                        Central de Ajuda FrotaPro
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Como podemos ajudar?
                    </h1>

                    <p className="mt-3 max-w-2xl text-slate-300">
                        Encontre artigos e tutoriais em vídeo sobre as funcionalidades disponíveis no seu painel.
                    </p>

                    <div className="relative mt-6 max-w-2xl">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/>

                        <input
                            value={search}
                            onChange={event=>{
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Pesquisar na Central de Ajuda..."
                            className="h-12 w-full rounded-2xl border border-white/10 bg-white px-12 text-sm text-slate-900 outline-none"
                        />
                    </div>
                </div>
            </section>

            <section className="mb-6 grid gap-4 sm:grid-cols-3">
                <select
                    value={categoryId}
                    onChange={event=>{
                        setCategoryId(event.target.value);
                        setPage(1);
                    }}
                    className={inputClass}
                >
                    <option value="">Todas as categorias</option>

                    {(meta?.categories??[]).map(category=>(
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>

                <select
                    value={type}
                    onChange={event=>{
                        setType(event.target.value);
                        setPage(1);
                    }}
                    className={inputClass}
                >
                    <option value="">Artigos e vídeos</option>

                    {(meta?.types??[]).map(item=>(
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <select
                    value={feature}
                    onChange={event=>{
                        setFeature(event.target.value);
                        setPage(1);
                    }}
                    className={inputClass}
                >
                    <option value="">Todas as funcionalidades</option>

                    {(meta?.features??[]).map(item=>(
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </section>

            {listQuery.isLoading?(
                <Loading/>
            ):!data?.data.length?(
                <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
                    <BookOpenText className="mx-auto h-10 w-10 text-slate-300"/>
                    <p className="mt-3 text-sm text-slate-500">
                        Nenhum conteúdo encontrado.
                    </p>
                </div>
            ):(
                <>
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {data.data.map(content=>(
                            <ContentCard
                                key={content.id}
                                content={content}
                                basePath={basePath}
                            />
                        ))}
                    </div>

                    {data.meta.last_page>1&&(
                        <div className="mt-8 flex items-center justify-center gap-3">
                            <button
                                disabled={page<=1}
                                onClick={()=>setPage(value=>Math.max(1,value-1))}
                                className={buttonClass}
                            >
                                Anterior
                            </button>

                            <span className="text-sm text-slate-500">
                                Página {data.meta.current_page} de {data.meta.last_page}
                            </span>

                            <button
                                disabled={page>=data.meta.last_page}
                                onClick={()=>setPage(value=>Math.min(data.meta.last_page,value+1))}
                                className={buttonClass}
                            >
                                Seguinte
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function ContentCard({
    content,
    basePath,
}:{
    content:HelpContent;
    basePath:string;
}){
    return (
        <Link
            to={`${basePath}/${content.slug}`}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
        >
            {content.type==="video"&&content.youtube_thumbnail_url?(
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                    <img
                        src={content.youtube_thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
                        <PlayCircle className="h-12 w-12 text-white"/>
                    </div>
                </div>
            ):(
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100">
                    <BookOpenText className="h-12 w-12 text-indigo-500"/>
                </div>
            )}

            <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                        {content.category.name}
                    </span>

                    {content.feature_label&&(
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {content.feature_label}
                        </span>
                    )}

                    {content.featured&&(
                        <Sparkles className="h-4 w-4 text-amber-500"/>
                    )}
                </div>

                <h2 className="text-lg font-bold text-slate-950">
                    {content.title}
                </h2>

                {content.excerpt&&(
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                        {content.excerpt}
                    </p>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{content.type_label}</span>
                    {content.viewed&&<span>✓ Visualizado</span>}
                </div>
            </div>
        </Link>
    );
}

function Loading(){
    return (
        <div className="flex justify-center py-20">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}

const inputClass="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const buttonClass="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-40";
