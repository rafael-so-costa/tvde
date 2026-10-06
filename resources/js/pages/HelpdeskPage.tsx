import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
}from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
}from "@tanstack/react-query";

import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    LifeBuoy,
    LoaderCircle,
    Paperclip,
    Plus,
    RefreshCw,
    Search,
    Send,
    Star,
    X,
}from "lucide-react";

import {useAuth}
    from "../contexts/AuthContext";

import {useTenant}
    from "../contexts/TenantContext";

import {
    closeHelpdeskTicket,
    createHelpdeskTicket,
    fetchHelpdesk,
    fetchHelpdeskMeta,
    fetchHelpdeskTicket,
    rateHelpdeskTicket,
    reopenHelpdeskTicket,
    sendHelpdeskMessage,
    updateHelpdeskTicket,
}from "../lib/helpdesk";

import type{
    HelpdeskDetail,
    HelpdeskMeta,
    HelpdeskMode,
    HelpdeskOption,
    HelpdeskTicket,
}from "../types/helpdesk";

export default function HelpdeskPage({
    mode="tenant",
}:{
    mode?:HelpdeskMode;
}){
    const {user}=useAuth();
    const {tenant}=useTenant();
    const client=useQueryClient();

    const [search,setSearch]=useState("");
    const [status,setStatus]=useState("");
    const [type,setType]=useState("");
    const [category,setCategory]=useState("");
    const [priority,setPriority]=useState("");
    const [tenantId,setTenantId]=useState("");
    const [unread,setUnread]=useState(false);
    const [page,setPage]=useState(1);
    const [perPage,setPerPage]=useState("25");

    const [createOpen,setCreateOpen]=useState(false);
    const [selectedId,setSelectedId]=useState<string|null>(null);

    const isBackoffice=
        mode==="backoffice";

    const isFleetManager=
        Boolean(
            tenant &&
            user?.roles?.some(
                role=>
                    role.codigo===
                    "admin_empresa" &&
                    role.pivot?.tenant_id===
                    tenant.id
            )
        );

    const canUse=
        isBackoffice
            ?Boolean(user?.super_admin)
            :Boolean(
                tenant&&
                isFleetManager
            );

    const params=useMemo(()=>{
        const result:
            Record<string,string|number>={
                page,
                per_page:perPage,
            };

        if(search.trim()){
            result.search=
                search.trim();
        }

        if(status){
            result.status=status;
        }

        if(type){
            result.type=type;
        }

        if(category){
            result.category=category;
        }

        if(priority){
            result.priority=priority;
        }

        if(
            isBackoffice&&
            tenantId
        ){
            result.tenant_id=
                tenantId;
        }

        if(unread){
            result.unread=1;
        }

        return result;
    },[
        search,
        status,
        type,
        category,
        priority,
        tenantId,
        unread,
        page,
        perPage,
        isBackoffice,
    ]);

    const metaQuery=useQuery({
        queryKey:[
            "helpdesk",
            "meta",
            mode,
            tenant?.id,
        ],
        enabled:canUse,
        queryFn:()=>
            fetchHelpdeskMeta(
                mode
            ),
    });

    const listQuery=useQuery({
        queryKey:[
            "helpdesk",
            "list",
            mode,
            tenant?.id,
            params,
        ],
        enabled:canUse,
        queryFn:()=>
            fetchHelpdesk(
                mode,
                params
            ),
    });

    const detailQuery=useQuery({
        queryKey:[
            "helpdesk",
            "detail",
            mode,
            selectedId,
        ],
        enabled:
            canUse&&
            Boolean(selectedId),
        queryFn:()=>
            fetchHelpdeskTicket(
                mode,
                selectedId!
            ),
    });

    useEffect(()=>{
        if(!detailQuery.data){
            return;
        }

        client.invalidateQueries({
            queryKey:[
                "helpdesk",
                "summary",
                mode,
            ],
        });

        client.invalidateQueries({
            queryKey:[
                "helpdesk",
                "list",
            ],
        });
    },[
        detailQuery.data?.id,
    ]);

    function refresh(){
        client.invalidateQueries({
            queryKey:[
                "helpdesk",
            ],
        });
    }

    function resetPage(){
        setPage(1);
    }

    if(
        !isBackoffice&&
        !tenant
    ){
        return (
            <Notice
                title="Selecione uma organização"
                text="Escolha uma organização para consultar o Helpdesk."
            />
        );
    }

    if(!canUse){
        return (
            <Notice
                title="Acesso restrito"
                text={
                    isBackoffice
                        ?"Esta área é exclusiva da administração FrotaPro."
                        :"O Helpdesk está disponível exclusivamente para o Gestor de Frota."
                }
            />
        );
    }

    const data=listQuery.data;
    const meta=metaQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        {isBackoffice
                            ?"Suporte aos clientes"
                            :"Suporte FrotaPro"
                        }
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Helpdesk
                    </h1>

                    <p className="mt-2 text-slate-500">
                        {isBackoffice
                            ?"Atendimento, dúvidas, sugestões e feedback das frotas."
                            :"Abra e acompanhe chamados diretamente com a equipa FrotaPro."
                        }
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={refresh}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
                    >
                        <RefreshCw className="h-4 w-4"/>
                        Atualizar
                    </button>

                    {!isBackoffice&&(
                        <button
                            type="button"
                            onClick={()=>
                                setCreateOpen(
                                    true
                                )
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            <Plus className="h-4 w-4"/>
                            Abrir chamado
                        </button>
                    )}
                </div>
            </section>

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                    label="Ativos"
                    value={
                        data?.summary
                            .active??0
                    }
                />

                <Kpi
                    label="Aguardando gestor"
                    value={
                        data?.summary
                            .waiting_customer??0
                    }
                />

                <Kpi
                    label="Concluídos"
                    value={
                        data?.summary
                            .resolved??0
                    }
                />

                <Kpi
                    label="Não lidos"
                    value={
                        data?.summary
                            .unread??0
                    }
                />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Filter label="Pesquisar">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>

                            <input
                                value={search}
                                onChange={event=>{
                                    setSearch(
                                        event.target.value
                                    );
                                    resetPage();
                                }}
                                placeholder="Protocolo, assunto..."
                                className={`${inputClass} pl-9`}
                            />
                        </div>
                    </Filter>

                    <Filter label="Tipo">
                        <Select
                            value={type}
                            setValue={value=>{
                                setType(value);
                                resetPage();
                            }}
                            options={
                                meta?.types??[]
                            }
                            all="Todos"
                        />
                    </Filter>

                    <Filter label="Categoria">
                        <Select
                            value={category}
                            setValue={value=>{
                                setCategory(value);
                                resetPage();
                            }}
                            options={
                                meta?.categories??[]
                            }
                            all="Todas"
                        />
                    </Filter>

                    <Filter label="Prioridade">
                        <Select
                            value={priority}
                            setValue={value=>{
                                setPriority(value);
                                resetPage();
                            }}
                            options={
                                meta?.priorities??[]
                            }
                            all="Todas"
                        />
                    </Filter>

                    <Filter label="Estado">
                        <Select
                            value={status}
                            setValue={value=>{
                                setStatus(value);
                                resetPage();
                            }}
                            options={
                                uniqueOptions(
                                    meta?.statuses??
                                    []
                                )
                            }
                            all="Todos"
                        />
                    </Filter>

                    {isBackoffice&&(
                        <Filter label="Cliente">
                            <select
                                value={tenantId}
                                onChange={event=>{
                                    setTenantId(
                                        event.target.value
                                    );
                                    resetPage();
                                }}
                                className={inputClass}
                            >
                                <option value="">
                                    Todos
                                </option>

                                {(meta?.tenants??[]).map(item=>(
                                    <option
                                        key={item.id}
                                        value={item.id}
                                    >
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </Filter>
                    )}

                    <Filter label="Visualização">
                        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={unread}
                                onChange={event=>{
                                    setUnread(
                                        event.target.checked
                                    );
                                    resetPage();
                                }}
                            />
                            Apenas não lidos
                        </label>
                    </Filter>

                    <Filter label="Por página">
                        <select
                            value={perPage}
                            onChange={event=>{
                                setPerPage(
                                    event.target.value
                                );
                                resetPage();
                            }}
                            className={inputClass}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </Filter>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {listQuery.isLoading?(
                    <Loading/>
                ):listQuery.isError?(
                    <Notice
                        title="Não foi possível carregar o Helpdesk"
                        text="Atualize a página e tente novamente."
                    />
                ):!data?.data.length?(
                    <div className="p-14 text-center">
                        <LifeBuoy className="mx-auto h-10 w-10 text-slate-300"/>

                        <p className="mt-3 text-sm text-slate-500">
                            Nenhum chamado encontrado.
                        </p>
                    </div>
                ):(
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <Th>Protocolo</Th>

                                    {isBackoffice&&(
                                        <Th>Cliente</Th>
                                    )}

                                    <Th>Assunto</Th>
                                    <Th>Tipo</Th>
                                    <Th>Prioridade</Th>
                                    <Th>Estado</Th>
                                    <Th>Última atividade</Th>
                                    <Th></Th>
                                </tr>
                            </thead>

                            <tbody>
                                {data.data.map(ticket=>(
                                    <TicketRow
                                        key={ticket.id}
                                        ticket={ticket}
                                        backoffice={
                                            isBackoffice
                                        }
                                        onOpen={()=>
                                            setSelectedId(
                                                ticket.id
                                            )
                                        }
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {data&&
                data.meta.last_page>1&&(
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-slate-500">
                            {data.meta.from??0}–{data.meta.to??0} de {data.meta.total}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={page<=1}
                                onClick={()=>
                                    setPage(
                                        value=>
                                            Math.max(
                                                1,
                                                value-1
                                            )
                                    )
                                }
                                className={paginationClass}
                            >
                                <ChevronLeft className="h-4 w-4"/>
                                Anterior
                            </button>

                            <span className="text-xs text-slate-500">
                                {data.meta.current_page} / {data.meta.last_page}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    page>=
                                    data.meta.last_page
                                }
                                onClick={()=>
                                    setPage(
                                        value=>
                                            Math.min(
                                                data.meta.last_page,
                                                value+1
                                            )
                                    )
                                }
                                className={paginationClass}
                            >
                                Seguinte
                                <ChevronRight className="h-4 w-4"/>
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {createOpen&&
            meta&&(
                <NewTicketModal
                    meta={meta}
                    onClose={()=>
                        setCreateOpen(
                            false
                        )
                    }
                    onCreated={ticket=>{
                        setCreateOpen(false);
                        setSelectedId(
                            ticket.id
                        );
                        refresh();
                    }}
                />
            )}

            {selectedId&&(
                <TicketModal
                    mode={mode}
                    ticket={
                        detailQuery.data??
                        null
                    }
                    loading={
                        detailQuery.isLoading
                    }
                    meta={meta??null}
                    onClose={()=>
                        setSelectedId(
                            null
                        )
                    }
                    onChanged={refresh}
                />
            )}
        </div>
    );
}

function TicketRow({
    ticket,
    backoffice,
    onOpen,
}:{
    ticket:HelpdeskTicket;
    backoffice:boolean;
    onOpen:()=>void;
}){
    return (
        <tr className="border-t border-slate-100 hover:bg-slate-50/70">
            <Td>
                <div className="font-semibold text-slate-900">
                    {ticket.number}
                </div>

                {ticket.unread_count>0&&(
                    <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        {ticket.unread_count} nova(s)
                    </span>
                )}
            </Td>

            {backoffice&&(
                <Td>
                    {ticket.tenant.name}
                </Td>
            )}

            <Td>
                <div className="max-w-xs truncate font-medium text-slate-800">
                    {ticket.subject}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                    {ticket.category_label}
                </div>
            </Td>

            <Td>
                {ticket.type_label}
            </Td>

            <Td>
                <PriorityBadge
                    priority={
                        ticket.priority
                    }
                    label={
                        ticket.priority_label
                    }
                />
            </Td>

            <Td>
                <StatusBadge
                    status={
                        ticket.status
                    }
                    label={
                        ticket.status_label
                    }
                />
            </Td>

            <Td>
                {dateTime(
                    ticket.last_message_at??
                    ticket.created_at
                )}
            </Td>

            <Td>
                <button
                    type="button"
                    onClick={onOpen}
                    className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                    Abrir
                </button>
            </Td>
        </tr>
    );
}

function NewTicketModal({
    meta,
    onClose,
    onCreated,
}:{
    meta:HelpdeskMeta;
    onClose:()=>void;
    onCreated:(ticket:HelpdeskDetail)=>void;
}){
    const [form,setForm]=useState({
        type:"support",
        category:"technical",
        priority:"normal",
        subject:"",
        body:"",
        feature_key:"",
    });

    const [files,setFiles]=
        useState<File[]>([]);

    const mutation=useMutation({
        mutationFn:()=>
            createHelpdeskTicket({
                ...form,
                origin_url:
                    window.location.pathname,
                attachments:files,
            }),

        onSuccess:onCreated,
    });

    function submit(
        event:FormEvent
    ){
        event.preventDefault();

        mutation.mutate();
    }

    return (
        <Modal
            title="Abrir chamado"
            onClose={onClose}
        >
            <form
                onSubmit={submit}
                className="space-y-5"
            >
                {mutation.isError&&(
                    <ErrorBox/>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Filter label="Tipo">
                        <Select
                            value={form.type}
                            setValue={value=>
                                setForm(current=>({
                                    ...current,
                                    type:value,
                                }))
                            }
                            options={meta.types}
                        />
                    </Filter>

                    <Filter label="Categoria">
                        <Select
                            value={form.category}
                            setValue={value=>
                                setForm(current=>({
                                    ...current,
                                    category:value,
                                }))
                            }
                            options={meta.categories}
                        />
                    </Filter>

                    <Filter label="Prioridade">
                        <Select
                            value={form.priority}
                            setValue={value=>
                                setForm(current=>({
                                    ...current,
                                    priority:value,
                                }))
                            }
                            options={meta.priorities}
                        />
                    </Filter>

                    <Filter label="Funcionalidade">
                        <Select
                            value={form.feature_key}
                            setValue={value=>
                                setForm(current=>({
                                    ...current,
                                    feature_key:value,
                                }))
                            }
                            options={meta.features}
                            all="Não especificada"
                        />
                    </Filter>
                </div>

                <Filter label="Assunto">
                    <input
                        required
                        maxLength={255}
                        value={form.subject}
                        onChange={event=>
                            setForm(current=>({
                                ...current,
                                subject:
                                    event.target.value,
                            }))
                        }
                        className={inputClass}
                    />
                </Filter>

                <Filter label="Descrição">
                    <textarea
                        required
                        rows={7}
                        value={form.body}
                        onChange={event=>
                            setForm(current=>({
                                ...current,
                                body:
                                    event.target.value,
                            }))
                        }
                        className={`${inputClass} h-auto py-3`}
                        placeholder="Explique o problema, dúvida ou sugestão com o máximo de contexto possível."
                    />
                </Filter>

                <AttachmentInput
                    files={files}
                    setFiles={setFiles}
                />

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className={secondaryButton}
                    >
                        Cancelar
                    </button>

                    <button
                        disabled={
                            mutation.isPending
                        }
                        className={primaryButton}
                    >
                        {mutation.isPending
                            ?"A abrir..."
                            :"Abrir chamado"
                        }
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function TicketModal({
    mode,
    ticket,
    loading,
    meta,
    onClose,
    onChanged,
}:{
    mode:HelpdeskMode;
    ticket:HelpdeskDetail|null;
    loading:boolean;
    meta:HelpdeskMeta|null;
    onClose:()=>void;
    onChanged:()=>void;
}){
    const client=useQueryClient();

    const [body,setBody]=useState("");
    const [files,setFiles]=useState<File[]>([]);
    const [rating,setRating]=useState(5);
    const [ratingComment,setRatingComment]=useState("");

    const backoffice=
        mode==="backoffice";

    const invalidate=()=>{
        client.invalidateQueries({
            queryKey:["helpdesk"],
        });
        onChanged();
    };

    const replyMutation=
        useMutation({
            mutationFn:()=>
                sendHelpdeskMessage(
                    mode,
                    ticket!.id,
                    body,
                    files
                ),
            onSuccess:()=>{
                setBody("");
                setFiles([]);
                invalidate();
            },
        });

    const updateMutation=
        useMutation({
            mutationFn:(
                payload:
                    Record<string,unknown>
            )=>
                updateHelpdeskTicket(
                    ticket!.id,
                    payload
                ),
            onSuccess:invalidate,
        });

    const closeMutation=
        useMutation({
            mutationFn:()=>
                closeHelpdeskTicket(
                    ticket!.id
                ),
            onSuccess:invalidate,
        });

    const reopenMutation=
        useMutation({
            mutationFn:()=>
                reopenHelpdeskTicket(
                    ticket!.id
                ),
            onSuccess:invalidate,
        });

    const ratingMutation=
        useMutation({
            mutationFn:()=>
                rateHelpdeskTicket(
                    ticket!.id,
                    rating,
                    ratingComment
                ),
            onSuccess:invalidate,
        });

    if(loading||!ticket){
        return (
            <Modal
                title="Chamado"
                onClose={onClose}
            >
                <Loading/>
            </Modal>
        );
    }

    const validStatuses=
        (meta?.statuses??[])
            .filter(
                option=>
                    !option.workflow ||
                    option.workflow===
                    ticket.workflow
            );

    return (
        <Modal
            title={`${ticket.number} · ${ticket.subject}`}
            onClose={onClose}
            wide
        >
            <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                    <StatusBadge
                        status={ticket.status}
                        label={ticket.status_label}
                    />

                    <PriorityBadge
                        priority={ticket.priority}
                        label={ticket.priority_label}
                    />

                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {ticket.type_label}
                    </span>
                </div>

                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                        label="Cliente"
                        value={ticket.tenant.name}
                    />

                    <Info
                        label="Aberto por"
                        value={
                            ticket.opened_by?.name??
                            "—"
                        }
                    />

                    <Info
                        label="Categoria"
                        value={
                            ticket.category_label
                        }
                    />

                    <Info
                        label="Funcionalidade"
                        value={
                            ticket.feature_label??
                            "—"
                        }
                    />

                    <Info
                        label="Criado"
                        value={
                            dateTime(
                                ticket.created_at
                            )
                        }
                    />

                    <Info
                        label="Primeira resposta"
                        value={
                            ticket.first_response_at
                                ?dateTime(
                                    ticket.first_response_at
                                )
                                :"—"
                        }
                    />

                    <Info
                        label="Responsável"
                        value={
                            ticket.assigned_to?.name??
                            "Não atribuído"
                        }
                    />

                    <Info
                        label="Mensagens"
                        value={
                            String(
                                ticket.messages_count
                            )
                        }
                    />
                </div>

                {backoffice&&
                meta&&(
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                        <h3 className="mb-4 font-semibold text-slate-900">
                            Gestão do chamado
                        </h3>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Filter label="Tipo">
                                <Select
                                    value={ticket.type}
                                    setValue={value=>
                                        updateMutation.mutate({
                                            type:value,
                                        })
                                    }
                                    options={meta.types}
                                />
                            </Filter>

                            <Filter label="Categoria">
                                <Select
                                    value={ticket.category}
                                    setValue={value=>
                                        updateMutation.mutate({
                                            category:value,
                                        })
                                    }
                                    options={meta.categories}
                                />
                            </Filter>

                            <Filter label="Prioridade">
                                <Select
                                    value={ticket.priority}
                                    setValue={value=>
                                        updateMutation.mutate({
                                            priority:value,
                                        })
                                    }
                                    options={meta.priorities}
                                />
                            </Filter>

                            <Filter label="Estado">
                                <Select
                                    value={ticket.status}
                                    setValue={value=>
                                        updateMutation.mutate({
                                            status:value,
                                        })
                                    }
                                    options={validStatuses}
                                />
                            </Filter>

                            <Filter label="Responsável">
                                <select
                                    value={
                                        ticket.assigned_to?.id??
                                        ""
                                    }
                                    onChange={event=>
                                        updateMutation.mutate({
                                            assigned_to_user_id:
                                                event.target.value||
                                                null,
                                        })
                                    }
                                    className={inputClass}
                                >
                                    <option value="">
                                        Não atribuído
                                    </option>

                                    {meta.assignees.map(item=>(
                                        <option
                                            key={item.id}
                                            value={item.id}
                                        >
                                            {item.name??item.email}
                                        </option>
                                    ))}
                                </select>
                            </Filter>
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="mb-4 font-semibold text-slate-900">
                        Histórico
                    </h3>

                    <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        {ticket.messages.map(message=>(
                            <div
                                key={message.id}
                                className={
                                    message.system
                                        ?"rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500"
                                        :[
                                            "max-w-[88%] rounded-2xl px-4 py-3",
                                            message.sender_side==="saas"
                                                ?"ml-auto bg-indigo-600 text-white"
                                                :"bg-white text-slate-700 shadow-sm",
                                        ].join(" ")
                                }
                            >
                                {!message.system&&(
                                    <div className="mb-1 text-[11px] font-semibold opacity-70">
                                        {message.sender?.name??
                                            (
                                                message.sender_side==="saas"
                                                    ?"FrotaPro"
                                                    :"Gestor"
                                            )
                                        }
                                        {" · "}
                                        {dateTime(
                                            message.created_at
                                        )}
                                    </div>
                                )}

                                {message.body&&(
                                    <p className="whitespace-pre-wrap break-words text-sm">
                                        {message.body}
                                    </p>
                                )}

                                {message.attachments.length>0&&(
                                    <div className="mt-3 space-y-2">
                                        {message.attachments.map(file=>(
                                            <a
                                                key={file.id}
                                                href={file.download_url}
                                                className={[
                                                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold",
                                                    message.sender_side==="saas"&&!message.system
                                                        ?"border-white/20 bg-white/10 text-white"
                                                        :"border-slate-200 bg-white text-slate-600",
                                                ].join(" ")}
                                            >
                                                <FileText className="h-4 w-4"/>
                                                <span className="min-w-0 flex-1 truncate">
                                                    {file.name}
                                                </span>
                                                <Download className="h-4 w-4"/>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {ticket.status!=="closed"&&(
                    <div className="rounded-2xl border border-slate-200 p-5">
                        <h3 className="mb-3 font-semibold text-slate-900">
                            Responder
                        </h3>

                        <textarea
                            rows={5}
                            value={body}
                            onChange={event=>
                                setBody(
                                    event.target.value
                                )
                            }
                            className={`${inputClass} h-auto py-3`}
                            placeholder="Escreva a sua resposta..."
                        />

                        <div className="mt-3">
                            <AttachmentInput
                                files={files}
                                setFiles={setFiles}
                            />
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                disabled={
                                    replyMutation.isPending||
                                    (
                                        !body.trim()&&
                                        files.length===0
                                    )
                                }
                                onClick={()=>
                                    replyMutation.mutate()
                                }
                                className={primaryButton}
                            >
                                <Send className="h-4 w-4"/>
                                Enviar resposta
                            </button>
                        </div>
                    </div>
                )}

                {!backoffice&&(
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                        {ticket.status!=="closed"?(
                            <button
                                type="button"
                                onClick={()=>
                                    closeMutation.mutate()
                                }
                                className={secondaryButton}
                            >
                                Fechar chamado
                            </button>
                        ):!ticket.rating&&(
                            <button
                                type="button"
                                onClick={()=>
                                    reopenMutation.mutate()
                                }
                                className={secondaryButton}
                            >
                                Reabrir chamado
                            </button>
                        )}
                    </div>
                )}

                {!backoffice&&
                ticket.status==="closed"&&
                !ticket.rating&&(
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <h3 className="font-semibold text-amber-950">
                            Avalie este atendimento
                        </h3>

                        <p className="mt-1 text-sm text-amber-700">
                            A sua avaliação ajuda a melhorar o suporte FrotaPro.
                        </p>

                        <div className="mt-4 flex gap-1">
                            {[1,2,3,4,5].map(value=>(
                                <button
                                    key={value}
                                    type="button"
                                    onClick={()=>
                                        setRating(value)
                                    }
                                    className="p-1"
                                >
                                    <Star
                                        className={[
                                            "h-7 w-7",
                                            value<=rating
                                                ?"fill-amber-400 text-amber-400"
                                                :"text-slate-300",
                                        ].join(" ")}
                                    />
                                </button>
                            ))}
                        </div>

                        <textarea
                            rows={3}
                            value={ratingComment}
                            onChange={event=>
                                setRatingComment(
                                    event.target.value
                                )
                            }
                            placeholder="Comentário opcional"
                            className={`${inputClass} mt-3 h-auto py-3`}
                        />

                        <button
                            type="button"
                            onClick={()=>
                                ratingMutation.mutate()
                            }
                            disabled={
                                ratingMutation.isPending
                            }
                            className={`${primaryButton} mt-3`}
                        >
                            Enviar avaliação
                        </button>
                    </div>
                )}

                {ticket.rating&&(
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(value=>(
                                <Star
                                    key={value}
                                    className={[
                                        "h-5 w-5",
                                        value<=ticket.rating!.rating
                                            ?"fill-emerald-500 text-emerald-500"
                                            :"text-slate-300",
                                    ].join(" ")}
                                />
                            ))}
                        </div>

                        <p className="mt-2 text-sm font-semibold text-emerald-900">
                            Atendimento avaliado com {ticket.rating.rating}/5
                        </p>

                        {ticket.rating.comment&&(
                            <p className="mt-1 text-sm text-emerald-700">
                                {ticket.rating.comment}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}

function AttachmentInput({
    files,
    setFiles,
}:{
    files:File[];
    setFiles:(files:File[])=>void;
}){
    return (
        <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <Paperclip className="h-4 w-4"/>
                Adicionar anexos

                <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={event=>
                        setFiles(
                            Array.from(
                                event.target.files??
                                []
                            ).slice(0,5)
                        )
                    }
                />
            </label>

            {files.length>0&&(
                <div className="mt-2 text-xs text-slate-500">
                    {files.map(file=>file.name).join(" · ")}
                </div>
            )}
        </div>
    );
}

function Modal({
    title,
    children,
    onClose,
    wide=false,
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

            <div
                className={[
                    "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl",
                    wide
                        ?"max-w-6xl"
                        :"max-w-3xl",
                ].join(" ")}
            >
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <h2 className="font-bold text-slate-950">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </header>

                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

function Kpi({
    label,
    value,
}:{
    label:string;
    value:number;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
                {new Intl.NumberFormat(
                    "pt-PT"
                ).format(value)}
            </p>
        </div>
    );
}

function Filter({
    label,
    children,
}:{
    label:string;
    children:React.ReactNode;
}){
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </label>

            {children}
        </div>
    );
}

function Select({
    value,
    setValue,
    options,
    all,
}:{
    value:string;
    setValue:(value:string)=>void;
    options:HelpdeskOption[];
    all?:string;
}){
    return (
        <select
            value={value}
            onChange={event=>
                setValue(
                    event.target.value
                )
            }
            className={inputClass}
        >
            {all!==undefined&&(
                <option value="">
                    {all}
                </option>
            )}

            {options.map(item=>(
                <option
                    key={`${item.value}-${item.workflow??""}`}
                    value={item.value}
                >
                    {item.label}
                </option>
            ))}
        </select>
    );
}

function StatusBadge({
    status,
    label,
}:{
    status:string;
    label:string;
}){
    const classes=
        status==="closed"
            ?"bg-slate-100 text-slate-600"
            :["resolved","implemented"].includes(status)
                ?"bg-emerald-50 text-emerald-700"
                :["waiting_customer","planned"].includes(status)
                    ?"bg-amber-50 text-amber-700"
                    :status==="not_planned"
                        ?"bg-red-50 text-red-700"
                        :"bg-blue-50 text-blue-700";

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
            {label}
        </span>
    );
}

function PriorityBadge({
    priority,
    label,
}:{
    priority:string;
    label:string;
}){
    const classes=
        priority==="urgent"
            ?"bg-red-50 text-red-700"
            :priority==="high"
                ?"bg-orange-50 text-orange-700"
                :priority==="low"
                    ?"bg-slate-100 text-slate-600"
                    :"bg-blue-50 text-blue-700";

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
            {label}
        </span>
    );
}

function Info({
    label,
    value,
}:{
    label:string;
    value:string;
}){
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
                {value}
            </p>
        </div>
    );
}

function Notice({
    title,
    text,
}:{
    title:string;
    text:string;
}){
    return (
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <AlertCircle className="mx-auto h-7 w-7 text-slate-400"/>

            <h1 className="mt-3 font-semibold text-slate-900">
                {title}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
                {text}
            </p>
        </div>
    );
}

function ErrorBox(){
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Não foi possível concluir a operação. Verifique os dados e tente novamente.
        </div>
    );
}

function Loading(){
    return (
        <div className="flex justify-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}

function Th({
    children,
}:{
    children:React.ReactNode;
}){
    return (
        <th className="whitespace-nowrap bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {children}
        </th>
    );
}

function Td({
    children,
}:{
    children:React.ReactNode;
}){
    return (
        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
            {children}
        </td>
    );
}

function dateTime(
    value:string
){
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:"short",
            timeStyle:"short",
        }
    ).format(
        new Date(value)
    );
}

function uniqueOptions(
    options:HelpdeskOption[]
){
    const seen=new Set<string>();

    return options.filter(item=>{
        if(seen.has(item.value)){
            return false;
        }

        seen.add(item.value);

        return true;
    });
}

const inputClass=
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const primaryButton=
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50";

const secondaryButton=
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600";

const paginationClass=
    "inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40";
