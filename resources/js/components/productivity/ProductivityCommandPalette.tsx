import {
    Building2,
    Car,
    ClipboardPlus,
    FilePlus2,
    LoaderCircle,
    Search,
    Star,
    UserPlus,
    UsersRound,
    X,
    Zap,
} from "lucide-react";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    useNavigate,
} from "react-router-dom";

import api from "../../lib/api";

import {
    useTenant,
} from "../../contexts/TenantContext";

import {
    useCurrentPermissions,
} from "../../hooks/useCurrentPermissions";

import type {
    ProductivityItem,
} from "../../types/productivity";

interface Props {
    open:boolean;
    onClose:()=>void;
}

const quickActions=[
    {
        label:"Novo motorista",
        description:"Cadastrar motorista",
        to:"/motoristas?novo=1",
        permission:"motoristas",
        icon:UserPlus,
    },
    {
        label:"Novo proprietário",
        description:"Cadastrar proprietário",
        to:"/proprietarios?novo=1",
        permission:"proprietarios",
        icon:UsersRound,
    },
    {
        label:"Novo veículo",
        description:"Adicionar veículo à frota",
        to:"/veiculos?novo=1",
        permission:"veiculos",
        icon:Car,
    },
    {
        label:"Nova empresa",
        description:"Cadastrar empresa",
        to:"/empresas?novo=1",
        permission:"empresas",
        icon:Building2,
    },
    {
        label:"Novo contrato",
        description:"Abrir assistente de contrato",
        to:"/contratos?novo=1",
        permission:"contratos",
        icon:FilePlus2,
    },
    {
        label:"Nova entrega",
        description:"Abrir checklist de entrega",
        to:"/checklists?novo=entrega",
        permission:"checklist",
        icon:ClipboardPlus,
    },
];

export default function ProductivityCommandPalette({
    open,
    onClose,
}:Props){
    const navigate=
        useNavigate();

    const {
        tenant,
    }=useTenant();

    const {
        can,
    }=
        useCurrentPermissions();

    const queryClient=
        useQueryClient();

    const inputRef=
        useRef<HTMLInputElement>(
            null
        );

    const [
        term,
        setTerm,
    ]=useState("");

    const [
        debouncedTerm,
        setDebouncedTerm,
    ]=useState("");

    useEffect(()=>{
        if(!open){
            return;
        }

        setTerm("");
        setDebouncedTerm("");

        window.setTimeout(
            ()=>
                inputRef
                    .current
                    ?.focus(),
            20
        );
    },[
        open,
    ]);

    useEffect(()=>{
        const timeout=
            window.setTimeout(
                ()=>
                    setDebouncedTerm(
                        term.trim()
                    ),
                250
            );

        return ()=>{
            window.clearTimeout(
                timeout
            );
        };
    },[
        term,
    ]);

    useEffect(()=>{
        if(!open){
            return;
        }

        function keydown(
            event:KeyboardEvent
        ){
            if(
                event.key ===
                "Escape"
            ){
                onClose();
            }
        }

        window.addEventListener(
            "keydown",
            keydown
        );

        return ()=>{
            window.removeEventListener(
                "keydown",
                keydown
            );
        };
    },[
        open,
        onClose,
    ]);

    const searchQuery=
        useQuery({
            queryKey:[
                "productivity-search",
                tenant?.id,
                debouncedTerm,
            ],

            enabled:
                Boolean(
                    open &&
                    tenant?.id &&
                    debouncedTerm.length >=
                    2
                ),

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            "/api/produtividade/busca",
                            {
                                params:{
                                    q:
                                        debouncedTerm,
                                    limit:6,
                                },
                            }
                        );

                    return response
                        .data
                        .data as ProductivityItem[];
                },
        });

    const favoritesQuery=
        useQuery({
            queryKey:[
                "productivity-favorites",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    open &&
                    tenant?.id
                ),

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            "/api/produtividade/favoritos"
                        );

                    return response
                        .data
                        .data as ProductivityItem[];
                },
        });

    const favoriteMutation=
        useMutation({
            mutationFn:
                async(
                    item:ProductivityItem
                )=>{
                    if(
                        item.favorite_id
                    ){
                        await api.delete(
                            `/api/produtividade/favoritos/${item.favorite_id}`
                        );

                        return;
                    }

                    await api.post(
                        "/api/produtividade/favoritos",
                        {
                            entity_type:
                                item.entity_type,

                            entity_id:
                                item.entity_id,
                        }
                    );
                },

            onSuccess:
                async()=>{
                    await Promise.all([
                        queryClient
                            .invalidateQueries({
                                queryKey:[
                                    "productivity-favorites",
                                    tenant?.id,
                                ],
                            }),

                        queryClient
                            .invalidateQueries({
                                queryKey:[
                                    "productivity-search",
                                    tenant?.id,
                                ],
                            }),
                    ]);
                },
        });

    const actions=
        useMemo(
            ()=>
                quickActions.filter(
                    action=>
                        can(
                            action.permission,
                            "configurar"
                        )
                ),
            [
                can,
            ]
        );

    function go(
        url:string
    ){
        onClose();
        navigate(url);
    }

    if(!open){
        return null;
    }

    const searching=
        debouncedTerm.length >=
        2;

    const results=
        searchQuery.data ??
        [];

    const favorites=
        favoritesQuery.data ??
        [];

    return (
        <div className="fixed inset-0 z-[200] flex justify-center p-4 pt-[8vh] sm:pt-[12vh]">
            <button
                type="button"
                aria-label="Fechar pesquisa"
                onClick={
                    onClose
                }
                className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            />

            <div className="relative z-10 flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center gap-3 border-b border-slate-200 px-4">
                    <Search className="h-5 w-5 shrink-0 text-slate-400"/>

                    <input
                        ref={
                            inputRef
                        }
                        value={
                            term
                        }
                        onChange={
                            event=>
                                setTerm(
                                    event
                                        .target
                                        .value
                                )
                        }
                        placeholder="Pesquisar motorista, matrícula, contrato, documento..."
                        className="h-16 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />

                    {searchQuery.isFetching && (
                        <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600"/>
                    )}

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                        <X className="h-4 w-4"/>
                    </button>
                </div>

                <div className="overflow-y-auto p-3">
                    {!searching ? (
                        <div className="space-y-5">
                            {actions.length > 0 && (
                                <section>
                                    <Heading
                                        icon={
                                            Zap
                                        }
                                        title="Ações rápidas"
                                    />

                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {actions.map(
                                            action=>{
                                                const Icon=
                                                    action.icon;

                                                return (
                                                    <button
                                                        key={
                                                            action.to
                                                        }
                                                        type="button"
                                                        onClick={()=>
                                                            go(
                                                                action.to
                                                            )
                                                        }
                                                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50/50"
                                                    >
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                                            <Icon className="h-4 w-4"/>
                                                        </div>

                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-800">
                                                                {action.label}
                                                            </div>

                                                            <div className="mt-0.5 text-xs text-slate-400">
                                                                {action.description}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                </section>
                            )}

                            <section>
                                <Heading
                                    icon={
                                        Star
                                    }
                                    title="Favoritos"
                                />

                                {favoritesQuery.isLoading ? (
                                    <Loading/>
                                ) : favorites.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                                        Ainda não existem favoritos. Pesquise um recurso e clique na estrela.
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {favorites.map(
                                            item=>(
                                                <ResultRow
                                                    key={
                                                        item.favorite_id ??
                                                        `${item.entity_type}:${item.entity_id}`
                                                    }
                                                    item={
                                                        item
                                                    }
                                                    onOpen={
                                                        go
                                                    }
                                                    onFavorite={
                                                        item=>
                                                            favoriteMutation
                                                                .mutate(
                                                                    item
                                                                )
                                                    }
                                                    busy={
                                                        favoriteMutation
                                                            .isPending
                                                    }
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                            </section>
                        </div>
                    ) : searchQuery.isLoading ? (
                        <Loading/>
                    ) : searchQuery.isError ? (
                        <div className="p-8 text-center text-sm text-red-600">
                            Não foi possível realizar a pesquisa.
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-10 text-center">
                            <Search className="mx-auto h-8 w-8 text-slate-300"/>

                            <p className="mt-3 text-sm font-semibold text-slate-700">
                                Nenhum resultado
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                Tente nome, NIF, matrícula, código ou tipo de documento.
                            </p>
                        </div>
                    ) : (
                        <section>
                            <Heading
                                icon={
                                    Search
                                }
                                title={`Resultados para “${debouncedTerm}”`}
                            />

                            <div className="space-y-1">
                                {results.map(
                                    item=>(
                                        <ResultRow
                                            key={
                                                `${item.entity_type}:${item.entity_id}`
                                            }
                                            item={
                                                item
                                            }
                                            onOpen={
                                                go
                                            }
                                            onFavorite={
                                                item=>
                                                    favoriteMutation
                                                        .mutate(
                                                            item
                                                        )
                                            }
                                            busy={
                                                favoriteMutation
                                                    .isPending
                                            }
                                        />
                                    )
                                )}
                            </div>
                        </section>
                    )}
                </div>

                <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-400">
                    <span>
                        Pesquisa limitada ao tenant e às suas permissões.
                    </span>

                    <span className="hidden sm:block">
                        Esc para fechar
                    </span>
                </footer>
            </div>
        </div>
    );
}

function ResultRow({
    item,
    onOpen,
    onFavorite,
    busy,
}:{
    item:ProductivityItem;
    onOpen:(url:string)=>void;
    onFavorite:(item:ProductivityItem)=>void;
    busy:boolean;
}){
    return (
        <div className="group flex items-center rounded-xl hover:bg-slate-50">
            <button
                type="button"
                onClick={()=>
                    onOpen(
                        item.url
                    )
                }
                className="min-w-0 flex-1 px-3 py-3 text-left"
            >
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {item.category}
                </span>

                <div className="mt-1 truncate text-sm font-semibold text-slate-800">
                    {item.title}
                </div>

                {item.subtitle && (
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                        {item.subtitle}
                    </div>
                )}
            </button>

            <button
                type="button"
                disabled={
                    busy
                }
                title={
                    item.favorite_id
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"
                }
                onClick={()=>
                    onFavorite(
                        item
                    )
                }
                className={[
                    "mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
                    item.favorite_id
                        ? "text-amber-500 hover:bg-amber-50"
                        : "text-slate-300 hover:bg-slate-100 hover:text-amber-500",
                ].join(
                    " "
                )}
            >
                <Star
                    className="h-4 w-4"
                    fill={
                        item.favorite_id
                            ? "currentColor"
                            : "none"
                    }
                />
            </button>
        </div>
    );
}

function Heading({
    icon:Icon,
    title,
}:{
    icon:typeof Search;
    title:string;
}){
    return (
        <div className="mb-2 flex items-center gap-2 px-2">
            <Icon className="h-4 w-4 text-slate-400"/>

            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {title}
            </h3>
        </div>
    );
}

function Loading(){
    return (
        <div className="flex justify-center py-10">
            <LoaderCircle className="h-6 w-6 animate-spin text-indigo-600"/>
        </div>
    );
}