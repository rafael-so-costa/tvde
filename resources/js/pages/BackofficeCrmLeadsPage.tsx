import axios from "axios";
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    LoaderCircle,
    Plus,
    Search,
    UsersRound,
    X,
} from "lucide-react";
import {
    useDeferredValue,
    useState,
} from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";

import CrmPriorityBadge from "../components/CrmPriorityBadge";
import CrmStageBadge from "../components/CrmStageBadge";
import api from "../lib/api";

import type {
    BackofficeCrmLeadListResponse,
    BackofficeCrmLeadPriority,
    BackofficeCrmLeadSource,
    BackofficeCrmPipelineResponse,
} from "../types/backofficeCrmCommercial";

export default function BackofficeCrmLeadsPage() {
    const queryClient =
        useQueryClient();

    const [search, setSearch] =
        useState("");

    const [stageId, setStageId] =
        useState("");

    const [priority, setPriority] =
        useState("");

    const [source, setSource] =
        useState("");

    const [converted, setConverted] =
        useState("");

    const [page, setPage] =
        useState(1);

    const [showCreate, setShowCreate] =
        useState(false);

    const [companyName, setCompanyName] =
        useState("");

    const [nif, setNif] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [phone, setPhone] =
        useState("");

    const [newPriority, setNewPriority] =
        useState<BackofficeCrmLeadPriority>(
            "normal",
        );

    const deferredSearch =
        useDeferredValue(
            search,
        );

    const pipelineQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "pipeline",
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/pipeline",
                    );

                return response
                    .data as BackofficeCrmPipelineResponse;
            },
        });

    const leadsQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "leads",
                deferredSearch,
                stageId,
                priority,
                source,
                converted,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/leads",
                        {
                            params: {
                                search:
                                    deferredSearch ||
                                    undefined,

                                stage_id:
                                    stageId ||
                                    undefined,

                                priority:
                                    priority ||
                                    undefined,

                                source:
                                    source ||
                                    undefined,

                                converted:
                                    converted ||
                                    undefined,

                                page,

                                per_page: 20,
                            },
                        },
                    );

                return response
                    .data as BackofficeCrmLeadListResponse;
            },
        });

    const createMutation =
        useMutation({
            mutationFn: async () => {
                const response =
                    await api.post(
                        "/api/backoffice/crm/leads",
                        {
                            company_name:
                                companyName,

                            nif:
                                nif ||
                                null,

                            email:
                                email ||
                                null,

                            phone:
                                phone ||
                                null,

                            priority:
                                newPriority,

                            source:
                                "manual",
                        },
                    );

                return response.data;
            },

            onSuccess: async () => {
                setCompanyName("");
                setNif("");
                setEmail("");
                setPhone("");
                setNewPriority(
                    "normal",
                );

                setShowCreate(
                    false,
                );

                await queryClient.invalidateQueries({
                    queryKey: [
                        "backoffice",
                        "crm",
                        "leads",
                    ],
                });

                await queryClient.invalidateQueries({
                    queryKey: [
                        "backoffice",
                        "crm",
                        "pipeline",
                    ],
                });
            },
        });

    const leads =
        leadsQuery.data?.data ??
        [];

    const meta =
        leadsQuery.data?.meta;

    const stages =
        pipelineQuery.data?.data ??
        [];

    function resetPage(): void {
        setPage(1);
    }

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        CRM · Comercial
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Leads
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Gestão dos prospects e oportunidades comerciais do FrotaPRO.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        setShowCreate(
                            true,
                        )
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                    <Plus className="h-4 w-4" />
                    Novo lead
                </button>
            </section>

            {showCreate && (
                <section className="rounded-2xl border border-indigo-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Criar lead manual
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Registe uma oportunidade que não tenha origem direta na Base TVDE.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowCreate(
                                    false,
                                )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            createMutation.mutate();
                        }}
                        className="mt-5 grid gap-4 lg:grid-cols-2"
                    >
                        <Field
                            label="Empresa *"
                            value={
                                companyName
                            }
                            onChange={
                                setCompanyName
                            }
                            required
                        />

                        <Field
                            label="NIF"
                            value={
                                nif
                            }
                            onChange={
                                setNif
                            }
                        />

                        <Field
                            label="Email"
                            value={
                                email
                            }
                            onChange={
                                setEmail
                            }
                            type="email"
                        />

                        <Field
                            label="Telefone"
                            value={
                                phone
                            }
                            onChange={
                                setPhone
                            }
                        />

                        <div>
                            <label className={labelClass}>
                                Prioridade
                            </label>

                            <select
                                value={
                                    newPriority
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setNewPriority(
                                        event
                                            .target
                                            .value as BackofficeCrmLeadPriority,
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="low">
                                    Baixa
                                </option>

                                <option value="normal">
                                    Normal
                                </option>

                                <option value="high">
                                    Alta
                                </option>

                                <option value="urgent">
                                    Urgente
                                </option>
                            </select>
                        </div>

                        <div className="flex items-end justify-end">
                            <button
                                type="submit"
                                disabled={
                                    !companyName.trim() ||
                                    createMutation.isPending
                                }
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {createMutation.isPending && (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                )}

                                Criar lead
                            </button>
                        </div>
                    </form>

                    {createMutation.isError && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage(
                                createMutation.error,
                            )}
                        </div>
                    )}
                </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 xl:grid-cols-[1.5fr_220px_170px_180px_180px]">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event,
                            ) => {
                                setSearch(
                                    event
                                        .target
                                        .value,
                                );

                                resetPage();
                            }}
                            placeholder="Empresa, NIF, contacto, email..."
                            className={`${inputClass} pl-10`}
                        />
                    </div>

                    <select
                        value={
                            stageId
                        }
                        onChange={(
                            event,
                        ) => {
                            setStageId(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todas as etapas
                        </option>

                        {stages.map(
                            (stage) => (
                                <option
                                    key={
                                        stage.id
                                    }
                                    value={
                                        stage.id
                                    }
                                >
                                    {
                                        stage.name
                                    }
                                </option>
                            ),
                        )}
                    </select>

                    <select
                        value={
                            priority
                        }
                        onChange={(
                            event,
                        ) => {
                            setPriority(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Prioridades
                        </option>

                        <option value="low">
                            Baixa
                        </option>

                        <option value="normal">
                            Normal
                        </option>

                        <option value="high">
                            Alta
                        </option>

                        <option value="urgent">
                            Urgente
                        </option>
                    </select>

                    <select
                        value={
                            source
                        }
                        onChange={(
                            event,
                        ) => {
                            setSource(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todas as origens
                        </option>

                        {(
                            [
                                "manual",
                                "tvde",
                                "web",
                                "import",
                                "referral",
                            ] as BackofficeCrmLeadSource[]
                        ).map(
                            (item) => (
                                <option
                                    key={
                                        item
                                    }
                                    value={
                                        item
                                    }
                                >
                                    {sourceLabel(
                                        item,
                                    )}
                                </option>
                            ),
                        )}
                    </select>

                    <select
                        value={
                            converted
                        }
                        onChange={(
                            event,
                        ) => {
                            setConverted(
                                event
                                    .target
                                    .value,
                            );

                            resetPage();
                        }}
                        className={inputClass}
                    >
                        <option value="">
                            Todos
                        </option>

                        <option value="no">
                            Não convertidos
                        </option>

                        <option value="yes">
                            Clientes
                        </option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {leadsQuery.isLoading ? (
                    <Loading />
                ) : leadsQuery.isError ? (
                    <ErrorState text="Não foi possível carregar os leads." />
                ) : leads.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <UsersRound className="mx-auto h-10 w-10 text-slate-300" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            Nenhum lead encontrado
                        </h2>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className={thClass}>
                                        Lead
                                    </th>

                                    <th className={thClass}>
                                        Etapa
                                    </th>

                                    <th className={thClass}>
                                        Prioridade
                                    </th>

                                    <th className={thClass}>
                                        Origem
                                    </th>

                                    <th className={thClass}>
                                        Próxima ação
                                    </th>

                                    <th className={`${thClass} text-right`}>
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {leads.map(
                                    (lead) => (
                                        <tr
                                            key={
                                                lead.id
                                            }
                                            className="hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900">
                                                    {
                                                        lead.company_name
                                                    }
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {lead.nif
                                                        ? `NIF ${lead.nif}`
                                                        : lead.email ??
                                                          lead.phone ??
                                                          "Sem contacto"}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <CrmStageBadge
                                                    stage={
                                                        lead.stage
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                <CrmPriorityBadge
                                                    priority={
                                                        lead.priority
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {sourceLabel(
                                                    lead.source,
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-500">
                                                {lead.next_follow_up_at
                                                    ? formatDateTime(
                                                          lead.next_follow_up_at,
                                                      )
                                                    : "—"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end">
                                                    <Link
                                                        to={`/backoffice/crm/leads/${lead.id}`}
                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Ver
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta &&
                    meta.last_page >
                        1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                            <div className="text-sm text-slate-500">
                                {meta.from}–
                                {meta.to} de{" "}
                                {
                                    meta.total
                                }
                            </div>

                            <div className="flex gap-2">
                                <PageButton
                                    disabled={
                                        meta.current_page <=
                                        1
                                    }
                                    onClick={() =>
                                        setPage(
                                            (
                                                current,
                                            ) =>
                                                current -
                                                1,
                                        )
                                    }
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </PageButton>

                                <PageButton
                                    disabled={
                                        meta.current_page >=
                                        meta.last_page
                                    }
                                    onClick={() =>
                                        setPage(
                                            (
                                                current,
                                            ) =>
                                                current +
                                                1,
                                        )
                                    }
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </PageButton>
                            </div>
                        </div>
                    )}
            </section>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (
        value: string,
    ) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className={labelClass}>
                {label}
            </label>

            <input
                type={type}
                required={required}
                value={value}
                onChange={(event) =>
                    onChange(
                        event.target
                            .value,
                    )
                }
                className={inputClass}
            />
        </div>
    );
}

function PageButton({
    children,
    disabled,
    onClick,
}: {
    children: React.ReactNode;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        >
            {children}
        </button>
    );
}

function Loading() {
    return (
        <div className="flex min-h-72 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
    );
}

function ErrorState({
    text,
}: {
    text: string;
}) {
    return (
        <div className="px-6 py-16 text-center text-sm text-red-600">
            {text}
        </div>
    );
}

function sourceLabel(
    source: BackofficeCrmLeadSource,
): string {
    const labels = {
        manual: "Manual",
        tvde: "Base TVDE",
        web: "Website",
        import: "Importação",
        referral: "Referência",
    };

    return labels[source];
}

function formatDateTime(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle: "short",
            timeStyle: "short",
        },
    ).format(
        new Date(value),
    );
}

function errorMessage(
    error: unknown,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const message =
            error.response?.data
                ?.message;

        if (
            typeof message ===
            "string"
        ) {
            return message;
        }

        const errors =
            error.response?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                "object"
        ) {
            const first =
                Object.values(
                    errors,
                )[0];

            if (
                Array.isArray(
                    first,
                )
            ) {
                return String(
                    first[0],
                );
            }
        }
    }

    return "Não foi possível concluir a operação.";
}

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

const thClass =
    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500";
