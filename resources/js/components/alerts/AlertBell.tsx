import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    Bell,
    CheckCheck,
    ChevronRight,
    LoaderCircle,
} from "lucide-react";

import {
    useNavigate,
} from "react-router-dom";

import {
    alertKeys,
    fetchAlertSummary,
    markAlertRead,
    markAllAlertsRead,
} from "../../lib/alerts";

import {
    useTenant,
} from "../../contexts/TenantContext";

import type {
    AlertItem,
    AlertSeverity,
} from "../../types/alerts";

export default function AlertBell() {
    const { tenant }=useTenant();

    const navigate=useNavigate();

    const queryClient=
        useQueryClient();

    const [open,setOpen]=
        useState(false);

    const containerRef=
        useRef<HTMLDivElement | null>(
            null,
        );

    const summaryQuery=useQuery({
        queryKey:
            alertKeys.summary(
                tenant?.id,
            ),

        enabled:Boolean(tenant),

        queryFn:
            fetchAlertSummary,

        refetchInterval:
            60_000,
    });

    const markReadMutation=
        useMutation({
            mutationFn:
                markAlertRead,

            onSuccess:
                invalidate,
        });

    const markAllMutation=
        useMutation({
            mutationFn:
                markAllAlertsRead,

            onSuccess:
                invalidate,
        });

    function invalidate() {
        queryClient
            .invalidateQueries({
                queryKey:
                    alertKeys.root,
            });
    }

    function handleItem(
        item: AlertItem,
    ) {
        if(
            !item
                .recipient
                ?.read_at
        ){
            markReadMutation
                .mutate(item.id);
        }

        setOpen(false);

        navigate(
            "/alertas",
        );
    }

    useEffect(()=>{
        function handleOutside(
            event: MouseEvent,
        ) {
            if(
                containerRef.current &&
                !containerRef
                    .current
                    .contains(
                        event.target as Node,
                    )
            ){
                setOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleOutside,
        );

        return ()=>{
            document.removeEventListener(
                "mousedown",
                handleOutside,
            );
        };
    },[]);

    if(!tenant){
        return null;
    }

    const summary=
        summaryQuery.data;

    const unread=
        summary?.unread ?? 0;

    return (
        <div
            ref={containerRef}
            className="relative"
        >
            <button
                type="button"
                onClick={()=>
                    setOpen(
                        value=>!value,
                    )
                }
                aria-label="Alertas"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
                <Bell className="h-5 w-5" />

                {unread>0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                        {unread>99
                            ? "99+"
                            : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-12 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <div className="font-semibold text-slate-900">
                                Alertas
                            </div>

                            <div className="text-xs text-slate-400">
                                {unread} não lido
                                {unread===1
                                    ? ""
                                    : "s"}
                            </div>
                        </div>

                        {unread>0 && (
                            <button
                                type="button"
                                disabled={
                                    markAllMutation
                                        .isPending
                                }
                                onClick={()=>
                                    markAllMutation
                                        .mutate()
                                }
                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                            >
                                {markAllMutation.isPending
                                    ? (
                                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                    )
                                    : (
                                        <CheckCheck className="h-3.5 w-3.5" />
                                    )}

                                Marcar lidos
                            </button>
                        )}
                    </div>

                    {summaryQuery.isLoading ? (
                        <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-400">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            A carregar...
                        </div>
                    ) : !summary ||
                        summary.items.length===0 ? (
                        <div className="px-5 py-10 text-center text-sm text-slate-400">
                            Nenhum alerta ativo.
                        </div>
                    ) : (
                        <div className="max-h-[430px] divide-y divide-slate-100 overflow-y-auto">
                            {summary.items.map(
                                item=>(
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={()=>
                                            handleItem(
                                                item,
                                            )
                                        }
                                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                                    >
                                        <span
                                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot(item.severity)}`}
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className={`truncate text-sm ${item.recipient?.read_at ? "font-medium text-slate-700" : "font-semibold text-slate-950"}`}
                                                >
                                                    {item.title}
                                                </span>

                                                {!item
                                                    .recipient
                                                    ?.read_at && (
                                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                                                )}
                                            </span>

                                            {item.message && (
                                                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-400">
                                                    {item.message}
                                                </span>
                                            )}
                                        </span>

                                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                                    </button>
                                ),
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={()=>{
                            setOpen(false);
                            navigate(
                                "/alertas",
                            );
                        }}
                        className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                    >
                        Ver todos os alertas
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

function severityDot(
    severity: AlertSeverity,
): string {
    return {
        critical:"bg-red-500",
        high:"bg-orange-500",
        medium:"bg-amber-400",
        low:"bg-blue-400",
    }[severity];
}
