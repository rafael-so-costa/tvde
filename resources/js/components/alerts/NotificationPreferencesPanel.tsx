import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    BellRing,
    LoaderCircle,
    Save,
    Trash2,
} from "lucide-react";

import {
    alertKeys,
    deleteEmailPreference,
    fetchNotificationPreferences,
    saveEmailPreference,
} from "../../lib/alerts";

import {
    useTenant,
} from "../../contexts/TenantContext";

import type {
    NotificationPreference,
    SaveEmailPreferencePayload,
} from "../../types/alerts";

const CATEGORY_LABELS:
    Record<string,string>={
        "*":"Todas as categorias",
        document:"Documentos",
        contract:"Contratos",
        rental:"Alugueres",
        claim:"Sinistros",
        maintenance:"Manutenção",
        diagnostic:"Diagnósticos",
        inventory:"Estoque",
        purchase:"Compras",
        helpdesk:"Helpdesk",
        news:"Novidades",
        platform:"Plataforma",
        training:"Treinamentos e ajuda",
        account:"Conta",
        system:"Sistema",
    };

export default function NotificationPreferencesPanel(){
    const {tenant}=useTenant();

    const queryClient=
        useQueryClient();

    const [category,setCategory]=
        useState("*");

    const [enabled,setEnabled]=
        useState(false);

    const [
        minimumSeverity,
        setMinimumSeverity,
    ]=useState<
        SaveEmailPreferencePayload[
            "minimum_severity"
        ]
    >("low");

    const [
        deliveryMode,
        setDeliveryMode,
    ]=useState<
        SaveEmailPreferencePayload[
            "delivery_mode"
        ]
    >("immediate");

    const [
        quietStart,
        setQuietStart,
    ]=useState("");

    const [
        quietEnd,
        setQuietEnd,
    ]=useState("");

    const [timezone,setTimezone]=
        useState(
            Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone||
            "Europe/Lisbon"
        );

    const query=useQuery({
        queryKey:
            alertKeys.preferences(
                tenant?.id
            ),

        enabled:Boolean(
            tenant
        ),

        queryFn:
            fetchNotificationPreferences,
    });

    const explicit=
        useMemo(
            ()=>
                query.data?.data.find(
                    item=>
                        item.channel===
                        "email"&&
                        item.category===
                        category
                )??null,
            [
                query.data,
                category,
            ]
        );

    const effective=
        useMemo(
            ()=>
                category==="*"
                    ?null
                    :(
                        query.data
                            ?.effective_email
                            .find(
                                item=>
                                    item.category===
                                    category
                            )
                        ??null
                    ),
            [
                query.data,
                category,
            ]
        );

    useEffect(()=>{
        const source:
            NotificationPreference|null=
            explicit??
            effective;

        setEnabled(
            source?.enabled??
            false
        );

        setMinimumSeverity(
            source
                ?.minimum_severity??
            "low"
        );

        setDeliveryMode(
            source
                ?.delivery_mode??
            "immediate"
        );

        setQuietStart(
            source
                ?.quiet_hours_start
                ?.slice(
                    0,
                    5
                )??
            ""
        );

        setQuietEnd(
            source
                ?.quiet_hours_end
                ?.slice(
                    0,
                    5
                )??
            ""
        );

        setTimezone(
            source?.timezone??
            Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone??
            "Europe/Lisbon"
        );
    },[
        explicit,
        effective,
        category,
    ]);

    const saveMutation=
        useMutation({
            mutationFn:
                saveEmailPreference,

            onSuccess:
                invalidate,
        });

    const deleteMutation=
        useMutation({
            mutationFn:
                deleteEmailPreference,

            onSuccess:
                invalidate,
        });

    function invalidate(){
        queryClient
            .invalidateQueries({
                queryKey:
                    alertKeys.root,
            });
    }

    function save(){
        saveMutation.mutate({
            category,
            enabled,

            minimum_severity:
                minimumSeverity,

            delivery_mode:
                deliveryMode,

            quiet_hours_start:
                quietStart||
                null,

            quiet_hours_end:
                quietEnd||
                null,

            timezone:
                timezone||
                "Europe/Lisbon",
        });
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-indigo-600"/>

                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Notificações por email
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-400">
                            O canal in-app permanece sempre ativo.
                        </p>
                    </div>
                </div>
            </div>

            {query.isLoading?(
                <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-400">
                    <LoaderCircle className="h-4 w-4 animate-spin"/>
                    A carregar preferências...
                </div>
            ):(
                <div className="space-y-5 p-5">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Categoria
                        </label>

                        <select
                            value={
                                category
                            }
                            onChange={event=>
                                setCategory(
                                    event.target.value
                                )
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        >
                            {Object.entries(
                                CATEGORY_LABELS
                            ).map(
                                ([
                                    value,
                                    label,
                                ])=>(
                                    <option
                                        key={
                                            value
                                        }
                                        value={
                                            value
                                        }
                                    >
                                        {label}
                                    </option>
                                )
                            )}
                        </select>

                        {!explicit&&
                        effective&&(
                            <p className="mt-1.5 text-xs text-slate-400">
                                Esta categoria está a herdar a preferência global.
                            </p>
                        )}
                    </div>

                    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                        <div>
                            <div className="text-sm font-semibold text-slate-800">
                                Ativar email
                            </div>

                            <div className="mt-0.5 text-xs text-slate-400">
                                Emails são opt-in.
                            </div>
                        </div>

                        <input
                            type="checkbox"
                            checked={
                                enabled
                            }
                            onChange={event=>
                                setEnabled(
                                    event
                                        .target
                                        .checked
                                )
                            }
                            className="h-5 w-5 rounded border-slate-300 text-indigo-600"
                        />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Severidade mínima
                            </label>

                            <select
                                value={
                                    minimumSeverity
                                }
                                onChange={event=>
                                    setMinimumSeverity(
                                        event
                                            .target
                                            .value as SaveEmailPreferencePayload[
                                                "minimum_severity"
                                            ]
                                    )
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="low">
                                    Baixa
                                </option>

                                <option value="medium">
                                    Média
                                </option>

                                <option value="high">
                                    Alta
                                </option>

                                <option value="critical">
                                    Crítica
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Entrega
                            </label>

                            <select
                                value={
                                    deliveryMode
                                }
                                onChange={event=>
                                    setDeliveryMode(
                                        event
                                            .target
                                            .value as SaveEmailPreferencePayload[
                                                "delivery_mode"
                                            ]
                                    )
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="immediate">
                                    Imediata
                                </option>

                                <option value="daily_digest">
                                    Resumo diário
                                </option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Silêncio desde
                            </label>

                            <input
                                type="time"
                                value={
                                    quietStart
                                }
                                onChange={event=>
                                    setQuietStart(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Até
                            </label>

                            <input
                                type="time"
                                value={
                                    quietEnd
                                }
                                onChange={event=>
                                    setQuietEnd(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Fuso horário
                        </label>

                        <input
                            type="text"
                            value={
                                timezone
                            }
                            onChange={event=>
                                setTimezone(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Europe/Lisbon"
                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    {(
                        saveMutation.isError||
                        deleteMutation.isError
                    )&&(
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Não foi possível atualizar a preferência.
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={
                                saveMutation
                                    .isPending
                            }
                            onClick={
                                save
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saveMutation
                                .isPending
                                ?(
                                    <LoaderCircle className="h-4 w-4 animate-spin"/>
                                )
                                :(
                                    <Save className="h-4 w-4"/>
                                )
                            }

                            Guardar
                        </button>

                        {explicit&&(
                            <button
                                type="button"
                                disabled={
                                    deleteMutation
                                        .isPending
                                }
                                onClick={()=>
                                    deleteMutation
                                        .mutate(
                                            category
                                        )
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4"/>
                                Remover override
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
