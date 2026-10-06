import {useEffect,useRef} from "react";
import {useMutation,useQuery} from "@tanstack/react-query";
import {ArrowLeft,BookOpenText,LoaderCircle,PlayCircle} from "lucide-react";
import {Link,useParams} from "react-router-dom";
import {fetchHelpContent,recordHelpView} from "../lib/help-center";

export default function HelpContentPage({
    basePath="/ajuda",
}:{
    basePath?:string;
}){
    const {slug}=useParams();
    const recorded=useRef(false);

    const query=useQuery({
        queryKey:["help-center","content",slug],
        enabled:Boolean(slug),
        queryFn:()=>fetchHelpContent(slug!),
    });

    const viewMutation=useMutation({
        mutationFn:(id:string)=>recordHelpView(id),
    });

    useEffect(()=>{
        if(!query.data||recorded.current) return;

        recorded.current=true;
        viewMutation.mutate(query.data.id);
    },[query.data?.id]);

    if(query.isLoading){
        return <Loading/>;
    }

    const content=query.data;

    if(!content){
        return null;
    }

    return (
        <div className="mx-auto max-w-5xl">
            <Link
                to={basePath}
                className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
            >
                <ArrowLeft className="h-4 w-4"/>
                Central de Ajuda
            </Link>

            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <header className="border-b border-slate-100 p-6 sm:p-9">
                    <div className="mb-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {content.category.name}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {content.type_label}
                        </span>

                        {content.feature_label&&(
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {content.feature_label}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        {content.title}
                    </h1>

                    {content.excerpt&&(
                        <p className="mt-4 text-lg leading-7 text-slate-500">
                            {content.excerpt}
                        </p>
                    )}
                </header>

                <div className="p-6 sm:p-9">
                    {content.type==="video"&&content.youtube_embed_url&&(
                        <div className="mb-8 overflow-hidden rounded-2xl bg-black">
                            <div className="aspect-video">
                                <iframe
                                    src={content.youtube_embed_url}
                                    title={content.title}
                                    className="h-full w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    )}

                    {content.body&&(
                        <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                            {content.body}
                        </div>
                    )}
                </div>
            </article>

            {!!content.related?.length&&(
                <section className="mt-8">
                    <h2 className="mb-4 text-lg font-bold text-slate-950">
                        Conteúdos relacionados
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2">
                        {content.related.map(item=>(
                            <Link
                                key={item.id}
                                to={`${basePath}/${item.slug}`}
                                className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-200"
                            >
                                <div className="flex items-start gap-3">
                                    {item.type==="video"
                                        ?<PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600"/>
                                        :<BookOpenText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600"/>
                                    }

                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            {item.title}
                                        </h3>

                                        <p className="mt-1 text-xs text-slate-400">
                                            {item.category.name}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function Loading(){
    return (
        <div className="flex justify-center py-20">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}
