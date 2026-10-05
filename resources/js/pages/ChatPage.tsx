import {useEffect,useMemo,useState} from "react";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {
    Download,
    FileText,
    Image as ImageIcon,
    LoaderCircle,
    Megaphone,
    MessageSquareText,
    Paperclip,
    Plus,
    Search,
    Send,
    X,
} from "lucide-react";
import {useAuth} from "../contexts/AuthContext";
import {
    createChatConversation,
    fetchChat,
    fetchChatConversation,
    fetchChatRecipients,
    sendChatMessage,
    type ChatConversation,
    type ChatMode,
    type ChatRecipient,
} from "../lib/chat";

export default function ChatPage({
    mode="tenant",
}:{
    mode?:ChatMode;
}){
    const {user}=useAuth();
    const client=useQueryClient();

    const [selectedId,setSelectedId]=useState<string|null>(null);
    const [compose,setCompose]=useState(false);
    const [search,setSearch]=useState("");
    const [body,setBody]=useState("");
    const [files,setFiles]=useState<File[]>([]);

    const listQuery=useQuery({
        queryKey:["chat","list",mode],
        queryFn:()=>fetchChat(mode),
        refetchInterval:15000,
    });

    const conversationQuery=useQuery({
        queryKey:["chat","conversation",mode,selectedId],
        enabled:Boolean(selectedId),
        queryFn:()=>fetchChatConversation(
            mode,
            selectedId!,
        ),
        refetchInterval:10000,
    });

    const recipientsQuery=useQuery({
        queryKey:["chat","recipients",mode,search],
        queryFn:()=>fetchChatRecipients(
            mode,
            search,
        ),
    });

    const sendMutation=useMutation({
        mutationFn:()=>sendChatMessage(
            mode,
            selectedId!,
            body,
            files,
        ),
        onSuccess:async()=>{
            setBody("");
            setFiles([]);

            await client.invalidateQueries({
                queryKey:["chat"],
            });
        },
    });

    const conversations=
        listQuery.data?.data ??
        [];

    useEffect(()=>{
        if(
            !selectedId &&
            conversations.length
        ){
            setSelectedId(
                conversations[0].id,
            );
        }
    },[
        conversations,
        selectedId,
    ]);

    const selected=
        conversationQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Comunicação
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Mensagens
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Conversas, comunicados e documentos num único lugar.
                    </p>
                </div>

                {recipientsQuery.data?.can_create && (
                    <button
                        type="button"
                        onClick={()=>
                            setCompose(true)
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4"/>
                        Nova mensagem
                    </button>
                )}
            </div>

            <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
                    <div className="border-b border-slate-100 p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>

                            <input
                                value={search}
                                onChange={event=>
                                    setSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="Pesquisar..."
                                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-[590px] overflow-y-auto">
                        {listQuery.isLoading ? (
                            <Loading/>
                        ):conversations.length===0 ? (
                            <div className="p-8 text-center text-sm text-slate-400">
                                Nenhuma mensagem.
                            </div>
                        ):(
                            conversations.map(
                                (
                                    conversation:
                                    ChatConversation,
                                )=>(
                                    <ConversationRow
                                        key={
                                            conversation.id
                                        }
                                        conversation={
                                            conversation
                                        }
                                        selected={
                                            selectedId===
                                            conversation.id
                                        }
                                        onClick={()=>
                                            setSelectedId(
                                                conversation.id,
                                            )
                                        }
                                    />
                                ),
                            )
                        )}
                    </div>
                </aside>

                <main className="flex min-w-0 flex-col">
                    {!selectedId ? (
                        <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
                            Selecione uma conversa.
                        </div>
                    ):conversationQuery.isLoading ? (
                        <Loading/>
                    ):!selected ? (
                        <div className="p-8 text-center text-sm text-red-500">
                            Não foi possível carregar a conversa.
                        </div>
                    ):(
                        <>
                            <div className="border-b border-slate-100 px-5 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {selected.type==="broadcast" ? (
                                                <Megaphone className="h-4 w-4 text-indigo-600"/>
                                            ):(
                                                <MessageSquareText className="h-4 w-4 text-indigo-600"/>
                                            )}

                                            <h2 className="font-semibold text-slate-950">
                                                {selected.subject}
                                            </h2>
                                        </div>

                                        <p className="mt-1 text-xs text-slate-400">
                                            {selected.source==="saas"
                                                ?"FrotaPro SaaS"
                                                :selected.type==="broadcast"
                                                    ?"Comunicado da frota"
                                                    :"Conversa direta"}
                                        </p>
                                    </div>

                                    {selected.type==="broadcast" && (
                                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                            Broadcast
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
                                {selected.messages?.map(
                                    message=>{
                                        const mine=
                                            message.sender?.id===
                                            user?.id;

                                        return (
                                            <div
                                                key={
                                                    message.id
                                                }
                                                className={[
                                                    "flex",
                                                    mine
                                                        ?"justify-end"
                                                        :"justify-start",
                                                ].join(" ")}
                                            >
                                                <div className={[
                                                    "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%]",
                                                    mine
                                                        ?"bg-indigo-600 text-white"
                                                        :"border border-slate-200 bg-white text-slate-800",
                                                ].join(" ")}>
                                                    {!mine && (
                                                        <div className="mb-1 text-xs font-semibold text-indigo-600">
                                                            {message.sender?.name}
                                                        </div>
                                                    )}

                                                    {message.body && (
                                                        <div className="whitespace-pre-wrap text-sm leading-6">
                                                            {message.body}
                                                        </div>
                                                    )}

                                                    {message.attachments.length>0 && (
                                                        <div className="mt-3 space-y-2">
                                                            {message.attachments.map(
                                                                attachment=>(
                                                                    <Attachment
                                                                        key={
                                                                            attachment.id
                                                                        }
                                                                        attachment={
                                                                            attachment
                                                                        }
                                                                        mine={
                                                                            mine
                                                                        }
                                                                    />
                                                                ),
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className={[
                                                        "mt-2 text-[10px]",
                                                        mine
                                                            ?"text-indigo-200"
                                                            :"text-slate-400",
                                                    ].join(" ")}>
                                                        {new Date(
                                                            message.sent_at,
                                                        ).toLocaleString(
                                                            "pt-PT",
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>

                            {selected.reply_enabled ? (
                                <div className="border-t border-slate-200 bg-white p-4">
                                    {files.length>0 && (
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {files.map(
                                                (
                                                    file,
                                                    index,
                                                )=>(
                                                    <span
                                                        key={`${file.name}-${index}`}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600"
                                                    >
                                                        {file.name}

                                                        <button
                                                            type="button"
                                                            onClick={()=>
                                                                setFiles(
                                                                    current=>
                                                                        current.filter(
                                                                            (_,i)=>
                                                                                i!==index,
                                                                        ),
                                                                )
                                                            }
                                                        >
                                                            <X className="h-3 w-3"/>
                                                        </button>
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-end gap-2">
                                        <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600">
                                            <Paperclip className="h-5 w-5"/>

                                            <input
                                                type="file"
                                                multiple
                                                accept=".jpg,.jpeg,.png,.webp,.pdf"
                                                className="hidden"
                                                onChange={event=>
                                                    setFiles(
                                                        Array.from(
                                                            event.target.files ??
                                                            [],
                                                        ).slice(
                                                            0,
                                                            5,
                                                        ),
                                                    )
                                                }
                                            />
                                        </label>

                                        <textarea
                                            value={body}
                                            onChange={event=>
                                                setBody(
                                                    event.target.value,
                                                )
                                            }
                                            rows={2}
                                            placeholder="Escreva uma mensagem..."
                                            className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                                        />

                                        <button
                                            type="button"
                                            disabled={
                                                sendMutation.isPending ||
                                                (!body.trim() &&
                                                files.length===0)
                                            }
                                            onClick={()=>
                                                sendMutation.mutate()
                                            }
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {sendMutation.isPending ? (
                                                <LoaderCircle className="h-4 w-4 animate-spin"/>
                                            ):(
                                                <Send className="h-4 w-4"/>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ):(
                                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-center text-xs text-slate-500">
                                    Este comunicado é apenas informativo e não aceita respostas.
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {compose && (
                <ComposeModal
                    mode={mode}
                    capabilities={
                        recipientsQuery.data
                    }
                    onClose={()=>
                        setCompose(false)
                    }
                    onCreated={async id=>{
                        setCompose(false);
                        setSelectedId(id);

                        await client.invalidateQueries({
                            queryKey:["chat"],
                        });
                    }}
                />
            )}
        </div>
    );
}

function ConversationRow({
    conversation,
    selected,
    onClick,
}:{
    conversation:ChatConversation;
    selected:boolean;
    onClick:()=>void;
}){
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "w-full border-b border-slate-100 p-4 text-left transition",
                selected
                    ?"bg-indigo-50"
                    :"hover:bg-slate-50",
            ].join(" ")}
        >
            <div className="flex items-start gap-3">
                <div className={[
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    conversation.type==="broadcast"
                        ?"bg-violet-100 text-violet-700"
                        :"bg-indigo-100 text-indigo-700",
                ].join(" ")}>
                    {conversation.type==="broadcast" ? (
                        <Megaphone className="h-4 w-4"/>
                    ):(
                        <MessageSquareText className="h-4 w-4"/>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                            {conversation.subject}
                        </p>

                        {conversation.unread_count>0 && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {conversation.unread_count}
                            </span>
                        )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {conversation.last_message?.body ??
                        (conversation.last_message?.attachments.length
                            ?"Anexo"
                            :"")}
                    </p>
                </div>
            </div>
        </button>
    );
}

function ComposeModal({
    mode,
    capabilities,
    onClose,
    onCreated,
}:{
    mode:ChatMode;
    capabilities:any;
    onClose:()=>void;
    onCreated:(id:string)=>void;
}){
    const [type,setType]=useState<"direct"|"broadcast">("direct");
    const [subject,setSubject]=useState("");
    const [body,setBody]=useState("");
    const [audience,setAudience]=useState("all");
    const [selected,setSelected]=useState<string[]>([]);
    const [files,setFiles]=useState<File[]>([]);

    const recipients:
        ChatRecipient[]=
        capabilities?.recipients ??
        [];

    const mutation=useMutation({
        mutationFn:()=>createChatConversation(
            mode,
            {
                type,
                subject,
                body,
                audience:
                    type==="broadcast"
                        ?audience
                        :undefined,
                recipient_ids:selected,
                attachments:files,
            },
        ),
        onSuccess:data=>
            onCreated(
                data.id,
            ),
    });

    useEffect(()=>{
        if(
            type==="direct" &&
            recipients.length===1
        ){
            setSelected([
                recipients[0].id,
            ]);
        }
    },[
        type,
        recipients,
    ]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="font-semibold text-slate-950">
                            Nova mensagem
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                            Envie uma conversa ou comunicado.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    {capabilities?.can_broadcast && (
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Tipo
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    ["direct","Mensagem direta"],
                                    ["broadcast","Broadcast"],
                                ].map(([value,label])=>(
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={()=>{
                                            setType(
                                                value as
                                                "direct"|
                                                "broadcast",
                                            );
                                            setSelected([]);
                                        }}
                                        className={[
                                            "rounded-xl border px-4 py-3 text-sm font-semibold",
                                            type===value
                                                ?"border-indigo-500 bg-indigo-50 text-indigo-700"
                                                :"border-slate-200 text-slate-600",
                                        ].join(" ")}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Assunto
                        </label>

                        <input
                            value={subject}
                            onChange={event=>
                                setSubject(
                                    event.target.value,
                                )
                            }
                            maxLength={255}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    {type==="broadcast" ? (
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Público
                            </label>

                            <select
                                value={audience}
                                onChange={event=>{
                                    setAudience(
                                        event.target.value,
                                    );
                                    setSelected([]);
                                }}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                            >
                                {capabilities?.audiences?.map(
                                    (item:any)=>(
                                        <option
                                            key={
                                                item.value
                                            }
                                            value={
                                                item.value
                                            }
                                        >
                                            {item.label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                    ):null}

                    {(type==="direct" ||
                    audience==="selected") && (
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Destinatário
                            </label>

                            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                                {recipients.map(
                                    recipient=>{
                                        const checked=
                                            selected.includes(
                                                recipient.id,
                                            );

                                        return (
                                            <label
                                                key={
                                                    recipient.id
                                                }
                                                className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50"
                                            >
                                                <input
                                                    type={
                                                        type==="direct"
                                                            ?"radio"
                                                            :"checkbox"
                                                    }
                                                    name="chat-recipient"
                                                    checked={
                                                        checked
                                                    }
                                                    onChange={()=>{
                                                        if(type==="direct"){
                                                            setSelected([
                                                                recipient.id,
                                                            ]);
                                                            return;
                                                        }

                                                        setSelected(
                                                            current=>
                                                                checked
                                                                    ?current.filter(
                                                                        id=>
                                                                            id!==
                                                                            recipient.id,
                                                                    )
                                                                    :[
                                                                        ...current,
                                                                        recipient.id,
                                                                    ],
                                                        );
                                                    }}
                                                />

                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-slate-800">
                                                        {recipient.name}
                                                    </div>

                                                    <div className="text-xs text-slate-400">
                                                        {recipient.email}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    },
                                )}

                                {recipients.length===0 && (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                        Nenhum destinatário disponível.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Mensagem
                        </label>

                        <textarea
                            value={body}
                            onChange={event=>
                                setBody(
                                    event.target.value,
                                )
                            }
                            rows={7}
                            className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Anexos
                        </label>

                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600">
                            <Paperclip className="h-4 w-4"/>
                            Imagens ou PDF

                            <input
                                type="file"
                                multiple
                                accept=".jpg,.jpeg,.png,.webp,.pdf"
                                className="hidden"
                                onChange={event=>
                                    setFiles(
                                        Array.from(
                                            event.target.files ??
                                            [],
                                        ).slice(
                                            0,
                                            5,
                                        ),
                                    )
                                }
                            />
                        </label>

                        {files.length>0 && (
                            <div className="mt-2 space-y-1">
                                {files.map(
                                    (
                                        file,
                                        index,
                                    )=>(
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"
                                        >
                                            {file.name}

                                            <button
                                                type="button"
                                                onClick={()=>
                                                    setFiles(
                                                        current=>
                                                            current.filter(
                                                                (_,i)=>
                                                                    i!==index,
                                                            ),
                                                    )
                                                }
                                            >
                                                <X className="h-3 w-3"/>
                                            </button>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                    </div>

                    {mutation.isError && (
                        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                            Não foi possível enviar a mensagem. Verifique os campos e tente novamente.
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        disabled={
                            mutation.isPending ||
                            !subject.trim() ||
                            (!body.trim() &&
                            files.length===0)
                        }
                        onClick={()=>
                            mutation.mutate()
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {mutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin"/>
                        ):(
                            <Send className="h-4 w-4"/>
                        )}

                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}

function Attachment({
    attachment,
    mine,
}:{
    attachment:any;
    mine:boolean;
}){
    if(attachment.kind==="image"){
        return (
            <div>
                <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                >
                    <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="max-h-72 rounded-xl object-cover"
                    />
                </a>
            </div>
        );
    }

    return (
        <a
            href={attachment.download_url}
            className={[
                "flex items-center gap-3 rounded-xl border p-3 text-xs",
                mine
                    ?"border-white/20 bg-white/10 text-white"
                    :"border-slate-200 bg-slate-50 text-slate-600",
            ].join(" ")}
        >
            <FileText className="h-5 w-5"/>

            <span className="min-w-0 flex-1 truncate">
                {attachment.name}
            </span>

            <Download className="h-4 w-4"/>
        </a>
    );
}

function Loading(){
    return (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-400">
            <LoaderCircle className="h-4 w-4 animate-spin"/>
            A carregar...
        </div>
    );
}
