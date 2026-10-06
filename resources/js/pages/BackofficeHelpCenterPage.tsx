import {FormEvent,useMemo,useState} from "react";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {BookOpenText,Edit3,LoaderCircle,Plus,Search,Trash2,Video,X} from "lucide-react";
import {
    deleteBackofficeHelpContent,
    deleteHelpCategory,
    fetchBackofficeHelpContent,
    fetchBackofficeHelpContents,
    fetchBackofficeHelpMeta,
    fetchBackofficeHelpSummary,
    fetchHelpCategories,
    saveBackofficeHelpContent,
    saveHelpCategory,
}from "../lib/help-center";
import type{HelpCategory,HelpContent,HelpMeta}from "../types/help-center";

export default function BackofficeHelpCenterPage(){
    const client=useQueryClient();

    const [tab,setTab]=useState<"contents"|"categories">("contents");
    const [search,setSearch]=useState("");
    const [type,setType]=useState("");
    const [categoryId,setCategoryId]=useState("");
    const [audience,setAudience]=useState("");
    const [status,setStatus]=useState("");
    const [page,setPage]=useState(1);

    const [contentOpen,setContentOpen]=useState(false);
    const [editingContentId,setEditingContentId]=useState<string|null>(null);
    const [categoryOpen,setCategoryOpen]=useState(false);
    const [editingCategory,setEditingCategory]=useState<HelpCategory|null>(null);

    const metaQuery=useQuery({
        queryKey:["backoffice-help","meta"],
        queryFn:fetchBackofficeHelpMeta,
    });

    const summaryQuery=useQuery({
        queryKey:["backoffice-help","summary"],
        queryFn:fetchBackofficeHelpSummary,
    });

    const categoriesQuery=useQuery({
        queryKey:["backoffice-help","categories"],
        queryFn:fetchHelpCategories,
    });

    const params=useMemo(()=>{
        const result:Record<string,unknown>={
            page,
            per_page:25,
        };

        if(search.trim()) result.search=search.trim();
        if(type) result.type=type;
        if(categoryId) result.category_id=categoryId;
        if(audience) result.audience=audience;
        if(status) result.status=status;

        return result;
    },[search,type,categoryId,audience,status,page]);

    const listQuery=useQuery({
        queryKey:["backoffice-help","contents",params],
        queryFn:()=>fetchBackofficeHelpContents(params),
    });

    const editQuery=useQuery({
        queryKey:["backoffice-help","content",editingContentId],
        enabled:Boolean(editingContentId),
        queryFn:()=>fetchBackofficeHelpContent(editingContentId!),
    });

    function refresh(){
        client.invalidateQueries({
            queryKey:["backoffice-help"],
        });
    }

    const removeContent=useMutation({
        mutationFn:deleteBackofficeHelpContent,
        onSuccess:refresh,
    });

    const removeCategory=useMutation({
        mutationFn:deleteHelpCategory,
        onSuccess:refresh,
    });

    const summary=summaryQuery.data;
    const meta=metaQuery.data;
    const categories=categoriesQuery.data??[];
    const list=listQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Conteúdo e capacitação
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Central de Ajuda
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Administre a Base de Conhecimento e os treinamentos em vídeo do FrotaPro.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={()=>{
                        if(tab==="contents"){
                            setEditingContentId(null);
                            setContentOpen(true);
                        }else{
                            setEditingCategory(null);
                            setCategoryOpen(true);
                        }
                    }}
                    className={primaryButton}
                >
                    <Plus className="h-4 w-4"/>
                    {tab==="contents"?"Novo conteúdo":"Nova categoria"}
                </button>
            </header>

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
                <Kpi label="Conteúdos" value={summary?.contents??0}/>
                <Kpi label="Publicados" value={summary?.published??0}/>
                <Kpi label="Artigos" value={summary?.articles??0}/>
                <Kpi label="Vídeos" value={summary?.videos??0}/>
                <Kpi label="Categorias" value={summary?.categories??0}/>
                <Kpi label="Visualizações" value={summary?.views??0}/>
                <Kpi label="Utilizadores" value={summary?.unique_viewers??0}/>
            </section>

            <div className="flex gap-2 border-b border-slate-200">
                <Tab active={tab==="contents"} onClick={()=>setTab("contents")}>
                    Conteúdos
                </Tab>

                <Tab active={tab==="categories"} onClick={()=>setTab("categories")}>
                    Categorias
                </Tab>
            </div>

            {tab==="contents"?(
                <>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
                                <input
                                    value={search}
                                    onChange={event=>{
                                        setSearch(event.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Pesquisar..."
                                    className={`${inputClass} pl-9`}
                                />
                            </div>

                            <FilterSelect
                                value={type}
                                setValue={value=>{
                                    setType(value);
                                    setPage(1);
                                }}
                                options={meta?.types??[]}
                                empty="Todos os tipos"
                            />

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

                            <FilterSelect
                                value={audience}
                                setValue={value=>{
                                    setAudience(value);
                                    setPage(1);
                                }}
                                options={meta?.audiences as any??[]}
                                empty="Todos os públicos"
                            />

                            <FilterSelect
                                value={status}
                                setValue={value=>{
                                    setStatus(value);
                                    setPage(1);
                                }}
                                options={meta?.statuses??[]}
                                empty="Todos os estados"
                            />
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {listQuery.isLoading?(
                            <Loading/>
                        ):!list?.data.length?(
                            <Empty text="Nenhum conteúdo cadastrado."/>
                        ):(
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr>
                                            <Th>Conteúdo</Th>
                                            <Th>Categoria</Th>
                                            <Th>Público</Th>
                                            <Th>Estado</Th>
                                            <Th>Visualizações</Th>
                                            <Th></Th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {list.data.map(content=>(
                                            <tr key={content.id} className="border-t border-slate-100">
                                                <Td>
                                                    <div className="flex items-center gap-3">
                                                        {content.type==="video"
                                                            ?<Video className="h-5 w-5 text-indigo-600"/>
                                                            :<BookOpenText className="h-5 w-5 text-indigo-600"/>
                                                        }

                                                        <div>
                                                            <div className="font-semibold text-slate-900">
                                                                {content.title}
                                                            </div>

                                                            <div className="mt-1 text-xs text-slate-400">
                                                                {content.type_label}
                                                                {content.feature_label&&` · ${content.feature_label}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Td>

                                                <Td>{content.category.name}</Td>

                                                <Td>
                                                    <div className="flex max-w-xs flex-wrap gap-1">
                                                        {(content.audiences??[]).map(item=>(
                                                            <span
                                                                key={item.value}
                                                                className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
                                                            >
                                                                {item.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </Td>

                                                <Td>
                                                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                                        {content.status_label}
                                                    </span>
                                                </Td>

                                                <Td>{content.views}</Td>

                                                <Td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={()=>{
                                                                setEditingContentId(content.id);
                                                                setContentOpen(true);
                                                            }}
                                                            className={iconButton}
                                                        >
                                                            <Edit3 className="h-4 w-4"/>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={()=>{
                                                                if(window.confirm(`Eliminar "${content.title}"?`)){
                                                                    removeContent.mutate(content.id);
                                                                }
                                                            }}
                                                            className={`${iconButton} text-red-600`}
                                                        >
                                                            <Trash2 className="h-4 w-4"/>
                                                        </button>
                                                    </div>
                                                </Td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            ):(
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {!categories.length?(
                        <Empty text="Nenhuma categoria cadastrada."/>
                    ):(
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <Th>Categoria</Th>
                                        <Th>Descrição</Th>
                                        <Th>Ordem</Th>
                                        <Th>Conteúdos</Th>
                                        <Th>Estado</Th>
                                        <Th></Th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {categories.map(category=>(
                                        <tr key={category.id} className="border-t border-slate-100">
                                            <Td>
                                                <span className="font-semibold text-slate-900">
                                                    {category.name}
                                                </span>
                                            </Td>

                                            <Td>{category.description??"—"}</Td>
                                            <Td>{category.position}</Td>
                                            <Td>{category.contents_count??0}</Td>
                                            <Td>{category.active?"Ativa":"Inativa"}</Td>

                                            <Td>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={()=>{
                                                            setEditingCategory(category);
                                                            setCategoryOpen(true);
                                                        }}
                                                        className={iconButton}
                                                    >
                                                        <Edit3 className="h-4 w-4"/>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={()=>{
                                                            if(window.confirm(`Eliminar "${category.name}"?`)){
                                                                removeCategory.mutate(category.id);
                                                            }
                                                        }}
                                                        className={`${iconButton} text-red-600`}
                                                    >
                                                        <Trash2 className="h-4 w-4"/>
                                                    </button>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {contentOpen&&meta&&(
                <ContentModal
                    meta={meta}
                    content={
                        editingContentId
                            ?editQuery.data??null
                            :null
                    }
                    loading={Boolean(editingContentId)&&editQuery.isLoading}
                    onClose={()=>{
                        setContentOpen(false);
                        setEditingContentId(null);
                    }}
                    onSaved={()=>{
                        setContentOpen(false);
                        setEditingContentId(null);
                        refresh();
                    }}
                />
            )}

            {categoryOpen&&(
                <CategoryModal
                    category={editingCategory}
                    onClose={()=>{
                        setCategoryOpen(false);
                        setEditingCategory(null);
                    }}
                    onSaved={()=>{
                        setCategoryOpen(false);
                        setEditingCategory(null);
                        refresh();
                    }}
                />
            )}
        </div>
    );
}

function ContentModal({
    meta,
    content,
    loading,
    onClose,
    onSaved,
}:{
    meta:HelpMeta;
    content:HelpContent|null;
    loading:boolean;
    onClose:()=>void;
    onSaved:()=>void;
}){
    const [form,setForm]=useState({
        category_id:content?.category.id??meta.categories[0]?.id??"",
        type:content?.type??"article",
        title:content?.title??"",
        excerpt:content?.excerpt??"",
        body:content?.body??"",
        youtube_url:content?.youtube_url??"",
        feature_key:content?.feature_key??"",
        audiences:(content?.audiences??[]).map(item=>item.value),
        position:content?.position??0,
        featured:content?.featured??false,
        active:content?.active??false,
        published_at:toLocalDate(content?.published_at),
    });

    const mutation=useMutation({
        mutationFn:()=>saveBackofficeHelpContent(
            content?.id??null,
            {
                ...form,
                published_at:form.published_at||null,
                youtube_url:form.youtube_url||null,
                body:form.body||null,
                excerpt:form.excerpt||null,
                feature_key:form.feature_key||null,
            }
        ),
        onSuccess:onSaved,
    });

    if(loading){
        return <Modal title="Conteúdo" onClose={onClose}><Loading/></Modal>;
    }

    function submit(event:FormEvent){
        event.preventDefault();
        mutation.mutate();
    }

    function toggleAudience(value:string){
        setForm(current=>({
            ...current,
            audiences:current.audiences.includes(value)
                ?current.audiences.filter(item=>item!==value)
                :[...current.audiences,value],
        }));
    }

    return (
        <Modal
            title={content?"Editar conteúdo":"Novo conteúdo"}
            onClose={onClose}
            wide
        >
            <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tipo">
                        <FilterSelect
                            value={form.type}
                            setValue={value=>setForm(current=>({...current,type:value as any}))}
                            options={meta.types}
                        />
                    </Field>

                    <Field label="Categoria">
                        <select
                            required
                            value={form.category_id}
                            onChange={event=>setForm(current=>({...current,category_id:event.target.value}))}
                            className={inputClass}
                        >
                            {meta.categories.map(category=>(
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Funcionalidade">
                        <FilterSelect
                            value={form.feature_key}
                            setValue={value=>setForm(current=>({...current,feature_key:value}))}
                            options={meta.features}
                            empty="Não especificada"
                        />
                    </Field>

                    <Field label="Ordem">
                        <input
                            type="number"
                            min="0"
                            value={form.position}
                            onChange={event=>setForm(current=>({...current,position:Number(event.target.value)}))}
                            className={inputClass}
                        />
                    </Field>
                </div>

                <Field label="Título">
                    <input
                        required
                        value={form.title}
                        onChange={event=>setForm(current=>({...current,title:event.target.value}))}
                        className={inputClass}
                    />
                </Field>

                <Field label="Descrição curta">
                    <textarea
                        rows={3}
                        value={form.excerpt}
                        onChange={event=>setForm(current=>({...current,excerpt:event.target.value}))}
                        className={`${inputClass} h-auto py-3`}
                    />
                </Field>

                {form.type==="video"?(
                    <Field label="URL do YouTube">
                        <input
                            required
                            type="url"
                            value={form.youtube_url}
                            onChange={event=>setForm(current=>({...current,youtube_url:event.target.value}))}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className={inputClass}
                        />
                    </Field>
                ):(
                    <Field label="Conteúdo do artigo">
                        <textarea
                            required
                            rows={14}
                            value={form.body}
                            onChange={event=>setForm(current=>({...current,body:event.target.value}))}
                            className={`${inputClass} h-auto py-3 font-mono`}
                        />
                    </Field>
                )}

                {form.type==="video"&&(
                    <Field label="Texto complementar opcional">
                        <textarea
                            rows={6}
                            value={form.body}
                            onChange={event=>setForm(current=>({...current,body:event.target.value}))}
                            className={`${inputClass} h-auto py-3`}
                        />
                    </Field>
                )}

                <Field label="Quem pode visualizar">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {(meta.audiences as any??[]).map((item:any)=>(
                            <label
                                key={item.value}
                                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                            >
                                <input
                                    type="checkbox"
                                    checked={form.audiences.includes(item.value)}
                                    onChange={()=>toggleAudience(item.value)}
                                />
                                {item.label}
                            </label>
                        ))}
                    </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Publicação">
                        <input
                            type="datetime-local"
                            value={form.published_at}
                            onChange={event=>setForm(current=>({...current,published_at:event.target.value}))}
                            className={inputClass}
                        />
                    </Field>

                    <div className="flex items-end gap-5 pb-2">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={event=>setForm(current=>({...current,featured:event.target.checked}))}
                            />
                            Destaque
                        </label>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={event=>setForm(current=>({...current,active:event.target.checked}))}
                            />
                            Publicado
                        </label>
                    </div>
                </div>

                {mutation.isError&&(
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        Não foi possível guardar. Verifique os campos preenchidos.
                    </div>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                    <button type="button" onClick={onClose} className={secondaryButton}>
                        Cancelar
                    </button>

                    <button
                        disabled={mutation.isPending||form.audiences.length===0}
                        className={primaryButton}
                    >
                        Guardar
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function CategoryModal({
    category,
    onClose,
    onSaved,
}:{
    category:HelpCategory|null;
    onClose:()=>void;
    onSaved:()=>void;
}){
    const [form,setForm]=useState({
        name:category?.name??"",
        description:category?.description??"",
        position:category?.position??0,
        active:category?.active??true,
    });

    const mutation=useMutation({
        mutationFn:()=>saveHelpCategory(category?.id??null,{
            ...form,
            description:form.description||null,
        }),
        onSuccess:onSaved,
    });

    return (
        <Modal
            title={category?"Editar categoria":"Nova categoria"}
            onClose={onClose}
        >
            <form
                onSubmit={event=>{
                    event.preventDefault();
                    mutation.mutate();
                }}
                className="space-y-4"
            >
                <Field label="Nome">
                    <input
                        required
                        value={form.name}
                        onChange={event=>setForm(current=>({...current,name:event.target.value}))}
                        className={inputClass}
                    />
                </Field>

                <Field label="Descrição">
                    <textarea
                        rows={4}
                        value={form.description}
                        onChange={event=>setForm(current=>({...current,description:event.target.value}))}
                        className={`${inputClass} h-auto py-3`}
                    />
                </Field>

                <Field label="Ordem">
                    <input
                        type="number"
                        min="0"
                        value={form.position}
                        onChange={event=>setForm(current=>({...current,position:Number(event.target.value)}))}
                        className={inputClass}
                    />
                </Field>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.active}
                        onChange={event=>setForm(current=>({...current,active:event.target.checked}))}
                    />
                    Categoria ativa
                </label>

                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className={secondaryButton}>
                        Cancelar
                    </button>
                    <button disabled={mutation.isPending} className={primaryButton}>
                        Guardar
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function Modal({
    title,children,onClose,wide=false,
}:{
    title:string;
    children:React.ReactNode;
    onClose:()=>void;
    wide?:boolean;
}){
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl ${wide?"max-w-5xl":"max-w-2xl"}`}>
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <h2 className="font-bold text-slate-950">{title}</h2>
                    <button type="button" onClick={onClose} className={iconButton}>
                        <X className="h-5 w-5"/>
                    </button>
                </header>

                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function Kpi({label,value}:{label:string;value:number}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{value.toLocaleString("pt-PT")}</p>
        </div>
    );
}

function Tab({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){
    return (
        <button
            type="button"
            onClick={onClick}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${active?"border-indigo-600 text-indigo-600":"border-transparent text-slate-500"}`}
        >
            {children}
        </button>
    );
}

function Field({label,children}:{label:string;children:React.ReactNode}){
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </label>
            {children}
        </div>
    );
}

function FilterSelect({
    value,setValue,options,empty,
}:{
    value:string;
    setValue:(value:string)=>void;
    options:{value:string;label:string}[];
    empty?:string;
}){
    return (
        <select value={value} onChange={event=>setValue(event.target.value)} className={inputClass}>
            {empty!==undefined&&<option value="">{empty}</option>}
            {options.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
    );
}

function Th({children}:{children:React.ReactNode}){
    return <th className="bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
}

function Td({children}:{children:React.ReactNode}){
    return <td className="px-5 py-4 text-sm text-slate-600">{children}</td>;
}

function Empty({text}:{text:string}){
    return <div className="p-14 text-center text-sm text-slate-500">{text}</div>;
}

function Loading(){
    return (
        <div className="flex justify-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}

function toLocalDate(value?:string|null){
    if(!value) return "";
    const date=new Date(value);
    const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
}

const inputClass="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const primaryButton="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50";
const secondaryButton="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600";
const iconButton="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600";
