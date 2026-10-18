import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    Mail,
    RefreshCw,
    Save,
    Search,
    Send,
    Settings2,
    XCircle,
} from "lucide-react";
import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import api from "../lib/api";

type EmailTab=
    "overview"|
    "history"|
    "configuration";

interface EmailConfiguration {
    source:"environment"|"database";
    configured:boolean;
    enabled:boolean;
    mailer:string|null;
    host:string|null;
    port:number|null;
    scheme:string|null;
    username:string|null;
    password_configured:boolean;
    from_address:string|null;
    from_name:string|null;
    last_test_at:string|null;
    last_test_status:string|null;
    last_test_error:string|null;
}

interface EmailMetrics {
    total:number;
    sent:number;
    failed:number;
    blocked:number;
    processing:number;
    sent_24h:number;
    failed_24h:number;
}

interface EmailLog {
    id:string;
    recipient_email:string;
    subject:string;
    category:string;
    mailer:string;
    status:string;
    attempts:number;
    related_type:string|null;
    related_id:string|null;
    error:string|null;
    sent_at:string|null;
    failed_at:string|null;
    created_at:string;
    tenant?:{
        id:string;
        nome:string;
    }|null;
    initiated_by?:{
        id:string;
        name:string;
        email:string;
    }|null;
}

interface EmailSummary {
    configuration:EmailConfiguration;
    metrics:EmailMetrics;
    latest:EmailLog[];
}

interface EmailLogsResponse {
    data:EmailLog[];
    meta:{
        current_page:number;
        last_page:number;
        per_page:number;
        total:number;
    };
}

interface ConfigurationForm {
    enabled:boolean;
    host:string;
    port:string;
    scheme:string;
    username:string;
    smtp_password:string;
    clear_password:boolean;
    from_address:string;
    from_name:string;
}

const initialConfiguration:ConfigurationForm={
    enabled:true,
    host:"",
    port:"587",
    scheme:"smtp",
    username:"",
    smtp_password:"",
    clear_password:false,
    from_address:"",
    from_name:"FrotaPRO",
};

const categoryLabels:Record<string,string>={
    password_reset:"Recuperação de palavra-passe",
    system_test:"Teste do sistema",
    alert_immediate:"Alerta imediato",
    alert_digest:"Resumo de alertas",
    employee_invitation:"Convite de funcionário",
    contract_signature:"Assinatura de contrato",
    checklist_signature:"Assinatura de checklist",
};

export default function BackofficeEmailsPage() {
    const queryClient=
        useQueryClient();

    const [tab,setTab]=
        useState<EmailTab>(
            "overview"
        );

    const [search,setSearch]=
        useState("");

    const [status,setStatus]=
        useState("");

    const [category,setCategory]=
        useState("");

    const [dateFrom,setDateFrom]=
        useState("");

    const [dateTo,setDateTo]=
        useState("");

    const [page,setPage]=
        useState(1);

    const [configuration,setConfiguration]=
        useState<ConfigurationForm>(
            initialConfiguration
        );

    const [testEmail,setTestEmail]=
        useState("");

    const [configurationMessage,setConfigurationMessage]=
        useState("");

    const [configurationError,setConfigurationError]=
        useState("");

    const [testMessage,setTestMessage]=
        useState("");

    const [testError,setTestError]=
        useState("");

    const summaryQuery=
        useQuery({
            queryKey:[
                "backoffice",
                "emails",
                "summary",
            ],

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            "/api/backoffice/emails/summary",
                        );

                    return response
                        .data
                        .data as EmailSummary;
                },
        });

    const configurationQuery=
        useQuery({
            queryKey:[
                "backoffice",
                "emails",
                "configuration",
            ],

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            "/api/backoffice/emails/configuration",
                        );

                    return response
                        .data
                        .data as EmailConfiguration;
                },
        });

    const logParams=
        useMemo(
            ()=>{
                const params:
                    Record<string,string|number>={
                        page,
                        per_page:25,
                    };

                if(search.trim()){
                    params.search=
                        search.trim();
                }

                if(status){
                    params.status=
                        status;
                }

                if(category){
                    params.category=
                        category;
                }

                if(dateFrom){
                    params.date_from=
                        dateFrom;
                }

                if(dateTo){
                    params.date_to=
                        dateTo;
                }

                return params;
            },
            [
                search,
                status,
                category,
                dateFrom,
                dateTo,
                page,
            ],
        );

    const logsQuery=
        useQuery({
            queryKey:[
                "backoffice",
                "emails",
                "logs",
                logParams,
            ],

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            "/api/backoffice/emails/logs",
                            {
                                params:
                                    logParams,
                            },
                        );

                    return response
                        .data as EmailLogsResponse;
                },

            enabled:
                tab==="history",
        });

    useEffect(
        ()=>{
            const data=
                configurationQuery.data;

            if(!data){
                return;
            }

            setConfiguration({
                enabled:
                    data.enabled,

                host:
                    data.host ?? "",

                port:
                    data.port
                        ?String(
                            data.port
                        )
                        :"587",

                scheme:
                    data.scheme ??
                    "smtp",

                username:
                    data.username ?? "",

                smtp_password:"",

                clear_password:false,

                from_address:
                    data.from_address ?? "",

                from_name:
                    data.from_name ??
                    "FrotaPRO",
            });
        },
        [
            configurationQuery.data,
        ],
    );

    function refreshAll(){
        queryClient.invalidateQueries({
            queryKey:[
                "backoffice",
                "emails",
            ],
        });
    }

    const saveConfigurationMutation=
        useMutation({
            mutationFn:
                async()=>{
                    const payload:
                        Record<string,unknown>={
                            enabled:
                                configuration.enabled,

                            host:
                                configuration
                                    .host
                                    .trim(),

                            port:
                                Number(
                                    configuration.port
                                ),

                            scheme:
                                configuration.scheme,

                            username:
                                configuration
                                    .username
                                    .trim()||
                                null,

                            clear_password:
                                configuration
                                    .clear_password,

                            from_address:
                                configuration
                                    .from_address
                                    .trim(),

                            from_name:
                                configuration
                                    .from_name
                                    .trim(),
                        };

                    if(
                        configuration
                            .smtp_password
                    ){
                        payload.smtp_password=
                            configuration
                                .smtp_password;
                    }

                    const response=
                        await api.put(
                            "/api/backoffice/emails/configuration",
                            payload,
                        );

                    return response.data;
                },

            onSuccess:
                data=>{
                    setConfigurationMessage(
                        data.message ??
                        "Configuração guardada.",
                    );

                    setConfigurationError("");

                    setConfiguration(
                        current=>({
                            ...current,
                            smtp_password:"",
                            clear_password:false,
                        }),
                    );

                    refreshAll();
                },

            onError:
                error=>{
                    setConfigurationMessage("");

                    setConfigurationError(
                        apiError(
                            error,
                            "Não foi possível guardar a configuração.",
                        ),
                    );
                },
        });

    const testMutation=
        useMutation({
            mutationFn:
                async()=>{
                    const response=
                        await api.post(
                            "/api/backoffice/emails/test",
                            {
                                email:
                                    testEmail,
                            },
                        );

                    return response.data;
                },

            onSuccess:
                data=>{
                    setTestMessage(
                        data.message ??
                        "E-mail enviado.",
                    );

                    setTestError("");

                    refreshAll();
                },

            onError:
                error=>{
                    setTestMessage("");

                    setTestError(
                        apiError(
                            error,
                            "Falha no teste de envio.",
                        ),
                    );

                    refreshAll();
                },
        });

    function handleSave(
        event:FormEvent
    ){
        event.preventDefault();

        setConfigurationMessage("");
        setConfigurationError("");

        saveConfigurationMutation
            .mutate();
    }

    function handleTest(
        event:FormEvent
    ){
        event.preventDefault();

        setTestMessage("");
        setTestError("");

        testMutation
            .mutate();
    }

    if(
        summaryQuery.isLoading&&
        !summaryQuery.data
    ){
        return <Loading/>;
    }

    const summary=
        summaryQuery.data;

    const metrics=
        summary?.metrics;

    const config=
        configurationQuery.data ??
        summary?.configuration;

    const successRate=
        metrics&&
        metrics.sent+
        metrics.failed>0
            ?Math.round(
                (
                    metrics.sent/
                    (
                        metrics.sent+
                        metrics.failed
                    )
                )*
                100
            )
            :100;

    return(
        <div className="mx-auto max-w-7xl space-y-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Infraestrutura de comunicação
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Central de E-mails
                    </h1>

                    <p className="mt-2 max-w-3xl text-slate-500">
                        Configure o transporte SMTP e acompanhe os e-mails transacionais enviados pelo FrotaPRO.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={refreshAll}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4"/>
                    Atualizar
                </button>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Metric
                    label="Total"
                    value={
                        metrics?.total ??
                        0
                    }
                    icon={Mail}
                />

                <Metric
                    label="Enviados"
                    value={
                        metrics?.sent ??
                        0
                    }
                    icon={CheckCircle2}
                />

                <Metric
                    label="Falhados"
                    value={
                        metrics?.failed ??
                        0
                    }
                    icon={XCircle}
                />

                <Metric
                    label="Últimas 24h"
                    value={
                        metrics?.sent_24h ??
                        0
                    }
                    icon={Clock3}
                />

                <Metric
                    label="Taxa de sucesso"
                    value={`${successRate}%`}
                    icon={CheckCircle2}
                />
            </section>

            <section className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                <TabButton
                    active={tab==="overview"}
                    onClick={()=>
                        setTab(
                            "overview"
                        )
                    }
                >
                    Visão geral
                </TabButton>

                <TabButton
                    active={tab==="history"}
                    onClick={()=>
                        setTab(
                            "history"
                        )
                    }
                >
                    Histórico
                </TabButton>

                <TabButton
                    active={tab==="configuration"}
                    onClick={()=>
                        setTab(
                            "configuration"
                        )
                    }
                >
                    Configuração
                </TabButton>
            </section>

            {tab==="overview"&&(
                <Overview
                    summary={summary}
                    configuration={config}
                    onConfiguration={()=>
                        setTab(
                            "configuration"
                        )
                    }
                    onHistory={()=>
                        setTab(
                            "history"
                        )
                    }
                />
            )}

            {tab==="history"&&(
                <section className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <div className="relative xl:col-span-2">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>

                                <input
                                    value={search}
                                    onChange={event=>{
                                        setSearch(
                                            event.target.value
                                        );

                                        setPage(1);
                                    }}
                                    placeholder="Destinatário ou assunto..."
                                    className={`${inputClass} pl-9`}
                                />
                            </div>

                            <select
                                value={status}
                                onChange={event=>{
                                    setStatus(
                                        event.target.value
                                    );

                                    setPage(1);
                                }}
                                className={inputClass}
                            >
                                <option value="">
                                    Todos os estados
                                </option>
                                <option value="sent">
                                    Enviado
                                </option>
                                <option value="failed">
                                    Falhou
                                </option>
                                <option value="blocked">
                                    Bloqueado
                                </option>
                                <option value="processing">
                                    Em processamento
                                </option>
                            </select>

                            <select
                                value={category}
                                onChange={event=>{
                                    setCategory(
                                        event.target.value
                                    );

                                    setPage(1);
                                }}
                                className={inputClass}
                            >
                                <option value="">
                                    Todas as categorias
                                </option>

                                {Object.entries(
                                    categoryLabels
                                ).map(
                                    ([
                                        value,
                                        label,
                                    ])=>(
                                        <option
                                            key={value}
                                            value={value}
                                        >
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>

                            <button
                                type="button"
                                onClick={()=>{
                                    setSearch("");
                                    setStatus("");
                                    setCategory("");
                                    setDateFrom("");
                                    setDateTo("");
                                    setPage(1);
                                }}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                Limpar filtros
                            </button>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Field label="Desde">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={event=>{
                                        setDateFrom(
                                            event.target.value
                                        );

                                        setPage(1);
                                    }}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Até">
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={event=>{
                                        setDateTo(
                                            event.target.value
                                        );

                                        setPage(1);
                                    }}
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    </div>

                    <EmailLogTable
                        loading={
                            logsQuery
                                .isLoading
                        }
                        data={
                            logsQuery
                                .data
                                ?.data ??
                            []
                        }
                    />

                    {logsQuery.data&&
                        logsQuery.data.meta.last_page>1&&(
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4">
                                <span className="text-sm text-slate-500">
                                    Página{" "}
                                    {
                                        logsQuery
                                            .data
                                            .meta
                                            .current_page
                                    }{" "}
                                    de{" "}
                                    {
                                        logsQuery
                                            .data
                                            .meta
                                            .last_page
                                    }
                                </span>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={page<=1}
                                        onClick={()=>
                                            setPage(
                                                current=>
                                                    Math.max(
                                                        1,
                                                        current-1
                                                    )
                                            )
                                        }
                                        className={secondaryButton}
                                    >
                                        Anterior
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            page>=
                                            logsQuery
                                                .data
                                                .meta
                                                .last_page
                                        }
                                        onClick={()=>
                                            setPage(
                                                current=>
                                                    current+1
                                            )
                                        }
                                        className={secondaryButton}
                                    >
                                        Seguinte
                                    </button>
                                </div>
                            </div>
                        )}
                </section>
            )}

            {tab==="configuration"&&(
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <form
                        onSubmit={handleSave}
                        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6"
                    >
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                    <Settings2 className="h-5 w-5"/>
                                </div>

                                <div>
                                    <h2 className="font-semibold text-slate-950">
                                        Servidor SMTP
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Credenciais utilizadas globalmente pelo FrotaPRO.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                            <div>
                                <div className="font-medium text-slate-900">
                                    Envio de e-mails
                                </div>

                                <div className="mt-1 text-sm text-slate-500">
                                    Desative para bloquear todos os novos envios transacionais.
                                </div>
                            </div>

                            <input
                                type="checkbox"
                                checked={
                                    configuration
                                        .enabled
                                }
                                onChange={event=>
                                    setConfiguration(
                                        current=>({
                                            ...current,
                                            enabled:
                                                event
                                                    .target
                                                    .checked,
                                        })
                                    )
                                }
                                className="h-5 w-5"
                            />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Servidor SMTP">
                                <input
                                    required
                                    value={
                                        configuration
                                            .host
                                    }
                                    onChange={event=>
                                        setConfiguration(
                                            current=>({
                                                ...current,
                                                host:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                    placeholder="smtp.exemplo.pt"
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Porta">
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    max="65535"
                                    value={
                                        configuration
                                            .port
                                    }
                                    onChange={event=>
                                        setConfiguration(
                                            current=>({
                                                ...current,
                                                port:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Ligação">
                                <select
                                    value={
                                        configuration
                                            .scheme
                                    }
                                    onChange={event=>
                                        setConfiguration(
                                            current=>({
                                                ...current,
                                                scheme:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                    className={inputClass}
                                >
                                    <option value="smtp">
                                        SMTP / STARTTLS
                                    </option>

                                    <option value="smtps">
                                        SMTPS / SSL
                                    </option>
                                </select>
                            </Field>

                            <Field label="Utilizador SMTP">
                                <input
                                    value={
                                        configuration
                                            .username
                                    }
                                    onChange={event=>
                                        setConfiguration(
                                            current=>({
                                                ...current,
                                                username:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                    autoComplete="off"
                                    className={inputClass}
                                />
                            </Field>
                        </div>

                        <Field label="Palavra-passe SMTP">
                            <input
                                type="password"
                                value={
                                    configuration
                                        .smtp_password
                                }
                                onChange={event=>
                                    setConfiguration(
                                        current=>({
                                            ...current,
                                            smtp_password:
                                                event
                                                    .target
                                                    .value,

                                            clear_password:
                                                false,
                                        })
                                    )
                                }
                                autoComplete="new-password"
                                placeholder={
                                    config
                                        ?.password_configured
                                        ?"Credencial configurada — deixe vazio para manter"
                                        :"Introduza a palavra-passe SMTP"
                                }
                                className={inputClass}
                            />

                            {config?.password_configured&&(
                                <label className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                                    <input
                                        type="checkbox"
                                        checked={
                                            configuration
                                                .clear_password
                                        }
                                        onChange={event=>
                                            setConfiguration(
                                                current=>({
                                                    ...current,
                                                    clear_password:
                                                        event
                                                            .target
                                                            .checked,

                                                    smtp_password:"",
                                                })
                                            )
                                        }
                                    />

                                    Remover a credencial SMTP guardada
                                </label>
                            )}
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="E-mail remetente">
                                <input
                                    type="email"
                                    required
                                    value={
                                        configuration
                                            .from_address
                                    }
                                    onChange={event=>
                                        setConfiguration(
                                            current=>({
                                                ...current,
                                                from_address:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                    placeholder="noreply@frotapro.pt"
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Nome do remetente">
                                <input
                                    required
                                    value={
                                        configuration
                                            .from_name
                                    }
                                    onChange={event=>
                                        setConfiguration(
                                            current=>({
                                                ...current,
                                                from_name:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>
                        </div>

                        {configurationMessage&&(
                            <SuccessBox>
                                {configurationMessage}
                            </SuccessBox>
                        )}

                        {configurationError&&(
                            <ErrorBox>
                                {configurationError}
                            </ErrorBox>
                        )}

                        <div className="flex justify-end border-t border-slate-100 pt-5">
                            <button
                                type="submit"
                                disabled={
                                    saveConfigurationMutation
                                        .isPending
                                }
                                className={primaryButton}
                            >
                                {saveConfigurationMutation.isPending?(
                                    <LoaderCircle className="h-4 w-4 animate-spin"/>
                                ):(
                                    <Save className="h-4 w-4"/>
                                )}

                                Guardar configuração
                            </button>
                        </div>
                    </form>

                    <div className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-6">
                            <h2 className="font-semibold text-slate-950">
                                Estado
                            </h2>

                            <div className="mt-5 space-y-4 text-sm">
                                <StatusRow
                                    label="Configuração"
                                    value={
                                        config?.configured
                                            ?"Configurada"
                                            :"Pendente"
                                    }
                                    good={
                                        Boolean(
                                            config?.configured
                                        )
                                    }
                                />

                                <StatusRow
                                    label="Envios"
                                    value={
                                        config?.enabled
                                            ?"Ativos"
                                            :"Desativados"
                                    }
                                    good={
                                        Boolean(
                                            config?.enabled
                                        )
                                    }
                                />

                                <StatusRow
                                    label="Origem"
                                    value={
                                        config?.source===
                                        "database"
                                            ?"Backoffice"
                                            :"Ambiente (.env)"
                                    }
                                    good={true}
                                />

                                <StatusRow
                                    label="Credencial"
                                    value={
                                        config
                                            ?.password_configured
                                            ?"Configurada"
                                            :"Não configurada"
                                    }
                                    good={
                                        Boolean(
                                            config
                                                ?.password_configured
                                        )
                                    }
                                />

                                {config?.last_test_at&&(
                                    <StatusRow
                                        label="Último teste"
                                        value={
                                            formatDateTime(
                                                config
                                                    .last_test_at
                                            )
                                        }
                                        good={
                                            config
                                                .last_test_status===
                                            "success"
                                        }
                                    />
                                )}
                            </div>

                            {config?.last_test_error&&(
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                                    {
                                        config
                                            .last_test_error
                                    }
                                </div>
                            )}
                        </section>

                        <form
                            onSubmit={handleTest}
                            className="rounded-2xl border border-slate-200 bg-white p-6"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <Send className="h-5 w-5"/>
                                </div>

                                <div>
                                    <h2 className="font-semibold text-slate-950">
                                        Testar envio
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Envia uma mensagem real utilizando a configuração atual.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5">
                                <Field label="Destinatário">
                                    <input
                                        type="email"
                                        required
                                        value={testEmail}
                                        onChange={event=>
                                            setTestEmail(
                                                event.target.value
                                            )
                                        }
                                        placeholder="seu@email.pt"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            {testMessage&&(
                                <div className="mt-4">
                                    <SuccessBox>
                                        {testMessage}
                                    </SuccessBox>
                                </div>
                            )}

                            {testError&&(
                                <div className="mt-4">
                                    <ErrorBox>
                                        {testError}
                                    </ErrorBox>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    testMutation
                                        .isPending||
                                    !config
                                        ?.configured||
                                    !config
                                        ?.enabled
                                }
                                className={`${primaryButton} mt-5 w-full`}
                            >
                                {testMutation.isPending?(
                                    <LoaderCircle className="h-4 w-4 animate-spin"/>
                                ):(
                                    <Send className="h-4 w-4"/>
                                )}

                                Enviar e-mail de teste
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function Overview({
    summary,
    configuration,
    onConfiguration,
    onHistory,
}:{
    summary:EmailSummary|undefined;
    configuration:EmailConfiguration|undefined;
    onConfiguration:()=>void;
    onHistory:()=>void;
}){
    const latest=
        summary?.latest ??
        [];

    return(
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Envios recentes
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Últimas mensagens processadas pelo FrotaPRO.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onHistory}
                        className="text-sm font-semibold text-indigo-600"
                    >
                        Ver histórico
                    </button>
                </div>

                <EmailLogTable
                    loading={false}
                    data={latest}
                    compact
                />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Settings2 className="h-5 w-5"/>
                </div>

                <h2 className="mt-5 font-semibold text-slate-950">
                    Transporte de e-mail
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    O FrotaPRO centraliza convites, alertas, assinaturas e recuperação de palavra-passe.
                </p>

                <div className="mt-6 space-y-4">
                    <StatusRow
                        label="Servidor"
                        value={
                            configuration
                                ?.configured
                                ?"Configurado"
                                :"Pendente"
                        }
                        good={
                            Boolean(
                                configuration
                                    ?.configured
                            )
                        }
                    />

                    <StatusRow
                        label="Envios"
                        value={
                            configuration
                                ?.enabled
                                ?"Ativos"
                                :"Desativados"
                        }
                        good={
                            Boolean(
                                configuration
                                    ?.enabled
                            )
                        }
                    />

                    <StatusRow
                        label="Mailer"
                        value={
                            configuration
                                ?.mailer ??
                            "—"
                        }
                        good={true}
                    />
                </div>

                <button
                    type="button"
                    onClick={onConfiguration}
                    className={`${primaryButton} mt-6 w-full`}
                >
                    <Settings2 className="h-4 w-4"/>
                    Configurar
                </button>
            </section>
        </div>
    );
}

function EmailLogTable({
    loading,
    data,
    compact=false,
}:{
    loading:boolean;
    data:EmailLog[];
    compact?:boolean;
}){
    if(loading){
        return(
            <div className="flex justify-center py-16">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
            </div>
        );
    }

    if(data.length===0){
        return(
            <div className="px-6 py-16 text-center text-sm text-slate-400">
                Nenhum e-mail registado.
            </div>
        );
    }

    return(
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                        <Th>Destinatário</Th>
                        <Th>Tipo</Th>
                        {!compact&&(
                            <Th>Organização</Th>
                        )}
                        <Th>Estado</Th>
                        <Th>Data</Th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {data.map(
                        item=>(
                            <tr
                                key={item.id}
                                className="transition hover:bg-slate-50/70"
                            >
                                <td className="px-5 py-4">
                                    <div className="font-medium text-slate-900">
                                        {
                                            item
                                                .recipient_email
                                        }
                                    </div>

                                    <div
                                        className="mt-1 max-w-md truncate text-xs text-slate-400"
                                        title={
                                            item.subject
                                        }
                                    >
                                        {
                                            item
                                                .subject
                                        }
                                    </div>

                                    {item.error&&(
                                        <div
                                            className="mt-1 max-w-md truncate text-xs text-red-500"
                                            title={
                                                item.error
                                            }
                                        >
                                            {
                                                item
                                                    .error
                                            }
                                        </div>
                                    )}
                                </td>

                                <Td>
                                    {
                                        categoryLabels[
                                            item.category
                                        ] ??
                                        item.category
                                    }
                                </Td>

                                {!compact&&(
                                    <Td>
                                        {
                                            item
                                                .tenant
                                                ?.nome ??
                                            "Global"
                                        }
                                    </Td>
                                )}

                                <Td>
                                    <StatusBadge
                                        status={
                                            item.status
                                        }
                                    />
                                </Td>

                                <Td>
                                    {
                                        formatDateTime(
                                            item
                                                .created_at
                                        )
                                    }
                                </Td>
                            </tr>
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
}

function StatusBadge({
    status,
}:{
    status:string;
}){
    const styles:
        Record<string,string>={
            sent:
                "bg-emerald-50 text-emerald-700",

            failed:
                "bg-red-50 text-red-700",

            blocked:
                "bg-amber-50 text-amber-700",

            processing:
                "bg-blue-50 text-blue-700",
        };

    const labels:
        Record<string,string>={
            sent:"Enviado",
            failed:"Falhou",
            blocked:"Bloqueado",
            processing:"Processando",
        };

    return(
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                styles[status] ??
                "bg-slate-100 text-slate-600"
            }`}
        >
            {
                labels[status] ??
                status
            }
        </span>
    );
}

function Metric({
    label,
    value,
    icon:Icon,
}:{
    label:string;
    value:number|string;
    icon:typeof Mail;
}){
    return(
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5"/>
            </div>

            <div className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {typeof value==="number"
                    ?value.toLocaleString(
                        "pt-PT"
                    )
                    :value}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
                {label}
            </div>
        </div>
    );
}

function StatusRow({
    label,
    value,
    good,
}:{
    label:string;
    value:string;
    good:boolean;
}){
    return(
        <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">
                {label}
            </span>

            <span
                className={`inline-flex items-center gap-1.5 font-medium ${
                    good
                        ?"text-emerald-700"
                        :"text-amber-700"
                }`}
            >
                {good?(
                    <CheckCircle2 className="h-4 w-4"/>
                ):(
                    <AlertTriangle className="h-4 w-4"/>
                )}

                {value}
            </span>
        </div>
    );
}

function Field({
    label,
    children,
}:{
    label:string;
    children:React.ReactNode;
}){
    return(
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </label>

            {children}
        </div>
    );
}

function TabButton({
    active,
    onClick,
    children,
}:{
    active:boolean;
    onClick:()=>void;
    children:React.ReactNode;
}){
    return(
        <button
            type="button"
            onClick={onClick}
            className={[
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                active
                    ?"bg-indigo-600 text-white shadow-sm"
                    :"text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

function Th({
    children,
}:{
    children:React.ReactNode;
}){
    return(
        <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}

function Td({
    children,
}:{
    children:React.ReactNode;
}){
    return(
        <td className="px-5 py-4 text-sm text-slate-600">
            {children}
        </td>
    );
}

function SuccessBox({
    children,
}:{
    children:React.ReactNode;
}){
    return(
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {children}
        </div>
    );
}

function ErrorBox({
    children,
}:{
    children:React.ReactNode;
}){
    return(
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {children}
        </div>
    );
}

function Loading(){
    return(
        <div className="flex min-h-[50vh] items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}

function apiError(
    error:unknown,
    fallback:string
):string{
    if(
        axios.isAxiosError(
            error
        )
    ){
        const errors=
            error
                .response
                ?.data
                ?.errors;

        if(errors){
            const first=
                Object
                    .values(
                        errors
                    )
                    .flat()
                    .find(
                        item=>
                            typeof item===
                            "string"
                    );

            if(
                typeof first===
                "string"
            ){
                return first;
            }
        }

        return(
            error
                .response
                ?.data
                ?.error ??
            error
                .response
                ?.data
                ?.message ??
            fallback
        );
    }

    return fallback;
}

function formatDateTime(
    value:string|null|undefined
):string{
    if(!value){
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:"short",
            timeStyle:"short",
        },
    ).format(
        new Date(
            value
        ),
    );
}

const inputClass=
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const primaryButton=
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton=
    "inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50";