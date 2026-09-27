import {
    FormEvent,
    useEffect,
    useState,
} from "react";
import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    KeyRound,
    Laptop,
    LoaderCircle,
    LogOut,
    Save,
    ShieldCheck,
    Smartphone,
    UserRound,
} from "lucide-react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import api from "../lib/api";
import {useAuth} from "../contexts/AuthContext";

interface AccountData {
    id:string;
    name:string;
    email:string;
    ativo:boolean;
    last_login_at:string|null;

    profile:{
        telefone:string|null;
        timezone:string;
        locale:string;
    };
}

interface AccountSession {
    current:boolean;
    ip_address:string|null;
    user_agent:string|null;
    last_activity:string;
}

interface AccountResponse {
    data:AccountData;
}

interface SessionsResponse {
    data:AccountSession[];
}

interface PasswordResponse {
    message:string;
    terminated_sessions:number;
}

interface UpdateAccountResponse
    extends AccountResponse {
    message:string;
}

const localeOptions=[
    {
        value:"pt_PT",
        label:"Português (Portugal)",
    },
    {
        value:"pt_BR",
        label:"Português (Brasil)",
    },
    {
        value:"en_GB",
        label:"English (UK)",
    },
    {
        value:"en_US",
        label:"English (US)",
    },
];

const timezoneOptions=[
    "Europe/Lisbon",
    "Europe/Madrid",
    "Europe/London",
    "Atlantic/Azores",
    "America/Sao_Paulo",
];

export default function MyAccountPage(){
    const {refresh}=useAuth();

    const queryClient=
        useQueryClient();

    const [name,setName]=
        useState("");

    const [telefone,setTelefone]=
        useState("");

    const [timezone,setTimezone]=
        useState(
            "Europe/Lisbon"
        );

    const [locale,setLocale]=
        useState("pt_PT");

    const [
        currentPassword,
        setCurrentPassword,
    ]=useState("");

    const [
        password,
        setPassword,
    ]=useState("");

    const [
        passwordConfirmation,
        setPasswordConfirmation,
    ]=useState("");

    const [
        sessionsPassword,
        setSessionsPassword,
    ]=useState("");

    const [
        profileMessage,
        setProfileMessage,
    ]=useState("");

    const [
        passwordMessage,
        setPasswordMessage,
    ]=useState("");

    const [
        sessionsMessage,
        setSessionsMessage,
    ]=useState("");

    const accountQuery=
        useQuery({
            queryKey:[
                "my-account",
            ],

            queryFn:async()=>{
                const response=
                    await api.get(
                        "/api/minha-conta"
                    );

                return (
                    response.data as AccountResponse
                ).data;
            },
        });

    const sessionsQuery=
        useQuery({
            queryKey:[
                "my-account-sessions",
            ],

            queryFn:async()=>{
                const response=
                    await api.get(
                        "/api/minha-conta/sessoes"
                    );

                return (
                    response.data as SessionsResponse
                ).data;
            },
        });

    useEffect(
        ()=>{
            const account=
                accountQuery.data;

            if(!account){
                return;
            }

            setName(
                account.name
            );

            setTelefone(
                account.profile
                    .telefone??""
            );

            setTimezone(
                account.profile
                    .timezone
            );

            setLocale(
                account.profile
                    .locale
            );
        },
        [
            accountQuery.data,
        ]
    );

    const updateMutation=
        useMutation({
            mutationFn:async()=>{
                const response=
                    await api.patch(
                        "/api/minha-conta",
                        {
                            name,

                            telefone:
                                telefone.trim()||
                                null,

                            timezone,
                            locale,
                        }
                    );

                return response.data as UpdateAccountResponse;
            },

            onSuccess:async(
                response
            )=>{
                setProfileMessage(
                    response.message
                );

                queryClient.setQueryData(
                    [
                        "my-account",
                    ],
                    response.data
                );

                await refresh();
            },
        });

    const passwordMutation=
        useMutation({
            mutationFn:async()=>{
                const response=
                    await api.patch(
                        "/api/minha-conta/senha",
                        {
                            current_password:
                                currentPassword,

                            password,

                            password_confirmation:
                                passwordConfirmation,
                        }
                    );

                return response.data as PasswordResponse;
            },

            onSuccess:async(
                response
            )=>{
                setCurrentPassword(
                    ""
                );

                setPassword(
                    ""
                );

                setPasswordConfirmation(
                    ""
                );

                setPasswordMessage(
                    response
                        .terminated_sessions>0
                        ?`Palavra-passe atualizada. ${response.terminated_sessions} outra(s) sessão(ões) foram terminadas.`
                        :response.message
                );

                await sessionsQuery
                    .refetch();
            },
        });

    const terminateMutation=
        useMutation({
            mutationFn:async()=>{
                const response=
                    await api.delete(
                        "/api/minha-conta/sessoes/outras",
                        {
                            data:{
                                current_password:
                                    sessionsPassword,
                            },
                        }
                    );

                return response.data as PasswordResponse;
            },

            onSuccess:async(
                response
            )=>{
                setSessionsPassword(
                    ""
                );

                setSessionsMessage(
                    response
                        .terminated_sessions>0
                        ?`${response.terminated_sessions} outra(s) sessão(ões) terminada(s).`
                        :"Não existiam outras sessões ativas."
                );

                await sessionsQuery
                    .refetch();
            },
        });

    function submitProfile(
        event:FormEvent
    ){
        event.preventDefault();

        setProfileMessage(
            ""
        );

        updateMutation.mutate();
    }

    function submitPassword(
        event:FormEvent
    ){
        event.preventDefault();

        setPasswordMessage(
            ""
        );

        passwordMutation.mutate();
    }

    function submitSessions(
        event:FormEvent
    ){
        event.preventDefault();

        setSessionsMessage(
            ""
        );

        terminateMutation.mutate();
    }

    if(
        accountQuery.isLoading
    ){
        return (
            <div className="py-24 flex justify-center">
                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
            </div>
        );
    }

    if(
        accountQuery.isError ||
        !accountQuery.data
    ){
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertCircle className="w-10 h-10 mx-auto text-red-500"/>

                <h1 className="mt-4 font-bold text-slate-950">
                    Não foi possível carregar a sua conta
                </h1>

                <button
                    type="button"
                    onClick={()=>
                        accountQuery
                            .refetch()
                    }
                    className="mt-5 h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    const account=
        accountQuery.data;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <UserRound className="w-5 h-5"/>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-slate-950">
                        Minha Conta
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Gerencie os seus dados pessoais, palavra-passe e sessões de acesso.
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                <form
                    onSubmit={
                        submitProfile
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <UserRound className="w-5 h-5 text-indigo-600"/>

                        <div>
                            <h2 className="font-bold text-slate-950">
                                Dados da conta
                            </h2>

                            <p className="text-sm text-slate-500">
                                Informações utilizadas na sua conta FrotaPRO.
                            </p>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nome de exibição
                            </label>

                            <input
                                value={
                                    name
                                }
                                onChange={
                                    event=>
                                        setName(
                                            event
                                                .target
                                                .value
                                        )
                                }
                                required
                                maxLength={
                                    255
                                }
                                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                E-mail
                            </label>

                            <input
                                value={
                                    account.email
                                }
                                disabled
                                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                            />

                            <p className="mt-1.5 text-xs text-slate-400">
                                O e-mail não pode ser alterado nesta área.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Telefone
                            </label>

                            <input
                                value={
                                    telefone
                                }
                                onChange={
                                    event=>
                                        setTelefone(
                                            event
                                                .target
                                                .value
                                        )
                                }
                                maxLength={
                                    30
                                }
                                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Fuso horário
                            </label>

                            <select
                                value={
                                    timezone
                                }
                                onChange={
                                    event=>
                                        setTimezone(
                                            event
                                                .target
                                                .value
                                        )
                                }
                                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                            >
                                {timezoneOptions.map(
                                    item=>(
                                        <option
                                            key={
                                                item
                                            }
                                            value={
                                                item
                                            }
                                        >
                                            {item}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Idioma
                            </label>

                            <select
                                value={
                                    locale
                                }
                                onChange={
                                    event=>
                                        setLocale(
                                            event
                                                .target
                                                .value
                                        )
                                }
                                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                            >
                                {localeOptions.map(
                                    option=>(
                                        <option
                                            key={
                                                option.value
                                            }
                                            value={
                                                option.value
                                            }
                                        >
                                            {option.label}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    {profileMessage && (
                        <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            <CheckCircle2 className="w-4 h-4"/>

                            {profileMessage}
                        </div>
                    )}

                    {updateMutation.isError && (
                        <ErrorBox
                            error={
                                updateMutation.error
                            }
                            fallback="Não foi possível atualizar a conta."
                        />
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={
                                updateMutation
                                    .isPending
                            }
                            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {updateMutation.isPending
                                ?(
                                    <LoaderCircle className="w-4 h-4 animate-spin"/>
                                )
                                :(
                                    <Save className="w-4 h-4"/>
                                )
                            }

                            Guardar alterações
                        </button>
                    </div>
                </form>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-600"/>

                            <h2 className="font-bold text-slate-950">
                                Segurança
                            </h2>
                        </div>

                        <div className="mt-5 space-y-4 text-sm">
                            <div>
                                <p className="text-slate-400">
                                    Estado da conta
                                </p>

                                <p className="mt-1 font-semibold text-emerald-700">
                                    {account.ativo
                                        ?"Ativa"
                                        :"Inativa"
                                    }
                                </p>
                            </div>

                            <div>
                                <p className="text-slate-400">
                                    Último login
                                </p>

                                <p className="mt-1 font-medium text-slate-700">
                                    {dateTimeLabel(
                                        account
                                            .last_login_at
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-800">
                        <ShieldCheck className="w-5 h-5 mb-3"/>

                        Dados operacionais como NIF, funções, organização e vínculos com motorista ou proprietário são controlados pela gestão da empresa.
                    </div>
                </div>
            </div>

            <form
                onSubmit={
                    submitPassword
                }
                className="rounded-2xl border border-slate-200 bg-white p-6"
            >
                <div className="flex items-center gap-3 mb-6">
                    <KeyRound className="w-5 h-5 text-indigo-600"/>

                    <div>
                        <h2 className="font-bold text-slate-950">
                            Alterar palavra-passe
                        </h2>

                        <p className="text-sm text-slate-500">
                            Por segurança, será necessário informar a palavra-passe atual.
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                    <PasswordField
                        label="Palavra-passe atual"
                        value={
                            currentPassword
                        }
                        onChange={
                            setCurrentPassword
                        }
                        autoComplete="current-password"
                    />

                    <PasswordField
                        label="Nova palavra-passe"
                        value={
                            password
                        }
                        onChange={
                            setPassword
                        }
                        autoComplete="new-password"
                    />

                    <PasswordField
                        label="Confirmar nova palavra-passe"
                        value={
                            passwordConfirmation
                        }
                        onChange={
                            setPasswordConfirmation
                        }
                        autoComplete="new-password"
                    />
                </div>

                <p className="mt-3 text-xs text-slate-400">
                    Ao alterar a palavra-passe, todas as outras sessões da sua conta serão terminadas.
                </p>

                {passwordMessage && (
                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        <CheckCircle2 className="w-4 h-4"/>

                        {passwordMessage}
                    </div>
                )}

                {passwordMutation.isError && (
                    <ErrorBox
                        error={
                            passwordMutation
                                .error
                        }
                        fallback="Não foi possível alterar a palavra-passe."
                    />
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={
                            passwordMutation
                                .isPending
                        }
                        className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                        {passwordMutation.isPending
                            ?(
                                <LoaderCircle className="w-4 h-4 animate-spin"/>
                            )
                            :(
                                <KeyRound className="w-4 h-4"/>
                            )
                        }

                        Alterar palavra-passe
                    </button>
                </div>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Laptop className="w-5 h-5 text-indigo-600"/>

                        <div>
                            <h2 className="font-bold text-slate-950">
                                Sessões
                            </h2>

                            <p className="text-sm text-slate-500">
                                Dispositivos que possuem uma sessão associada à sua conta.
                            </p>
                        </div>
                    </div>
                </div>

                {sessionsQuery.isLoading ? (
                    <div className="py-12 flex justify-center">
                        <LoaderCircle className="w-7 h-7 animate-spin text-indigo-600"/>
                    </div>
                ) : sessionsQuery.isError ? (
                    <div className="p-6 text-sm text-red-600">
                        Não foi possível consultar as sessões.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {(sessionsQuery.data??[])
                            .map(
                                (
                                    session,
                                    index
                                )=>(
                                    <div
                                        key={`${session.ip_address}-${session.last_activity}-${index}`}
                                        className="p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                                    >
                                        <div
                                            className={[
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                session.current
                                                    ?"bg-emerald-100 text-emerald-700"
                                                    :"bg-slate-100 text-slate-500",
                                            ].join(
                                                " "
                                            )}
                                        >
                                            {isMobileAgent(
                                                session
                                                    .user_agent
                                            )
                                                ?(
                                                    <Smartphone className="w-5 h-5"/>
                                                )
                                                :(
                                                    <Laptop className="w-5 h-5"/>
                                                )
                                            }
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold text-sm text-slate-800">
                                                    {browserLabel(
                                                        session
                                                            .user_agent
                                                    )}
                                                </p>

                                                {session.current && (
                                                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                        Sessão atual
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-1 text-xs text-slate-500 break-all">
                                                IP:{" "}
                                                {session.ip_address??
                                                    "Não disponível"
                                                }
                                            </p>

                                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                                                <Clock3 className="w-3.5 h-3.5"/>

                                                Última atividade:{" "}
                                                {dateTimeLabel(
                                                    session
                                                        .last_activity
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            )
                        }

                        {(sessionsQuery.data??[])
                            .length===0 && (
                            <div className="p-8 text-center text-sm text-slate-500">
                                Nenhuma sessão foi encontrada.
                            </div>
                        )}
                    </div>
                )}

                <form
                    onSubmit={
                        submitSessions
                    }
                    className="p-6 border-t border-slate-200 bg-slate-50"
                >
                    <h3 className="font-semibold text-sm text-slate-900">
                        Terminar outras sessões
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Informe a sua palavra-passe atual para encerrar todas as outras sessões.
                    </p>

                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <input
                            type="password"
                            value={
                                sessionsPassword
                            }
                            onChange={
                                event=>
                                    setSessionsPassword(
                                        event
                                            .target
                                            .value
                                    )
                            }
                            autoComplete="current-password"
                            placeholder="Palavra-passe atual"
                            required
                            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />

                        <button
                            type="submit"
                            disabled={
                                terminateMutation
                                    .isPending
                            }
                            className="h-11 px-5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {terminateMutation.isPending
                                ?(
                                    <LoaderCircle className="w-4 h-4 animate-spin"/>
                                )
                                :(
                                    <LogOut className="w-4 h-4"/>
                                )
                            }

                            Terminar outras sessões
                        </button>
                    </div>

                    {sessionsMessage && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
                            <CheckCircle2 className="w-4 h-4"/>

                            {sessionsMessage}
                        </div>
                    )}

                    {terminateMutation.isError && (
                        <ErrorBox
                            error={
                                terminateMutation
                                    .error
                            }
                            fallback="Não foi possível terminar as outras sessões."
                        />
                    )}
                </form>
            </div>
        </div>
    );
}

function PasswordField({
    label,
    value,
    onChange,
    autoComplete,
}:{
    label:string;
    value:string;
    onChange:(value:string)=>void;
    autoComplete:string;
}){
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}
            </label>

            <input
                type="password"
                value={
                    value
                }
                onChange={
                    event=>
                        onChange(
                            event
                                .target
                                .value
                        )
                }
                autoComplete={
                    autoComplete
                }
                required
                minLength={
                    8
                }
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
        </div>
    );
}

function ErrorBox({
    error,
    fallback,
}:{
    error:unknown;
    fallback:string;
}){
    return (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>

            {errorMessage(
                error,
                fallback
            )}
        </div>
    );
}

function errorMessage(
    error:unknown,
    fallback:string
):string{
    if(
        !axios.isAxiosError(
            error
        )
    ){
        return fallback;
    }

    const data=
        error.response?.data as {
            message?:string;
            errors?:Record<
                string,
                string[]
            >;
        }|undefined;

    if(
        data?.errors
    ){
        const first=
            Object.values(
                data.errors
            )
                .flat()
                .find(
                    Boolean
                );

        if(
            first
        ){
            return first;
        }
    }

    return data?.message??
        fallback;
}

function dateTimeLabel(
    value:string|null
):string{
    if(
        !value
    ){
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle:
                "medium",

            timeStyle:
                "short",
        }
    ).format(
        new Date(
            value
        )
    );
}

function isMobileAgent(
    agent:string|null
):boolean{
    if(
        !agent
    ){
        return false;
    }

    return /Android|iPhone|iPad|Mobile/i
        .test(
            agent
        );
}

function browserLabel(
    agent:string|null
):string{
    if(
        !agent
    ){
        return "Dispositivo desconhecido";
    }

    if(
        /Edg\//i.test(
            agent
        )
    ){
        return "Microsoft Edge";
    }

    if(
        /Chrome\//i.test(
            agent
        )
    ){
        return "Google Chrome";
    }

    if(
        /Firefox\//i.test(
            agent
        )
    ){
        return "Mozilla Firefox";
    }

    if(
        /Safari\//i.test(
            agent
        )
    ){
        return "Safari";
    }

    return "Navegador";
}
